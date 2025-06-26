import React, { useEffect, useRef } from "react";
import { AgentMessage, ConversationRole } from "../types";
import PromptCards from "./PromptCards";

interface MessageListProps {
  messages: AgentMessage[];
  onPromptSelect?: (prompt: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onPromptSelect }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const renderMessage = (message: AgentMessage, index: number) => {
    const getRoleClass = (role: ConversationRole) => {
      switch (role) {
        case ConversationRole.User:
          return "user-message";
        case ConversationRole.Agent:
          return "assistant-message";
        case ConversationRole.System:
          return "system-message";
        default:
          return "";
      }
    };

    const formatComputerAction = (action: any) => {
      if (!action || !action.type) return "Unknown action";

      switch (action.type) {
        case "click":
        case "left_click":
          const clickCoord = action.coordinate || [action.x, action.y];
          return `Clicked at (${clickCoord[0] || action.x}, ${clickCoord[1] || action.y})`;
        case "right_click":
          const rightClickCoord = action.coordinate || [action.x, action.y];
          return `Right-clicked at (${rightClickCoord[0] || action.x}, ${
            rightClickCoord[1] || action.y
          })`;
        case "double_click":
          return `Double-clicked at (${action.x}, ${action.y})`;
        case "type":
          return `Typed: "${action.text}"`;
        case "key":
          return `Pressed key: ${action.text}`;
        case "keypress":
          return `Pressed keys: ${
            Array.isArray(action.keys) ? action.keys.join("+") : action.keys
          }`;
        case "scroll":
          const scrollCoord = action.coordinate || [action.x, action.y];
          return `Scrolled at (${scrollCoord[0] || action.x}, ${scrollCoord[1] || action.y})`;
        case "move":
          return `Moved cursor to (${action.x}, ${action.y})`;
        case "screenshot":
          return "Took screenshot";
        case "wait":
          const duration =
            action.ms || action.duration || action.milliseconds || action.time || 1000;
          return `Waited ${duration}ms`;
        case "drag":
          return "Performed drag action";
        default:
          return `${action.type} action`;
      }
    };

    const renderContent = () => {
      switch (message.response.type) {
        case "content":
          return <div className="message-content">{message.response.content}</div>;
        case "error":
          return <div className="message-content error">Error: {message.response.error}</div>;
        case "image":
          return <div className="message-content">{message.response.content}</div>;
        case "function_call":
          return <div className="message-content">🔧 {message.response.name}</div>;
        case "computer_call":
          const computerCall = message.response as any;
          return (
            <div className="message-content">🖥️ {formatComputerAction(computerCall.action)}</div>
          );
        case "computer_call_output":
          const computerOutput = message.response as any;
          const hasScreenshot = computerOutput.output?.image_url;
          return (
            <div className="message-content">
              <div>✅ Action completed</div>
              {hasScreenshot && (
                <img
                  src={computerOutput.output.image_url}
                  alt="Screenshot after action"
                  style={{ maxWidth: "100%", marginTop: "10px" }}
                />
              )}
            </div>
          );
        default:
          return (
            <div className="message-content">
              Unknown message type: {(message.response as any).type}
            </div>
          );
      }
    };

    return (
      <div
        key={index}
        className={`message ${getRoleClass(message.role)} ${
          message.response.type === "error" ? "error-message" : ""
        }`}
      >
        {renderContent()}
      </div>
    );
  };

  return (
    <div className="messages">
      {messages.length === 0 ? (
        <PromptCards onPromptSelect={onPromptSelect || (() => {})} />
      ) : (
        messages.map(renderMessage)
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
