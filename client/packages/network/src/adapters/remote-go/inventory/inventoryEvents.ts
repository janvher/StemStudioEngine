export const EVENTS = {
    INVENTORY_ADD: "inventoryAdd",
    INVENTORY_DELETE: "inventoryDelete",
    INVENTORY_INIT: "inventoryInit",
} as const;

export type EventName = keyof typeof EVENTS;

export interface EventDetail {
    [key: string]: any;
}

const eventQueue: {eventName: string; detail: EventDetail}[] = [];
let inventoryReady = false;

export const dispatchCustomInventoryEvent = <T extends EventName>(
    eventName: (typeof EVENTS)[T],
    detail: EventDetail = {},
): void => {
    if (!inventoryReady) {
        eventQueue.push({eventName, detail});
    } else {
        const event = new CustomEvent(eventName, {detail});
        window.dispatchEvent(event);
    }
};

export const flushInventoryEvents = (args: {
    initInventory: (e: any) => void;
    addItemToInventory: (e: any) => Promise<void>;
    deleteItemFromInventory: (e: any) => Promise<void>;
}): void => {
    const {initInventory, addItemToInventory, deleteItemFromInventory} = args;
    inventoryReady = true;
    while (eventQueue.length > 0) {
        const {eventName, detail} = eventQueue.shift()!;
        const event = new CustomEvent(eventName, {detail});
        window.dispatchEvent(event);

        if (eventName === EVENTS.INVENTORY_INIT && typeof initInventory === "function") {
            initInventory(new CustomEvent(eventName, {detail}));
        }
        if (eventName === EVENTS.INVENTORY_ADD && typeof addItemToInventory === "function") {
            addItemToInventory(new CustomEvent(eventName, {detail}));
        }
        if (eventName === EVENTS.INVENTORY_DELETE && typeof deleteItemFromInventory === "function") {
            deleteItemFromInventory(new CustomEvent(eventName, {detail}));
        }
    }
};
