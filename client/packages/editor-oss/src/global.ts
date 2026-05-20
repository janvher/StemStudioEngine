import * as THREE from "three";

import EngineRuntime from './EngineRuntime';

interface GlobalType {
    app: EngineRuntime | null;
    three$1: any;
    greenworks: any;
}

export default {
    app: null,
    three$1: THREE,
} as GlobalType;
