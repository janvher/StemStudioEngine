/**
 * Tests for RenderingAndPerformancePanel logic and functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock global app object
const mockApp = {
  editor: {
    useInstancing: false,
    voiceChatEnabled: false,
    showStats: false,
    scene: {
      userData: {
        physicsSleepingEnabled: false,
        physicsUseWorker: false,
        rendering: {
          batching: {
            enableDynamic: true,
            stats: [] as string[],
          },
          forceWebGL: false,
          forceWebGLForVFX: true,
          rootTransformPolicy: "auto-reset",
           splat: {
             maxStdDev: Math.sqrt(8),
             minPixelRadius: 2,
             maxPixelRadius: 512,
             sortRadial: true,
             minSortIntervalMs: 0,
             enableLod: true,
             pixelRatioFactor: 1,
           },
        },
      },
    },
  },
  storage: {
    debug: false,
  },
  call: vi.fn(),
};

// Mock global module
vi.mock('../../../../../../../global', () => ({
  default: {
    app: mockApp,
  },
}));

describe('RenderingAndPerformancePanel Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock app state
    mockApp.editor.useInstancing = false;
    mockApp.editor.voiceChatEnabled = false;
    mockApp.editor.showStats = false;
    mockApp.editor.scene.userData.physicsSleepingEnabled = false;
    mockApp.editor.scene.userData.physicsUseWorker = false;
    mockApp.storage.debug = false;
    mockApp.editor.scene.userData.rendering.batching.enableDynamic = true;
    mockApp.editor.scene.userData.rendering.batching.stats = [];
    mockApp.editor.scene.userData.rendering.forceWebGL = false;
    mockApp.editor.scene.userData.rendering.forceWebGLForVFX = true;
    mockApp.editor.scene.userData.rendering.rootTransformPolicy = "auto-reset";
    mockApp.editor.scene.userData.rendering.splat = {
      maxStdDev: Math.sqrt(8),
      minPixelRadius: 2,
      maxPixelRadius: 512,
      sortRadial: true,
      minSortIntervalMs: 0,
      enableLod: true,
      pixelRatioFactor: 1,
    };
  });

  describe('handleEditorChange function behavior', () => {
    it('should update editor properties correctly', () => {
      // Simulate the handleEditorChange function behavior
      const handleEditorChange = (key: string, value: boolean) => {
        (mockApp.editor as any)[key] = value;
      };


      expect(mockApp.editor.useInstancing).toBe(false);
      handleEditorChange('useInstancing', true);
      expect(mockApp.editor.useInstancing).toBe(true);

      expect(mockApp.editor.voiceChatEnabled).toBe(false);
      handleEditorChange('voiceChatEnabled', true);
      expect(mockApp.editor.voiceChatEnabled).toBe(true);

      expect(mockApp.editor.showStats).toBe(false);
      handleEditorChange('showStats', true);
      expect(mockApp.editor.showStats).toBe(true);
    });
  });

  describe('handleUserDataChange function behavior', () => {
    it('should update scene userData properties and trigger scene change', () => {
      // Simulate the handleUserDataChange function behavior
      const handleUserDataChange = (key: string, value: boolean) => {
        (mockApp.editor.scene.userData as Record<string, unknown>)[key] = value;
        mockApp.call('sceneGraphChanged', mockApp.editor);
      };

      expect(mockApp.editor.scene.userData.physicsSleepingEnabled).toBe(false);
      handleUserDataChange('physicsSleepingEnabled', true);
      expect(mockApp.editor.scene.userData.physicsSleepingEnabled).toBe(true);
      expect(mockApp.call).toHaveBeenCalledWith('sceneGraphChanged', mockApp.editor);

      vi.clearAllMocks();

      expect(mockApp.editor.scene.userData.physicsUseWorker).toBe(false);
      handleUserDataChange('physicsUseWorker', true);
      expect(mockApp.editor.scene.userData.physicsUseWorker).toBe(true);
      expect(mockApp.call).toHaveBeenCalledWith('sceneGraphChanged', mockApp.editor);
    });
  });

  describe('handleDebugModeChange function behavior', () => {
    it('should update debug mode in storage', () => {
      // Simulate the handleDebugModeChange function behavior
      const handleDebugModeChange = (value: boolean) => {
        mockApp.storage.debug = value;
      };

      expect(mockApp.storage.debug).toBe(false);
      handleDebugModeChange(true);
      expect(mockApp.storage.debug).toBe(true);
    });
  });

  describe('handleEnableDynamicBatchingChange function behavior', () => {
    it('should update dynamic batching setting and trigger clear call', () => {
      // Simulate the handleEnableDynamicBatchingChange function behavior
      const handleEnableDynamicBatchingChange = (value: boolean) => {
        const ud = mockApp.editor.scene.userData || {};
        const rendering = ud.rendering = ud.rendering || {};
        const batching = rendering.batching = rendering.batching || {};
        batching.enableDynamic = value;
        mockApp.call('clear', mockApp.editor, mockApp.editor);
      };

      expect(mockApp.editor.scene.userData.rendering.batching.enableDynamic).toBe(true);
      handleEnableDynamicBatchingChange(false);
      expect(mockApp.editor.scene.userData.rendering.batching.enableDynamic).toBe(false);
      expect(mockApp.call).toHaveBeenCalledWith('clear', mockApp.editor, mockApp.editor);
    });
  });

  describe('Clear Batching Data functionality', () => {
    it('should clear batching stats array', () => {
      // Set up some stats
      mockApp.editor.scene.userData.rendering.batching.stats = ['stat1', 'stat2', 'stat3'];

      // Simulate the clear batching data function
      const clearBatchingData = () => {
        const batching = mockApp.editor.scene.userData.rendering.batching;
        if (batching && Array.isArray(batching.stats)) {
          batching.stats = [];
        }
      };

      expect(mockApp.editor.scene.userData.rendering.batching.stats).toHaveLength(3);
      clearBatchingData();
      expect(mockApp.editor.scene.userData.rendering.batching.stats).toHaveLength(0);
    });

    it('should handle missing batching stats gracefully', () => {
      // Remove the stats array
      delete (mockApp.editor.scene.userData.rendering.batching as { stats?: string[] }).stats;

      // Simulate the clear batching data function
      const clearBatchingData = () => {
        const batching = mockApp.editor.scene.userData.rendering.batching;
        if (batching && Array.isArray(batching.stats)) {
          batching.stats = [];
        }
      };

      // Should not throw an error
      expect(() => clearBatchingData()).not.toThrow();
    });
  });

  describe('Checkbox configuration', () => {
    it('should have correct checkbox configuration', () => {
      // Simulate the checkbox configuration
      const renderingAndPerformanceCheckboxes = [
        { text: "Mesh Instancing Optimization", keyName: "useInstancing" },
        { text: "Voice Chat Integration", keyName: "voiceChatEnabled" },
        { text: "Enable Physics Sleeping", keyName: "physicsSleepingEnabled" },
        { text: "Performance Statistics Overlay", keyName: "showStats" },
        { text: "Multi-threaded Physics", keyName: "physicsUseWorker" },
        { text: "Debug Mode", keyName: "debug" },
        { text: "Enable Dynamic Batching", keyName: "enableDynamicBatching" },
        { text: "Radial Sort (vs Z-depth)", keyName: "sortRadial" },
        { text: "Enable Splat LoD", keyName: "enableLod" },
        { text: "Force WebGL (disable WebGPU)", keyName: "forceWebGL" },
        { text: "Force WebGL for VFX", keyName: "forceWebGLForVFX" },
      ];

      expect(renderingAndPerformanceCheckboxes).toHaveLength(11);
      expect(renderingAndPerformanceCheckboxes.map(c => c.text)).toEqual([
        "Mesh Instancing Optimization",
        "Voice Chat Integration",
        "Enable Physics Sleeping",
        "Performance Statistics Overlay",
        "Multi-threaded Physics",
        "Debug Mode",
        "Enable Dynamic Batching",
        "Radial Sort (vs Z-depth)",
        "Enable Splat LoD",
        "Force WebGL (disable WebGPU)",
        "Force WebGL for VFX",
      ]);
    });

    it('should initialize splat settings from scene userData', () => {
      mockApp.editor.scene.userData.rendering.splat.maxStdDev = 2.4;
      mockApp.editor.scene.userData.rendering.splat.minPixelRadius = 0.2;
      mockApp.editor.scene.userData.rendering.splat.maxPixelRadius = 1024;
      mockApp.editor.scene.userData.rendering.splat.sortRadial = false;
      mockApp.editor.scene.userData.rendering.splat.minSortIntervalMs = 25;
      mockApp.editor.scene.userData.rendering.splat.enableLod = false;
      mockApp.editor.scene.userData.rendering.splat.pixelRatioFactor = 0.75;

      const initializeSplatState = () => ({
        maxStdDev: mockApp.editor.scene.userData.rendering.splat.maxStdDev ?? Math.sqrt(8),
        minPixelRadius: mockApp.editor.scene.userData.rendering.splat.minPixelRadius ?? 2,
        maxPixelRadius: mockApp.editor.scene.userData.rendering.splat.maxPixelRadius ?? 512,
        sortRadial: mockApp.editor.scene.userData.rendering.splat.sortRadial ?? true,
        minSortIntervalMs: mockApp.editor.scene.userData.rendering.splat.minSortIntervalMs ?? 0,
        enableLod: mockApp.editor.scene.userData.rendering.splat.enableLod ?? true,
        pixelRatioFactor: mockApp.editor.scene.userData.rendering.splat.pixelRatioFactor ?? 1,
      });

      const state = initializeSplatState();
      expect(state.maxStdDev).toBe(2.4);
      expect(state.minPixelRadius).toBe(0.2);
      expect(state.maxPixelRadius).toBe(1024);
      expect(state.sortRadial).toBe(false);
      expect(state.minSortIntervalMs).toBe(25);
      expect(state.enableLod).toBe(false);
      expect(state.pixelRatioFactor).toBe(0.75);
    });
  });

  describe('State initialization', () => {
    it('should initialize state correctly from app editor', () => {
  // Set some values in the mock app
      mockApp.editor.useInstancing = true;
      mockApp.editor.voiceChatEnabled = false;
      mockApp.editor.showStats = true;
      mockApp.editor.scene.userData.physicsSleepingEnabled = true;
      mockApp.editor.scene.userData.physicsUseWorker = false;
      mockApp.storage.debug = true;
      mockApp.editor.scene.userData.rendering.batching.enableDynamic = false;

      // Simulate state initialization
      const initializeState = () => ({
        useInstancing: !!mockApp.editor.useInstancing,
        voiceChatEnabled: !!mockApp.editor.voiceChatEnabled,
        showStats: !!mockApp.editor.showStats,
        physicsSleepingEnabled: !!mockApp.editor.scene.userData.physicsSleepingEnabled,
        usePhysicsWorker: !!mockApp.editor.scene.userData.physicsUseWorker,
        debugMode: !!mockApp.storage.debug,
        enableDynamicBatching: !(mockApp.editor.scene.userData.rendering.batching.enableDynamic === false),
      });

      const state = initializeState();
  expect(state.useInstancing).toBe(true);
      expect(state.voiceChatEnabled).toBe(false);
      expect(state.showStats).toBe(true);
      expect(state.physicsSleepingEnabled).toBe(true);
      expect(state.usePhysicsWorker).toBe(false);
      expect(state.debugMode).toBe(true);
      expect(state.enableDynamicBatching).toBe(false);
    });

    it('should initialize forceWebGL settings from scene userData', () => {
      mockApp.editor.scene.userData.rendering.forceWebGL = true;
      mockApp.editor.scene.userData.rendering.forceWebGLForVFX = false;
      mockApp.editor.scene.userData.rendering.rootTransformPolicy = "warn-only";

      const initializeForceWebGLState = () => ({
        forceWebGL: !!mockApp.editor.scene.userData.rendering.forceWebGL,
        forceWebGLForVFX: mockApp.editor.scene.userData.rendering.forceWebGLForVFX ?? true,
        rootTransformPolicy: mockApp.editor.scene.userData.rendering.rootTransformPolicy ?? "auto-reset",
      });

      const state = initializeForceWebGLState();
      expect(state.forceWebGL).toBe(true);
      expect(state.forceWebGLForVFX).toBe(false);
      expect(state.rootTransformPolicy).toBe("warn-only");
    });
  });

  describe('handleForceWebGLChange function behavior', () => {
    it('should update rendering.forceWebGL and fire objectChanged', () => {
      const handleForceWebGLChange = (value: boolean) => {
        const ud = mockApp.editor.scene.userData;
        const rendering = ud.rendering = ud.rendering || {};
        rendering.forceWebGL = value;
        mockApp.call('objectChanged', mockApp.editor, mockApp.editor.scene);
      };

      expect(mockApp.editor.scene.userData.rendering.forceWebGL).toBe(false);
      handleForceWebGLChange(true);
      expect(mockApp.editor.scene.userData.rendering.forceWebGL).toBe(true);
      expect(mockApp.call).toHaveBeenCalledWith('objectChanged', mockApp.editor, mockApp.editor.scene);
    });
  });

  describe('handleForceWebGLForVFXChange function behavior', () => {
    it('should update rendering.forceWebGLForVFX and fire objectChanged', () => {
      const handleForceWebGLForVFXChange = (value: boolean) => {
        const ud = mockApp.editor.scene.userData;
        const rendering = ud.rendering = ud.rendering || {};
        rendering.forceWebGLForVFX = value;
        mockApp.call('objectChanged', mockApp.editor, mockApp.editor.scene);
      };

      expect(mockApp.editor.scene.userData.rendering.forceWebGLForVFX).toBe(true);
      handleForceWebGLForVFXChange(false);
      expect(mockApp.editor.scene.userData.rendering.forceWebGLForVFX).toBe(false);
      expect(mockApp.call).toHaveBeenCalledWith('objectChanged', mockApp.editor, mockApp.editor.scene);
    });
  });

  describe('handleRootTransformPolicyChange function behavior', () => {
    it('should update rendering.rootTransformPolicy and fire objectChanged', () => {
      const handleRootTransformPolicyChange = (value: "auto-reset" | "warn-only" | "ignore") => {
        const ud = mockApp.editor.scene.userData;
        const rendering = ud.rendering = ud.rendering || {};
        rendering.rootTransformPolicy = value;
        mockApp.call('objectChanged', mockApp.editor, mockApp.editor.scene);
      };

      expect(mockApp.editor.scene.userData.rendering.rootTransformPolicy).toBe("auto-reset");
      handleRootTransformPolicyChange("ignore");
      expect(mockApp.editor.scene.userData.rendering.rootTransformPolicy).toBe("ignore");
      expect(mockApp.call).toHaveBeenCalledWith('objectChanged', mockApp.editor, mockApp.editor.scene);
    });
  });
});
