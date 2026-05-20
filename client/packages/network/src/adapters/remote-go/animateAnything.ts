import {IAnythingModel} from "@web-shared/types/animateAnything";
import Ajax from "@web-shared/utils/Ajax";

const BASE_URL = "https://api.anything.world";
const API_KEY = process.env.REACT_APP_ANYTHING_WORLD_API_KEY || "DG9WYD6-QPM46RH-PW4J8T7-XRNX0V1";

export const getModelBySearch = async (search: string) => {
    try {
        const response = await Ajax.get({
            url: `${BASE_URL}/anything?key=${API_KEY}&search=${search}`,
            usesApiKey: true,
            needAuthorization: false,
        });

        return response?.data as IAnythingModel[];
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};

export const getModelByName = async (name: string) => {
    try {
        const response = await Ajax.get({
            url: `${BASE_URL}/anything?key=${API_KEY}&name=${name}`,
            usesApiKey: true,
            needAuthorization: false,
        });

        return response?.data as IAnythingModel[];
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};

export const getModelByID = async (id: string) => {
    try {
        const response = await Ajax.get({
            url: `${BASE_URL}/anything?key=${API_KEY}&id=${id}`,
            usesApiKey: true,
            needAuthorization: false,
        });

        const data = await response?.data;
        return data as IAnythingModel[];
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};

export const animateModel = async (file: File, symmetry: boolean, model_type: string, model_name: string) => {
    try {
        const response = await Ajax.post({
            url: `${BASE_URL}/animate`,
            data: {
                key: API_KEY,
                symmetry: symmetry,
                model_type: model_type,
                model_name: model_name,
                files: [file],
            },
            usesApiKey: true,
            needAuthorization: false,
        });

        const data = response?.data;
        return data as IAnythingModel[];
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};
