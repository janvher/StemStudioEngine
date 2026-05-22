# Playground default mode, per-project mode, and copilot key config

## Goal

1. The playground iframe should load projects in **advanced mode by default**,
   except projects created via the dashboard **AI prompt** flow, which load in
   AI-focused mode.
2. The editor mode is a **per-project** setting and must persist per project.
3. When the AI copilot is reachable inside the playground, the user must be
   able to **configure their AI provider keys**, stored locally.
4. Explore whether the AI copilot / AI server can run as an **in-browser
   sidecar**, and deploy it that way if feasible.

## Findings (current state)

- `advancedModeStorage.ts` already persists a per-project preference in
  `localStorage` (`advancedMode:project:{sceneID}`). This is the per-project
  store referenced by goal #2 — it already exists and works.
- `resolveAdvancedModePreferenceForProject` defaults to `true` (advanced) and
  **ignores** the scene `aiPromptMode` flag in OSS builds. So in the OSS
  playground an AI-prompt project does *not* deterministically open in AI mode
  via this resolver; it only happens as a side effect of a `Create.tsx`
  `sceneLoaded` handler. We make the resolver authoritative.
- BYOK keys already persist locally in IndexedDB (`stemstudio-byok`) via
  `IndexedDBBYOKKeyStore`, with an optional AES-GCM passphrase layer. A full
  `BYOKKeysPanel` UI exists but only on the dashboard `SettingsPage`, which is
  unreachable in playground mode (`playgroundMode.css` hides settings).
- The Go `ai-server` (`server/cmd/ai-server`) is a thin BYOK proxy.

## Sidecar exploration (goal #4)

Running the Go `ai-server` itself as an in-browser sidecar is **not feasible**:

- Go compiles to WASM, but a WASM module in the browser cannot bind a TCP
  socket / run an HTTP listener — `server.Start()` cannot work in-browser.
- The proxy's reason to exist is (a) injecting server-side secret keys and
  (b) avoiding browser CORS. In a BYOK playground neither applies: the keys
  are already client-side, and the major providers support direct browser
  calls (Anthropic `anthropic-dangerous-direct-browser-access`, OpenAI
  `dangerouslyAllowBrowser`). The existing `OpenAICopilotProvider`
  (`client/packages/copilot/src/OpenAICopilotProvider.ts`) already proves the
  direct browser→provider call pattern.

**Conclusion:** the correct "sidecar" for the playground is a browser-direct
copilot that calls AI providers itself, with no Go server. **Implemented** —
see the next section.

## Browser-direct playground copilot (implemented)

In playground mode the editor registers `DirectCopilotProvider`
(`editor-oss/src/copilot/DirectCopilotProvider.ts`), an `ICopilotProvider`
that streams a plain conversation straight from the visitor's chosen provider:

- Anthropic (`/v1/messages`, `anthropic-dangerous-direct-browser-access`) or
  any OpenAI-compatible `/v1/chat/completions` endpoint.
- The key comes from the existing BYOK store (IndexedDB, optional passphrase
  encryption). Nothing is proxied through the Go `ai-server`.
- It is a *conversational* copilot only — no scene-mutation tool calls (that
  remains the integrated agent's job).

Key gating:

- `playgroundCopilotKeys.ts` keeps a synchronous localStorage marker
  (`stem.playground.copilotReady`) of whether a chat key exists, refreshed at
  bootstrap and after every BYOK panel save/clear.
- The editor-mode resolver consults that marker: an AI-prompt project in the
  playground only opens in AI-focused layout when a key is present; otherwise
  it falls back to advanced mode. The copilot panel is still mounted in the
  advanced layout, so the visitor adds a key via its "Keys" button and the
  copilot becomes usable in place. With no key, `prompt()` returns a message
  telling the visitor to configure one.
- Registration (`registerPlaygroundCopilot`) is wired from the OSS branch of
  `shared/src/bootstrap/integrated.ts`; it is a no-op outside the playground.

## Follow-up (2026-05-20): dashboard key entry + playground chrome

- The marketing site (`site/src/App.tsx`) rendered `<Footer />` unconditionally
  and `.playground-page` height assumed a 60px nav. On `/playground` the nav is
  hidden, so the homepage footer leaked in below the editor iframe and the
  iframe was 60px short. Fixed: hide `Footer` on `/playground`; page height is
  now `100vh`.
- Key config is also surfaced on the dashboard prompt card
  (`CreateHomepageHero.tsx`), playground-only, so a visitor can set a key
  *before* submitting a create prompt — not just from the in-editor copilot
  "Keys" button. When no key is configured the card states that AI game
  creation works but requires the visitor's own provider key; the same
  `AiKeysModal` opens from a "Set up keys" / "Manage keys" button. Status
  refreshes via `refreshCopilotKeysMarker()` when the modal closes.

## Affected files

- `editor-oss/src/context/advancedModeStorage.ts` (+ test)
- `editor-oss/src/context/AppGlobalContext.tsx`
- `editor-oss/src/editor/assets/v2/AiCopilot/AiKeysModal.tsx` (new)
- `editor-oss/src/editor/assets/v2/AiCopilot/AiCopilot.tsx`
- `editor-oss/src/copilot/DirectCopilotProvider.ts` (new)
- `editor-oss/src/copilot/playgroundCopilotKeys.ts` (new)
- `editor-oss/src/copilot/registerPlaygroundCopilot.ts` (new)
- `editor-oss/src/copilot/index.ts`
- `editor-oss/.../CreateDashboard/CreateHomepageHero/CreateHomepageHero.tsx` (+ style)
- `site/src/App.tsx`, `site/src/styles/globals.css`
- `editor-oss/.../SettingsPage/BYOKKeysPanel/BYOKKeysPanel.tsx`
- `shared/src/bootstrap/integrated.ts`
- `shared/src/playgroundMode.ts` / `playgroundMode.css` (comments)

## Implementation steps

- [x] `advancedModeStorage.ts`: honor `aiPromptMode` in the playground; gate
      the AI layout on `hasCopilotKeys`.
- [x] `AppGlobalContext.tsx`: pass `isPlayground` and `hasCopilotKeys`.
- [x] New `AiKeysModal.tsx` + "Keys" header button in `AiCopilot.tsx`
      (playground only).
- [x] New `DirectCopilotProvider` — browser-direct streaming copilot.
- [x] New `playgroundCopilotKeys.ts` — sync key marker + key resolution.
- [x] New `registerPlaygroundCopilot.ts`; wired from OSS bootstrap branch.
- [x] `BYOKKeysPanel.tsx`: refresh the key marker on save/clear/reset.
- [x] Update `playgroundMode.ts` / `playgroundMode.css` comments.

## Validation

- [x] `bun run typecheck` — passed, 0 errors.
- [x] `bun run lint` (changed files) — 0 errors; warnings are all pre-existing
      in AiCopilot.tsx / AppGlobalContext.tsx, none from new code.
- [x] `bun test` — `advancedModeStorage.test.ts` 8/8 pass (incl. playground +
      key-gating cases); copilot tests pass.
- [x] `bun run vite-build` — OSS bundle builds.
- [ ] Manual code review
- [ ] Manual playground check: open `/dashboard?mode=playground`, confirm the
      copilot "Keys" button, add an Anthropic/OpenAI key, send a prompt.
