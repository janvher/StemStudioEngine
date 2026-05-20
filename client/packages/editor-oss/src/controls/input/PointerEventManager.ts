interface PointerEventHandler {
    onPointerDown?: (event: PointerEvent) => boolean; // return true if handled
    onPointerMove?: (event: PointerEvent) => boolean;  // return true if handled
    onPointerUp?: (event: PointerEvent) => boolean;   // return true if handled
    filter?: (event: PointerEvent) => boolean; // optional filter for this specific handler
}

interface RegisteredHandler {
    id: string;
    element: HTMLElement | null; // null means document/global
    handler: PointerEventHandler;
    priority: number; // higher priority handles events first
}

interface ActivePointer {
    id: number;
    handlerId: string;
    startPosition: { x: number; y: number };
    lastPosition: { x: number; y: number };
}

export interface PointerEventManagerOptions {
    preventGestures?: boolean; // Whether to prevent pinch/zoom gestures globally
}

class PointerEventManager {
    private handlers: RegisteredHandler[] = [];
    private activePointers: Map<number, ActivePointer> = new Map();
    private handlerFilters: Map<string, (event: PointerEvent) => boolean> = new Map(); // External filters by handler ID
    private isInitialized = false;

    private preventGesturesEnabled = false;
    private touchMoveBlocker?: (e: TouchEvent) => void;
    private gestureBlocker?: (e: Event) => void;
    private wheelBlocker?: (e: WheelEvent) => void;

    private onPointerDownHandler = (event: PointerEvent) => {
        this.handlePointerDown(event);
    };

    private onPointerMoveHandler = (event: PointerEvent) => {
        this.handlePointerMove(event);
    };

    private onPointerUpHandler = (event: PointerEvent) => {
        this.handlePointerUp(event);
    };

    private onPointerCancelHandler = (event: PointerEvent) => {
        this.handlePointerUp(event);
    };

    constructor() {
        // Regular constructor, no singleton pattern
    }

    initialize(options: PointerEventManagerOptions = {preventGestures: true}): void {
        if (this.isInitialized) return;

        document.addEventListener("pointerdown", this.onPointerDownHandler, { passive: true });
        document.addEventListener("pointermove", this.onPointerMoveHandler, { passive: true });
        document.addEventListener("pointerup", this.onPointerUpHandler, { passive: true });
        document.addEventListener("pointercancel", this.onPointerCancelHandler, { passive: true });

        if (options.preventGestures) {
            this.enableGesturePrevention();
        }

        this.isInitialized = true;
    }

    dispose(): void {
        if (!this.isInitialized) return;

        document.removeEventListener("pointerdown", this.onPointerDownHandler);
        document.removeEventListener("pointermove", this.onPointerMoveHandler);
        document.removeEventListener("pointerup", this.onPointerUpHandler);
        document.removeEventListener("pointercancel", this.onPointerCancelHandler);

        this.disableGesturePrevention();

        this.handlers.length = 0;
        this.activePointers.clear();
        this.handlerFilters.clear();
        this.isInitialized = false;
    }

    private enableGesturePrevention(): void {
        if (this.preventGesturesEnabled) return;
        this.preventGesturesEnabled = true;

        // Глобально отключаем жесты: важно до listenеров
        const root = document.documentElement;
        root.style.touchAction = 'none';
        root.style.webkitUserSelect = 'none';
        root.style.userSelect = 'none';
        root.style.overscrollBehavior = 'none';

        // Pinch / масштаб (iOS gesture events)
        this.gestureBlocker = (e: Event) => e.preventDefault();
        window.addEventListener('gesturestart', this.gestureBlocker, { passive: false });
        window.addEventListener('gesturechange', this.gestureBlocker, { passive: false });
        window.addEventListener('gestureend', this.gestureBlocker, { passive: false });

        // Многопальцевый pinch (fallback)
        this.touchMoveBlocker = (e: TouchEvent) => {
            if (e.touches.length > 1) e.preventDefault();
        };
        window.addEventListener('touchmove', this.touchMoveBlocker, { passive: false });

        // Trackpad / ctrl+wheel zoom
        this.wheelBlocker = (e: WheelEvent) => {
            if (e.ctrlKey) e.preventDefault();
        };
        window.addEventListener('wheel', this.wheelBlocker, { passive: false });
    }

    private disableGesturePrevention(): void {
        if (!this.preventGesturesEnabled) return;
        this.preventGesturesEnabled = false;

        if (this.gestureBlocker) {
            window.removeEventListener('gesturestart', this.gestureBlocker);
            window.removeEventListener('gesturechange', this.gestureBlocker);
            window.removeEventListener('gestureend', this.gestureBlocker);
            this.gestureBlocker = undefined;
        }
        if (this.touchMoveBlocker) {
            window.removeEventListener('touchmove', this.touchMoveBlocker);
            this.touchMoveBlocker = undefined;
        }
        if (this.wheelBlocker) {
            window.removeEventListener('wheel', this.wheelBlocker);
            this.wheelBlocker = undefined;
        }
    }

    registerHandler(
        id: string,
        handler: PointerEventHandler,
        element: HTMLElement | null = null,
        priority: number = 0,
    ): void {
        // Remove existing handler with same id
        if (this.getHandlerById(id)) {
            console.warn(`[PointerEventManager] RegisterHandler: Handler with id "${id}" already exists. Unregistering first.`);
            this.unregisterHandler(id); // Unregister existing handler
        }

        console.info(`[PointerEventManager] Registering pointer event handler: ${id} (priority: ${priority})`);

        this.handlers.push({
            id,
            element,
            handler,
            priority,
        });

        // Sort by priority (lower first)
        this.handlers.sort((a, b) => a.priority - b.priority);
    }

    unregisterHandler(id: string): void {
        const index = this.handlers.findIndex(h => h.id === id);
        if (index < 0) {
            console.warn(`[PointerEventManager] UnregisterHandler: Handler with id "${id}" not found.`);
            return; // Handler not found
        }
        console.info(`[PointerEventManager] Unregistering pointer event handler: ${id}`);
        this.handlers.splice(index, 1);

        // Clean up any external filters for this handler
        this.removeHandlerFilter(id);

        // Release any pointers handled by this handler
        for (const [pointerId, pointer] of this.activePointers.entries()) {
            if (pointer.handlerId === id) {
                this.activePointers.delete(pointerId);
            }
        }
    }

    addHandlerFilter(handlerId: string, filter: (event: PointerEvent) => boolean): void {
        console.info(`[PointerEventManager] Adding external filter to handler "${handlerId}"`);
        this.handlerFilters.set(handlerId, filter);
    }

    removeHandlerFilter(handlerId: string): void {
        const removed = this.handlerFilters.delete(handlerId);
        if (removed) {
            console.info(`[PointerEventManager] Removed external filter from handler "${handlerId}"`);
        }
        // No warning needed - handlers registered with element don't have filters
    }

    hasHandlerFilter(handlerId: string): boolean {
        return this.handlerFilters.has(handlerId);
    }

    private isHandlerFiltered(handlerId: string, handler: PointerEventHandler, event: PointerEvent): boolean {
        // Check built-in handler filter first
        if (handler.filter) {
            try {
                if (handler.filter(event)) {
                    return true;
                }
            } catch (error) {
                console.error(`[PointerEventManager] Error in built-in handler filter for "${handlerId}":`, error);
            }
        }
        
        // Check external handler filter
        const externalFilter = this.handlerFilters.get(handlerId);
        if (externalFilter) {
            try {
                if (externalFilter(event)) {
                    return true;
                }
            } catch (error) {
                console.error(`[PointerEventManager] Error in external handler filter for "${handlerId}":`, error);
            }
        }
        
        return false; // Handler is not filtered
    }

    private getHandlerById(id: string): RegisteredHandler | undefined {
        return this.handlers.find(handler => handler.id === id);
    }

    private handlePointerDown(event: PointerEvent): void {
        // Check if this pointer is already active
        if (this.activePointers.has(event.pointerId)) {
            return;
        }

        // Try to find a handler for this event
        for (const registeredHandler of this.handlers) {
            if (this.isEventInElement(event, registeredHandler.element)) {
                // Check if this specific handler should be filtered
                if (this.isHandlerFiltered(registeredHandler.id, registeredHandler.handler, event)) {
                    continue; // Skip this handler, but continue to others
                }
                
                if (registeredHandler.handler.onPointerDown?.(event)) {
                    // Handler accepted the event
                    this.activePointers.set(event.pointerId, {
                        id: event.pointerId,
                        handlerId: registeredHandler.id,
                        startPosition: { x: event.clientX, y: event.clientY },
                        lastPosition: { x: event.clientX, y: event.clientY },
                    });
                    return;
                }
            }
        }
    }

    private handlePointerMove(event: PointerEvent): void {
        // First, try to handle for active pointers (captured)
        const activePointer = this.activePointers.get(event.pointerId);
        if (activePointer) {
            const handler = this.handlers.find(h => h.id === activePointer.handlerId);
            if (handler?.handler.onPointerMove) {
                const handled = handler.handler.onPointerMove(event);
                if (handled) {
                    activePointer.lastPosition = { x: event.clientX, y: event.clientY };
                }
            }
            return;
        }

        // If no active pointer, try to find a handler that wants to process this move event
        // This allows camera control to work even if it didn't capture the pointer initially
        for (const registeredHandler of this.handlers) {
            if (this.isEventInElement(event, registeredHandler.element)) {
                // Check if this specific handler should be filtered
                if (this.isHandlerFiltered(registeredHandler.id, registeredHandler.handler, event)) {
                    continue; // Skip this handler, but continue to others
                }
                
                if (registeredHandler.handler.onPointerMove?.(event)) {
                    // Handler processed the move event
                    return;
                }
            }
        }
    }

    private handlePointerUp(event: PointerEvent): void {
        const activePointer = this.activePointers.get(event.pointerId);
        if (!activePointer) {
            return;
        }

        const handler = this.handlers.find(h => h.id === activePointer.handlerId);
        if (handler?.handler.onPointerUp) {
            handler.handler.onPointerUp(event);
        }

        this.activePointers.delete(event.pointerId);
    }

    private isEventInElement(event: PointerEvent, element: HTMLElement | null): boolean {
        if (!element) {
            return true; // Global handler
        }

        const rect = element.getBoundingClientRect();
        return (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
        );
    }

    // Utility methods for getting pointer information
    getActivePointers(): ActivePointer[] {
        return Array.from(this.activePointers.values());
    }

    getPointerById(pointerId: number): ActivePointer | undefined {
        return this.activePointers.get(pointerId);
    }

    isPointerActive(pointerId: number): boolean {
        return this.activePointers.has(pointerId);
    }

    getPointersForHandler(handlerId: string): ActivePointer[] {
        return Array.from(this.activePointers.values())
            .filter(pointer => pointer.handlerId === handlerId);
    }
}

export { PointerEventManager, type PointerEventHandler, type ActivePointer };
