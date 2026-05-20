import {backendUrlFromPath} from "../utils/UrlUtils";

type Resource = {
    ID: string;
    Name: string;
    Category: string;
    Biome: string;
    Rarity: string;
    DropChance: number;
};

type Object = {
    Name: string;
    Biome: string;
    Resources: Resource[];
};

const getBiomes = async () => {
    const res = await fetch(backendUrlFromPath(`/api/Biomes/Get`) || "");
    if (res.ok) {
        const response = await res.json();

        return response.biomes as string[] | undefined;
    } else {
        throw Error("Failed to load biomes.");
    }
};

const getBiomeObjects = async (biome: string, category: string) => {
    const res = await fetch(backendUrlFromPath(`/api/Biomes/GetObjects?biome=${biome}&category=${category}`) || "");
    if (res.ok) {
        const response = await res.json();

        return response.objects as Object[] | undefined;
    } else {
        throw Error("Failed to fetch objects.");
    }
};

const getResourcesList = async (biome: string, objectName: string) => {
    const res = await fetch(backendUrlFromPath(`/api/Biomes/GetResources?biome=${biome}&object=${objectName}`) || "");
    if (res.ok) {
        const response = await res.json();

        return response.resources as Resource[] | undefined;
    } else {
        throw Error("Failed to fetch resources.");
    }
};

const getResourceById = async (id: string) => {
    const res = await fetch(backendUrlFromPath(`/api/Biomes/GetResource?id=${id}`) || "");
    if (res.ok) {
        const response = await res.json();

        return response.resource as Resource | undefined;
    } else {
        throw Error("Failed to fetch resource.");
    }
};

const getResourcesCategories = async (biome: string) => {
    const res = await fetch(backendUrlFromPath(`/api/Biomes/GetCategories?biome=${biome}`) || "");
    if (res.ok) {
        const response = await res.json();

        return response.categories as string[] | undefined;
    } else {
        throw Error("Failed to load categories.");
    }
};

const getRandomResourceFromObject = async (biome: string, objectName: string = "Pine Tree") => {
    try {
        const res = await getResourcesList(biome, objectName);
        if (!res) {
            return null;
        }
        const resources = res;
        const totalChance = resources.reduce((sum, r) => sum + r.DropChance, 0);
        if (totalChance === 0) return null;

        let rand = Math.random() * totalChance;
        for (const resource of resources) {
            rand -= resource.DropChance;
            if (rand <= 0) {
                return resource;
            }
        }

        return null;
    } catch (error) {
        console.error("Error fetching resources:", error);
        return null;
    }
};

export const nameToResourceImage = (name: string): string => {
    return `${window.location.origin}/assets/image/TownCraft/resources/${name.replaceAll(" ", "%20")}.png`;
};

export const ResourcesUtils = {
    getBiomes,
    getBiomeObjects,
    getResourcesList,
    getResourceById,
    getResourcesCategories,
    getRandomResourceFromObject,
    nameToResourceImage,
};
