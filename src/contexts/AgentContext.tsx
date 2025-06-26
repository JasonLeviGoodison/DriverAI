import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { AIProvider } from "../ai";
import { useScreen } from "./ScreenContext";
import { AgentMessage, ConversationRole } from "../types";

export interface AgentContextType {
  isAgentRunning: boolean;
  setIsAgentRunning: (running: boolean) => void;
  currentProvider: AIProvider;
  setCurrentProvider: (provider: AIProvider) => void;
  isSystemLocked: boolean;
  setIsSystemLocked: (locked: boolean) => void;
  startAgent: () => Promise<void>;
  stopAgent: () => Promise<void>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const useAgent = () => {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
};

interface AgentProviderProps {
  children: ReactNode;
  onAgentMessage?: (message: AgentMessage) => void;
}

export const AgentProvider: React.FC<AgentProviderProps> = ({ children, onAgentMessage }) => {
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<AIProvider>(AIProvider.Anthropic);
  const [isSystemLocked, setIsSystemLocked] = useState(false);

  const { enableClickThrough, disableClickThrough } = useScreen();

  useEffect(() => {
    if (isAgentRunning) {
      enableClickThrough();
    } else {
      disableClickThrough();
    }
  }, [isAgentRunning, enableClickThrough, disableClickThrough]);

  const startAgent = async () => {
    if (isAgentRunning) return;

    try {
      await window.electronAPI.startAgent({
        provider: currentProvider,
        model: currentProvider === AIProvider.Anthropic ? "claude-sonnet-4-20250514" : undefined,
      });
      setIsAgentRunning(true);
      // Expand window to full screen when agent starts
      await window.electronAPI.expandWindow();
    } catch (error) {
      console.error("Failed to start agent:", error);
      const errorMessage: AgentMessage = {
        role: ConversationRole.Agent,
        response: {
          type: "error",
          error: "Failed to start agent",
        },
      };
      if (onAgentMessage) {
        onAgentMessage(errorMessage);
      }
      throw error;
    }
  };

  const stopAgent = async () => {
    if (!isAgentRunning) return;

    try {
      await window.electronAPI.stopAgent();
      setIsAgentRunning(false);
      // Contract window back to sidebar when agent stops
      await window.electronAPI.contractWindow();
    } catch (error) {
      console.error("Failed to stop agent:", error);
      const errorMessage: AgentMessage = {
        role: ConversationRole.Agent,
        response: {
          type: "error",
          error: "Failed to stop agent",
        },
      };
      if (onAgentMessage) {
        onAgentMessage(errorMessage);
      }
      throw error;
    }
  };

  const value: AgentContextType = {
    isAgentRunning,
    setIsAgentRunning,
    currentProvider,
    setCurrentProvider,
    isSystemLocked,
    setIsSystemLocked,
    startAgent,
    stopAgent,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
};
