export class AddObjectCommand {
    constructor(obj: any, parent?: any, callback?: any, noSelect?: boolean, noFocus?: boolean);
    execute: () => {message: string; status: string};
    undo: () => {message: string; status: string};
    toJSON: () => any;
    fromJSON: () => any;
}
