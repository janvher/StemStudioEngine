export enum PANEL_TYPES {
    IN_GAME_SETTINGS = "IN_GAME_SETTINGS",
    MODEL = "MODEL",
    MOVEMENT = "MOVEMENT",
    LIGHTING = "LIGHTING",
    MODEL_LIGHTING = "MODEL LIGHTING",
    PHYSICS = "PHYSICS",
    RIGID_BODY = "RIGID_BODY",
    TEXTURE = "TEXTURE",
    MATERIAL_RENDERING = "MATERIAL",
    OBJ_SETTINGS = "OBJECT SETTINGS",
    DEPENDENCIES = "DEPENDENCIES",
}

export const ROWS = [
    {name: "Transform", type: PANEL_TYPES.MOVEMENT},
    {name: "Object Settings", type: PANEL_TYPES.OBJ_SETTINGS},
    {name: "Lighting", type: PANEL_TYPES.LIGHTING},
    {name: "Lighting", type: PANEL_TYPES.MODEL_LIGHTING},
    {name: "Physics", type: PANEL_TYPES.PHYSICS},
    {name: "Material Rendering", type: PANEL_TYPES.MATERIAL_RENDERING},
    {name: "Dependencies", type: PANEL_TYPES.DEPENDENCIES},
];

export const DIRECTIONAL_LIGHT_ROWS = [
    {name: "Transform", type: PANEL_TYPES.MOVEMENT},
    {name: "Lighting", type: PANEL_TYPES.LIGHTING},
    {name: "Lighting", type: PANEL_TYPES.MODEL_LIGHTING},
    {name: "Texture", type: PANEL_TYPES.TEXTURE},
    {name: "Material Rendering", type: PANEL_TYPES.MATERIAL_RENDERING},
];
