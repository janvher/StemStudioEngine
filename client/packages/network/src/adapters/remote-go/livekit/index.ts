import I18n from "i18next";

import {showToast} from "@web-shared/showToast";
import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

export const generateLiveKitToken = async (room: string, username: string) => {
    try {
        const response = await Ajax.post({
            url: backendUrlFromPath(`/api/livekit/join_token`),
            needAuthorization: false,
            data: {
                room,
                identity: username,
            },
            msgBodyType: "urlEncoded",
        });
        const obj = response?.data;
        if (obj.Code !== 200) {
            showToast({type: "error", body: I18n.t(obj.Msg)});
            throw Error;
        } else {
            return obj.Data.token as string;
        }
    } catch (error) {
        console.error("LiveKit join token: request failed:", error);
    }
};

export const createLiveKitRoom = async (room: string, username: string) => {
    try {
        const response = await Ajax.post({
            url: backendUrlFromPath(`/api/livekit/create_room`),
            data: {
                room,
                identity: username,
            },
            msgBodyType: "urlEncoded",
        });
        const obj = response?.data;
        if (obj.Code !== 200) {
            throw Error;
        } else {
            console.log("LiveKit Room created successfully");
            return obj.Data;
        }
    } catch (error) {
        console.error("LiveKit Room: Request failed:", error);
    }
};
