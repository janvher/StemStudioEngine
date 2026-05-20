import {useState, useEffect, useCallback} from "react";

/**
 * A hook for managing state that persists to localStorage.
 * Replaces the common pattern of:
 *   const [state, setState] = useState(() => JSON.parse(localStorage.getItem('key') || 'default'));
 *   useEffect(() => { localStorage.setItem('key', JSON.stringify(state)); }, [state]);
 *
 * @param key - The localStorage key to use
 * @param initialValue - The initial value if nothing is stored
 * @returns A tuple of [storedValue, setValue] similar to useState
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
    // Initialize state from localStorage or use initial value
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Persist to localStorage whenever value changes
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.warn(`Error writing to localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    // Wrapper to handle function updates
    const setValue = useCallback((value: T | ((prev: T) => T)) => {
        setStoredValue(prev => {
            const newValue = value instanceof Function ? value(prev) : value;
            return newValue;
        });
    }, []);

    return [storedValue, setValue];
}
