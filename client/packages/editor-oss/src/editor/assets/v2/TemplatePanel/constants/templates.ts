export const GAME_TEMPLATE_ID = "0";
export const SANDBOX_TEMPLATE_ID = "1";

export interface ITemplate {
    ID: string;
    Name: string;
    Description: string;
    Tags: string[];
    Thumbnail: string | null;
    IsSandbox: boolean;
    PlayCount?: number;
    RemixCount: number;
}

const defaultDescription =
    "Default project that contains only default scene objects in a single scene. Start with this template to create a fully-customized project of any kind.";

export const TEMPLATES: ITemplate[] = [
    {
        ID: GAME_TEMPLATE_ID,
        Name: "Blank Project",
        Description: defaultDescription,
        Thumbnail: null,
        IsSandbox: false,
        Tags: ["remixable"],
        RemixCount: 0,
    },
    {
        ID: SANDBOX_TEMPLATE_ID,
        Name: "Open World Sandbox",
        Description: defaultDescription,
        Thumbnail: null,
        IsSandbox: true,
        Tags: ["remixable"],
        RemixCount: 0,
    },
];
