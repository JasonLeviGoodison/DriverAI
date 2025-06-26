import React from "react";
import { useScreen } from "../contexts/ScreenContext";
import { Lock } from "lucide-react";

interface ScreenLockProps {
  isLocked: boolean;
  onEmergencyUnlock?: () => void;
}

const styles = `
  .screen-lock-overlay {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    pointer-events: none;
  }

  .lock-indicator {
    background: rgba(40, 40, 40, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    color: white;
    max-width: 280px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
  }

  .lock-icon {
    font-size: 32px;
    margin-bottom: 12px;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .lock-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 6px;
    color: #ffffff;
  }

  .lock-subtitle {
    font-size: 14px;
    margin-bottom: 8px;
    color: #e0e0e0;
  }

  .lock-hint {
    font-size: 11px;
    color: #a0a0a0;
    margin-bottom: 16px;
    line-height: 1.4;
  }

  .emergency-unlock {
    background: rgba(255, 59, 48, 0.8);
    border: none;
    border-radius: 6px;
    color: white;
    padding: 8px 16px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .emergency-unlock:hover {
    background: rgba(255, 59, 48, 1);
  }
`;

const ScreenLock: React.FC<ScreenLockProps> = ({ isLocked, onEmergencyUnlock }) => {
  const { enableClickThrough, disableClickThrough } = useScreen();

  if (!isLocked) return null;

  const handleMouseEnter = async () => {
    await disableClickThrough();
  };

  const handleMouseLeave = async () => {
    await enableClickThrough();
  };

  return (
    <div className="screen-lock-overlay">
      <div
        className="lock-indicator"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="lock-icon">
          <Lock size={32} />
        </div>
        <div className="lock-title">AI Agent Active</div>
        <div className="lock-subtitle">Please do not type or click.</div>
        <div className="lock-hint">
          The system is working. Please do not interfere with it unless you need to abort the agent.
        </div>
        {onEmergencyUnlock && (
          <button className="emergency-unlock" onClick={onEmergencyUnlock}>
            Stop
          </button>
        )}
      </div>
      <style>{styles}</style>
    </div>
  );
};

export default ScreenLock;
