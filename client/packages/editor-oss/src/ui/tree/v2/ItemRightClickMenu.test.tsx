import {render, screen} from "@testing-library/react";
import React from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";

const hoisted = vi.hoisted(() => ({
    globalMock: {
        app: {
            editor: {
                objectByUuid: vi.fn(),
                selected: null as any,
                scene: {userData: {} as any, children: [] as any[]},
            },
        },
    },
}));

vi.mock("styled-components", () => {
    const styledFactory = (tag: any) => () => (props: any) => React.createElement(tag, props, props.children);
    const styled = new Proxy(styledFactory as any, {
        get: (_target, prop) => styledFactory(prop),
    });
    return {
        __esModule: true,
        default: styled,
        css: () => "",
        keyframes: () => "",
    };
});

vi.mock("../../../global", () => ({
    default: hoisted.globalMock,
}));

vi.mock("./helpers", () => ({
    handleClone: vi.fn(),
}));

vi.mock("./useRemoveObject", () => ({
    useRemoveObject: () => vi.fn(),
}));

vi.mock("../../../command/Commands", () => ({
    CSGOperation: {
        UNION: "UNION",
        INTERSECTION: "INTERSECTION",
        SUBTRACTION: "SUBTRACTION",
        DIFFERENCE: "DIFFERENCE",
        HOLLOW_SUBTRACTION: "HOLLOW_SUBTRACTION",
        HOLLOW_INTERSECTION: "HOLLOW_INTERSECTION",
    },
}));

vi.mock("../../../object/geometry/CustomTube", () => ({
    default: class CustomTube {},
}));

vi.mock("../../common/RightClickMenu/RightClickMenu", () => ({
    RightClickMenu: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    ItemMenuText: ({children, onClick}: {children: React.ReactNode; onClick?: any}) => (
        <div onClick={onClick}>{children}</div>
    ),
    MenuSeparator: () => <hr />,
}));

import {ItemRightClickMenu} from "./ItemRightClickMenu";

const baseProps = {
    isGroup: true,
    data: {value: "uuid-1", text: "Item", type: "Group", expanded: false},
    createEmptyGroup: vi.fn(),
    lockedItems: [] as string[],
    closeMenu: vi.fn(),
    onLockClick: vi.fn(),
    menuPosition: {x: 0, y: 0},
    scrollToSelected: vi.fn(),
    setRenameActive: vi.fn(),
    isModelChild: false,
    isPrefab: false,
    isPrefabLocked: false,
    isStemEditorRoot: false,
};

const setSelected = (selected: any) => {
    hoisted.globalMock.app.editor.selected = selected;
};

const setObjectByUuid = (children: unknown[] = []) => {
    hoisted.globalMock.app.editor.objectByUuid = vi.fn(() => ({children}));
};

// Sets up a scene in stem-editor mode containing `stemInstance` as a
// direct child whose prefabId matches the stem-editor metadata.
const enterStemEditorWithInstance = (stemInstance: any) => {
    stemInstance.userData = {...(stemInstance.userData ?? {}), prefabId: "stem-asset-1"};
    hoisted.globalMock.app.editor.scene = {
        userData: {stemEditor: {assetId: "stem-asset-1"}},
        children: [stemInstance],
    };
};

const exitStemEditor = () => {
    hoisted.globalMock.app.editor.scene = {userData: {}, children: []};
};

describe("ItemRightClickMenu", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setSelected(null);
        setObjectByUuid([{}]); // by default, item has children so Ungroup is eligible
        exitStemEditor();
    });

    describe("stem editor — stem instance", () => {
        it("hides Ungroup, Delete, and Group", () => {
            const stemInstance = {};
            enterStemEditorWithInstance(stemInstance);
            setSelected([stemInstance, {}]);

            render(<ItemRightClickMenu {...baseProps} isStemEditorRoot />);

            expect(screen.queryByText("Ungroup")).toBeNull();
            expect(screen.queryByText("Delete")).toBeNull();
            expect(screen.queryByText("Group")).toBeNull();
        });
    });

    describe("stem editor — non-root child", () => {
        it("shows Ungroup, Delete, and Group like a normal item", () => {
            const stemInstance = {};
            enterStemEditorWithInstance(stemInstance);
            // Two unrelated children — stem is not in the selection.
            setSelected([{}, {}]);

            render(<ItemRightClickMenu {...baseProps} isStemEditorRoot={false} />);

            expect(screen.getByText("Ungroup")).toBeTruthy();
            expect(screen.getByText("Delete")).toBeTruthy();
            expect(screen.getByText("Group")).toBeTruthy();
        });

        it("hides Group when selection includes the stem instance even if right-clicked item is not the stem", () => {
            const stemInstance = {};
            enterStemEditorWithInstance(stemInstance);
            // Multi-select with stem + a sibling, right-clicking on the sibling.
            setSelected([stemInstance, {}]);

            render(<ItemRightClickMenu {...baseProps} isStemEditorRoot={false} />);

            expect(screen.queryByText("Group")).toBeNull();
        });
    });

    describe("regular editor — locked stem instance", () => {
        it("hides Ungroup but keeps Delete", () => {
            render(
                <ItemRightClickMenu
                    {...baseProps}
                    isPrefab
                    isPrefabLocked
                    isStemEditorRoot={false}
                />,
            );

            expect(screen.queryByText("Ungroup")).toBeNull();
            expect(screen.getByText("Delete")).toBeTruthy();
        });
    });

    describe("regular editor — unlocked stem instance", () => {
        it("shows Ungroup and Delete", () => {
            render(
                <ItemRightClickMenu
                    {...baseProps}
                    isPrefab
                    isPrefabLocked={false}
                    isStemEditorRoot={false}
                />,
            );

            expect(screen.getByText("Ungroup")).toBeTruthy();
            expect(screen.getByText("Delete")).toBeTruthy();
        });
    });

    describe("regular editor — non-prefab group", () => {
        it("shows Ungroup, Delete, and Group (baseline)", () => {
            setSelected([{}, {}]);

            render(<ItemRightClickMenu {...baseProps} />);

            expect(screen.getByText("Ungroup")).toBeTruthy();
            expect(screen.getByText("Delete")).toBeTruthy();
            expect(screen.getByText("Group")).toBeTruthy();
        });
    });
});
