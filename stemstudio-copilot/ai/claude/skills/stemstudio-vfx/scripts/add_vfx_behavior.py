#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to add a behavior to a VFX (Particle Emitter) in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, parse_json_arg, build_params, add_id_arg
import argparse
import json

BEHAVIOR_TYPES = {
    "ApplyForce": {"description": "Apply constant directional force to particles", "example": {"direction": [0, 1, 0], "magnitude": {"type": "ConstantValue", "value": 5}}},
    "Noise": {"description": "Add turbulence/noise to particle position and rotation", "example": {"frequency": {"type": "ConstantValue", "value": 1}, "power": {"type": "ConstantValue", "value": 1}, "positionAmount": {"type": "ConstantValue", "value": 1}, "rotationAmount": {"type": "ConstantValue", "value": 0}}},
    "TurbulenceField": {"description": "Apply 3D turbulence field to particles", "example": {"scale": [1, 1, 1], "octaves": 3, "velocityMultiplier": [1, 1, 1], "timeScale": [0.5, 0.5, 0.5]}},
    "GravityForce": {"description": "Attract particles toward a center point", "example": {"center": [0, 0, 0], "magnitude": 10}},
    "ColorOverLife": {"description": "Change particle color over lifetime using gradient", "example": {"color": {"type": "Gradient", "functions": [{"function": {"p0": [1, 1, 1, 1], "p1": [1, 1, 1, 1]}, "start": 0}, {"function": {"p0": [1, 1, 1, 0], "p1": [1, 1, 1, 0]}, "start": 1}]}}},
    "RotationOverLife": {"description": "Rotate particles over lifetime (2D billboards)", "example": {"angularVelocity": {"type": "ConstantValue", "value": 3.14159}}},
    "Rotation3DOverLife": {"description": "Rotate particles in 3D space over lifetime", "example": {"angularVelocity": {"type": "AxisAngle", "axis": [0, 1, 0], "angle": {"type": "ConstantValue", "value": 3.14159}}}},
    "SizeOverLife": {"description": "Change particle size over lifetime", "example": {"size": {"type": "PiecewiseBezier", "functions": [{"function": {"p0": 1, "p1": 1.5, "p2": 1.2, "p3": 0.5}, "start": 0}]}}},
    "ColorBySpeed": {"description": "Change particle color based on velocity", "example": {"color": {"type": "Gradient", "functions": [{"function": {"p0": [0, 0, 1, 1], "p1": [0, 0, 1, 1]}, "start": 0}, {"function": {"p0": [1, 0, 0, 1], "p1": [1, 0, 0, 1]}, "start": 1}]}, "speedRange": [0, 10]}},
    "RotationBySpeed": {"description": "Rotate particles based on velocity", "example": {"angularVelocity": {"type": "ConstantValue", "value": 6.28}, "speedRange": [0, 10]}},
    "SizeBySpeed": {"description": "Change particle size based on velocity", "example": {"size": {"type": "ConstantValue", "value": 1.5}, "speedRange": [0, 10]}},
    "SpeedOverLife": {"description": "Modify particle speed over lifetime", "example": {"speed": {"type": "PiecewiseBezier", "functions": [{"function": {"p0": 1, "p1": 0.5, "p2": 0.3, "p3": 0}, "start": 0}]}}},
    "FrameOverLife": {"description": "Animate sprite sheet frames over lifetime", "example": {"frame": {"type": "PiecewiseBezier", "functions": [{"function": {"p0": 0, "p1": 16, "p2": 16, "p3": 32}, "start": 0}]}}},
    "ForceOverLife": {"description": "Apply forces to particles over lifetime (e.g., gravity, wind)", "example": {"x": {"type": "ConstantValue", "value": 0}, "y": {"type": "ConstantValue", "value": -9.8}, "z": {"type": "ConstantValue", "value": 0}}},
    "OrbitOverLife": {"description": "Make particles orbit around their spawn point", "example": {"orbitSpeed": {"type": "ConstantValue", "value": 1}, "axis": [0, 1, 0]}},
    "WidthOverLength": {"description": "Control trail width over its length (for Trail render mode)", "example": {"width": {"type": "PiecewiseBezier", "functions": [{"function": {"p0": 1, "p1": 0.5, "p2": 0.2, "p3": 0}, "start": 0}]}}},
    "ChangeEmitDirection": {"description": "Change particle emission direction over emitter lifetime", "example": {"angle": {"type": "ConstantValue", "value": 0.52}}},
    "EmitSubParticleSystem": {"description": "Emit sub-particle systems from particles", "example": {"subParticleSystem": "SubParticleSystemName", "useVelocityAsBasis": False, "mode": 0, "emitProbability": 1.0}},
    "LimitSpeedOverLife": {"description": "Limit maximum particle speed over lifetime", "example": {"speed": {"type": "ConstantValue", "value": 10}, "dampen": 0.5}},
}

parser = argparse.ArgumentParser(
    description="Generate JSONRPC message to add a behavior to a VFX emitter",
    formatter_class=argparse.RawDescriptionHelpFormatter,
    epilog=f"Available behavior types:\n" + "\n".join([f"  {n}: {i['description']}" for n, i in BEHAVIOR_TYPES.items()])
)
parser.add_argument("--target", required=True, help="UUID or name of the VFX emitter")
parser.add_argument("--behaviorType", required=True, choices=list(BEHAVIOR_TYPES.keys()), help="Type of behavior to add")
parser.add_argument("--config", help="Behavior configuration as JSON string (uses example if not provided)")
parser.add_argument("--show-example", action="store_true", help="Show example configuration for the behavior type and exit")
add_id_arg(parser)
args = parser.parse_args()

if args.show_example:
    if args.behaviorType in BEHAVIOR_TYPES:
        print(f"Example configuration for {args.behaviorType}:")
        print(json.dumps(BEHAVIOR_TYPES[args.behaviorType]["example"], indent=2))
    sys.exit(0)

config = parse_json_arg(args.config, "config")
if config is None and args.behaviorType in BEHAVIOR_TYPES:
    config = BEHAVIOR_TYPES[args.behaviorType]["example"]
print(jsonrpc("add_vfx_behavior", build_params(target=args.target, behaviorType=args.behaviorType, config=config), args.id))
