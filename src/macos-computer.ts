import { Computer, ScreenDimensions } from "./computer";
import { screen, desktopCapturer, nativeImage } from "electron";
import * as robot from "robotjs";
import log from "electron-log";

export class MacOSComputer extends Computer {
  private screenWidth: number;
  private screenHeight: number;

  constructor() {
    super();
    const primaryDisplay = screen.getPrimaryDisplay();
    // Use full screen size to match window dimensions and capture the entire screen
    this.screenWidth = primaryDisplay.size.width;
    this.screenHeight = primaryDisplay.size.height;

    // Configure robotjs
    robot.setMouseDelay(10);
    robot.setKeyboardDelay(10);

    log.info(`macOS Computer initialized - Screen: ${this.screenWidth}x${this.screenHeight}`);
  }

  async screenshot(): Promise<string> {
    // Fallback to Electron's desktopCapturer
    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: {
          width: this.screenWidth,
          height: this.screenHeight,
        },
      });

      if (sources.length === 0) {
        throw new Error("No screen sources available");
      }

      const source = sources[0];
      const image = source.thumbnail;

      // Convert to base64 PNG
      return image.toPNG().toString("base64");
    } catch (fallbackError) {
      log.error("Fallback screenshot failed:", fallbackError);
      // Return a dummy image on failure
      const dummyImage = nativeImage.createEmpty();
      return dummyImage.toPNG().toString("base64");
    }
  }

  async click(x: number, y: number, button: string = "left"): Promise<void> {
    robot.moveMouse(x, y);
    robot.mouseClick(button as any);
  }

  async doubleClick(x: number, y: number): Promise<void> {
    robot.moveMouse(x, y);
    robot.mouseClick("left", true); // double click
  }

  async scroll(x: number, y: number, scrollX: number, scrollY: number): Promise<void> {
    robot.moveMouse(x, y);
    robot.scrollMouse(scrollX, scrollY);
  }

  async type(text: string): Promise<void> {
    log.info(`[Type] About to type: "${text}"`);

    // Safety: Release any stuck modifier keys before typing
    try {
      robot.keyToggle("command", "up");
      robot.keyToggle("control", "up");
      robot.keyToggle("alt", "up");
      robot.keyToggle("shift", "up");
      log.info(`[Type] Released any stuck modifier keys`);
    } catch (error) {
      log.warn(`[Type] Warning: Could not release modifier keys:`, error);
    }

    // Small delay to ensure modifiers are released
    await this.wait(50);

    try {
      robot.typeString(text);
      log.info(`[Type] Successfully typed: "${text}"`);
    } catch (error) {
      log.error(`[Type] Failed to type "${text}":`, error);
      throw error;
    }
  }

  async keypress(keys: string[]): Promise<void> {
    try {
      log.info(`[Keypress] Received keys: ${JSON.stringify(keys)}`);

      // Convert keys to robotjs format
      const convertedKeys = keys.map((key) => {
        const keyLower = key.toLowerCase();
        switch (keyLower) {
          case "cmd":
            return "command";
          case "ctrl":
            return "control";
          case "alt":
          case "option":
            return "alt";
          case "shift":
            return "shift";
          case "return":
          case "enter":
            return "enter";
          case "esc":
            return "escape";
          case "space":
            return "space";
          case "tab":
            return "tab";
          case "backspace":
            return "backspace";
          case "delete":
            return "delete";
          case "arrowup":
          case "up":
            return "up";
          case "arrowdown":
          case "down":
            return "down";
          case "arrowleft":
          case "left":
            return "left";
          case "arrowright":
          case "right":
            return "right";
          default:
            return key.toLowerCase(); // Ensure all keys are lowercase for robotjs
        }
      });

      log.info(`[Keypress] Converted keys: ${JSON.stringify(convertedKeys)}`);

      if (convertedKeys.length === 1) {
        log.info(`[Keypress] Single key tap: ${convertedKeys[0]}`);
        robot.keyTap(convertedKeys[0]);
      } else {
        // For key combinations, use modifiers
        const modifiers = convertedKeys.slice(0, -1);
        const key = convertedKeys[convertedKeys.length - 1];
        log.info(
          `[Keypress] Key combination - modifiers: ${JSON.stringify(modifiers)}, key: ${key}`
        );
        robot.keyTap(key, modifiers);
      }

      log.info(`[Keypress] Successfully executed keypress`);
    } catch (error) {
      log.error(`[Keypress] Failed for keys ${JSON.stringify(keys)}:`, error);
      throw error; // Re-throw to ensure errors bubble up
    }
  }

  async move(x: number, y: number): Promise<void> {
    try {
      robot.moveMouse(x, y);
    } catch (error) {
      log.error(`Move failed to (${x}, ${y}):`, error);
    }
  }

  async drag(path: Array<{ x: number; y: number }>): Promise<void> {
    try {
      if (path.length === 0) return;

      // Move to start position
      const start = path[0];
      robot.moveMouse(start.x, start.y);

      // Start drag
      robot.mouseToggle("down");

      // Move through path
      for (let i = 1; i < path.length; i++) {
        robot.moveMouse(path[i].x, path[i].y);
        await this.wait(50); // Small delay between moves
      }

      // End drag
      robot.mouseToggle("up");
    } catch (error) {
      log.error("Drag failed:", error);
    }
  }

  async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getDimensions(): ScreenDimensions {
    return {
      width: this.screenWidth,
      height: this.screenHeight,
    };
  }

  getEnvironment(): string {
    return "mac";
  }

  getCurrentUrl(): string {
    return "system://macos-desktop";
  }

  // Helper method to call Swift functions
  private async callSwiftFunction(action: string, args: string[] = []): Promise<any> {
    const { spawn } = require("child_process");
    const path = require("path");
    const fs = require("fs");

    // Determine if we're running in development or packaged
    const isDev = process.env.NODE_ENV === "development" || !process.resourcesPath;

    let swiftExecutable: string;

    if (isDev) {
      // Development paths
      swiftExecutable = path.join(__dirname, "../../subprocess/mac_subprocess");
    } else {
      // Packaged paths - Swift executable needs to be in Resources directory
      const resourcesPath = process.resourcesPath;
      swiftExecutable = path.join(resourcesPath, "mac_subprocess");
    }

    log.info(`[Swift] Environment: ${isDev ? "development" : "packaged"}`);
    log.info(`[Swift] Executable path: ${swiftExecutable}`);
    log.info(`[Swift] Action: ${action}, Args: ${JSON.stringify(args)}`);
    log.info(`[Swift] Current working directory: ${process.cwd()}`);
    log.info(`[Swift] __dirname: ${__dirname}`);
    log.info(`[Swift] process.resourcesPath: ${process.resourcesPath}`);

    // Check if executable exists
    try {
      const executableExists = fs.existsSync(swiftExecutable);
      log.info(`[Swift] Executable exists: ${executableExists}`);

      if (!executableExists) {
        throw new Error(`Swift executable not found at: ${swiftExecutable}`);
      }
    } catch (error) {
      log.error(`[Swift] File existence check failed:`, error);
      throw error;
    }

    return new Promise((resolve, reject) => {
      log.info(`[Swift] Spawning process: ${swiftExecutable} ${action} ${args.join(" ")}`);

      const swift = spawn(swiftExecutable, [action, ...args]);

      let stdout = "";
      let stderr = "";

      swift.stdout.on("data", (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        log.info(`[Swift stdout] ${output.trim()}`);
      });

      swift.stderr.on("data", (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        log.error(`[Swift stderr] ${output.trim()}`);
      });

      let isResolved = false;

      swift.on("close", (code: number) => {
        if (isResolved) return;
        isResolved = true;

        log.info(`[Swift] Process closed with code: ${code}`);
        log.info(`[Swift] Full stdout: ${stdout}`);
        if (stderr) log.info(`[Swift] Full stderr: ${stderr}`);

        clearTimeout(timeout);

        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim());
            if (result.success) {
              log.info(`[Swift] Success result:`, result.result);
              resolve(result.result);
            } else {
              log.error(`[Swift] Swift function returned error:`, result.error);
              reject(new Error(result.error));
            }
          } catch (parseError) {
            log.error(`[Swift] Failed to parse output as JSON:`, parseError);
            log.error(`[Swift] Raw output: "${stdout.trim()}"`);
            reject(new Error(`Failed to parse Swift output: ${parseError}`));
          }
        } else {
          log.error(`[Swift] Process failed with exit code ${code}`);
          reject(new Error(`Swift process failed (exit code ${code}): ${stderr}`));
        }
      });

      swift.on("error", (error: Error) => {
        if (isResolved) return;
        isResolved = true;
        log.error(`[Swift] Failed to spawn process:`, error);
        reject(new Error(`Failed to spawn Swift process: ${error.message}`));
      });

      // Add timeout
      const timeout = setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        log.error(`[Swift] Process timeout after 10 seconds`);
        swift.kill();
        reject(new Error("Swift process timeout"));
      }, 10000);
    });
  }

  // Additional macOS-specific methods
  async getActiveApplication(): Promise<string> {
    try {
      const result = await this.callSwiftFunction("getActiveApplication");
      log.info(`Active application: ${result}`);
      return result;
    } catch (error) {
      log.error("Failed to get active application:", error);
      return "Unknown";
    }
  }

  async switchToApplication(appName: string): Promise<boolean> {
    try {
      log.info(`Switching to application: ${appName}`);
      const result = await this.callSwiftFunction("switchToApplication", [appName]);
      log.info(`Successfully switched to ${appName}: ${result}`);
      return true;
    } catch (error) {
      log.error(`Failed to switch to application '${appName}':`, error);
      return false;
    }
  }

  async openApplication(appName: string): Promise<boolean> {
    try {
      log.info(`Opening application: ${appName}`);
      const result = await this.callSwiftFunction("openApplication", [appName]);
      log.info(`Successfully opened ${appName}: ${result}`);
      return true;
    } catch (error) {
      log.error(`Failed to open application '${appName}':`, error);
      return false;
    }
  }

  // Screen lock functionality
  async startScreenLock(): Promise<boolean> {
    try {
      log.info("Starting screen lock (input blocking + sleep prevention)");
      const result = await this.callSwiftFunction("startScreenLock");
      log.info(`Screen lock started: ${result}`);
      return true;
    } catch (error) {
      log.error("Failed to start screen lock:", error);
      return false;
    }
  }

  async stopScreenLock(): Promise<boolean> {
    try {
      log.info("Stopping screen lock");
      const result = await this.callSwiftFunction("stopScreenLock");
      log.info(`Screen lock stopped: ${result}`);
      return true;
    } catch (error) {
      log.error("Failed to stop screen lock:", error);
      return false;
    }
  }

  async checkAccessibilityPermissions(): Promise<boolean> {
    try {
      log.info("Checking accessibility permissions");
      const result = await this.callSwiftFunction("checkAccessibility");
      log.info(`Accessibility permissions: ${result}`);
      return true;
    } catch (error) {
      log.warn("Accessibility permissions not granted:", error);
      return false;
    }
  }

  async checkScreenRecordingPermissions(): Promise<boolean> {
    try {
      log.info("Checking screen recording permissions");

      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1, height: 1 }, // Minimal size for permission check
      });

      const hasPermissions = sources.length > 0;
      log.info(`Screen recording permissions: ${hasPermissions}`);
      return hasPermissions;
    } catch (error) {
      log.warn("Screen recording permissions not granted:", error);
      return false;
    }
  }
}
