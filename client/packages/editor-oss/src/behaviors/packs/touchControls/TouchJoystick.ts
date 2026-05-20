import {JOYSTICK_PRIORITY} from "./TouchControls";
import {
    commonImageCss,
    joystickBackgroundBaseCss,
    joystickBackgroundNoImageCss,
    joystickInnerCircleBaseCss,
    joystickInnerNoImgCss,
} from "./TouchControls.style";
import {TouchControlsScaler} from "./TouchControlsScaling";
import {VirtualInputDispatcher} from "../../../controls/input/InputManager";
import {type PointerEventHandler, PointerEventManager} from "../../../controls/input/PointerEventManager";

export interface JoystickConfig {
    joystickEnabled: boolean;
    joystickPosition: {x: number; y: number};
    joystickSize: number;
    joystickBackgroundImage?: string;
    joystickHandleImage?: string;
    joystickHandleScale?: number;
    joystickDeadzone?: number;
    joystickRunThreshold?: number;
}

class TouchJoystick {
    config: JoystickConfig;
    private element: HTMLElement | null = null;
    private handle: HTMLElement | null = null;
    private isDragging: boolean = false;
    private radius: number = 0;
    private maxDistance: number = 0;
    private currentDirection = {x: 0, y: 0};
    private currentDistance: number = 0;
    private currentPointerId: number | null = null;
    private isVisible: boolean = true;
    private isInteractive: boolean = true;
    private parentUuid: string;
    private pointerManager: PointerEventManager | null;
    private virtualDispatcher: VirtualInputDispatcher | null;
    private scaler: TouchControlsScaler;
    private joystickHandler: PointerEventHandler | null = null;
    private handlerRegistered: boolean = false;
    private zIndex: number;
    private frameOffset: {x: number; y: number};

    constructor(
        config: JoystickConfig,
        pointerManager: PointerEventManager | null,
        virtualDispatcher: VirtualInputDispatcher | null,
        parentUuid: string,
        scaler: TouchControlsScaler,
        zIndex: number,
        frameOffset: {x: number; y: number} = {x: 0, y: 0},
    ) {
        this.config = config;
        this.pointerManager = pointerManager;
        this.virtualDispatcher = virtualDispatcher;
        this.parentUuid = parentUuid;
        this.scaler = scaler;
        this.zIndex = zIndex;
        this.frameOffset = frameOffset;
        this.setupEvents();
        this.createElements();
    }

    setVisibility(visible: boolean): void {
        this.isVisible = visible;

        if (this.element) {
            this.element.style.opacity = visible ? "1" : "0";
            this.element.style.pointerEvents = visible ? "auto" : "none";
            this.element.style.display = visible ? "flex" : "none";
        }

        // Register/unregister event handler based on visibility AND interactivity
        if (visible && this.isInteractive) {
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
        if (!this.element) return;
        const position = this.convertPosition(this.config.joystickPosition);
        const size = this.convertSize(this.config.joystickSize);

        // Update joystick position and size with frame offset
        this.element.style.left = `${position.x + this.frameOffset.x}px`;
        this.element.style.bottom = `${position.y + this.frameOffset.y}px`;
        this.element.style.width = `${size}px`;
        this.element.style.height = `${size}px`;

        // Recalculate joystick parameters
        const rect = this.element.getBoundingClientRect();
        this.radius = Math.min(rect.width, rect.height) / 2;
        this.maxDistance = this.radius * 0.8;
    }

    updateConfig(newPosition: {x: number; y: number}): void {
        this.config.joystickPosition = newPosition;
        this.updatePosition();
    }

    updateFrameOffset(frameOffset: {x: number; y: number}): void {
        this.frameOffset = frameOffset;
        this.updatePosition();
    }

    setInteractive(interactive: boolean): void {
        this.isInteractive = interactive;

        if (!this.element) return;

        if (interactive) {
            this.element.style.pointerEvents = "auto";
            this.element.style.opacity = "1";

            // Register event handler if joystick is visible
            if (this.isVisible) {
                this.registerEventHandler();
            }
        } else {
            this.element.style.pointerEvents = "none";
            this.element.style.opacity = "0.5";

            // Reset to neutral when disabling interaction
            this.resetToNeutral();

            // Reset visual state
            if (this.handle) {
                this.handle.style.left = "50%";
                this.handle.style.top = "50%";
            }

            this.isDragging = false;
            this.currentPointerId = null;

            // Unregister event handler to completely disable interaction
            this.unregisterEventHandler();
        }
    }

    resetToNeutral(): void {
        if (this.virtualDispatcher) {
            this.virtualDispatcher.dispatchAxis("move", {x: 0, y: 0});
            this.virtualDispatcher.dispatchButton("run", false);
        }

        this.currentDirection.x = 0;
        this.currentDirection.y = 0;
        this.currentDistance = 0;
    }

    cleanup(): void {
        // Force end any active drag before cleanup
        if (this.isDragging && this.currentPointerId !== null) {
            this.onJoystickEnd();
        }

        this.unregisterEventHandler();

        if (this.element) {
            this.element.remove();
            this.element = null;
        }

        this.handle = null;
        this.resetToNeutral();
        this.isDragging = false;
        this.currentPointerId = null;
    }

    get joystickElement(): HTMLElement | null {
        return this.element;
    }

    private createElements(): void {
        const position = this.convertPosition(this.config.joystickPosition);
        const size = this.convertSize(this.config.joystickSize);

        // Apply frame offset to position
        const absolutePosition = {
            x: position.x + this.frameOffset.x,
            y: position.y + this.frameOffset.y,
        };

        // Create outer circle (background)
        const outerCircle = document.createElement("div");
        outerCircle.id = "mobile-controls-joystick";
        let outerBg = joystickBackgroundBaseCss(size, absolutePosition, this.zIndex);
        if (this.config.joystickBackgroundImage) {
            outerBg += commonImageCss(this.config.joystickBackgroundImage);
        } else {
            outerBg += joystickBackgroundNoImageCss;
        }
        outerCircle.style.cssText = outerBg;

        // Create inner circle (handle)
        const innerCircle = document.createElement("div");
        // Thumb scale (default 1)
        const thumbScale =
            this.config.joystickHandleScale && this.config.joystickHandleScale > 0
                ? this.config.joystickHandleScale
                : 1;
        const thumbSizePercent = 50 * thumbScale;
        let innerBg = joystickInnerCircleBaseCss(thumbSizePercent);
        if (this.config.joystickHandleImage) {
            innerBg += commonImageCss(this.config.joystickHandleImage);
        } else {
            innerBg += joystickInnerNoImgCss;
        }
        innerCircle.style.cssText = innerBg;

        outerCircle.appendChild(innerCircle);
        document.body.appendChild(outerCircle);

        this.element = outerCircle;
        this.handle = innerCircle;

        // Calculate joystick parameters
        const rect = outerCircle.getBoundingClientRect();
        this.radius = Math.min(rect.width, rect.height) / 2;
        this.maxDistance = this.radius * 0.8;

        // Register event handler immediately after element creation if needed
        if (this.isVisible && this.isInteractive && this.pointerManager) {
            this.registerEventHandler();
        }
    }

    private setupEvents(): void {
        // Skip event setup if pointerManager is not available (e.g., in editor mode)
        if (!this.pointerManager) {
            return;
        }

        // Create the handler
        this.joystickHandler = {
            onPointerDown: (event: PointerEvent) => {
                this.onJoystickStart(event);
                return true; // Capture this pointer for joystick
            },
            onPointerMove: (event: PointerEvent) => {
                this.onJoystickDrag(event);
                return true; // Always handle moves for captured pointers
            },
            onPointerUp: () => {
                this.onJoystickEnd();
                return true; // Always handle end for captured pointers
            },
        };
    }

    private registerEventHandler(): void {
        if (this.pointerManager && this.joystickHandler && !this.handlerRegistered && this.element) {
            this.pointerManager.registerHandler(
                `touch-controls-joystick`,
                this.joystickHandler,
                this.element, // PointerEventManager automatically filters events to this element
                JOYSTICK_PRIORITY,
            );
            this.handlerRegistered = true;
        }
    }

    private unregisterEventHandler(): void {
        if (this.pointerManager && this.handlerRegistered) {
            this.pointerManager.unregisterHandler(`touch-controls-joystick`);
            this.handlerRegistered = false;
        }
    }

    private onJoystickStart(event: PointerEvent): void {
        this.isDragging = true;
        this.currentPointerId = event.pointerId;

        // Capture pointer to ensure all events come to joystick element
        if (this.element) {
            this.element.setPointerCapture(event.pointerId);
        }

        if (this.handle) {
            this.handle.style.cursor = "grabbing";
        }
    }

    private onJoystickDrag(event: PointerEvent): void {
        if (!this.isDragging || !this.element || !this.handle || !this.virtualDispatcher) return;

        const clientX = event.clientX;
        const clientY = event.clientY;

        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        let normalizedX = deltaX / this.radius;
        let normalizedY = deltaY / this.radius;

        // Limit handle movement to max distance
        if (distance > this.maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            normalizedX = Math.cos(angle) * (this.maxDistance / this.radius);
            normalizedY = Math.sin(angle) * (this.maxDistance / this.radius);
        }

        // Update handle position
        const handleX = 50 + normalizedX * (this.radius / rect.width) * 100;
        const handleY = 50 + normalizedY * (this.radius / rect.height) * 100;
        this.handle.style.left = `${handleX}%`;
        this.handle.style.top = `${handleY}%`;

        this.currentDirection.x = normalizedX;
        this.currentDirection.y = normalizedY;
        this.currentDistance = Math.min(distance, this.maxDistance);

        let clampedX = Math.max(-1, Math.min(1, normalizedX));
        let clampedY = Math.max(-1, Math.min(1, normalizedY));

        const normalizedDistance = Math.sqrt(clampedX * clampedX + clampedY * clampedY);
        const deadzone = this.config.joystickDeadzone || 0.1;

        let shouldRun = false;

        if (normalizedDistance < deadzone) {
            clampedX = 0;
            clampedY = 0;
            shouldRun = false;
        } else {
            const runThreshold = this.config.joystickRunThreshold || 0.7;
            shouldRun = normalizedDistance >= runThreshold;
        }

        this.virtualDispatcher.dispatchButton("run", shouldRun);
        this.virtualDispatcher.dispatchAxis("move", {x: clampedX, y: -clampedY});
    }

    private onJoystickEnd(): void {
        if (!this.isDragging) return;

        this.isDragging = false;

        // Release pointer capture
        if (this.element && this.currentPointerId !== null) {
            this.element.releasePointerCapture(this.currentPointerId);
        }

        this.currentPointerId = null;

        if (this.handle) {
            this.handle.style.cursor = "grab";
            this.handle.style.left = "50%";
            this.handle.style.top = "50%";
        }

        this.currentDirection.x = 0;
        this.currentDirection.y = 0;
        this.currentDistance = 0;

        if (this.virtualDispatcher) {
            this.virtualDispatcher.dispatchAxis("move", {x: 0, y: 0});
            this.virtualDispatcher.dispatchButton("run", false);
        }
    }

    private getViewportDimensions() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    }

    private convertPosition(position: {x: number; y: number}) {
        return this.scaler.scalePosition(position);
    }

    private convertSize(size: number) {
        return this.scaler.scaleSize(size);
    }
}

export default TouchJoystick;
