import { AgentMessage, APIResponse, ComputerTool } from "../types";
import { createOpenAIResponse } from "./openai";
import { createAnthropicResponse } from "./claude";

// AI Provider enum
export enum AIProvider {
  OpenAI = "openai",
  Anthropic = "anthropic",
}

// Provider configuration
export interface ProviderConfig {
  provider: AIProvider;
  model?: string;
  useComputerUse?: boolean;
}

// Main createResponse function with provider selection
export async function createResponse(options: {
  model: string;
  input: AgentMessage[];
  tools: ComputerTool[];
  truncation?: string;
  provider?: AIProvider;
  abortSignal?: AbortSignal;
}): Promise<APIResponse> {
  const provider = options.provider || AIProvider.OpenAI;

  console.log(`Using ${provider} provider with model: ${options.model}`);

  if (provider === AIProvider.Anthropic) {
    return createAnthropicResponse(options);
  } else {
    return createOpenAIResponse(options);
  }
}
