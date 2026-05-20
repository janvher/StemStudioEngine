import debounce from "lodash/debounce";
import {useEffect, useMemo, useRef} from "react";

/**
 * Returns a debounced version of the callback using lodash debounce.
 * @param callback Callback to invoke after calls have stopped for the given delay.
 * @param delay Delay in milliseconds.
 * @returns A debounced callback with the same parameters as the input callback.
 */
export function useDebounce<Args extends unknown[]>(
    callback: (...args: Args) => void,
    delay: number,
): (...args: Args) => void {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const debounced = useMemo(
        () => debounce((...args: Args) => callbackRef.current(...args), delay),
        [delay],
    );

    useEffect(() => () => debounced.cancel(), [debounced]);

    return debounced;
}
