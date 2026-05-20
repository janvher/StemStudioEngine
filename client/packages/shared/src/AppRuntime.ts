import ApplicationProps, {type ApplicationPropsOptions} from "./ApplicationProps";
import {dispatch} from "./event/DispatchCompat";
import EventList from "./event/EventList";
import ApplicationAuthStore from "./userManagement/editorProfile/ApplicationAuthStore";

export interface AppEventBus {
    call: (event: string, that?: unknown, ...args: any[]) => void;
    on: (event: string, callback: ((...args: any[]) => void) | null) => AppEventBus | void;
    off: (event: string) => AppEventBus | void;
    start: () => void;
    stop: () => void;
    reset: () => void;
}

export class AppRuntime {
    container: HTMLElement;
    options: ApplicationProps;
    event: AppEventBus;
    call: (event: string, ...args: any[]) => void;
    on: (event: string, callback: ((...args: any[]) => void) | null) => void;
    off: (event: string) => void;
    authManager = new ApplicationAuthStore();
    userId: string | null = null;
    isCollaborativeUser: boolean | null = null;

    constructor(container: HTMLElement, options: ApplicationPropsOptions = {}) {
        this.container = container;
        this.options = new ApplicationProps(options);
        const emitter = dispatch.apply(dispatch, EventList) as unknown as AppEventBus;
        if (typeof emitter.start !== "function") {
            emitter.start = () => {};
        }
        if (typeof emitter.stop !== "function") {
            emitter.stop = () => {};
        }
        if (typeof emitter.reset !== "function") {
            emitter.reset = () => {};
        }
        this.event = emitter;
        this.call = emitter.call.bind(emitter);
        this.on = emitter.on.bind(emitter);
        this.off = emitter.off.bind(emitter);
    }
}

export default AppRuntime;
