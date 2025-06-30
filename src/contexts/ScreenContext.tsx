import React, { createContext, useContext, ReactNode, useState } from "react";

export interface ScreenContextType {
  isExpanded: boolean;
  expandScreen: () => Promise<void>;
  contractScreen: () => Promise<void>;
  enableClickThrough: () => Promise<void>;
  disableClickThrough: () => Promise<void>;
}

const ScreenContext = createContext<ScreenContextType | undefined>(undefined);

export const useScreen = () => {
  const context = useContext(ScreenContext);
  if (context === undefined) {
    throw new Error("useScreen must be used within a ScreenProvider");
  }
  return context;
};

interface ScreenProviderProps {
  children: ReactNode;
}

export const ScreenProvider: React.FC<ScreenProviderProps> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const expandScreen = async () => {
    if (window.electronAPI?.expandWindow) {
      await window.electronAPI.expandWindow();
      setIsExpanded(true);
    }
  };

  const contractScreen = async () => {
    if (window.electronAPI?.contractWindow) {
      await window.electronAPI.contractWindow();
      setIsExpanded(false);
    }
  };

  const enableClickThrough = async () => {
    if (window.electronAPI?.enableClickThrough) {
      await window.electronAPI.enableClickThrough();
    }
  };

  const disableClickThrough = async () => {
    if (window.electronAPI?.disableClickThrough) {
      await window.electronAPI.disableClickThrough();
    }
  };

  const value: ScreenContextType = {
    isExpanded,
    expandScreen,
    contractScreen,
    enableClickThrough,
    disableClickThrough,
  };

  return <ScreenContext.Provider value={value}>{children}</ScreenContext.Provider>;
};
