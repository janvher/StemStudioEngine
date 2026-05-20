import { PhysicsSettings } from './PhysicsSettings';
import { RigidBodyHandle } from './RigidBodyHandle';

export interface GameObjectPhysics {
    configure: (settings: PhysicsSettings) => void;
    getSettings: () => PhysicsSettings | undefined;
    
    getBody: () => RigidBodyHandle | undefined;
}
