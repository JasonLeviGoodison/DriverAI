import React, { createContext, useContext, ReactNode } from "react";

export interface ScreenContextType {
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
  // Functions that call the electronAPI methods
  const expandScreen = async () => {
    if (window.electronAPI?.expandWindow) {
      await window.electronAPI.expandWindow();
    }
  };

  const contractScreen = async () => {
    if (window.electronAPI?.contractWindow) {
      await window.electronAPI.contractWindow();
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
    expandScreen,
    contractScreen,
    enableClickThrough,
    disableClickThrough,
  };

  return <ScreenContext.Provider value={value}>{children}</ScreenContext.Provider>;
};
