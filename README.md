# StemStudio

> A browser-based 3D sandbox editor and runtime. Build, script, and play 3D games in your browser. Open source under MIT.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Three.js](https://img.shields.io/badge/three.js-r168+-black.svg)](https://threejs.org)
[![Built with Bun](https://img.shields.io/badge/built%20with-bun-orange.svg)](https://bun.sh)

StemStudio gives you a complete authoring environment — scene editor, behavior scripting in JavaScript, physics, multiplayer, an AI copilot — that runs entirely on your machine. Projects live in your browser (IndexedDB) or in a folder you pick (File System Access API). No accounts, no cloud, no lock-in.

## Sponsor this project

If StemStudio is useful to you or your organization, please consider sponsoring its continued development. Sponsorships fund maintenance, new features, documentation, and community support.

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ff69b4.svg)](https://github.com/sponsors/Stem-Studio)

---

## Features

- **3D scene editor** built on Three.js — primitives, materials, transforms, scene tree, viewport, gizmos.
- **Behaviors** — JavaScript classes attached to scene objects with a lifecycle (`init`, `update`, `onCollision`, etc.) and a built-in pack covering input, character controllers, vehicles, AI NPCs, UI, audio, and more.
- **Lambdas** — an entity-component system on top of behaviors when you need archetype-driven, batched work.
- **In-editor code editor** — Monaco for behavior and script authoring with full TypeScript-style assist.
- **Physics** — Ammo.js / Rapier integration with rigid bodies, joints, raycasting.
- **Local multiplayer** — Colyseus sidecar auto-spawned on `bun run dev`. Two browser tabs on the same machine join a real room.
- **AI copilot (BYOK)** — bring your own keys for Anthropic, OpenAI, Meshy (3D model gen), ElevenLabs (TTS), and AnythingWorld. Configure once, use everywhere.
- **Local-first persistence** — IndexedDB for seamless auto-save, or open a real folder via File System Access API (Chromium) for git-friendly workflows.
- **Export & share** — package any project as a standalone static site (Player-only build) you can host anywhere.

## Quick start

Prerequisites: [Bun](https://bun.sh) 1.0+, [Go](https://go.dev) 1.21+, [Node.js](https://nodejs.org) 20+.

```bash
git clone https://github.com/your-org/stemstudio.git
cd stemstudio
git submodule update --init --recursive
bun install
bun run dev
```

That single command starts three processes:

- **Vite** on `http://localhost:5173` — the editor.
- **AI server** on `http://localhost:8081` — proxies AI calls to providers using your keys.
- **Multiplayer sidecar** on `ws://localhost:2567` — Colyseus rooms for local multiplayer.

Open `http://localhost:5173` and follow the first-time bootstrap modal to pick your project storage mode (IndexedDB or local folder).

To use AI features, add a `.env` file (copy from `.env.example`) with whichever provider keys you want:

```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
MESHY_API_KEY=...
ELEVENLABS_API_KEY=...
ANYTHING_WORLD_API_KEY=...
```

Any key you omit makes that provider unavailable — the editor will prompt you for it when you first try a feature that needs it.

## What's in the box

- Editor, player, runtime, behaviors, lambdas, physics, rendering, scheduler, asset loading.
- Monaco-based script/behavior editor.
- Local multiplayer Colyseus sidecar.
- AI proxy server (Go) that forwards calls to your provider keys.
- BYOK key management — keys stay in your browser's IndexedDB and are only sent to the provider you configured.
- Build tooling (Vite, TypeScript, ESLint, Bun test).
- Engine docs alongside the code: behaviors, lambdas/ECS, physics, UI, art specs.

## Documentation

- [Architecture overview](./docs/architecture.md) — how the editor, AI server, and multiplayer sidecar fit together.
- [BYOK setup](./docs/byok.md) — connect your AI provider keys.
- [Multiplayer guide](./docs/multiplayer.md) — local sidecar and self-hosted deployment.
- [Exporting a game](./docs/exporting-a-game.md) — package a Player-only static site.
- [Contributing](./CONTRIBUTING.md) — development workflow and PR guidelines.

Deeper engine docs (behaviors lifecycle, lambdas/ECS, physics, scheduler, rendering) live under `docs/` in this repo.

## Development workflow

This project uses Bun as its package manager and task runner.

```bash
bun run dev            # All-in-one: Vite + AI server + MP sidecar
bun run dev:editor     # Editor only (Vite)
bun run dev:ai         # AI server only
bun run dev:mp         # MP sidecar only

bun run build          # Production static build
bun run typecheck      # TypeScript verification
bun run test           # Unit + integration tests
bun run lint           # ESLint
```

To export a single project as a Player-only static site, use the in-editor **File → Export game** action and follow the instructions in [docs/exporting-a-game.md](./docs/exporting-a-game.md).

## Browser support

- **Chromium-based** (Chrome, Edge, Brave, Arc): full feature set including File System Access API for folder-based project storage.
- **Firefox**: full feature set with IndexedDB storage only (no folder access).
- **Safari**: full feature set with IndexedDB storage only (no folder access).

WebGL2 is required. WebGPU support is experimental and opt-in.

## Team

|  [<img src="https://github.com/papiguy.png" width="100"><br><sub><b>papiguy</b></sub>](https://github.com/papiguy)   | [<img src="https://github.com/mvromanov.png" width="100"><br><sub><b>mvromanov</b></sub>](https://github.com/mvromanov) | [<img src="https://github.com/fayd404.png" width="100"><br><sub><b>fayd404</b></sub>](https://github.com/fayd404) | [<img src="https://github.com/ikerr.png" width="100"><br><sub><b>ikerr</b></sub>](https://github.com/ikerr) |
|:--------------------------------------------------------------------------------------------------------------------:| :---: | :---: | :---: |
|                                                  CTO & Venture Lead                                                  | Head of Engineering | Head of Product | Platform & Physics |
| [<img src="https://github.com/querielo.png" width="100"><br><sub><b>querielo</b></sub>](https://github.com/querielo) | [<img src="https://github.com/AndreiRudenko.png" width="100"><br><sub><b>AndreiRudenko</b></sub>](https://github.com/AndreiRudenko) | [<img src="https://github.com/gajendra906.png" width="100"><br><sub><b>gajendra906</b></sub>](https://github.com/gajendra906) | [<img src="https://github.com/nafeezable.png" width="100"><br><sub><b>nafeezable</b></sub>](https://github.com/nafeezable) |
|                                                   Three.js Wizard                                                    | Games | QA | Community |
| [<img src="https://github.com/JNicoSD.png" width="100"><br><sub><b>JNicoSD</b></sub>](https://github.com/JNicoSD) | | | |
| Game Dev | | | |

## Contributing

We welcome contributions. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

Bug reports, feature requests, and discussions: [GitHub Issues](https://github.com/your-org/stemstudio/issues).

You can sponsor us via [GitHub Sponsors](https://github.com/sponsors/Stem-Studio). Every contribution, large or small, is appreciated.

## License

[MIT](./LICENSE). See [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md) for the licenses of bundled dependencies.

## Security

Found a vulnerability? Please don't open a public issue. See [SECURITY.md](./SECURITY.md) for private disclosure.

## Acknowledgements

Built on [Three.js](https://threejs.org), [React](https://react.dev), [Vite](https://vitejs.dev), [Colyseus](https://colyseus.io), [Monaco Editor](https://microsoft.github.io/monaco-editor/), [Ammo.js](https://github.com/kripken/ammo.js), [Rapier](https://rapier.rs), and [Bun](https://bun.sh).
