/**
 * Deprecation shim. The canonical engine interface now lives under
 * `behaviors/stem/` (StemEngineInterface, StemAI, StemAsset, …). This module
 * re-exports those types under the legacy `Erth*` names so existing user code
 * that imports `ErthInterface`, `ErthAI`, etc. keeps compiling.
 *
 * @deprecated Use `@stem/editor-oss/behaviors/stem` instead.
 */
export type {
    StemEngineInterface,
    StemEngineInterface as ErthInterface,
    StemBehaviors,
    StemBehaviors as ErthBehaviors,
} from "../stem/StemEngineInterface";
export type {
    StemAI as ErthAI,
    Generate3dModelParams,
    Generate3dModelResult,
} from "../stem/ai/StemAI";
export type {
    StemAsset as ErthAsset,
    StemAssetModel as ErthAssetModel,
    StemAssetStem as ErthAssetStem,
    CreateFromUrlParams,
} from "../stem/asset/StemAsset";
export type {StemScene as ErthScene} from "../stem/scene/StemScene";
export type {
    PhysicsSettings,
    PhysicsBodyType,
    PhysicsShape,
    PhysicsMaterial,
    PhysicsCollisionBehavior,
    ShapeDimensions,
    BoxShapeDimensions,
    SphereShapeDimensions,
    CapsuleShapeDimensions,
} from "../stem/physics/PhysicsSettings";
export type {RigidBodyHandle} from "../stem/physics/RigidBodyHandle";
export type {StemStore as ErthStore} from "../stem/store/StemStore";
export {
    createStemEngineInterface as createErthInterface,
    createStemEngineInterface as createStemEngine,
} from "../stem/createStemEngineInterface";
export {GlobalStore} from "../stem/store/GlobalStore";
