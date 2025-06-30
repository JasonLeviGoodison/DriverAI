import { desktopCapturer } from "electron";

export async function checkScreenRecordingPermissions(): Promise<boolean> {
  try {
    console.log("🔐 Checking screen recording permissions...");

    // Try to get screen sources - this will trigger permission prompt if needed
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1, height: 1 }, // Minimal size for permission check
    });

    if (sources.length > 0) {
      console.log("✅ Screen recording permissions granted");
      return true;
    } else {
      console.log("❌ No screen sources available - permissions may be denied");
      return false;
    }
  } catch (error) {
    console.log("❌ Screen recording permission check failed:", error);
    return false;
  }
}
