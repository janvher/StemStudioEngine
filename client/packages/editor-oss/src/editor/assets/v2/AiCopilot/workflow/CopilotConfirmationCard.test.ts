import {describe, expect, it} from "vitest";

import type {CopilotValidationResult} from "../../CopilotWorkspace/copilotPreviewSession";
import {getValidationCapsules} from "./CopilotConfirmationCard";

const result = (
    id: string,
    status: CopilotValidationResult["status"],
    label: string,
    detail = "",
): CopilotValidationResult => ({
    id,
    status,
    label,
    detail,
});

describe("getValidationCapsules", () => {
    it("uses short labels and omits pending validation results", () => {
        const capsules = getValidationCapsules([
            result("main-camera", "pass", "Main camera exists", "Camera position is valid."),
            result("physics-init", "pending", "Physics initializes", "Restart playtest."),
            result("player-spawn", "warn", "Player can spawn", "No tagged Player was found."),
            result("custom-check", "fail", "Custom validation", "Something failed."),
        ]);

        expect(capsules).toEqual([
            {
                id: "main-camera",
                label: "Camera",
                status: "pass",
                title: "Main camera exists: Camera position is valid.",
            },
            {
                id: "player-spawn",
                label: "Player",
                status: "warn",
                title: "Player can spawn: No tagged Player was found.",
            },
            {
                id: "custom-check",
                label: "Custom validation",
                status: "fail",
                title: "Custom validation: Something failed.",
            },
        ]);
    });
});
