import {useEffect, useRef, useState, type CSSProperties, type ReactNode} from "react";

interface MarqueeLabelProps {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    minWidth?: number;
}

export const MarqueeLabel = ({children, className, style, minWidth}: MarqueeLabelProps) => {
    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLSpanElement>(null);
    const [overflowPx, setOverflowPx] = useState(0);

    useEffect(() => {
        const outer = outerRef.current;
        const inner = innerRef.current;
        if (!outer || !inner) return;

        const ro = new ResizeObserver(() => {
            const diff = inner.scrollWidth - outer.clientWidth;
            setOverflowPx(diff > 1 ? diff : 0);
        });
        ro.observe(outer);
        ro.observe(inner);
        return () => ro.disconnect();
    }, [children]);

    return (
        <div
            ref={outerRef}
            className={className}
            style={{
                flex: "1 1 0",
                minWidth: minWidth ?? 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                ...style,
            }}>
            <span
                ref={innerRef}
                style={{
                    display: "inline-block",
                    ["--marquee-dist" as string]: `-${overflowPx}px`,
                    animation: overflowPx > 0 ? undefined : "none",
                }}
                className={overflowPx > 0 ? "marquee-scroll" : undefined}>
                {children}
            </span>
            {overflowPx > 0 && (
                <style>{`
                    @keyframes marquee-ping-pong {
                        0%, 10% { transform: translateX(0); }
                        45%, 55% { transform: translateX(var(--marquee-dist)); }
                        90%, 100% { transform: translateX(0); }
                    }
                    .marquee-scroll {
                        animation: marquee-ping-pong 4s ease-in-out infinite;
                    }
                    div:not(:hover) > .marquee-scroll {
                        animation: none;
                    }
                `}</style>
            )}
        </div>
    );
};
