import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

import { mainConfig } from "./webpack.main.config";
import { rendererConfig } from "./webpack.renderer.config";
import dotenv from "dotenv";

dotenv.config();

const { APPLE_ID = "", APPLE_ID_PASSWORD = "", TEAM_ID = "" } = process.env;

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: "node_modules/robotjs/**/*",
    },
    extraResource: ["subprocess/", "subprocess/mac_subprocess"],
    icon: "src/assets/icons/icon",
    appBundleId: "com.driverai.ai",
    osxSign: {
      optionsForFile: (filePath) => {
        return {
          entitlements: "./subprocess/entitlements.plist", // Check if this is the right path
          hardenedRuntime: true,
          gatekeeperAssess: false,
        };
      },
      identity: "Developer ID Application: Setanta AI", // TODO: change this to the correct identity
    },

    osxNotarize: {
      appleId: APPLE_ID,
      appleIdPassword: APPLE_ID_PASSWORD,
      teamId: TEAM_ID,
    },
  },
  rebuildConfig: {
    force: true,
  },
  makers: [new MakerSquirrel({}), new MakerZIP({}, ["darwin"])],
  plugins: [
    new AutoUnpackNativesPlugin({
      modules: ["robotjs"],
    }),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: "./src/index.html",
            js: "./src/renderer.tsx",
            name: "main_window",
            preload: {
              js: "./src/preload.ts",
            },
          },
        ],
      },
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "JasonLeviGoodison",
          name: "DriverAI",
        },
        prerelease: false,
        draft: true,
      },
    },
  ],
};

export default config;
