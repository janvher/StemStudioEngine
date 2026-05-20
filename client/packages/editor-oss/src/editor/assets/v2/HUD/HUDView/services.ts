import * as THREE from "three";

import {START_MENU_BUTTON_TYPES} from "../HUDEditView/types";

export const checkIfStartBtn = (buttonType: string) => {
    return buttonType?.toLowerCase() === START_MENU_BUTTON_TYPES.START_GAME.toLowerCase();
};
export const checkIfQuitBtn = (buttonType: string) => {
    return buttonType?.toLowerCase() === START_MENU_BUTTON_TYPES.QUIT.toLowerCase();
};

export const openFullScreen = () => {
    const elem = document.documentElement;
    if (!elem) return;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
        // @ts-ignore
    } else if (elem.webkitRequestFullscreen) {
        /* Safari */
        // @ts-ignore
        elem.webkitRequestFullscreen();
        // @ts-ignore
    } else if (elem.msRequestFullscreen) {
        /* IE11 */
        // @ts-ignore
        elem.msRequestFullscreen();
    }
};

interface PlayerData {
    position: {x: number; y: number; z: number};
    quaternionAuxA: {_x: number; _y: number; _z: number; _w: number};
}

export const getPositionInFrontOfPlayer = (player: PlayerData, distance = 5) => {
    const position = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
    const quaternion = new THREE.Quaternion(
        player.quaternionAuxA._x,
        player.quaternionAuxA._y,
        player.quaternionAuxA._z,
        player.quaternionAuxA._w,
    );

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);

    // Ignore vertical tilt (flatten to XZ)
    forward.y = 0;
    forward.normalize();
    return position.add(forward.multiplyScalar(distance));
};

type Offset =
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23
    | 24
    | 25
    | 26
    | 27
    | 28
    | 29
    | 30
    | 31
    | 32
    | 33
    | 34
    | 35
    | 36
    | 37
    | 38
    | 39
    | 40
    | 41
    | 42
    | 43
    | 44
    | 45
    | 46
    | 47
    | 48
    | 49
    | 50
    | 51
    | 52
    | 53
    | 54
    | 55
    | 56
    | 57
    | 58
    | 59
    | 60
    | 61
    | 62
    | 63
    | 64
    | 65
    | 66
    | 67
    | 68
    | 69
    | 70
    | 71
    | 72
    | 73
    | 74
    | 75
    | 76
    | 77
    | 78
    | 79
    | 80
    | 81
    | 82
    | 83
    | 84
    | 85
    | 86
    | 87
    | 88
    | 89
    | 90
    | 91
    | 92
    | 93
    | 94
    | 95
    | 96
    | 97
    | 98
    | 99;

const Z_OFFSET = 100;
const BASE_Z_INDEX = 500;

export enum HUD_Z_INDEX {
    CameraControls = BASE_Z_INDEX,
    TouchJoystick = CameraControls + Z_OFFSET,
    TouchButtons = TouchJoystick + Z_OFFSET,
    HUDBase = TouchButtons + Z_OFFSET,
    AlwaysOnTopBase = HUDBase + Z_OFFSET,
}

/**
 *
 * @param base
 * @param offset
 */
export function getZIndexWithinHUD(base: HUD_Z_INDEX, offset: Offset): number {
    return base + offset;
}
