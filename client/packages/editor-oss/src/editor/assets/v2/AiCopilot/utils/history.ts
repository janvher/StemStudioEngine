import * as THREE from "three";

import {InteractiveResult} from "@stem/editor-oss/agent/types/ACPTypes";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";

export type Message = {
    id: string;
    type: "user" | "agent" | "thought" | "interactive";
    content: string;
    timestamp: number;
    attachedObjects?: THREE.Object3D[];
    interactiveResult?: InteractiveResult;
};

/**
 * Generate session title from the first user message text.
 * Returns first 50 characters of the prompt.
 * @param promptText
 */
export const generateTitle = (promptText: string): string => {
    const content = promptText.trim();
    if (content.length <= 50) {
        return content || "New Conversation";
    }
    return content.substring(0, 50) + "...";
};

/**
 * Resolve UUIDs to THREE.Object3D instances from the current scene.
 * @param uuids
 */
export const resolveObjectsByUuids = (uuids: string[]): THREE.Object3D[] => {
    const app = global.app as EngineRuntime;
    return uuids
        .map(uuid => app.editor?.objectByUuid(uuid))
        .filter((obj): obj is THREE.Object3D => obj !== null && obj !== undefined);
};

/**
 * Convert Message[] to the format expected by the pricing /estimate-cost endpoint.
 * Maps `type: "user"` → `role: "user"` and `type: "agent"` → `role: "assistant"`.
 * Thought and interactive messages are skipped.
 * Appends the new (unsent) prompt as the final user message.
 * @param messages
 * @param newPrompt
 */
export const convertMessagesToEstimateFormat = (
    messages: Message[],
    newPrompt: string,
): Array<{role: string; content: string}> => {
    const result: Array<{role: string; content: string}> = [];

    for (const msg of messages) {
        if (msg.type === "user") {
            result.push({role: "user", content: msg.content});
        } else if (msg.type === "agent") {
            result.push({role: "assistant", content: msg.content});
        }
        // Thought and interactive messages are not part of the LLM conversation.
    }

    result.push({role: "user", content: newPrompt});

    return result;
};
