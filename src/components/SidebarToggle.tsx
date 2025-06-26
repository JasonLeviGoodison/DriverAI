import React, { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useKeyboard } from "../contexts/KeyboardContext";
import { useScreen } from "../contexts/ScreenContext";

const SidebarToggle: React.FC = () => {
  const { enableClickThrough, disableClickThrough } = useScreen();
  const { isSidebarVisible, toggleSidebar } = useKeyboard();

  if (isSidebarVisible) {
    return null; // Don't show the toggle when sidebar is visible
  }

  useEffect(() => {
    if (isSidebarVisible) {
      enableClickThrough();
    } else {
      disableClickThrough();
    }
  }, [isSidebarVisible]);

  return (
    <div className="sidebar-toggle">
      <button
        className="sidebar-toggle-btn"
        onClick={toggleSidebar}
        title="Show sidebar (Cmd+Shift+H)"
        onMouseLeave={() => {
          enableClickThrough();
        }}
        onMouseEnter={() => {
          disableClickThrough();
        }}
      >
        <ChevronLeft size={20} />
      </button>
    </div>
  );
};

export default SidebarToggle;
