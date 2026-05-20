import wheelIcon from "./assets/wheel_icon.svg";
import {JOYSTICK_PRIORITY} from "./TouchControls";
import {commonImageCss} from "./TouchControls.style";
import {TouchControlsScaler} from "./TouchControlsScaling";
import {VirtualInputDispatcher} from "../../../controls/input/InputManager";
import {type PointerEventHandler, PointerEventManager} from "../../../controls/input/PointerEventManager";

export interface SteeringWheelConfig {
    steeringWheelEnabled: boolean;
    steeringWheelPosition: {x: number; y: number};
    steeringWheelSize: number;
    steeringWheelImage?: string;
    steeringWheelSensitivity?: number;
    steeringWheelMaxRotation?: number;
    steeringWheelReturnSpeed?: number;
}

class TouchSteeringWheel {
    config: SteeringWheelConfig;
    private element: HTMLElement | null = null;
    private isDragging: boolean = false;
    private currentRotation: number = 0;
    private targetRotation: number = 0;
    private currentPointerId: number | null = null;
    private isVisible: boolean = true;
    private isInteractive: boolean = true;
    private parentUuid: string;
    private pointerManager: PointerEventManager | null;
    private virtualDispatcher: VirtualInputDispatcher | null;
    private scaler: TouchControlsScaler;
    private wheelHandler: PointerEventHandler | null = null;
    private handlerRegistered: boolean = false;
    private zIndex: number;
    private frameOffset: {x: number; y: number};
    private lastPointerX: number = 0;
    private centerX: number = 0;
    private centerY: number = 0;

    constructor(
        config: SteeringWheelConfig,
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

        const viewport = this.getViewportDimensions();
        const position = this.convertPosition(this.config.steeringWheelPosition, viewport);
        const size = this.convertSize(this.config.steeringWheelSize);

        this.element.style.left = `${position.x + this.frameOffset.x}px`;
        this.element.style.bottom = `${position.y + this.frameOffset.y}px`;
        this.element.style.width = `${size}px`;
        this.element.style.height = `${size}px`;

        // Preserve current rotation
        this.updateWheelRotation();
        this.updateCenterPosition();
    }

    updateConfig(newPosition: {x: number; y: number}): void {
        this.config.steeringWheelPosition = newPosition;
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

            if (this.isVisible) {
                this.registerEventHandler();
            }
        } else {
            this.element.style.pointerEvents = "none";
            this.element.style.opacity = "0.5";

            this.resetToNeutral();
            this.isDragging = false;
            this.currentPointerId = null;

            this.unregisterEventHandler();
        }
    }

    update(deltaTime: number): void {
        if (!this.isDragging && Math.abs(this.currentRotation) > 0.01) {
            const returnSpeed = this.config.steeringWheelReturnSpeed || 5;
            const returnAmount = returnSpeed * deltaTime;
            
            if (Math.abs(this.currentRotation) < returnAmount) {
                this.currentRotation = 0;
            } else {
                this.currentRotation -= Math.sign(this.currentRotation) * returnAmount;
            }

            this.updateWheelRotation();
            this.dispatchSteeringValue();
        }
    }

    resetToNeutral(): void {
        this.currentRotation = 0;
        this.targetRotation = 0;
        this.updateWheelRotation();
        
        if (this.virtualDispatcher) {
            this.virtualDispatcher.dispatchAxis("steer", {x: 0, y: 0});
        }
    }

    cleanup(): void {
        if (this.isDragging && this.currentPointerId !== null) {
            this.onWheelEnd();
        }

        this.unregisterEventHandler();

        if (this.element) {
            this.element.remove();
            this.element = null;
        }

        this.resetToNeutral();
        this.isDragging = false;
        this.currentPointerId = null;
    }

    get wheelElement(): HTMLElement | null {
        return this.element;
    }

    private createElements(): void {
        const viewport = this.getViewportDimensions();
        const position = this.convertPosition(this.config.steeringWheelPosition, viewport);
        const size = this.convertSize(this.config.steeringWheelSize);

        const absolutePosition = {
            x: position.x + this.frameOffset.x,
            y: position.y + this.frameOffset.y,
        };

        const wheel = document.createElement("div");
        wheel.id = "mobile-controls-steering-wheel";
        
        let wheelStyles = this.getSteeringWheelBaseCss(size, absolutePosition);
        // Use wheel icon as default, or custom image if provided
        const wheelImage = this.config.steeringWheelImage || wheelIcon;
        wheelStyles += commonImageCss(wheelImage);
        wheel.style.cssText = wheelStyles;

        document.body.appendChild(wheel);
        this.element = wheel;

        this.updateCenterPosition();

        if (this.isVisible && this.isInteractive && this.pointerManager) {
            this.registerEventHandler();
        }
    }

    private setupEvents(): void {
        if (!this.pointerManager) {
            return;
        }

        this.wheelHandler = {
            onPointerDown: (event: PointerEvent) => {
                this.onWheelStart(event);
                return true;
            },
            onPointerMove: (event: PointerEvent) => {
                this.onWheelDrag(event);
                return true;
            },
            onPointerUp: (event: PointerEvent) => {
                this.onWheelEnd();
                return true;
            },
        };
    }

    private registerEventHandler(): void {
        if (this.pointerManager && this.wheelHandler && !this.handlerRegistered && this.element) {
            this.pointerManager.registerHandler(
                `touch-controls-steering-wheel`,
                this.wheelHandler,
                this.element,
                JOYSTICK_PRIORITY,
            );
            this.handlerRegistered = true;
        }
    }

    private unregisterEventHandler(): void {
        if (this.pointerManager && this.handlerRegistered) {
            this.pointerManager.unregisterHandler(`touch-controls-steering-wheel`);
            this.handlerRegistered = false;
        }
    }

    private onWheelStart(event: PointerEvent): void {
        this.isDragging = true;
        this.currentPointerId = event.pointerId;

        if (this.element) {
            this.element.setPointerCapture(event.pointerId);
        }

        this.lastPointerX = event.clientX;
    }

    private onWheelDrag(event: PointerEvent): void {
        if (!this.isDragging || event.pointerId !== this.currentPointerId) {
            return;
        }

        // Calculate rotation based only on horizontal movement
        const deltaX = event.clientX - this.lastPointerX;
        
        const sensitivity = this.config.steeringWheelSensitivity || 1;
        const maxRotation = this.config.steeringWheelMaxRotation || 90;
        
        // Convert horizontal pixel movement to rotation angle
        // Adjust multiplier for desired sensitivity (0.5 means 2 pixels = 1 degree)
        const rotationChange = deltaX * sensitivity * 0.5;

        this.currentRotation += rotationChange;
        this.currentRotation = Math.max(-maxRotation, Math.min(maxRotation, this.currentRotation));

        this.lastPointerX = event.clientX;

        this.updateWheelRotation();
        this.dispatchSteeringValue();
    }

    private onWheelEnd(): void {
        if (!this.isDragging) {
            return;
        }

        this.isDragging = false;

        if (this.element && this.currentPointerId !== null) {
            this.element.releasePointerCapture(this.currentPointerId);
        }

        this.currentPointerId = null;
        
        // Immediately reset to neutral when releasing
        this.resetToNeutral();
    }

    private updateWheelRotation(): void {
        if (this.element) {
            this.element.style.transform = `translate(-50%, 50%) rotate(${this.currentRotation}deg)`;
        }
    }

    private dispatchSteeringValue(): void {
        if (!this.virtualDispatcher) {
            return;
        }

        const maxRotation = this.config.steeringWheelMaxRotation || 90;
        // Invert the value so clockwise rotation (positive angle) gives positive steering
        const normalizedValue = -this.currentRotation / maxRotation;

        this.virtualDispatcher.dispatchAxis("steer", {x: normalizedValue, y: 0});
    }

    private getAngleFromCenter(clientX: number, clientY: number): number {
        const dx = clientX - this.centerX;
        const dy = this.centerY - clientY; // Invert Y because screen coordinates go down
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }

    private updateCenterPosition(): void {
        if (this.element) {
            const rect = this.element.getBoundingClientRect();
            this.centerX = rect.left + rect.width / 2;
            this.centerY = rect.top + rect.height / 2;
        }
    }

    private getViewportDimensions() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    }

    private convertPosition(position: {x: number; y: number} | undefined, viewport: {width: number; height: number}) {
        // Default position if not provided
        const safePosition = position || {x: 0.5, y: 0.15};
        return this.scaler.scalePosition(safePosition);
    }

    private convertSize(size: number) {
        return this.scaler.scaleSize(size);
    }

    private getSteeringWheelBaseCss(size: number, position: {x: number; y: number}): string {
        return `
    width: ${size}px;
    height: ${size}px;
    position: fixed;
    left: ${position.x}px;
    bottom: ${position.y}px;
    transform: translate(-50%, 50%);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: ${this.zIndex};
    cursor: grab;
    touch-action: none;
    user-select: none;
    pointer-events: auto;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    transition: none;`;
    }

    private getSteeringWheelNoImageCss(): string {
        return `
    border-radius: 50%;
    background: radial-gradient(circle at center, 
        rgba(255,255,255,0.1) 0%, 
        rgba(255,255,255,0.3) 40%, 
        rgba(255,255,255,0.5) 100%);
    border: 2px solid white;
    box-shadow: inset 0 0 20px rgba(0,0,0,0.3);`;
    }
}

export default TouchSteeringWheel;
