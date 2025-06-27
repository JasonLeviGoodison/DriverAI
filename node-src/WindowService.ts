import { BrowserWindow, ipcMain, screen, shell, app } from "electron";
import authService from "./AuthService";
import path from "path";
import log from "electron-log";

const HIDE_MENU_BAR = true;
const HIDE_WINDOW = true;

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let win: BrowserWindow | null = null;

const createAppWindow = (): void => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.size;
  const windowWidth = 400;
  const windowHeight = screenHeight;
  const windowX = screenWidth - windowWidth;
  const windowY = 0;

  const mainWindow = new BrowserWindow({
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
  win = mainWindow;
};

function setWindowAlwaysOnTopAllDesktops(win: BrowserWindow | null) {
  if (!win) return;
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, "screen-saver");
}

async function showWindow(): Promise<void> {
  // Which window to show based on wether valid refresh token exists
  try {
    await authService.refreshTokens();
    createAppWindow();
  } catch (err) {
    createAuthWindow();
  }
}

function createAuthWindow(): void {
  const isPackaged = app.isPackaged;

  if (isPackaged) {
    // Packaged mode: Open in system browser
    log.info("createAuthWindow: Opening authentication in system browser (packaged mode)");
    shell.openExternal(authService.getAuthenticationURL());
    return;
  }

  // Development mode: Use Electron window with localhost callback
  log.info("createAuthWindow: Opening authentication in Electron window (development mode)");
  destroyAuthWin();

  win = new BrowserWindow({
    width: 1000,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      //enableRemoteModule: false,
    },
  });

  win.loadURL(authService.getAuthenticationURL());

  const filters = {
    urls: ["http://localhost/callback*"],
  };

  const {
    session: { webRequest },
  } = win.webContents;

  webRequest.onBeforeRequest(filters, async ({ url }) => {
    try {
      await authService.loadTokens(url);
      log.info("Authentication successful, creating app window");
      destroyAuthWin();
      createAppWindow();
    } catch (error) {
      log.error("Authentication failed:", error);
    }
  });

  win.on("closed", () => {
    win = null;
  });
}

function destroyAuthWin() {
  if (!win) return;
  win.close();
  win = null;
}

function createLogoutWindow() {
  createAuthWindow();
  authService.logout().then();
}

export { createAppWindow, createAuthWindow, createLogoutWindow, showWindow };
