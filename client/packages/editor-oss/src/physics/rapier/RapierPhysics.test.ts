import { makeJointTests } from '../PhysicsEngineJointTests';
import { makeLegacyPhysicsAdapterTests } from '../LegacyPhysicsAdapterTests';
import { makeCharacterControllerTests } from '../PhysicsEngineCharacterControllerTests';
import { makePhysicsTests } from '../PhysicsEngineTests';
import { makeVehicleTests } from '../PhysicsEngineVehicleTests';
import { initRapier } from './rapier';
import { RapierPhysicsEngine } from './RapierPhysicsEngine';

describe('RapierPhysics', () => {
    const makePhysicsEngine = async (gravity: number) => {
        await initRapier();
        return new RapierPhysicsEngine(gravity);
    };

    makePhysicsTests(makePhysicsEngine);
    makeCharacterControllerTests(makePhysicsEngine);
    makeVehicleTests(makePhysicsEngine);
    makeJointTests(makePhysicsEngine);
    makeLegacyPhysicsAdapterTests(makePhysicsEngine);
});
