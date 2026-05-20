#!/usr/bin/env node

/**
 * Stem Studio Type Extractor
 *
 * Extracts key TypeScript contracts from synced engine files (or engine source)
 * and generates:
 * - stem-types.d.ts
 * - stem-events-registry.json
 */

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const DEFAULT_ENGINE_PATH = path.resolve(__dirname, "../ai/claude/typefiles/de-shadow-editor/web/src");
const DEFAULT_OUTPUT_PATH = path.resolve(__dirname, "../stem-types.d.ts");
const DEFAULT_EVENTS_OUTPUT = path.resolve(__dirname, "../stem-events-registry.json");

const args = process.argv.slice(2);
const enginePath = getArg("--engine-path") || DEFAULT_ENGINE_PATH;
const outputPath = getArg("--output") || DEFAULT_OUTPUT_PATH;
const eventsOutput = getArg("--events-output") || DEFAULT_EVENTS_OUTPUT;

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const EXTRACTION_TARGETS = {
  interfaces: [
    "physics/common/types.ts",
    "physics/common/events.ts",
    "types/editor.ts",
    "behaviors/event/EventBus.ts",
    "behaviors/Behavior.ts",
    "behaviors/game/GameManager.ts",
    "editor/assets/v2/CodeEditor/types/lambda.d.ts",
    "editor/assets/v2/CodeEditor/types/uikit.d.ts",
    "controls/AnimationController.ts",
    "controls/AnimationGraphController.ts",
    "controls/VehicleControls.ts",
  ],
  aiController: [
    "controls/AiWorldController/AiWorldController.types.ts",
    "controls/AiWorldController/docs.ts",
  ],
};

class TypeExtractor {
  constructor(basePath) {
    this.basePath = basePath;
    this.output = [];
    this.events = {};
    this.errors = [];
  }

  extract() {
    this.output.push("// Auto-generated Stem Studio type bundle");
    this.output.push(`// Generated: ${new Date().toISOString()}`);
    this.output.push(`// Source: ${this.basePath}`);
    this.output.push("");

    for (const [category, files] of Object.entries(EXTRACTION_TARGETS)) {
      this.output.push(`// ---- ${category.toUpperCase()} ----`);
      for (const relPath of files) {
        const fullPath = path.join(this.basePath, relPath);
        if (!fs.existsSync(fullPath)) {
          this.errors.push(`WARNING: File not found: ${relPath}`);
          this.output.push(`// MISSING: ${relPath}`);
          continue;
        }
        this.output.push(`// -- ${relPath} --`);
        this.extractFile(fullPath, relPath);
        this.output.push("");
      }
    }

    this.scanEventRegistry();

    return {
      types: this.output.join("\n"),
      events: this.events,
      errors: this.errors,
    };
  }

  extractFile(fullPath, relPath) {
    const source = fs.readFileSync(fullPath, "utf-8");
    const sourceFile = ts.createSourceFile(relPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    ts.forEachChild(sourceFile, (node) => this.visitNode(node, source, sourceFile));
  }

  visitNode(node, source, sourceFile) {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) {
      const text = this.getNodeText(node, source);
      this.output.push(this.cleanDeclaration(text));

      if (ts.isEnumDeclaration(node)) {
        const enumName = node.name.text;
        const members = {};
        node.members.forEach((member) => {
          if (member.initializer && ts.isStringLiteral(member.initializer)) {
            members[member.name.getText(sourceFile)] = member.initializer.text;
          }
        });
        if (Object.keys(members).length) this.events[enumName] = members;
      }
      return;
    }

    if (ts.isVariableStatement(node)) {
      const decl = node.declarationList.declarations[0];
      if (decl && decl.name && ts.isIdentifier(decl.name)) {
        const name = decl.name.text;
        if (name.includes("EVENT") || name === "UIKit" || name === "UIKitPointerEvents") {
          const text = this.getNodeText(node, source);
          this.output.push(this.cleanDeclaration(text));
        }
      }
      return;
    }

    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      this.output.push(`declare class ${className}${this.getHeritage(node, sourceFile)} {`);

      node.members.forEach((member) => {
        if (this.isPrivate(member)) return;

        if (ts.isPropertyDeclaration(member) && member.name) {
          const name = member.name.getText(sourceFile);
          const type = member.type ? member.type.getText(sourceFile) : "any";
          const modifier = this.isStatic(member) ? "static " : "";
          const ro = this.isReadonly(member) ? "readonly " : "";
          this.output.push(`  ${modifier}${ro}${name}: ${type};`);
        }

        if (ts.isMethodDeclaration(member) && member.name) {
          const name = member.name.getText(sourceFile);
          const params = member.parameters
            .map((p) => {
              const pName = p.name.getText(sourceFile);
              const pType = p.type ? p.type.getText(sourceFile) : "any";
              const optional = p.questionToken ? "?" : "";
              return `${pName}${optional}: ${pType}`;
            })
            .join(", ");
          const returnType = member.type ? member.type.getText(sourceFile) : "void";
          const modifier = this.isStatic(member) ? "static " : "";
          const asyncMod = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ? "async " : "";
          this.output.push(`  ${modifier}${asyncMod}${name}(${params}): ${returnType};`);
        }

        if (ts.isGetAccessorDeclaration(member) && member.name) {
          const name = member.name.getText(sourceFile);
          const returnType = member.type ? member.type.getText(sourceFile) : "any";
          const modifier = this.isStatic(member) ? "static " : "";
          this.output.push(`  ${modifier}readonly ${name}: ${returnType};`);
        }
      });

      this.output.push("}");
      return;
    }

    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.text;
      const params = node.parameters
        .map((p) => {
          const pName = p.name.getText(sourceFile);
          const pType = p.type ? p.type.getText(sourceFile) : "any";
          return `${pName}: ${pType}`;
        })
        .join(", ");
      const returnType = node.type ? node.type.getText(sourceFile) : "void";
      this.output.push(`declare function ${name}(${params}): ${returnType};`);
    }
  }

  getNodeText(node, source) {
    return source.substring(node.pos, node.end).trim();
  }

  cleanDeclaration(text) {
    return text.replace(/\bimport\b.*?;/g, "").trim();
  }

  getHeritage(node, sourceFile) {
    if (!node.heritageClauses) return "";
    const clauses = node.heritageClauses
      .map((c) => {
        const keyword = c.token === ts.SyntaxKind.ExtendsKeyword ? "extends" : "implements";
        const types = c.types.map((t) => t.getText(sourceFile)).join(", ");
        return `${keyword} ${types}`;
      })
      .join(" ");
    return ` ${clauses}`;
  }

  isPrivate(member) {
    return member.modifiers?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword);
  }

  isStatic(member) {
    return member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword);
  }

  isReadonly(member) {
    return member.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword);
  }

  scanEventRegistry() {
    this.output.push("\n// ---- EVENT REGISTRY ----\n");
    const allEvents = new Set();

    const scanForEvents = (dir) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === "node_modules") continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanForEvents(fullPath);
        } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const sendMatches = content.matchAll(/EventBus\.instance\.send\(\s*["'`]([^"'`]+)["'`]/g);
          for (const match of sendMatches) allEvents.add(match[1]);
          const subMatches = content.matchAll(/EventBus\.instance\.subscribe\(\s*["'`]([^"'`]+)["'`]/g);
          for (const match of subMatches) allEvents.add(match[1]);
        }
      }
    };

    scanForEvents(this.basePath);

    // Add events from extracted enum definitions (IN_GAME_EVENTS, BEHAVIOR_EVENTS, etc.)
    const eventEnumNames = ["IN_GAME_EVENTS", "BEHAVIOR_EVENTS", "PHYSICS_EVENTS", "IFRAME_MESSAGES"];
    for (const enumName of eventEnumNames) {
      if (this.events[enumName]) {
        for (const value of Object.values(this.events[enumName])) {
          allEvents.add(value);
        }
      }
    }

    this.output.push("type KnownEventTopics =");
    const sortedEvents = [...allEvents].sort();
    if (!sortedEvents.length) {
      this.output.push('  | "";');
    } else {
      sortedEvents.forEach((event, i) => {
        const suffix = i < sortedEvents.length - 1 ? " |" : ";";
        this.output.push(`  | "${event}"${suffix}`);
      });
    }

    this.events._allUsedEvents = sortedEvents;
  }
}

function main() {
  console.log("Stem Studio Type Extractor");
  console.log(`Engine path: ${enginePath}`);
  console.log(`Output:      ${outputPath}`);

  if (!fs.existsSync(enginePath)) {
    console.error(`Engine path not found: ${enginePath}`);
    process.exit(1);
  }

  const extractor = new TypeExtractor(enginePath);
  const result = extractor.extract();

  fs.writeFileSync(outputPath, result.types, "utf-8");
  fs.writeFileSync(eventsOutput, JSON.stringify(result.events, null, 2), "utf-8");

  console.log(`Type definitions written: ${outputPath}`);
  console.log(`Event registry written: ${eventsOutput}`);

  if (result.errors.length) {
    console.log("Warnings:");
    result.errors.forEach((e) => console.log(`  ${e}`));
  }
}

main();
