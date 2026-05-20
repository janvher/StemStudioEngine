import {getAuth} from "firebase/auth";
import {doc, getDoc, updateDoc} from "firebase/firestore";

import {db} from "@web-shared/firebase";
import {IStats, LIKES_ACTION, updateLikesCount} from "./getGames";
import {showToast} from "@web-shared/showToast";
import {IEditorUser} from "@web-shared/v2/pages/types";
import {IS_OSS} from "../../buildMode";

export const addLikedGame = async (
    gameId: string,
    setDbUser: React.Dispatch<React.SetStateAction<IEditorUser | null>>,
    redirectToLogin: () => void,
): Promise<IStats | null | void> => {
    if (IS_OSS) return null;
    try {
        const authUser = getAuth().currentUser;
        if (!authUser) {
            redirectToLogin();
            console.log("addLikedGame: Cannot perform function, login data missing");
            return;
        }
        if (!db) return null;
        const id = authUser.uid;
        const docRef = doc(db, "users", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const user = docSnap.data() as IEditorUser;
            const likedGamesIds = user.likedGamesIds || [];
            const alreadyLiked = likedGamesIds.includes(gameId);
            const nextLikedGamesIds = alreadyLiked
                ? likedGamesIds.filter(el => el !== gameId)
                : [...likedGamesIds, gameId];
            const likeAction = alreadyLiked ? LIKES_ACTION.DECREMENT : LIKES_ACTION.INCREMENT;
            const res = await updateLikesCount(gameId, likeAction);
            if (!res) return null;

            await updateDoc(docRef, {
                likedGamesIds: nextLikedGamesIds,
            });
            setDbUser({...user, likedGamesIds: nextLikedGamesIds});
            return res;
        } else {
            console.log("No such user in db! ");
            showToast({title: "Something went wrong", body: "No user found", type: "error"});
        }
    } catch (e) {
        console.error("Error from fetching document: ", e);
        showToast({title: "Something went wrong", body: "Couldn't fetch user data", type: "error"});
    }
};

export const getLikedGames = async (userId?: string) => {
    if (IS_OSS) return [];
    try {
        const authUser = getAuth().currentUser;
        if (!authUser && !userId) return;
        const id = authUser?.uid || userId;
        if (!id) return console.error("Missing user ID");
        if (!db) return;
        const docRef = doc(db, "users", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const user = docSnap.data() as IEditorUser;
            return user.likedGamesIds || [];
        }
    } catch (e) {
        console.error("Error from fetching document: ", e);
        showToast({title: "Something went wrong", body: "No user found", type: "error"});
    }
    return [];
};
