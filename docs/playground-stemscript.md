# Playground StemScript

StemScript is the command format used by the Script Tool terminal, scene
exports, and the browser-direct playground copilot. A `.stemscript` file is a
plain-text list of commands that can build or modify a StemStudio scene:
create primitives, import assets, attach behaviors, configure cameras and
lighting, set physics, and export a replayable bundle.

Existing example games in this format live in
[Stem-Studio/Games-StemScript](https://github.com/Stem-Studio/Games-StemScript).
Use that repository when you want complete game folders with a root
`.stemscript` file and companion assets.

---

## Put the playground in StemScript mode

The public playground opens the editor at `/dashboard?mode=playground`. From
there you can use StemScript in three ways:

1. Open **Playground** from the public site, or open the editor route with
   `?mode=playground`.
2. Open **AI Copilot**.
3. Enter Script Tool mode:
   - Type `/script` in Copilot chat, or
   - Hold the **AI Copilot** button and choose **Script Tool** from the menu.
4. Run commands directly, or run `exec` to pick a `.stemscript` file or a folder
   containing one.
5. Use `exit` to leave Script Tool mode and return to Copilot chat.

The Script Tool is available to project owners/admin users. In playground
copilot chat, the AI can also return StemScript directly; the editor validates
and applies those commands through the same command registry.

On the dashboard, the **Import stemscript folder** banner is the fastest path
for complete games. Pick a folder that contains a `.stemscript` file plus its
referenced models, textures, audio, videos, behavior YAMLs, lambda YAMLs, and
imports. StemStudio stages the folder, executes the script in a fresh project,
imports the companion files, and saves the result into the active local project
store.

---

## File shape and syntax

StemScript is line-oriented:

```stemscript
# Comments start with #
project title "Tiny Obby"
add group name=Level
add box name=Ground size=12,0.1,12 position=0,-0.05,0 color=#2d3748 parent=Level
add capsule name=Player size=0.5,1.8,0.5 position=0,0.9,0 color=#3b82f6
update Player tag=Player
physics engine rapier gravity=-9.81
physics set Ground config={shape:"box",mass:0,ctype:"Static"}
behavior attach Player behaviorId=character config={isDefault:true,walkSpeed:3,runSpeed:6,jumpHeight:1.2}
camera "DefaultCamera" cameraType=THIRD_PERSON defaultDistance=6
game settings isGame=true showHUD=true
```

Rules to remember:

| Syntax | Notes |
|---|---|
| One command per line | Empty lines and `#` comments are ignored. |
| `key=value` parameters | Most commands accept named parameters. Bare first arguments are used for targets, such as `update Player color=#ff0000`. |
| Quote spaces | Use `"Default Camera"` or `"Racing Kart"` when a value contains spaces. |
| Vectors | Positions, rotations, sizes, and scales usually use `x,y,z`, for example `position=0,1,0`. |
| Objects and arrays | Config blocks use JSON-like values, for example `config={shape:"box",mass:0}` or `phrases=["tree","forest"]`. |
| Shorthand and raw commands | Shorthand such as `add box` maps to registry commands such as `create_primitive`. Advanced scripts can call supported raw registry names directly. |

Run `help` inside the Script Tool for the live command list. Run
`help <command>` or `help <category>` for parameter details, for example
`help add`, `help behavior`, `help scene`, or `help import`.

---

## Commands available to users

The Script Tool groups commands by what they edit:

| Area | Commands |
|---|---|
| Objects | `add <type>`, `add group`, `add model`, `add prefab`, `update`, `delete`, `clone`, `move`, `list objects`, `list lights`, `get`, typed getters such as `get box`, `select`, `player`. |
| Materials and textures | `material`, `texture`, `texture external`, `get material`, `get texture`. |
| Physics | `physics engine`, `physics enable`, `physics disable`, `physics set`, `get physics engine`, `get physics`, `scene compartments`, `get compartments`. |
| Behaviors | `behavior attach`, `behavior detach`, `behavior config`, `behavior list`, `behavior get`, `behavior add`, `behavior update`, `behavior remove`. |
| Navigation | `navmesh add`, `navmesh rebuild`, `navmesh connection add`, `waypoint path add`, `waypoint add`. |
| Lambdas | `list lambdas`, `lambda list`, `lambda get`, `get lambda`, plus asset inspection for imported lambda packs. |
| VFX | `vfx add`, `vfx modify`, `vfx delete`, `vfx get`, `vfx behavior add`, `vfx behavior remove`, `add vfx`. |
| Prefabs | `prefab list`, `prefab get`, `prefab add`, `prefab create`. |
| Scene environment | `scene lighting`, `scene fog`, `scene background`, `scene tonemapping`, `scene postprocessing`, `scene settings`, `get lighting`, `get fog`, `get background`, `get tone mapping`, `get postprocessing`, `get outline`, `get bloom`, `get ao`, `get dof`. |
| Camera, lights, and game settings | `camera`, `get camera`, `light`, `get light`, `game settings`, `get game settings`, `project title`, `render settings`, `get render settings`, `scene thumbnail`. |
| Assets and libraries | `list assets`, `list models`, `list imports`, `list files`, `list media`, `list behavior packs`, `list lambda packs`, `list packs`, `get asset`, `get import`, `get file`, `search assets`, `asset get`, `search external`, `generate model`. |
| Imports and exports | `import`, `exec`, `save`, `dump scene`, `export scene`. |
| Terminal | `help`, `clear`, `history`, `exit`, plus admin validation commands `check` and `test`. |

Primitive types accepted by `add <type>` are `box`, `sphere`, `cylinder`,
`cone`, `plane`, `torus`, `torusKnot`, `triangle`, `capsule`, `icosahedron`,
`octahedron`, `dodecahedron`, and `ring`.

---

## Import and export workflows

Use `exec` when you already have a `.stemscript` file:

```stemscript
exec
```

With no path, the browser opens a picker. You can select a single
`.stemscript` file, or a folder containing one `.stemscript` plus companion
assets. Folder execution uses relative paths from the picked folder, so script
lines such as these can resolve local files:

```stemscript
import model Kart models/kart.glb
import behavior KartController behaviors/kart-controller.yaml
import lambda TrackGravity lambdas/track-gravity.yaml
import script name="math-helpers" filepath="imports/math-helpers.js"
import image ProjectCover cover.png
```

Use `dump scene` when you want an offline-replayable zip with binary assets
included. Use `export scene` when asset URLs are acceptable and you want a
lighter bundle. Both produce a main `.stemscript` entrypoint plus behavior,
lambda, import, and asset metadata needed to recreate the scene.

The OSS playground keeps local script assets latest-only. Server-backed
installations can preserve full asset revision history and pin selected
revisions in the scene's asset resolution context.

---

## Playground copilot restrictions

Manual Script Tool commands can import, export, dump, save, and execute picked
files. The browser-direct playground copilot is intentionally narrower. It can
inspect the scene with read-only commands and apply live scene edits, but it
rejects generated commands that need filesystem prompts, project-task storage,
external library search, or bundle export.

For AI-generated playground edits, expect the copilot to use commands such as:

```stemscript
list objects
get camera "DefaultCamera"
add box name=Platform size=4,0.25,4 position=0,1,0 color=#475569
behavior attach Player behaviorId=character config={isDefault:true}
```

If a request requires local files, the copilot should explain the exact
`import` or `exec` lines for you to run manually in Script Tool mode instead of
emitting those commands for automatic execution.

---

## Practical patterns

Use StemScript for repeatable scene construction:

| Goal | Pattern |
|---|---|
| Build a quick game sketch | Start with `project title`, `game settings`, primitives, player tag, camera, lights, physics, then attach behaviors. |
| Reuse existing assets | Inspect with `list assets`, `list models`, `list behavior packs`, `list lambda packs`, then reference exact names/IDs. |
| Add gameplay logic | Prefer built-in behaviors first. Use `behavior add` or imported behavior YAML when custom behavior code is needed. |
| Move many objects into a group | Create the group once with `add group`, then use `parent=<group>` on creation or `move <target> parent=<group>`. |
| Debug a script | Run a small script first, use `history`, `get <target>`, `scene settings`, and admin `check`/`test` where available. |

For complete examples, start with
[Stem-Studio/Games-StemScript](https://github.com/Stem-Studio/Games-StemScript),
import a game folder through the dashboard or `exec`, then inspect the command
history and generated project state in the editor.
