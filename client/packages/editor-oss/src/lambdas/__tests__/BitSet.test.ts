import {describe, it, expect} from "vitest";

import {BitSet} from "../BitSet";

describe("BitSet", () => {
    it("should set and check bits", () => {
        const bs = new BitSet();
        bs.set(0);
        bs.set(5);

        expect(bs.has(0)).toBe(true);
        expect(bs.has(5)).toBe(true);
        expect(bs.has(1)).toBe(false);
    });

    it("should clear bits", () => {
        const bs = new BitSet();
        bs.set(3);
        expect(bs.has(3)).toBe(true);

        bs.clear(3);
        expect(bs.has(3)).toBe(false);
    });

    it("should auto-grow past 32 bits", () => {
        const bs = new BitSet();
        bs.set(0);
        bs.set(33);
        bs.set(64);

        expect(bs.has(0)).toBe(true);
        expect(bs.has(33)).toBe(true);
        expect(bs.has(64)).toBe(true);
        expect(bs.has(32)).toBe(false);
    });

    it("should detect contains correctly", () => {
        const a = new BitSet();
        a.set(1);
        a.set(2);
        a.set(3);

        const sub = new BitSet();
        sub.set(1);
        sub.set(3);

        expect(a.contains(sub)).toBe(true);

        const extra = new BitSet();
        extra.set(1);
        extra.set(4);
        expect(a.contains(extra)).toBe(false);
    });

    it("should detect intersects correctly", () => {
        const a = new BitSet();
        a.set(1);
        a.set(2);

        const b = new BitSet();
        b.set(2);
        b.set(3);

        expect(a.intersects(b)).toBe(true);

        const c = new BitSet();
        c.set(4);
        expect(a.intersects(c)).toBe(false);
    });

    it("should detect isEmpty", () => {
        const bs = new BitSet();
        expect(bs.isEmpty()).toBe(true);

        bs.set(0);
        expect(bs.isEmpty()).toBe(false);

        bs.clear(0);
        expect(bs.isEmpty()).toBe(true);
    });

    it("should reset all bits", () => {
        const bs = new BitSet();
        bs.set(0);
        bs.set(31);
        bs.reset();

        expect(bs.has(0)).toBe(false);
        expect(bs.has(31)).toBe(false);
        expect(bs.isEmpty()).toBe(true);
    });

    it("should clone independently", () => {
        const bs = new BitSet();
        bs.set(5);
        bs.set(10);

        const copy = bs.clone();
        expect(copy.has(5)).toBe(true);
        expect(copy.has(10)).toBe(true);

        copy.clear(5);
        expect(copy.has(5)).toBe(false);
        expect(bs.has(5)).toBe(true); // original unchanged
    });
});
