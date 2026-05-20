
const path = require("path");
const fs = require("fs-extra");

/**
 * The main function
 */
async function main() {
  const rootDir = process.cwd();
  const srcAssetsDir = path.join(rootDir, "client", "assets");
  const publicAssetDir = path.join(rootDir, "build", "public", "assets");

  // Mirror client/LICENSES.txt (written by scripts/extract-licenses.js)
  // into client/assets/ so it's served as a static asset in dev + ships
  // inside the Vite build output.
  console.log("Copying LICENSES.txt to client/assets...");
  const licensesSource = path.join(rootDir, "client", "LICENSES.txt");
  const licensesWebTarget = path.join(srcAssetsDir, "LICENSES.txt");

  if (fs.existsSync(licensesSource)) {
    fs.copySync(licensesSource, licensesWebTarget);
    console.log("LICENSES.txt copied to client/assets successfully");
  } else {
    console.warn("client/LICENSES.txt not found — run `node scripts/extract-licenses.js` to generate it");
  }

  console.log(`copy files...`);

  fs.readdir(srcAssetsDir, (err, files) => {
    if (err) {
      console.error(`Error reading directory: ${err}`);
      return;
    }
    files.forEach((file) => {
      const sourceFile = path.join(srcAssetsDir, file);
      const targetFile = path.join(publicAssetDir, file);
      fs.copySync(sourceFile, targetFile);
    });
  });

  console.log("Done!");
}

main();
