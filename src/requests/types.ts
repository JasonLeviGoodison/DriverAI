import { AgentMessage, ComputerTool } from "../types";

export interface ChatRequest {
  model: string;
  input: AgentMessage[];
  tools: ComputerTool[];
  truncation?: string;
  provider?: AIProvider;
}

export enum AIProvider {
  OpenAI = "openai",
  Anthropic = "anthropic",
}

export interface Profile {
  sub: string;
}
