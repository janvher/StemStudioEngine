export type MenuItemConfig = {
    label: string;
    icon?: string;
    onClick?: () => void;
    submenu?: MenuItemConfig[];
    condition?: boolean;
    disabled?: boolean;
};

export type MenuLevel = {
    items: MenuItemConfig[];
    header?: string;
};
