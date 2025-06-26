import React from "react";

interface StatusBarProps {
  status: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ status }) => {
  return <div className="status">{status}</div>;
};

export default StatusBar;
