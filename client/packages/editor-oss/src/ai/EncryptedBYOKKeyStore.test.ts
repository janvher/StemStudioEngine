// @vitest-environment jsdom
import {beforeEach, describe, expect, it} from "vitest";

import {InMemoryBYOKKeyStore} from "./BYOKKeyStore";
import {EncryptedBYOKKeyStore} from "./EncryptedBYOKKeyStore";

// jsdom doesn't ship SubtleCrypto by default. Polyfill from Node's webcrypto.
if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {webcrypto} = require("node:crypto");
    Object.defineProperty(globalThis, "crypto", {value: webcrypto, configurable: true});
}

describe("EncryptedBYOKKeyStore", () => {
    let underlying: InMemoryBYOKKeyStore;
    let store: EncryptedBYOKKeyStore;

    beforeEach(() => {
        underlying = new InMemoryBYOKKeyStore();
        store = new EncryptedBYOKKeyStore(underlying);
    });

    it("acts as a pass-through when no passphrase is configured", async () => {
        await store.set("anthropic", "sk-plain");
        expect(await store.get("anthropic")).toBe("sk-plain");
        expect(await underlying.get("anthropic")).toBe("sk-plain");
        expect(store.isUnlocked()).toBe(false); // no passphrase, no key
        expect(await store.hasPassphrase()).toBe(false);
    });

    it("encrypts values under a configured passphrase and decrypts on read", async () => {
        await store.setPassphrase("hunter22");
        await store.set("anthropic", "sk-secret");

        // Underlying entry is opaque ciphertext, not the plaintext.
        const stored = await underlying.get("anthropic");
        expect(stored).toBeDefined();
        expect(stored).not.toBe("sk-secret");
        expect(stored!.startsWith("enc:")).toBe(true);

        // Wrapper round-trips back to plaintext.
        expect(await store.get("anthropic")).toBe("sk-secret");
        expect(await store.hasPassphrase()).toBe(true);
        expect(store.isUnlocked()).toBe(true);
    });

    it("unlock() with the right passphrase decrypts existing entries", async () => {
        await store.setPassphrase("hunter22");
        await store.set("openai", "sk-openai");

        // Simulate page reload — new wrapper around the same underlying store.
        const fresh = new EncryptedBYOKKeyStore(underlying);
        expect(fresh.isUnlocked()).toBe(false);
        expect(await fresh.hasPassphrase()).toBe(true);

        // Wrong passphrase: returns false, stays locked.
        expect(await fresh.unlock("wrong-pass")).toBe(false);
        expect(fresh.isUnlocked()).toBe(false);

        // Right passphrase: unlocks.
        expect(await fresh.unlock("hunter22")).toBe(true);
        expect(fresh.isUnlocked()).toBe(true);
        expect(await fresh.get("openai")).toBe("sk-openai");
    });

    it("rejects get() while locked when ciphertext is present", async () => {
        await store.setPassphrase("hunter22");
        await store.set("anthropic", "sk-secret");

        const fresh = new EncryptedBYOKKeyStore(underlying);
        await expect(fresh.get("anthropic")).rejects.toThrow(/locked/i);
    });

    it("rejects set() while locked when a passphrase is configured", async () => {
        await store.setPassphrase("hunter22");
        const fresh = new EncryptedBYOKKeyStore(underlying);
        await expect(fresh.set("anthropic", "new-key")).rejects.toThrow(/locked/i);
    });

    it("all() skips ciphertext entries when locked", async () => {
        await store.setPassphrase("hunter22");
        await store.set("anthropic", "sk-a");
        await store.set("openai", "sk-o");

        const fresh = new EncryptedBYOKKeyStore(underlying);
        const visible = await fresh.all();
        // Ciphertext entries are skipped, not surfaced as garbage.
        expect(visible.anthropic).toBeUndefined();
        expect(visible.openai).toBeUndefined();

        await fresh.unlock("hunter22");
        const decrypted = await fresh.all();
        expect(decrypted.anthropic).toBe("sk-a");
        expect(decrypted.openai).toBe("sk-o");
    });

    it("resetPassphrase() wipes all keys and clears the lock", async () => {
        await store.setPassphrase("hunter22");
        await store.set("anthropic", "sk-secret");

        await store.resetPassphrase();

        expect(await store.hasPassphrase()).toBe(false);
        expect(await store.get("anthropic")).toBeUndefined();
        expect(store.isUnlocked()).toBe(false);
    });

    it("setPassphrase() re-encrypts existing plaintext entries", async () => {
        // Start in plain mode with a key already configured.
        await store.set("anthropic", "sk-plaintext");
        expect(await underlying.get("anthropic")).toBe("sk-plaintext");

        // Then add a passphrase. Existing plaintext should be re-encrypted.
        await store.setPassphrase("hunter22");

        const stored = await underlying.get("anthropic");
        expect(stored!.startsWith("enc:")).toBe(true);
        expect(await store.get("anthropic")).toBe("sk-plaintext");
    });

    it("setPassphrase() to a new passphrase re-encrypts existing ciphertext", async () => {
        await store.setPassphrase("first-pass");
        await store.set("anthropic", "sk-secret");

        // Change passphrase. We're still unlocked (from setPassphrase above).
        await store.setPassphrase("second-pass");

        // Old passphrase no longer works.
        const fresh = new EncryptedBYOKKeyStore(underlying);
        expect(await fresh.unlock("first-pass")).toBe(false);
        expect(await fresh.unlock("second-pass")).toBe(true);
        expect(await fresh.get("anthropic")).toBe("sk-secret");
    });

    it("lock() clears the derived key without touching underlying storage", async () => {
        await store.setPassphrase("hunter22");
        await store.set("anthropic", "sk-secret");

        store.lock();
        expect(store.isUnlocked()).toBe(false);
        await expect(store.get("anthropic")).rejects.toThrow(/locked/i);

        // Underlying ciphertext is intact.
        expect((await underlying.get("anthropic"))!.startsWith("enc:")).toBe(true);
    });

    it("setPassphrase() rejects an empty string", async () => {
        await expect(store.setPassphrase("")).rejects.toThrow(/cannot be empty/i);
        await expect(store.setPassphrase("   ")).rejects.toThrow(/cannot be empty/i);
    });
});
