import * as acorn from "acorn";

import type {ValidationIssue} from "../types";

type AstNode = acorn.Node & Record<string, unknown>;

const ANY_MEMBER_PATH = Symbol("any-member-path");
const FUNCTION_MEMBER_ALLOWLIST = new Set(["apply", "bind", "call", "length", "name"]);

interface ApiSchemaMap {
    [key: string]: ApiSchemaNode;
}

type ApiSchemaNode = true | typeof ANY_MEMBER_PATH | ApiSchemaMap;

const ERTH_API_TREE: Record<string, ApiSchemaNode> = {
    ai: {
        gen: {
            generate3dModel: true,
        },
    },
    asset: {
        createAssetRelease: true,
        getAssetDerivatives: true,
        getMyAssets: true,
        model: {
            createFromUrl: true,
            preload: true,
            createInstance: true,
            unload: true,
            findByName: true,
        },
        image: {
            createTexture: true,
            findByName: true,
            getUrl: true,
        },
        audio: {
            getUrl: true,
            findByName: true,
        },
        video: {
            getUrl: true,
            findByName: true,
        },
        stem: {
            preload: true,
            createInstance: true,
            unload: true,
            findByName: true,
        },
    },
    camera: {
        position: ANY_MEMBER_PATH,
        quaternion: ANY_MEMBER_PATH,
        fov: true,
        near: true,
        far: true,
        lookAt: true,
    },
    scene: {
        addObject: true,
    },
    store: {
        get: true,
        set: true,
        has: true,
        delete: true,
        keys: true,
        size: true,
    },
    combat: {
        calculateDamage: true,
        applyDamage: true,
        regenerateHealth: true,
        getAttackPriority: true,
        selectBestTarget: true,
        getDamageEffectiveness: true,
    },
    team: {
        isEnemy: true,
        isFriendly: true,
        canAttack: true,
        findNearestEnemy: true,
        getEnemiesInRange: true,
    },
    pool: {
        create: true,
    },
    object: {
        createFromThreeObject: true,
    },
    behaviors: {
        find: true,
        findAll: true,
        findOnObject: true,
        getAttribute: true,
        requestChange: true,
    },
    lambdas: {
        getInstance: true,
        getInstancesByType: true,
        registerObject: true,
        deregisterObject: true,
        getObjectLambdas: true,
    },
};

const INPUT_MANAGER_MEMBERS = new Set([
    "attach",
    "detach",
    "dispose",
    "getAction",
    "getMotion",
    "getMouseTouchPosition",
    "getVirtualDispatcher",
    "pause",
    "resume",
    "update",
]);

/**
 *
 * @param value
 */
function isAstNode(value: unknown): value is AstNode {
    return typeof value === "object" && value !== null && typeof (value as {type?: unknown}).type === "string";
}

/**
 *
 * @param node
 * @param visitor
 * @param parent
 */
function walkAst(node: AstNode | null | undefined, visitor: (node: AstNode, parent: AstNode | null) => void, parent: AstNode | null = null): void {
    if (!node) return;

    visitor(node, parent);

    for (const [key, value] of Object.entries(node)) {
        if (key === "type" || key === "start" || key === "end" || key === "loc" || key === "range") continue;
        if (!value) continue;

        if (Array.isArray(value)) {
            for (const child of value) {
                if (isAstNode(child)) {
                    walkAst(child, visitor, node);
                }
            }
            continue;
        }

        if (isAstNode(value)) {
            walkAst(value, visitor, node);
        }
    }
}

/**
 *
 * @param node
 */
function getIdentifierName(node: AstNode): string | null {
    const name = node.name;
    return typeof name === "string" ? name : null;
}

/**
 *
 * @param node
 */
function getLiteralStringValue(node: AstNode): string | null {
    const value = node.value;
    return typeof value === "string" ? value : null;
}

/**
 *
 * @param member
 */
function getMemberPropertyName(member: AstNode): string | null {
    const property = member.property;
    const computed = member.computed === true;

    if (!computed && isAstNode(property) && property.type === "Identifier") {
        return getIdentifierName(property);
    }

    if (computed && isAstNode(property) && property.type === "Literal") {
        return getLiteralStringValue(property);
    }

    return null;
}

/**
 *
 * @param node
 */
function getMemberPath(node: AstNode | null | undefined): string[] | null {
    if (!node) return null;

    if (node.type === "Identifier") {
        const name = getIdentifierName(node);
        return name ? [name] : null;
    }

    if (node.type === "ThisExpression") {
        return ["this"];
    }

    if (node.type !== "MemberExpression") {
        return null;
    }

    const object = isAstNode(node.object) ? node.object : null;
    const objectPath = getMemberPath(object);
    const propertyName = getMemberPropertyName(node);
    if (!objectPath || !propertyName) return null;

    return [...objectPath, propertyName];
}

/**
 *
 * @param ast
 */
function collectErthAliasNames(ast: AstNode): Set<string> {
    const aliases = new Set<string>(["erth"]);

    walkAst(ast, node => {
        if (node.type === "VariableDeclarator") {
            const id = isAstNode(node.id) ? node.id : null;
            const init = isAstNode(node.init) ? node.init : null;
            if (!id || !init || id.type !== "Identifier" || init.type !== "MemberExpression") return;

            const initPath = getMemberPath(init);
            const aliasName = getIdentifierName(id);
            if (aliasName && initPath && initPath.length === 2 && initPath[0] === "this" && initPath[1] === "erth") {
                aliases.add(aliasName);
            }
            return;
        }

        if (node.type === "AssignmentExpression") {
            const left = isAstNode(node.left) ? node.left : null;
            const right = isAstNode(node.right) ? node.right : null;
            if (!left || !right || left.type !== "Identifier" || right.type !== "MemberExpression") return;

            const rhsPath = getMemberPath(right);
            const aliasName = getIdentifierName(left);
            if (aliasName && rhsPath && rhsPath.length === 2 && rhsPath[0] === "this" && rhsPath[1] === "erth") {
                aliases.add(aliasName);
            }
        }
    });

    return aliases;
}

/**
 *
 * @param schemaNode
 */
function expectedMembersFor(schemaNode: ApiSchemaNode): string {
    if (schemaNode === ANY_MEMBER_PATH || schemaNode === true || typeof schemaNode !== "object" || !schemaNode) {
        return "";
    }

    return Object.keys(schemaNode).sort().join(", ");
}

/**
 *
 * @param issues
 * @param seen
 * @param node
 * @param message
 * @param lineText
 */
function pushApiError(
    issues: ValidationIssue[],
    seen: Set<string>,
    node: AstNode,
    message: string,
    lineText: string,
): void {
    const loc = node.loc?.start;
    if (!loc) return;

    const key = `${loc.line}:${loc.column}:${message}`;
    if (seen.has(key)) return;
    seen.add(key);

    issues.push({
        line: loc.line,
        column: loc.column + 1,
        message: lineText ? `${message}` : message,
        severity: "error",
        source: "api-schema",
    });
}

/**
 *
 * @param params
 * @param params.rootLabel
 * @param params.fullPath
 * @param params.segments
 * @param params.schemaRoot
 * @param params.node
 * @param params.codeLines
 * @param params.issues
 * @param params.seen
 */
function validateMemberPathAgainstSchema(params: {
    rootLabel: "erth";
    fullPath: string[];
    segments: string[];
    schemaRoot: Record<string, ApiSchemaNode>;
    node: AstNode;
    codeLines: string[];
    issues: ValidationIssue[];
    seen: Set<string>;
}): void {
    const {rootLabel, fullPath, segments, schemaRoot, node, codeLines, issues, seen} = params;
    if (segments.length === 0) return;

    let schemaNode: ApiSchemaNode = schemaRoot;

    for (let index = 0; index < segments.length; index++) {
        const segment = segments[index] ?? "";
        const pathPrefix = segments.slice(0, index).join(".");

        if (schemaNode === ANY_MEMBER_PATH) return;

        if (schemaNode === true) {
            if (FUNCTION_MEMBER_ALLOWLIST.has(segment)) return;
            pushApiError(
                issues,
                seen,
                node,
                `Hallucinated ${rootLabel} API path \`${fullPath.join(".")}\`: cannot access \`${segment}\` on terminal member \`${rootLabel}.${pathPrefix}\``,
                codeLines[(node.loc?.start.line || 1) - 1]?.trim() || "",
            );
            return;
        }

        if (typeof schemaNode !== "object" || !schemaNode) {
            pushApiError(
                issues,
                seen,
                node,
                `Hallucinated ${rootLabel} API path \`${fullPath.join(".")}\``,
                codeLines[(node.loc?.start.line || 1) - 1]?.trim() || "",
            );
            return;
        }

        if (!Object.prototype.hasOwnProperty.call(schemaNode, segment)) {
            const expected = expectedMembersFor(schemaNode);
            const parentPath = pathPrefix ? `${rootLabel}.${pathPrefix}` : rootLabel;
            pushApiError(
                issues,
                seen,
                node,
                `Hallucinated ${rootLabel} API member \`${segment}\` in \`${fullPath.join(".")}\`. Valid members under \`${parentPath}\`: ${expected || "(none)"}`,
                codeLines[(node.loc?.start.line || 1) - 1]?.trim() || "",
            );
            return;
        }

        schemaNode = schemaNode[segment]!;
    }
}

/**
 *
 * @param code
 */
export function checkHallucinatedApis(code: string): ValidationIssue[] {
    let ast: AstNode;

    try {
        ast = acorn.parse(code, {
            ecmaVersion: "latest",
            sourceType: "script",
            locations: true,
            allowReturnOutsideFunction: true,
        }) as unknown as AstNode;
    } catch {
        return [];
    }

    const issues: ValidationIssue[] = [];
    const seen = new Set<string>();
    const lines = code.split("\n");
    const erthAliases = collectErthAliasNames(ast);

    walkAst(ast, (node, parent) => {
        if (node.type !== "MemberExpression") return;
        if (parent?.type === "MemberExpression" && parent.object === node) return;

        const path = getMemberPath(node);
        if (!path || path.length < 2) return;

        let erthSegments: string[] | null = null;
        if (path.length >= 3 && path[0] === "this" && path[1] === "erth") {
            erthSegments = path.slice(2);
        } else if (erthAliases.has(path[0] || "")) {
            erthSegments = path.slice(1);
        }

        if (erthSegments && erthSegments.length > 0) {
            validateMemberPathAgainstSchema({
                rootLabel: "erth",
                fullPath: ["erth", ...erthSegments],
                segments: erthSegments,
                schemaRoot: ERTH_API_TREE,
                node,
                codeLines: lines,
                issues,
                seen,
            });
        }

        let inputSegments: string[] | null = null;
        if (path.length >= 4 && path[0] === "this" && path[1] === "game" && path[2] === "inputManager") {
            inputSegments = path.slice(3);
        } else if (path.length >= 3 && path[0] === "game" && path[1] === "inputManager") {
            inputSegments = path.slice(2);
        } else if (path.length >= 3 && path[0] === "_game" && path[1] === "inputManager") {
            inputSegments = path.slice(2);
        }

        if (inputSegments && inputSegments.length > 0) {
            const member = inputSegments[0] || "";
            if (!INPUT_MANAGER_MEMBERS.has(member)) {
                pushApiError(
                    issues,
                    seen,
                    node,
                    `Hallucinated game.inputManager API member \`${member}\`. Valid members: ${Array.from(INPUT_MANAGER_MEMBERS).sort().join(", ")}`,
                    lines[(node.loc?.start.line || 1) - 1]?.trim() || "",
                );
            }
        }
    });

    return issues;
}
