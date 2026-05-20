import i18n from "i18next";
import {initReactI18next} from "react-i18next";

import {translationAdditions} from "./additions";
import translationsEnglish from "./locales/en/translations.json";
import translationsFrench from "./locales/fr-FR/translations.json";
import translationsJapanese from "./locales/ja-JP/translations.json";
import translationsKorean from "./locales/ko-KR/translations.json";
import translationsRussian from "./locales/ru-RU/translations.json";
import translationsChinese from "./locales/zh-CN/translations.json";
import translationsChineseTW from "./locales/zh-TW/translations.json";

const LANGUAGE_STORAGE_KEY = "stemstudio.language";
const supportedLanguages = ["en", "fr-FR", "ja-JP", "ko-KR", "ru-RU", "zh-CN", "zh-TW"] as const;

/**
 *
 * @param candidate
 */
function resolveLanguage(candidate?: string | null) {
    if (!candidate) return "en";
    if (supportedLanguages.includes(candidate as typeof supportedLanguages[number])) {
        return candidate;
    }

    const lower = candidate.toLowerCase();
    if (lower.startsWith("fr")) return "fr-FR";
    if (lower.startsWith("ja")) return "ja-JP";
    if (lower.startsWith("ko")) return "ko-KR";
    if (lower.startsWith("ru")) return "ru-RU";
    if (lower.startsWith("zh-tw") || lower.startsWith("zh-hk")) return "zh-TW";
    if (lower.startsWith("zh")) return "zh-CN";
    return "en";
}

const initialLanguage = resolveLanguage(
    typeof window !== "undefined"
        ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || window.navigator.language
        : "en",
);

const i8NOptions = {
    fallbackLng: "en",
    lng: initialLanguage,
    interpolation: {
        escapeValue: false,
    },
    resources: {
        en: {
            translations: {...translationsEnglish, ...translationAdditions.en},
        },
        "fr-FR": {
            translations: {...translationsFrench, ...translationAdditions["fr-FR"]},
        },
        "ja-JP": {
            translations: {...translationsJapanese, ...translationAdditions["ja-JP"]},
        },
        "ko-KR": {
            translations: {...translationsKorean, ...translationAdditions["ko-KR"]},
        },
        "ru-RU": {
            translations: {...translationsRussian, ...translationAdditions["ru-RU"]},
        },
        "zh-CN": {
            translations: {...translationsChinese, ...translationAdditions["zh-CN"]},
        },
        "zh-TW": {
            translations: {...translationsChineseTW, ...translationAdditions["zh-TW"]},
        },
    },
    ns: ["translations"],
    defaultNS: "translations",
};

void i18n.use(initReactI18next).init(i8NOptions);

i18n.languages = Object.keys(i8NOptions.resources);
i18n.on("languageChanged", lng => {
    if (typeof window !== "undefined") {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    }
});

export default i18n;
