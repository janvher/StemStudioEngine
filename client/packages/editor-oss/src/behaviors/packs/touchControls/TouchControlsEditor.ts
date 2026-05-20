/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import TouchButton, {ButtonConfig} from "./TouchButton";
import type {DeviceType, OrientationType, LayoutConfig} from "./TouchControls";
import {ScaleMode, ScalingConfig, TouchControlsScaler} from "./TouchControlsScaling";
import TouchJoystick, {type JoystickConfig} from "./TouchJoystick";
import TouchSteeringWheel, {type SteeringWheelConfig} from "./TouchSteeringWheel";
import {getZIndexWithinHUD, HUD_Z_INDEX} from "@stem/editor-oss/editor/assets/v2/HUD/HUDView/services";
import global from "@stem/editor-oss/global";

interface ViewportDimensions {
    width: number;
    height: number;
}

const DESIGN_VIEWPORT_LANDSCAPE = {width: 1920, height: 1080};
const DESIGN_VIEWPORT_PORTRAIT = {width: 1080, height: 1920};

class TouchControlsEditor {
    private isDraggingElement = false;
    private dragTarget: HTMLElement | null = null;
    private dragOffset = {x: 0, y: 0};
    private touchControls: any; // TouchControls reference
    private joystick: TouchJoystick | null = null;
    private steeringWheel: TouchSteeringWheel | null = null;
    private buttons: TouchButton[] = [];
    private scaler: TouchControlsScaler;
    private onResizeHandler: () => void;
    private previewFrame: HTMLElement | null = null;
    private lastDeviceType: DeviceType | null = null;
    private lastOrientation: OrientationType | null = null;

    constructor(touchControls: any) {
        this.touchControls = touchControls;
        this.onResizeHandler = this.onResize.bind(this);

        // Initialize scaler with current config
        this.scaler = new TouchControlsScaler(this.getScalingConfig());
    }

    setupDragEvents(
        element: HTMLElement,
        type: "joystick" | "button" | "steeringWheel",
        deviceType: "mobile" | "tablet" | "desktop",
        orientation: "portrait" | "landscape",
        index?: number,
    ): void {
        const onEditorDragStart = (event: PointerEvent) => {
            event.preventDefault();
            event.stopPropagation();

            this.isDraggingElement = true;
            this.dragTarget = element;

            // Calculate accurate offset from center of element
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            this.dragOffset = {
                x: event.clientX - centerX,
                y: event.clientY - centerY,
            };

            element.style.cursor = "grabbing";
            element.setPointerCapture(event.pointerId);

            element.addEventListener("pointermove", onEditorDragMove);
            element.addEventListener("pointerup", onEditorDragEnd);
        };

        const onEditorDragMove = (event: PointerEvent) => {
            if (!this.isDraggingElement || !this.dragTarget) return;

            event.preventDefault();

            const actualFrame = this.getPreviewFrameDimensions();
            const frameOffset = this.getPreviewFrameOffset();

            // Calculate new center position relative to the preview frame
            let centerX = event.clientX - this.dragOffset.x - frameOffset.x;
            let centerY = event.clientY - this.dragOffset.y - frameOffset.y;

            // Clamp center to actual frame bounds
            centerX = Math.max(0, Math.min(actualFrame.width, centerX));
            centerY = Math.max(0, Math.min(actualFrame.height, centerY));

            // Convert to absolute screen coordinates for positioning
            const absoluteCenterX = centerX + frameOffset.x;
            const absoluteCenterY = centerY + frameOffset.y;

            // Update element position based on type
            if (type === "joystick") {
                // Joystick uses left/bottom positioning with transform translate(-50%, 50%)
                this.dragTarget.style.left = `${absoluteCenterX}px`;
                this.dragTarget.style.bottom = `${window.innerHeight - absoluteCenterY}px`;
            } else if (type === "steeringWheel") {
                // Steering wheel uses left/bottom positioning with transform translate(-50%, 50%)
                this.dragTarget.style.left = `${absoluteCenterX}px`;
                this.dragTarget.style.bottom = `${window.innerHeight - absoluteCenterY}px`;
            } else if (type === "button") {
                // Button uses right/bottom positioning with transform translate(50%, 50%)
                this.dragTarget.style.right = `${window.innerWidth - absoluteCenterX}px`;
                this.dragTarget.style.bottom = `${window.innerHeight - absoluteCenterY}px`;
            }
        };

        const onEditorDragEnd = async (event: PointerEvent) => {
            if (!this.isDraggingElement || !this.dragTarget) return;

            // Calculate final position before cleanup
            const actualFrame = this.getPreviewFrameDimensions();
            const frameOffset = this.getPreviewFrameOffset();

            // Calculate center position relative to frame and clamp to bounds
            let centerX = event.clientX - this.dragOffset.x - frameOffset.x;
            let centerY = event.clientY - this.dragOffset.y - frameOffset.y;

            // Clamp center to actual frame bounds
            centerX = Math.max(0, Math.min(actualFrame.width, centerX));
            centerY = Math.max(0, Math.min(actualFrame.height, centerY));

            // Convert center position to normalized coordinates (0-1) relative to actual frame
            const normalizedX = centerX / actualFrame.width;
            const normalizedY = 1 - centerY / actualFrame.height;

            this.isDraggingElement = false;
            this.dragTarget.style.cursor = "grab";

            this.dragTarget.releasePointerCapture(event.pointerId);

            this.dragTarget = null;

            element.removeEventListener("pointermove", onEditorDragMove);
            element.removeEventListener("pointerup", onEditorDragEnd);

            if (type === "joystick") {
                await this.updateJoystickAttributeAndUI(normalizedX, normalizedY, deviceType, orientation);
                // Update TouchControls joystick position
                if (this.touchControls) {
                    this.touchControls.updateJoystickConfig({x: normalizedX, y: normalizedY});
                }
            } else if (type === "steeringWheel") {
                await this.updateSteeringWheelAttributeAndUI(normalizedX, normalizedY, deviceType, orientation);
                // Update TouchSteeringWheel position
                if (this.touchControls) {
                    this.touchControls.updateSteeringWheelConfig({x: normalizedX, y: normalizedY});
                }
            } else if (type === "button" && index !== undefined) {
                await this.updateButtonAttributeAndUI(normalizedX, normalizedY, deviceType, orientation, index);
                // Update TouchButton position
                if (this.touchControls) {
                    this.touchControls.updateButtonPosition(index, {x: normalizedX, y: normalizedY});
                }
            }
        };

        element.addEventListener("pointerdown", onEditorDragStart);
    }

    // Editor lifecycle methods
    onAdded(): void {
        void this.migrateAttributesIfNeeded();
    }

    onPanelShown(): void {
        // Update scaler config before creating controls
        this.scaler.updateConfig(this.getScalingConfig());

        // Initialize tracking for device type and orientation
        this.lastDeviceType = this.getActiveDeviceType();
        this.lastOrientation = this.getActiveOrientation();

        this.createPreviewFrame();
        this.initializePreview();
        window.addEventListener("resize", this.onResizeHandler);

        // Configure editor interaction without overriding visibility
        this.configureEditorInteraction(true);
    }

    onPanelHidden(): void {
        this.cleanup();
    }

    onAttributesUpdated(): void {
        // Update scaler config with new attributes
        this.scaler.updateConfig(this.getScalingConfig());

        // Only update preview frame if orientation or device type changed
        const currentDeviceType = this.getActiveDeviceType();
        const currentOrientation = this.getActiveOrientation();
        const shouldUpdateFrame =
            this.lastDeviceType !== currentDeviceType || this.lastOrientation !== currentOrientation;

        if (shouldUpdateFrame) {
            this.updatePreviewFrame();
            this.lastDeviceType = currentDeviceType;
            this.lastOrientation = currentOrientation;
        }

        // Recreate controls with new attributes
        this.cleanupControls();
        this.initializePreview();

        // Update positions to apply new scaler settings
        this.updateJoystickPosition();
        this.updateSteeringWheelPosition();
        this.updateButtonPositions();

        // Configure editor interaction without overriding visibility
        this.configureEditorInteraction(true);
    }

    cleanup(): void {
        window.removeEventListener("resize", this.onResizeHandler);
        this.cleanupControls();
        this.removePreviewFrame();
        this.isDraggingElement = false;
        this.dragTarget = null;
        this.dragOffset = {x: 0, y: 0};
        this.touchControls = null;
    }

    private cleanupControls(): void {
        if (this.joystick) {
            this.joystick.cleanup();
            this.joystick = null;
        }

        if (this.steeringWheel) {
            this.steeringWheel.cleanup();
            this.steeringWheel = null;
        }

        this.buttons.forEach(button => button.cleanup());
        this.buttons = [];
    }

    private async updateJoystickAttributeAndUI(
        normalizedX: number,
        normalizedY: number,
        deviceType: "mobile" | "tablet" | "desktop",
        orientation: "portrait" | "landscape",
    ): Promise<void> {
        const behaviorUIManager = global.app?.editor?.behaviorUIManager;
        if (!behaviorUIManager) {
            return;
        }

        const layoutKey = orientation === "portrait" ? `${deviceType}VerticalLayout` : `${deviceType}HorizontalLayout`;

        await behaviorUIManager.updateBehaviorField(`${layoutKey}.joystick.joystickPosition.x`, normalizedX);
        await behaviorUIManager.updateBehaviorField(`${layoutKey}.joystick.joystickPosition.y`, normalizedY);
    }

    private async updateSteeringWheelAttributeAndUI(
        normalizedX: number,
        normalizedY: number,
        deviceType: "mobile" | "tablet" | "desktop",
        orientation: "portrait" | "landscape",
    ): Promise<void> {
        const behaviorUIManager = global.app?.editor?.behaviorUIManager;
        if (!behaviorUIManager) {
            return;
        }

        const layoutKey = orientation === "portrait" ? `${deviceType}VerticalLayout` : `${deviceType}HorizontalLayout`;

        await behaviorUIManager.updateBehaviorField(`${layoutKey}.steeringWheel.steeringWheelPosition.x`, normalizedX);
        await behaviorUIManager.updateBehaviorField(`${layoutKey}.steeringWheel.steeringWheelPosition.y`, normalizedY);
    }

    private async updateButtonAttributeAndUI(
        normalizedX: number,
        normalizedY: number,
        deviceType: "mobile" | "tablet" | "desktop",
        orientation: "portrait" | "landscape",
        index?: number,
    ): Promise<void> {
        const behaviorUIManager = global.app?.editor?.behaviorUIManager;
        if (!behaviorUIManager || index === undefined) {
            return;
        }

        const layoutKey = orientation === "portrait" ? `${deviceType}VerticalLayout` : `${deviceType}HorizontalLayout`;

        await behaviorUIManager.updateBehaviorField(`${layoutKey}.buttons.${index}.buttonPosition.x`, normalizedX);
        await behaviorUIManager.updateBehaviorField(`${layoutKey}.buttons.${index}.buttonPosition.y`, normalizedY);
    }

    private getViewportDimensions(): ViewportDimensions {
        // Return fixed design dimensions for consistent element sizing
        const orientation = this.getActiveOrientation();
        if (orientation === "landscape") {
            return DESIGN_VIEWPORT_LANDSCAPE;
        } else {
            return DESIGN_VIEWPORT_PORTRAIT;
        }
    }

    private getPreviewFrameDimensions(): ViewportDimensions {
        // Return actual frame dimensions for positioning
        if (this.previewFrame) {
            const rect = this.previewFrame.getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height,
            };
        }

        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    }

    private getPreviewFrameOffset(): {x: number; y: number} {
        if (this.previewFrame) {
            const rect = this.previewFrame.getBoundingClientRect();
            return {
                x: rect.left,
                y: rect.top,
            };
        }

        return {x: 0, y: 0};
    }

    // Migrate old attribute structure to new multi-device structure
    // TODO: Remove this method in future version
    private async migrateAttributesIfNeeded(): Promise<void> {
        const attributes = this.touchControls.attributes;

        // Check if using old structure
        if (
            attributes.joystick &&
            attributes.buttons &&
            !attributes.mobileEnabled &&
            !attributes.mobileHorizontalLayout
        ) {
            console.info("[TouchControlsEditor] Migrating old attribute structure to new format");

            const deepClone = (obj: any): any => {
                if (obj === null || obj === undefined) return obj;
                if (Array.isArray(obj)) return obj.map(item => deepClone(item));
                if (typeof obj === "object") {
                    const cloned: any = {};
                    for (const key in obj) {
                        // eslint-disable-next-line no-prototype-builtins
                        if (obj.hasOwnProperty(key)) {
                            cloned[key] = deepClone(obj[key]);
                        }
                    }
                    return cloned;
                }
                return obj;
            };

            attributes.editorLayoutPreview = "mobile";
            attributes.editorLayoutOrientation = "landscape";

            const baseLayout = {
                scaling: attributes.scaling ? deepClone(attributes.scaling) : undefined,
                joystick: deepClone(attributes.joystick),
                buttons: deepClone(attributes.buttons),
            };

            attributes.mobileEnabled = true;
            attributes.mobileHorizontalLayout = deepClone(baseLayout);
            attributes.mobileVerticalLayout = deepClone(baseLayout);

            attributes.tabletEnabled = true;
            attributes.tabletHorizontalLayout = deepClone(baseLayout);
            attributes.tabletVerticalLayout = deepClone(baseLayout);

            attributes.desktopEnabled = attributes.onlyOnMobile ? false : true;
            attributes.desktopHorizontalLayout = deepClone(baseLayout);
            attributes.desktopVerticalLayout = deepClone(baseLayout);

            delete attributes.joystick;
            delete attributes.buttons;
            delete attributes.scaling;

            const behaviorUIManager = global.app?.editor?.behaviorUIManager;
            if (behaviorUIManager) {
                await behaviorUIManager.updateBehaviorField("editorLayoutPreview", attributes.editorLayoutPreview);
                await behaviorUIManager.updateBehaviorField(
                    "editorLayoutOrientation",
                    attributes.editorLayoutOrientation,
                );

                await behaviorUIManager.updateBehaviorField("mobileEnabled", attributes.mobileEnabled);
                await behaviorUIManager.updateBehaviorField(
                    "mobileHorizontalLayout",
                    attributes.mobileHorizontalLayout,
                );
                await behaviorUIManager.updateBehaviorField("mobileVerticalLayout", attributes.mobileVerticalLayout);

                await behaviorUIManager.updateBehaviorField("tabletEnabled", attributes.tabletEnabled);
                await behaviorUIManager.updateBehaviorField(
                    "tabletHorizontalLayout",
                    attributes.tabletHorizontalLayout,
                );
                await behaviorUIManager.updateBehaviorField("tabletVerticalLayout", attributes.tabletVerticalLayout);

                await behaviorUIManager.updateBehaviorField("desktopEnabled", attributes.desktopEnabled);
                await behaviorUIManager.updateBehaviorField(
                    "desktopHorizontalLayout",
                    attributes.desktopHorizontalLayout,
                );
                await behaviorUIManager.updateBehaviorField("desktopVerticalLayout", attributes.desktopVerticalLayout);

                await behaviorUIManager.updateBehaviorField("joystick", undefined);
                await behaviorUIManager.updateBehaviorField("buttons", undefined);
                await behaviorUIManager.updateBehaviorField("scaling", undefined);
            }
        }
    }

    private getActiveDeviceType(): DeviceType {
        return this.touchControls.attributes.editorLayoutPreview || "mobile";
    }

    private getActiveOrientation(): OrientationType {
        return this.touchControls.attributes.editorLayoutOrientation || "landscape";
    }

    private getDeviceConfig(deviceType: DeviceType): any {
        const attributes = this.touchControls.attributes;
        const enabledKey = `${deviceType}Enabled`;
        const verticalKey = `${deviceType}VerticalLayout`;
        const horizontalKey = `${deviceType}HorizontalLayout`;

        return {
            enabled: attributes[enabledKey] ?? false,
            verticalLayout: attributes[verticalKey],
            horizontalLayout: attributes[horizontalKey],
        };
    }

    private getActiveLayoutConfig(): LayoutConfig | null {
        const deviceType = this.getActiveDeviceType();
        const deviceConfig = this.getDeviceConfig(deviceType);

        if (!deviceConfig.enabled) {
            return null;
        }

        const orientation = this.getActiveOrientation();
        const layoutKey = orientation === "portrait" ? "verticalLayout" : "horizontalLayout";

        return deviceConfig[layoutKey] || null;
    }

    private getScalingConfig(): ScalingConfig {
        const layoutConfig = this.getActiveLayoutConfig();
        const scaling = layoutConfig?.scaling;
        const scaleMode = scaling?.scaleMode || ScaleMode.NONE;

        return {
            scaleMode: scaleMode,
            targetScreenWidth: scaling?.targetScreenWidth || 800,
            targetScreenHeight: scaling?.targetScreenHeight || 600,
        };
    }

    private initializePreview(): void {
        const layoutConfig = this.getActiveLayoutConfig();
        if (!layoutConfig) {
            return;
        }

        this.updateScalerSettings();
        this.createJoystick(layoutConfig);
        this.createSteeringWheel(layoutConfig);
        this.createButtons(layoutConfig);
    }

    private createJoystick(layoutConfig: LayoutConfig): void {
        if (!layoutConfig?.joystick) {
            return;
        }

        const joystickConfig: JoystickConfig = {
            ...layoutConfig.joystick,
            joystickDeadzone: layoutConfig.joystick.joystickDeadzone,
            joystickRunThreshold: layoutConfig.joystick.joystickRunThreshold,
        };

        const zIndex = getZIndexWithinHUD(HUD_Z_INDEX.AlwaysOnTopBase + 100, 99);
        const frameOffset = this.getPreviewFrameOffset();

        this.joystick = new TouchJoystick(
            joystickConfig,
            null, // No pointer manager in editor mode
            null, // No virtual dispatcher in editor mode
            this.touchControls.uuid,
            this.scaler,
            zIndex,
            frameOffset, // Pass frame offset for positioning
        );
        this.joystick.setVisibility(joystickConfig.joystickEnabled);
    }

    private createSteeringWheel(layoutConfig: LayoutConfig): void {
        if (!layoutConfig?.steeringWheel) {
            return;
        }

        // Convert position array to object if needed
        let position = layoutConfig.steeringWheel.steeringWheelPosition || {x: 0.5, y: 0.15};
        if (Array.isArray(position)) {
            position = {x: position[0] ?? 0.5, y: position[1] ?? 0.15};
        }

        const steeringWheelConfig: SteeringWheelConfig = {
            steeringWheelEnabled: layoutConfig.steeringWheel.steeringWheelEnabled ?? false,
            steeringWheelPosition: position,
            steeringWheelSize: layoutConfig.steeringWheel.steeringWheelSize ?? 120,
            steeringWheelSensitivity: layoutConfig.steeringWheel.steeringWheelSensitivity ?? 1,
            steeringWheelMaxRotation: layoutConfig.steeringWheel.steeringWheelMaxRotation ?? 90,
            steeringWheelReturnSpeed: layoutConfig.steeringWheel.steeringWheelReturnSpeed ?? 5,
            steeringWheelImage: layoutConfig.steeringWheel.steeringWheelImage,
        };

        const zIndex = getZIndexWithinHUD(HUD_Z_INDEX.AlwaysOnTopBase + 100, 99);
        const frameOffset = this.getPreviewFrameOffset();

        this.steeringWheel = new TouchSteeringWheel(
            steeringWheelConfig,
            null, // No pointer manager in editor mode
            null, // No virtual dispatcher in editor mode
            this.touchControls.uuid,
            this.scaler,
            zIndex,
            frameOffset, // Pass frame offset for positioning
        );
        this.steeringWheel.setVisibility(steeringWheelConfig.steeringWheelEnabled);
    }

    private createButtons(layoutConfig: LayoutConfig): void {
        const buttonConfigs: ButtonConfig[] | null = layoutConfig?.buttons || null;
        if (!buttonConfigs || buttonConfigs.length === 0) {
            return;
        }

        const zIndex = getZIndexWithinHUD(HUD_Z_INDEX.AlwaysOnTopBase + 100, 99);
        const frameOffset = this.getPreviewFrameOffset();

        buttonConfigs.forEach((config, index) => {
            const button = new TouchButton(
                config,
                index,
                null, // No pointer manager in editor mode
                this.touchControls.uuid,
                () => {}, // No-op callbacks in editor mode
                () => {},
                this.scaler,
                zIndex,
                frameOffset, // Pass frame offset for positioning
            );

            button.setVisibility(config.buttonEnabled);
            this.buttons.push(button);
        });
    }

    private onResize(): void {
        this.updatePreviewFrame();
        this.updateScalerSettings();

        // Update frame offset in elements
        const frameOffset = this.getPreviewFrameOffset();
        if (this.joystick) {
            this.joystick.updateFrameOffset(frameOffset);
        }
        if (this.steeringWheel) {
            this.steeringWheel.updateFrameOffset(frameOffset);
        }
        this.buttons.forEach(button => {
            button.updateFrameOffset(frameOffset);
        });

        this.updateJoystickPosition();
        this.updateSteeringWheelPosition();
        this.updateButtonPositions();
    }

    private updateScalerSettings(): void {
        const designViewport = this.getViewportDimensions();
        this.scaler.setViewportOverride(designViewport);

        const actualFrame = this.getPreviewFrameDimensions();
        this.scaler.setActualViewportOverride(actualFrame);

        const deviceType = this.getActiveDeviceType();
        const dpiOverride = this.getDeviceTypicalDpi(deviceType);
        this.scaler.setDpiOverride(dpiOverride);
    }

    private updateJoystickPosition(): void {
        if (this.joystick) {
            this.joystick.updatePosition();
        }
    }

    private updateSteeringWheelPosition(): void {
        if (this.steeringWheel) {
            this.steeringWheel.updatePosition();
        }
    }

    private updateButtonPositions(): void {
        this.buttons.forEach(button => {
            button.updatePosition();
        });
    }

    private createPreviewFrame(): void {
        if (this.previewFrame) {
            return;
        }

        const frame = document.createElement("div");
        frame.id = "touch-controls-preview-frame";
        frame.style.cssText = this.getPreviewFrameStyles();

        document.body.appendChild(frame);
        this.previewFrame = frame;
    }

    private updatePreviewFrame(): void {
        if (!this.previewFrame) {
            return;
        }

        this.previewFrame.style.cssText = this.getPreviewFrameStyles();
    }

    private removePreviewFrame(): void {
        if (this.previewFrame) {
            this.previewFrame.remove();
            this.previewFrame = null;
        }
    }

    private getPreviewFrameStyles(): string {
        const orientation = this.getActiveOrientation();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Calculate frame dimensions based on orientation
        let frameWidth: number;
        let frameHeight: number;

        if (orientation === "landscape") {
            // 16:9 aspect ratio
            const aspectRatio = 16 / 9;

            // Try to fit by height first
            frameHeight = Math.min(viewportHeight * 0.8, 800);
            frameWidth = frameHeight * aspectRatio;

            // If too wide, fit by width
            if (frameWidth > viewportWidth * 0.9) {
                frameWidth = viewportWidth * 0.9;
                frameHeight = frameWidth / aspectRatio;
            }
        } else {
            // 9:16 aspect ratio (portrait)
            const aspectRatio = 9 / 16;

            // Try to fit by height first
            frameHeight = Math.min(viewportHeight * 0.9, 1000);
            frameWidth = frameHeight * aspectRatio;

            // If too wide, fit by width
            if (frameWidth > viewportWidth * 0.8) {
                frameWidth = viewportWidth * 0.8;
                frameHeight = frameWidth / aspectRatio;
            }
        }

        return `
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: ${frameWidth}px;
            height: ${frameHeight}px;
            border: 2px solid rgba(0, 100, 255, 0.5);
            border-radius: 8px;
            pointer-events: none;
            z-index: ${HUD_Z_INDEX.AlwaysOnTopBase + 101};
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
        `;
    }

    private getDeviceTypicalDpi(deviceType: DeviceType): number {
        switch (deviceType) {
            case "mobile":
                return 6.0;
            case "tablet":
                return 3.0;
            default:
                return 2;
        }
    }

    private configureEditorInteraction(enableEditorMode: boolean): void {
        const opacity = enableEditorMode ? "0.7" : "1.0";
        const pointerEvents = enableEditorMode ? "auto" : "auto";

        if (this.joystick?.joystickElement && this.joystick.getVisibility()) {
            this.joystick.joystickElement.style.opacity = opacity;
            this.joystick.joystickElement.style.pointerEvents = pointerEvents;
            this.joystick.joystickElement.style.cursor = enableEditorMode ? "grab" : "auto";

            if (enableEditorMode) {
                const deviceType = this.getActiveDeviceType();
                const orientation = this.getActiveOrientation();
                this.setupDragEvents(this.joystick.joystickElement, "joystick", deviceType, orientation);
            }
        }

        if (this.steeringWheel?.wheelElement && this.steeringWheel.getVisibility()) {
            this.steeringWheel.wheelElement.style.opacity = opacity;
            this.steeringWheel.wheelElement.style.pointerEvents = pointerEvents;
            this.steeringWheel.wheelElement.style.cursor = enableEditorMode ? "grab" : "auto";

            if (enableEditorMode) {
                const deviceType = this.getActiveDeviceType();
                const orientation = this.getActiveOrientation();
                this.setupDragEvents(this.steeringWheel.wheelElement, "steeringWheel", deviceType, orientation);
            }
        }

        this.buttons.forEach((button, index) => {
            if (!button.getVisibility()) return;

            button.element.style.opacity = opacity;
            button.element.style.pointerEvents = pointerEvents;
            button.element.style.cursor = enableEditorMode ? "grab" : "pointer";

            if (enableEditorMode) {
                const deviceType = this.getActiveDeviceType();
                const orientation = this.getActiveOrientation();
                this.setupDragEvents(button.element, "button", deviceType, orientation, index);
            }
        });
    }
}

export default TouchControlsEditor;
