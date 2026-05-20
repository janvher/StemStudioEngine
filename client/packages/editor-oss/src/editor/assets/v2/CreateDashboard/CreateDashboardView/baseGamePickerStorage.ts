const PICKER_PROMPT_KEY = "base_game_picker_prompt";
const PICKER_PROMPT_AUTOSTART_KEY = "base_game_picker_prompt_autostart";

export const savePickerPrompt = (prompt: string, options?: {autoStart?: boolean}) => {
    try {
        localStorage.setItem(PICKER_PROMPT_KEY, prompt.trim());
        if (options?.autoStart) {
            localStorage.setItem(PICKER_PROMPT_AUTOSTART_KEY, "true");
        } else {
            localStorage.removeItem(PICKER_PROMPT_AUTOSTART_KEY);
        }
    } catch {
        // storage full or unavailable
    }
};

export const readPickerPrompt = (): string | null => {
    try {
        return localStorage.getItem(PICKER_PROMPT_KEY) || null;
    } catch {
        return null;
    }
};

export const clearPickerPrompt = () => {
    try {
        localStorage.removeItem(PICKER_PROMPT_KEY);
        localStorage.removeItem(PICKER_PROMPT_AUTOSTART_KEY);
    } catch {
        // ignore
    }
};

export const readPickerPromptAutoStart = (): boolean => {
    try {
        return localStorage.getItem(PICKER_PROMPT_AUTOSTART_KEY) === "true";
    } catch {
        return false;
    }
};
