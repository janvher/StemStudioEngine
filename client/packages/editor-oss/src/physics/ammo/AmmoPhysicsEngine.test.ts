import path from "path";
import { fileURLToPath } from "url";

import Ammo from "ammo";
import { makeJointTests } from '../PhysicsEngineJointTests';
import { makeLegacyPhysicsAdapterTests } from '../LegacyPhysicsAdapterTests';
import { makeCharacterControllerTests } from '../PhysicsEngineCharacterControllerTests';
import { makePhysicsTests } from '../PhysicsEngineTests';
import { makeVehicleTests } from '../PhysicsEngineVehicleTests';
import { AmmoPhysicsEngine } from './AmmoPhysicsEngine';

const __ammoDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../assets/js/ammo",
);

describe("AmmoPhysics", () => {
    const makePhysicsEngine = async (gravity: number) => {
        const ammo = await Ammo({
            locateFile: (file: string) => path.join(__ammoDir, file),
        });
        return new AmmoPhysicsEngine(ammo, gravity);
    };

    makePhysicsTests(makePhysicsEngine);
    makeCharacterControllerTests(makePhysicsEngine);
    makeVehicleTests(makePhysicsEngine);
    makeJointTests(makePhysicsEngine);
    makeLegacyPhysicsAdapterTests(makePhysicsEngine);
});
