import * as THREE from "three";
import {AnimationMixer, Object3D} from "three";

import AiNpcBehavior from "./AiNpcBehavior";
import {startNPCConversation, SelectedAction} from "@stem/network/api/npc";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import AIWorldController from "../../../controls/AiWorldController/AiWorldController";
import {StoredAnimationData} from "../../../controls/AnimationController";
import global from "@stem/editor-oss/global";
import {getAIBackend} from "@stem/editor-oss/ai";

enum VRMAnimationNames {
    Acknowledging = "acknowledging",
    AngryGesture = "angry gesture",
    AnnoyedHeadShake = "annoyed head shake",
    BeingCocky = "being cocky",
    DismissingGesture = "dismissing gesture",
    HappyHandGesture = "happy hand gesture",
    HardHeadNod = "hard head nod",
    HeadNodYes = "head nod yes",
    LengthyHeadNod = "lengthy head nod",
    LookAwayGesture = "look away gesture",
    RelievedSigh = "relieved sigh",
    SarcasticHeadNod = "sarcastic head nod",
    ShakingHeadNo = "shaking head no",
    ThoughtfulHeadShake = "thoughtful head shake",
    WeightShift = "weight shift",
}

class AiAgent {
    private engine = global.app as EngineRuntime;
    private audioContext: AudioContext;
    private buffer: string[];
    private bufferSize: number;
    private audioChunks: Map<number, Uint8Array>;
    private currentIndex: number;
    private nextIndexToPlay: number;
    private requestQueue: Promise<void>;
    private previousText: string;
    private bufferText: string | null;
    private currentSource: AudioBufferSourceNode | null;
    private controller: AbortController | null;
    private pausePosition: number | null;
    private isPaused: boolean;
    private prevAnimation: StoredAnimationData | null = null;
    private aiWorldController: AIWorldController | null = null;

    private isVRM: boolean;

    id: string;
    sceneId: string;
    userName: string;
    isPlaying: boolean;
    isBusy: boolean;
    isInRange: boolean;
    model: Object3D;
    behavior: AiNpcBehavior;
    gainNode: GainNode;
    currentAnimationName: string;
    mixer: AnimationMixer;

    constructor(model: Object3D, behavior: AiNpcBehavior, sceneId: string, userName: string) {
        this.id = THREE.MathUtils.generateUUID();
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.isPlaying = false;
        this.buffer = [];
        this.bufferSize = 50;
        this.audioChunks = new Map();
        this.currentIndex = 0;
        this.nextIndexToPlay = 0;
        this.requestQueue = Promise.resolve();
        this.previousText = "";
        this.bufferText = null;
        this.currentSource = null;
        this.controller = null;
        this.pausePosition = null;
        this.isPaused = false;
        this.model = model;
        this.isBusy = false;
        this.isInRange = false;
        this.behavior = behavior;

        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 1;
        this.sceneId = sceneId;
        this.userName = userName;
        this.currentAnimationName = "";
        this.mixer = new AnimationMixer(model);
        this.isVRM = !!this.engine?.vrmExpressionControl?.getRegisteredVRMModel(this.model);
        this.aiWorldController = this.engine.aiWorldControl!.control;
    }

    async sendAudioFile(file: File): Promise<void> {
        const formData = new FormData();
        formData.append("audio", file);
        this.isBusy = true;

        // Stop NPC wandering during conversation
        this.behavior.stopNpc();

        try {
            const voiceResponse = await getAIBackend().request<{transcription: string}>("/api/AI/VoiceToText", {
                method: "POST",
                body: formData,
                headers: {"X-BYOK-Provider": "elevenlabs"},
            });

            if (!voiceResponse.ok) {
                throw new Error("Failed to transcribe audio.");
            }

            void this.handleAiAgentRequest(
                voiceResponse.data.transcription,
                (aiMessage: string) => {
                    this.queueTextToVoice(aiMessage, "", "");
                },
                (message: string) => {
                    void this.sendTextToConversation(message);
                },
            );
        } catch (error) {
            console.error("Error:", error);
            // Release NPC on error
            this.behavior.releaseNpc();
        }
    }

    async handleAiAgentRequest(
        prompt: string,
        handleCommandResponse: (aiMessage: string) => void,
        handleConversation: (message: string) => void,
    ): Promise<void> {
        try {
            if (this.behavior.attributes.is_scene_editor) {
                const commandsRes = await this.aiWorldController?.generateCommands(prompt);
                if (commandsRes?.commands) {
                    handleCommandResponse(commandsRes.response);
                    await this.aiWorldController?.executeCommands(commandsRes.commands);
                }
            } else {
                handleConversation(prompt);
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }

    private async sendTextToConversation(text: string): Promise<void> {
        this.controller = new AbortController();
        this.requestQueue = Promise.resolve();
        this.isBusy = true;

        // Stop NPC wandering during conversation
        this.behavior.stopNpc();

        // Check if NPC profile data is available
        if (!this.behavior.npcProfileData?.ID) {
            console.error("[AI Agent] No NPC profile data available");
            this.isBusy = false;
            this.behavior.releaseNpc();
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const agent = this;

        // Log GameContext for debugging
        console.log("[AI Agent] Sending request with GameContext:", {
            environment: this.behavior.gameContext.environment,
            availableActions: this.behavior.gameContext.availableActions?.length || 0,
            surroundedObjects: this.behavior.gameContext.surroundedObjects?.length || 0,
            npcPosition: this.behavior.gameContext.npcPosition,
            currentActions: this.behavior.gameContext.currentActions?.length || 0,
            recentEvents: this.behavior.gameContext.recentEvents?.length || 0,
        });
        console.log("[AI Agent] Surrounded Objects:", this.behavior.gameContext.surroundedObjects);

        try {
            await startNPCConversation(
                {
                    npcID: this.behavior.npcProfileData.ID,
                    sceneID: this.sceneId,
                    text: text,
                    userName: this.userName || "guest",
                    gameContext: this.behavior.gameContext,
                },
                // onChunk - handle dialogue text chunks
                (chunk: string) => {
                    if (!chunk || agent.controller?.signal.aborted) {
                        return;
                    }

                    agent.buffer.push(chunk);

                    if (agent.buffer.join("").length >= agent.bufferSize) {
                        let nextBufferText = agent.buffer.join("");

                        // Find the last complete word
                        const lastSpace = nextBufferText.lastIndexOf(" ");

                        if (lastSpace === -1) {
                            // No spaces found, store entire buffer
                            agent.bufferText =
                                agent.bufferText === null ? nextBufferText : agent.bufferText + nextBufferText;
                        } else {
                            const completeText = nextBufferText.substring(0, lastSpace);
                            const remainingText = nextBufferText.substring(lastSpace + 1);

                            if (agent.bufferText === null) {
                                agent.queueTextToVoice(completeText, agent.previousText, remainingText);
                                agent.previousText = completeText;
                                agent.bufferText = remainingText;
                            } else {
                                const fullText = agent.bufferText + completeText;
                                agent.queueTextToVoice(fullText, agent.previousText, remainingText);
                                agent.previousText = fullText;
                                agent.bufferText = remainingText;
                            }
                        }

                        agent.buffer = [];
                    }
                },
                // onActions - handle actions selected by AI
                (actions: SelectedAction[]) => {
                    console.log("[AI Agent] Received actions from AI:", actions);
                    agent.behavior.onActionsReceived(actions);
                },
                // onEnd - handle conversation end
                () => {
                    console.log("[AI Agent] Conversation ended");

                    // Process any remaining buffer
                    let nextBufferText = agent.buffer.join("");

                    if (agent.bufferText !== null) {
                        // Handle any remaining partial text
                        const lastSpace = nextBufferText.lastIndexOf(" ");
                        if (lastSpace !== -1) {
                            const completeText = agent.bufferText + nextBufferText.substring(0, lastSpace);
                            const remainingText = nextBufferText.substring(lastSpace + 1);

                            agent.queueTextToVoice(completeText, agent.previousText, remainingText);
                            agent.previousText = completeText;

                            // Queue the final piece
                            if (remainingText) {
                                agent.queueTextToVoice(remainingText, agent.previousText, "");
                                agent.previousText = remainingText;
                            }
                        } else {
                            // No spaces, just append everything
                            const completeText = agent.bufferText + nextBufferText;
                            agent.queueTextToVoice(completeText, agent.previousText, "");
                            agent.previousText = completeText;
                        }
                    } else if (nextBufferText) {
                        agent.queueTextToVoice(nextBufferText, agent.previousText, "");
                        agent.previousText = nextBufferText;
                    }

                    agent.bufferText = null;
                    agent.buffer = [];
                    agent.isBusy = false;
                    // Release NPC after conversation ends
                    agent.behavior.releaseNpc();
                },
                // onError - handle errors
                (error: Error) => {
                    console.error("[AI Agent] Error in conversation:", error);
                    agent.controller?.abort();
                    agent.isBusy = false;
                    // Release NPC on error
                    agent.behavior.releaseNpc();
                },
            );
        } catch (error) {
            console.error("[AI Agent] Error in conversation:", error);
            this.isBusy = false;
            // Release NPC on error
            this.behavior.releaseNpc();
            throw new Error("Failed to send text to AI conversation.");
        }
    }

    private queueTextToVoice(text: string, previousText: string, nextText: string): void {
        this.requestQueue = this.requestQueue.then(() =>
            this.sendTextToVoice(text, previousText, nextText, this.currentIndex++),
        );
    }

    private async sendTextToVoice(text: string, previousText: string, nextText: string, index: number): Promise<void> {
        if (!text) {
            return;
        }
        try {
            const voiceResponse = await getAIBackend().requestStream("/api/AI/TextToVoice", {
                method: "POST",
                body: {text, previousText, nextText, voiceId: this.behavior.attributes.voice_id},
                headers: {"X-BYOK-Provider": "elevenlabs"},
                signal: this.controller?.signal,
            });

            if (!voiceResponse.ok || !voiceResponse.body) {
                throw new Error("Failed to generate speech.");
            }

            await this.handleAudioStream(voiceResponse.body, index);
        } catch (error) {
            console.error("Error in /TextToVoice:", error);
            throw new Error("Failed to generate speech.");
        }
    }

    private async handleAudioStream(stream: ReadableStream<Uint8Array>, index: number): Promise<void> {
        const reader = stream.getReader();
        let audioData = new Uint8Array();

        while (true) {
            const {done, value} = await reader.read();
            if (done || !value) break;

            const temp = new Uint8Array(audioData.length + value.length);
            temp.set(audioData);
            temp.set(value, audioData.length);
            audioData = temp;
        }

        this.audioChunks.set(index, audioData);

        if (!this.isPlaying && index === this.nextIndexToPlay) {
            void this.playNextChunk();
        }
    }

    private async playNextChunk(): Promise<void> {
        const chunk = this.audioChunks.get(this.nextIndexToPlay);

        if (!chunk) {
            this.isBusy = false;
            this.currentIndex = 0;
            this.nextIndexToPlay = 0;
        }

        if (!chunk || this.isPaused) {
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        try {
            const audioBuffer = await this.audioContext.decodeAudioData(chunk.buffer as ArrayBuffer);
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            this.gainNode.connect(this.audioContext.destination);
            source.connect(this.gainNode);
            this.currentSource = source;

            source.onended = () => {
                this.audioChunks.delete(this.nextIndexToPlay);
                this.nextIndexToPlay++;
                void this.playNextChunk();
            };

            source.start();
        } catch (error) {
            this.audioChunks.delete(this.nextIndexToPlay);
            this.nextIndexToPlay++;
            void this.playNextChunk();
            console.error("Error decoding or playing audio chunk:", error);
        }
    }

    public reset(): void {
        this.isPlaying = false;
        this.isBusy = false;
        this.isPaused = false;
        this.buffer = [];
        this.bufferText = null;
        this.previousText = "";
        this.audioChunks.clear();
        this.currentIndex = 0;
        this.nextIndexToPlay = 0;

        this.controller?.abort();
        this.controller = null;

        this.requestQueue = Promise.resolve();

        if (this.currentSource) {
            this.currentSource.stop();
            this.currentSource = null;
        }
    }

    public pause(): void {
        if (this.isPlaying && this.currentSource) {
            this.isPaused = true;
            this.pausePosition = this.audioContext.currentTime;
            this.currentSource?.stop();
            this.isPlaying = false;
        }
    }

    public async resume(): Promise<void> {
        this.isPaused = false;
        if (!this.isPlaying && this.pausePosition !== null) {
            const chunk = this.audioChunks.get(this.nextIndexToPlay);

            if (chunk) {
                this.isPlaying = true;

                try {
                    const audioBuffer = await this.audioContext.decodeAudioData(chunk.buffer as ArrayBuffer);
                    const source = this.audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    this.gainNode.connect(this.audioContext.destination);
                    source.connect(this.gainNode);
                    this.currentSource = source;

                    source.onended = () => {
                        this.audioChunks.delete(this.nextIndexToPlay);
                        this.nextIndexToPlay++;
                        void this.playNextChunk();
                    };

                    source.start(0, this.pausePosition);
                    this.pausePosition = null;
                } catch (error) {
                    console.error("Error decoding or resuming audio chunk:", error);
                    this.isPlaying = false;
                }
            }
        }
    }

    setGainNodeValue = (gain: number): void => {
        this.gainNode.gain.value = gain;
    };

    playSpeechAnimation = async (): Promise<void> => {
        this.prevAnimation = {...this.model.userData.animation};
        this.currentAnimationName = "Idle";
        this.isPlaying = true;

        const isVRM = !!this.engine.vrmExpressionControl?.getRegisteredVRMModel(this.model);

        if (isVRM) {
            const animationName = this.getRandomVRMAnimationName();
            try {
                this.currentAnimationName = animationName as string;
                await this.engine.vrmExpressionControl?.playMixamoAnimation(this.model, animationName as string);
                this.setExpressionForAnimation(animationName as string);
            } catch (error) {
                this.currentAnimationName = "";
                console.error("Error playing VRM animation:", error);
            }
        } else {
            this.engine.animationControl?.playAnimation(this.model, this.currentAnimationName, 1);
        }
    };

    stopSpeechAnimation = (): void => {
        this.isPlaying = false;
        if (this.model.userData.animation && this.prevAnimation) {
            const {clip, speed} = this.prevAnimation;

            if (clip?.name) {
                if (this.isVRM) {
                    void this.engine.vrmExpressionControl?.playMixamoAnimation(this.model, clip.name);
                } else {
                    this.engine.animationControl?.playAnimation(this.model, clip.name, speed);
                }
            } else {
                this.engine.vrmExpressionControl?.stopAnimation(this.model);
                this.engine.animationControl?.stopAnimation(this.model);
            }

            this.setExpressionForAnimation("");

            this.prevAnimation = null;
            this.currentAnimationName = "";
        }
    };

    playAnimation = (animationName: VRMAnimationNames | string): void => {
        const isVRM = !!this.engine.vrmExpressionControl?.getRegisteredVRMModel(this.model);
        if (isVRM) {
            void this.engine.vrmExpressionControl?.playMixamoAnimation(this.model, animationName);
        } else {
            this.engine.animationControl?.playAnimation(this.model, animationName, 1);
        }
    };

    getRandomVRMAnimationName = (): VRMAnimationNames | undefined => {
        return Object.values(VRMAnimationNames)[Math.floor(Math.random() * Object.values(VRMAnimationNames).length)];
    };

    setExpressionForAnimation(animationName: VRMAnimationNames | string) {
        const vrmExpressionControl = this.engine.vrmExpressionControl;
        const vrm = vrmExpressionControl?.getRegisteredVRMModel(this.model);

        if (!vrm) {
            return;
        }
        switch (animationName as VRMAnimationNames) {
            case VRMAnimationNames.HappyHandGesture:
            case VRMAnimationNames.Acknowledging:
                vrmExpressionControl?.setHappyExpression(vrm);
                break;
            case VRMAnimationNames.AngryGesture:
            case VRMAnimationNames.HardHeadNod:
                vrmExpressionControl?.setAngryExpression(vrm);
                break;
            case VRMAnimationNames.ThoughtfulHeadShake:
                vrmExpressionControl?.setThoughtfulExpression(vrm);
                break;
            case VRMAnimationNames.RelievedSigh:
                vrmExpressionControl?.setRelievedExpression(vrm);
                break;
            case VRMAnimationNames.AnnoyedHeadShake:
            case VRMAnimationNames.ShakingHeadNo:
                vrmExpressionControl?.setAnnoyedExpression(vrm);
                break;
            case VRMAnimationNames.BeingCocky:
            case VRMAnimationNames.SarcasticHeadNod:
                vrmExpressionControl?.setSillyExpression(vrm);
                break;
            case VRMAnimationNames.LookAwayGesture:
                vrmExpressionControl?.setDisappointedExpression(vrm);
                break;
            case VRMAnimationNames.DismissingGesture:
                vrmExpressionControl?.setConfusedExpression(vrm);
                break;
            case VRMAnimationNames.HeadNodYes:
                vrmExpressionControl?.setSweetExpression(vrm);
                break;
            case VRMAnimationNames.LengthyHeadNod:
            case VRMAnimationNames.WeightShift:
                vrmExpressionControl?.setTiredExpression(vrm);
                break;
            default:
                vrmExpressionControl?.resetExpressions(vrm);
                break;
        }
    }
}

export default AiAgent;
