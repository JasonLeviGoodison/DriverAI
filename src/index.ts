import { app, BrowserWindow } from "electron";
import { MacOSComputer } from "./macos-computer";
import { AgentMessage } from "./types";
import { Agent } from "./agent";
import { setupIpcHandlers } from "../node-src/IPCHandlers";
import { createAppWindow, showWindow } from "../node-src/WindowService";
import { checkScreenRecordingPermissions } from "../node-src/PermissionService";
import authService from "../node-src/AuthService";
import log from "electron-log";
import dotenv from "dotenv";
dotenv.config();

if (require("electron-squirrel-startup")) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let computer: MacOSComputer | null = null;
let agent: Agent | null = null;
let conversationItems: AgentMessage[] = [];

// Detect if app is packaged (production) or running in development
const isPackaged = app.isPackaged;
log.info(`App running in ${isPackaged ? "packaged" : "development"} mode`);

// Only register custom protocol if packaged
if (isPackaged) {
  app.setAsDefaultProtocolClient("maccomputeruse");
}

// Handle protocol URLs (for authentication callback) - only in packaged mode
app.on("open-url", async (event, url) => {
  if (!isPackaged) {
    log.info("Ignoring protocol URL in development mode");
    return;
  }

  event.preventDefault();
  log.info("Received protocol URL:", url);

  if (url.startsWith("maccomputeruse://callback")) {
    try {
      await authService.loadTokens(url);
      log.info("Authentication successful via protocol handler");
      const appWindow = createAppWindow();
      mainWindow = appWindow;
    } catch (error) {
      log.error("Authentication failed via protocol handler:", error);
    }
  }
});

const isFirstInstance = app.requestSingleInstanceLock();

if (!isFirstInstance) {
  app.quit();
}

const acknowledgeSafetyCheckCallback = (message: string): boolean => {
  console.log(`Safety check auto-acknowledged: ${message}`);
  return true;
};

setupIpcHandlers({
  getMainWindow: () => mainWindow,
  getComputer: () => computer,
  setComputer: (newComputer: MacOSComputer | null) => {
    computer = newComputer;
  },
  getAgent: () => agent,
  setAgent: (newAgent: Agent | null) => {
    agent = newAgent;
  },
  getConversationItems: () => conversationItems,
  setConversationItems: (items: AgentMessage[]) => {
    conversationItems = items;
  },
  addConversationItems: (items: AgentMessage[]) => {
    conversationItems.push(...items);
  },
  acknowledgeSafetyCheckCallback,
});

app.on("ready", async () => {
  // createWindow(mainWindow);

  const createdWindow = await showWindow();
  if (createdWindow) {
    mainWindow = createdWindow;
  }

  // Check screen recording permissions on startup
  // This will trigger the permission dialog if permissions haven't been granted
  setTimeout(async () => {
    await checkScreenRecordingPermissions();
  }, 1000);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    //createAppWindow();
  }
});
