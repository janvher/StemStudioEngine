export type AnythingModelOtherDetails = {
    material: string;
    model: string;
    texture: string[];
    reference?: string;
    aw_thumbnail: string;
};

export type AnythingModelFormats = {
    DAE?: string;
    FBX?: string;
    GLTF2?: string;
    PLY?: string;
    STL?: string;
    USD?: string;
    X3D?: string;
    GLB?: string;
    VRM?: string;
};

export type AnythingModelAnimations = {
    idle: {
        GLB?: string;
        FBX?: string;
        GLTF_EMBEDDED?: string;
    };
};

export type AnythingModelThumbnails = {
    original_reference?: string;
    aw_reference?: string;
    aw_reference_transparent?: string;
    aw_thumbnail?: string;
    aw_thumbnail_transparent?: string;
};

export const HABITATS = [
    "garden",
    "urban",
    "rural",
    "grass",
    "swamp",
    "river",
    "pond",
    "lake",
    "jungle",
    "icescape",
    "sea",
    "farm",
    "desert",
    "city",
    "beach",
    "forest",
    "cave",
    "underwater",
    "magical",
    "grassland",
    "mountain",
    "space",
    "savannah",
    "testing",
]; //Specific habitats can also be specified as parameter, giving the true value.

export interface IAnythingModel {
    _id: string;
    name: string;
    searchName?: string;
    newName?: string;
    type: string;
    model: {
        parts: any;
        other: AnythingModelOtherDetails;
        formats: AnythingModelFormats;
        rig: {
            animations: AnythingModelAnimations;
            GLB?: string;
            FBX?: string;
            GLTF_EMBEDDED?: string;
        };
    };
    thumbnails: AnythingModelThumbnails;
}

export const SUPPORTED_FORMATS = ["GLB", "GLTF", "GLTF2", "FBX", "PLY", "VRM"];
