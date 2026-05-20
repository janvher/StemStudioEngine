import {Camera, Scene} from "three";

declare module "./converter" {
    interface Converter {
        toJSON(obj: {
            options: any;
            camera: Camera;
            scripts: any[];
            animations: any[];
            scene: Scene;
        }): any[];
    }

    const Converter: {
        new (): Converter;
    };
}
