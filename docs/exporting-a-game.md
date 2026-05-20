# Exporting a Game

StemStudio OSS does not ship a separate "Player-only" build script. The editor and the player are bundled together — the runtime that loads `.stemscript.json` projects is the same one the editor uses. To share a game, you have two options:

1. **Share the project file** — anyone with a StemStudio install (yours, theirs, or a hosted instance) can import it.
2. **Self-host StemStudio + the project** so visitors load it directly in a browser.

## Option 1 — Share a `.stemscript.json` file

Inside the editor:

1. Open the project you want to share.
2. Use **File → Export project** (or call `getProjectStore().exportToBlob(projectId)` from the console for scripting).
3. Save the resulting `.stemscript.json` file.

That single file is the entire project: scene tree, behaviors, scripts, attribute values, and references to whichever assets the scene uses. To import it elsewhere, open StemStudio and use **File → Import project**, or call `getProjectStore().importFromBlob(blob)`.

`.stemscript.json` does **not** embed binary assets (models, textures, audio). Those live wherever the project originally referenced them — usually the editor's IndexedDB cache or a configured asset host. When you ship a project to someone with a different asset layout, expect to also ship the assets directory.

## Option 2 — Self-host the editor + your project

The editor build is plain static files. Anywhere that serves HTML can host it.

```bash
# Produce a production build under client/dist/
bun run build

# Serve the result with any static server
bunx http-server client/dist -p 8080
```

Visit `http://localhost:8080/`. The first-time bootstrap modal asks where to store projects; once you've loaded a `.stemscript.json`, share the same URL with anyone else and they can do the same.

For a hosted multi-user setup, front the build with a reverse proxy (Caddy, nginx, Cloudflare). The static files have no authentication — every visitor lands on the same first-time bootstrap.

## Multiplayer in a self-hosted build

If your project uses multiplayer behaviors, the static-hosted editor still needs a Colyseus server somewhere to connect to. Two options:

1. **Bake in a default server URL** at build time:
   ```bash
   REACT_APP_MULTIPLAYER_SERVER_URL=wss://mp.example.com bun run build
   ```
2. **Set it per-user** by editing the `.env` file before each developer's local build.

If neither is configured and a behavior tries to connect, it logs a warning and no-ops.

## Hosting checklist

- **MIME types:** make sure your host serves `.wasm` as `application/wasm` and `.gltf`/`.glb` as `model/gltf-binary`. Most static hosts get this right out of the box; some self-hosted setups don't.
- **HTTPS:** the File System Access API and several browser features only work over HTTPS (or `localhost`). Don't ship a production build over plain HTTP.
- **CSP:** if you add a Content Security Policy, allow `wasm-unsafe-eval` for the physics engine and the WebSocket origin you target for multiplayer.

## Caveats

- **WebGL2 is required.** Browsers without WebGL2 see a fallback message.
- **First load is several MB** depending on which engine features your project pulls in. Subsequent loads are cached.
- **No service worker by default.** If you want offline play, add one post-build — it's a standard PWA pattern.

## A leaner runtime-only build (future work)

A dedicated "runtime-only" build that strips the editor UI is on the OSS roadmap. Until it lands, the full editor + player bundle is the supported path. Contributions welcome — see [CONTRIBUTING.md](../CONTRIBUTING.md).
