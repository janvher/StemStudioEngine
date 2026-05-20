---
name: stemstudio-web-research
description: Read-only web search for game design inspiration and reference material. Use when the user asks to research game mechanics, find design references, look up how other games handle specific features, or needs inspiration for their StemStudio project. This skill is READ-ONLY — never post, submit, or modify anything on the web. Examples include "research platformer mechanics", "find examples of good level design", "how do other games handle inventory", or "look up color palettes for horror games".
---

# Studio 3D Web Research

Guide for using web search to find game design inspiration, reference material, and technical guidance for StemStudio projects.

## Tools Available

When web research is enabled (`allowWebResearch: true` in request + `WEB_RESEARCH_ENABLED=true` on server) and the **Anthropic** provider is active, you have two tools:

| Tool | Purpose | Rate Limit |
|------|---------|------------|
| `web_search` | Search the web (domain-restricted) | Default 5 per conversation |
| `web_fetch` | Fetch and read a specific URL (domain-restricted, with citations) | Default 3 per conversation |

**Domain restrictions** (enforced by Anthropic API — cannot be bypassed):
GitHub (`github.com`, `gist.github.com`, `raw.githubusercontent.com`, `docs.github.com`), game dev sites (`gamedeveloper.com`, `gdcvault.com`, `gamedev.net`, `itch.io`), reference (`wikipedia.org`, `stackoverflow.com`, `developer.mozilla.org`, `threejs.org`), game news (`polygon.com`, `kotaku.com`, `pcgamer.com`, `eurogamer.net`), communities (`reddit.com`, `dev.to`, `medium.com`), engine docs (`docs.unity3d.com`, `docs.godotengine.org`, `docs.unrealengine.com`).

**For non-Anthropic providers:** These tools are not available. The research patterns below still apply as guidance for when web tools are added to other providers.

### Example Usage

```
# Search for game design patterns
web_search({ query: "platformer double jump mechanic design" })

# Fetch a specific article for detailed reading
web_fetch({ url: "https://gamedeveloper.com/design/platformer-mechanics-guide" })

# Look up a GitHub repo
web_search({ query: "site:github.com three.js particle system" })
```

## When to Use Web Research

| Use Case | Search For |
|----------|-----------|
| Genre mechanics | "platformer game mechanics design" |
| Visual references | "low poly forest color palette" |
| Level design | "puzzle game level design principles" |
| Game feel | "game juice techniques indie dev" |
| UI patterns | "game HUD design best practices" |
| Audio design | "sound design for casual games" |
| Physics tuning | "platformer physics feel good settings" |
| Monetization | "game monetization ethical approaches" |

## Research Patterns

### 1. Inspiration Search
When the user wants ideas for their game:
```
1. Search for the genre + "design principles" or "game design document"
2. Look for GDC talks, Gamasutra articles, game design blogs
3. Summarize key takeaways
4. Map findings to StemStudio capabilities (behaviors, physics, VFX)
```

### 2. Reference Lookup
When implementing a specific mechanic:
```
1. Search for the mechanic + "implementation" or "tutorial"
2. Look for Unity/Unreal/Godot tutorials (concepts transfer to StemStudio)
3. Extract the design pattern (not engine-specific code)
4. Translate to StemStudio behaviors and behavior events
```

### 3. Visual Research
When designing the look and feel:
```
1. Search for style + "color palette" or "art direction"
2. Look for Pinterest boards, ArtStation references, game screenshots
3. Extract hex colors, lighting setups, fog densities
4. Map to StemStudio editor settings (lighting, fog, background, post-processing)
```

### 4. Competitive Analysis
When the user wants to match a specific game's feel:
```
1. Search for the game name + "game design analysis" or "postmortem"
2. Look for breakdowns of mechanics, pacing, and feel
3. Identify which elements are achievable in StemStudio
4. Propose a build plan using available behaviors and tools
```

## Mapping Findings to StemStudio

| Web Research Finding | StemStudio Implementation |
|---------------------|--------------------------|
| "Double jump mechanic" | `character` behavior with jump config |
| "Particle effects on hit" | `visualEffect` behavior + behavior event trigger |
| "Dynamic difficulty" | Custom behavior reading score/time lambdas |
| "Cel-shading look" | Material settings (roughness 1, metalness 0) + post-processing outline |
| "Ambient soundscape" | `genericSound` behavior (loop: true, spatial: false) |
| "Waypoint pathfinding" | `enemy` behavior + navmesh tool |
| "Health bar UI" | `stemstudio-uikit` health panel |
| "Day/night cycle" | `dayNightCycle` behavior (stemstudio-tools) |

## Safety Rules

**This skill is strictly READ-ONLY.**

1. **Never post, submit, or upload** anything to websites
2. **Never create accounts** or log into services
3. **Never share project details** externally
4. **Always cite sources** when presenting research findings
5. **Respect copyright** — describe ideas and patterns, don't copy assets
6. **Verify information** — cross-reference multiple sources before recommending
7. **Focus on design patterns** — extract transferable concepts, not engine-specific code

## Research Output Format

When presenting research findings to the user:

```
## Research: [Topic]

### Key Findings
- Finding 1 (Source: [name])
- Finding 2 (Source: [name])

### Recommended for Your Project
- [How to apply finding 1 using StemStudio skills]
- [How to apply finding 2 using StemStudio skills]

### Build Plan
1. [First step using specific skill]
2. [Second step using specific skill]
```

## When Things Go Wrong
- "Can't find relevant results" → Broaden search terms, try different keywords. Search for the underlying game design concept rather than the specific implementation.
- "Results are for wrong engine" → Focus on the design pattern, not the code. Unity/Unreal concepts translate to StemStudio behaviors and behavior events.
- "Information seems outdated" → Cross-reference with multiple sources. Game design principles are timeless; only implementation details change.

## See Also
- **stemstudio-game-design** — Genre blueprints to apply research findings
- **stemstudio-copilot** — Master workflow for turning research into builds
- **stemstudio-behaviors** — Available behaviors to implement findings
- **stemstudio-atmosphere** — Atmosphere settings from visual research
