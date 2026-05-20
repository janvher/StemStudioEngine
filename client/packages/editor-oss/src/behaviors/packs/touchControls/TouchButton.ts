import {BUTTONS_PRIORITY} from "./TouchControls";
import {buttonBaseCss, buttonNoImgCss, commonImageCss} from "./TouchControls.style";
import {TouchControlsScaler} from "./TouchControlsScaling";
import {type PointerEventHandler, PointerEventManager} from "../../../controls/input/PointerEventManager";

export interface ButtonConfig {
    buttonId?: string;
    buttonEnabled: boolean;
    buttonPosition: {x: number; y: number};
    buttonSize: number;
    buttonType: "jump" | "interact" | "customEvent" | "customInput";
    customInputName?: string;
    onButtonPress?: string;
    onButtonRelease?: string;
    buttonImage?: string;
}

class TouchButton {
    config: ButtonConfig;
    element!: HTMLElement;
    isPressed: boolean = false;
    isVisible: boolean = true;
    isInteractive: boolean = true;
    index: number;
    private pointerManager: PointerEventManager | null;
    private parentUuid: string;
    private onPressCallback: (config: ButtonConfig) => void;
    private onReleaseCallback: (config: ButtonConfig) => void;
    private scaler: TouchControlsScaler;
    private buttonHandler: PointerEventHandler | null = null;
    private handlerRegistered: boolean = false;
    private baseTransform: string = "";
    private zIndex: number;
    private frameOffset: {x: number; y: number};

    constructor(
        config: ButtonConfig,
        index: number,
        pointerManager: PointerEventManager | null,
        parentUuid: string,
        onPress: (config: ButtonConfig) => void,
        onRelease: (config: ButtonConfig) => void,
        scaler: TouchControlsScaler,
        zIndex: number,
        frameOffset: {x: number; y: number} = {x: 0, y: 0},
    ) {
        this.config = config;
        this.index = index;
        this.pointerManager = pointerManager;
        this.parentUuid = parentUuid;
        this.onPressCallback = onPress;
        this.onReleaseCallback = onRelease;
        this.scaler = scaler;
        this.zIndex = zIndex;
        this.frameOffset = frameOffset;
        this.setupEvents();
        this.createElement();
    }

    setVisibility(visible: boolean, globalVisible: boolean = true): void {
        this.isVisible = visible;
        const shouldShow = visible && globalVisible;

        this.element.style.opacity = shouldShow ? "1" : "0";
        this.element.style.pointerEvents = shouldShow ? "auto" : "none";
        this.element.style.display = shouldShow ? "flex" : "none";

        // Register/unregister event handler based on visibility AND interactivity
        if (shouldShow && this.isInteractive) {
            this.registerEventHandler();
        } else {
            this.unregisterEventHandler();
        }
    }

    getVisibility(): boolean {
        return this.isVisible;
    }

    getInteractivity(): boolean {
        return this.isInteractive;
    }

    updatePosition(): void {
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
        };

        const position = this.convertPosition(this.config.buttonPosition);
        const size = this.convertSize(this.config.buttonSize);

        // Apply frame offset to position
        const absoluteX = position.x + this.frameOffset.x;
        const absoluteY = position.y + this.frameOffset.y;

        this.element.style.right = `${viewport.width - absoluteX}px`;
        this.element.style.bottom = `${absoluteY}px`;
        this.element.style.width = `${size}px`;
        this.element.style.height = `${size}px`;
    }

    updateConfig(newPosition: {x: number; y: number}): void {
        this.config.buttonPosition = newPosition;
        this.updatePosition();
    }

    updateFrameOffset(frameOffset: {x: number; y: number}): void {
        this.frameOffset = frameOffset;
        this.updatePosition();
    }

    setInteractive(interactive: boolean): void {
        this.isInteractive = interactive;

        if (interactive) {
            this.element.style.pointerEvents = "auto";
            this.element.style.opacity = "1";

            // Register event handler if button is visible
            if (this.isVisible) {
                this.registerEventHandler();
            }
        } else {
            this.element.style.pointerEvents = "none";
            this.element.style.opacity = "0.5";

            // Reset any active state when disabling interaction
            if (this.isPressed) {
                this.isPressed = false;
                this.animateRelease();
            }

            // Unregister event handler to completely disable interaction
            this.unregisterEventHandler();
        }
    }

    cleanup(): void {
        // Reset any active animations before cleanup
        if (this.isPressed) {
            this.onReleaseCallback(this.config);
            this.isPressed = false;
            this.animateRelease();
        }

        this.unregisterEventHandler();
        this.element.remove();
    }

    private animatePress(): void {
        // Scale up the button by 15% when pressed
        this.element.style.transform = `${this.baseTransform} scale(1.2)`;
    }

    private animateRelease(): void {
        // Return to original size
        this.element.style.transform = this.baseTransform;
    }

    private createElement(): void {
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
        };

        const position = this.convertPosition(this.config.buttonPosition);
        const size = this.convertSize(this.config.buttonSize);

        // Apply frame offset to position
        const absolutePosition = {
            x: position.x + this.frameOffset.x,
            y: position.y + this.frameOffset.y,
        };

        this.element = document.createElement("div");
        this.element.id = `mobile-controls-button-${this.index}`;

        let btnBg = buttonBaseCss(size, absolutePosition, viewport.width, this.zIndex);
        if (this.config.buttonImage) {
            btnBg += commonImageCss(this.config.buttonImage);
        } else {
            btnBg += buttonNoImgCss;
        }
        this.element.style.cssText = btnBg;

        // Store the base transform for animations
        this.baseTransform = "translate(50%, 50%)";

        document.body.appendChild(this.element);

        // Register event handler immediately after element creation if needed
        if (this.isVisible && this.isInteractive && this.pointerManager) {
            this.registerEventHandler();
        }
    }

    private convertPosition(position: {x: number; y: number}) {
        return this.scaler.scalePosition(position);
    }

    private convertSize(size: number) {
        return this.scaler.scaleSize(size);
    }

    private setupEvents(): void {
        // Skip event setup if pointerManager is not available (e.g., in editor mode)
        if (!this.pointerManager) {
            return;
        }

        // Create the handler but don't register it yet
        this.buttonHandler = {
            onPointerDown: () => {
                if (!this.isPressed) {
                    this.isPressed = true;
                    this.animatePress();
                    this.onPressCallback(this.config);
                }
                return true;
            },
            onPointerUp: () => {
                if (this.isPressed) {
                    this.isPressed = false;
                    this.animateRelease();
                    this.onReleaseCallback(this.config);
                }
                return true;
            },
        };
    }

    private registerEventHandler(): void {
        if (this.pointerManager && this.buttonHandler && !this.handlerRegistered) {
            this.pointerManager.registerHandler(
                `touch-controls-button-${this.config.buttonId || this.index}`,
                this.buttonHandler,
                this.element,
                BUTTONS_PRIORITY,
            );
            this.handlerRegistered = true;
        }
    }

    private unregisterEventHandler(): void {
        if (this.pointerManager && this.handlerRegistered) {
            this.pointerManager.unregisterHandler(`touch-controls-button-${this.config.buttonId || this.index}`);
            this.handlerRegistered = false;
        }
    }
}

export default TouchButton;
