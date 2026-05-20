
const { spawn } = require("child_process");

/**
 * Execute a command
 * @param {String} cmd bat or shell command
 * @param {Array} args parameter array
 * @param {Object} options exec options
 * @param {String} options.title the title before the output
 * @param {Boolean} options.showCmd whether to print the command
 * @param {Boolean} options.trimSpace whether to trim the space of output
 * @param {String} options.cwd current work directory
 * @returns a promise that the command ended
 */
function exec(cmd, args = [], options = {}) {
  if (options.showCmd === undefined) {
    options.showCmd = true;
  }
  options.showCmd && console.log(`${cmd} ${args.join(" ")}`);
  const cp = spawn(cmd, args, {
    cwd: options.cwd,
  });
  cp.stdout.on("data", (data) => {
    let result = data.toString();
    if (options.trimSpace) {
      result = result.trim(" ");
    }
    if (options.title) {
      result = `${options.title}: ${result}`;
    }
    console.log(result);
  });
  cp.stderr.on("data", (data) => {
    console.error(data.toString());
  });
  return new Promise((resolve, reject) => {
    cp.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });
  });
}

module.exports = exec;
