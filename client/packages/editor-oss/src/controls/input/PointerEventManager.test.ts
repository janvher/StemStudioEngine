import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { PointerEventManager, type PointerEventHandler } from './PointerEventManager';

// Polyfill PointerEvent for Vitest/JSDOM
if (typeof global.PointerEvent === 'undefined') {
    // @ts-expect-error - assigning a polyfill class to the read-only global PointerEvent
    global.PointerEvent = class extends MouseEvent {
        pointerId: number;
        pointerType: string;
        buttons: number;
        _clientX: number;
        _clientY: number;
        constructor(type: string, props: any) {
            super(type, props);
            this.pointerId = props.pointerId ?? 0;
            this.pointerType = props.pointerType ?? 'touch';
            this.buttons = props.buttons ?? 0;
            this._clientX = props.clientX ?? 0;
            this._clientY = props.clientY ?? 0;
        }
        get clientX() {
            return this._clientX;
        }
        get clientY() {
            return this._clientY;
        }
    };
}

// Mock DOM elements
const createMockElement = (rect: DOMRect) => {
    let element: HTMLElement;

    try {
        element = document.createElement('div');
        if (!element) {
            throw new Error('createElement returned null');
        }
    } catch {
        // Create a minimal mock element if document.createElement fails
        element = {
            getBoundingClientRect: () => new DOMRect(0, 0, 0, 0),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            tagName: 'DIV',
        } as any;
    }

    // Ensure the element has getBoundingClientRect method in test environment
    if (!element.getBoundingClientRect) {
        element.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
    }

    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect);
    return element;
};

const createMockPointerEvent = (
    type: string,
    pointerId: number,
    clientX: number,
    clientY: number,
    pointerType: string = 'touch',
    buttons: number = 0,
): PointerEvent => {
    return new PointerEvent(type, {
        pointerId,
        clientX,
        clientY,
        pointerType,
        buttons,
        bubbles: true,
        cancelable: true,
    });
};

describe('PointerEventManager', () => {
    let manager: PointerEventManager;
    let mockHandler1: PointerEventHandler;
    let mockHandler2: PointerEventHandler;
    let mockElement: HTMLElement;

    beforeEach(() => {
        // Ensure clean DOM state for each test
        vi.clearAllMocks();

        manager = new PointerEventManager();

        mockHandler1 = {
            onPointerDown: vi.fn().mockReturnValue(false),
            onPointerMove: vi.fn().mockReturnValue(false),
            onPointerUp: vi.fn().mockReturnValue(false),
        };

        mockHandler2 = {
            onPointerDown: vi.fn().mockReturnValue(false),
            onPointerMove: vi.fn().mockReturnValue(false),
            onPointerUp: vi.fn().mockReturnValue(false),
        };

        // Create mock element after DOM is ready
        try {
            mockElement = createMockElement(new DOMRect(100, 100, 200, 200));
        } catch (error) {
            console.warn('Failed to create mock element, creating fallback:', error);
            // Fallback mock element
            mockElement = {
                getBoundingClientRect: vi.fn().mockReturnValue(new DOMRect(100, 100, 200, 200)),
            } as any;
        }

        // Mock document.addEventListener and removeEventListener
        vi.spyOn(document, 'addEventListener');
        vi.spyOn(document, 'removeEventListener');
    });

    afterEach(() => {
        manager.dispose();
        vi.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize and add event listeners', () => {
            manager.initialize();
            
            expect(document.addEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function), { passive: true });
            expect(document.addEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function), { passive: true });
            expect(document.addEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function), { passive: true });
            expect(document.addEventListener).toHaveBeenCalledWith('pointercancel', expect.any(Function), { passive: true });
        });

        it('should not initialize twice', () => {
            manager.initialize();
            manager.initialize();
            
            expect(document.addEventListener).toHaveBeenCalledTimes(4);
        });
    });

    describe('Handler registration', () => {
        beforeEach(() => {
            manager.initialize();
        });

        it('should register handlers with correct priority order', () => {
            manager.registerHandler('handler1', mockHandler1, null, 5);
            manager.registerHandler('handler2', mockHandler2, null, 1);
            
            const handlers = (manager as any).handlers;
            expect(handlers[0].id).toBe('handler2'); // Lower number = higher priority first
            expect(handlers[1].id).toBe('handler1');
        });

        it('should unregister handlers', () => {
            manager.registerHandler('handler1', mockHandler1, null, 5);
            manager.unregisterHandler('handler1');
            
            const handlers = (manager as any).handlers;
            expect(handlers).toHaveLength(0);
        });

        it('should replace existing handler with same id', () => {
            const newHandler = { onPointerDown: vi.fn() };
            
            manager.registerHandler('handler1', mockHandler1, null, 5);
            manager.registerHandler('handler1', newHandler, null, 1);
            
            const handlers = (manager as any).handlers;
            expect(handlers).toHaveLength(1);
            expect(handlers[0].handler).toBe(newHandler);
        });
    });

    describe('Pointer event handling', () => {
        beforeEach(() => {
            manager.initialize();
        });

        it('should handle pointer start with element-specific handler', () => {
            (mockHandler1.onPointerDown as any).mockReturnValue(true);
            manager.registerHandler('element-handler', mockHandler1, mockElement, 1);
            
            const event = createMockPointerEvent('pointerdown', 1, 150, 150);
            (manager as any).handlePointerDown(event);
            
            expect(mockHandler1.onPointerDown).toHaveBeenCalledWith(event);
            expect(manager.getActivePointers()).toHaveLength(1);
        });

        it('should not handle pointer start outside element bounds', () => {
            (mockHandler1.onPointerDown as any).mockReturnValue(true);
            manager.registerHandler('element-handler', mockHandler1, mockElement, 1);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50); // Outside element
            (manager as any).handlePointerDown(event);
            
            expect(mockHandler1.onPointerDown).not.toHaveBeenCalled();
            expect(manager.getActivePointers()).toHaveLength(0);
        });

        it('should handle global handler when no element specified', () => {
            (mockHandler1.onPointerDown as any).mockReturnValue(true);
            manager.registerHandler('global-handler', mockHandler1, null, 1);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            expect(mockHandler1.onPointerDown).toHaveBeenCalledWith(event);
            expect(manager.getActivePointers()).toHaveLength(1);
        });

        it('should respect priority order', () => {
            (mockHandler2.onPointerDown as any).mockReturnValue(true);
            manager.registerHandler('low-priority', mockHandler1, null, 10);
            manager.registerHandler('high-priority', mockHandler2, null, 1);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            expect(mockHandler2.onPointerDown).toHaveBeenCalledWith(event);
            expect(mockHandler1.onPointerDown).not.toHaveBeenCalled();
        });

        it('should fallback to lower priority if higher priority returns false', () => {
            (mockHandler1.onPointerDown as any).mockReturnValue(false);
            (mockHandler2.onPointerDown as any).mockReturnValue(true);
            manager.registerHandler('low-priority', mockHandler2, null, 10);
            manager.registerHandler('high-priority', mockHandler1, null, 1);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            expect(mockHandler1.onPointerDown).toHaveBeenCalledWith(event);
            expect(mockHandler2.onPointerDown).toHaveBeenCalledWith(event);
        });
    });

    describe('Pointer move handling', () => {
        beforeEach(() => {
            manager.initialize();
        });

        it('should handle move for active pointer', () => {
            (mockHandler1.onPointerDown as any).mockReturnValue(true);
            (mockHandler1.onPointerMove as any).mockReturnValue(true);
            manager.registerHandler('handler1', mockHandler1, null, 1);
            
            const startEvent = createMockPointerEvent('pointerdown', 1, 50, 50);
            const moveEvent = createMockPointerEvent('pointermove', 1, 60, 60);
            
            (manager as any).handlePointerDown(startEvent);
            (manager as any).handlePointerMove(moveEvent);
            
            expect(mockHandler1.onPointerMove).toHaveBeenCalledWith(moveEvent);
        });

        it('should handle move for non-active pointer with appropriate handler', () => {
            (mockHandler1.onPointerMove as any).mockReturnValue(true);
            manager.registerHandler('handler1', mockHandler1, null, 1);
            
            const moveEvent = createMockPointerEvent('pointermove', 1, 60, 60);
            (manager as any).handlePointerMove(moveEvent);
            
            expect(mockHandler1.onPointerMove).toHaveBeenCalledWith(moveEvent);
        });

        it('should update pointer position when move is handled', () => {
            (mockHandler1.onPointerDown as any).mockReturnValue(true);
            (mockHandler1.onPointerMove as any).mockReturnValue(true);
            manager.registerHandler('handler1', mockHandler1, null, 1);
            
            const startEvent = createMockPointerEvent('pointerdown', 1, 50, 50);
            const moveEvent = createMockPointerEvent('pointermove', 1, 60, 70);
            
            (manager as any).handlePointerDown(startEvent);
            (manager as any).handlePointerMove(moveEvent);
            
            const activePointer = manager.getPointerById(1);
            expect(activePointer?.lastPosition).toEqual({ x: 60, y: 70 });
        });
    });

    describe('Pointer end handling', () => {
        beforeEach(() => {
            manager.initialize();
        });

        it('should handle pointer end and remove active pointer', () => {
            (mockHandler1.onPointerDown as any).mockReturnValue(true);
            manager.registerHandler('handler1', mockHandler1, null, 1);
            
            const startEvent = createMockPointerEvent('pointerdown', 1, 50, 50);
            const endEvent = createMockPointerEvent('pointerup', 1, 50, 50);
            
            (manager as any).handlePointerDown(startEvent);
            expect(manager.getActivePointers()).toHaveLength(1);
            
            (manager as any).handlePointerUp(endEvent);
            expect(mockHandler1.onPointerUp).toHaveBeenCalledWith(endEvent);
            expect(manager.getActivePointers()).toHaveLength(0);
        });

        it('should not handle end for non-active pointer', () => {
            manager.registerHandler('handler1', mockHandler1, null, 1);
            
            const endEvent = createMockPointerEvent('pointerup', 1, 50, 50);
            (manager as any).handlePointerUp(endEvent);
            
            expect(mockHandler1.onPointerUp).not.toHaveBeenCalled();
        });
    });

    describe('Multi-touch handling', () => {
        beforeEach(() => {
            manager.initialize();
        });

        it('should handle multiple active pointers', () => {
            (mockHandler1.onPointerDown as any).mockReturnValue(true);
            (mockHandler2.onPointerDown as any).mockReturnValue(true);
            manager.registerHandler('handler1', mockHandler1, mockElement, 1);
            manager.registerHandler('handler2', mockHandler2, null, 10);
            
            // First pointer in element
            const event1 = createMockPointerEvent('pointerdown', 1, 150, 150);
            (manager as any).handlePointerDown(event1);
            
            // Second pointer outside element (should go to global handler)
            const event2 = createMockPointerEvent('pointerdown', 2, 50, 50);
            (manager as any).handlePointerDown(event2);
            
            expect(manager.getActivePointers()).toHaveLength(2);
            expect(mockHandler1.onPointerDown).toHaveBeenCalledWith(event1);
            expect(mockHandler2.onPointerDown).toHaveBeenCalledWith(event2);
        });
    });

    describe('Utility methods', () => {
        beforeEach(() => {
            manager.initialize();
        });

        it('should check if pointer is active', () => {
            (mockHandler1.onPointerDown as any).mockReturnValue(true);
            manager.registerHandler('handler1', mockHandler1, null, 1);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            expect(manager.isPointerActive(1)).toBe(true);
            expect(manager.isPointerActive(2)).toBe(false);
        });

        it('should get pointers for specific handler', () => {
            (mockHandler1.onPointerDown as any).mockReturnValue(true);
            (mockHandler2.onPointerDown as any).mockReturnValue(true);
            manager.registerHandler('handler1', mockHandler1, null, 1);
            manager.registerHandler('handler2', mockHandler2, null, 10);
            
            const event1 = createMockPointerEvent('pointerdown', 1, 50, 50);
            const event2 = createMockPointerEvent('pointerdown', 2, 60, 60);
            
            (manager as any).handlePointerDown(event1);
            (manager as any).handlePointerDown(event2);
            
            const handler1Pointers = manager.getPointersForHandler('handler1');
            expect(handler1Pointers).toHaveLength(2); // Both go to higher priority handler
        });
    });

    describe('Disposal', () => {
        it('should remove event listeners and clear state', () => {
            manager.initialize();
            manager.registerHandler('handler1', mockHandler1, null, 1);
            
            manager.dispose();
            
            expect(document.removeEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
            expect(document.removeEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
            expect(document.removeEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));
            expect(document.removeEventListener).toHaveBeenCalledWith('pointercancel', expect.any(Function));
            
            expect(manager.getActivePointers()).toHaveLength(0);
        });
    });

    describe('Element bounds checking', () => {
        beforeEach(() => {
            manager.initialize();
        });

        it('should correctly identify events within element bounds', () => {
            // Element bounds: x: 100-300, y: 100-300
            const isInElement = (manager as any).isEventInElement.bind(manager);
            
            expect(isInElement(createMockPointerEvent('pointerdown', 1, 150, 150), mockElement)).toBe(true);
            expect(isInElement(createMockPointerEvent('pointerdown', 1, 100, 100), mockElement)).toBe(true);
            expect(isInElement(createMockPointerEvent('pointerdown', 1, 300, 300), mockElement)).toBe(true);
            expect(isInElement(createMockPointerEvent('pointerdown', 1, 99, 150), mockElement)).toBe(false);
            expect(isInElement(createMockPointerEvent('pointerdown', 1, 150, 99), mockElement)).toBe(false);
            expect(isInElement(createMockPointerEvent('pointerdown', 1, 301, 150), mockElement)).toBe(false);
            expect(isInElement(createMockPointerEvent('pointerdown', 1, 150, 301), mockElement)).toBe(false);
        });

        it('should always return true for global handlers', () => {
            const isInElement = (manager as any).isEventInElement.bind(manager);
            expect(isInElement(createMockPointerEvent('pointerdown', 1, 0, 0), null)).toBe(true);
        });
    });

    describe('Handler filters', () => {
        beforeEach(() => {
            manager.initialize();
        });

        it('should block handler when filter returns true', () => {
            const filterMock = vi.fn().mockReturnValue(true);
            const handlerWithFilter: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
                filter: filterMock,
            };
            
            manager.registerHandler('filtered-handler', handlerWithFilter, null, 1);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            expect(filterMock).toHaveBeenCalledWith(event);
            expect(handlerWithFilter.onPointerDown).not.toHaveBeenCalled();
            expect(manager.getActivePointers()).toHaveLength(0);
        });

        it('should allow handler when filter returns false', () => {
            const filterMock = vi.fn().mockReturnValue(false);
            const handlerWithFilter: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
                filter: filterMock,
            };
            
            manager.registerHandler('filtered-handler', handlerWithFilter, null, 1);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            expect(filterMock).toHaveBeenCalledWith(event);
            expect(handlerWithFilter.onPointerDown).toHaveBeenCalledWith(event);
            expect(manager.getActivePointers()).toHaveLength(1);
        });

        it('should allow handler when no filter is specified', () => {
            const handlerWithoutFilter: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
            };
            
            manager.registerHandler('unfiltered-handler', handlerWithoutFilter, null, 1);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            expect(handlerWithoutFilter.onPointerDown).toHaveBeenCalledWith(event);
            expect(manager.getActivePointers()).toHaveLength(1);
        });

        it('should skip filtered handler but continue to next handler', () => {
            const filter1 = vi.fn().mockReturnValue(true); // Block first handler
            const filter2 = vi.fn().mockReturnValue(false); // Allow second handler
            
            const handler1: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
                filter: filter1,
            };
            
            const handler2: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
                filter: filter2,
            };
            
            manager.registerHandler('filtered-handler', handler1, null, 1);
            manager.registerHandler('allowed-handler', handler2, null, 2);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            expect(filter1).toHaveBeenCalledWith(event);
            expect(filter2).toHaveBeenCalledWith(event);
            expect(handler1.onPointerDown).not.toHaveBeenCalled();
            expect(handler2.onPointerDown).toHaveBeenCalledWith(event);
            expect(manager.getActivePointers()).toHaveLength(1);
        });

        it('should apply filter to pointer move events for non-captured pointers', () => {
            const filterMock = vi.fn().mockReturnValue(true);
            const handlerWithFilter: PointerEventHandler = {
                onPointerMove: vi.fn().mockReturnValue(true),
                filter: filterMock,
            };
            
            manager.registerHandler('filtered-handler', handlerWithFilter, null, 1);
            
            const event = createMockPointerEvent('pointermove', 1, 50, 50);
            (manager as any).handlePointerMove(event);
            
            expect(filterMock).toHaveBeenCalledWith(event);
            expect(handlerWithFilter.onPointerMove).not.toHaveBeenCalled();
        });

        it('should not apply filter to captured pointer move events', () => {
            const filterMock = vi.fn().mockReturnValue(true);
            const handlerWithFilter: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
                onPointerMove: vi.fn().mockReturnValue(true),
                filter: filterMock,
            };
            
            // First, allow the handler to capture the pointer (filter returns false)
            filterMock.mockReturnValueOnce(false);
            manager.registerHandler('filtered-handler', handlerWithFilter, null, 1);
            
            const downEvent = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(downEvent);
            
            // Now the pointer is captured, move should work even if filter would block it
            filterMock.mockReturnValue(true);
            const moveEvent = createMockPointerEvent('pointermove', 1, 60, 60);
            (manager as any).handlePointerMove(moveEvent);
            
            expect(handlerWithFilter.onPointerMove).toHaveBeenCalledWith(moveEvent);
        });

        it('should handle filter function errors gracefully', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const faultyFilter = vi.fn().mockImplementation(() => {
                throw new Error('Filter error');
            });
            
            const handlerWithFaultyFilter: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
                filter: faultyFilter,
            };
            
            manager.registerHandler('faulty-handler', handlerWithFaultyFilter, null, 1);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error in built-in handler filter'),
                expect.any(Error),
            );
            expect(handlerWithFaultyFilter.onPointerDown).toHaveBeenCalledWith(event);
            
            consoleErrorSpy.mockRestore();
        });

        it('should filter based on globalThis.hoverUi example', () => {
            // Mock globalThis.hoverUi
            const originalHoverUi = (globalThis as any).hoverUi;
            
            const uiAwareHandler: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
                filter: () => !!(globalThis as any).hoverUi,
            };
            
            manager.registerHandler('ui-aware-handler', uiAwareHandler, null, 1);
            
            // Test without UI hover
            (globalThis as any).hoverUi = undefined;
            const event1 = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event1);
            
            expect(uiAwareHandler.onPointerDown).toHaveBeenCalledWith(event1);
            
            // Clear the active pointer
            const upEvent = createMockPointerEvent('pointerup', 1, 50, 50);
            (manager as any).handlePointerUp(upEvent);
            
            // Test with UI hover
            (globalThis as any).hoverUi = 'inventory';
            const event2 = createMockPointerEvent('pointerdown', 2, 60, 60);
            (manager as any).handlePointerDown(event2);
            
            expect(uiAwareHandler.onPointerDown).toHaveBeenCalledTimes(1); // Should not be called second time
            expect(manager.getActivePointers()).toHaveLength(0);
            
            // Restore original value
            (globalThis as any).hoverUi = originalHoverUi;
        });

        it('should filter element-based events', () => {
            const elementFilter = vi.fn().mockReturnValue(true);
            const elementHandler: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
                filter: elementFilter,
            };
            
            manager.registerHandler('element-handler', elementHandler, mockElement, 1);
            
            // Event inside element bounds but filtered
            const event = createMockPointerEvent('pointerdown', 1, 150, 150);
            (manager as any).handlePointerDown(event);
            
            expect(elementFilter).toHaveBeenCalledWith(event);
            expect(elementHandler.onPointerDown).not.toHaveBeenCalled();
            
            // Event outside element bounds - filter should not even be called
            elementFilter.mockClear();
            const outsideEvent = createMockPointerEvent('pointerdown', 2, 50, 50);
            (manager as any).handlePointerDown(outsideEvent);
            
            expect(elementFilter).not.toHaveBeenCalled();
            expect(elementHandler.onPointerDown).not.toHaveBeenCalled();
        });
    });

    describe('External handler filters', () => {
        beforeEach(() => {
            manager.initialize();
        });

        it('should add external filter to handler', () => {
            const handler: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
            };
            const externalFilter = vi.fn().mockReturnValue(true);
            
            manager.registerHandler('test-handler', handler, null, 1);
            manager.addHandlerFilter('test-handler', externalFilter);
            
            expect(manager.hasHandlerFilter('test-handler')).toBe(true);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            expect(externalFilter).toHaveBeenCalledWith(event);
            expect(handler.onPointerDown).not.toHaveBeenCalled();
        });

        it('should remove external filter from handler', () => {
            const handler: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
            };
            const externalFilter = vi.fn().mockReturnValue(true);
            
            manager.registerHandler('test-handler', handler, null, 1);
            manager.addHandlerFilter('test-handler', externalFilter);
            manager.removeHandlerFilter('test-handler');
            
            expect(manager.hasHandlerFilter('test-handler')).toBe(false);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            expect(externalFilter).not.toHaveBeenCalled();
            expect(handler.onPointerDown).toHaveBeenCalledWith(event);
        });

        it('should handle removing non-existent external filter', () => {
            // Should not throw when removing non-existent filter
            expect(() => {
                manager.removeHandlerFilter('non-existent-handler');
            }).not.toThrow();
        });

        it('should apply both built-in and external filters (built-in first)', () => {
            const builtInFilter = vi.fn().mockReturnValue(true);
            const externalFilter = vi.fn().mockReturnValue(false);
            
            const handler: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
                filter: builtInFilter,
            };
            
            manager.registerHandler('test-handler', handler, null, 1);
            manager.addHandlerFilter('test-handler', externalFilter);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            // Built-in filter should be called and block handler
            expect(builtInFilter).toHaveBeenCalledWith(event);
            expect(externalFilter).not.toHaveBeenCalled(); // Short-circuit
            expect(handler.onPointerDown).not.toHaveBeenCalled();
        });

        it('should apply external filter when built-in allows', () => {
            const builtInFilter = vi.fn().mockReturnValue(false);
            const externalFilter = vi.fn().mockReturnValue(true);
            
            const handler: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
                filter: builtInFilter,
            };
            
            manager.registerHandler('test-handler', handler, null, 1);
            manager.addHandlerFilter('test-handler', externalFilter);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            // Both filters should be called, external blocks
            expect(builtInFilter).toHaveBeenCalledWith(event);
            expect(externalFilter).toHaveBeenCalledWith(event);
            expect(handler.onPointerDown).not.toHaveBeenCalled();
        });

        it('should allow handler when both filters allow', () => {
            const builtInFilter = vi.fn().mockReturnValue(false);
            const externalFilter = vi.fn().mockReturnValue(false);
            
            const handler: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
                filter: builtInFilter,
            };
            
            manager.registerHandler('test-handler', handler, null, 1);
            manager.addHandlerFilter('test-handler', externalFilter);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            // Both filters should be called and allow
            expect(builtInFilter).toHaveBeenCalledWith(event);
            expect(externalFilter).toHaveBeenCalledWith(event);
            expect(handler.onPointerDown).toHaveBeenCalledWith(event);
        });

        it('should work with only external filter (no built-in)', () => {
            const handler: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
            };
            const externalFilter = vi.fn().mockReturnValue(false);
            
            manager.registerHandler('test-handler', handler, null, 1);
            manager.addHandlerFilter('test-handler', externalFilter);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            expect(externalFilter).toHaveBeenCalledWith(event);
            expect(handler.onPointerDown).toHaveBeenCalledWith(event);
        });

        it('should handle external filter errors gracefully', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const faultyExternalFilter = vi.fn().mockImplementation(() => {
                throw new Error('External filter error');
            });
            
            const handler: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
            };
            
            manager.registerHandler('test-handler', handler, null, 1);
            manager.addHandlerFilter('test-handler', faultyExternalFilter);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error in external handler filter'),
                expect.any(Error),
            );
            expect(handler.onPointerDown).toHaveBeenCalledWith(event);
            
            consoleErrorSpy.mockRestore();
        });

        it('should clean up external filters when handler is unregistered', () => {
            const handler: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
            };
            const externalFilter = vi.fn().mockReturnValue(true);
            
            manager.registerHandler('test-handler', handler, null, 1);
            manager.addHandlerFilter('test-handler', externalFilter);
            
            expect(manager.hasHandlerFilter('test-handler')).toBe(true);
            
            manager.unregisterHandler('test-handler');
            
            expect(manager.hasHandlerFilter('test-handler')).toBe(false);
        });

        it('should replace external filter when adding to same handler', () => {
            const handler: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
            };
            const firstFilter = vi.fn().mockReturnValue(true);
            const secondFilter = vi.fn().mockReturnValue(false);
            
            manager.registerHandler('test-handler', handler, null, 1);
            manager.addHandlerFilter('test-handler', firstFilter);
            manager.addHandlerFilter('test-handler', secondFilter);
            
            const event = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event);
            
            expect(firstFilter).not.toHaveBeenCalled();
            expect(secondFilter).toHaveBeenCalledWith(event);
            expect(handler.onPointerDown).toHaveBeenCalledWith(event);
        });

        it('should apply external filter to pointer move events', () => {
            const handler: PointerEventHandler = {
                onPointerMove: vi.fn().mockReturnValue(true),
            };
            const externalFilter = vi.fn().mockReturnValue(true);
            
            manager.registerHandler('test-handler', handler, null, 1);
            manager.addHandlerFilter('test-handler', externalFilter);
            
            const event = createMockPointerEvent('pointermove', 1, 50, 50);
            (manager as any).handlePointerMove(event);
            
            expect(externalFilter).toHaveBeenCalledWith(event);
            expect(handler.onPointerMove).not.toHaveBeenCalled();
        });

        it('should demonstrate real-world UI blocking scenario', () => {
            // Mock globalThis.hoverUi
            const originalHoverUi = (globalThis as any).hoverUi;
            
            // Camera handler without built-in filter (legacy code)
            const cameraHandler: PointerEventHandler = {
                onPointerDown: vi.fn().mockReturnValue(true),
            };
            
            manager.registerHandler('camera-control', cameraHandler, null, 1);
            
            // Add external filter for UI blocking (new feature)
            manager.addHandlerFilter('camera-control', () => {
                return !!(globalThis as any).hoverUi;
            });
            
            // Test without UI hover - camera should work
            (globalThis as any).hoverUi = undefined;
            const event1 = createMockPointerEvent('pointerdown', 1, 50, 50);
            (manager as any).handlePointerDown(event1);
            
            expect(cameraHandler.onPointerDown).toHaveBeenCalledWith(event1);
            
            // Clear active pointer
            const upEvent = createMockPointerEvent('pointerup', 1, 50, 50);
            (manager as any).handlePointerUp(upEvent);
            
            // Test with UI hover - camera should be blocked
            (globalThis as any).hoverUi = 'inventory';
            const event2 = createMockPointerEvent('pointerdown', 2, 60, 60);
            (manager as any).handlePointerDown(event2);
            
            expect(cameraHandler.onPointerDown).toHaveBeenCalledTimes(1); // Should not be called second time
            expect(manager.getActivePointers()).toHaveLength(0);
            
            // Restore original value
            (globalThis as any).hoverUi = originalHoverUi;
        });
    });
});
