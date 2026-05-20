import {ITransformMessageData} from "../../types/editor";

export enum AI_OPERATION {
    DECISION_PROMPT = "decision_prompt",
    COMMANDS_PROMPT = "commands_prompt",
    ENHANCE_MODEL_PROMPT = "enhance_model_prompt",
    ENHANCE_IMAGE_PROMPT = "enhance_image_prompt",
    GENERATE_STEPS_PROMPT = "generate_steps_prompt",
    SEARCH_TAGS_PROMPT = "search_tags_prompt",
    EDIT_CODE_PROMPT = "edit_code_prompt",
}

export enum GENERATION_STEPS {
    ENCHANCE_PROMPT = "Enchancing prompt",
    GENERATE_IMAGE = "Generating image",
    REMOVE_BACKGROUND = "Removing background",
    UPLOAD_IMAGE = "Uploading image",
    GENERATING_MODEL = "Generating model",
    ANIMATING_MODEL = "Animating model",
    UPLOADING_MODEL = "Uploading model",
    ADDING_MODEL_TO_SCENE = "Adding model to scene",
}

export type GenerationStep = {
    step: string;
    function: string;
    parameters: any;
    description: string;
};

export enum GENERATION_STEPS_FUNCTIONS {
    ENCHANCE_PROMPT = "enchancePrompt",
    GENERATE_MODEL = "generate3dObject",
    ATTACH_BEHAVIORS = "attachBehaviors",
    MODIFY_MODEL = "modifyModelByCopilot",
}

export enum IMAGE_TYPES {
    CHARACTER = "Character",
    OBJECT = "Object",
    BACKDROP = "Backdrop",
    SKYBOX = "Skybox",
}
export enum TEXTURE_QUALITY {
    STANDARD = "standard",
    DETAILED = "detailed",
}
export enum MODEL_VERSION {
    V_25 = "v2.5-20250123",
    V_20 = "v2.0-20240919",
    V_14 = "v1.4-20240625",
}

export type AISearchTagsResponse = {
    tags: string[];
    width: number;
    height: number;
    followUpMessage: string;
};

export type ModelsSearchResponse = {
    NameResults: any[];
    TagResults: any[];
};

export type ExternalAssetsSearchResponse = {
    success: boolean;
    message: string;
    assets: any[];
    query: string;
};

export type AIResponse = {
    name: string;
    prompt: string;
    width: number;
    height: number;
    story: string;
    tags: string[];
    traits: string[];
    ai_agent_prompt: string;
    animations: string[];
};

//AI responses

export interface IAiTransformResponse {
    scale?: ITransformMessageData;
    rotation?: ITransformMessageData;
    position?: ITransformMessageData;
}

export interface IAiBehaviorsResponse {
    attach?: any[];
    detach?: any[];
    update?: (Partial<any> & Pick<any, "type">)[];
}

export interface IAiTextureResponse {
    prompt: string;
    twoSided: boolean;
    transparent: boolean;
}

export interface IAiResponse {
    modelUUID: string;
    name: string;
    transform?: IAiTransformResponse;
    behaviors?: IAiBehaviorsResponse;
    texture?: IAiTextureResponse;
}

export interface IAiAssistantResponse {
    assistantResponse: IAiResponse[];
}

export type AICodeEditResponse = {
    code: string;
    message: string;
};

export enum AI_DECISION_TYPE {
    CONVERSATION = "Conversation",
    COMMANDS = "Commands",
}
export type AiDecisionPromptResponse = {
    decision: AI_DECISION_TYPE;
};

export enum COMMANDS {
    ADD_OBJECT = "AddObject",
    REMOVE_OBJECT = "RemoveObject",
    SET_POSITION = "SetPosition",
    SET_ROTATION = "SetRotation",
    SET_SCALE = "SetScale",
    SET_MATERIAL_COLOR = "SetMaterialColor",
    SET_MATERIAL_VALUE = "SetMaterialValue",
    SET_GEOMETRY = "SetGeometry",
    MUTLI_CMDS = "MultiCmds",
    ATTACH_BEHAVIOR = "AttachBehavior",
    DETACH_BEHAVIOR = "DetachBehavior",
    UPDATE_BEHAVIOR = "UpdateBehavior",
    GENERATE_3D_OBJECT = "Generate3dObject",
    ADD_3D_OBJECT = "Add3dObject",
    GENERATE_ERTH_MODEL = "GenerateErthModel",
    SET_MATERIAL_TEXTURE = "SetMaterialTexture",
    COMPLETE = "Complete",
    // AI contextual commands
    GET_PLAYER_DATA = "GetPlayerData",
    GET_SCENE_DATA = "GetSceneData",
    GET_SELECTED_OBJECT_DATA = "GetSelectedObjectData",
    GET_OBJECT_DATA = "GetObjectData",
    GET_LOOK_AT_POINT = "GetLookAtPoint",
    GET_SEARCH_RESULTS = "GetSearchResults",
    GET_BEHAVIORS_CONFIG = "GetBehaviorsConfig",
}
export enum AI_AGENT_MODE {
    EDITOR = "editor",
    SANDBOX_GENERATION = "sandbox_generation",
}
export type AiCommand = {
    type: COMMANDS;
    params: any;
    requiresUserConfirmation?: boolean;
};

export type AiCommandsResponse = {
    response: string;
    threadId?: string;
    commands: AiCommand;
};

export type AiAgentRequest = {
    userMessage: string;
    params: {
        sceneData?: string;
        playerData?: string;
        selectedObjectData?: string;
        objectData?: string;
        behaviorConfig?: string;
        playerWidth?: string;
        playerHeight?: string;
        docs?: string;
        starterCode?: string;
        lookAtPointData?: string;
        searchResults?: string;
    };
};

export type PendingCommandData = {
    aiCommand: AiCommand | null;
    command: unknown;
    aiAgentRequest: AiAgentRequest | null;
};

export type CommandExecutionResult = {
    mainCommand: unknown;
    newCommands: AiCommand | null;
    response: string;
    allCommands: unknown[];
    pendingConfirmation?: PendingCommandData; // Command pending confirmation
};

export type RiggingMetadata = {
    isRigged: boolean;
    riggedWith?: string; // e.g., "meshy", "tripo"
    topology?: string; // e.g., "biped", "quadruped"
};
