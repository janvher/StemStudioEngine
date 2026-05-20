/**
 * Prettier-based formatting provider for Monaco editor.
 * Uses Google-style JavaScript formatting (based on google/gts) with 120 char line width.
 */

type MonacoType = any;
type DisposableType = { dispose?: () => void };

// Prettier options based on Google JavaScript Style Guide (gts)
// Reference: https://github.com/google/gts
const PRETTIER_OPTIONS = {
    printWidth: 120,
    tabWidth: 4,
    useTabs: false,
    semi: true,
    singleQuote: false,
    trailingComma: "all" as const,
    bracketSpacing: false,
    bracketSameLine: true,
    arrowParens: "avoid" as const,
    proseWrap: "always" as const,
};

let prettierPromise: Promise<{ format: typeof import("prettier/standalone").format }> | null = null;

/**
 *
 */
function loadPrettier() {
    if (!prettierPromise) {
        prettierPromise = (async () => {
            const [prettier, parserBabel, pluginEstree] = await Promise.all([
                import("prettier/standalone"),
                import("prettier/plugins/babel"),
                import("prettier/plugins/estree"),
            ]);
            return {
                format: (source: string, options: any) =>
                    prettier.format(source, {
                        ...options,
                        plugins: [parserBabel.default ?? parserBabel, pluginEstree.default ?? pluginEstree],
                    }),
            };
        })();
    }
    return prettierPromise;
}

/**
 * Register Prettier as the document formatting provider for JavaScript and JSON
 * in Monaco. Call once during Monaco initialization.
 * @param monaco
 */
export function registerPrettierFormatter(monaco: MonacoType): DisposableType[] {
    const disposables: DisposableType[] = [];

    const jsFormatter = monaco.languages.registerDocumentFormattingEditProvider("javascript", {
        async provideDocumentFormattingEdits(model: any) {
            const source = model.getValue();
            try {
                const prettier = await loadPrettier();
                const formatted = await prettier.format(source, {
                    ...PRETTIER_OPTIONS,
                    parser: "babel",
                });
                return [
                    {
                        range: model.getFullModelRange(),
                        text: formatted,
                    },
                ];
            } catch (err) {
                console.warn("[Prettier] Format failed, falling back to original:", err);
                return [];
            }
        },
    });
    disposables.push(jsFormatter);

    const tsFormatter = monaco.languages.registerDocumentFormattingEditProvider("typescript", {
        async provideDocumentFormattingEdits(model: any) {
            const source = model.getValue();
            try {
                const prettier = await loadPrettier();
                const formatted = await prettier.format(source, {
                    ...PRETTIER_OPTIONS,
                    parser: "babel-ts",
                });
                return [
                    {
                        range: model.getFullModelRange(),
                        text: formatted,
                    },
                ];
            } catch (err) {
                console.warn("[Prettier] Format failed, falling back to original:", err);
                return [];
            }
        },
    });
    disposables.push(tsFormatter);

    const jsonFormatter = monaco.languages.registerDocumentFormattingEditProvider("json", {
        async provideDocumentFormattingEdits(model: any) {
            const source = model.getValue();
            try {
                const prettier = await loadPrettier();
                const formatted = await prettier.format(source, {
                    ...PRETTIER_OPTIONS,
                    parser: "json",
                });
                return [
                    {
                        range: model.getFullModelRange(),
                        text: formatted,
                    },
                ];
            } catch (err) {
                console.warn("[Prettier] Format failed, falling back to original:", err);
                return [];
            }
        },
    });
    disposables.push(jsonFormatter);

    return disposables;
}
