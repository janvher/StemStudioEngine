import AiAgent from "./AiAgent";
import type AiNpcBehavior from "./AiNpcBehavior";
import {isInputActive} from "@stem/editor-oss/editor/assets/v2/utils/isInputActive";
import global from "@stem/editor-oss/global";
import AiConversationView from "@web-shared/player/component/AiConversationView";
import VoiceRecorder from "@stem/editor-oss/utils/VoiceRecorder";
import GameManager from "../../game/GameManager";

type RangeInfo = {
    distanceFromPlayer: number;
    isInRange: boolean;
    agentId: string;
};

const keysMapping: Record<number, string> = {
    8: "Backspace",
    69: "E",
};

class AIConversationManager {
    private static readonly AI_NPC_BEHAVIOR_ID = "aiNpc";

    voiceRecorder: VoiceRecorder | null = null;
    aiAgents: AiAgent[] = [];
    buttonView: AiConversationView | null = null;
    private gamePaused: boolean = false;
    private readonly boundHandleKeyDown: (event: KeyboardEvent) => void;
    private readonly boundHandleKeyUp: (event: KeyboardEvent) => void;
    private gameManager: GameManager | null = null;
    private ranges: RangeInfo[] = [];
    private lastDisplayedAgent: AiAgent | null = null;

    constructor(game: GameManager) {
        global.app!.on("gameStarted.AIConversationController", this.handleGameStarted.bind(this));
        global.app!.on("pauseGame.AIConversationController", this.handleGamePaused.bind(this));
        global.app!.on("gameEnded.AIConversationController", this.handleGameEnded.bind(this));

        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);
        this.buttonView = new AiConversationView(game.engine);
        this.gameManager = game;
        this.voiceRecorder = new VoiceRecorder();
    }

    private bindEventListeners(): void {
        document.addEventListener("keydown", this.boundHandleKeyDown);
        document.addEventListener("keyup", this.boundHandleKeyUp);
    }

    private unbindEventListeners(): void {
        document.removeEventListener("keydown", this.boundHandleKeyDown);
        document.removeEventListener("keyup", this.boundHandleKeyUp);
    }

    registerAiAgent(aiAgent: AiAgent) {
        if (!this.aiAgents.some(agent => agent.id === aiAgent.id)) {
            this.aiAgents.push(aiAgent);
            global.app?.call("agentRegistered", aiAgent);
            if (aiAgent.behavior.attributes.active_in_voice_chat) {
                void this.voiceRecorder?.init();
            }
        }
    }

    unregisterAiAgent(aiAgent: AiAgent) {
        const index = this.aiAgents.findIndex(agent => agent.id === aiAgent.id);
        if (index !== -1) {
            this.aiAgents.splice(index, 1);
            global.app?.call("agentUnregistered", aiAgent);
        }
    }

    getAiAgentBehavior = (aiAgent: AiAgent): AiNpcBehavior | null => {
        return aiAgent.behavior;
    };

    private getAiNpcBehaviors(): AiNpcBehavior[] {
        return (this.gameManager?.behaviorManager?.getBehaviorsById(AIConversationManager.AI_NPC_BEHAVIOR_ID) ||
            []) as AiNpcBehavior[];
    }

    getClosestAiAgent(checkRange: boolean = false): AiAgent | null {
        if (!this.ranges.length || !this.gameManager?.player) return null;

        // If checkRange is true, only consider agents that are in range
        const eligibleRanges = checkRange ? this.ranges.filter(r => r.isInRange) : this.ranges;

        if (!eligibleRanges.length) return null;

        const closest = eligibleRanges.reduce((acc, loc) =>
            acc.distanceFromPlayer < loc.distanceFromPlayer ? acc : loc,
        );

        return this.aiAgents.find(agent => agent.id === closest.agentId) || null;
    }

    updateRangeData(range: RangeInfo) {
        const holder = this.ranges.filter(r => r.agentId !== range.agentId);
        this.ranges = [...holder, range];
    }

    updateUI() {
        const aiAgentInRange = this.getClosestAiAgent(true);

        if (this.lastDisplayedAgent !== aiAgentInRange) {
            this.buttonView?.dispose();
        }

        this.lastDisplayedAgent = aiAgentInRange;

        if (aiAgentInRange && aiAgentInRange.behavior.attributes.active_in_voice_chat) {
            this.buttonView?.show(
                aiAgentInRange.behavior.attributes.name || "NPC",
                aiAgentInRange.isBusy || aiAgentInRange.isPlaying,
            );
        } else {
            this.buttonView?.dispose();
        }
    }

    private handleKeyDown(event: KeyboardEvent): void {
        if (this.gamePaused) return;

        const key = keysMapping[event.keyCode];

        if (key === "E") {
            // Find the closest AI agent
            const closestAgent = this.getClosestAiAgent(true);
            if (!closestAgent) return;

            // Get the behavior that owns this agent
            const behavior = this.getAiNpcBehaviors().find(b => b.agent === closestAgent) || null;

            // Start recording if the behavior is ready for interaction
            if (behavior && behavior.isReadyForInteraction() && !isInputActive()) {
                behavior.startRecording();
            }
        }

        if (key === "Backspace") {
            // Reset if needed
        }
    }

    private handleKeyUp(event: KeyboardEvent): void {
        if (this.gamePaused || !this.gameManager) return;

        const key = keysMapping[event.keyCode];

        if (key === "E") {
            this.getAiNpcBehaviors().forEach(behavior => {
                behavior.stopRecording();
            });
        }
    }

    private handleGamePaused = (): void => {
        this.gamePaused = true;

        if (this.gameManager) {
            this.getAiNpcBehaviors().forEach(behavior => {
                behavior.pause();
            });
        }
    };

    private handleGameEnded = (): void => {
        this.gamePaused = true;
        this.unbindEventListeners();

        if (this.gameManager) {
            this.getAiNpcBehaviors().forEach(behavior => {
                behavior.dispose();
            });
        }
    };

    private handleGameStarted = (): void => {
        this.gamePaused = false;
        this.bindEventListeners();

        if (this.gameManager) {
            this.getAiNpcBehaviors().forEach(behavior => {
                behavior.resume();
            });
        }
    };

    public dispose() {
        this.unbindEventListeners();
        this.voiceRecorder?.dispose();
        if (global.app) {
            global.app.on("gameStarted.AIConversationController", null);
            global.app.on("pauseGame.AIConversationController", null);
            global.app.on("gameEnded.AIConversationController", null);
        }
    }

    /*private handleGamePaused = (): void => {
        this.gamePaused = true;
        //this.aiAgent?.pause();
        this.buttonView?.dispose();
        this.aiAgents.forEach(aiAgent => {
            aiAgent.setGainNodeValue(0);
        });
    };

    private handleGameEnded = (): void => {
        this.gamePaused = true;
        this.unbindEventListeners();
        this.buttonView?.dispose();
        this.aiAgents.forEach(aiAgent => {
            aiAgent.reset();
        });
    };

    private handleGameStarted = (): void => {
        this.gamePaused = false;
        this.bindEventListeners();
        //this.aiAgent?.resume();
    };

    public dispose() {
        this.unbindEventListeners();

        if (global.app) {
            global.app!.on("gameStarted.AIConversationController", null);
            global.app!.on("pauseGame.AIConversationController", null);
            global.app!.on("gameEnded.AIConversationController", null);
        }
    }*/
}

export default AIConversationManager;
