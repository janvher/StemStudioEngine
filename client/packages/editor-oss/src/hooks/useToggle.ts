import {useState, useCallback} from "react";

/**
 * A hook for managing toggle/visibility state with stable callbacks.
 * Replaces the common pattern of:
 *   const [isOpen, setIsOpen] = useState(false);
 *   const toggle = () => setIsOpen(!isOpen);
 *
 * @param initialValue - The initial state value (default: false)
 * @returns Object containing value, toggle, setTrue, setFalse, and setValue
 */
export const useToggle = (initialValue = false) => {
    const [value, setValue] = useState(initialValue);

    const toggle = useCallback(() => setValue(v => !v), []);
    const setTrue = useCallback(() => setValue(true), []);
    const setFalse = useCallback(() => setValue(false), []);

    return {value, toggle, setTrue, setFalse, setValue};
};
