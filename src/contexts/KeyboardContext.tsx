import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface KeyboardContextType {
  isSidebarVisible: boolean;
  toggleSidebar: () => void;
  setSidebarVisible: (visible: boolean) => void;
}

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

export const useKeyboard = () => {
  const context = useContext(KeyboardContext);
  if (context === undefined) {
    throw new Error("useKeyboard must be used within a KeyboardProvider");
  }
  return context;
};

interface KeyboardProviderProps {
  children: ReactNode;
}

export const KeyboardProvider: React.FC<KeyboardProviderProps> = ({ children }) => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const setSidebarVisible = (visible: boolean) => {
    setIsSidebarVisible(visible);
  };

  // Register global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+Shift+H (Mac) or Ctrl+Shift+H (Windows/Linux) to toggle sidebar
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === "H") {
        event.preventDefault();
        toggleSidebar();
      }
    };

    // Register the keyboard shortcut globally
    if (window.electronAPI?.registerKeyboardShortcut) {
      window.electronAPI.registerKeyboardShortcut("CmdOrCtrl+H", "toggle-sidebar");
    }

    // Listen for keyboard events in the renderer
    window.addEventListener("keydown", handleKeyDown);

    // Listen for keyboard shortcuts from the main process
    if (window.electronAPI?.onKeyboardShortcut) {
      window.electronAPI.onKeyboardShortcut((shortcut: string) => {
        if (shortcut === "toggle-sidebar") {
          toggleSidebar();
        }
      });
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (window.electronAPI?.unregisterKeyboardShortcut) {
        window.electronAPI.unregisterKeyboardShortcut("CmdOrCtrl+H");
      }
    };
  }, [isSidebarVisible]);

  const value: KeyboardContextType = {
    isSidebarVisible,
    toggleSidebar,
    setSidebarVisible,
  };

  return <KeyboardContext.Provider value={value}>{children}</KeyboardContext.Provider>;
};
