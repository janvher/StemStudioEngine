import * as THREE from "three";
import { CSMMode } from "three/examples/jsm/csm/CSM.js";

import { CSMManager } from "./CSMManager";
import Editor from "@stem/editor-oss/editor/Editor";
import { BehaviorBase, BehaviorOptions } from "../../Behavior";
import GameManager from "../../game/GameManager";

export interface CSMParams {
  cascades?: number;
  mode?: CSMMode;
  lightMargin?: number;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  customSplitsCallback?: Function;
  fade?: boolean;
}

/**
 * CSMBehavior: Attach to a DirectionalLight to manage CSM state and parameters.
 * Extends BehaviorBase to integrate with the behavior system.
 */
export default class CSMBehavior extends BehaviorBase {
  private csmManager: CSMManager;

  constructor(target: THREE.Object3D, id: string, options: BehaviorOptions) {
    super(target, id, options);
    this.csmManager = CSMManager.instance;
  }

  init(game: GameManager): void {
    super.init(game);
  }

  onStart(): void {
    if (this.target && this.target instanceof THREE.DirectionalLight) {
      // Set initial CSM parameters from attributes
      const csmParams: CSMParams = {
        cascades: this.attributes.cascades || 3,
        mode: this.attributes.mode || 'practical',
        lightMargin: this.attributes.lightMargin || 200,
        fade: this.attributes.fade ?? false,
      };

      // Store CSM parameters in the light's userData
      this.target.userData.csmEnabled = true;

      // Enable CSM for this light
      this.csmManager.enableCSM(this.target, csmParams);
    }
  }

  onStop(): void {
    if (this.target && this.target instanceof THREE.DirectionalLight) {
      // Disable CSM for this light
      this.target.userData.csmEnabled = false;
      this.csmManager.disableCSM();
    }
  }

  onAttributesUpdated(): void {
    if (this.target && this.target instanceof THREE.DirectionalLight && this.target.userData.csmEnabled) {
      // Update CSM parameters from attributes
      const csmParams: CSMParams = {
        cascades: this.attributes.cascades || 3,
        mode: this.attributes.mode || 'practical',
        lightMargin: this.attributes.lightMargin || 200,
        fade: this.attributes.fade ?? false,
      };

      // Update CSM parameters in the light's userData
      this.csmManager.enableCSM(this.target, csmParams);
    }
  }

  update(deltaTime: number): void {
    // CSM update is handled by CSMManager in the render loop
    // This method is called every frame but CSM doesn't need per-frame updates

    CSMManager.instance.update();
  }

  dispose(): void {
    this.onStop();
  }

  // Editor methods
  onEditorAdded(editor: Editor): void {
      this.onStart();
  }

  onEditorRemoved(): void {
      this.onStop();
  }

  onEditorDispose(): void {
      this.onStop();
  }

  onEditorUpdate(): void {
      this.update(0);
  }

  onEditorAttributesUpdated(): void {
      this.onAttributesUpdated();
  }

  // Legacy methods for backward compatibility (if needed)
  enable(params?: CSMParams) {
    if (this.target && this.target instanceof THREE.DirectionalLight) {
      this.target.userData.csmEnabled = true;
      if (params) {
        // No longer storing csmParams in userData
      }

      this.csmManager.enableCSM(this.target, params);
    }
  }

  disable() {
    if (this.target && this.target instanceof THREE.DirectionalLight) {
      this.target.userData.csmEnabled = false;
      this.csmManager.disableCSM();
    }
  }

  setParams(params: CSMParams) {
    if (this.target && this.target instanceof THREE.DirectionalLight) {
      // No longer storing csmParams in userData
      if (this.target.userData.csmEnabled) {
        this.csmManager.enableCSM(this.target, params);
      }
    }
  }

  isEnabled(): boolean {
    return !!(this.target && this.target.userData.csmEnabled);
  }

  getParams(): CSMParams {
    // No longer storing csmParams in userData
    return {};
  }
} 
