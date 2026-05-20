import {IS_OSS} from "../mode/buildMode";

// Hard-off in OSS builds: the Stripe billing surface is integrated-only,
// and the OSS export step replaces `@web/network/api/stripe` with a stub
// (see `OSS_OVERRIDES` in scripts/export-oss.ts). Gating here on `IS_OSS`
// ensures the CreditsSummary / CreditsBar / CreditsPurchaseModal UI never
// renders in an OSS deploy even if an operator sets the env flag by mistake.
export const isStripeCreditsPurchasingEnabled = (): boolean =>
    !IS_OSS && import.meta.env.REACT_APP_STRIPE_CREDITS_ENABLED === "true";

export const isScriptsEnabled = (): boolean =>
    import.meta.env.REACT_APP_SCRIPTS_ENABLED === "true";
