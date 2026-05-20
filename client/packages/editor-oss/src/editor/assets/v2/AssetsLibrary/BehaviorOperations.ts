import {getBehaviorsList, bulkImport} from "@stem/network/api/behavior";
import {showToast} from "@stem/editor-oss/showToast";

const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), {
        href: url,
        download: filename,
    }).click();
    URL.revokeObjectURL(url);
};

const readJsonFile = async (file: File): Promise<unknown> => {
    const text = await file.text();
    return JSON.parse(text);
};

export const handleExportBehaviors = async () => {
    try {
        const behaviors = await getBehaviorsList();
        const exportData = behaviors.map(({ID, Config, Code}) => ({
            ID,
            Config,
            Code,
        }));

        downloadJson(exportData, "behaviors.json");
        showToast({type: "success", title: "Behaviors exported successfully"});
    } catch (error) {
        console.error("Export behaviors error:", error);
        showToast({type: "error", title: "Failed to export behaviors"});
    }
};

export const handleImportBehaviors = async (getAllScriptBehaviors?: () => Promise<void>) => {
    try {
        const [file] = await showFilePickerAndGetFiles();
        if (!file) return;

        const behaviorsToImport = await readJsonFile(file);
        if (!Array.isArray(behaviorsToImport)) {
            throw new Error("Invalid file format. Expected an array of behaviors.");
        }

        const preparedBehaviors = behaviorsToImport.map(({ID, Config, Code}) => {
            if (!ID || !Config || !Code) {
                throw new Error("Invalid behavior format. Missing required fields.");
            }
            return {
                ID,
                Code,
                Config: typeof Config === "string" ? Config : JSON.stringify(Config),
            };
        });

        const {imported, skipped} = await bulkImport(preparedBehaviors);

        if (imported > 0) {
            showToast({
                type: "success",
                title: `Successfully imported ${imported} behaviors`,
                body: skipped > 0 ? `${skipped} duplicates were skipped` : undefined,
            });
        } else if (skipped > 0) {
            showToast({
                type: "warning",
                title: "No new behaviors imported",
                body: `All ${skipped} behaviors already exist`,
            });
        }

        await getAllScriptBehaviors?.();
    } catch (error) {
        console.error("Import behaviors error:", error);
        showToast({
            type: "error",
            title: "Failed to import behaviors",
            body: error instanceof Error ? error.message : "Please try again later",
        });
    }
};

const showFilePickerAndGetFiles = (): Promise<File[]> =>
    new Promise(resolve => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e: Event) => {
            const files = (e.target as HTMLInputElement).files;
            resolve(files ? Array.from(files) : []);
        };
        input.click();
    });
