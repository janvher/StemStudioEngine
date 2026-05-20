
const path = require("path");
const fs = require("fs-extra");

/**
 * The main function
 */
async function main() {
  const rootDir = process.cwd();

  const publicAssetDir = path.join(rootDir, "client", "assets", "js");

  console.log(`copy files...`);

  const nodeModulesDir = path.join(
    rootDir,
    "node_modules",
    "three/examples/jsm/libs",
  );
  process.chdir(nodeModulesDir);

  for (let dir of ["draco", "basis"]) {
    console.log(`processing files... ${dir}`);
    fs.readdir(dir, (err, files) => {
      if (err) {
        console.error(`Error reading directory: ${err}`);
        return;
      }
      files.forEach((file) => {
        const sourceFile = path.join(dir, file);
        const targetFile = path.join(publicAssetDir, dir, file);
        fs.copySync(sourceFile, targetFile, { overwrite: true });
      });
    });
  }

  // MediaPipe tasks-vision WASM (BlazePose etc.). CSP blocks the
  // jsdelivr CDN that @mediapipe/tasks-vision falls back to, so we
  // copy the WASM bundle into client/assets/js/mediapipe-pose/wasm and
  // point FilesetResolver at the same-origin path.
  console.log("processing files... mediapipe-pose");
  const mediapipeSourceDir = path.join(
    rootDir,
    "node_modules",
    "@mediapipe",
    "tasks-vision",
    "wasm",
  );
  const mediapipeTargetDir = path.join(
    publicAssetDir,
    "mediapipe-pose",
    "wasm",
  );
  if (fs.existsSync(mediapipeSourceDir)) {
    fs.copySync(mediapipeSourceDir, mediapipeTargetDir, { overwrite: true });
  } else {
    console.warn(
      "[copy-draco] @mediapipe/tasks-vision not found; skipping wasm copy",
    );
  }

  console.log("Done!");
}

main();
