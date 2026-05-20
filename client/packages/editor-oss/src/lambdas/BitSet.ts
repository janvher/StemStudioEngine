/**
 * Lightweight Uint32Array-backed bitset. Auto-grows when bit indices exceed capacity.
 */
export class BitSet {
    private words: Uint32Array;

    constructor() {
        this.words = new Uint32Array(1); // 32 bits initially
    }

    set(bit: number): void {
        const word = bit >>> 5; // bit / 32
        this.grow(word);
        this.words[word] = (this.words[word] ?? 0) | (1 << (bit & 31));
    }

    clear(bit: number): void {
        const word = bit >>> 5;
        if (word < this.words.length) {
            this.words[word] = (this.words[word] ?? 0) & ~(1 << (bit & 31));
        }
    }

    has(bit: number): boolean {
        const word = bit >>> 5;
        return word < this.words.length && ((this.words[word] ?? 0) & (1 << (bit & 31))) !== 0;
    }

    /**
     * Returns true if ALL bits set in `other` are also set in this
     * @param other
     */
    contains(other: BitSet): boolean {
        for (let i = 0; i < other.words.length; i++) {
            const o = other.words[i] ?? 0;
            const t = i < this.words.length ? (this.words[i] ?? 0) : 0;
            if ((t & o) !== o) return false;
        }
        return true;
    }

    /**
     * Returns true if any bit is set in both this and `other`
     * @param other
     */
    intersects(other: BitSet): boolean {
        const len = Math.min(this.words.length, other.words.length);
        for (let i = 0; i < len; i++) {
            if (((this.words[i] ?? 0) & (other.words[i] ?? 0)) !== 0) return true;
        }
        return false;
    }

    isEmpty(): boolean {
        for (let i = 0; i < this.words.length; i++) {
            if (this.words[i] !== 0) return false;
        }
        return true;
    }

    reset(): void {
        this.words.fill(0);
    }

    clone(): BitSet {
        const copy = new BitSet();
        copy.words = new Uint32Array(this.words);
        return copy;
    }

    private grow(wordIndex: number): void {
        if (wordIndex < this.words.length) return;
        const newWords = new Uint32Array(wordIndex + 1);
        newWords.set(this.words);
        this.words = newWords;
    }
}
