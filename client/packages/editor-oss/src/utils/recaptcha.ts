import Ajax from "./Ajax";
import {backendUrlFromPath} from "./UrlUtils";

const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
const SCRIPT_ID = "recaptcha-v3-script";

declare global {
    interface Window {
        grecaptcha?: {
            ready: (cb: () => void) => void;
            execute: (siteKey: string, options: {action: string}) => Promise<string>;
        };
    }
}

const loadRecaptchaScript = async (): Promise<void> => {
    if (!RECAPTCHA_SITE_KEY) return;
    if (window.grecaptcha) return;

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
        await new Promise<void>(resolve => {
            if (window.grecaptcha) {
                resolve();
                return;
            }
            existingScript.addEventListener("load", () => resolve(), {once: true});
            existingScript.addEventListener("error", () => resolve(), {once: true});
        });
        return;
    }

    await new Promise<void>(resolve => {
        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
        script.async = true;
        script.addEventListener("load", () => resolve(), {once: true});
        script.addEventListener("error", () => resolve(), {once: true});
        document.head.appendChild(script);
    });
};

export const executeRecaptcha = async (action: string): Promise<string | undefined> => {
    if (!RECAPTCHA_SITE_KEY) return undefined;

    await loadRecaptchaScript();
    if (!window.grecaptcha) return undefined;

    return new Promise(resolve => {
        window.grecaptcha?.ready(async () => {
            try {
                resolve(await window.grecaptcha!.execute(RECAPTCHA_SITE_KEY, {action}));
            } catch {
                resolve(undefined);
            }
        });
    });
};

export const verifyRecaptcha = async (action: string): Promise<void> => {
    if (!RECAPTCHA_SITE_KEY) return;

    const token = await executeRecaptcha(action);
    const response = await Ajax.post({
        url: backendUrlFromPath("/api/Auth/VerifyRecaptcha"),
        needAuthorization: false,
        msgBodyType: "json",
        data: JSON.stringify({token, action}),
    });

    if (response?.data?.Code !== 200) {
        throw new Error(response?.data?.Msg || "Bot verification failed. Please try again.");
    }
};
