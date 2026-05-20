declare module "MaterialsSerializer" {
  class MaterialsSerializer {
    constructor(app: any);

    toJSON(obj: any): any;
    fromJSON(json: any, parent: any, options: any): any;
  }

  export default MaterialsSerializer;
}

export {};
