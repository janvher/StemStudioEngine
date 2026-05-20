#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to set game settings in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, build_params, parse_bool, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to set game settings")
parser.add_argument("--enabled", type=parse_bool, default=None, help="Enable/disable game mode")
parser.add_argument("--lives", type=int, default=None, help="Number of lives")
parser.add_argument("--maxScore", type=int, default=None, help="Maximum score to win")
parser.add_argument("--timer", type=int, default=None, help="Timer duration in seconds")
parser.add_argument("--useAvatar", type=parse_bool, default=None, help="Whether to use avatar")
parser.add_argument("--isMultiplayer", type=parse_bool, default=None, help="Enable multiplayer")
parser.add_argument("--showHUD", type=parse_bool, default=None, help="Show HUD overlay")
parser.add_argument("--isSandbox", type=parse_bool, default=None, help="Enable sandbox mode")
parser.add_argument("--voiceChatEnabled", type=parse_bool, default=None, help="Enable voice chat")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("set_game_settings", build_params(
    enabled=args.enabled, lives=args.lives, maxScore=args.maxScore, timer=args.timer,
    useAvatar=args.useAvatar, isMultiplayer=args.isMultiplayer, showHUD=args.showHUD,
    isSandbox=args.isSandbox, voiceChatEnabled=args.voiceChatEnabled,
), args.id))
