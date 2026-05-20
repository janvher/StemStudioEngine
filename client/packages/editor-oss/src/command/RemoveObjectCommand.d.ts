export class RemoveObjectCommand {
    constructor(object: any, parent?: any);
    execute: () => {message: string; status: string};
    undo: () => {message: string; status: string};
    toJSON: () => any;
    fromJSON: (json: any) => any;
}
