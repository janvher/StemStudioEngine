import * as THREE from "three";
import {describe, it, expect} from "vitest";

import {identityLUT} from "./LUTLoader";

describe("identityLUT", () => {
    it("returns a Data3DTexture of size 2", () => {
        const lut = identityLUT();
        expect(lut.size).toBe(2);
        expect(lut.texture).toBeInstanceOf(THREE.Data3DTexture);
        expect(lut.source).toBe("<identity>");
    });

    it("encodes 8 corner colors matching xyz→rgb identity", () => {
        const lut = identityLUT();
        const data = lut.texture.image.data as Uint8Array;
        expect(data.length).toBe(2 * 2 * 2 * 4);

        // Corner (0,0,0) → (0,0,0,255)
        expect(data[0]).toBe(0);
        expect(data[1]).toBe(0);
        expect(data[2]).toBe(0);
        expect(data[3]).toBe(255);

        // Corner (1,1,1) → last RGBA quad → (255,255,255,255)
        const last = data.length - 4;
        expect(data[last]).toBe(255);
        expect(data[last + 1]).toBe(255);
        expect(data[last + 2]).toBe(255);
        expect(data[last + 3]).toBe(255);
    });

    it("uses RGBA + UnsignedByte + linear filters (match TSL lut3D expectations)", () => {
        const lut = identityLUT();
        expect(lut.texture.format).toBe(THREE.RGBAFormat);
        expect(lut.texture.type).toBe(THREE.UnsignedByteType);
        expect(lut.texture.minFilter).toBe(THREE.LinearFilter);
        expect(lut.texture.magFilter).toBe(THREE.LinearFilter);
    });
});
