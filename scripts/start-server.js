
const os = require("os");
const exec = require("./exec");

/**
 * The main function
 */
async function main() {
  await exec("./stemstudio", ["serve", "--config", "./config.toml"], {
    cwd: "./build/server",
  });
}

main();
