/* eslint-disable @typescript-eslint/no-explicit-any */
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";

// Sidestep styled-components in the JSDOM test environment by replacing the
// style module with plain DOM nodes. Pattern matches StemStudioLoader.test.tsx.
vi.mock("./MyAvatarsView.style", () => {
    const div = ({children, ...props}: any) => <div {...props}>{children}</div>;
    const button = ({children, ...props}: any) => <button {...props}>{children}</button>;
    const img = (props: any) => <img alt="" {...props} />;
    return {
        PageContainer: div,
        PageHeading: div,
        PageSubtitle: div,
        Grid: div,
        Card: div,
        Thumb: img,
        DefaultBadge: div,
        NameLabel: div,
        ActionRow: div,
        ActionButton: button,
        AddCard: button,
        EmptyState: div,
    };
});

const mocks = vi.hoisted(() => ({
    navigate: vi.fn(),
    location: {pathname: "/my-avatars"},
    listMyAvatars: vi.fn(),
    deleteMyAvatar: vi.fn(),
    setMyDefaultAvatar: vi.fn(),
    showToast: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
    useNavigate: () => mocks.navigate,
    useLocation: () => mocks.location,
}));

vi.mock("react-i18next", () => {
    const t = (key: string, vars?: Record<string, unknown>) => {
        if (!vars) return key;
        return Object.entries(vars).reduce(
            (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)),
            key,
        );
    };
    // Stable hook return so useEffect dependencies don't churn on every render.
    const value = {t};
    return {
        useTranslation: () => value,
        // `i18n/config.ts` imports this plugin at module load; without it the
        // mock makes the whole file fail to import.
        initReactI18next: {type: "3rdParty", init: () => {}},
    };
});

vi.mock("toastywave", () => ({
    toast: {success: vi.fn(), error: vi.fn(), info: vi.fn()},
}));

vi.mock("@stem/network/api/avatarCreator", async () => {
    const actual: any = await vi.importActual("@stem/network/api/avatarCreator");
    return {
        ...actual,
        MAX_USER_AVATARS: 9,
        listMyAvatars: (...args: unknown[]) => mocks.listMyAvatars(...args),
        deleteMyAvatar: (...args: unknown[]) => mocks.deleteMyAvatar(...args),
        setMyDefaultAvatar: (...args: unknown[]) => mocks.setMyDefaultAvatar(...args),
    };
});

vi.mock("../../../../../context", () => ({
    useAppGlobalContext: () => ({setMainLoaderState: vi.fn()}),
}));

vi.mock("../../../../../showToast", () => ({
    showToast: (...args: unknown[]) => mocks.showToast(...args),
}));

vi.mock("../../../../../ui", () => ({
    Confirm: ({onOK, title, children}: any) => (
        <div data-testid="confirm">
            <div>{title}</div>
            <div>{children}</div>
            <button
                type="button"
                onClick={onOK}
            >
                Confirm
            </button>
        </div>
    ),
}));

// Render AvatarCreator as a sentinel so we can detect when it's mounted
// without exercising any of its three.js code.
vi.mock("../../AvatarCreator/AvatarCreator", () => ({
    AvatarCreator: () => <div data-testid="avatar-creator" />,
}));

vi.mock("../../common/Tooltip", () => ({
    Tooltip: ({children}: any) => <>{children}</>,
}));

import {MyAvatarsView} from "./MyAvatarsView";

const makeRecord = (overrides: Record<string, unknown> = {}) => ({
    id: "rec-1",
    userId: "u",
    type: "premade",
    name: "My Avatar",
    isDefault: false,
    createdAt: "",
    updatedAt: "",
    assetId: "asset-1",
    thumbnail: "https://thumb",
    ...overrides,
});

describe("MyAvatarsView", () => {
    beforeEach(() => {
        mocks.navigate.mockReset();
        mocks.listMyAvatars.mockReset();
        mocks.deleteMyAvatar.mockReset();
        mocks.setMyDefaultAvatar.mockReset();
        mocks.showToast.mockReset();
        mocks.location.pathname = "/my-avatars";
    });

    it("shows the default badge for the isDefault record", async () => {
        mocks.listMyAvatars.mockResolvedValueOnce([
            makeRecord({id: "rec-1", isDefault: true, name: "Hero"}),
            makeRecord({id: "rec-2", isDefault: false, name: "Backup"}),
        ]);

        render(<MyAvatarsView />);

        await waitFor(() => expect(screen.getByText("Hero")).toBeInTheDocument());
        expect(screen.getByText("Default")).toBeInTheDocument();
        // The "Add new" tile shows the count.
        expect(screen.getByLabelText("Add new avatar").textContent).toContain("2/9");
    });

    // The "mounts AvatarCreator" test was removed — the AvatarCreator is a
    // hosted-backend feature gated off by IS_OSS, so it never mounts here.

    it("at cap on /my-avatars/new shows banner and does not mount AvatarCreator", async () => {
        mocks.location.pathname = "/my-avatars/new";
        mocks.listMyAvatars.mockResolvedValueOnce(
            Array.from({length: 9}, (_, i) => makeRecord({id: `rec-${i}`})),
        );

        render(<MyAvatarsView />);

        await waitFor(() =>
            expect(screen.getByText(/You're at the 9 avatar limit/i)).toBeInTheDocument(),
        );
        expect(screen.queryByTestId("avatar-creator")).not.toBeInTheDocument();
        // The Add tile is disabled.
        const addBtn = screen.getByLabelText("Avatar limit reached");
        expect(addBtn).toBeDisabled();
    });

    it("delete-confirm calls deleteMyAvatar and refreshes the list", async () => {
        mocks.listMyAvatars
            .mockResolvedValueOnce([makeRecord({id: "rec-1", name: "Goner"})])
            .mockResolvedValueOnce([]);
        mocks.deleteMyAvatar.mockResolvedValueOnce(undefined);

        render(<MyAvatarsView />);

        await waitFor(() => expect(screen.getByText("Goner")).toBeInTheDocument());

        // Click the delete action on the only card.
        const deleteBtn = screen.getByLabelText("Delete");
        await userEvent.click(deleteBtn);

        // Confirm dialog appears; click the OK button.
        const confirm = await screen.findByTestId("confirm");
        await userEvent.click(confirm.querySelector("button")!);

        await waitFor(() => expect(mocks.deleteMyAvatar).toHaveBeenCalledWith("rec-1"));
        // refresh was triggered (second list call).
        await waitFor(() => expect(mocks.listMyAvatars).toHaveBeenCalledTimes(2));
    });

    it("navigates to /my-avatars/new from the Add tile when under cap", async () => {
        mocks.listMyAvatars.mockResolvedValueOnce([]);

        render(<MyAvatarsView />);

        const addBtn = await screen.findByLabelText("Add new avatar");
        await userEvent.click(addBtn);

        expect(mocks.navigate).toHaveBeenCalledWith("/my-avatars/new");
    });
});
