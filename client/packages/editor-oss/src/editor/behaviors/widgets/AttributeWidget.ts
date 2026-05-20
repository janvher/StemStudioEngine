import ReactDOM from "react-dom/client";

import {BehaviorAttribute} from "../BehaviorAttributes";


/**
 * AttributeWidget is responsible only for showing the UI and changing the value of an attribute
 * So the data should be ready to just display, no need to convert or customize it
 */
interface AttributeWidget {
    build(
        id: string,
        name: string,
        attribute: BehaviorAttribute,
        getCurrentValue: () => any,
        updateBehaviorField: (value: any) => void,
        root: ReactDOM.Root | null,
    ): void;
    clear(): void;
}

export default AttributeWidget;
