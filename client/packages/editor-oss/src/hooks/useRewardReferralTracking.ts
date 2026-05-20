import {useEffect} from "react";

import {REWARD_QUERY_PARAM, trackRewardReferralClick} from "@stem/network/api/rewards";

const getSessionId = () => {
    const storageKey = "reward.session.id";
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return existing;

    const next = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(storageKey, next);
    return next;
};

export const useRewardReferralTracking = (sceneId?: string) => {
    const {pathname, search} = window.location;

    useEffect(() => {
        const params = new URLSearchParams(search);
        const shareCode = params.get(REWARD_QUERY_PARAM);
        if (!shareCode) return;

        const dedupeKey = `reward.click.${shareCode}`;
        if (window.sessionStorage.getItem(dedupeKey)) return;

        window.sessionStorage.setItem(dedupeKey, "1");

        void trackRewardReferralClick({
            sceneId,
            shareCode,
            sessionId: getSessionId(),
            metadata: {
                pathname,
                search,
            },
        }).catch((error) => {
            console.warn("Reward referral tracking failed:", error);
            window.sessionStorage.removeItem(dedupeKey);
        });
    }, [pathname, sceneId, search]);
};
