import {
  AgentMessage,
  APIResponse,
  ConversationRole,
  ComputerTool,
  ComputerCallOutputResponse,
} from "../types";
import Anthropic from "@anthropic-ai/sdk";

import env from "../../env.json";

// Convert tools for Anthropic format
function convertToolsForAnthropic(
  tools: ComputerTool[],
  dimensions?: { width: number; height: number }
) {
  const anthropicTools: any[] = [];

  // Add computer use tool if we have computer_use_preview in tools
  const hasComputerTool = tools.some((tool) => tool.type === "computer_use_preview");
  if (hasComputerTool && dimensions) {
    anthropicTools.push({
      type: "computer_20250124",
      name: "computer",
      display_width_px: dimensions.width,
      display_height_px: dimensions.height,
      display_number: 1,
    });
  }

  // Add function tools
  tools.forEach((tool) => {
    if (tool.type === "function" && tool.function && tool.function.name) {
      anthropicTools.push({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: {
          type: "object",
          properties: tool.function.parameters?.properties || {},
          required: tool.function.parameters?.required || [],
        },
      });
    }
  });

  return anthropicTools;
}

// Convert AgentMessage to Anthropic format
function convertMessagesForAnthropic(messages: AgentMessage[]): any[] {
  return messages.map((msg): any => {
    const role =
      msg.role === ConversationRole.System
        ? "system"
        : msg.role === ConversationRole.User
        ? "user"
        : "assistant";

    if (!msg.response) {
      return { role, content: "No response content" };
    }

    switch (msg.response.type) {
      case "content":
        return { role, content: msg.response.content };

      case "function_call":
        return {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: msg.response.call_id,
              name: msg.response.name,
              input: msg.response.arguments,
            },
          ],
        };

      case "function_call_output":
        return {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: msg.response.call_id,
              content:
                typeof msg.response.output === "string"
                  ? msg.response.output
                  : JSON.stringify(msg.response.output),
            },
          ],
        };

      case "computer_call":
        return {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: msg.response.call_id,
              name: "computer",
              input: msg.response.action,
            },
          ],
        };

      case "computer_call_output":
        const response = msg.response as ComputerCallOutputResponse;

        // Anthropic expects tool_result content to be a string, not an object
        let resultContent = "Screenshot taken successfully";
        if (response.output && typeof response.output === "object") {
          // Create a descriptive string instead of sending the raw object
          if ("current_url" in response.output) {
            resultContent = `Screenshot taken. Current URL: ${response.output.current_url}`;
          }
        }

        const content: any[] = [
          {
            type: "tool_result",
            tool_use_id: response.call_id,
            content: resultContent,
          },
        ];

        // Add screenshot as image if available
        if (
          response.output &&
          typeof response.output === "object" &&
          "image_url" in response.output
        ) {
          const imageUrl = response.output.image_url as string;
          if (imageUrl && imageUrl !== "[omitted]") {
            // Extract base64 from data URL
            const base64Match = imageUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
            if (base64Match) {
              content.push({
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: base64Match[1],
                },
              });
            }
          }
        }

        return {
          role: "user",
          content,
        };

      default:
        return { role, content: "Action completed" };
    }
  });
}

// Convert Anthropic response to AgentMessage format
function convertAnthropicResponse(response: any): AgentMessage[] {
  const messages: AgentMessage[] = [];

  if (!response.content || !Array.isArray(response.content)) {
    return messages;
  }

  for (const contentBlock of response.content) {
    if (contentBlock.type === "text") {
      messages.push({
        role: ConversationRole.Agent,
        response: {
          type: "content",
          content: contentBlock.text,
        },
      });
    } else if (contentBlock.type === "tool_use") {
      // Check if this is a computer tool
      if (contentBlock.name === "computer") {
        // Convert Anthropic computer use format to expected format
        const anthropicInput = contentBlock.input;
        let action: any;

        if (anthropicInput && anthropicInput.action) {
          // Convert from Anthropic format: {action: "key", ...} to expected format: {type: "key", ...}
          action = {
            type: anthropicInput.action,
            ...anthropicInput,
          };
          delete action.action; // Remove the old action property
        } else {
          action = anthropicInput;
        }

        messages.push({
          role: ConversationRole.Agent,
          response: {
            type: "computer_call",
            call_id: contentBlock.id,
            action: action,
            pending_safety_checks: [],
          },
        });
      } else {
        // Regular function call
        messages.push({
          role: ConversationRole.Agent,
          response: {
            type: "function_call",
            call_id: contentBlock.id,
            name: contentBlock.name,
            arguments: contentBlock.input,
          },
        });
      }
    }
  }

  return messages;
}

// Create a response from Anthropic API
export async function createAnthropicResponse(options: {
  model: string;
  input: AgentMessage[];
  tools: ComputerTool[];
  truncation?: string;
  abortSignal?: AbortSignal;
}): Promise<APIResponse> {
  const apiKey = env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error("CLAUDE_API_KEY environment variable is required");
  }

  // Check if already aborted
  if (options.abortSignal?.aborted) {
    throw new Error("Request aborted");
  }

  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  // Extract system messages
  const systemMessages = options.input.filter((msg) => msg.role === ConversationRole.System);
  const systemPrompt = systemMessages
    .map((msg) => (msg.response?.type === "content" ? msg.response.content : ""))
    .join("\n");

  // Filter out system messages for the conversation
  const conversationMessages = options.input.filter((msg) => msg.role !== ConversationRole.System);

  // Convert messages to Anthropic format
  const anthropicMessages = convertMessagesForAnthropic(conversationMessages);

  // Get computer dimensions if available
  const computerTool = options.tools.find((tool) => tool.type === "computer_use_preview");
  const dimensions =
    computerTool && computerTool.type === "computer_use_preview"
      ? {
          width: computerTool.display_width,
          height: computerTool.display_height,
        }
      : undefined;

  console.log("DIMENSIONS:", dimensions);

  // Convert tools to Anthropic format
  const anthropicTools = convertToolsForAnthropic(options.tools, dimensions);

  console.log("ANTHROPIC REQUEST:");
  console.log("Model:", options.model);
  console.log("System:", systemPrompt);
  //console.log("Messages:", JSON.stringify(anthropicMessages, null, 2));
  console.log("Tools:", JSON.stringify(anthropicTools, null, 2));

  try {
    const requestPromise = anthropic.beta.messages.create({
      model: options.model,
      max_tokens: 4096,
      system: systemPrompt || undefined,
      messages: anthropicMessages,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      betas: ["computer-use-2025-01-24"],
    });

    // If we have an abort signal, create a race between the request and abort
    let response;
    if (options.abortSignal) {
      response = await Promise.race([
        requestPromise,
        new Promise((_, reject) => {
          options.abortSignal!.addEventListener("abort", () => {
            reject(new Error("Request aborted"));
          });
        }),
      ]);
    } else {
      response = await requestPromise;
    }

    console.log("ANTHROPIC RESPONSE:", JSON.stringify(response, null, 2));

    // Convert response to AgentMessage format
    const outputMessages = convertAnthropicResponse(response);

    return { messages: outputMessages };
  } catch (error) {
    // Check if this is an abort error
    if (error instanceof Error && error.message === "Request aborted") {
      console.log("Anthropic API request was aborted");
      throw error;
    }
    console.error("Anthropic API error:", error);
    throw error;
  }
}
