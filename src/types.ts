import { ChatCompletionMessage } from "openai/resources/index";

export enum ConversationRole {
  User = "user",
  Agent = "assistant",
  System = "system",
}

export enum ComputerActionType {
  Click = "click",
  DoubleClick = "double_click",
  Scroll = "scroll",
  Type = "type",
  Keypress = "keypress",
  Move = "move",
  Drag = "drag",
  Wait = "wait",
  Screenshot = "screenshot",
}

export type ComputerAction = {
  type: ComputerActionType;
  x?: number;
  y?: number;
  text?: string;
  keys?: string[];
  button?: string;
  scrollX?: number;
  scrollY?: number;
  path?: Array<{ x: number; y: number }>;
  ms?: number;
};

export type SafetyCheck = {
  message: string;
  acknowledged: boolean;
};

export type ComputerActionInvocation = {
  actionId: string;
  action: ComputerAction;
  pending_safety_checks?: SafetyCheck[];
};

export type ComputerActionResult = {
  actionId: string;
  success: boolean;
  screenshot?: string;
  error?: string;
  current_url?: string;
  acknowledged_safety_checks?: SafetyCheck[];
};

export type ContentResponse = {
  type: "content";
  content: string;
};

export type ImageResponse = {
  type: "image";
  content: string;
  imageUrl: string;
};

export type ErrorResponse = {
  type: "error";
  error: string;
};

export type FunctionCallResponse = {
  type: "function_call";
  call_id: string;
  name: string;
  arguments: FunctionArguments;
};

export type FunctionCallOutputResponse = {
  type: "function_call_output";
  call_id: string;
  output: FunctionOutput;
};

export type ComputerCallResponse = {
  type: "computer_call";
  call_id: string;
  action: ComputerAction;
  pending_safety_checks: SafetyCheck[];
};

export type ComputerCallOutputResponse = {
  type: "computer_call_output";
  call_id: string;
  acknowledged_safety_checks: SafetyCheck[];
  output: ComputerActionOutput;
};

export type AgentContentMessage = {
  role: ConversationRole.Agent;
  response: ContentResponse;
};

export type AgentImageMessage = {
  role: ConversationRole.Agent;
  response: ImageResponse;
};

export type UserContentMessage = {
  role: ConversationRole.User;
  response: ContentResponse;
};

export type UserImageMessage = {
  role: ConversationRole.User;
  response: ImageResponse;
};

export type SystemMessage = {
  role: ConversationRole.System;
  response: ContentResponse;
};

export type FunctionCallMessage = {
  role: ConversationRole.Agent;
  response: FunctionCallResponse;
};

export type FunctionCallOutputMessage = {
  role: ConversationRole.Agent;
  response: FunctionCallOutputResponse;
};

export type ComputerCallMessage = {
  role: ConversationRole.Agent;
  response: ComputerCallResponse;
};

export type ComputerCallOutputMessage = {
  role: ConversationRole.Agent;
  response: ComputerCallOutputResponse;
};

export type ErrorMessage = {
  role: ConversationRole.Agent;
  response: ErrorResponse;
};

// All possible message types in our system
export type AgentMessage =
  | AgentContentMessage
  | AgentImageMessage
  | SystemMessage
  | UserContentMessage
  | UserImageMessage
  | ErrorMessage
  | FunctionCallMessage
  | FunctionCallOutputMessage
  | ComputerCallMessage
  | ComputerCallOutputMessage;

// Messages that can be part of conversation history
export type ConversationMessage = AgentContentMessage | UserContentMessage | UserImageMessage;

// Valid agent outputs
export type AgentOutput = AgentContentMessage;

// Valid inputs to agent
export type AgentInput = UserContentMessage | UserImageMessage;

// Tool definition for OpenAI
export type ComputerTool =
  | {
      type: "function";
      function: {
        name: string;
        description: string;
        parameters: {
          type?: "object";
          properties?: Record<string, unknown>;
          required?: string[];
          additionalProperties?: boolean;
        };
      };
    }
  | {
      type: "computer_use_preview";
      display_width: number;
      display_height: number;
      environment: string;
    };

// API Response structure
export type APIResponse = {
  messages: AgentMessage[];
};

// Screen dimensions
export type ScreenDimensions = {
  width: number;
  height: number;
};

// Agent configuration
export type AgentConfig = {
  model?: string;
  systemPrompt?: string;
  showImages?: boolean;
  debug?: boolean;
  printSteps?: boolean;
};

// Convert to/from OpenAI message format
export type OpenAIMessage = ChatCompletionMessage;

// New types to replace any usage

// Generic object type for unknown objects
export type UnknownObject = Record<string, unknown>;

// Function arguments can be any object
export type FunctionArguments = UnknownObject;

// Function output can be any value
export type FunctionOutput = unknown;

// Computer action arguments for different action types
export type ComputerActionArguments = {
  x?: number;
  y?: number;
  text?: string;
  keys?: string[];
  button?: string;
  scrollX?: number;
  scrollY?: number;
  path?: Array<{ x: number; y: number }>;
  ms?: number;
} & UnknownObject;

// Computer action output
export type ComputerActionOutput = {
  type: string;
  image_url?: string;
  current_url?: string;
} & UnknownObject;

// API Request body structure
export type APIRequestBody = {
  model: string;
  input: APIMessage[];
  tools?: ComputerTool[];
  truncation?: string;
  reasoning?: { effort: string };
};

// API Message format (what gets sent to OpenAI)
export type APIMessage = {
  role?: string; // function calls do not have a role
  content?: string;
  type?: string;
  name?: string;
  call_id?: string;
  arguments?: string;
  output?: unknown;
  action?: ComputerAction;
  pending_safety_checks?: SafetyCheck[];
  acknowledged_safety_checks?: SafetyCheck[];
};

// API Response data structure
export type APIResponseData = {
  output?: APIOutputItem[];
};

// API Output items
export type APIOutputItem =
  | {
      type: "function_call";
      call_id: string;
      name: string;
      arguments: string;
    }
  | {
      type: "message";
      content: Array<{
        type: string;
        text?: string;
      }>;
    }
  | {
      type: "computer_call";
      call_id: string;
      action: ComputerAction;
      pending_safety_checks: SafetyCheck[];
    };

// Handle item input types - union of all possible formats that can be passed to handleItem
export type HandleItemInput =
  | MessageItem
  | FunctionCallItem
  | ComputerCallItem
  | AgentMessage
  | RawResponseWrapper;

// Raw item types (what comes from API)
export type MessageItem = {
  type: "message";
  content?: Array<{ text?: string }>;
};

export type FunctionCallItem = {
  type: "function_call";
  name: string;
  call_id: string;
  arguments: string | FunctionArguments;
};

export type ComputerCallItem = {
  type: "computer_call";
  call_id: string;
  action: ComputerAction;
  pending_safety_checks?: SafetyCheck[];
};

// Wrapper type for items that come with response property
export type RawResponseWrapper = {
  response: {
    type: string;
    content?: string;
    name?: string;
    call_id?: string;
    arguments?: string | FunctionArguments;
    action?: ComputerAction;
    pending_safety_checks?: SafetyCheck[];
    computerAction?: {
      action: ComputerAction;
      call_id: string;
      pending_safety_checks?: SafetyCheck[];
    };
  };
};

// Debug print arguments
export type DebugPrintArgs = unknown[];

// Sanitizable message type
export type SanitizableMessage = {
  type?: string;
  output?: UnknownObject;
} & UnknownObject;
