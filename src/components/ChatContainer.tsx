import React, { useState, useRef, useEffect } from "react";
import { AgentMessage, ConversationRole } from "../types";
import MessageList from "./MessageList";

interface ChatContainerProps {
  messages: AgentMessage[];
  isAgentRunning: boolean;
  onSendMessage: (message: string) => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  isAgentRunning,
  onSendMessage,
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    const message = inputValue.trim();
    if (!message || !isAgentRunning) return;

    onSendMessage(message);
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      <MessageList messages={messages} />
    </div>
  );
};

export default ChatContainer;
