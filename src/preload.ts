// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Computer control
  sendMessage: (message: string) => ipcRenderer.invoke("send-message", message),
  takeScreenshot: () => ipcRenderer.invoke("take-screenshot"),

  // Agent control
  startAgent: (options: any) => ipcRenderer.invoke("start-agent", options),
  stopAgent: () => ipcRenderer.invoke("stop-agent"),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke("minimize-window"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("toggle-maximize-window"),
  closeWindow: () => ipcRenderer.invoke("close-window"),

  // Click-through controls
  enableClickThrough: () => ipcRenderer.invoke("enable-click-through"),
  disableClickThrough: () => ipcRenderer.invoke("disable-click-through"),

  // Screen lock controls
  startScreenLock: () => ipcRenderer.invoke("start-screen-lock"),
  stopScreenLock: () => ipcRenderer.invoke("stop-screen-lock"),
  checkAccessibilityPermissions: () => ipcRenderer.invoke("check-accessibility-permissions"),
  checkScreenRecordingPermissions: () => ipcRenderer.invoke("check-screen-recording-permissions"),

  // Window expansion controls
  expandWindow: () => ipcRenderer.invoke("expand-window"),
  contractWindow: () => ipcRenderer.invoke("contract-window"),

  // Keyboard shortcut controls
  registerKeyboardShortcut: (accelerator: string, action: string) =>
    ipcRenderer.invoke("register-keyboard-shortcut", accelerator, action),
  unregisterKeyboardShortcut: (accelerator: string) =>
    ipcRenderer.invoke("unregister-keyboard-shortcut", accelerator),
  unregisterAllShortcuts: () => ipcRenderer.invoke("unregister-all-shortcuts"),

  // Event listeners
  onAgentMessage: (callback: (message: any) => void) => {
    ipcRenderer.on("agent-message", (_event, message) => {
      if (message) callback(message);
    });
  },
  onAgentError: (callback: (error: string) => void) => {
    ipcRenderer.on("agent-error", (_event, error) => {
      if (error) callback(error);
    });
  },
  onAgentCompleted: (callback: () => void) => {
    ipcRenderer.on("agent-completed", (_event) => {
      callback();
    });
  },
  onScreenshot: (callback: (screenshot: string) => void) => {
    ipcRenderer.on("screenshot", (_event, screenshot) => {
      if (screenshot) callback(screenshot);
    });
  },
  onKeyboardShortcut: (callback: (action: string) => void) => {
    ipcRenderer.on("keyboard-shortcut", (_event, action) => {
      if (action) callback(action);
    });
  },

  // Remove listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners("agent-message");
    ipcRenderer.removeAllListeners("agent-error");
    ipcRenderer.removeAllListeners("agent-completed");
    ipcRenderer.removeAllListeners("screenshot");
    ipcRenderer.removeAllListeners("keyboard-shortcut");
  },
});

// TypeScript interface for the exposed API
declare global {
  interface Window {
    electronAPI: {
      sendMessage: (message: string) => Promise<any>;
      takeScreenshot: () => Promise<string>;
      startAgent: (options: any) => Promise<void>;
      stopAgent: () => Promise<void>;
      minimizeWindow: () => Promise<void>;
      toggleMaximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      enableClickThrough: () => Promise<void>;
      disableClickThrough: () => Promise<void>;
      startScreenLock: () => Promise<boolean>;
      stopScreenLock: () => Promise<boolean>;
      checkAccessibilityPermissions: () => Promise<boolean>;
      checkScreenRecordingPermissions: () => Promise<boolean>;
      expandWindow: () => Promise<void>;
      contractWindow: () => Promise<void>;
      registerKeyboardShortcut: (accelerator: string, action: string) => Promise<boolean>;
      unregisterKeyboardShortcut: (accelerator: string) => Promise<boolean>;
      unregisterAllShortcuts: () => Promise<boolean>;
      onAgentMessage: (callback: (message: any) => void) => void;
      onAgentError: (callback: (error: string) => void) => void;
      onAgentCompleted: (callback: () => void) => void;
      onScreenshot: (callback: (screenshot: string) => void) => void;
      onKeyboardShortcut: (callback: (action: string) => void) => void;
      removeAllListeners: () => void;
    };
  }
}
