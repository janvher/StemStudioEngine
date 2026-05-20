import {useEffect, useState} from "react";

import {CustomWarning} from "./CustomWarning";

export type WarningOptions = {
    title?: string;
    description?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
};

let listener: ((opts: WarningOptions | null) => void) | null = null;

export const warningService = {
    show: (options: WarningOptions) => {
        listener?.(options);
    },
    hide: () => {
        listener?.(null);
    },
    subscribe: (fn: typeof listener) => {
        listener = fn;
    },
};

export const WarningRenderer = () => {
    const [warning, setWarning] = useState<WarningOptions>();

    useEffect(() => {
        warningService.subscribe((opts) => setWarning(opts ?? undefined));
    }, []);

    if (!warning) return null;

    return (
        <CustomWarning
            title={warning.title}
            description={warning.description}
            onCancel={
                warning.onCancel
                    ? () => {
                          warning.onCancel?.();
                          warningService.hide();
                      }
                    : undefined
            }
            onConfirm={() => {
                if (warning.onConfirm) {
                    warning.onConfirm();
                }
                warningService.hide();
            }}
        />
    );
};
