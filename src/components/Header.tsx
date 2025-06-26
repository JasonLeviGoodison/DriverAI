import React, { useState, useEffect } from "react";
import { Settings, Minus, Square, X } from "lucide-react";
import { useAgent } from "../contexts/AgentContext";
import { useScreen } from "../contexts/ScreenContext";
import { useKeyboard } from "../contexts/KeyboardContext";
import { AIProvider } from "../ai";

const Header: React.FC = () => {
  const { isAgentRunning, currentProvider, setCurrentProvider } = useAgent();
  const { enableClickThrough, disableClickThrough } = useScreen();
  const { isSidebarVisible } = useKeyboard();
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isMac, setIsMac] = useState<boolean>(false);

  useEffect(() => {
    // Detect if we're on macOS
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  // Don't render header when sidebar is hidden
  if (!isSidebarVisible) {
    return null;
  }

  const handleMinimize = () => {
    if (window.electronAPI?.minimizeWindow) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    if (window.electronAPI?.toggleMaximizeWindow) {
      window.electronAPI.toggleMaximizeWindow();
    }
  };

  const handleClose = () => {
    if (window.electronAPI?.closeWindow) {
      window.electronAPI.closeWindow();
    }
  };

  const handleMouseEnter = () => {
    disableClickThrough();
  };

  const handleMouseLeave = () => {
    if (isAgentRunning) {
      enableClickThrough();
    }
  };

  const handleProviderChange = (provider: AIProvider) => {
    if (!isAgentRunning) {
      setCurrentProvider(provider);
      setIsMenuOpen(false);
    }
  };

  const getModelDisplayName = (provider: AIProvider) => {
    switch (provider) {
      case AIProvider.Anthropic:
        return "Claude Sonnet 4";
      case AIProvider.OpenAI:
        return "OpenAI Computer Use";
      default:
        return provider;
    }
  };

  return (
    <header className="title-bar" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {/* Traffic lights area for macOS */}
      {isMac && <div className="traffic-light-bar" />}

      {/* Windows controls area */}
      {!isMac && <div className="windows-bar" />}

      {/* macOS account/settings area */}
      {isMac && <div className="mac-account-bar" />}

      {/* Settings menu */}
      <div className="settings-menu">
        <div className="menu-container">
          <button
            className="settings-button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="Settings"
          >
            <Settings size={20} color="white" />
          </button>

          {isMenuOpen && (
            <div className="menu-dropdown">
              <div className="menu-section">
                <div className="menu-section-title">AI Model</div>
                <div className="menu-section-subtitle">
                  Current: {getModelDisplayName(currentProvider)}
                </div>
                {isAgentRunning && (
                  <div className="menu-section-note">Stop agent to change model</div>
                )}
              </div>

              <div
                className={`menu-item ${
                  currentProvider === AIProvider.Anthropic ? "menu-item-selected" : ""
                } ${isAgentRunning ? "menu-item-disabled" : ""}`}
                onClick={() => handleProviderChange(AIProvider.Anthropic)}
                title={isAgentRunning ? "Stop agent to change model" : "Switch to Claude Sonnet 4"}
              >
                <span>Claude Sonnet 4</span>
                {currentProvider === AIProvider.Anthropic && (
                  <span className="menu-item-check">✓</span>
                )}
              </div>

              <div
                className={`menu-item ${
                  currentProvider === AIProvider.OpenAI ? "menu-item-selected" : ""
                } ${isAgentRunning ? "menu-item-disabled" : ""}`}
                onClick={() => handleProviderChange(AIProvider.OpenAI)}
                title={
                  isAgentRunning ? "Stop agent to change model" : "Switch to OpenAI Computer Use"
                }
              >
                <span>OpenAI Computer Use</span>
                {currentProvider === AIProvider.OpenAI && (
                  <span className="menu-item-check">✓</span>
                )}
              </div>

              <div className="menu-divider" />

              <div className="menu-item" onClick={() => setIsMenuOpen(false)}>
                About
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Window controls for Windows */}
      {!isMac && (
        <div className="window-controls">
          <button
            className="window-control-btn minimize-btn"
            onClick={handleMinimize}
            title="Minimize"
          >
            <Minus size={16} />
          </button>
          <button
            className="window-control-btn maximize-btn"
            onClick={handleMaximize}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            <Square size={16} />
          </button>
          <button className="window-control-btn close-btn" onClick={handleClose} title="Close">
            <X size={16} />
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
