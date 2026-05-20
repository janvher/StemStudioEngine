import {describe, expect, it, vi} from "vitest";

import {executeBuiltin} from "./builtins";

describe("script tool builtins", () => {
    it("delegates export scene through the provided callback", async () => {
        const triggerExport = vi.fn().mockResolvedValue({
            output: "Exported scene bundle with 12 files.",
            status: "success" as const,
        });

        const result = await executeBuiltin(
            "export",
            {target: "scene", name: "test-export"},
            {
                commandBuffer: [],
                clearOutput: () => {},
                triggerExport,
            },
        );

        expect(triggerExport).toHaveBeenCalledWith("scene", "test-export", "export");
        expect(result.status).toBe("success");
        expect(result.output).toContain("Exported scene bundle");
    });

    it("delegates dump scene through the provided callback with dump mode", async () => {
        const triggerExport = vi.fn().mockResolvedValue({
            output: "Dumped scene bundle with 12 files.",
            status: "success" as const,
        });

        const result = await executeBuiltin(
            "dump",
            {target: "scene", name: "test-dump"},
            {
                commandBuffer: [],
                clearOutput: () => {},
                triggerExport,
            },
        );

        expect(triggerExport).toHaveBeenCalledWith("scene", "test-dump", "dump");
        expect(result.status).toBe("success");
    });

    it("rejects check outside admin mode", async () => {
        const runCheck = vi.fn();

        const result = await executeBuiltin(
            "check",
            {},
            {
                isAdmin: false,
                commandBuffer: [],
                clearOutput: () => {},
                runCheck,
            },
        );

        expect(result.status).toBe("error");
        expect(result.output).toContain("admin mode");
        expect(runCheck).not.toHaveBeenCalled();
    });

    it("runs check against the last executed script for admins", async () => {
        const runCheck = vi.fn().mockResolvedValue({
            output: "Checked",
            status: "success" as const,
            format: "markdown" as const,
        });

        const result = await executeBuiltin(
            "check",
            {},
            {
                isAdmin: true,
                commandBuffer: [],
                clearOutput: () => {},
                getLastScript: () => ({content: 'add box name="Box"'}),
                runCheck,
            },
        );

        expect(runCheck).toHaveBeenCalledWith('add box name="Box"', undefined);
        expect(result.status).toBe("success");
    });

    it("runs check against command history with check buffer", async () => {
        const runCheck = vi.fn().mockResolvedValue({
            output: "Checked",
            status: "success" as const,
        });

        await executeBuiltin(
            "check",
            {mode: "buffer"},
            {
                isAdmin: true,
                commandBuffer: ['add box name="Box"', "check buffer"],
                clearOutput: () => {},
                runCheck,
            },
        );

        expect(runCheck).toHaveBeenCalledWith('add box name="Box"', "command history");
    });

    it("runs check exec by executing a picked script before validating it", async () => {
        const runScript = vi.fn().mockResolvedValue(undefined);
        const runCheck = vi.fn().mockResolvedValue({
            output: "Checked",
            status: "success" as const,
        });

        const result = await executeBuiltin(
            "check",
            {mode: "exec"},
            {
                isAdmin: true,
                commandBuffer: [],
                clearOutput: () => {},
                runScript,
                runCheck,
                pickScriptForExecution: async () => ({
                    content: "camera DefaultCamera near=0.01",
                    label: "camera.stemscript",
                    folderFiles: [new File(["asset"], "asset.txt")],
                }),
            },
        );

        expect(runScript).toHaveBeenCalledWith("camera DefaultCamera near=0.01", [expect.any(File)]);
        expect(runCheck).toHaveBeenCalledWith("camera DefaultCamera near=0.01", "camera.stemscript");
        expect(runScript.mock.invocationCallOrder[0]).toBeLessThan(runCheck.mock.invocationCallOrder[0]!);
        expect(result.status).toBe("success");
    });

    it("rejects test outside admin mode", async () => {
        const runScript = vi.fn();
        const runCheck = vi.fn();

        const result = await executeBuiltin(
            "test",
            {},
            {
                isAdmin: false,
                commandBuffer: [],
                clearOutput: () => {},
                runScript,
                runCheck,
            },
        );

        expect(result.status).toBe("error");
        expect(result.output).toContain("admin mode");
        expect(runScript).not.toHaveBeenCalled();
        expect(runCheck).not.toHaveBeenCalled();
    });

    it("runs test by executing a picked script and validating it", async () => {
        const runScript = vi.fn().mockResolvedValue(undefined);
        const runCheck = vi.fn().mockResolvedValue({
            output: "Checked",
            status: "success" as const,
            format: "markdown" as const,
        });

        const result = await executeBuiltin(
            "test",
            {},
            {
                isAdmin: true,
                commandBuffer: [],
                clearOutput: () => {},
                runScript,
                runCheck,
                pickScriptForExecution: async () => ({
                    content: 'add box name="Box"',
                    label: "fixture.stemscript",
                }),
            },
        );

        expect(runScript).toHaveBeenCalledWith('add box name="Box"', undefined);
        expect(runCheck).toHaveBeenCalledWith('add box name="Box"', "fixture.stemscript");
        expect(runScript.mock.invocationCallOrder[0]).toBeLessThan(runCheck.mock.invocationCallOrder[0]!);
        expect(result.status).toBe("success");
    });
});
