import React, { useState, useRef, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { AgentMessage } from "../types";
import { useAgent } from "../contexts/AgentContext";
import { useScreen } from "../contexts/ScreenContext";
import { useKeyboard } from "../contexts/KeyboardContext";
import MessageList from "./MessageList";

interface SidebarProps {
  messages: AgentMessage[];
  onSendMessage: (message: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ messages, onSendMessage }) => {
  const { isAgentRunning } = useAgent();
  const { enableClickThrough, disableClickThrough } = useScreen();
  const { toggleSidebar } = useKeyboard();
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [inputValue]);

  useEffect(() => {
    const updateClickThrough = async () => {
      if (isAgentRunning) {
        await enableClickThrough();
      } else {
        await disableClickThrough();
      }
    };

    updateClickThrough();
  }, [isAgentRunning, enableClickThrough, disableClickThrough]);

  const handleSend = () => {
    const message = inputValue.trim();
    if (!message) return;

    onSendMessage(message);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setInputValue(prompt);
    // Focus the textarea after setting the prompt
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  return (
    <div
      ref={sidebarRef}
      className="sidebar"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <div
        className="sidebar-content"
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        {/* Agent Control Buttons */}
        <div
          className="chat-history-panel"
          style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ margin: 0 }}>Chat</h3>
            <button
              onClick={toggleSidebar}
              title="Hide sidebar (Ctrl+H)"
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "4px",
                color: "#fff",
                cursor: "pointer",
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "fit-content",
                height: "28px",
                transition: "all 0.2s ease",
                gap: "0.4em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <ChevronRight size={16} />
              <span
                style={{
                  fontSize: "0.85em",
                  color: "#bbb",
                  marginLeft: "0.3em",
                  userSelect: "none",
                  fontFamily: "monospace",
                  letterSpacing: "0.01em",
                }}
              >
                Ctrl+H
              </span>
            </button>
          </div>
          <MessageList messages={messages} onPromptSelect={handlePromptSelect} />
        </div>

        {/* Clean, dark, premium input area */}
        <div
          className="input-container premium-input-container"
          style={{
            flexShrink: 0,
            pointerEvents: "auto",
            background: "rgba(24, 24, 27, 0.92)", // zinc-900 with transparency
            borderTop: "1.5px solid #27272a", // zinc-800
            padding: "1.1rem 1.1rem 1.1rem 1.1rem",
            boxShadow: "0 -2px 16px 0 rgba(0,0,0,0.18)",
            backdropFilter: "blur(2px)",
            zIndex: 2,
          }}
        >
          <div
            className="input-wrapper premium-input-wrapper"
            style={{
              display: "flex",
              alignItems: "flex-end",
              background: "rgba(17, 17, 19, 0.92)", // even darker
              borderRadius: "1.1rem",
              border: "1.5px solid #18181b", // zinc-900
              boxShadow: "0 2px 16px 0 rgba(24,24,27,0.10)",
              padding: "0.5rem 0.7rem 0.5rem 1rem",
              gap: "0.5rem",
            }}
          >
            <textarea
              ref={textareaRef}
              className="premium-textarea"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={"Type your message here..."}
              style={{
                resize: "none",
                border: "none",
                outline: "none",
                background: "transparent",
                color: "#fafafa", // zinc-50
                fontSize: "1.05rem",
                fontFamily: "inherit",
                minHeight: "44px",
                maxHeight: "120px",
                width: "100%",
                padding: 0,
                margin: 0,
                boxShadow: "none",
                lineHeight: 1.5,
                fontWeight: 500,
                letterSpacing: "0.01em",
                transition: "color 0.2s",
                pointerEvents: "auto",
              }}
            />
            <button
              className="btn btn-primary premium-send-btn"
              onClick={handleSend}
              style={{
                marginLeft: "0.2rem",
                marginBottom: "0.2rem",
                borderRadius: "0.8rem",
                background: "linear-gradient(90deg, #18181b 0%, #27272a 100%)", // zinc-900 to zinc-800
                color: "#fafafa",
                fontWeight: 600,
                border: "1.5px solid #27272a",
                padding: "0.55rem 1.25rem",
                fontSize: "1rem",
                cursor: "pointer",
                boxShadow: "0 2px 8px 0 rgba(24,24,27,0.10)",
                transition: "background 0.18s, box-shadow 0.18s, border-color 0.18s",
                pointerEvents: "auto",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(90deg, #27272a 0%, #18181b 100%)";
                e.currentTarget.style.borderColor = "#3f3f46"; // zinc-700
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(90deg, #18181b 0%, #27272a 100%)";
                e.currentTarget.style.borderColor = "#27272a";
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
