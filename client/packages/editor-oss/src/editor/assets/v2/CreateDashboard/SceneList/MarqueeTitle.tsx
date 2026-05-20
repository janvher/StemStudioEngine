import {useEffect, useLayoutEffect, useRef, useState} from "react";
import Marquee from "react-fast-marquee";

import {CardTitle as SceneName} from "../common/GameCard.style";

export const MarqueeTitle = ({text}: {text: string}) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);

    const [isOverflow, setIsOverflow] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    const checkOverflow = () => {
        if (wrapperRef.current && textRef.current) {
            const wrapperWidth = wrapperRef.current.clientWidth;
            const textWidth = textRef.current.scrollWidth;
            setIsOverflow(textWidth > wrapperWidth);
        }
    };

    useLayoutEffect(() => {
        checkOverflow();
    }, [text]);

    useEffect(() => {
        if (!wrapperRef.current) return;

        const observer = new ResizeObserver(checkOverflow);
        observer.observe(wrapperRef.current);

        return () => observer.disconnect();
    }, []);

    return (
        <SceneName
            className="SceneName"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <div
                ref={wrapperRef}
                style={{
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                }}
            >
                {/* hidden span for measurement */}
                <span
                    ref={textRef}
                    style={{
                        position: "absolute",
                        visibility: "hidden",
                        whiteSpace: "nowrap",
                    }}
                >
                    {text}
                </span>

                {isOverflow && isHovering ? (
                    <Marquee
                        speed={25}
                        delay={0}
                    >
                        {text}
                        <div style={{width: "24px"}} />
                    </Marquee>
                ) : (
                    <span
                        style={{
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {text}
                    </span>
                )}
            </div>
        </SceneName>
    );
};
