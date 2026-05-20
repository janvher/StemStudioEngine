#!/usr/bin/env node

/**
 * Stem Studio Code Validator
 *
 * Validates behavior/lambda code against extracted type and event registries.
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const typesPath = getArg("--types") || path.resolve(__dirname, "../stem-types.d.ts");
const eventsPath = getArg("--events") || path.resolve(__dirname, "../stem-events-registry.json");
const useStdin = args.includes("--stdin");
const targetPath = args.find((a) => !a.startsWith("--") && a !== "--stdin");
const verbose = args.includes("--verbose");

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

function loadTypes(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Type definitions not found at ${filePath}. Run extract-stem-types first.`);
    return { raw: "", methods: new Set(), enums: new Map(), interfaceMethods: new Map() };
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const methods = new Set();
  const enums = new Map();
  const interfaceMethods = new Map();

  const classRegex = /declare class (\w+)[\s\S]*?\{([\s\S]*?)\}/g;
  let match;
  while ((match = classRegex.exec(raw)) !== null) {
    const className = match[1];
    const body = match[2];
    const methodRegex = /(?:static\s+)?(?:async\s+)?(\w+)\(/g;
    let m;
    while ((m = methodRegex.exec(body)) !== null) {
      methods.add(`${className}.${m[1]}`);
    }
  }

  const interfaceRegex = /interface (\w+)[\s\S]*?\{([\s\S]*?)\}/g;
  while ((match = interfaceRegex.exec(raw)) !== null) {
    const ifName = match[1];
    const body = match[2];
    const methodRegex = /(\w+)\(/g;
    let m;
    const local = new Set();
    while ((m = methodRegex.exec(body)) !== null) {
      methods.add(`${ifName}.${m[1]}`);
      local.add(m[1]);
    }
    interfaceMethods.set(ifName, local);
  }

  const enumRegex = /enum (\w+)\s*\{([\s\S]*?)\}/g;
  while ((match = enumRegex.exec(raw)) !== null) {
    const enumName = match[1];
    const members = new Set();
    const memberRegex = /(\w+)\s*=/g;
    let member;
    while ((member = memberRegex.exec(match[2])) !== null) {
      members.add(member[1]);
    }
    enums.set(enumName, members);
  }

  return { raw, methods, enums, interfaceMethods };
}

function loadEvents(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Event registry not found at ${filePath}. Run extract-stem-types first.`);
    return { known: new Set() };
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const known = new Set(data._allUsedEvents || []);

  for (const [name, members] of Object.entries(data)) {
    if (name === "_allUsedEvents") continue;
    if (members && typeof members === "object") {
      for (const value of Object.values(members)) {
        if (typeof value === "string") known.add(value);
      }
    }
  }

  return { known };
}

class CodeValidator {
  constructor(types, events) {
    this.types = types;
    this.events = events;
    this.errors = [];
    this.warnings = [];
  }

  validate(code, filename = "<stdin>") {
    this.errors = [];
    this.warnings = [];

    this.checkEventNames(code, filename);
    this.checkPhysicsUsage(code, filename);
    this.checkBehaviorLifecycle(code, filename);
    this.checkImports(code, filename);
    this.checkDOMListeners(code, filename);
    this.checkHardcodedPixels(code, filename);
    this.checkCollisionTypes(code, filename);
    this.checkBehaviorJsonAttributes(code, filename);

    return {
      file: filename,
      errors: this.errors,
      warnings: this.warnings,
      pass: this.errors.length === 0,
    };
  }

  checkEventNames(code, filename) {
    const patterns = [
      /EventBus\.instance\.send\(\s*["'`]([^"'`]+)["'`]/g,
      /EventBus\.instance\.subscribe\(\s*["'`]([^"'`]+)["'`]/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const eventName = match[1];
        if (!this.events.known.has(eventName) && !this.isValidCustomEvent(eventName)) {
          this.warnings.push({
            rule: "unknown-event",
            message: `Unknown event \"${eventName}\" — not in extracted event registry.`,
            file: filename,
            line: this.getLineNumber(code, match.index),
          });
        }
      }
    }
  }

  isValidCustomEvent(name) {
    return /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*){1,3}$/.test(name);
  }

  checkPhysicsUsage(code, filename) {
    const physicsCallPattern = /(?:this\.)?(?:game\.)?physics\.(\w+)\s*\(/g;
    const knownPhysicsMethods = this.types.interfaceMethods.get("IPhysics") || new Set();

    let match;
    while ((match = physicsCallPattern.exec(code)) !== null) {
      const method = match[1];
      if (!knownPhysicsMethods.has(method)) {
        this.errors.push({
          rule: "hallucinated-physics-api",
          message: `physics.${method}() does not exist on extracted IPhysics interface.`,
          file: filename,
          line: this.getLineNumber(code, match.index),
        });
      }
    }
  }

  checkBehaviorLifecycle(code, filename) {
    const validLifecycle = new Set([
      "constructor",
      "init",
      "dispose",
      "update",
      "fixedUpdate",
      "onAdded",
      "onRemoved",
      "onStart",
      "onStop",
      "onPaused",
      "onResumed",
      "onReset",
      "onAttributesUpdated",
      "onStateUpdated",
      "onEvent",
      "onEditorAdded",
      "onEditorRemoved",
      "onEditorDispose",
      "onEditorUpdate",
      "onEditorPanelShown",
      "onEditorPanelHidden",
      "onEditorAttributesUpdated",
      "onEditorButtonClicked",
      "onEditorEvent",
      "onAttributeChangeRequested",
      "onAttributeChanged",
    ]);

    const classMethodPattern = /(?:async\s+)?(on\w+)\s*\([^)]*\)\s*\{/g;
    let match;
    while ((match = classMethodPattern.exec(code)) !== null) {
      const method = match[1];
      if (!validLifecycle.has(method) && this.nearLifecycleName(method, validLifecycle)) {
        this.warnings.push({
          rule: "possible-typo-lifecycle",
          message: `Method \"${method}\" may be a misspelled lifecycle hook.`,
          file: filename,
          line: this.getLineNumber(code, match.index),
        });
      }
    }
  }

  nearLifecycleName(name, set) {
    const lowered = name.toLowerCase();
    for (const value of set) {
      if (levenshtein(value.toLowerCase(), lowered) <= 1) return true;
    }
    return false;
  }

  checkImports(code, filename) {
    const importPattern = /import\s+.*?from\s+["'`]([^"'`]+)["'`]/g;
    let match;
    while ((match = importPattern.exec(code)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith("@stem/") || importPath.startsWith("stem-studio/") || importPath.includes("stem-engine")) {
        this.errors.push({
          rule: "hallucinated-import",
          message: `Likely invalid engine import: \"${importPath}\".`,
          file: filename,
          line: this.getLineNumber(code, match.index),
        });
      }
    }
  }

  checkDOMListeners(code, filename) {
    const rawListenerPattern = /addEventListener\(\s*["'`](keydown|keyup|keypress|mousedown|mouseup|mousemove|click)["'`]/g;
    let match;
    while ((match = rawListenerPattern.exec(code)) !== null) {
      const eventType = match[1];
      const line = this.getLineNumber(code, match.index);

      const hasPointerFallback =
        code.includes("pointerdown") ||
        code.includes("pointerup") ||
        code.includes("pointermove") ||
        code.includes("touchstart") ||
        code.includes("touchend");

      if (eventType.startsWith("mouse") && !hasPointerFallback) {
        this.warnings.push({
          rule: "no-touch-fallback",
          message: `Raw ${eventType} listener without pointer/touch fallback.`,
          file: filename,
          line,
        });
      }

      if (eventType.startsWith("key")) {
        this.warnings.push({
          rule: "raw-keyboard-listener",
          message: `Raw ${eventType} listener detected. Prefer input manager abstraction.`,
          file: filename,
          line,
        });
      }
    }
  }

  checkHardcodedPixels(code, filename) {
    const stylePattern = /(?:style\.\w+|width|height|top|left|right|bottom)\s*=\s*["'`]?\d{3,}px/g;
    let match;
    while ((match = stylePattern.exec(code)) !== null) {
      this.warnings.push({
        rule: "hardcoded-pixels",
        message: "Hardcoded pixel value detected; prefer responsive units.",
        file: filename,
        line: this.getLineNumber(code, match.index),
      });
    }
  }

  checkCollisionTypes(code, filename) {
    const pattern = /COLLISION_TYPE\.(\w+)/g;
    const validTypes = new Set(["UNKNOWN", "WITH_PLAYER", "WITH_COLLIDABLE_OBJECTS", "WITH_ENEMY"]);

    let match;
    while ((match = pattern.exec(code)) !== null) {
      const value = match[1];
      if (!validTypes.has(value)) {
        this.errors.push({
          rule: "invalid-collision-type",
          message: `COLLISION_TYPE.${value} does not exist.`,
          file: filename,
          line: this.getLineNumber(code, match.index),
        });
      }
    }
  }

  checkBehaviorJsonAttributes(code, filename) {
    if (!filename.endsWith(".json")) return;

    let config;
    try {
      config = JSON.parse(code);
    } catch {
      return;
    }

    if (!config.attributes || typeof config.attributes !== "object") return;

    const validTypes = new Set([
      "number", "boolean", "string", "enum", "slider", "color",
      "vector2", "vector3", "select", "file", "text", "textarea",
      "object", "prefab", "modelAsset", "image", "imageAsset",
      "video", "group", "objectBehaviors", "separator", "label", "button",
    ]);

    for (const [key, attr] of Object.entries(config.attributes)) {
      if (attr && attr.type && !validTypes.has(attr.type)) {
        this.errors.push({
          rule: "invalid-attribute-type",
          message: `Attribute \"${key}\" has invalid type \"${attr.type}\".`,
          file: filename,
        });
      }
    }
  }

  getLineNumber(code, index) {
    return code.substring(0, index).split("\n").length;
  }
}

function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (b[i - 1] === a[j - 1] ? 0 : 1)
      );
    }
  }
  return matrix[b.length][a.length];
}

function walkDir(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkDir(full));
    else files.push(full);
  }
  return files;
}

function printResults(results) {
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const result of results) {
    if (!result.errors.length && !result.warnings.length) {
      if (verbose) console.log(`OK ${result.file}`);
      continue;
    }

    console.log(`\n${result.file}`);
    for (const err of result.errors) {
      totalErrors++;
      console.log(`  ERROR [${err.rule}] line ${err.line || "?"}: ${err.message}`);
    }
    for (const warn of result.warnings) {
      totalWarnings++;
      console.log(`  WARN  [${warn.rule}] line ${warn.line || "?"}: ${warn.message}`);
    }
  }

  console.log("\n" + "-".repeat(48));
  console.log(`Scanned: ${results.length} file(s)`);
  console.log(`Errors:  ${totalErrors}`);
  console.log(`Warnings:${totalWarnings}`);

  if (totalErrors > 0) {
    process.exit(1);
  }
  process.exit(0);
}

function main() {
  const types = loadTypes(typesPath);
  const events = loadEvents(eventsPath);
  const validator = new CodeValidator(types, events);
  const results = [];

  if (useStdin) {
    let code = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (code += chunk));
    process.stdin.on("end", () => {
      results.push(validator.validate(code));
      printResults(results);
    });
    return;
  }

  if (!targetPath) {
    console.error("Usage: node scripts/validate-stem-code.cjs <file-or-directory> [--types ...] [--events ...]");
    console.error("       node scripts/validate-stem-code.cjs --stdin");
    process.exit(2);
  }

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    const code = fs.readFileSync(targetPath, "utf-8");
    results.push(validator.validate(code, targetPath));
  } else if (stat.isDirectory()) {
    const files = walkDir(targetPath).filter((f) => f.endsWith(".js") || f.endsWith(".ts") || f.endsWith(".json"));
    for (const file of files) {
      const code = fs.readFileSync(file, "utf-8");
      results.push(validator.validate(code, file));
    }
  }

  printResults(results);
}

main();
