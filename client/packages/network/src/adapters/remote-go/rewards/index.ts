import {auth} from "@web-shared/firebase";
import global from "@web-shared/global";
import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

export const REWARD_QUERY_PARAM = "reward_ref";

export const REWARD_EVENT_TYPES = {
    GAME_CREATED: "game_created",
    GAME_SHARED: "game_shared",
    GAME_SHARE_CLICKED: "game_share_clicked",
    GAME_PLAYED: "game_played",
    GAME_REMIXED: "game_remixed",
    GAME_PUBLISHED: "game_published",
    GAME_UNPUBLISHED: "game_unpublished",
    GAME_LIKED: "game_liked",
    AI_IMAGE_GENERATED: "ai_image_generated",
    AI_MODEL_GENERATED: "ai_model_generated",
    AI_ASSISTANT_USED: "ai_assistant_used",
    CREDITS_PURCHASED: "credits_purchased",
    MULTIPLAYER_JOINED: "multiplayer_joined",
    MULTIPLAYER_HOSTED: "multiplayer_hosted",
    GAME_SPEND: "game_spend",
} as const;

export const REWARD_APP_EVENTS = {
    TRACK: "rewardTrack",
    TRACKED: "rewardTracked",
    TRACK_FAILED: "rewardTrackFailed",
} as const;

export type RewardEventType =
    | typeof REWARD_EVENT_TYPES[keyof typeof REWARD_EVENT_TYPES]
    | (string & {});

export type RewardRecipientRole = "creator" | "player";

export type RewardDefinition = {
    type: string;
    amount: number;
    recipientRole?: RewardRecipientRole;
    metadata?: Record<string, unknown>;
};

export type RewardRuleCondition = {
    minAmount?: number;
    maxAmount?: number;
    metadataEquals?: Record<string, string>;
    excludeSelfPlay?: boolean;
};

export type RewardRule = {
    id?: string;
    systemKey?: string;
    name: string;
    eventType: string;
    recipientRole?: RewardRecipientRole;
    active: boolean;
    conditions?: RewardRuleCondition;
    rewards: RewardDefinition[];
};

export type TrackRewardEventInput = {
    eventType: RewardEventType;
    sceneId?: string;
    actorUserId?: string;
    creatorUserId?: string;
    shareCode?: string;
    sourceEventId?: string;
    idempotencyKey?: string;
    amount?: number;
    currency?: string;
    metadata?: Record<string, unknown>;
};

const shouldSendAuth = () => !!auth?.currentUser;

export const trackRewardEvent = async (input: TrackRewardEventInput) => {
    const response = await Ajax.post({
        url: backendUrlFromPath("/api/Rewards/Track"),
        needAuthorization: shouldSendAuth(),
        msgBodyType: "json",
        data: input,
    });

    if (response?.data?.Code !== 200) {
        throw new Error(response?.data?.Msg || "Failed to track reward event");
    }

    return response.data.Data as {
        event: {id: string; shareCode?: string};
        grants: Array<{rewardType: string; amount: number; recipientUserId: string}>;
    };
};

export const emitRewardEvent = (input: TrackRewardEventInput) => {
    global.app?.call(REWARD_APP_EVENTS.TRACK, null, input);
};

export const createTrackedShareUrl = async (
    sceneId: string,
    baseUrl: string,
    options?: {creatorUserId?: string; channel?: string; metadata?: Record<string, unknown>},
) => {
    const tracked = await trackRewardEvent({
        eventType: REWARD_EVENT_TYPES.GAME_SHARED,
        sceneId,
        creatorUserId: options?.creatorUserId,
        metadata: {
            channel: options?.channel || "clipboard",
            ...(options?.metadata || {}),
        },
    });

    const shareCode = tracked.event.shareCode || tracked.event.id;
    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.set(REWARD_QUERY_PARAM, shareCode);
    url.searchParams.set("utm_source", "creator_share");
    url.searchParams.set("utm_medium", options?.channel || "clipboard");
    url.searchParams.set("utm_campaign", "game_share");
    return url.toString();
};

export const trackRewardReferralClick = async (args: {
    sceneId?: string;
    shareCode: string;
    sessionId: string;
    metadata?: Record<string, unknown>;
}) => {
    return trackRewardEvent({
        eventType: REWARD_EVENT_TYPES.GAME_SHARE_CLICKED,
        sceneId: args.sceneId,
        shareCode: args.shareCode,
        idempotencyKey: `${REWARD_EVENT_TYPES.GAME_SHARE_CLICKED}:${args.shareCode}:${args.sessionId}`,
        metadata: {
            sessionId: args.sessionId,
            ...(args.metadata || {}),
        },
    });
};

export const trackGameSpend = async (args: {
    sceneId: string;
    amount: number;
    currency?: string;
    creatorUserId?: string;
    metadata?: Record<string, unknown>;
}) => {
    return trackRewardEvent({
        eventType: REWARD_EVENT_TYPES.GAME_SPEND,
        sceneId: args.sceneId,
        creatorUserId: args.creatorUserId,
        amount: args.amount,
        currency: args.currency || "usd",
        metadata: args.metadata,
    });
};

export const getRewardSummary = async () => {
    const response = await Ajax.get({
        url: backendUrlFromPath("/api/Rewards/Summary"),
    });

    if (response?.data?.Code !== 200) {
        throw new Error(response?.data?.Msg || "Failed to fetch reward summary");
    }

    return response.data.Data as {
        userId: string;
        balances: Record<string, number>;
        grants: Array<Record<string, unknown>>;
    };
};

export const listRewardRules = async () => {
    const response = await Ajax.get({
        url: backendUrlFromPath("/api/Rewards/Rules"),
    });

    if (response?.data?.Code !== 200) {
        throw new Error(response?.data?.Msg || "Failed to fetch reward rules");
    }

    return response.data.Data as RewardRule[];
};

export const upsertRewardRule = async (rule: RewardRule) => {
    const response = await Ajax.post({
        url: backendUrlFromPath("/api/Rewards/Rules/Upsert"),
        msgBodyType: "json",
        data: rule,
    });

    if (response?.data?.Code !== 200) {
        throw new Error(response?.data?.Msg || "Failed to save reward rule");
    }

    return response.data.Data as RewardRule;
};

export const deleteRewardRule = async (id: string) => {
    const response = await Ajax.post({
        url: backendUrlFromPath("/api/Rewards/Rules/Delete"),
        msgBodyType: "json",
        data: {id},
    });

    if (response?.data?.Code !== 200) {
        throw new Error(response?.data?.Msg || "Failed to delete reward rule");
    }
};
