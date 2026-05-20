import {useEffect, useRef, useState} from "react";

export const useSmoothScrollY = (): number => {
    const [scrollY, setScrollY] = useState(0);
    const previousScrollY = useRef(0);
    const animationFrameId = useRef<number | null>(null);

    useEffect(() => {
        const container = document.getElementById("container");

        const handleScroll = () => {
            if (container) {
                const newScrollY = container.scrollTop;
                const scrollDifference = newScrollY - previousScrollY.current;

                if (animationFrameId.current) {
                    cancelAnimationFrame(animationFrameId.current);
                }

                let step = 0;
                const steps = 60;

                const smoothScroll = () => {
                    step += 1;

                    const interpolatedScrollY = previousScrollY.current + scrollDifference * step / steps;

                    setScrollY(interpolatedScrollY);

                    if (step < steps) {
                        animationFrameId.current = requestAnimationFrame(smoothScroll);
                    } else {
                        previousScrollY.current = newScrollY;
                    }
                };

                animationFrameId.current = requestAnimationFrame(smoothScroll);
            }
        };

        container?.addEventListener("scroll", handleScroll);

        return () => {
            container?.removeEventListener("scroll", handleScroll);
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, []);

    return scrollY;
};
