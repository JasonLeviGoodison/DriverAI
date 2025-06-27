import { ipcMain, BrowserWindow, globalShortcut } from "electron";
import { MacOSComputer } from "./macos-computer";
import { AgentMessage, ConversationRole } from "./types";
import { Agent } from "./agent";
import { AIProvider } from "./ai";

interface IpcHandlerDependencies {
  getMainWindow: () => BrowserWindow | null;
  getComputer: () => MacOSComputer | null;
  setComputer: (computer: MacOSComputer | null) => void;
  getAgent: () => Agent | null;
  setAgent: (agent: Agent | null) => void;
  getConversationItems: () => AgentMessage[];
  setConversationItems: (items: AgentMessage[]) => void;
  addConversationItems: (items: AgentMessage[]) => void;
  acknowledgeSafetyCheckCallback: (message: string) => boolean;
}

export function setupIpcHandlers(deps: IpcHandlerDependencies) {
  // Handle send-message
  ipcMain.handle("send-message", async (event, message: string) => {
    console.log("🎯 IPC send-message received:", message);

    const agent = deps.getAgent();
    const mainWindow = deps.getMainWindow();

    if (!agent) {
      console.log("❌ Agent not started");
      throw new Error("Agent not started");
    }

    console.log("✅ Agent exists, processing message...");

    try {
      const conversationItems = deps.getConversationItems();
      conversationItems.push({
        role: ConversationRole.User,
        response: { type: "content", content: message },
      });

      console.log("📝 Added message to conversation, total items:", conversationItems.length);

      // Set up streaming callback to send messages in real-time
      const originalCallback = agent.messageStreamCallback;
      agent.messageStreamCallback = (streamedMessage: AgentMessage) => {
        // Add to conversation history
        deps.addConversationItems([streamedMessage]);

        // Send to renderer immediately if it's an agent message
        if (streamedMessage.role === ConversationRole.Agent) {
          console.log("🎯 Streaming assistant response to renderer:", streamedMessage);
          mainWindow?.webContents.send("agent-message", streamedMessage);
        }

        // Call original callback if it exists
        if (originalCallback) {
          originalCallback(streamedMessage);
        }
      };

      const outputItems = await agent.runFullTurn(conversationItems, true);

      mainWindow?.webContents.send("agent-completed");

      // Restore original callback
      agent.messageStreamCallback = originalCallback;

      return outputItems;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error processing message:", errorMessage);
      mainWindow?.webContents.send("agent-error", errorMessage);
      throw error;
    }
  });

  // Handle take-screenshot
  ipcMain.handle("take-screenshot", async () => {
    const computer = deps.getComputer();
    const mainWindow = deps.getMainWindow();

    if (!computer) {
      throw new Error("Computer not initialized");
    }

    try {
      const screenshot = await computer.screenshot();
      mainWindow?.webContents.send("screenshot", screenshot);
      return screenshot;
    } catch (error) {
      console.error("Error taking screenshot:", error);
      throw error;
    }
  });

  // Handle start-agent
  ipcMain.handle("start-agent", async (event, options: any = {}) => {
    const mainWindow = deps.getMainWindow();

    try {
      // Initialize computer
      const computer = new MacOSComputer();
      deps.setComputer(computer);

      const tools: any[] = [
        {
          type: "function",
          name: "switch_to_application",
          description:
            "Switch to a specific application by name (e.g., 'Safari', 'Chrome', 'Mail').",
          parameters: {
            type: "object",
            properties: {
              app_name: {
                type: "string",
                description: "Name of the application to switch to",
              },
            },
            additionalProperties: false,
            required: ["app_name"],
          },
        },
        // TODO REMOVE FOR NOW, I THINK WE BROKE SOMETHING IN THE SUBPROCESS
        // {
        //   type: "function",
        //   name: "open_application",
        //   description: "Open/launch an application by name.",
        //   parameters: {
        //     type: "object",
        //     properties: {
        //       app_name: {
        //         type: "string",
        //         description: "Name of the application to open",
        //       },
        //     },
        //     additionalProperties: false,
        //     required: ["app_name"],
        //   },
        // },
        // {
        //   type: "function",
        //   name: "get_active_application",
        //   description: "Get the name of the currently active/focused application.",
        //   parameters: {},
        // },
      ];

      const agent = new Agent({
        computer,
        tools,
        acknowledgeSafetyCheckCallback: deps.acknowledgeSafetyCheckCallback,
        systemPrompt: options.systemPrompt,
        provider: options.provider || AIProvider.Anthropic,
        model: options.model,
      });

      deps.setAgent(agent);

      // Reset conversation
      deps.setConversationItems([]);

      console.log("Agent started successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error starting agent:", errorMessage);
      mainWindow?.webContents.send("agent-error", errorMessage);
      throw error;
    }
  });

  // Handle stop-agent
  ipcMain.handle("stop-agent", async () => {
    const mainWindow = deps.getMainWindow();
    const agent = deps.getAgent();

    console.log("🛑 IPC: stop-agent called");

    // Stop the agent if it's running
    if (agent) {
      console.log("🛑 IPC: Stopping running agent...");
      agent.stop();
      console.log("🛑 IPC: Agent.stop() called");
    } else {
      console.log("🛑 IPC: No agent running to stop");
    }

    deps.setAgent(null);
    deps.setComputer(null);
    deps.setConversationItems([]);

    console.log("🛑 IPC: Agent stopped and cleaned up");
    mainWindow?.webContents.send("agent-message", {
      role: ConversationRole.Agent,
      response: {
        type: "content",
        content: "Agent stopped.",
      },
    });

    mainWindow?.webContents.send("agent-completed");
  });

  // Handle window controls
  ipcMain.handle("minimize-window", async () => {
    const mainWindow = deps.getMainWindow();
    mainWindow?.minimize();
  });

  ipcMain.handle("toggle-maximize-window", async () => {
    const mainWindow = deps.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle("close-window", async () => {
    const mainWindow = deps.getMainWindow();
    mainWindow?.close();
  });

  // Click-through handlers
  ipcMain.handle("enable-click-through", async () => {
    console.log("📡 IPC: enable-click-through called");
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      console.log("📡 IPC: Setting mainWindow to ignore mouse events (click-through enabled)");
      win.setIgnoreMouseEvents(true, { forward: true });
    } else {
      console.warn("📡 IPC: mainWindow not found when enabling click-through");
    }
  });

  ipcMain.handle("disable-click-through", async () => {
    const mainWindow = deps.getMainWindow();
    if (mainWindow) {
      mainWindow.setIgnoreMouseEvents(false, { forward: true });
    }
  });

  // Screen lock handlers
  ipcMain.handle("start-screen-lock", async () => {
    console.log("📡 IPC: start-screen-lock called");
    const computer = deps.getComputer();
    if (!computer) {
      console.error("📡 IPC: Computer not initialized");
      throw new Error("Computer not initialized");
    }

    try {
      console.log("📡 IPC: Calling computer.startScreenLock()");
      const success = await computer.startScreenLock();
      console.log("📡 IPC: startScreenLock result:", success);
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("📡 IPC: Error starting screen lock:", errorMessage);
      throw error;
    }
  });

  ipcMain.handle("stop-screen-lock", async () => {
    console.log("📡 IPC: stop-screen-lock called");
    const computer = deps.getComputer();
    if (!computer) {
      console.error("📡 IPC: Computer not initialized");
      throw new Error("Computer not initialized");
    }

    try {
      console.log("📡 IPC: Calling computer.stopScreenLock()");
      const success = await computer.stopScreenLock();
      console.log("📡 IPC: stopScreenLock result:", success);
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("📡 IPC: Error stopping screen lock:", errorMessage);
      throw error;
    }
  });

  ipcMain.handle("check-accessibility-permissions", async () => {
    const computer = deps.getComputer();
    if (!computer) {
      throw new Error("Computer not initialized");
    }

    try {
      const hasPermissions = await computer.checkAccessibilityPermissions();
      return hasPermissions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.warn("Error checking accessibility permissions:", errorMessage);
      return false;
    }
  });

  ipcMain.handle("check-screen-recording-permissions", async () => {
    try {
      console.log("📡 IPC: check-screen-recording-permissions called");

      const { desktopCapturer } = require("electron");
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1, height: 1 }, // Minimal size for permission check
      });

      const hasPermissions = sources.length > 0;
      console.log("📡 IPC: Screen recording permissions:", hasPermissions);
      return hasPermissions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.warn("📡 IPC: Error checking screen recording permissions:", errorMessage);
      return false;
    }
  });

  // Window expansion handlers
  ipcMain.handle("expand-window", async () => {
    const mainWindow = deps.getMainWindow();
    if (!mainWindow) return;

    console.log("📏 Expanding window to full screen");

    // Get the primary display's full size
    const { screen } = require("electron");
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.size;

    // Expand to full screen
    mainWindow.setBounds({
      x: 0,
      y: 0,
      width: screenWidth,
      height: screenHeight,
    });
  });

  ipcMain.handle("contract-window", async () => {
    const mainWindow = deps.getMainWindow();
    if (!mainWindow) return;

    console.log("📏 Contracting window to sidebar");

    // Get the primary display's full size
    const { screen } = require("electron");
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.size;

    // Contract to sidebar size on the right
    const windowWidth = 400;
    const windowHeight = screenHeight;
    const windowX = screenWidth - windowWidth;
    const windowY = 0;

    mainWindow.setBounds({
      x: windowX,
      y: windowY,
      width: windowWidth,
      height: windowHeight,
    });
  });

  // Keyboard shortcut handlers
  ipcMain.handle(
    "register-keyboard-shortcut",
    async (event, accelerator: string, action: string) => {
      const mainWindow = deps.getMainWindow();

      try {
        const ret = globalShortcut.register(accelerator, () => {
          console.log(`🎹 Global shortcut ${accelerator} triggered for action: ${action}`);
          mainWindow?.webContents.send("keyboard-shortcut", action);
        });

        if (!ret) {
          console.warn(`🎹 Failed to register global shortcut: ${accelerator}`);
          return false;
        }

        console.log(`🎹 Successfully registered global shortcut: ${accelerator} -> ${action}`);
        return true;
      } catch (error) {
        console.error(`🎹 Error registering shortcut ${accelerator}:`, error);
        return false;
      }
    }
  );

  ipcMain.handle("unregister-keyboard-shortcut", async (event, accelerator: string) => {
    try {
      globalShortcut.unregister(accelerator);
      console.log(`🎹 Unregistered global shortcut: ${accelerator}`);
      return true;
    } catch (error) {
      console.error(`🎹 Error unregistering shortcut ${accelerator}:`, error);
      return false;
    }
  });

  ipcMain.handle("unregister-all-shortcuts", async () => {
    try {
      globalShortcut.unregisterAll();
      console.log("🎹 Unregistered all global shortcuts");
      return true;
    } catch (error) {
      console.error("🎹 Error unregistering all shortcuts:", error);
      return false;
    }
  });
}
