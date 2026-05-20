import React, {useEffect, useRef, useState} from "react";
import {useOnClickOutside} from "usehooks-ts";


import {
    ActionButton,
    Backdrop,
    BillingToggle,
    CardBottom,
    CardTop,
    CloseButton,
    ErrorText,
    FeatureItem,
    FeatureList,
    FeaturesTitle,
    FooterNotice,
    ModalContainer,
    ModalHeader,
    PriceAmount,
    PriceLabel,
    PriceRow,
    ProductCard,
    ProductImage,
    ProductName,
    ProductSubtitle,
    ProductsGrid,
    StrikePrice,
    ToggleOption,
} from "./CreditsPurchaseModal.style";
import {
    CheckoutMode,
    createCheckoutSession,
    getStripeMockMode,
    getStripeProducts,
    StripeProduct,
} from "@stem/network/api/stripe";
import i18n from "@stem/editor-oss/i18n/config";
import {showToast} from "@stem/editor-oss/showToast";
import {useEscapeDismiss} from "../common/hooks/useEscapeDismiss";

interface CreditsPurchaseModalProps {
    onClose: () => void;
    hasSubscription?: boolean;
}

type BillingCycle = "one_time" | "monthly" | "yearly";

const cycleToCheckoutMode = (cycle: BillingCycle): CheckoutMode => {
    if (cycle === "one_time") return "one_time";
    if (cycle === "yearly") return "subscription_yearly";
    return "subscription_monthly";
};

const cycleLabel = (cycle: BillingCycle) => {
    if (cycle === "monthly") return "USD / month";
    if (cycle === "yearly") return "USD / year";
    return "USD one-time";
};

const fallbackImage = "https://dummyimage.com/42x42/2d2d2d/999999&text=+";

export const CreditsPurchaseModal = ({onClose, hasSubscription = false}: CreditsPurchaseModalProps) => {
    const [billing, setBilling] = useState<BillingCycle>(hasSubscription ? "one_time" : "monthly");
    const [error, setError] = useState<string | null>(null);
    const [purchasingId, setPurchasingId] = useState<string | null>(null);
    const [products, setProducts] = useState<StripeProduct[]>([]);
    const [mockMode, setMockMode] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const ref = useRef<HTMLDivElement>(null);

    useOnClickOutside(ref as React.RefObject<HTMLElement>, onClose);
    useEscapeDismiss({onEscape: onClose});

    useEffect(() => {
        const load = async () => {
            try {
                const [fetchedProducts, fetchedMockMode] = await Promise.all([
                    getStripeProducts(),
                    getStripeMockMode().catch(() => false),
                ]);
                setProducts(fetchedProducts);
                setMockMode(fetchedMockMode);
            } catch {
                setError(i18n.t("Failed to load products"));
            } finally {
                setLoadingProducts(false);
            }
        };
        load();
    }, []);

    const handlePurchase = async (productId: string) => {
        setPurchasingId(productId);
        setError(null);
        try {
            const url = await createCheckoutSession(productId, cycleToCheckoutMode(billing));
            if (mockMode) {
                showToast({type: "success", title: i18n.t("Credits granted (mock mode)")});
                onClose();
            } else {
                window.location.href = url;
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setPurchasingId(null);
        }
    };

    const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`;

    const getPriceForCycle = (product: StripeProduct, cycle: BillingCycle) => {
        if (cycle === "monthly") return product.priceRecurring || product.priceOneTime;
        if (cycle === "yearly") return product.priceYearly || product.priceRecurring * 12 || product.priceOneTime;
        return product.priceOneTime;
    };

    const getYearlyDiscountPercent = (product: StripeProduct) => {
        if (product.priceRecurring <= 0 || product.priceYearly <= 0) return 0;
        const baseline = product.priceRecurring * 12;
        if (product.priceYearly >= baseline) return 0;
        return Math.round(((baseline - product.priceYearly) / baseline) * 100);
    };

    return (
        <Backdrop>
            <ModalContainer ref={ref}>
                <ModalHeader>
                    <h2>{i18n.t("Plans that grow with you")}</h2>
                    <CloseButton onClick={onClose}>&times;</CloseButton>
                </ModalHeader>

                <BillingToggle>
                    <ToggleOption $active={billing === "one_time"} onClick={() => setBilling("one_time")}>One-time</ToggleOption>
                    <ToggleOption $active={billing === "monthly"} onClick={() => setBilling("monthly")}>Monthly</ToggleOption>
                    <ToggleOption $active={billing === "yearly"} onClick={() => setBilling("yearly")}>Yearly</ToggleOption>
                </BillingToggle>

                {error && <ErrorText>{error}</ErrorText>}

                {loadingProducts ? (
                    <div style={{textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.5)"}}>
                        {i18n.t("Loading products...")}
                    </div>
                ) : (
                    <ProductsGrid>
                        {products.map(product => {
                            const amount = getPriceForCycle(product, billing);
                            const yearlyDiscount = getYearlyDiscountPercent(product);
                            const showYearlyStrike = billing === "yearly" && product.priceRecurring > 0 && product.priceYearly > 0;

                            return (
                                <ProductCard key={product.productId}>
                                    <CardTop>
                                        <ProductImage src={product.imageUrl || fallbackImage} alt={product.name} />
                                        <div>
                                            <ProductName>{product.name}</ProductName>
                                            {product.subtitle && <ProductSubtitle>{product.subtitle}</ProductSubtitle>}
                                        </div>

                                        <PriceRow>
                                            <PriceAmount>
                                                {showYearlyStrike && (
                                                    <StrikePrice>{formatPrice(product.priceRecurring * 12)}</StrikePrice>
                                                )}
                                                {formatPrice(amount)}
                                            </PriceAmount>
                                            <PriceLabel>
                                                {cycleLabel(billing)}
                                                {billing === "yearly" && yearlyDiscount > 0 && ` · Save ${yearlyDiscount}%`}
                                            </PriceLabel>
                                        </PriceRow>

                                        <ActionButton
                                            disabled={purchasingId !== null}
                                            onClick={() => handlePurchase(product.productId)}
                                        >
                                            {purchasingId === product.productId
                                                ? i18n.t("Redirecting...")
                                                : billing === "one_time"
                                                  ? i18n.t("Buy now")
                                                  : billing === "yearly"
                                                    ? i18n.t("Subscribe yearly")
                                                    : i18n.t("Subscribe monthly")}
                                        </ActionButton>
                                    </CardTop>

                                    {product.features.length > 0 && (
                                        <CardBottom>
                                            <FeaturesTitle>{i18n.t("Includes:")}</FeaturesTitle>
                                            <FeatureList>
                                                {product.features.slice(0, 8).map(f => (
                                                    <FeatureItem key={f}>{f}</FeatureItem>
                                                ))}
                                            </FeatureList>
                                        </CardBottom>
                                    )}
                                </ProductCard>
                            );
                        })}
                    </ProductsGrid>
                )}

                <FooterNotice>
                    {mockMode
                        ? i18n.t("Mock mode is enabled. Purchases are simulated.")
                        : i18n.t("Usage limits apply. Prices shown don't include applicable tax.")}
                </FooterNotice>
            </ModalContainer>
        </Backdrop>
    );
};
