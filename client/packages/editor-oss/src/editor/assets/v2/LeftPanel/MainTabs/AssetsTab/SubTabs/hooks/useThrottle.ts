import throttle from "lodash/throttle";
import {useEffect, useMemo, useRef} from "react";

/**
 * Returns a throttled version of the callback using lodash throttle.
 * @param callback Callback to invoke at most once per delay window.
 * @param delay Delay in milliseconds.
 * @returns A throttled callback with the same parameters as the input callback.
 */
export function useThrottle<Args extends unknown[]>(
    callback: (...args: Args) => void,
    delay: number,
): (...args: Args) => void {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const throttled = useMemo(
        () => throttle((...args: Args) => callbackRef.current(...args), delay),
        [delay],
    );

    useEffect(() => () => throttled.cancel(), [throttled]);

    return throttled;
}
