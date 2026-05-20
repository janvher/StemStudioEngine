#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to add a VFX (Particle Emitter) to Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, vec3, parse_json_arg, build_params, encode_texture, add_transform_args, add_id_arg
import argparse

parser = argparse.ArgumentParser(
    description="Generate JSONRPC message to add a VFX particle emitter",
    formatter_class=argparse.RawDescriptionHelpFormatter,
    epilog="Examples:\n  python add_vfx.py --name \"Fire\" --position 0 1 0 --texture /tmp/fire.svg\n  python add_vfx.py --name \"Smoke\" --parent \"Campfire\" --preset smoke --texture /tmp/smoke.svg"
)
parser.add_argument("--name", required=True, help="VFX emitter name")
add_transform_args(parser)
parser.add_argument("--parent", help="Parent object UUID or name")
parser.add_argument("--preset", help="VFX preset name (e.g., fire, smoke, sparks)")
parser.add_argument("--config", help="Custom ParticleSystem configuration as JSON string")
parser.add_argument("--texture", required=True, help="[REQUIRED] Path to texture file (SVG, PNG, JPG, etc.)")
add_id_arg(parser)
args = parser.parse_args()

config = parse_json_arg(args.config, "config")

try:
    texture_data = encode_texture(args.texture)
except (FileNotFoundError, IOError) as e:
    print(f"Error processing texture: {e}", file=sys.stderr)
    sys.exit(1)

if config is None:
    config = {}
if "material" not in config:
    config["material"] = {"type": "MeshBasicMaterial", "transparent": True}
config["material"]["map"] = texture_data

params = build_params(
    name=args.name,
    position=vec3(args.position), rotation=vec3(args.rotation), scale=vec3(args.scale),
    parent=args.parent, preset=args.preset, config=config,
)
print(jsonrpc("add_vfx", params, args.id))
