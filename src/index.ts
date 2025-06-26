import { app, BrowserWindow, screen } from "electron";
import { MacOSComputer } from "./macos-computer";
import { AgentMessage, ConversationRole } from "./types";
import { Agent } from "./agent";
import { setupIpcHandlers } from "./ipc-handlers";
import dotenv from "dotenv";
dotenv.config();

const HIDE_MENU_BAR = true;
const HIDE_WINDOW = true;

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require("electron-squirrel-startup")) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let computer: MacOSComputer | null = null;
let agent: Agent | null = null;
let conversationItems: AgentMessage[] = [];

function setWindowAlwaysOnTopAllDesktops(win: BrowserWindow | null) {
  if (!win) return;
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, "screen-saver");
}

const createWindow = (): void => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.size;
  const windowWidth = 400;
  const windowHeight = screenHeight;
  const windowX = screenWidth - windowWidth;
  const windowY = 0;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: windowX,
    y: windowY,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      devTools: !HIDE_MENU_BAR,
    },
    transparent: true,
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 10, y: 6 },
    resizable: true,
    alwaysOnTop: true,
    type: "normal",
    hasShadow: false,
    frame: true,
    //autoHideMenuBar: true,
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.setContentProtection(HIDE_WINDOW);

  setWindowAlwaysOnTopAllDesktops(mainWindow);

  mainWindow.webContents.openDevTools();

  mainWindow.on("show", () => setWindowAlwaysOnTopAllDesktops(mainWindow));
  mainWindow.on("focus", () => setWindowAlwaysOnTopAllDesktops(mainWindow));
  mainWindow.on("blur", () => setWindowAlwaysOnTopAllDesktops(mainWindow));
  mainWindow.on("enter-full-screen", () => setWindowAlwaysOnTopAllDesktops(mainWindow));
  mainWindow.on("leave-full-screen", () => setWindowAlwaysOnTopAllDesktops(mainWindow));
};

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

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow) {
    setWindowAlwaysOnTopAllDesktops(mainWindow);
  }
});
