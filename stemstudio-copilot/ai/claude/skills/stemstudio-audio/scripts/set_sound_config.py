#!/usr/bin/env python3
"""Update configuration for an attached sound behavior with audio-focused flags."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_post, add_session_args, parse_json_arg, parse_bool, build_params, output
import argparse

parser = argparse.ArgumentParser(description="Update generic sound behavior configuration via Studio 3D REST API")
add_session_args(parser)
parser.add_argument("--target", required=True, help="Object name or UUID")
parser.add_argument("--behaviorId", default="genericSound", help="Behavior ID to update (default: genericSound)")
parser.add_argument("--audioAsset", help="Scene audio asset reference or ID")
parser.add_argument("--soundFile", help="Legacy resource-library sound file URL or identifier")
parser.add_argument("--startOnTrigger", type=parse_bool, help="Whether playback waits for trigger")
parser.add_argument("--volume", type=float, help="Playback volume (0-1)")
parser.add_argument("--looping", type=parse_bool, help="Whether the sound loops")
parser.add_argument("--positional", type=parse_bool, help="Whether the sound is spatialized")
parser.add_argument("--rolloffFactor", type=float, help="Distance attenuation factor for positional audio")
parser.add_argument("--autoPlay", type=parse_bool, help="Whether the sound starts on scene load")
parser.add_argument("--attributesData", help="Optional JSON object to merge with the audio-specific flags")
parser.add_argument("--enabled", type=parse_bool, help="Whether the attached sound behavior is enabled")
args = parser.parse_args()

attributes = {}
if args.attributesData:
    attributes = parse_json_arg(args.attributesData, "attributesData")
    if not isinstance(attributes, dict):
        print("Error: --attributesData must be a JSON object", file=sys.stderr)
        sys.exit(1)
for key in ("audioAsset", "soundFile", "startOnTrigger", "volume", "looping", "positional", "rolloffFactor", "autoPlay"):
    val = getattr(args, key)
    if val is not None:
        attributes[key] = val

if not attributes and args.enabled is None:
    print("Error: Provide at least one audio config field or --enabled", file=sys.stderr)
    sys.exit(1)

body = build_params(target=args.target, behaviorId=args.behaviorId,
                    attributesData=attributes if attributes else None, enabled=args.enabled)
output(studio_post("set-behavior-config", body, args.url))
