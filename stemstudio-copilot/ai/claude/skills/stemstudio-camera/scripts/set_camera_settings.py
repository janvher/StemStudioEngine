#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to set camera settings in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, build_params, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to set camera settings")
parser.add_argument("--target", required=True, help="Object name or UUID to configure camera on")
parser.add_argument("--fov", type=float, default=None, help="Field of view in degrees")
parser.add_argument("--near", type=float, default=None, help="Near clipping plane")
parser.add_argument("--far", type=float, default=None, help="Far clipping plane")
parser.add_argument("--cameraType", default=None, help="Camera type ('THIRD_PERSON', 'FIRST_PERSON', 'TOP_DOWN', 'SIDE_SCROLLER')")
parser.add_argument("--defaultDistance", type=float, default=None, help="Default camera distance")
parser.add_argument("--minDistance", type=float, default=None, help="Minimum camera distance")
parser.add_argument("--maxDistance", type=float, default=None, help="Maximum camera distance")
parser.add_argument("--headHeight", type=float, default=None, help="Camera head height (first-person)")
parser.add_argument("--axis", default=None, help="Camera axis constraint (e.g. 'Z' for side-scroller)")
parser.add_argument("--occlusionType", default=None, help="Camera occlusion handling type")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("set_camera_settings", build_params(
    target=args.target, fov=args.fov, near=args.near, far=args.far,
    cameraType=args.cameraType, defaultDistance=args.defaultDistance,
    minDistance=args.minDistance, maxDistance=args.maxDistance,
    headHeight=args.headHeight, axis=args.axis, occlusionType=args.occlusionType,
), args.id))
