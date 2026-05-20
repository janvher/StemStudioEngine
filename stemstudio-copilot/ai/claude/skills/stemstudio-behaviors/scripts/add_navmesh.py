#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to create or configure a NavMesh behavior."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, build_params, parse_bool, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to add/configure a navmesh")
parser.add_argument("--target", default=None, help="Scene object name or UUID that owns the navmesh; defaults to Default Scene")
parser.add_argument("--enabled", type=parse_bool, default=None, help="Enable navmesh generation: true/false/on/off")
parser.add_argument("--cellSize", type=float, default=None, help="Horizontal navmesh precision")
parser.add_argument("--cellHeight", type=float, default=None, help="Vertical navmesh precision")
parser.add_argument("--agentHeight", type=float, default=None, help="Supported agent height")
parser.add_argument("--agentRadius", type=float, default=None, help="Supported agent radius")
parser.add_argument("--agentMaxClimb", type=float, default=None, help="Maximum climb step height")
parser.add_argument("--agentMaxSlope", type=float, default=None, help="Maximum walkable slope angle")
parser.add_argument("--regionMinSize", type=float, default=None, help="Minimum region size")
parser.add_argument("--regionMergeSize", type=float, default=None, help="Region merge threshold")
parser.add_argument("--edgeMaxLen", type=float, default=None, help="Maximum polygon edge length")
parser.add_argument("--edgeMaxError", type=float, default=None, help="Maximum simplification error")
parser.add_argument("--vertsPerPoly", type=float, default=None, help="Maximum polygon vertices")
parser.add_argument("--detailSampleDist", type=float, default=None, help="Detail sample distance")
parser.add_argument("--detailSampleMaxError", type=float, default=None, help="Detail sample error threshold")
parser.add_argument("--autoGenerate", type=parse_bool, default=None, help="Auto rebuild when scene changes: true/false/on/off")
parser.add_argument("--onlyPhysicsMeshes", type=parse_bool, default=None, help="Bake only physics-enabled meshes: true/false/on/off")
parser.add_argument("--debugVisualization", type=parse_bool, default=None, help="Show navmesh debug wireframe: true/false/on/off")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("add_navmesh", build_params(
    target=args.target,
    enabled=args.enabled,
    cellSize=args.cellSize,
    cellHeight=args.cellHeight,
    agentHeight=args.agentHeight,
    agentRadius=args.agentRadius,
    agentMaxClimb=args.agentMaxClimb,
    agentMaxSlope=args.agentMaxSlope,
    regionMinSize=args.regionMinSize,
    regionMergeSize=args.regionMergeSize,
    edgeMaxLen=args.edgeMaxLen,
    edgeMaxError=args.edgeMaxError,
    vertsPerPoly=args.vertsPerPoly,
    detailSampleDist=args.detailSampleDist,
    detailSampleMaxError=args.detailSampleMaxError,
    autoGenerate=args.autoGenerate,
    onlyPhysicsMeshes=args.onlyPhysicsMeshes,
    debugVisualization=args.debugVisualization,
), args.id))
