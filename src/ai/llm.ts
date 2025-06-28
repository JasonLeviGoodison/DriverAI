import { AgentMessage, APIResponse, ComputerTool } from "../types";
import { AIProvider, ChatRequest } from "../requests/types";
import { RequestType } from "../requests/requestRegistry";
import { makeAuthenticatedRequest } from "../../node-src/AuthenticatedRequests";

type CreateResponseOptions = {
  model: string;
  input: AgentMessage[];
  tools: ComputerTool[];
  truncation?: string;
  provider?: AIProvider;
  abortSignal?: AbortSignal;
};

// Non-hook version that works in Electron
export async function createResponse(options: CreateResponseOptions): Promise<APIResponse> {
  const provider = options.provider || AIProvider.OpenAI;

  const chatRequest: ChatRequest = {
    model: options.model,
    input: options.input,
    tools: options.tools,
    truncation: options.truncation,
    provider: provider,
  };

  return await makeAuthenticatedRequest(RequestType.Chat, chatRequest, {
    signal: options.abortSignal,
  });
}
