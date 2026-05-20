export enum MENU_OPTION_TYPE {
    CLONE,
    LOCK,
    EMPTY_GROUP,
    CONVERT_TO_PREFAB,
    EDIT_PREFAB,
    SAVE_PREFAB,
    REVERT_PREFAB,
    EXPORT_STEM,
    GROUP,
    UNGROUP,
    DELETE,
    EDIT_NAME,
    CSG_UNION,
    CSG_INTERSECTION,
    CSG_SUBTRACTION,
    CSG_DIFFERENCE,
    CSG_HOLLOW_SUBTRACTION,
    CSG_HOLLOW_INTERSECTION,
    SEPARATOR,
    EDIT_CURVE,
    OPEN_IN_STEM_EDITOR,
    ALIGN_X,
    ALIGN_Y,
    ALIGN_Z,
    DISTRIBUTE_X,
    DISTRIBUTE_Y,
    DISTRIBUTE_Z,
}

export interface IRightClickMenu {
    label: string;
    optionType: MENU_OPTION_TYPE;
    isSeparator?: boolean;
}

export interface MenuPositionType {
    x: number;
    y: number;
}
