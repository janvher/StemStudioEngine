import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockMonacoApi = {
    editor: {
        create: ReturnType<typeof vi.fn>;
        getModel: ReturnType<typeof vi.fn>;
        createModel: ReturnType<typeof vi.fn>;
        defineTheme: ReturnType<typeof vi.fn>;
        onDidChangeMarkers: ReturnType<typeof vi.fn>;
        getModelMarkers: ReturnType<typeof vi.fn>;
        setModelMarkers: ReturnType<typeof vi.fn>;
    };
    languages: {
        typescript: {
            javascriptDefaults: {
                setDiagnosticsOptions: ReturnType<typeof vi.fn>;
                setCompilerOptions: ReturnType<typeof vi.fn>;
                addExtraLib: ReturnType<typeof vi.fn>;
            };
            typescriptDefaults: {
                setDiagnosticsOptions: ReturnType<typeof vi.fn>;
                setCompilerOptions: ReturnType<typeof vi.fn>;
                addExtraLib: ReturnType<typeof vi.fn>;
            };
            ScriptTarget: {
                ES2015: number;
            };
        };
    };
    Uri: {
        parse: (value: string) => string;
    };
};

describe("useModernMonaco", () => {
    let initMock: ReturnType<typeof vi.fn>;
    let createMock: ReturnType<typeof vi.fn>;
    let monacoApi: MockMonacoApi;

    beforeEach(() => {
        vi.resetModules();
        localStorage.clear();

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                type: "dark",
                tokenColors: [],
                colors: {},
            }),
        });

        createMock = vi.fn(() => ({
            dispose: vi.fn(),
        }));

        monacoApi = {
            editor: {
                create: createMock,
                getModel: vi.fn(() => null),
                createModel: vi.fn(),
                defineTheme: vi.fn(),
                onDidChangeMarkers: vi.fn(),
                getModelMarkers: vi.fn(() => []),
                setModelMarkers: vi.fn(),
            },
            languages: {
                typescript: {
                    javascriptDefaults: {
                        setDiagnosticsOptions: vi.fn(),
                        setCompilerOptions: vi.fn(),
                        addExtraLib: vi.fn(),
                    },
                    typescriptDefaults: {
                        setDiagnosticsOptions: vi.fn(),
                        setCompilerOptions: vi.fn(),
                        addExtraLib: vi.fn(),
                    },
                    ScriptTarget: {
                        ES2015: 2,
                    },
                },
            },
            Uri: {
                parse: (value: string) => value,
            },
        };

        initMock = vi.fn(async () => monacoApi);

        vi.doMock("modern-monaco", () => ({
            init: initMock,
        }));

        vi.doMock("./prettierFormatter", () => ({
            registerPrettierFormatter: vi.fn(),
        }));

        vi.doMock("../typeDefinitions", () => ({
            getBehaviorTypeDefinitions: vi.fn(() => "declare const behavior: string;"),
        }));

        vi.doMock("../validation", () => ({
            noSelfAssign: vi.fn(),
        }));
    });

    it("deduplicates concurrent initialize calls for the same container", async () => {
        const { useModernMonaco } = await import("./useModernMonaco");
        const container = document.createElement("div");
        const { result } = renderHook(() => useModernMonaco());

        await act(async () => {
            await Promise.all([
                result.current.initialize(container),
                result.current.initialize(container),
            ]);
        });

        expect(initMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenCalledTimes(1);
    });

    it("clears stale Monaco context markers before creating a new editor", async () => {
        const { useModernMonaco } = await import("./useModernMonaco");
        const container = document.createElement("div");
        container.setAttribute("data-keybinding-context", "17");

        const staleEditor = document.createElement("div");
        staleEditor.className = "monaco-editor";
        container.appendChild(staleEditor);

        createMock.mockImplementation((node: HTMLElement) => {
            expect(node.hasAttribute("data-keybinding-context")).toBe(false);
            expect(node.querySelector(".monaco-editor")).toBeNull();
            return { dispose: vi.fn() };
        });

        const { result } = renderHook(() => useModernMonaco());

        await act(async () => {
            await result.current.initialize(container);
        });

        expect(createMock).toHaveBeenCalledTimes(1);
        expect(container.hasAttribute("data-keybinding-context")).toBe(false);
        expect(container.childElementCount).toBe(0);
    });
});
