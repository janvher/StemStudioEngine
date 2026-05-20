---
name: stemstudio-tools
description: Use specialized StemStudio systems such as terrain, water, sky, day/night, billboards, navmesh, and LOD. Use when the user wants environment systems or engine-assisted world features beyond basic primitives.
---

# StemStudio Tools

Use this skill for specialized environment and runtime systems. Keep it focused on routing, setup order, and validation rather than long inline reference text.

This skill is mostly a setup and reference guide. Actual scene mutation usually happens through `stemstudio-objects` for object creation and `stemstudio-behaviors` for finding and attaching the relevant behavior packs.

## Use This Skill When

- The user asks for terrain, water, sky, day/night, billboard, navmesh, or LOD work
- A feature is usually provided by a behavior pack or a specialized engine system
- You need to decide which supporting behaviors or settings are required

## Core Reference

- `~/.claude/stemstudio-docs/tools-and-libraries.md`

Open that file only for the exact subsystem you are using.

## Common Routes

| Feature | Typical Approach |
| --- | --- |
| Terrain | create holder object -> find terrain behavior -> attach -> configure -> add physics if needed |
| Water | create plane -> find water behavior -> attach -> tune visual params |
| Sky / day-night | create controller object if needed -> find sky/day-night behavior -> attach -> verify scene lighting |
| Billboard | create target plane/object -> attach billboard behavior -> verify source asset and orientation |
| Navmesh | create or identify walkable surface -> attach navmesh behavior -> verify agent scale |
| LOD | apply to large or repeated assets where distance-based simplification matters |

## Execution Rules

- Inspect the scene first so you do not stack overlapping terrain, water, or controllers accidentally.
- Search for the supporting behavior before attaching anything, then inspect its schema with `get_behavior` before choosing config fields.
- Start with conservative settings, then tune upward only if needed.
- Verify with `get_object` or follow-up scene inspection after each major setup step.
- Add physics explicitly when the tool-created surface must be collidable.

## Subsystem Notes

### Terrain

- Use procedural terrain when the user needs a landscape rather than a flat ground plane.
- Add static physics when characters or objects must collide with it.
- Prefer modest resolution first to avoid unnecessary cost.

### Water

- Water is usually a behavior-driven plane.
- Confirm its height, scale, and visibility against the existing scene.
- If the water request is purely decorative, keep parameters simple.

### Sky And Day/Night

- Use sky/day-night controllers for mood or time progression.
- Re-check lighting and fog after attaching these systems because they affect scene readability.

### Billboards

- Use for image, video, or web-backed panels that should face the camera.
- Confirm the asset source is valid before assuming the billboard itself is broken.

### Navmesh

- Use only when AI or pathfinding requires walkable area calculation.
- Ensure the walkable surface and agent dimensions are sensible before debugging pathfinding.

### LOD

- Reserve for large scenes or expensive repeated assets.
- Combine with good asset choices before treating LOD as the first fix.

## When To Read More

- Need exact behavior names or config fields: query `list_behaviors` and then `get_behavior`
- Need subsystem-specific setup details: `~/.claude/stemstudio-docs/tools-and-libraries.md`
- Need physics or AI interactions beyond setup: route to `stemstudio-physics` or the relevant gameplay skill

## Hard Rules

- Do not retry a failing setup blindly.
- Do not assume a behavior exists without checking.
- Do not over-configure a system before confirming the basic version works.
