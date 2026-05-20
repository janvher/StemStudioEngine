export interface IBasicGameInterface {
    ID: string;
    Name: string;
    Thumbnail: any;
    GameURL: string;
    PlayCount: number;
    Likes: number;
    IsCloneable: boolean;
    UserID: string;
    UpdateTime: string;
    LastPlayedTime: string;
    PublishedTime: string;
    Description: string;
    Tags: string[];
}

export interface IGamePlayed {
    rank: {current: number; max: number};
    id: number;
}

export interface IQuest {
    name: string;
    progress: {
        current: number;
        max: number;
    };
    playcoinPrize: number;
}
export interface IRedeem {
    name: string;
    playcoinPerDollar: number;
    thumbnail: string;
}

export interface IUserProfileData {
    playedGames: IGamePlayed[];
    recommended: {id: number}[];
    quests: IQuest[];
    rank: number;
    redeem: IRedeem[];
}

export interface IEditorUser {
    projects?: any[];
    avatar: string;
    email: string;
    name: string;
    username?: string;
    id: string;
    memberSince: number;
    likedGamesIds?: string[];
    recentlyViewed?: string[];
    aiCredits?: number;
    lastCreditsRefresh?: number;
    stripeCustomerId?: string;
    creditsPlan?: string;
    creditsPlanExpiresAt?: number;
}

export enum SEARCH_GAME_QUERY {
    GAME_NAME = "name",
    GAME_AUTHOR = "userID",
    GAME_TAGS = "tags",
    PAGE = "page",
    LIMIT = "limit",
}
