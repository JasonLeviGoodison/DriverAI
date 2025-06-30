import React, { useState, useEffect } from "react";
import { AgentMessage, ConversationRole } from "../types";
import { AgentProvider, useAgent } from "../contexts/AgentContext";
import { KeyboardProvider, useKeyboard } from "../contexts/KeyboardContext";
import { ScreenProvider, useScreen } from "../contexts/ScreenContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import SidebarToggle from "./SidebarToggle";
import TransparentPane from "./TransparentPane";
import ScreenLock from "./ScreenLock";
import { AuthProvider } from "../contexts/AuthContext";

const AppContent: React.FC = () => {
  const {
    isAgentRunning,
    setIsAgentRunning,
    isSystemLocked,
    setIsSystemLocked,
    startAgent,
    stopAgent,
  } = useAgent();
  const { isSidebarVisible } = useKeyboard();
  const { enableClickThrough, disableClickThrough } = useScreen();
  const [messages, setMessages] = useState<AgentMessage[]>([]);

  // Check screen recording permissions on component mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        console.log("🔐 Checking screen recording permissions from UI...");
        const hasPermissions = await window.electronAPI.checkScreenRecordingPermissions();
        if (hasPermissions) {
          console.log("✅ Screen recording permissions already granted");
        } else {
          console.log(
            "⚠️ Screen recording permissions not granted - they will be requested when needed"
          );
        }
      } catch (error) {
        console.warn("Failed to check screen recording permissions:", error);
      }
    };

    checkPermissions();
  }, []);

  useEffect(() => {
    const handleAgentMessage = (message: AgentMessage) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleAgentError = (error: string) => {
      const errorMessage: AgentMessage = {
        role: ConversationRole.Agent,
        response: {
          type: "error",
          error: error,
        },
      };
      setMessages((prev) => [...prev, errorMessage]);
    };

    const handleAgentCompleted = async () => {
      setIsAgentRunning(false);
      try {
        await window.electronAPI.contractWindow();
      } catch (error) {
        console.error("Failed to contract window:", error);
      }
    };

    window.electronAPI.onAgentMessage(handleAgentMessage);
    window.electronAPI.onAgentError(handleAgentError);
    window.electronAPI.onAgentCompleted(handleAgentCompleted);

    return () => {
      window.electronAPI.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    if (!isAgentRunning) {
      stopSystemLock();
      return;
    } else if (messages[messages.length - 1]?.role === ConversationRole.User) {
      startSystemLock();
    }
  }, [messages, isAgentRunning]);

  // Handle click-through when sidebar is hidden
  useEffect(() => {
    if (!isSidebarVisible) {
      enableClickThrough();
    } else {
      disableClickThrough();
    }
  }, [isSidebarVisible, enableClickThrough, disableClickThrough]);

  const startSystemLock = async () => {
    if (isSystemLocked) return;

    console.log("🔒 Attempting to start system lock...");
    try {
      const success = await window.electronAPI.startScreenLock();
      console.log("🔒 Screen lock result:", success);
      if (success) {
        setIsSystemLocked(true);
        console.log("🔒 System lock activated successfully");
      } else {
        console.warn("🔒 System lock failed, showing visual lock only");
        setIsSystemLocked(true);
      }
    } catch (error) {
      console.warn("🔒 Failed to start system lock:", error);
      setIsSystemLocked(true);
    }
  };

  const stopSystemLock = async () => {
    if (!isSystemLocked) return;

    console.log("🔓 Attempting to stop system lock...");
    try {
      const success = await window.electronAPI.stopScreenLock();
      console.log("🔓 Screen unlock result:", success);
      setIsSystemLocked(false);
      console.log("🔓 System lock deactivated");
    } catch (error) {
      console.warn("🔓 Failed to stop system lock:", error);
      setIsSystemLocked(false);
    }
  };

  const handleEmergencyUnlock = async () => {
    await stopSystemLock();
    await stopAgent();
  };

  const sendMessage = async (message: string) => {
    if (!isAgentRunning) {
      await startAgent();
    }

    const userMessage: AgentMessage = {
      role: ConversationRole.User,
      response: {
        type: "content",
        content: message,
      },
    };

    setMessages((prev) => [...prev, userMessage]);

    await window.electronAPI.sendMessage(message);
  };

  return (
    <div id="app">
      <Header />
      <main
        className={`main ${isAgentRunning ? "expanded" : "sidebar-only"} ${
          !isSidebarVisible ? "sidebar-hidden" : ""
        }`}
      >
        {isAgentRunning && <TransparentPane isSystemLocked={isSystemLocked} />}
        {isSidebarVisible && <Sidebar messages={messages} onSendMessage={sendMessage} />}
        <SidebarToggle />
      </main>
      <ScreenLock isLocked={isSystemLocked} onEmergencyUnlock={handleEmergencyUnlock} />
    </div>
  );
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<AgentMessage[]>([]);

  const handleAgentMessage = (message: AgentMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  return (
    <AuthProvider>
      <ScreenProvider>
        <KeyboardProvider>
          <AgentProvider onAgentMessage={handleAgentMessage}>
            <AppContent />
          </AgentProvider>
        </KeyboardProvider>
      </ScreenProvider>
    </AuthProvider>
  );
};

export default App;
