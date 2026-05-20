declare module "MoveObjectCommand" {
  class MoveObjectCommand {
    constructor(object: any, newParent: any, newBefore: any);
    execute: () => void;
    undo: () => void;
    toJSON: () => any;
    fromJSON: (json: any) => any;
  }

  export default MoveObjectCommand;
}

export {};
