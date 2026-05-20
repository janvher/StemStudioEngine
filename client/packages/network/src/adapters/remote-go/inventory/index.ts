import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

interface IGetInventoryArgs {
    UserID: string;
    SceneID: string;
}

export interface IInventory {
    UUID: string;
    Name: string;
    Amount: number;
    IsHarvesting?: boolean;
}

export interface IAddToInventoryArgs extends IGetInventoryArgs {
    InventoryItem: string;
}

interface IInitInventoryArgs extends IGetInventoryArgs {
    InventoryItems: string;
}

export interface IDeleteFromInventoryProps {
    InventoryItemUUID: string;
    AmountToRemove: number;
}

export type IDeleteFromInventoryArgs = IDeleteFromInventoryProps & IGetInventoryArgs;

export const getUserInventoryForGame = async (args: IGetInventoryArgs) => {
    const {UserID, SceneID} = args;
    try {
        const url = backendUrlFromPath(`/api/Inventory/Get?UserID=${UserID}&SceneID=${SceneID}`);
        const response: any = await Ajax.get({url, needAuthorization: false});

        if (response.status !== 200) {
            console.error("Inventory Get error");
            throw Error();
        }
        return response.data;
    } catch (error) {
        console.log(`Error from fetching inventory: ${error}`);
    }
};

export const initInventory = async (args: IInitInventoryArgs, callback: () => void) => {
    try {
        const response = await Ajax.post({
            url: backendUrlFromPath(`/api/Inventory/Init`),
            needAuthorization: false,
            data: args,
        });
        const obj = response?.data;
        if (response?.status !== 200) {
            console.error(obj.Msg);
            throw Error(obj.Msg);
        } else {
            callback();
        }
    } catch (error) {
        console.log(`Error from initializing inventory: ${error}`);
        return null;
    }
};

export const addToInventory = async (args: IAddToInventoryArgs) => {
    try {
        const response = await Ajax.post({
            url: backendUrlFromPath(`/api/Inventory/Add`),
            needAuthorization: false,
            data: args,
        });
        if (response?.status !== 200) {
            console.error("Inventory Get error");
            throw Error();
        }
        return response?.data.inventory;
    } catch (error) {
        console.error(`Error from updating inventory: ${error}`);
    }
};

export const deleteFromInventory = async (args: IDeleteFromInventoryArgs) => {
    try {
        const response = await Ajax.post({
            url: backendUrlFromPath(`/api/Inventory/Remove`),
            needAuthorization: false,
            data: args,
        });
        if (response?.status !== 200) {
            console.error("Inventory Get error");
            throw Error();
        }
        return response?.data.inventory;
    } catch (error) {
        console.error(`Error from updating inventory: ${error}`);
    }
};
