import { useEffect, useLayoutEffect, useRef } from 'react';
import { Object3D, Mesh, Material } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { clone as cloneModel } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as WebGLTextureUtils from 'three/examples/jsm/utils/WebGLTextureUtils.js';

import { useOffscreenCanvas } from '@stem/editor-oss/hooks/useOffscreenCanvas';
import { isGaussianSplatObject } from '@stem/editor-oss/model/gaussianSplats';
import { ModelPreviewRenderer } from '../utils/ModelPreviewRenderer';
import RenderWorker from '../utils/render.worker.ts?worker';

type UseRenderPreviewProps = {
    previewModel: Object3D | undefined;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    wrapperRef: React.RefObject<HTMLDivElement | null>;
    useOffscreen?: boolean;
};

export const useRenderPreview = ({
    previewModel,
    canvasRef,
    wrapperRef,
    useOffscreen = true,
}: UseRenderPreviewProps) => {
    const rendererRef = useRef<ModelPreviewRenderer | undefined>(undefined);
    const shouldUseOffscreen = useOffscreen && !isGaussianSplatObject(previewModel);

    const { worker, isOffscreen, isOffscreenRef } = useOffscreenCanvas({
        canvasRef,
        containerRef: wrapperRef,
        workerFactory: () => new RenderWorker(),
        enabled: shouldUseOffscreen,
    });

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) return;

        const width = wrapper.offsetWidth || 100;
        const height = wrapper.offsetHeight || 100;

        if (isOffscreenRef.current) return;

        if (rendererRef.current) return;

        const renderer = new ModelPreviewRenderer(canvas, width, height, window.devicePixelRatio);
        void renderer.init();
        rendererRef.current = renderer;

        return () => {
             if (rendererRef.current) {
                 rendererRef.current.dispose();
                 rendererRef.current = undefined;
             }
        };
    }, [canvasRef, wrapperRef, isOffscreen]);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper || isOffscreenRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (rendererRef.current) {
                    rendererRef.current.setSize(width, height);
                }
            }
        });

        observer.observe(wrapper);
        return () => observer.disconnect();
    }, [wrapperRef, isOffscreen]);

    useEffect(() => {
        if (!previewModel) return;

        const updateWorker = async () => {
             const exporter = new GLTFExporter();

             let tempRenderer: import('three').WebGLRenderer | undefined;

             try {
                exporter.setTextureUtils(WebGLTextureUtils);
             } catch (e) {
                 console.warn("Could not setup TextureUtils for export. Compressed textures may cause issues:", e);
             }

            const tryExport = (model: Object3D, retryCount = 0) => {
                 exporter.parse(
                     model,
                     (gltf) => {
                         tempRenderer?.dispose();
                         const buffer = gltf as ArrayBuffer;
                         if (isOffscreenRef.current && worker) {
                            worker.postMessage({
                                type: 'updateModel',
                                payload: buffer,
                            }, [buffer]);
                        } else if (rendererRef.current) {
                            rendererRef.current.updateModel(previewModel);
                        }
                     },
                     (error) => {
                         console.error('Failed to export model to GLB for worker:', error);

                         if (retryCount === 0 && error.message.includes('setTextureUtils')) {
                             console.warn('Compressed textures detected and export failed. Retrying with stripped textures as fallback.');

                             tempRenderer?.dispose();

                             Promise.resolve().then(() => {
                                 const clone = cloneModel(model);
                                 clone.traverse((child) => {
                                     if ((child as Mesh).isMesh) {
                                         const mesh = child as Mesh;
                                         if(mesh.material) {
                                             const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                                             materials.forEach((m) => {
                                                 const mat = m as Material & {
                                                     map?: unknown;
                                                     normalMap?: unknown;
                                                     roughnessMap?: unknown;
                                                     metalnessMap?: unknown;
                                                     emissiveMap?: unknown;
                                                 };
                                                 if (mat.map) mat.map = null;
                                                 if (mat.normalMap) mat.normalMap = null;
                                                 if (mat.roughnessMap) mat.roughnessMap = null;
                                                 if (mat.metalnessMap) mat.metalnessMap = null;
                                                 if (mat.emissiveMap) mat.emissiveMap = null;
                                                 mat.needsUpdate = true;
                                             });
                                         }
                                     }
                                 });

                                 tryExport(clone, retryCount + 1);
                             }).catch(err => {
                                 console.error('Failed to load SkeletonUtils for clone:', err);
                                 const clone = model.clone();
                                 tryExport(clone, retryCount + 1);
                             });
                         } else {
                             tempRenderer?.dispose();
                         }
                     },
                     { binary: true },
                 );
            };

            tryExport(previewModel);
        };

        if (isOffscreenRef.current && worker) {
            void updateWorker();
        } else if (rendererRef.current) {
             rendererRef.current.updateModel(previewModel);
        }

    }, [previewModel, isOffscreen, worker]);

    return {};
};
