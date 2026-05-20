import {describe, it, expect, vi, beforeEach} from "vitest";

import type {LambdaConstructor} from "../Lambda";
import {LambdaBase} from "../LambdaBase";
import LambdaTypeRegistry from "../LambdaTypeRegistry";

class TestLambdaA extends LambdaBase {}
class TestLambdaB extends LambdaBase {}

describe("LambdaTypeRegistry", () => {
    let registry: LambdaTypeRegistry;

    beforeEach(() => {
        registry = new LambdaTypeRegistry();
    });

    describe("registerType", () => {
        it("should store constructor by id", () => {
            registry.registerType("lambda-a", TestLambdaA);

            expect(registry.getType("lambda-a")).toBe(TestLambdaA);
        });

        it("should reject duplicate registration", () => {
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            registry.registerType("lambda-a", TestLambdaA);
            registry.registerType("lambda-a", TestLambdaB);

            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining("already registered"),
            );
            // Original should be preserved
            expect(registry.getType("lambda-a")).toBe(TestLambdaA);
            errorSpy.mockRestore();
        });
    });

    describe("getType", () => {
        it("should return constructor for registered type", () => {
            registry.registerType("lambda-a", TestLambdaA);
            expect(registry.getType("lambda-a")).toBe(TestLambdaA);
        });

        it("should return null for unregistered type", () => {
            expect(registry.getType("unknown")).toBeNull();
        });
    });

    describe("unregisterType", () => {
        it("should remove registered type", () => {
            registry.registerType("lambda-a", TestLambdaA);
            registry.unregisterType("lambda-a");

            expect(registry.getType("lambda-a")).toBeNull();
        });

        it("should log error for unregistered type", () => {
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            registry.unregisterType("unknown");

            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining("not registered"),
            );
            errorSpy.mockRestore();
        });
    });

    describe("getAllTypes", () => {
        it("should return all registered constructors", () => {
            registry.registerType("lambda-a", TestLambdaA);
            registry.registerType("lambda-b", TestLambdaB);

            const types = registry.getAllTypes();
            expect(types).toHaveLength(2);
            expect(types).toContain(TestLambdaA);
            expect(types).toContain(TestLambdaB);
        });

        it("should return empty array when empty", () => {
            expect(registry.getAllTypes()).toHaveLength(0);
        });
    });

    describe("clear", () => {
        it("should remove all registered types", () => {
            registry.registerType("lambda-a", TestLambdaA);
            registry.registerType("lambda-b", TestLambdaB);

            registry.clear();

            expect(registry.getAllTypes()).toHaveLength(0);
            expect(registry.getType("lambda-a")).toBeNull();
            expect(registry.getType("lambda-b")).toBeNull();
        });
    });
});
