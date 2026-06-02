// DirectCopilotProvider — a browser-only copilot for the playground.
//
// The integrated build talks to a hosted ACP agent. The OSS playground has no
// such server, so this provider calls the visitor's chosen LLM provider
// directly from the browser, asks for a constrained StemScript plan, then
// applies that script through the same CommandsRegistry used by the terminal.

import type {RequestPermissionResponse} from "@agentclientprotocol/sdk";

import {CommandsExecutor, type CommandExecutionResult} from "../agent/CommandsExecutor";
import {CommandsRegistry} from "../agent/CommandsRegistry";
import {ScriptExecutor} from "../agent/script-tool/ScriptExecutor";
import type {ACPEvent, ACPEventType, InteractiveResult, InteractiveSelectionResolution} from "../agent/types/ACPTypes";
import {ConnectionState} from "../agent/types/ACPTypes";
import {
    buildBehaviorRegistrySummary,
    buildLambdaRegistrySummary,
    buildStructuredSceneSummary,
} from "../editor/assets/v2/AiCopilot/utils/prompt";
import type {CopilotEventHandler, ICopilotProvider} from "./ICopilotProvider";
import {
    resolveCopilotChatKeyChoice,
    type CopilotChatKey,
    type CopilotChatKeyChoice,
} from "./playgroundCopilotKeys";
import {
    createPlaygroundLLMClient,
    PLAYGROUND_MAX_OUTPUT_TOKENS,
    PLAYGROUND_PROMPT_CACHE_KEY,
    type PlaygroundLLMClient,
} from "./playgroundLLMClient";
import {PLAYGROUND_STEMSCRIPT_KNOWLEDGE} from "./playgroundStemscriptKnowledge";
import {
    parseProviderStemscriptPlan,
    validateGeneratedStemscript,
    validateInspectionStemscript,
    type PlaygroundStemscriptPlan,
} from "./playgroundStemscriptPlan";

const MAX_INSPECTION_ROUNDS = 2;

const NO_KEY_MESSAGE =
    "No AI provider key is configured. Click the **Keys** button above to add " +
    "an Anthropic, OpenAI/Codex, or Gemini key. It is stored locally in this " +
    "browser and used only for direct provider calls.";

const MULTIPLE_KEYS_MESSAGE =
    "Multiple AI provider keys are configured. Click the **Keys** button above " +
    "and choose the copilot model to use before running this request.";

const SYSTEM_PROMPT = `
You are the StemStudio playground copilot. You run inside a browser-based 3D editor.

Your job:
- Convert the user's request into live StemScript commands that create or edit the current scene.
- Use the cached StemScript/API knowledge base when choosing scale, physics, cameras, VFX, behaviors, game rules, and scene structure.
- Build complete playable changes, not static mockups. When a request implies gameplay, set a project title, attach/configure behaviors, physics, camera, game settings, triggers, feedback, and any needed custom controller behavior in the same script.
- Prefer existing built-in behavior components and behavior IDs from the available behavior registry before writing custom behavior code.
- Use the available lambda registry when debugging or extending ECS-style runtime systems. Query lambda metadata with lambda list/lambda get before assuming schema.
- Query imported scene assets before referencing models, behavior/lambda packs, script imports, generic files, media, VFX assets, or prefabs. Use list assets/list imports/list files/list models/list behavior packs/list lambda packs and get asset/get import/get file. Use names, descriptions, tags, and formats from those results to decide which existing asset can be reused.
- Prefer commands that can execute immediately in the browser. If the user asks for local file imports, explain the exact import StemScript they can run in the terminal instead of emitting direct import commands here.
- Return only JSON with this exact shape:
  {"reply":"short user-facing summary","inspectionStemscript":"optional read-only query commands","stemscript":"multi-line mutation commands","notes":["optional note"]}

When the user asks a question or does not want a mutation, set "stemscript" to "" and answer in "reply".
When you need more scene context before editing, set "inspectionStemscript" to read-only query commands and leave "stemscript" empty. The editor will run those queries and call you again with the results.

Allowed live patterns:
- add group name="Arena"
- add box|sphere|cylinder|cone|plane|torus|torusKnot|triangle|capsule|icosahedron|octahedron|dodecahedron|ring name="Object" position=x,y,z size=x,y,z color=#rrggbb parent="Group"
- update "Object" position=x,y,z rotation=x,y,z scale=x,y,z color=#rrggbb tag=Tag
- material "Object" color=#rrggbb roughness=0.5 metalness=0.1 opacity=1
- light "Directional" intensity=0.8 castShadow=true
- scene background type=Color color=#rrggbb
- scene lighting ambient={color:"#ffffff",intensity:0.5}
- scene fog type=linear color=#rrggbb near=20 far=80
- render settings useShadows=true shadowMapType=2
- physics enable "Object"; physics set "Object" config={shape:"box",mass:0,ctype:"Static"}
- camera "DefaultCamera" cameraType=THIRD_PERSON defaultDistance=6
- project title "Arena Runner"
- game settings isGame=true lives=3 maxScore=10 showHUD=true
- vfx add name="Effect" position=x,y,z config={...}
- list objects filter=Player; get Player; get settings Player; get material Ground; get physics Player; get camera DefaultCamera; get game settings
- behavior list filter=character; behavior get behaviorId=character
- get behavior Player behaviorId=character
- lambda list filter=motion; lambda get lambdaId=motionController includeCode=true
- list assets type=models|imports|files|behaviors|lambdas|packs|media filter=* limit=80; get asset assetId=asset-id; list imports; list files; list models; get import "math-helpers"; get file "level-data.json"
- behavior attach Player behaviorId=character config={isDefault:true,walkSpeed:3,runSpeed:8,jumpHeight:1.2}
- behavior attach Pickup behaviorId=consumable config={pointAmount:1,disposable:true}
- behavior attach Door behaviorId=tween config={startOnTrigger:true,move:{x:0,y:3,z:0},speed:1,loopMode:"Once"}
- behavior attach TriggerZone behaviorId=trigger config={if_condition:[{conditionType:"player_touches"}],if_operator:"and",then_steps:[{thenType:"activate",delay:0}]}
- behavior add name="GameController" description="Copilot generated for: arena scoring loop; uses Player, Coin, and Goal objects" code="this.init = function(game) {...}"
- behavior update behaviorId=GameController description="Copilot revised for: faster pickups and win condition" code="this.init = function(game) {...}"
- behavior attach Player behaviorId=GameController config={speed:6}
- behavior config Player behaviorId=GameController attributesData={speed:8}
- behavior detach Target behaviorId=BehaviorId
- navmesh add target="Default Scene" autoGenerate=true
- waypoint path add name=PatrolPath loop=true; waypoint add path=PatrolPath position=0,0,0 order=0

Rules:
- Do not use exec, export, save, require, add_model_to_scene, search_external_assets, search_local_assets, get_library_asset, or generate_3d_model.
- Do not create files, folders, bundles, YAML files, or external asset dependencies.
- Behavior code is allowed when built-ins are insufficient. Before adding or updating custom behavior code, inspect existing behavior/lambda registries or packs when relevant; if a listed asset fits, reuse it. If you add or update custom behavior code, include a description summarizing the user request, runtime purpose, inspected/reused assets, and expected attachment target, then attach it to the right scene object in the same stemscript.
- Existing behavior IDs are exact and case-sensitive. Use behaviorId=character, behaviorId=trigger, etc.; do not invent behavior IDs when a listed behavior fits.
- Inspection commands must be read-only: list/get objects, settings, materials, physics, lights, camera, scene settings, behavior settings/code, VFX, prefabs, lambdas, and scene assets/imports/files/models. Never put mutating commands in "inspectionStemscript".
- Keep most plans between 5 and 40 commands. Name important objects and group related objects.
- Use "size" for primitive dimensions. Use "parent" to organize children.
- For floors and walls, mark static colliders with physics commands when relevant.
- Keep JSON valid. Do not wrap the JSON in markdown.
`.trim();

type ChatMessage = {role: "user" | "assistant"; content: string};

type DirectExecutor = Pick<
    CommandsExecutor,
    | "executeCommand"
    | "hasPendingInteractiveResults"
    | "getPendingInteractiveResults"
    | "handleUserSelectionResult"
    | "on"
>;

export interface DirectCopilotProviderOptions {
    fetchImpl?: typeof fetch;
    resolveKey?: () => Promise<CopilotChatKey | null>;
    resolveKeyChoice?: () => Promise<CopilotChatKeyChoice>;
    createExecutor?: () => DirectExecutor;
    llmClient?: PlaygroundLLMClient;
}

type CommandEventMeta = {
    index?: number;
    total?: number;
};

type InspectionRound = {
    script: string;
    results: InspectionCommandResult[];
};

type InspectionCommandResult = {
    lineNumber: number;
    command: string;
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
};

export class DirectCopilotProvider implements ICopilotProvider {
    readonly isSuppressingSessionUpdates = false;

    private connected = false;
    private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
    private sessionId: string | null = null;
    private history: ChatMessage[] = [];
    private readonly handlers = new Map<ACPEventType, Set<CopilotEventHandler>>();
    private abortController: AbortController | null = null;
    private executor: DirectExecutor | null = null;
    private readonly resolveKeyChoice: () => Promise<CopilotChatKeyChoice>;
    private readonly createExecutor: () => DirectExecutor;
    private readonly llmClient: PlaygroundLLMClient;

    constructor(options: DirectCopilotProviderOptions = {}) {
        const fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
        this.resolveKeyChoice =
            options.resolveKeyChoice ??
            (options.resolveKey
                ? async () => {
                    const key = await options.resolveKey!();
                    return key ? {kind: "ready", key, keys: [key]} : {kind: "none", keys: []};
                }
                : resolveCopilotChatKeyChoice);
        this.createExecutor =
            options.createExecutor ??
            (() => new CommandsExecutor(new CommandsRegistry({getSessionId: () => this.sessionId})));
        this.llmClient = options.llmClient ?? createPlaygroundLLMClient(fetchImpl);
    }

    private emit(type: ACPEventType, data?: ACPEvent["data"]): void {
        const set = this.handlers.get(type);
        if (!set) return;
        for (const handler of set) {
            try {
                handler({type, data});
            } catch (err) {
                console.error(`[DirectCopilotProvider] handler for "${type}" threw`, err);
            }
        }
    }

    private getExecutor(): DirectExecutor {
        if (!this.executor) {
            this.executor = this.createExecutor();
            this.executor.on("interactiveResult", (interactive: InteractiveResult) => {
                this.emit("interactiveResult", interactive);
            });
        }
        return this.executor;
    }

    on(eventType: ACPEventType, handler: CopilotEventHandler): void {
        let set = this.handlers.get(eventType);
        if (!set) {
            set = new Set();
            this.handlers.set(eventType, set);
        }
        set.add(handler);
    }

    async connect(): Promise<void> {
        this.connected = true;
        this.connectionState = ConnectionState.CONNECTED;
        this.emit("connected");
    }

    disconnect(): void {
        this.cancel();
        this.connected = false;
        this.connectionState = ConnectionState.DISCONNECTED;
        this.emit("disconnected");
    }

    isConnected(): boolean {
        return this.connected;
    }

    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    private cancel(): void {
        this.abortController?.abort();
        this.abortController = null;
    }

    async cancelCurrentTask(): Promise<void> {
        this.cancel();
        this.emit("taskCancelled");
    }

    async createSession(): Promise<string> {
        this.sessionId =
            typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `direct-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        this.history = [];
        this.emit("sessionCreated", {sessionId: this.sessionId});
        return this.sessionId;
    }

    async loadSession(sessionId: string): Promise<void> {
        this.sessionId = sessionId;
    }

    getCurrentSessionId(): string | null {
        return this.sessionId;
    }

    getSessionId(): string | null {
        return this.sessionId;
    }

    async prompt(promptText: string, context: Record<string, unknown> = {}): Promise<string> {
        this.emit("promptStarted", {prompt: promptText});

        const keyChoice = await this.resolveKeyChoice();
        if (keyChoice.kind === "none") {
            this.emit("agentMessage", {message: NO_KEY_MESSAGE, replayStartNewMessage: true});
            this.emit("promptCompleted");
            return NO_KEY_MESSAGE;
        }
        if (keyChoice.kind === "needs-selection") {
            const message = [
                MULTIPLE_KEYS_MESSAGE,
                "",
                "Available models:",
                ...keyChoice.keys.map(key => `- ${key.provider}: ${key.model}`),
            ].join("\n");
            this.emit("agentMessage", {message, replayStartNewMessage: true});
            this.emit("promptCompleted");
            return message;
        }

        const {key} = keyChoice;

        const controller = new AbortController();
        this.abortController = controller;

        try {
            this.emit("agentThinking", {message: "Generating StemScript for the live scene..."});

            let providerPrompt = this.buildProviderPrompt(promptText, context);
            let rawPlan = await this.requestPlan(key, providerPrompt, controller.signal);
            let plan = parseProviderStemscriptPlan(rawPlan);
            const inspections: InspectionRound[] = [];

            for (let round = 0; round < MAX_INSPECTION_ROUNDS && plan.inspectionStemscript.trim(); round++) {
                const validatedInspection = validateInspectionStemscript(plan.inspectionStemscript);
                if (validatedInspection.executableCommands > 0) {
                    this.emit("toolCall", {toolCall: {title: "Inspect scene"}});
                    const results = await this.executeInspectionStemscript(validatedInspection.script, controller.signal);
                    inspections.push({script: validatedInspection.script, results});
                }

                this.emit("agentThinking", {message: "Planning changes from scene inspection..."});
                providerPrompt = this.buildProviderPrompt(promptText, context, {
                    inspections,
                    previousPlan: plan,
                });
                rawPlan = await this.requestPlan(key, providerPrompt, controller.signal);
                plan = parseProviderStemscriptPlan(rawPlan);
            }

            let finalMessage = plan.reply || "Done.";

            if (plan.stemscript.trim()) {
                const validated = validateGeneratedStemscript(plan.stemscript);
                if (validated.executableCommands > 0) {
                    this.emit("toolCall", {toolCall: {title: "Apply StemScript commands"}});
                    const execution = await this.executeStemscript(validated.script, controller.signal);
                    finalMessage = this.formatExecutionSummary(finalMessage, validated.script, execution);
                }
            }

            this.emit("agentMessage", {message: finalMessage, replayStartNewMessage: true});
            this.history.push({role: "user", content: promptText});
            this.history.push({role: "assistant", content: finalMessage});
            this.history = this.history.slice(-8);
            return finalMessage;
        } catch (err) {
            const message =
                err instanceof DOMException && err.name === "AbortError"
                    ? "(cancelled)"
                    : `Copilot request failed: ${err instanceof Error ? err.message : String(err)}`;
            this.emit("agentMessage", {message, replayStartNewMessage: true});
            return message;
        } finally {
            this.abortController = null;
            this.emit("promptCompleted");
        }
    }

    private buildProviderPrompt(
        promptText: string,
        context: Record<string, unknown>,
        inspectionContext?: {inspections: InspectionRound[]; previousPlan: PlaygroundStemscriptPlan},
    ): string {
        const sceneSummary = buildStructuredSceneSummary();
        const behaviorRegistry = buildBehaviorRegistrySummary();
        const lambdaRegistry = buildLambdaRegistrySummary();
        const recentHistory = this.history.slice(-6);

        return [
            "User request:",
            promptText,
            "",
            "Current scene summary JSON:",
            JSON.stringify(sceneSummary ?? {}, null, 2),
            "",
            behaviorRegistry.length > 0 ? "Available behavior registry JSON:" : "",
            behaviorRegistry.length > 0 ? JSON.stringify(behaviorRegistry, null, 2) : "",
            behaviorRegistry.length > 0 ? "Use these exact behaviorId values for existing behavior attachments." : "",
            behaviorRegistry.length > 0 ? "" : "",
            lambdaRegistry.length > 0 ? "Available lambda registry JSON:" : "",
            lambdaRegistry.length > 0 ? JSON.stringify(lambdaRegistry, null, 2) : "",
            lambdaRegistry.length > 0 ? "Use these exact lambdaId values for lambda inspection and references." : "",
            lambdaRegistry.length > 0 ? "" : "",
            inspectionContext ? "Previous provider plan JSON:" : "",
            inspectionContext ? JSON.stringify({
                inspectionStemscript: inspectionContext.previousPlan.inspectionStemscript,
                reply: inspectionContext.previousPlan.reply,
                notes: inspectionContext.previousPlan.notes,
            }, null, 2) : "",
            inspectionContext ? "" : "",
            inspectionContext ? "Inspection results JSON:" : "",
            inspectionContext ? JSON.stringify(inspectionContext.inspections, null, 2) : "",
            inspectionContext ? "" : "",
            "Attached/request context JSON:",
            JSON.stringify(context ?? {}, null, 2),
            "",
            recentHistory.length > 0 ? "Recent conversation JSON:" : "",
            recentHistory.length > 0 ? JSON.stringify(recentHistory, null, 2) : "",
            "",
            inspectionContext
                ? "Return final JSON only. You may request another inspectionStemscript only if the results are still insufficient; otherwise produce the mutation stemscript."
                : "Return JSON only. Use inspectionStemscript for read-only scene queries before edits. Use an empty stemscript string if no scene change should be applied.",
        ].filter(part => part !== "").join("\n");
    }

    private async requestPlan(
        key: CopilotChatKey,
        prompt: string,
        signal: AbortSignal,
    ): Promise<string> {
        return this.llmClient.generateText({
            key,
            prompt,
            signal,
            systemPrompt: SYSTEM_PROMPT,
            knowledgePrompt: PLAYGROUND_STEMSCRIPT_KNOWLEDGE,
            promptCacheKey: PLAYGROUND_PROMPT_CACHE_KEY,
            maxOutputTokens: PLAYGROUND_MAX_OUTPUT_TOKENS,
        });
    }

    private async executeInspectionStemscript(
        script: string,
        signal: AbortSignal,
    ): Promise<InspectionCommandResult[]> {
        const lines = ScriptExecutor.parseScript(script).filter(line => !line.isComment && !line.isEmpty && line.parsed);
        const results: InspectionCommandResult[] = [];

        for (let i = 0; i < lines.length; i++) {
            if (signal.aborted) {
                throw new DOMException("Aborted", "AbortError");
            }
            const line = lines[i]!;
            const parsed = line.parsed!;
            this.emit("toolCallUpdate", {line: parsed.raw, index: i, total: lines.length});

            try {
                const result = await this.executeRegistryCommand(parsed.command, parsed.params, {
                    index: i,
                    total: lines.length,
                });
                results.push({
                    lineNumber: line.lineNumber,
                    command: parsed.raw,
                    success: result.success,
                    message: stringifyForPrompt(result.result?.message, 800),
                    data: compactForPrompt(result.result?.data),
                    error: result.error,
                });
            } catch (err) {
                results.push({
                    lineNumber: line.lineNumber,
                    command: parsed.raw,
                    success: false,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }

        return results;
    }

    private async executeStemscript(
        script: string,
        signal: AbortSignal,
    ): Promise<ReturnType<typeof ScriptExecutor.execute> extends Promise<infer T> ? T : never> {
        let currentIndex = 0;
        let total = 0;

        return ScriptExecutor.execute(
            script,
            async (command, params) => {
                if (signal.aborted) {
                    throw new DOMException("Aborted", "AbortError");
                }
                const result = await this.executeRegistryCommand(command, params, {
                    index: currentIndex,
                    total,
                });
                return {
                    success: result.success,
                    message: result.result?.message,
                    error: result.error,
                };
            },
            (current, nextTotal, line) => {
                currentIndex = current - 1;
                total = nextTotal;
                this.emit("toolCallUpdate", {line, index: currentIndex, total});
            },
        );
    }

    private async executeRegistryCommand(
        command: string,
        params: Record<string, unknown>,
        meta: CommandEventMeta = {},
    ): Promise<CommandExecutionResult> {
        this.emit("commandWillExecute", {command, parameters: params, ...meta});
        const result = await this.getExecutor().executeCommand(command, params);
        if (result.success) {
            this.emit("commandExecuted", {command, parameters: params, result: result.result, ...meta});
        } else {
            this.emit("commandExecutionFailed", {command, parameters: params, error: result.error, ...meta});
        }
        return result;
    }

    private formatExecutionSummary(
        reply: string,
        script: string,
        execution: Awaited<ReturnType<typeof ScriptExecutor.execute>>,
    ): string {
        const failures = execution.results.filter(result => !result.success);
        const lines = [
            reply,
            "",
            "```stemscript",
            script,
            "```",
            "",
            `Applied ${execution.successCount}/${execution.executedCommands} command(s).`,
        ];

        if (failures.length > 0) {
            lines.push("");
            lines.push("Some commands failed:");
            for (const failure of failures.slice(0, 5)) {
                lines.push(`- Line ${failure.lineNumber}: ${failure.error || "Unknown error"}`);
            }
        }

        return lines.join("\n").trim();
    }

    async executeCommand(method: string, params: Record<string, unknown>): Promise<CommandExecutionResult> {
        return this.executeRegistryCommand(method, params);
    }

    respondToPermissionRequest(_requestId: string, _response: RequestPermissionResponse): void {
        // Direct browser plans do not request host permissions.
    }

    hasPendingInteractiveResults(): boolean {
        return this.getExecutor().hasPendingInteractiveResults();
    }

    submitInteractiveSelectionResolution(resolution: InteractiveSelectionResolution): boolean {
        return this.getExecutor().handleUserSelectionResult(
            resolution.interactiveResult.id,
            resolution.results,
        );
    }

    checkPendingInteractiveResult(id: string): boolean {
        return this.getExecutor().getPendingInteractiveResults().some(result => result.id === id);
    }
}

function stringifyForPrompt(value: unknown, maxChars: number): string | undefined {
    if (value === undefined || value === null) return undefined;
    const text = typeof value === "string" ? value : safeJsonStringify(value);
    if (!text) return undefined;
    return text.length > maxChars ? `${text.slice(0, maxChars - 24)}... [truncated ${text.length} chars]` : text;
}

function compactForPrompt(value: unknown, maxChars = 6000): unknown {
    if (value === undefined || value === null) return undefined;
    const text = safeJsonStringify(value);
    if (!text || text.length <= maxChars) return value;
    return `${text.slice(0, maxChars - 24)}... [truncated ${text.length} chars]`;
}

function safeJsonStringify(value: unknown): string {
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}
