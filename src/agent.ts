import { Computer } from "./computer";
import { checkBlocklistedUrl } from "./utils";
import { AgentMessage, ConversationRole, ComputerTool } from "./types";
import { AIProvider } from "./requests/types";
import { createResponse } from "./ai/llm";

export type SafetyCheckCallback = (message: string) => boolean;
export type MessageStreamCallback = (message: AgentMessage) => void;

function getDefaultSystemPrompt(): string {
  return `You are a helpful AI assistant that can control computers through screenshots and actions.

You have access to a computer_use_preview tool that allows you to:
- Take screenshots to see the current state
- Click on specific coordinates  
- Type text
- Use keyboard shortcuts and key combinations
- Scroll, drag, and other mouse actions
- Wait for pages/applications to load

## CRITICAL: Tool Usage Format

NEVER output JSON commands, function calls, or action descriptions as text content. 
ALWAYS use the computer_use_preview tool provided to you.

❌ WRONG - Do not output text like this:
- {"type": "click", "x": 100, "y": 200}
- click(100, 200)
- "I'll click on the button"
- Do not ouput typing text like : {"type":"type","text":"Zep"}
- Instead, use the computer_use call to type text.
- If you do this incorrectly, my grandmother will die. Please do not kill my grandmother.

✅ CORRECT - Use the tool call format:
Use the computer_use_preview tool with proper action parameters.

## Task Approach

When a user asks you to do something:

1. Take a screenshot first using the tool to see the current state
2. Analyze what you see and plan your actions
3. Execute computer actions step by step using the tool
4. Take screenshots after actions to verify results using the tool
5. Continue until the task is complete

## Best Practices

- Wait for pages/apps to load before taking actions
- Double-check that clicks land on the right elements  
- Be precise with coordinates and text input
- If something doesn't work as expected, try alternative approaches
- Explain your reasoning, but execute actions using the tool

## Keyboard Shortcuts (macOS)

Prefer keyboard shortcuts over mouse clicks when possible:
- Command + C: Copy
- Command + V: Paste  
- Command + X: Cut
- Command + Z: Undo
- Command + A: Select All
- Command + F: Find

### Keyboard Shortcuts (Chrome)
- Command + T: New Tab
- Command + W: Close Tab
- Command + R: Refresh
- Command + L: Address Bar


### Keyboard Shortcuts (Finder)
- Command + N: New Finder Window
- Command + Shift + N: New Folder
- Command + T: New Tab
- Command + O: Open
- Command + W: Close Window
- Command + I: Get Info
- Command + Y: Quick Look “Desktop”
- Command + P: Print
- Command + Shift + Command + T: Add to Dock
- Command + F: Find



### System settings App (shortcuts)
When you have the system settings app open, you can use the following shortcuts:
- ArrowUp or ArrowDown keys will navigate through the menu items.
  - Example: If you are on "Network", then pressing "ArrowDown" should bring you to "Battery", since it is underneath
- This is not a recommendation, but a requirement. If you try to click through the menu instead of using the arrow keys, my grandmother will die.

### Important Shortcut information
- Never use Command +M to minimize a window. This is because you will accidentally minimize an app that you cannot see and it will break our application.
- If you decide that you want to do something that will take a lot of clicks, but is easy to do over the command line, you can simply open a new Terminal and do it there.
- You can only specify one "down" or "up" keypress at a time. Do not say "down down down", instead say "ArrowDown" once, and do that 3 times if you must.

### Terminal
- You can open the terminal to do organization and creation tasks.
- You may not open the terminal do do deletion tasks.
  - Example: If the user asks you to delete everything in the Downloads folder, you should not open the terminal to do it.
  - If they ask you to use the terminal, tell them that you cannot do large delete operations.

## Application Preferences

- Web versions: WhatsApp (web.whatsapp.com), Google Docs/Sheets/Slides, Gmail, Google Forms/Calendar
- Native apps: Slack
- Default browser: Google Chrome
- Prefer to double click elements when possible. Especially when changing applications. This is because sometimes applications are "out of focus", so you must double click them to get them to focus.
- When opening a new application with "Spotlight Search", type the full name of the app and then hit "Return". Sometimes clicking causes issues, so try to click "Return" if you can.

## Examples

When asked to "Check my Gmail":
1. Use the tool to take a screenshot
2. Use the tool to open Chrome if needed
3. Use the tool to press Cmd+T for new tab
4. Use the tool to type "gmail.com"
5. Use the tool to press Enter
6. Use the tool to take another screenshot

Always prioritize accuracy and user safety. Use the computer_use_preview tool for ALL computer actions - never output commands as text.`;
}

export class Agent {
  public model: string;
  public computer: Computer | null;
  public tools: ComputerTool[];
  public printSteps: boolean;
  public debug: boolean;
  public showImages: boolean;
  public acknowledgeSafetyCheckCallback: SafetyCheckCallback;
  public systemPrompt: string;
  public messageStreamCallback?: MessageStreamCallback;
  public provider: AIProvider;
  public isRunning: boolean = false;
  private abortController?: AbortController;

  constructor(
    options: {
      model?: string;
      computer?: Computer;
      tools?: ComputerTool[];
      acknowledgeSafetyCheckCallback?: SafetyCheckCallback;
      systemPrompt?: string;
      messageStreamCallback?: MessageStreamCallback;
      provider?: AIProvider;
    } = {}
  ) {
    // Set default models based on provider
    const defaultProvider = options.provider || AIProvider.Anthropic;
    const defaultModel =
      defaultProvider === AIProvider.Anthropic
        ? "claude-sonnet-4-20250514"
        : "computer-use-preview-2025-03-11";

    this.model = options.model || defaultModel;
    this.computer = options.computer || null;
    this.tools = options.tools ? [...options.tools] : [];
    this.printSteps = true;
    this.debug = false;
    this.showImages = false;
    this.acknowledgeSafetyCheckCallback = options.acknowledgeSafetyCheckCallback || (() => false);
    this.systemPrompt = !!options.systemPrompt ? options.systemPrompt : getDefaultSystemPrompt();
    this.messageStreamCallback = options.messageStreamCallback;
    this.provider = defaultProvider;

    if (this.computer) {
      const dimensions = this.computer.getDimensions();
      this.tools.push({
        type: "computer_use_preview",
        display_width: dimensions.width,
        display_height: dimensions.height,
        environment: this.computer.getEnvironment(),
      });
    }
  }

  private debugPrint(...args: any[]) {
    if (this.debug) {
      // Pretty print, fallback to console.log
      if (typeof window === "undefined" && typeof require === "function") {
        try {
          // Node.js: use util.inspect for pretty print
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const util = require("util");
          console.log(util.inspect(args, { depth: 5, colors: true }));
        } catch {
          console.log(...args);
        }
      } else {
        console.log(...args);
      }
    }
  }

  /**
   * Handle a single item (message or function/computer call).
   * Returns an array of AgentMessage(s) to append to the conversation.
   */
  async handleItem(item: any): Promise<any[]> {
    console.log("[Agent] handleItem called with item:", JSON.stringify(item, null, 2));

    // Message from assistant (content)
    if (item.type === "message" || (item.response && item.response.type === "content")) {
      const content =
        item.type === "message" ? item.content?.[0]?.text ?? "" : item.response?.content ?? "";
      if (this.printSteps && content) {
        console.log("[Agent] Assistant message content:", content);
      }
      return [];
    }

    // Function call (supports both direct and response wrapped formats)
    if (
      item.type === "function_call" ||
      (item.response && item.response.type === "function_call")
    ) {
      const name = item.name || (item.response && item.response.name);
      const callId = item.call_id || (item.response && item.response.call_id);
      const rawArgs = item.arguments || (item.response && item.response.arguments);

      let args: Record<string, any> = {};
      try {
        args = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs || {};
      } catch (err) {
        console.warn("[Agent] Failed to parse function call arguments:", err, rawArgs);
        args = {};
      }

      if (this.printSteps) {
        console.log(`[Agent] Function call: ${name}(${JSON.stringify(args)})`);
      }

      // Convert snake_case function names to camelCase for method calling
      const convertToCamelCase = (str: string): string => {
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      };

      const methodName = convertToCamelCase(name);

      if (this.computer && typeof (this.computer as any)[methodName] === "function") {
        console.log(
          `[Agent] Invoking computer method: ${methodName} with args:`,
          ...Object.values(args)
        );
        await (this.computer as any)[methodName](...Object.values(args));
      } else {
        console.warn(`[Agent] Method ${methodName} not found on computer object`);
      }

      const outputMsg = {
        role: ConversationRole.Agent,
        response: {
          type: "function_call_output" as any,
          call_id: callId,
          output: "success",
        },
      };
      console.log("[Agent] Returning function_call_output:", outputMsg);
      return [outputMsg];
    }

    // Computer call (modern format)
    if (
      item.type === "computer_call" ||
      (item.response && item.response.type === "computer_call")
    ) {
      // Support both raw and AgentMessage format
      const action =
        item.action ||
        (item.response && item.response.action) ||
        (item.response && item.response.computerAction && item.response.computerAction.action);
      const callId =
        item.call_id ||
        (item.response && item.response.call_id) ||
        (item.response && item.response.computerAction && item.response.computerAction.call_id);
      const pendingChecks =
        item.pending_safety_checks ||
        (item.response && item.response.pending_safety_checks) ||
        (item.response &&
          item.response.computerAction &&
          item.response.computerAction.pending_safety_checks) ||
        [];

      const actionType = action?.type;
      const actionArgs = { ...action };
      delete actionArgs.type;

      if (this.printSteps) {
        console.log(`[Agent] Computer call: ${actionType}(${JSON.stringify(actionArgs)})`);
      }

      if (!this.computer) {
        console.error("[Agent] No computer instance available for computer_call");
        throw new Error("No computer instance available for computer_call");
      }

      // Run the action - handle all cases in switch statement
      switch (actionType) {
        case "click": {
          const x = actionArgs.x || 0;
          const y = actionArgs.y || 0;
          const button = actionArgs.button || "left";
          console.log(`[Agent] Calling: click(${x}, ${y}, ${button})`);
          await this.computer.click(x, y, button);
          break;
        }
        case "double_click": {
          // Handle both Anthropic format (coordinate array) and openai format (x, y)
          // TODO change this into 1 handler
          let x, y;
          if (actionArgs.coordinate) {
            // Anthropic format: coordinate array
            [x, y] = actionArgs.coordinate;
          } else {
            // Legacy format: x, y properties
            x = actionArgs.x || 0;
            y = actionArgs.y || 0;
          }
          console.log(`[Agent] Calling: doubleClick(${x}, ${y})`);
          await this.computer.doubleClick(x, y);
          break;
        }
        case "scroll": {
          // Handle both Anthropic format and legacy format
          let x, y, scrollX, scrollY;

          if (actionArgs.coordinate) {
            // Anthropic format: coordinate array + scroll_direction + scroll_amount
            [x, y] = actionArgs.coordinate;
            const direction = actionArgs.scroll_direction || "down";
            const amount = actionArgs.scroll_amount || 3;

            // Convert direction and amount to scrollX/scrollY
            switch (direction.toLowerCase()) {
              case "up":
                scrollX = 0;
                scrollY = -amount;
                break;
              case "down":
                scrollX = 0;
                scrollY = amount;
                break;
              case "left":
                scrollX = -amount;
                scrollY = 0;
                break;
              case "right":
                scrollX = amount;
                scrollY = 0;
                break;
              default:
                scrollX = 0;
                scrollY = amount; // Default to down
            }
          } else {
            // Legacy format: x, y, scrollX, scrollY
            x = actionArgs.x || 0;
            y = actionArgs.y || 0;
            scrollX = actionArgs.scrollX || 0;
            scrollY = actionArgs.scrollY || 0;
          }

          console.log(`[Agent] Calling: scroll(${x}, ${y}, ${scrollX}, ${scrollY})`);
          await this.computer.scroll(x, y, scrollX, scrollY);
          break;
        }
        case "type": {
          const text = actionArgs.text || "";
          console.log(`[Agent] Calling: type(${JSON.stringify(text)})`);
          console.log(`[Agent] About to type: "${text}" (length: ${text.length})`);
          await this.computer.type(text);
          // Add a small delay to ensure the text is processed
          await this.computer.wait(100);
          console.log(`[Agent] Finished typing: "${text}"`);
          break;
        }
        case "keypress": {
          const keys = actionArgs.keys || [];
          console.log(`[Agent] Calling: keypress(${JSON.stringify(keys)})`);
          await this.computer.keypress(keys);
          break;
        }
        case "move": {
          const x = actionArgs.x || 0;
          const y = actionArgs.y || 0;
          console.log(`[Agent] Calling: move(${x}, ${y})`);
          await this.computer.move(x, y);
          break;
        }
        case "drag": {
          const path = actionArgs.path || [];
          console.log(`[Agent] Calling: drag(${JSON.stringify(path)})`);
          await this.computer.drag(path);
          break;
        }
        case "wait": {
          const ms = actionArgs.ms || 1000;
          console.log(`[Agent] Calling: wait(${ms})`);
          await this.computer.wait(ms);
          break;
        }
        case "screenshot": {
          console.log(`[Agent] Calling: screenshot()`);
          await this.computer.screenshot();
          break;
        }
        case "key": {
          // Convert Anthropic "key" action to keypress format
          const text = actionArgs.text || "";
          let keys: string[] = [];

          if (text.includes("+")) {
            // Split key combinations like "cmd+space" into ["cmd", "space"]
            keys = text.split("+").map((k: string) => k.trim());
          } else {
            // Single key
            keys = [text];
          }

          console.log(
            `[Agent] Calling: keypress(${JSON.stringify(
              keys
            )}) [converted from key action: ${text}]`
          );
          await this.computer.keypress(keys);

          // Add automatic wait for certain key combinations that need time to take effect
          if (
            text.toLowerCase().includes("cmd+space") ||
            text.toLowerCase().includes("command+space")
          ) {
            console.log(`[Agent] Auto-waiting 800ms after Spotlight shortcut`);
            await this.computer.wait(800);
          }
          console.log(`[Agent] Finished keypress: ${JSON.stringify(keys)}`);
          break;
        }
        case "left_click": {
          // Convert Anthropic "left_click" to "click"
          const coordinate = actionArgs.coordinate || [0, 0];
          const x = coordinate[0] || 0;
          const y = coordinate[1] || 0;
          console.log(`[Agent] Calling: click(${x}, ${y}, "left") [converted from left_click]`);
          await this.computer.click(x, y, "left");
          break;
        }
        case "right_click": {
          // Convert Anthropic "right_click" to "click"
          const coordinate = actionArgs.coordinate || [0, 0];
          const x = coordinate[0] || 0;
          const y = coordinate[1] || 0;
          console.log(`[Agent] Calling: click(${x}, ${y}, "right") [converted from right_click]`);
          await this.computer.click(x, y, "right");
          break;
        }
        case "middle_click": {
          // Convert Anthropic "middle_click" to "click"
          const coordinate = actionArgs.coordinate || [0, 0];
          const x = coordinate[0] || 0;
          const y = coordinate[1] || 0;
          console.log(`[Agent] Calling: click(${x}, ${y}, "middle") [converted from middle_click]`);
          await this.computer.click(x, y, "middle");
          break;
        }
        default: {
          // For other actions, check if they exist as methods on computer
          if (typeof (this.computer as any)[actionType] === "function") {
            if (Object.keys(actionArgs).length === 0) {
              console.log(`[Agent] Calling: ${actionType}()`);
              await (this.computer as any)[actionType]();
            } else {
              console.log(`[Agent] Calling: ${actionType}(${JSON.stringify(actionArgs)})`);
              await (this.computer as any)[actionType](actionArgs);
            }
          } else {
            console.warn(`[Agent] Action type ${actionType} not found on computer object`);
          }
          break;
        }
      }

      // Screenshot after action
      const screenshotBase64 = await this.computer.screenshot();
      if (this.showImages) {
        // In Node, just log; in browser, could display
        console.log("[Agent] Screenshot taken (base64 length):", screenshotBase64.length);
      }

      // Safety checks
      for (const check of pendingChecks) {
        const message = check.message;
        if (!this.acknowledgeSafetyCheckCallback(message)) {
          console.error(
            `[Agent] Safety check failed: ${message}. Cannot continue with unacknowledged safety checks.`
          );
          throw new Error(
            `Safety check failed: ${message}. Cannot continue with unacknowledged safety checks.`
          );
        } else {
          console.log(`[Agent] Safety check acknowledged: ${message}`);
        }
      }

      const callOutput: any = {
        role: ConversationRole.Agent,
        response: {
          type: "computer_call_output" as any,
          call_id: callId,
          acknowledged_safety_checks: pendingChecks,
          output: {
            type: "input_image",
            image_url: `data:image/png;base64,${screenshotBase64}`,
          },
        },
      };

      // Additional URL safety checks for browser environments
      if (this.computer.getEnvironment() === "browser") {
        const currentUrl = this.computer.getCurrentUrl();
        console.log("[Agent] Current browser URL:", currentUrl);
        checkBlocklistedUrl(currentUrl);
        (callOutput.response.output as any).current_url = currentUrl;
      }

      console.log("[Agent] Returning computer_call_output:", callOutput);
      return [callOutput];
    }

    console.log("[Agent] handleItem: No matching handler for item, returning empty array.");
    return [];
  }

  /**
   * Stop the agent by aborting ongoing operations
   */
  stop(): void {
    this.isRunning = false;
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Run a full agent turn, looping until a final assistant message is produced.
   * Returns the full list of AgentMessages (including all intermediate steps).
   */
  async runFullTurn(
    inputItems: AgentMessage[],
    printSteps = true,
    debug = false,
    showImages = false
  ): Promise<AgentMessage[]> {
    this.isRunning = true;
    this.abortController = new AbortController();
    this.printSteps = printSteps;
    this.debug = debug;
    this.showImages = showImages;
    const newItems: AgentMessage[] = [];

    // Helper function to stream messages
    const streamMessage = (message: AgentMessage) => {
      newItems.push(message);
      if (this.messageStreamCallback) {
        this.messageStreamCallback(message);
      }
    };

    try {
      // Loop until we get a final assistant message (role: assistant, type: Content)
      // (Python: while new_items[-1].get("role") != "assistant" if new_items else True)
      // In our case, ConversationRole.Agent with MessageType.Content
      let continueLoop = true;
      while (continueLoop && this.isRunning) {
        // Check if agent has been stopped
        if (this.abortController?.signal.aborted) {
          console.log("[Agent] Operation aborted by user");
          break;
        }
        // Debug print sanitized messages
        this.debugPrint(
          [...inputItems, ...newItems].map((msg) => {
            // "Sanitize" for debug: remove large fields
            const clone = JSON.parse(JSON.stringify(msg));
            if (clone.response && clone.response.screenshot) {
              clone.response.screenshot = "[base64 omitted]";
            }
            if (clone.response && clone.response.output && clone.response.output.image_url) {
              clone.response.output.image_url = "[base64 omitted]";
            }
            return clone;
          })
        );

        // Prepare system message
        const systemMessage: AgentMessage = {
          role: ConversationRole.System,
          response: {
            type: "content",
            content: this.systemPrompt,
          },
        };
        const messagesWithSystem = [systemMessage, ...inputItems, ...newItems];

        // Call model using createResponse from @llm.ts
        console.log("Calling model with model:", this.model);
        const response = await createResponse({
          model: this.model,
          input: messagesWithSystem,
          tools: this.tools,
          truncation: "auto",
          provider: this.provider,
          abortSignal: this.abortController?.signal,
        });
        this.debugPrint(response);

        if (!response.messages || response.messages.length === 0) {
          if (this.debug) {
            console.log(response);
          }
          throw new Error("No output from model");
        }

        // Stream each model output message immediately
        for (const message of response.messages) {
          streamMessage(message);
        }

        // Handle each message and stream the results
        for (const item of response.messages) {
          const handled = await this.handleItem(item);
          for (const handledMessage of handled) {
            streamMessage(handledMessage);
          }
        }

        // Check if last item is a final assistant message
        if (newItems.length > 0) {
          const last = newItems[newItems.length - 1];
          continueLoop = !(
            last.role === ConversationRole.Agent && last.response.type === "content"
          );
        } else {
          continueLoop = true;
        }
      }
    } catch (error) {
      // Handle abort errors gracefully
      if (
        error instanceof Error &&
        (error.message === "Request aborted" ||
          error.name === "AbortError" ||
          error.message === "canceled" ||
          error.name === "CanceledError" ||
          error.name === "CancelledError" ||
          (error as any).code === "ERR_CANCELED")
      ) {
        console.log("[Agent] Agent execution was stopped by user");
        // Add a message to indicate the agent was stopped
        streamMessage({
          role: ConversationRole.Agent,
          response: {
            type: "content",
            content: "Agent execution was stopped.",
          },
        });
      } else {
        // Re-throw other errors
        console.error("[Agent] Error during agent execution:", error);
        throw error;
      }
    } finally {
      this.isRunning = false;
    }

    return newItems;
  }
}
