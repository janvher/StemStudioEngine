#!/usr/bin/env bash
set -euo pipefail

# Sync authoritative engine type/contracts from de-shadow-editor into this repo.
# Default source path assumes sibling checkout:
#   ../de-shadow-editor
# Override with:
#   DE_SHADOW_EDITOR_PATH=/path/to/de-shadow-editor

SRC_ROOT="${DE_SHADOW_EDITOR_PATH:-../de-shadow-editor}"
OUT_ROOT="ai/claude/typefiles/de-shadow-editor"
STRICT="${STRICT_TYPEFILES:-0}"

if [[ ! -d "$SRC_ROOT" ]]; then
  if [[ "$STRICT" == "1" ]]; then
    echo "ERROR: de-shadow-editor not found at '$SRC_ROOT' (STRICT_TYPEFILES=1)." >&2
    exit 1
  fi
  echo "WARN: de-shadow-editor not found at '$SRC_ROOT'; skipping typefile sync."
  exit 0
fi

copy_file() {
  # Optional second arg: legacy destination path. Defaults to the source rel.
  # The editor is reorganizing into web/packages/shared/src/** but the
  # consumers of this typefile cache still expect the legacy web/src/**
  # layout, so we keep dst on the legacy shape while src follows the new
  # location.
  local rel="$1"
  local dst_rel="${2:-$1}"
  local src="$SRC_ROOT/$rel"
  local dst="$OUT_ROOT/$dst_rel"

  if [[ ! -f "$src" ]]; then
    if [[ "$STRICT" == "1" ]]; then
      echo "ERROR: required file missing: $src" >&2
      exit 1
    fi
    echo "WARN: missing source file, skipped: $src"
    return 0
  fi

  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
}

copy_dir() {
  local rel="$1"
  local dst_rel="${2:-$1}"
  local src="$SRC_ROOT/$rel"
  local dst="$OUT_ROOT/$dst_rel"

  if [[ ! -d "$src" ]]; then
    if [[ "$STRICT" == "1" ]]; then
      echo "ERROR: required directory missing: $src" >&2
      exit 1
    fi
    echo "WARN: missing source directory, skipped: $src"
    return 0
  fi

  mkdir -p "$(dirname "$dst")"
  rm -rf "$dst"
  cp -R "$src" "$dst"
}

# Editor script type globals / declarations
copy_dir "web/packages/shared/src/editor/assets/v2/CodeEditor/types" "web/src/editor/assets/v2/CodeEditor/types"

# Runtime contracts used by behavior/lambda script generation
copy_file "web/packages/shared/src/behaviors/Behavior.ts" "web/src/behaviors/Behavior.ts"
copy_file "web/packages/shared/src/behaviors/BehaviorScriptInjector.ts" "web/src/behaviors/BehaviorScriptInjector.ts"
copy_file "web/packages/shared/src/behaviors/game/GameManager.ts" "web/src/behaviors/game/GameManager.ts"
copy_file "web/packages/shared/src/behaviors/event/EventBus.ts" "web/src/behaviors/event/EventBus.ts"
copy_file "web/packages/shared/src/behaviors/uikit/UIKitPointerEvents.ts" "web/src/behaviors/uikit/UIKitPointerEvents.ts"
copy_file "web/packages/shared/src/physics/common/types.ts" "web/src/physics/common/types.ts"
copy_file "web/packages/shared/src/physics/common/events.ts" "web/src/physics/common/events.ts"
copy_file "web/packages/shared/src/types/editor.ts" "web/src/types/editor.ts"
copy_file "web/packages/shared/src/controls/AudioController.ts" "web/src/controls/AudioController.ts"
copy_file "web/packages/shared/src/controls/AiWorldController/AiWorldController.types.ts" "web/src/controls/AiWorldController/AiWorldController.types.ts"
copy_file "web/packages/shared/src/controls/AiWorldController/docs.ts" "web/src/controls/AiWorldController/docs.ts"
copy_file "web/packages/shared/src/agent/CommandsRegistry.ts" "web/src/agent/CommandsRegistry.ts"

# Controller contracts used by behavior/agent code generation
copy_file "web/packages/shared/src/controls/AnimationController.ts" "web/src/controls/AnimationController.ts"
copy_file "web/packages/shared/src/controls/AnimationGraphController.ts" "web/src/controls/AnimationGraphController.ts"
copy_file "web/packages/shared/src/controls/VehicleControls.ts" "web/src/controls/VehicleControls.ts"
copy_file "web/packages/shared/src/controls/BasePlayerControl.ts" "web/src/controls/BasePlayerControl.ts"

echo "Typefile sync completed from '$SRC_ROOT' -> '$OUT_ROOT'"
