import { AIProvider, ChatRequest } from "./types";
import { APIResponse } from "../types";

export enum RequestType {
  Chat = "chat",
}

export type RequestMap = {
  [RequestType.Chat]: {
    request: ChatRequest;
    response: APIResponse;
  };
};

export interface ProviderConfig {
  provider: AIProvider;
  model?: string;
  useComputerUse?: boolean;
}

export const urlMap: Record<RequestType, string> = {
  [RequestType.Chat]: "/api/chat",
};
