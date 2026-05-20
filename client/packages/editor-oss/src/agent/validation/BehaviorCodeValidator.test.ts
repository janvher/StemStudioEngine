import {describe, expect, it} from "vitest";

import {BehaviorCodeValidator} from "./BehaviorCodeValidator";
import {checkAntiPatterns} from "./rules/antiPatternRules";
import {checkHallucinatedApis} from "./rules/apiSchemaRules";
import {checkAsyncApiUsage} from "./rules/asyncApiRules";
import {checkLambdaPatterns} from "./rules/lambdaRules";
import {checkLifecycleSignatures} from "./rules/lifecycleRules";

describe("checkAntiPatterns", () => {
    it("flags this.game = game assignment", () => {
        const issues = checkAntiPatterns("this.game = game;");

        expect(issues).toHaveLength(1);
        expect(issues[0]?.message).toContain("closure variable");
    });

    it("flags this.THREE usage", () => {
        const issues = checkAntiPatterns("const THREE = this.THREE;");

        expect(issues).toHaveLength(1);
        expect(issues[0]?.message).toContain("THREE");
    });

    it("flags var usage", () => {
        const issues = checkAntiPatterns("var speed = 5;");

        expect(issues).toHaveLength(1);
        expect(issues[0]?.message).toContain("let");
    });

    it("flags legacy material classes", () => {
        const issues = checkAntiPatterns("const mat = new THREE.MeshBasicMaterial({color: 0xff0000});");

        expect(issues).toHaveLength(1);
        expect(issues[0]?.message).toContain("NodeMaterial");
    });

    it("allows correct code", () => {
        const issues = checkAntiPatterns("let game;\nthis.init = function(_game) { game = _game; };");

        expect(issues).toHaveLength(0);
    });

    it("skips comments", () => {
        const issues = checkAntiPatterns("// this.game = game;");

        expect(issues).toHaveLength(0);
    });

    it("respects skipLineMatch", () => {
        const issues = checkAntiPatterns("await erth.scene.addObject(obj);");

        expect(issues).toHaveLength(0);
    });
});

describe("checkLifecycleSignatures", () => {
    it("flags init with no parameters", () => {
        const issues = checkLifecycleSignatures("this.init = function() { };");

        expect(issues).not.toHaveLength(0);
        expect(issues[0]?.message).toContain("_game");
    });

    it("flags init(agent, config) signature", () => {
        const issues = checkLifecycleSignatures("this.init = function(agent, config) { this.game = agent.game; };");

        expect(issues).not.toHaveLength(0);
        expect(issues[0]?.message).toContain("agent");
    });

    it("flags deprecated onAdded", () => {
        const issues = checkLifecycleSignatures("this.onAdded = function() { };");

        expect(issues).not.toHaveLength(0);
        expect(issues[0]?.message).toContain("onStart");
    });

    it("flags plain function init()", () => {
        const issues = checkLifecycleSignatures("function init(game) { }");

        expect(issues).not.toHaveLength(0);
        expect(issues[0]?.message).toContain("this.init");
    });

    it("flags this.game usage without assignment", () => {
        const issues = checkLifecycleSignatures("this.update = function(dt) { this.game.camera.position.set(0, 0, 0); };");

        expect(issues).not.toHaveLength(0);
        expect(issues[0]?.message).toContain("never assigned");
    });

    it("allows correct closure pattern", () => {
        const issues = checkLifecycleSignatures(
            "let game;\nthis.init = function(_game) { game = _game; };\nthis.update = function(dt) { };",
        );

        expect(issues).toHaveLength(0);
    });
});

describe("checkAsyncApiUsage", () => {
    it("flags createTexture without await", () => {
        const issues = checkAsyncApiUsage("const tex = erth.asset.image.createTexture(ref);");

        expect(issues).not.toHaveLength(0);
        expect(issues[0]?.message).toContain("Promise");
    });

    it("allows createTexture with await", () => {
        const issues = checkAsyncApiUsage("const tex = await erth.asset.image.createTexture(ref);");

        expect(issues).toHaveLength(0);
    });

    it("allows createTexture with .then()", () => {
        const issues = checkAsyncApiUsage("erth.asset.image.createTexture(ref).then(function(tex) { return tex; });");

        expect(issues).toHaveLength(0);
    });

    it("flags erth.scene.addObject without await", () => {
        const issues = checkAsyncApiUsage("erth.scene.addObject(obj);");

        expect(issues).not.toHaveLength(0);
    });
});

describe("checkHallucinatedApis", () => {
    it("flags hallucinated erth.physics API", () => {
        const issues = checkHallucinatedApis("this.erth.physics.addBody(obj);");

        expect(issues).not.toHaveLength(0);
        expect(issues[0]?.message).toContain("Hallucinated");
    });

    it("allows valid erth.store.get", () => {
        const issues = checkHallucinatedApis("const score = this.erth.store.get('score');");

        expect(issues).toHaveLength(0);
    });

    it("allows valid erth.asset.model.createInstance", () => {
        const issues = checkHallucinatedApis("await this.erth.asset.model.createInstance(ref);");

        expect(issues).toHaveLength(0);
    });

    it("flags hallucinated erth.store.getAll", () => {
        const issues = checkHallucinatedApis("this.erth.store.getAll();");

        expect(issues).not.toHaveLength(0);
        expect(issues[0]?.message).toContain("getAll");
    });

    it("handles erth alias", () => {
        const issues = checkHallucinatedApis("const e = this.erth;\ne.physics.doThing();");

        expect(issues).not.toHaveLength(0);
    });

    it("flags hallucinated inputManager method", () => {
        const issues = checkHallucinatedApis("game.inputManager.isKeyDown('w');");

        expect(issues).not.toHaveLength(0);
        expect(issues[0]?.message).toContain("inputManager");
    });

    it("returns empty for unparseable code", () => {
        const issues = checkHallucinatedApis("this is not valid javascript {{{");

        expect(issues).toHaveLength(0);
    });
});

describe("checkLambdaPatterns", () => {
    it("flags this.erth in lambda code", () => {
        const issues = checkLambdaPatterns("this.erth.store.get('score');");

        expect(issues).not.toHaveLength(0);
        expect(issues[0]?.message).toContain("erth");
    });

    it("flags this.target in lambda code", () => {
        const issues = checkLambdaPatterns("const pos = this.target.position;");

        expect(issues).not.toHaveLength(0);
    });

    it("allows processObjects in lambda code", () => {
        const issues = checkLambdaPatterns("this.processObjects(function(obj, data) { return data; });");

        expect(issues).toHaveLength(0);
    });
});

describe("BehaviorCodeValidator", () => {
    const validator = new BehaviorCodeValidator();

    it("validates correct behavior code with no issues", () => {
        const code = `
let game;
this.init = function(_game) {
  game = _game;
};
this.update = function(deltaTime) {
  const pos = this.target.position;
  return pos;
};
this.dispose = function() {};
`;

        const result = validator.validate(code, "behavior");

        expect(result.valid).toBe(true);
        expect(result.errorCount).toBe(0);
        expect(result.issues).toHaveLength(0);
    });

    it("catches multiple issues in bad behavior code", () => {
        const code = `
var speed = 5;
this.init = function(agent, config) {
  this.game = agent.game;
};
this.update = function(dt) {
  const mat = new THREE.MeshBasicMaterial({color: 0xff0000});
  this.erth.physics.addBody(this.target);
  return mat;
};
`;

        const result = validator.validate(code, "behavior");

        expect(result.valid).toBe(false);
        expect(result.errorCount).toBeGreaterThan(0);
        expect(result.warningCount + result.infoCount).toBeGreaterThan(0);
    });

    it("treats deprecated APIs as errors", () => {
        const result = validator.validate("EventBus.send(target, 'msg');", "behavior");

        expect(result.valid).toBe(false);
        expect(result.errorCount).toBe(1);
        expect(result.issues[0]?.message).toContain("EventBus.send");
    });

    it("runs lambda-specific checks when type is lambda", () => {
        const result = validator.validate("this.erth.store.get('score');", "lambda");

        expect(result.issues.some(issue => issue.source === "lambda")).toBe(true);
    });

    it("skips lambda checks for behavior type", () => {
        const result = validator.validate("this.erth.store.get('score');", "behavior");

        expect(result.issues.some(issue => issue.source === "lambda")).toBe(false);
    });

    it("returns structured result with counts", () => {
        const result = validator.validate("var x = 1;", "behavior");

        expect(result.warningCount).toBeGreaterThan(0);
        expect(typeof result.errorCount).toBe("number");
        expect(typeof result.infoCount).toBe("number");
    });
});
