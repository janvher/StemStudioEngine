// Vitest global setup — referenced by `vite.config.ts` (`test.setupFiles`).
//
// 1. Registers the @testing-library/jest-dom matchers (`toBeInTheDocument`,
//    `toHaveTextContent`, …) against Vitest's `expect`.
// 2. Polyfills a minimal Web Audio API. jsdom ships no `AudioContext`, but
//    several modules (e.g. `serialization/audio/AudioSerializer.js`) build a
//    `THREE.AudioListener` at import time, which throws without it and takes
//    down every test file that transitively imports them.
import "@testing-library/jest-dom/vitest";

class FakeAudioParam {
    value = 0;
    setValueAtTime() {
        return this;
    }
    linearRampToValueAtTime() {
        return this;
    }
    setTargetAtTime() {
        return this;
    }
}

class FakeAudioNode {
    connect() {
        return this;
    }
    disconnect() {
        return this;
    }
}

class FakeGainNode extends FakeAudioNode {
    gain = new FakeAudioParam();
}

class FakeAudioContext {
    currentTime = 0;
    sampleRate = 44100;
    state = "running";
    destination = new FakeAudioNode();
    listener = {
        positionX: new FakeAudioParam(),
        positionY: new FakeAudioParam(),
        positionZ: new FakeAudioParam(),
        forwardX: new FakeAudioParam(),
        forwardY: new FakeAudioParam(),
        forwardZ: new FakeAudioParam(),
        upX: new FakeAudioParam(),
        upY: new FakeAudioParam(),
        upZ: new FakeAudioParam(),
        setPosition() {},
        setOrientation() {},
    };
    createGain() {
        return new FakeGainNode();
    }
    createBufferSource() {
        return Object.assign(new FakeAudioNode(), {
            buffer: null,
            playbackRate: new FakeAudioParam(),
            start() {},
            stop() {},
        });
    }
    createBuffer() {
        return {};
    }
    createMediaElementSource() {
        return new FakeAudioNode();
    }
    createAnalyser() {
        return Object.assign(new FakeAudioNode(), {
            getByteFrequencyData() {},
            getByteTimeDomainData() {},
        });
    }
    createPanner() {
        return new FakeAudioNode();
    }
    decodeAudioData() {
        return Promise.resolve({});
    }
    resume() {
        return Promise.resolve();
    }
    suspend() {
        return Promise.resolve();
    }
    close() {
        return Promise.resolve();
    }
}

const audioCtor = FakeAudioContext as unknown as typeof AudioContext;
if (typeof window !== "undefined") {
    window.AudioContext = window.AudioContext ?? audioCtor;
    (window as typeof window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext ??= audioCtor;
}
globalThis.AudioContext = globalThis.AudioContext ?? audioCtor;
