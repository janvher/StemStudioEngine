#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to modify a VFX (Particle Emitter) in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, vec3, parse_json_arg, parse_bool, build_params, encode_texture, add_transform_args, add_id_arg
import argparse

parser = argparse.ArgumentParser(
    description="Generate JSONRPC message to modify a VFX particle emitter",
    formatter_class=argparse.RawDescriptionHelpFormatter,
    epilog="Examples:\n  python modify_vfx.py --target \"FireEffect\" --position 5 2 0\n  python modify_vfx.py --target \"SmokeVFX\" --config '{\"duration\": 2}'\n  python modify_vfx.py --target \"Explosion\" --action restart"
)
parser.add_argument("--target", required=True, help="UUID or name of the VFX emitter to modify")
add_transform_args(parser)
parser.add_argument("--config", help="ParticleSystem configuration as JSON string")
parser.add_argument("--action", choices=["play", "stop", "pause", "restart"], help="Playback control action")
parser.add_argument("--texture", help="Path to texture file (SVG, PNG, JPG, etc.)")
parser.add_argument("--duration", type=float, help="Particle system duration")
parser.add_argument("--looping", type=parse_bool, help="Whether to loop")
parser.add_argument("--worldSpace", type=parse_bool, dest="world_space", help="Use world space")
parser.add_argument("--emissionRate", type=float, dest="emission_rate", help="Emission rate (particles per second) — wrapped as ValueGenerator in config.emissionOverTime")
add_id_arg(parser)
args = parser.parse_args()

config = parse_json_arg(args.config, "config")

if args.texture:
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

# emissionRate convenience flag: wrap as ValueGenerator in config.emissionOverTime
if args.emission_rate is not None:
    if config is None:
        config = {}
    config["emissionOverTime"] = {"type": "value", "value": args.emission_rate}

params = build_params(
    target=args.target,
    position=vec3(args.position), rotation=vec3(args.rotation), scale=vec3(args.scale),
    config=config, action=args.action,
    duration=args.duration, looping=args.looping,
    worldSpace=args.world_space,
)
print(jsonrpc("modify_vfx", params, args.id))
