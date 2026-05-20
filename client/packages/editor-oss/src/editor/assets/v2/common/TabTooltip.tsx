import React, {useCallback, useRef, useState, useEffect} from "react";
import {createPortal} from "react-dom";
import styled from "styled-components";

import {flexCenter} from "../../../../assets/style";

const TooltipBox = styled.div<{
    $show?: boolean;
}>`
    position: fixed;
    text-align: center;
    ${flexCenter};
    align-items: center;
    min-width: 84px;
    padding: 6px 10px;
    height: auto;
    min-height: 24px;
    border-radius: 6px;
    box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.4);
    background-color: var(--theme-container-secondary-dark);
    color: white;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-medium-plus);
    z-index: 10000;
    opacity: ${({$show}) => $show ? 1 : 0};
    transform: ${({$show}) => $show ? "translateY(0) scale(1)" : "translateY(4px) scale(0.96)"};
    transition:
        opacity 0.18s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: ${({$show}) => $show ? "all" : "none"};
    white-space: nowrap;

    /* Arrow pointing up */
    &::after {
        content: "";
        position: absolute;
        top: -5px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-bottom: 5px solid var(--theme-container-secondary-dark);
    }

    /* Arrow pointing down (when tooltip is above) */
    &.above::after {
        top: 100%;
        border-bottom: none;
        border-top: 5px solid var(--theme-container-secondary-dark);
    }
`;

type Props = {
    text: string;
    children: React.ReactNode;
    delay?: number;
    id?: string; // For accessibility
};

export const TabTooltip = ({text, children, delay = 500, id}: Props) => {
    const triggerRef = useRef<HTMLDivElement>(null);
    const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [visible, setVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [position, setPosition] = useState<{
        top: number;
        left: number;
        isAbove: boolean;
    }>({top: 0, left: 0, isAbove: false});

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            const isMobileDevice =
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                "ontouchstart" in window ||
                window.innerWidth <= 768;
            setIsMobile(isMobileDevice);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const calculatePosition = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return {top: 0, left: 0, isAbove: false};

        const triggerRect = trigger.getBoundingClientRect();
        const tooltipWidth = Math.max(84, Math.min(text.length * 7 + 20, 200)); // Cap max width
        const tooltipHeight = 24; // Fixed height for tab tooltips

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        // Mobile-specific adjustments
        const mobileOffset = isMobile ? 14 : 10; // Extra space on mobile
        const viewportPadding = isMobile ? 16 : 8; // More padding on mobile

        // Calculate horizontal position (centered on trigger)
        let left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipWidth / 2;

        // Clamp horizontal position to viewport
        if (left < viewportPadding) {
            left = viewportPadding;
        } else if (left + tooltipWidth > viewportWidth - viewportPadding) {
            left = viewportWidth - tooltipWidth - viewportPadding;
        }

        // Calculate vertical position - prefer below for tabs
        let top = triggerRect.bottom + scrollY + mobileOffset;
        let isAbove = false;

        // If not enough space below, show above
        const requiredSpaceBelow = isMobile ? tooltipHeight + 30 : tooltipHeight + 20;
        if (triggerRect.bottom + requiredSpaceBelow > viewportHeight) {
            top = triggerRect.top + scrollY - tooltipHeight - mobileOffset;
            isAbove = true;
        }

        return {top, left, isAbove};
    }, [text, isMobile]);

    const handleMouseEnter = useCallback(() => {
        // Clear any existing timeouts
        [showTimeoutRef, hideTimeoutRef, autoHideTimeoutRef].forEach(ref => {
            if (ref.current) clearTimeout(ref.current);
        });

        // Mobile-optimized delay
        const showDelay = isMobile ? Math.min(delay, 200) : delay;

        showTimeoutRef.current = setTimeout(() => {
            const pos = calculatePosition();
            setPosition(pos);
            setShouldRender(true);

            // Small delay to allow DOM to update before showing
            requestAnimationFrame(() => {
                setVisible(true);

                // Auto-hide on mobile after 4 seconds (longer for tabs)
                if (isMobile) {
                    autoHideTimeoutRef.current = setTimeout(() => {
                        handleMouseLeave();
                    }, 4000);
                }
            });
        }, showDelay);
    }, [calculatePosition, delay, isMobile]);

    const handleMouseLeave = useCallback(() => {
        // Clear all timeouts
        [showTimeoutRef, autoHideTimeoutRef].forEach(ref => {
            if (ref.current) clearTimeout(ref.current);
        });

        setVisible(false);
        // Hide after transition completes
        hideTimeoutRef.current = setTimeout(() => setShouldRender(false), 180);
    }, []);

    const handleFocus = useCallback(() => {
        handleMouseEnter();
    }, [handleMouseEnter]);

    const handleBlur = useCallback(() => {
        handleMouseLeave();
    }, [handleMouseLeave]);

    // Clean up timeouts on unmount
    useEffect(() => {
        return () => {
            [showTimeoutRef, hideTimeoutRef, autoHideTimeoutRef].forEach(ref => {
                if (ref.current) clearTimeout(ref.current);
            });
        };
    }, []);

    const tooltipId = id || `tab-tooltip-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{display: "contents"}}
                aria-describedby={visible ? tooltipId : undefined}
            >
                {children}
            </div>

            {shouldRender &&
                createPortal(
                    <TooltipBox
                        id={tooltipId}
                        role="tooltip"
                        className={position.isAbove ? "above" : ""}
                        $show={visible}
                        style={{
                            top: position.top,
                            left: position.left,
                        }}
                        aria-hidden={!visible}
                    >
                        {text}
                    </TooltipBox>,
                    document.body,
                )}
        </>
    );
};
