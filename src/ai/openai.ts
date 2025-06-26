import {
  AgentMessage,
  APIResponse,
  ConversationRole,
  APIRequestBody,
  APIResponseData,
  ComputerTool,
  APIMessage,
  ComputerCallOutputResponse,
} from "../types";

import env from "../../env.json";

export async function createOpenAIResponse(options: {
  model: string;
  input: AgentMessage[];
  tools: ComputerTool[];
  truncation?: string;
  abortSignal?: AbortSignal;
}): Promise<APIResponse> {
  // Use fetch for HTTP requests
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  // Check if already aborted
  if (options.abortSignal?.aborted) {
    throw new Error("Request aborted");
  }

  const url = "https://api.openai.com/v1/responses";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  // Convert AgentMessage format to simple message format for API
  const messages: APIMessage[] = options.input.map((msg): APIMessage => {
    const role =
      msg.role === ConversationRole.System
        ? "system"
        : msg.role === ConversationRole.User
        ? "user"
        : "assistant";

    // Defensive check for undefined response
    if (!msg.response) {
      return { role, content: "No response content" };
    }

    // Handle different response types
    if (msg.response.type === "content") {
      return { role, content: msg.response.content };
    } else if (msg.response.type === "function_call") {
      return {
        type: "function_call",
        name: msg.response.name,
        call_id: msg.response.call_id,
        arguments: JSON.stringify(msg.response.arguments),
      };
    } else if (msg.response.type === "function_call_output") {
      return {
        type: "function_call_output",
        call_id: msg.response.call_id,
        output: msg.response.output,
      };
    } else if (msg.response.type === "computer_call") {
      return {
        type: "computer_call",
        call_id: msg.response.call_id,
        action: msg.response.action,
        pending_safety_checks: msg.response.pending_safety_checks || [],
      };
    } else {
      // Handle computer_call_output and other types with type assertion
      const response = msg.response as ComputerCallOutputResponse;
      if (response.type === "computer_call_output") {
        return {
          type: "computer_call_output",
          call_id: response.call_id,
          acknowledged_safety_checks: response.acknowledged_safety_checks || [],
          output: response.output,
        };
      }
    }

    // Default fallback
    return { role, content: "Action completed" };
  });

  const body: APIRequestBody = {
    model: options.model,
    input: messages,
    tools: options.tools.length > 0 ? options.tools : undefined,
    truncation: options.truncation,
    reasoning: { effort: "medium" },
  };

  // Print request diagnostics (matching Python version)
  console.log("REQUEST PAYLOAD SIZE:", JSON.stringify(body).length);
  console.log("REQUEST URL:", url);
  console.log(
    "INPUT MESSAGES:",
    options.input.map((msg) => ({ role: msg.role, responseType: msg.response?.type }))
  );

  console.log("Input messages full:", JSON.stringify(options.input, null, 2));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options.abortSignal, // Pass abort signal to fetch
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Error: ${response.status} ${text}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data: APIResponseData = await response.json();

    // Debug: log the raw API response
    console.log("API RESPONSE:", JSON.stringify(data, null, 2));

    // Convert API response items to AgentMessage format
    const outputMessages: AgentMessage[] = [];

    if (data.output && Array.isArray(data.output)) {
      for (const outputItem of data.output) {
        if (outputItem.type === "function_call") {
          // Convert function call to AgentMessage format
          outputMessages.push({
            role: ConversationRole.Agent,
            response: {
              type: "function_call",
              call_id: outputItem.call_id,
              name: outputItem.name,
              arguments: JSON.parse(outputItem.arguments || "{}"),
            },
          });
        } else if (outputItem.type === "message") {
          // Handle text messages - extract text from content array
          let messageContent = "";
          if (outputItem.content && Array.isArray(outputItem.content)) {
            for (const contentItem of outputItem.content) {
              if (contentItem.type === "output_text" && contentItem.text) {
                messageContent += contentItem.text;
              }
            }
          }

          outputMessages.push({
            role: ConversationRole.Agent,
            response: {
              type: "content",
              content: messageContent,
            },
          });
        } else if (outputItem.type === "computer_call") {
          // Handle computer calls (new computer use format)
          outputMessages.push({
            role: ConversationRole.Agent,
            response: {
              type: "computer_call",
              call_id: outputItem.call_id,
              action: outputItem.action,
              pending_safety_checks: outputItem.pending_safety_checks || [],
            },
          });
        }
        // Add other output types as needed
      }
    }

    // Return the response in AgentMessage format
    return { messages: outputMessages };
  } catch (error) {
    // Check if this is an abort error
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.message === "Request aborted")
    ) {
      console.log("OpenAI API request was aborted");
      throw error;
    }
    console.error("OpenAI API error:", error);
    throw error;
  }
}
