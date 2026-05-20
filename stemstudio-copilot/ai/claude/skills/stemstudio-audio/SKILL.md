---
name: stemstudio-audio
description: Add sound effects and audio to 3D scenes in Studio 3D game engine. Use when the user asks to add sounds, music, audio feedback, or sound effects to objects or events. Covers the genericSound behavior for event-triggered audio, audio resource management, and common patterns like ambient sound, collision SFX, UI click sounds, and background music. Examples include "add a sound when the coin is collected", "play background music", "add footstep sounds to the character", or "make the button click sound".
---

# Studio 3D Audio System

Use this skill for audio-specific workflows. It owns the sound-focused helper scripts for searching audio assets, inspecting the generic sound behavior, and attaching or updating sound config on objects.

## Authoritative References
- **~/.claude/stemstudio-types/stem-types.d.ts** — AudioController interface
- **Runtime tools** — Use `scripts/get_sound_behavior.py` for the full generic sound behavior schema

Guide for adding sound effects and audio feedback to 3D scenes using the `genericSound` built-in behavior.

## Start Here

Use the local audio scripts in this order when you need them:

```bash
python scripts/search_audio_assets.py --phrases coin pickup chime
python scripts/get_sound_behavior.py
```

Then attach or update sound config with:

```bash
python scripts/attach_sound.py --target "Coin" --soundFile "coin_pickup.mp3" --startOnTrigger true
python scripts/set_sound_config.py --target "Coin" --volume 0.6
```

## How Audio Works in StemStudio

Audio in StemStudio is behavior-driven. The `genericSound` behavior is the primary way to add sound effects. It plays configured clips through behavior lifecycle/events and explicit trigger messages.

### Supported Audio Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| MP3 | `.mp3` | Most compatible, good compression, recommended for music |
| WAV | `.wav` | Uncompressed, best quality, larger files, good for short SFX |
| OGG | `.ogg` | Open format, good compression, recommended for SFX |

### Audio Resources

Sound files are managed as engine resources. Upload audio files to the project's sound library via the editor's asset panel. In behavior attributes, use `autoFill: "resources.sounds"` to populate a dropdown with available sounds from the project's sound library.

## genericSound Behavior

The built-in `genericSound` behavior plays sound effects triggered by events.

### Key Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `soundFile` | enum (autoFill: resources.sounds) | Sound file from library |
| `startOnTrigger` | boolean | Play when receiving `trigger` behavior message |
| `volume` | slider (0-1) | Playback volume |
| `looping` | boolean | Loop the sound |
| `positional` | boolean | 3D positional audio (volume fades with distance) |
| `rolloffFactor` | number | Distance attenuation for positional audio |
| `autoPlay` | boolean | Play automatically on start |

### Attaching Sound to an Object

```bash
# 1. Inspect the generic sound behavior schema when needed
python scripts/get_sound_behavior.py

# 2. Attach sound to the target object
python scripts/attach_sound.py \
  --target "Coin" \
  --soundFile "coin_pickup.mp3" \
  --startOnTrigger true \
  --volume 0.8 \
  --looping false
```

## Common Audio Patterns

### Ambient Background Sound
Attach `genericSound` to an empty group at scene center with `loop: true` and `spatial: false`:

```bash
python ~/.claude/skills/stemstudio-objects/scripts/create_group.py --name "AmbientAudio" --position 0 0 0
python scripts/attach_sound.py \
  --target "AmbientAudio" \
  --soundFile "ambient_loop.mp3" \
  --autoPlay true \
  --looping true \
  --positional false \
  --volume 0.3
```

### Collision / Pickup Sound
Trigger via behavior message (`trigger`):

```bash
python scripts/attach_sound.py \
  --target "Coin" \
  --soundFile "coin_pickup.mp3" \
  --startOnTrigger true \
  --volume 0.7 \
  --looping false
```

### Positional Footstep Sound

```bash
python scripts/attach_sound.py \
  --target "Player" \
  --soundFile "footstep.mp3" \
  --startOnTrigger true \
  --volume 0.5 \
  --looping false \
  --positional true \
  --rolloffFactor 1.5
```

### UI Click Sound
Trigger via behavior event from UIKit behavior:

In your UIKit behavior code:
```javascript
onClick: () => {
    game.behaviorManager.sendEventToObjectBehaviors(this.target, "trigger", {});
}
```

Then attach genericSound and enable `startOnTrigger`, or send `trigger` directly to the behavior instance.
```bash
python scripts/attach_sound.py \
  --target "UIManager" \
  --soundFile "ui_click.mp3" \
  --startOnTrigger true \
  --volume 0.5 \
  --positional false
```

## Custom Audio in Behaviors

For more control, use `game.audioController` directly in behavior code.

### audioController API

| Method | Parameters | Description |
|--------|-----------|-------------|
| `loadAudioClip(urlOrAssetId)` | string | Load clip and return `AudioClipId` |
| `playAudioClip(audioClipId)` | string | Play loaded clip |
| `pauseAudioClip(audioClipId)` | string | Pause loaded clip |
| `stopAudioClip(audioClipId)` | string | Stop loaded clip |
| `setAudioClipProperties(audioClipId, props)` | id + partial props | Set loop/volume/positional settings |
| `disposeAudioClip(audioClipId)` | string | Release clip resources |

### Example: Custom Audio Controller Behavior

```javascript
this.init = function(game) {
    this.audio = game.audioController;
    this.bgClipId = null;
};

this.onStart = async function() {
    this.bgClipId = await this.audio.loadAudioClip("bgMusic.mp3");
    this.audio.setAudioClipProperties(this.bgClipId, { loop: true, volume: 0.3 });
    this.audio.playAudioClip(this.bgClipId);
};

this.update = function(deltaTime) {
    if (!this.bgClipId) return;
    if (this.isInDanger) {
        this.audio.setAudioClipProperties(this.bgClipId, { volume: 0.8 });
    } else {
        this.audio.setAudioClipProperties(this.bgClipId, { volume: 0.3 });
    }
};

this.dispose = function() {
    if (this.bgClipId) {
        this.audio.stopAudioClip(this.bgClipId);
        this.audio.disposeAudioClip(this.bgClipId);
        this.bgClipId = null;
    }
};
```

### Example: Sound Manager Pattern

For complex audio needs, create a dedicated sound manager behavior. Use `onEvent(msg, data)` to receive sound trigger messages, and `game.behaviorManager.sendEventToObjectBehaviors` to send them from other behaviors:

```javascript
this.init = function(game) {
    this.audio = game.audioController;
    this.sfx = {};
};

this.onStart = async function() {
    this.sfx.coin = await this.audio.loadAudioClip("coin_pickup.mp3");
    this.sfx.damage = await this.audio.loadAudioClip("damage.mp3");
    // Sounds are triggered via onEvent — no manual subscribe needed
};

// Receive "sound.coin" and "sound.damage" messages from other behaviors:
// game.behaviorManager.sendEventToObjectBehaviors(soundManagerObject, "sound.coin", {})
this.onEvent = function(msg, data) {
    if (msg === "sound.coin") this.audio.playAudioClip(this.sfx.coin);
    if (msg === "sound.damage") this.audio.playAudioClip(this.sfx.damage);
};

this.dispose = function() {
    Object.values(this.sfx).forEach(id => this.audio.disposeAudioClip(id));
};
```

## Best Practices

1. **Use positional audio for in-world sounds** — Set `positional: true` for objects in the 3D scene
2. **Use non-positional for UI/ambient** — Set `positional: false` for HUD sounds and background music
3. **Keep volumes balanced** — Ambient: 0.2-0.4, SFX: 0.5-0.8, UI: 0.3-0.5
4. **Use explicit triggers/messages** — Configure `startOnTrigger` and drive playback from behavior logic/events
5. **One sound per behavior instance** — Attach multiple genericSound behaviors for multiple sounds on one object

## When To Read More

- Need the exact `genericSound` attribute schema: `scripts/get_sound_behavior.py`
- Need exact `AudioController` methods or types: `~/.claude/stemstudio-types/stem-types.d.ts`
- Need event-driven behavior lifecycle details for sound triggers: `~/.claude/stemstudio-docs/behavior-system.md`

## Verification

After attaching audio:
- **Confirm behavior attached**: Call `get_object --target "ObjectName"` and check the behaviors array for genericSound
- **Test in play mode**: Enter play mode in the editor and trigger the event to hear the sound
- **Check event flow**: Verify that `game.behaviorManager.sendEventToObjectBehaviors` is called with the correct object and topic, and that `onEvent` is implemented in the receiving behavior

## When Things Go Wrong

- "Sound not playing" → Check sound file/resource exists and behavior is attached. If using trigger mode, ensure `startOnTrigger: true` and trigger message is actually sent.
- "Sound too quiet/loud" → Adjust `volume` and `rolloffFactor`.
- "Positional audio not working" → Ensure `positional: true` and object is in audible range.
- "Sound plays at wrong time" → Verify your event/message flow and topic names are correct.
- "Multiple sounds overlapping" → Each genericSound behavior plays independently. Use volume balancing (ambient: 0.2-0.4, SFX: 0.5-0.8).
- Never retry the same failing command — check behavior attachment and event configuration first.

## Safety Guardrails

- Always search for genericSound behavior first: `list_behaviors --filter "genericSound"`
- Query the target object before attaching to confirm it exists
- Start with lower volumes and adjust up — loud sounds are jarring

## See Also

- **stemstudio-behaviors** — How to attach/detach behaviors (audio uses genericSound behavior); use `game.behaviorManager.sendEventToObjectBehaviors` to coordinate when sounds should trigger
- **stemstudio-uikit** — UI click sounds via behavior events
- **stemstudio-game-design** — Sound layering in game feel recipes
- **stemstudio-objects** — Create objects to attach sounds to
