import {IUserProfileData} from "@web-shared/v2/pages/types";

export const getInitProfileData: () => IUserProfileData = () => {
    return {
        playedGames: [
            {id: 1, rank: {current: 25, max: 100}},
            {id: 2, rank: {current: 65, max: 100}},
            {id: 3, rank: {current: 5, max: 100}},
            {id: 4, rank: {current: 100, max: 100}},
            {id: 5, rank: {current: 22, max: 100}},
            {id: 6, rank: {current: 22, max: 100}},
        ],
        recommended: [{id: 7}, {id: 8}, {id: 9}, {id: 10}, {id: 11}, {id: 12}],
        quests: [
            {
                name: "Invite 5 friends to StemStudio",
                progress: {current: 5, max: 5},
                playcoinPrize: 10000,
            },
            {
                name: "Reach rank 100",
                progress: {current: 1, max: 5},
                playcoinPrize: 10000,
            },
            {
                name: "Play a FPS game 5 times",
                progress: {current: 3, max: 5},
                playcoinPrize: 10000,
            },
            {
                name: "Play Restaurant tycoon 5 times",
                progress: {current: 0, max: 5},
                playcoinPrize: 10000,
            },
        ],
        redeem: [
            {
                name: "Amazon",
                playcoinPerDollar: 5000,
                thumbnail:
                    "https://static.vecteezy.com/system/resources/previews/014/018/561/non_2x/amazon-logo-on-transparent-background-free-vector.jpg",
            },
            {
                name: "Nike",
                playcoinPerDollar: 10000,
                thumbnail:
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlAHSjq7Gk3-FboSL_OMkC42bdCkxD12e4mw&s",
            },
            {
                name: "Roblox",
                playcoinPerDollar: 2000,
                thumbnail: "https://images.rbxcdn.com/d66ae37d46e00a1ecacfe9531986690a.jpg",
            },
            {
                name: "JBL",
                playcoinPerDollar: 10000,
                thumbnail:
                    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/JBL-Logo.svg/2560px-JBL-Logo.svg.png",
            },
        ],
        rank: 50,
    };
};
