import React, {useCallback, useRef, useState, useEffect} from "react";

export interface TooltipOptions {
    delay?: number;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
    offset?: number;
    // Mobile touch options
    touchBehavior?: "hover" | "tap" | "longPress" | "disabled";
    longPressDelay?: number;
    autoHideDelay?: number;
}

export interface TooltipState {
    visible: boolean;
    position: {
        top: number;
        left: number;
        placement: 'top' | 'bottom' | 'left' | 'right';
    };
}

export interface TooltipActions {
    show: () => void;
    hide: () => void;
    toggle: () => void;
    // Event handlers
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
    // Touch event handlers
    onTouchStart: (e: TouchEvent | React.TouchEvent) => void;
    onTouchEnd: (e: TouchEvent | React.TouchEvent) => void;
    onTouchCancel: () => void;
}

export const useTooltip = (
    targetRef: React.RefObject<HTMLElement>,
    options: TooltipOptions = {},
): [TooltipState, TooltipActions] => {
    const {
        delay = 300,
        position = 'auto',
        offset = 8,
        touchBehavior = 'hover',
        longPressDelay = 500,
        autoHideDelay = 3000,
    } = options;

    const showTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const hideTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const longPressTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const autoHideTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    
    const [visible, setVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [touchStartTime, setTouchStartTime] = useState<number>(0);
    const [calculatedPosition, setCalculatedPosition] = useState<{
        top: number;
        left: number;
        placement: 'top' | 'bottom' | 'left' | 'right';
    }>({
        top: 0,
        left: 0,
        placement: 'top',
    });

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                                 'ontouchstart' in window ||
                                 window.innerWidth <= 768;
            setIsMobile(isMobileDevice);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const calculatePosition = useCallback(() => {
        if (!targetRef.current) return { top: 0, left: 0, placement: 'top' as const };

        const targetRect = targetRef.current.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Mobile-specific adjustments
        const mobileOffset = isMobile ? offset + 4 : offset;
        const viewportPadding = isMobile ? 16 : 8;
        
        // Tooltip dimensions (estimated)
        const tooltipWidth = 200;
        const tooltipHeight = 40;

        let finalPosition = position;
        let top: number;
        let left: number;

        // Auto-detect best position if needed
        if (position === 'auto') {
            const spaceAbove = targetRect.top;
            const spaceBelow = viewportHeight - targetRect.bottom;
            const spaceRight = viewportWidth - targetRect.right;
            
            const requiredSpace = isMobile ? tooltipHeight + 40 : tooltipHeight + 20;
            
            if (spaceAbove >= requiredSpace) {
                finalPosition = 'top';
            } else if (spaceBelow >= requiredSpace) {
                finalPosition = 'bottom';
            } else if (spaceRight >= tooltipWidth + 20) {
                finalPosition = 'right';
            } else {
                finalPosition = 'left';
            }
        }

        // Calculate position based on final placement
        switch (finalPosition) {
            case 'top':
                top = targetRect.top + scrollY - tooltipHeight - mobileOffset;
                left = targetRect.left + scrollX + targetRect.width / 2 - tooltipWidth / 2;
                break;
            case 'bottom':
                top = targetRect.bottom + scrollY + mobileOffset;
                left = targetRect.left + scrollX + targetRect.width / 2 - tooltipWidth / 2;
                break;
            case 'left':
                top = targetRect.top + scrollY + targetRect.height / 2 - tooltipHeight / 2;
                left = targetRect.left + scrollX - tooltipWidth - mobileOffset;
                break;
            case 'right':
                top = targetRect.top + scrollY + targetRect.height / 2 - tooltipHeight / 2;
                left = targetRect.right + scrollX + mobileOffset;
                break;
            default:
                top = targetRect.top + scrollY - tooltipHeight - mobileOffset;
                left = targetRect.left + scrollX + targetRect.width / 2 - tooltipWidth / 2;
                finalPosition = 'top';
        }

        // Clamp to viewport
        if (left < viewportPadding) {
            left = viewportPadding;
        } else if (left + tooltipWidth > viewportWidth - viewportPadding) {
            left = viewportWidth - tooltipWidth - viewportPadding;
        }

        if (top < viewportPadding) {
            top = viewportPadding;
        } else if (top + tooltipHeight > viewportHeight - viewportPadding) {
            top = viewportHeight - tooltipHeight - viewportPadding;
        }

        return {
            top,
            left,
            placement: finalPosition,
        };
    }, [targetRef, position, offset, isMobile]);

    const show = useCallback(() => {
        // Clear any existing timeouts
        [showTimeoutRef, hideTimeoutRef, longPressTimeoutRef, autoHideTimeoutRef].forEach(ref => {
            if (ref.current) clearTimeout(ref.current);
        });
        
        // Mobile-optimized delay
        const showDelay = isMobile ? Math.min(delay, 150) : delay;

        showTimeoutRef.current = setTimeout(() => {
            const pos = calculatePosition();
            setCalculatedPosition(pos);
            setVisible(true);
            
            // Auto-hide on mobile after delay
            if (isMobile && autoHideDelay > 0) {
                autoHideTimeoutRef.current = setTimeout(() => {
                    hide();
                }, autoHideDelay);
            }
        }, showDelay);
    }, [calculatePosition, delay, isMobile, autoHideDelay]);

    const hide = useCallback(() => {
        // Clear all timeouts
        [showTimeoutRef, longPressTimeoutRef, autoHideTimeoutRef].forEach(ref => {
            if (ref.current) clearTimeout(ref.current);
        });
        
        setVisible(false);
    }, []);

    const toggle = useCallback(() => {
        if (visible) {
            hide();
        } else {
            show();
        }
    }, [visible, show, hide]);

    // Mouse event handlers (for desktop)
    const handleMouseEnter = useCallback(() => {
        if (isMobile && touchBehavior !== "hover") return;
        show();
    }, [show, isMobile, touchBehavior]);

    const handleMouseLeave = useCallback(() => {
        if (isMobile && touchBehavior !== "hover") return;
        hide();
    }, [hide, isMobile, touchBehavior]);

    // Touch event handlers (for mobile)
    const handleTouchStart = useCallback((e: TouchEvent | React.TouchEvent) => {
        if (!isMobile || touchBehavior === "disabled" || touchBehavior === "hover") return;
        
        if ('preventDefault' in e) e.preventDefault(); // Prevent mouse events from firing
        setTouchStartTime(Date.now());
        
        if (touchBehavior === "longPress") {
            longPressTimeoutRef.current = setTimeout(() => {
                show();
            }, longPressDelay);
        }
    }, [isMobile, touchBehavior, longPressDelay, show]);

    const handleTouchEnd = useCallback((e: TouchEvent | React.TouchEvent) => {
        if (!isMobile || touchBehavior === "disabled" || touchBehavior === "hover") return;
        
        if ('preventDefault' in e) e.preventDefault();
        const touchDuration = Date.now() - touchStartTime;
        
        if (touchBehavior === "tap" && touchDuration < 300) {
            // Quick tap - toggle tooltip
            toggle();
        } else if (touchBehavior === "longPress") {
            // Clear long press timeout if touch ended early
            if (longPressTimeoutRef.current) {
                clearTimeout(longPressTimeoutRef.current);
            }
        }
    }, [isMobile, touchBehavior, touchStartTime, toggle]);

    const handleTouchCancel = useCallback(() => {
        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
        }
    }, []);

    // Clean up timeouts on unmount
    useEffect(() => {
        return () => {
            [showTimeoutRef, hideTimeoutRef, longPressTimeoutRef, autoHideTimeoutRef].forEach(ref => {
                if (ref.current) clearTimeout(ref.current);
            });
        };
    }, []);

    return [
        {
            visible,
            position: calculatedPosition,
        },
        {
            show,
            hide,
            toggle,
            onMouseEnter: handleMouseEnter,
            onMouseLeave: handleMouseLeave,
            onFocus: handleMouseEnter,
            onBlur: handleMouseLeave,
            onTouchStart: handleTouchStart,
            onTouchEnd: handleTouchEnd,
            onTouchCancel: handleTouchCancel,
        },
    ];
};

