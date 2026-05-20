export interface ContactFormData {
    name: string;
    email: string;
    reason: string;
    platform: string;
    description: string;
    file: File | null;
    recaptchaToken?: string;
}

export const REASON_OPTIONS = [
    "Bug Report",
    "Feature Request",
    "Account Issue",
    "General Inquiry",
] as const;

export const PLATFORM_OPTIONS = [
    "Web",
    "Discord",
    "iOS",
    "Android",
    "CrazyGames",
    "YouTube",
    "Telegram",
] as const;

export type Reason = typeof REASON_OPTIONS[number];
export type Platform = typeof PLATFORM_OPTIONS[number];
