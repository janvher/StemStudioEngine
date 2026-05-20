// OSS override written by scripts/export-oss.ts. Billing flows
// (CreditsSummary, CreditsPurchaseModal, AdminPanel/Products) are
// already gated at runtime by isStripeCreditsPurchasingEnabled() and
// admin/dashboard visibility checks, so none of the functions below
// are reachable in OSS. Replacing the module with this stub lets Vite
// tree-shake the Stripe-coupled Ajax calls and the StemStudio billing
// API surface out of OSS bundles entirely.

export interface StripeProduct {
    productId: string;
    name: string;
    subtitle: string;
    imageUrl?: string;
    credits: number;
    priceOneTime: number;
    priceRecurring: number;
    priceYearly: number;
    monthlyDiscountPercent: number;
    features: string[];
}

export type CheckoutMode = "one_time" | "subscription_monthly" | "subscription_yearly";

export interface SubscriptionStatus {
    hasSubscription: boolean;
    productId?: string;
    credits?: number;
}

export interface AdminStripeProduct extends StripeProduct {
    stripePriceOneTime: string;
    stripePriceRecurring: string;
    stripePriceYearly: string;
    active: boolean;
    sortOrder: number;
}

export interface MigrateProductRequest {
    productId: string;
    name: string;
    subtitle: string;
    credits: number;
    priceOneTime: number;
    priceRecurring: number;
    priceYearly: number;
    monthlyDiscountPercent: number;
    features: string[];
    stripePriceOneTime: string;
    stripePriceRecurring: string;
    stripePriceYearly: string;
    migrateAll: boolean;
}

export type DeleteProductStrategy = "grandfather" | "discontinue_refund_prorated";

const unreachable = (name: string): never => {
    throw new Error(`${name} is not available in OSS builds`);
};

// Function signatures accept arbitrary args so editor-side call sites that
// pass real arguments still typecheck. Return shapes match the real module's
// signatures verbatim so consumers reading properties on the result also
// typecheck. None of these execute in OSS — runtime IS_OSS gates short-
// circuit before reaching them.
/* eslint-disable @typescript-eslint/no-explicit-any */

export const getAdminProducts = async (..._args: any[]): Promise<AdminStripeProduct[]> => [];
export const updateAdminProduct = async (..._args: any[]): Promise<AdminStripeProduct> =>
    unreachable("updateAdminProduct");
export const migrateProduct = async (..._args: any[]): Promise<{notifiedCount?: number; newProductId?: string}> =>
    unreachable("migrateProduct");
export const bulkGrantCredits = async (..._args: any[]): Promise<void> => unreachable("bulkGrantCredits");
export const getStripeProducts = async (..._args: any[]): Promise<StripeProduct[]> => [];
export const createCheckoutSession = async (..._args: any[]): Promise<string> =>
    unreachable("createCheckoutSession");
export const getSubscriptionStatus = async (..._args: any[]): Promise<SubscriptionStatus> => ({
    hasSubscription: false,
});
export const openBillingPortal = async (..._args: any[]): Promise<string> => unreachable("openBillingPortal");
export const getStripeMockMode = async (..._args: any[]): Promise<boolean> => false;
export const setStripeMockMode = async (..._args: any[]): Promise<void> => unreachable("setStripeMockMode");
export const createAdminProduct = async (..._args: any[]): Promise<AdminStripeProduct> =>
    unreachable("createAdminProduct");
export const deleteAdminProduct = async (..._args: any[]): Promise<void> => unreachable("deleteAdminProduct");
