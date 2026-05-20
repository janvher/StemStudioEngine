import {PCFSoftShadowMap} from "three";
import {describe, expect, it, vi} from "vitest";

import {CommandsExecutor} from "./CommandsExecutor";

describe("CommandsExecutor parameter normalization", () => {
    it("normalizes gradient objects before validating scene background params", async () => {
        const handler = vi.fn(async params => ({
            status: "success",
            data: params,
        }));
        const executor = new CommandsExecutor({
            getCommand: vi.fn(() => ({
                name: "set_scene_background",
                description: "",
                parameters: [
                    {name: "type", type: "string", required: true},
                    {name: "gradient", type: "string", required: false},
                ],
                handler,
            })),
        } as any);

        const result = await executor.executeCommand("set_scene_background", {
            type: "Gradient",
            gradient: {topColor: "#87CEEB", bottomColor: "#dfefff"},
        });

        expect(result.success).toBe(true);
        expect(handler).toHaveBeenCalledWith({
            type: "Gradient",
            gradient: "linear-gradient(180deg, #87CEEB 0%, #dfefff 100%)",
        });
    });

    it("normalizes shadow map labels before validating rendering params", async () => {
        const handler = vi.fn(async params => ({
            status: "success",
            data: params,
        }));
        const executor = new CommandsExecutor({
            getCommand: vi.fn(() => ({
                name: "set_rendering_settings",
                description: "",
                parameters: [{name: "shadowMapType", type: "number", required: false}],
                handler,
            })),
        } as any);

        const result = await executor.executeCommand("set_rendering_settings", {
            shadowMapType: "PCFSoftShadowMap",
        });

        expect(result.success).toBe(true);
        expect(handler).toHaveBeenCalledWith({
            shadowMapType: PCFSoftShadowMap,
        });
    });

    it("normalizes scene compartment boolean aliases before validating params", async () => {
        const handler = vi.fn(async params => ({
            status: "success",
            data: params,
        }));
        const executor = new CommandsExecutor({
            getCommand: vi.fn(() => ({
                name: "set_scene_compartments",
                description: "",
                parameters: [{name: "enabled", type: "boolean", required: true}],
                handler,
            })),
        } as any);

        const result = await executor.executeCommand("set_scene_compartments", {
            enabled: "on",
        });

        expect(result.success).toBe(true);
        expect(handler).toHaveBeenCalledWith({
            enabled: true,
        });
    });
});
