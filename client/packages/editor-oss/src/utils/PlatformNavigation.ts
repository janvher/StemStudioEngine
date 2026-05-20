/**
 * Platform Navigation Utility
 *
 * Provides cross-platform URL opening functionality that:
 * - Uses Capacitor Browser plugin for mobile apps
 * - Uses Electron shell.openExternal for Electron apps
 * - Falls back to window.open for web browsers
 */

import PlatformDetector from "../userManagement/utils/PlatformDetector";

export interface NavigationOptions {
    target?: "_blank" | "_self" | "_parent" | "_top";
    windowFeatures?: string;
}

export class PlatformNavigation {
    /**
     * Open a URL in the most appropriate way for the current platform
     * @param url
     * @param options
     */
    static async openUrl(url: string, options: NavigationOptions = {}): Promise<boolean> {
        try {
            const platformInfo = PlatformDetector.getPlatformInfo();

            console.log(`🌐 [PlatformNavigation] Opening URL: ${url} on platform: ${platformInfo.type}`);

            // Capacitor (mobile apps) - use Browser plugin
            if (platformInfo.isCapacitor) {
                return await this.openInCapacitorBrowser(url);
            }

            // Electron - use shell.openExternal
            if (platformInfo.isElectron) {
                return await this.openInElectronBrowser(url);
            }

            // Web browser - use window.open
            return this.openInWebBrowser(url, options);
        } catch (error) {
            console.error("❌ [PlatformNavigation] Failed to open URL:", error);
            // Fallback to window.open
            return this.openInWebBrowser(url, options);
        }
    }

    /**
     * Open URL using Capacitor Browser plugin
     * @param url
     */
    private static async openInCapacitorBrowser(url: string): Promise<boolean> {
        try {
            console.log("📱 [PlatformNavigation] Using Capacitor Browser plugin");

            // Dynamic import to avoid bundling issues when not in Capacitor environment
            // Use type assertion to handle optional dependency
            const capacitorBrowser = await import("@capacitor/browser").catch(() => null);

            if (!capacitorBrowser) {
                console.warn("📱 [PlatformNavigation] @capacitor/browser not available");
                throw new Error("Capacitor Browser plugin not available");
            }

            await capacitorBrowser.Browser.open({
                url,
                windowName: "_blank",
                toolbarColor: "#000000",
                presentationStyle: "popover",
            });

            console.log("✅ [PlatformNavigation] Successfully opened in Capacitor browser");
            return true;
        } catch (error) {
            console.error("❌ [PlatformNavigation] Capacitor Browser failed:", error);

            // Fallback: try to use window.open
            console.log("🔄 [PlatformNavigation] Falling back to window.open for Capacitor");
            return this.openInWebBrowser(url);
        }
    }

    /**
     * Open URL using Electron shell.openExternal
     * @param url
     */
    private static async openInElectronBrowser(url: string): Promise<boolean> {
        try {
            console.log("💻 [PlatformNavigation] Using Electron shell.openExternal");

            // Check if we're in Electron environment with require available
            if (typeof window !== "undefined" && (window as any).require) {
                const {shell} = (window as any).require("electron");

                if (shell && shell.openExternal) {
                    await shell.openExternal(url);
                    console.log("✅ [PlatformNavigation] Successfully opened in external browser via Electron");
                    return true;
                }
            }

            // If Electron shell is not available, try IPC
            if (typeof window !== "undefined" && (window as any).electronAPI) {
                await (window as any).electronAPI.openExternal(url);
                console.log("✅ [PlatformNavigation] Successfully opened via Electron IPC");
                return true;
            }

            throw new Error("Electron shell or IPC not available");
        } catch (error) {
            console.error("❌ [PlatformNavigation] Electron shell failed:", error);

            // Fallback: try to use window.open
            console.log("🔄 [PlatformNavigation] Falling back to window.open for Electron");
            return this.openInWebBrowser(url);
        }
    }

    /**
     * Open URL using standard web browser window.open
     * @param url
     * @param options
     */
    private static openInWebBrowser(url: string, options: NavigationOptions = {}): boolean {
        try {
            console.log("🌐 [PlatformNavigation] Using window.open");

            const target = options.target || "_blank";
            const windowFeatures = options.windowFeatures || "noopener,noreferrer";

            const newWindow = window.open(url, target, windowFeatures);

            if (newWindow) {
                // Ensure the new window has focus (if it was opened)
                if (target === "_blank") {
                    newWindow.focus();
                }
                console.log("✅ [PlatformNavigation] Successfully opened in web browser");
                return true;
            } else {
                console.warn("⚠️ [PlatformNavigation] window.open returned null (popup blocked?)");
                return false;
            }
        } catch (error) {
            console.error("❌ [PlatformNavigation] window.open failed:", error);
            return false;
        }
    }

    /**
     * Check if external navigation is available on the current platform
     */
    static isExternalNavigationAvailable(): boolean {
        const platformInfo = PlatformDetector.getPlatformInfo();

        if (platformInfo.isCapacitor) {
            // Check if Capacitor Browser plugin is available
            try {
                return !!(window as any).Capacitor;
            } catch {
                return false;
            }
        }

        if (platformInfo.isElectron) {
            // Check if Electron shell or IPC is available
            try {
                return !!(
                    (window as any).require && (window as any).require("electron") ||
                    (window as any).electronAPI
                );
            } catch {
                return false;
            }
        }

        // Web browsers always support window.open
        return true;
    }
}

export default PlatformNavigation;
