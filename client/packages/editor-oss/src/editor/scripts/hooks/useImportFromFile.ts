import {useCallback} from "react";

import {useCreateScript} from "./scripts";
import {showToast} from "@stem/editor-oss/showToast";
import {importImportFile} from "../../assets/v2/AssetsLibrary/exportImportUtils";


const readFileText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
    });

const stripExtension = (filename: string): string => filename.replace(/\.[^.]+$/, "");

const isYamlFile = (filename: string): boolean => /\.ya?ml$/i.test(filename);
const isJsFile = (filename: string): boolean => /\.(m?js|cjs)$/i.test(filename);

type CreatedImport = {id: string; headRevisionId: string; name: string};

/**
 * Reads a .js, .mjs, .cjs, .yaml, or .yml file the user picked and creates a
 * new Import asset for the active scene. .js becomes a raw-code import named
 * after the filename; .yaml is parsed via the StemStudio export shape.
 */
export const useImportFromFile = () => {
    const createImport = useCreateScript();

    return useCallback(
        async (file: File, sceneId?: string): Promise<CreatedImport | null> => {
            try {
                if (isYamlFile(file.name)) {
                    const {config, code} = await importImportFile(file);
                    const asset = await createImport({sceneId, name: config.name, code});
                    showToast({type: "success", title: `Imported ${config.name}`});
                    return {id: asset.id, headRevisionId: asset.headRevisionId, name: config.name};
                }
                if (isJsFile(file.name)) {
                    const code = await readFileText(file);
                    const name = stripExtension(file.name).trim() || "import";
                    const asset = await createImport({sceneId, name, code});
                    showToast({type: "success", title: `Imported ${name}`});
                    return {id: asset.id, headRevisionId: asset.headRevisionId, name};
                }
                showToast({type: "error", title: `Unsupported file: ${file.name}`});
                return null;
            } catch (err) {
                console.error("Import from file failed:", err);
                const message = err instanceof Error ? err.message : "Failed to import file";
                showToast({type: "error", title: message});
                return null;
            }
        },
        [createImport],
    );
};
