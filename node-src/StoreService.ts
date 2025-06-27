import { app } from "electron";
import * as fs from "fs/promises";
import * as path from "path";
import log from "electron-log";

const userDataPath = app.getPath("userData");
const tokenPath = path.join(userDataPath, "token.json");

// Ensure token.json exists, if not, create it as an empty object
async function ensureTokenFileExists() {
  try {
    await fs.access(tokenPath);
  } catch {
    try {
      await fs.writeFile(tokenPath, JSON.stringify({}), "utf8");
    } catch (error) {
      log.error("Failed to create token file:", error);
      throw new Error(`Failed to create token file: ${error}`);
    }
  }
}

// Save a token as plain text
export async function storeToken(name: string, token: string): Promise<void> {
  try {
    await ensureTokenFileExists();
    log.info("storeToken: Storing token:", name, token);
    let tokens: Record<string, string> = {};
    try {
      const data = await fs.readFile(tokenPath, "utf8");
      log.info("storeToken: Reading token file:", data);
      tokens = JSON.parse(data);
    } catch {
      tokens = {};
    }
    tokens[name] = token;
    await fs.writeFile(tokenPath, JSON.stringify(tokens), "utf8");
  } catch (error) {
    log.error("Failed to store token:", error);
    throw new Error(`Failed to store token: ${error}`);
  }
}

export async function retrieveToken(name: string): Promise<string | null> {
  try {
    await ensureTokenFileExists();
    log.info("retrieveToken: Retrieving token:", name);
    const data = await fs.readFile(tokenPath, "utf8");
    const tokens = JSON.parse(data);
    return tokens[name] ?? null;
  } catch (error) {
    log.info("retrieveToken: Token file missing or unreadable", error);
    return null;
  }
}

// Delete the stored token file
export async function clearToken(): Promise<boolean> {
  try {
    await fs.unlink(tokenPath);
    return true;
  } catch (error) {
    log.info("clearToken: Token file missing, nothing to clear", error);
    return false;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  return await retrieveToken("refresh");
}

export async function getAccessToken(): Promise<string | null> {
  return await retrieveToken("access");
}
