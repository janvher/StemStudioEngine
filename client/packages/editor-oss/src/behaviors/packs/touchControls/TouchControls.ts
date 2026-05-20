import { Object3D } from "three";

import TouchButton, {ButtonConfig} from "./TouchButton";
import TouchControlsEditor from "./TouchControlsEditor";
import {ScaleMode, ScalingConfig, TouchControlsScaler} from "./TouchControlsScaling";
import TouchJoystick, {type JoystickConfig} from "./TouchJoystick";
import TouchSteeringWheel, {type SteeringWheelConfig} from "./TouchSteeringWheel";
import {VirtualInputDispatcher} from "../../../controls/input/InputManager";
import {PointerEventManager} from "../../../controls/input/PointerEventManager";
import { HUD_Z_INDEX } from "@stem/editor-oss/editor/assets/v2/HUD/HUDView/services";
import {BehaviorBase, BehaviorOptions} from "../../Behavior";
import EventBus from "../../event/EventBus";
import GameManager from "../../game/GameManager";

interface ButtonShowEvent {
    buttonIndex?: number;
    buttonType?: "jump" | "interact" | "customEvent" | "customInput";
    buttonId?: string;
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type OrientationType = 'portrait' | 'landscape';

export interface LayoutConfig {
    scaling?: {
        scaleMode: string;
        targetScreenWidth: number;
        targetScreenHeight: number;
    };
    joystick?: JoystickConfig;
    steeringWheel?: SteeringWheelConfig;
    buttons?: ButtonConfig[];
}

export const BUTTONS_PRIORITY = -998;
export const JOYSTICK_PRIORITY = -999;

class TouchControls extends BehaviorBase {
    game: GameManager | null = null;
    private virtualDispatcher: VirtualInputDispatcher | null = null;
    private pointerManager!: PointerEventManager;
    private isInitialized = false;
    private joystick: TouchJoystick | null = null;
    private steeringWheel: TouchSteeringWheel | null = null;
    private buttons: TouchButton[] = [];
    private controlsEditor: TouchControlsEditor | null = null;
    private isControlsVisible: boolean = false;
    private scaler: TouchControlsScaler;
    private currentDeviceType: DeviceType | null = null;
    private currentOrientation: OrientationType | null = null;
    private resizeTimeoutId: number | null = null;

    private onResizeHandler: () => void;

    private onShowButtonHandler: (topic: string, data: any) => void;
    private onHideButtonHandler: (topic: string, data: any) => void;
    private onToggleButtonHandler: (topic: string, data: any) => void;
    private onShowJoystickHandler: (topic: string, data: any) => void;
    private onHideJoystickHandler: (topic: string, data: any) => void;
    private onShowSteeringWheelHandler: (topic: string, data: any) => void;
    private onHideSteeringWheelHandler: (topic: string, data: any) => void;
    private onEnableHandler: (topic: string, data: any) => void;
    private onDisableHandler: (topic: string, data: any) => void;
    private onToggleVisibilityHandler: (topic: string, data: {visible: boolean}) => void;

    private eventTokens: string[] = [];

    constructor(target:Object3D, id: string, options: BehaviorOptions) {
        super(target, id, options);

        this.onResizeHandler = this.onResize.bind(this);
        this.onShowButtonHandler = this.onShowButton.bind(this);
        this.onHideButtonHandler = this.onHideButton.bind(this);
        this.onToggleButtonHandler = this.onToggleButton.bind(this);
        this.onShowJoystickHandler = this.onShowJoystick.bind(this);
        this.onHideJoystickHandler = this.onHideJoystick.bind(this);
        this.onShowSteeringWheelHandler = this.onShowSteeringWheel.bind(this);
        this.onHideSteeringWheelHandler = this.onHideSteeringWheel.bind(this);
        this.onEnableHandler = this.onEnable.bind(this);
        this.onDisableHandler = this.onDisable.bind(this);
        this.onToggleVisibilityHandler = this.controlsVisibilityHandler.bind(this);

        this.scaler = new TouchControlsScaler(this.getScalingConfig());
    }

    init(game: GameManager) {
        this.game = game;
        this.pointerManager = game.pointerEventManager;
        this.virtualDispatcher = game.inputManager.getVirtualDispatcher();
    }

    update(deltaTime: number) {
        if (!this.isInitialized || !this.game || deltaTime <= 0) {
            return;
        }

        if (this.steeringWheel) {
            this.steeringWheel.update(deltaTime);
        }
    }

    onStart(): void {
        this.currentDeviceType = this.detectDeviceType();
        this.currentOrientation = this.detectOrientation();
        
        const deviceConfig = this.getDeviceConfig(this.currentDeviceType);
        
        // Only initialize controls if enabled for current device
        if (!deviceConfig.enabled) {
            return;
        }

        this.initializeControls();
        window.addEventListener("resize", this.onResizeHandler);

        this.subscribeToEvents();
    }

    onStop(): void {
        if (this.joystick) {
            this.joystick.resetToNeutral();
        }

        window.removeEventListener("resize", this.onResizeHandler);

        this.unsubscribeFromEvents();
        this.cleanup();
    }

    // Editor methods
    onEditorAdded?(): void {
        if (!this.controlsEditor) {
            this.controlsEditor = new TouchControlsEditor(this);
        }
        this.controlsEditor.onAdded();
    }

    onEditorPanelShown?(): void {
        this.controlsEditor = new TouchControlsEditor(this);
        this.controlsEditor.onPanelShown();
    }

    onEditorPanelHidden?(): void {
        if (this.controlsEditor) {
            this.controlsEditor.onPanelHidden();
            this.controlsEditor = null;
        }
    }

    onEditorDispose?(): void {
        if (this.controlsEditor) {
            this.controlsEditor.cleanup();
            this.controlsEditor = null;
        }
    }

    onEditorAttributesUpdated?(): void {
        if (this.controlsEditor) {
            this.controlsEditor.onAttributesUpdated();
        }
    }

    private subscribeToEvents(): void {
        this.eventTokens = [
            EventBus.instance.subscribe("touchControls:showButton", this.onShowButtonHandler),
            EventBus.instance.subscribe("touchControls:hideButton", this.onHideButtonHandler),
            EventBus.instance.subscribe("touchControls:toggleButton", this.onToggleButtonHandler),
            EventBus.instance.subscribe("touchControls:showJoystick", this.onShowJoystickHandler),
            EventBus.instance.subscribe("touchControls:hideJoystick", this.onHideJoystickHandler),
            EventBus.instance.subscribe("touchControls:showSteeringWheel", this.onShowSteeringWheelHandler),
            EventBus.instance.subscribe("touchControls:hideSteeringWheel", this.onHideSteeringWheelHandler),
            EventBus.instance.subscribe("touchControls:enable", this.onEnableHandler),
            EventBus.instance.subscribe("touchControls:disable", this.onDisableHandler),
            EventBus.instance.subscribe("touchControls:toggleVisibility", this.onToggleVisibilityHandler),
        ];
    }

    private unsubscribeFromEvents(): void {
        this.eventTokens.forEach(token => {
            EventBus.instance.unsubscribe(token);
        });
        this.eventTokens = [];
    }

    private detectDeviceType(): DeviceType {
        const userAgent = navigator.userAgent;
        const isTouchDevice = navigator.maxTouchPoints > 0;
        
        // Mobile: phones
        if (/iPhone|iPod|Android.*Mobile|Windows Phone/i.test(userAgent)) {
            return 'mobile';
        }
        
        // Tablet: iPad or Android tablets
        if (/iPad/i.test(userAgent) || /Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) {
            return 'tablet';
        }
        
        // iPad with desktop UA (iPadOS 13+): Safari reports as Mac with touch support
        if (isTouchDevice && /Macintosh/i.test(userAgent) && (/Safari/i.test(userAgent) || /AppleWebKit/i.test(userAgent))) {
            return 'tablet';
        }
        
        // Desktop: everything else
        return 'desktop';
    }

    private detectOrientation(): OrientationType {
        return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    }

    private getDeviceConfig(deviceType: DeviceType): any {
        const enabledKey = `${deviceType}Enabled`;
        const verticalKey = `${deviceType}VerticalLayout`;
        const horizontalKey = `${deviceType}HorizontalLayout`;
        
        return {
            enabled: this.attributes[enabledKey] ?? false,
            verticalLayout: this.attributes[verticalKey],
            horizontalLayout: this.attributes[horizontalKey],
        };
    }

    private getActiveLayoutConfig(): LayoutConfig | null {
        const deviceConfig = this.getDeviceConfig(this.currentDeviceType!);
        
        if (!deviceConfig.enabled) {
            return null;
        }

        const orientation = this.detectOrientation();
        const layoutKey = orientation === 'portrait' ? 'verticalLayout' : 'horizontalLayout';
        
        return deviceConfig[layoutKey] || null;
    }

    private enableControls(): void {
        if (this.joystick) {
            this.joystick.setInteractive(true);
        }

        if (this.steeringWheel) {
            this.steeringWheel.setInteractive(true);
        }

        this.buttons.forEach(button => {
            button.setInteractive(true);
        });
    }

    private disableControls(): void {
        if (this.joystick) {
            this.joystick.setInteractive(false);
        }

        if (this.steeringWheel) {
            this.steeringWheel.setInteractive(false);
        }

        this.buttons.forEach(button => {
            button.setInteractive(false);
        });
    }

    private initializeControls(): void {
        const layoutConfig = this.getActiveLayoutConfig();
        if (!layoutConfig) {
            return;
        }
        
        this.scaler.updateConfig(this.getScalingConfig());
        
        this.createJoystick(layoutConfig);
        this.createSteeringWheel(layoutConfig);
        this.createButtons(layoutConfig);
        this.isInitialized = true;
        this.isControlsVisible = true;
    }

    private setControlsVisibility(visible: boolean): void {
        if (this.joystick) {
            this.joystick.setVisibility(visible);
        }
        if (this.steeringWheel) {
            this.steeringWheel.setVisibility(visible);
        }

        this.buttons.forEach(button => {
            button.setVisibility(button.getVisibility(), visible);
        });
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

    private createJoystick(layoutConfig: LayoutConfig): void {
        if (!layoutConfig?.joystick) {
            return;
        }

        const joystickConfig: JoystickConfig = {
            ...layoutConfig.joystick,
            joystickDeadzone: layoutConfig.joystick.joystickDeadzone,
            joystickRunThreshold: layoutConfig.joystick.joystickRunThreshold,
        };

        this.joystick = new TouchJoystick(
            joystickConfig,
            this.pointerManager || null,
            this.virtualDispatcher,
            this.uuid,
            this.scaler,
            HUD_Z_INDEX.TouchJoystick,
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

        this.steeringWheel = new TouchSteeringWheel(
            steeringWheelConfig,
            this.pointerManager || null,
            this.virtualDispatcher,
            this.uuid,
            this.scaler,
            HUD_Z_INDEX.TouchJoystick,
        );
        this.steeringWheel.setVisibility(steeringWheelConfig.steeringWheelEnabled);
    }

    private createButtons(layoutConfig: LayoutConfig): void {
        const buttonConfigs: ButtonConfig[] | null = layoutConfig?.buttons || null;
        if (!buttonConfigs || buttonConfigs.length === 0) {
            return;
        }

        buttonConfigs.forEach((config, index) => {
            const button = new TouchButton(
                config,
                index,
                this.pointerManager || null,
                this.uuid,
                this.handleButtonPress.bind(this),
                this.handleButtonRelease.bind(this),
                this.scaler,
                HUD_Z_INDEX.TouchButtons,
            );

            button.setVisibility(config.buttonEnabled);
            this.buttons.push(button);
        });
    }

    private onResize(): void {
        // Clear previous timeout to debounce rapid resize events
        if (this.resizeTimeoutId !== null) {
            clearTimeout(this.resizeTimeoutId);
        }

        // Debounce resize handling to avoid rapid recreation during orientation change
        this.resizeTimeoutId = window.setTimeout(() => {
            this.resizeTimeoutId = null;
            this.handleResize();
        }, 100);
    }

    private handleResize(): void {
        const newOrientation = this.detectOrientation();

        if (newOrientation !== this.currentOrientation) {
            this.cleanupControls();
            
            this.currentOrientation = newOrientation;
            
            // Re-create controls with new orientation layout
            const layoutConfig = this.getActiveLayoutConfig();
            if (layoutConfig) {
                this.createJoystick(layoutConfig);
                this.createSteeringWheel(layoutConfig);
                this.createButtons(layoutConfig);
                this.isInitialized = true;
                this.isControlsVisible = true;
            } else {
                // No valid layout config
                this.isInitialized = false;
                this.isControlsVisible = false;
            }
            return;
        }

        // Just update positions if nothing changed
        if (this.isInitialized) {
            this.updateJoystickPosition();
            this.updateSteeringWheelPosition();
            this.updateButtonPositions();
        }
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

    private handleButtonPress(config: ButtonConfig): void {
        if (!this.virtualDispatcher) return;

        switch (config.buttonType) {
            case "jump":
                this.virtualDispatcher.dispatchButton("jump", true);
                break;
            case "interact":
                this.virtualDispatcher.dispatchButton("interact", true);
                break;
            case "customInput":
                if (config.customInputName?.trim()) {
                    this.virtualDispatcher.dispatchButton(config.customInputName.trim(), true);
                }
                break;
            case "customEvent":
                if (config.onButtonPress) {
                    const player = this.game?.player;
                    EventBus.instance.send(config.onButtonPress, {target: player});
                }
                break;
        }
    }

    private handleButtonRelease(config: ButtonConfig): void {
        if (!this.virtualDispatcher) return;

        switch (config.buttonType) {
            case "jump":
                this.virtualDispatcher.dispatchButton("jump", false);
                break;
            case "interact":
                this.virtualDispatcher.dispatchButton("interact", false);
                break;
            case "customInput":
                if (config.customInputName?.trim()) {
                    this.virtualDispatcher.dispatchButton(config.customInputName.trim(), false);
                }
                break;
            case "customEvent":
                if (config.onButtonRelease) {
                    const player = this.game?.player;
                    EventBus.instance.send(config.onButtonRelease, {target: player});
                }
                break;
        }
    }

    private onShowButton(topic: string, data: any): void {
        const button = this.getButtonByEventData(data);
        if (button) {
            button.setVisibility(true, this.isControlsVisible);
        }
    }

    private onHideButton(topic: string, data: any): void {
        const button = this.getButtonByEventData(data);
        if (button) {
            button.setVisibility(false, this.isControlsVisible);
        }
    }

    private onToggleButton(topic: string, data: any): void {
        const button = this.getButtonByEventData(data);

        if (button) {
            button.setVisibility(!button.getVisibility(), this.isControlsVisible);
        }
    }

    private onShowJoystick(topic: string, data: any): void {
        if (this.joystick) {
            this.joystick.setVisibility(true);
        }
    }

    private onHideJoystick(topic: string, data: any): void {
        if (this.joystick) {
            this.joystick.setVisibility(false);
        }
    }

    private onShowSteeringWheel(topic: string, data: any): void {
        if (this.steeringWheel) {
            this.steeringWheel.setVisibility(true);
        }
    }

    private onHideSteeringWheel(topic: string, data: any): void {
        if (this.steeringWheel) {
            this.steeringWheel.setVisibility(false);
        }
    }

    private controlsVisibilityHandler(topic: string, data: {visible: boolean}): void {
        if (this.joystick) {
            this.joystick.setVisibility(data.visible);
        }
        if (this.steeringWheel) {
            this.steeringWheel.setVisibility(data.visible);
        }

        this.buttons.forEach(button => {
            button.setVisibility(button.getVisibility(), data.visible);
        });
    }

    private onEnable(topic: string, data: any): void {
        this.enableControls();
    }

    private onDisable(topic: string, data: any): void {
        this.disableControls();
    }

    private getButtonByEventData(data: ButtonShowEvent): TouchButton | null {
        if (data.buttonId) {
            return this.buttons.find(button => button.config.buttonId === data.buttonId) || null;
        } else if (data.buttonIndex !== undefined && data.buttonIndex >= 0 && data.buttonIndex < this.buttons.length) {
            return this.buttons[data.buttonIndex] || null;
        } else if (data.buttonType) {
            return this.buttons.find(button => button.config.buttonType === data.buttonType) || null;
        }
        return null;
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

    private cleanup(): void {
        // Clear any pending resize timeout
        if (this.resizeTimeoutId !== null) {
            clearTimeout(this.resizeTimeoutId);
            this.resizeTimeoutId = null;
        }

        if (this.controlsEditor) {
            this.controlsEditor.cleanup();
        }

        this.cleanupControls();
        this.eventTokens = [];

        this.virtualDispatcher = null;

        this.isInitialized = false;
        this.isControlsVisible = false;
    }

}

export default TouchControls;
