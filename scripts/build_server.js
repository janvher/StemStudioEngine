
const path = require("path");
const os = require("os");
const fs = require("fs");
const exec = require("./exec");

/**
 * The main function
 */
async function main() {
  const rootDir = process.cwd(); // The root dir that contains `README.md`.
  const serverDir = path.join(rootDir, "server"); // The golang server dir.

  // Build the golang server.
  console.log(`enter ${serverDir}`);
  process.chdir(serverDir);
  console.log(`build server...`);
  try {
    // Build flags for faster CI builds:
    // -buildvcs=false: Skip VCS stamping (saves ~2-3s)
    // -trimpath: Remove file system paths from binary (smaller, reproducible)
    const buildFlags = [
      "build",
      "-buildvcs=false",
      "-trimpath",
      "-o",
      os.platform() === "win32" ? "../build/server/stemstudio.exe" : "../build/server/stemstudio"
    ];
    await exec("go", buildFlags);
  } catch (error) {
    console.error("Failed to build the Go server:", error);
    process.exit(1);
  }
  console.log(`leave ${serverDir}`);
  process.chdir(rootDir);

  // Copy server .env file to build directory if it exists and destination doesn't
  const serverEnvPath = path.join(serverDir, ".env");
  const buildEnvPath = path.join(rootDir, "build", "server", ".env");
  if (fs.existsSync(buildEnvPath)) {
    console.log(`Note: build/server/.env already exists, skipping copy`);
  } else if (fs.existsSync(serverEnvPath)) {
    fs.copyFileSync(serverEnvPath, buildEnvPath);
    console.log(`Copied server/.env to build/server/.env`);
  } else {
    console.log(`Note: server/.env not found, skipping copy`);
  }

  // done
  console.log("Done!");
}

main();
