
/**
 * Module: UniformsSerializer.js
 * Purpose: Contains logic for uniforms serializer.
 */


import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import TexturesSerializer from "../texture/TexturesSerializer";

/**
 * UniformsSerializer
 *
 */
class UniformsSerializer extends BaseSerializer {
    toJSON(obj) {
        let json = {};

        Object.keys(obj).forEach(n => {
            const item = obj[n];

            if (item.value === null) {
                json[n] = {
                    type: "null",
                    value: null,
                };
            } else if (item.value instanceof THREE.Texture) {

                json[n] = {
                    type: "t",
                    value: new TexturesSerializer().toJSON(item.value),
                };
            } else if (item.value instanceof THREE.Color) {

                json[n] = {
                    type: "c",
                    value: item.value,
                };
            } else if (Number.isInteger(item.value)) {

                json[n] = {
                    type: "i",
                    value: item.value,
                };
            } else if (typeof item.value === "number") {

                json[n] = {
                    type: "f",
                    value: item.value,
                };
            } else if (item.value instanceof THREE.Vector2) {
                // Vector2
                json[n] = {
                    type: "v2",
                    value: item.value,
                };
            } else if (item.value instanceof THREE.Vector3) {
                // Vector3
                json[n] = {
                    type: "v3",
                    value: item.value,
                };
            } else if (item.value instanceof THREE.Vector4) {
                // Vector4
                json[n] = {
                    type: "v4",
                    value: item.value,
                };
            } else if (item.value instanceof THREE.Matrix3) {
                // Matrix3
                json[n] = {
                    type: "m3",
                    value: item.value,
                };
            } else if (item.value instanceof THREE.Matrix4) {
                // Matrix4
                json[n] = {
                    type: "m4",
                    value: item.value,
                };
            } else if (Array.isArray(item.value) && item.value.every(n => typeof n === "number")) {

                json[n] = {
                    type: "af",
                    value: item.value,
                };
            } else if (Array.isArray(item.value) && item.value.every(n => n instanceof THREE.Vector2)) {

                json[n] = {
                    type: "av2",
                    value: item.value,
                };
            } else if (Array.isArray(item.value) && item.value.every(n => n instanceof THREE.Vector3)) {

                json[n] = {
                    type: "av3",
                    value: item.value,
                };
            } else if (Array.isArray(item.value) && item.value.every(n => n instanceof THREE.Vector4)) {

                json[n] = {
                    type: "av4",
                    value: item.value,
                };
            } else if (Array.isArray(item.value) && item.value.every(n => n instanceof THREE.Matrix3)) {

                json[n] = {
                    type: "am3",
                    value: item.value,
                };
            } else if (Array.isArray(item.value) && item.value.every(n => n instanceof THREE.Matrix4)) {

                json[n] = {
                    type: "am4",
                    value: item.value,
                };
            } else if (Array.isArray(item.value) && item.value.every(n => n instanceof THREE.Texture)) {

                json[n] = {
                    type: "at",
                    value: item.value.map(m => new TexturesSerializer().toJSON(m)),
                };
            } else {
                console.warn(`UniformsSerializer: unknown uniform type: `, item.value);
                json[n] = {
                    type: "unknow",
                    value: item.value,
                };
            }
        });

        return json;
    }

    fromJSON(json, parent, options) {
        let obj = {};

        Object.keys(json).forEach(n => {
            const type = json[n].type;
            const value = json[n].value;

            if (type === "null") {
                obj[n] = {
                    value: null,
                };
            } else if (type === "t") {
                obj[n] = {
                    value: new TexturesSerializer().fromJSON(value, undefined, options),
                };
            } else if (type === "c" || type === "color") {
                // TODO
                obj[n] = {
                    value: new THREE.Color(value),
                };
            } else if (type === "i") {
                obj[n] = {
                    value,
                };
            } else if (type === "f") {
                obj[n] = {
                    value,
                };
            } else if (type === "v2") {
                obj[n] = {
                    value: new THREE.Vector2().copy(value),
                };
            } else if (type === "v3") {
                obj[n] = {
                    value: new THREE.Vector3().copy(value),
                };
            } else if (type === "v4") {
                obj[n] = {
                    value: new THREE.Vector4().copy(value),
                };
            } else if (type === "m3") {
                obj[n] = {
                    value: new THREE.Matrix3().copy(value),
                };
            } else if (type === "m4") {
                obj[n] = {
                    value: new THREE.Matrix4().copy(value),
                };
            } else if (type === "af") {
                obj[n] = {
                    value: value,
                };
            } else if (type === "av2") {
                obj[n] = {
                    value: value.map(m => new THREE.Vector2().copy(m)),
                };
            } else if (type === "av3") {
                obj[n] = {
                    value: value.map(m => new THREE.Vector3().copy(m)),
                };
            } else if (type === "av4") {
                obj[n] = {
                    value: value.map(m => new THREE.Vector4().copy(m)),
                };
            } else if (type === "am3") {
                obj[n] = {
                    value: value.map(m => new THREE.Matrix3().copy(m)),
                };
            } else if (type === "am4") {
                obj[n] = {
                    value: value.map(m => new THREE.Matrix4().copy(m)),
                };
            } else if (type === "at") {
                obj[n] = {
                    value: value.map(m => new TexturesSerializer().fromJSON(m, undefined, options)),
                };
            } else {
                console.warn(`UniformsSerializer: unknown uniform type: `, type);
                obj[n] = {
                    value: value,
                };
            }
        });

        return obj;
    }
}

export default UniformsSerializer;
