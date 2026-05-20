import {renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

const hoisted = vi.hoisted(() => ({
    changeAssetRevision: vi.fn(),
    getLambdaRevisionData: vi.fn(),
    updateLambdaRegistries: vi.fn(),
    globalMock: {app: {editor: {}}},
}));

vi.mock("./useChangeAssetRevision", () => ({
    useChangeAssetRevision: () => hoisted.changeAssetRevision,
}));
vi.mock("@stem/network/api/lambda", () => ({
    getLambdaRevisionData: (...args: unknown[]) => hoisted.getLambdaRevisionData(...args),
}));
vi.mock("../../lambdas/util", () => ({
    updateLambdaRegistries: (...args: unknown[]) => hoisted.updateLambdaRegistries(...args),
}));
vi.mock("../../../global", () => ({
    default: hoisted.globalMock,
}));

import {useChangeLambdaRevision} from "./useChangeLambdaRevision";

describe("useChangeLambdaRevision", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hoisted.globalMock.app = {editor: {}};
        hoisted.getLambdaRevisionData.mockResolvedValue({code: "src", config: {id: "lam"}});
        hoisted.changeAssetRevision.mockImplementation(async (_id, _rev, updateInstances) => {
            await updateInstances?.();
        });
    });

    it("warns and returns when no editor is available", async () => {
        hoisted.globalMock.app = {editor: undefined as unknown as object};
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const {result} = renderHook(() => useChangeLambdaRevision());
        await result.current("lam-1", "rev-2");

        expect(warn).toHaveBeenCalledWith("[useChangeLambdaRevision] No editor available.");
        expect(hoisted.changeAssetRevision).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it("same-id revision change: fetches new config under same id, registers it, and runs orchestrator", async () => {
        hoisted.getLambdaRevisionData.mockResolvedValue({config: {id: "lam-1", name: "L"}});

        const {result} = renderHook(() => useChangeLambdaRevision());
        await result.current("lam-1", "rev-2");

        expect(hoisted.getLambdaRevisionData).toHaveBeenCalledWith("lam-1", "rev-2");
        expect(hoisted.updateLambdaRegistries).toHaveBeenCalledWith({
            lambdaId: "lam-1",
            config: {id: "lam-1", name: "L"},
            previousLambdaId: undefined,
        });
        expect(hoisted.changeAssetRevision).toHaveBeenCalledWith(
            "lam-1",
            "rev-2",
            expect.any(Function),
            undefined,
        );
    });

    it("id swap: fetches the fork's revision data and re-keys the registry from old → new", async () => {
        hoisted.getLambdaRevisionData.mockResolvedValue({config: {id: "fork-1", name: "L"}});

        const {result} = renderHook(() => useChangeLambdaRevision());
        await result.current("lam-1", "rev-fork", "fork-1");

        // Fetch from the fork's id, not the original.
        expect(hoisted.getLambdaRevisionData).toHaveBeenCalledWith("fork-1", "rev-fork");
        expect(hoisted.updateLambdaRegistries).toHaveBeenCalledWith({
            lambdaId: "fork-1",
            config: {id: "fork-1", name: "L"},
            previousLambdaId: "lam-1",
        });
        expect(hoisted.changeAssetRevision).toHaveBeenCalledWith(
            "lam-1",
            "rev-fork",
            expect.any(Function),
            "fork-1",
        );
    });
});
