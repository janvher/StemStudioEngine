import {render} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import appGlobal from "../../../global";
import {StemStudioLoader} from "./StemStudioLoader";

vi.mock("./StemStudioLoader.style", () => {
    const makeComponent = (displayName: string) => {
        const Component = ({children, ...props}: any) => (
            <div
                data-testid={displayName}
                {...props}
            >
                {children}
            </div>
        );
        Component.displayName = displayName;
        return Component;
    };

    return {
        Background: makeComponent("Background"),
        BottomRightBrandContainer: makeComponent("BottomRightBrandContainer"),
        BottomRightBrandLogo: makeComponent("BottomRightBrandLogo"),
        ContentWrapper: makeComponent("ContentWrapper"),
        LoadMaskWrapper: makeComponent("LoadMaskWrapper"),
        LogoImage: makeComponent("LogoImage"),
        ProgressText: makeComponent("ProgressText"),
        StatusMessage: makeComponent("StatusMessage"),
    };
});

describe("StemStudioLoader", () => {
    const originalApp = appGlobal.app;

    beforeEach(() => {
        appGlobal.app = null;
    });

    afterEach(() => {
        appGlobal.app = originalApp;
        vi.restoreAllMocks();
    });

    it("does not throw when the application shell is unavailable", () => {
        expect(() => {
            render(
                <StemStudioLoader
                    show
                    isAutoLoading={false}
                />,
            );
        }).not.toThrow();
    });

    it("registers and unregisters namespaced loader listeners", () => {
        const on = vi.fn();
        appGlobal.app = {on} as any;

        const {unmount} = render(
            <StemStudioLoader
                show
                isAutoLoading={false}
            />,
        );

        expect(on).toHaveBeenCalledWith("maskProgress.LoadMask", expect.any(Function));
        expect(on).toHaveBeenCalledWith("loadingStatus.LoadMask", expect.any(Function));

        unmount();

        expect(on).toHaveBeenCalledWith("maskProgress.LoadMask", null);
        expect(on).toHaveBeenCalledWith("loadingStatus.LoadMask", null);
    });
});
