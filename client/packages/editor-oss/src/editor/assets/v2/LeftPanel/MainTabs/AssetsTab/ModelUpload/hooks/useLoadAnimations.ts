import { useEffect, useState } from 'react';
import { AnimationClip } from 'three';

import { showToast } from '@stem/editor-oss/showToast';
import { loadAnimations } from '../utils/loadAnimations';

export const useLoadAnimations = () => {
    const [animations, setAnimations] = useState<AnimationClip[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    
    // Load animations
    useEffect(() => {
        const abortController = new AbortController();

        // Reset state
        setAnimations([]);
        setIsLoading(true);

        loadAnimations(abortController.signal)
            .then(clips => {
                abortController.signal.throwIfAborted();
                setAnimations(clips);
            })
            .catch((error) => {
                console.error("Error loading animations:", error);
                if (error?.name !== "AbortError") {
                    showToast({ type: "warning", title: "Could not load animations" });
                }
            })
            .finally(() => {
                setIsLoading(false);
            });
        
        return () => {
            abortController.abort();
        };
    }, [setAnimations, setIsLoading]);

    return { animations, isLoading };
};
