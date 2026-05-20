import {debounce} from "lodash";
import React, { useEffect, useMemo, useRef } from "react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as THREE from "three/webgpu";
import { ParticleEmitter, ParticleSystem, QuarksUtil, BatchedRenderer } from "three.quarks";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import {ParticleSystemPreviewObject} from "../../../../object/particle/ParticleSystemPreviewObject";
import {allEmittersPlayer, ParticlePlayerActionType} from "@stem/editor-oss/services";
import MeshUtils from "@stem/editor-oss/utils/MeshUtils";
import resizeWindow from "../AnimationCombiner/helpers/resizeWindow";
import {getPhysics} from "../utils/getPhysics";

export const Preview: React.FC = () => {
    const app = global.app as EngineRuntime;
    const selectedObj = app.editor?.selected as THREE.Object3D;
    const viewer = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene>(null);
    const rendererRef = useRef<THREE.WebGPURenderer>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const controlsRef = useRef<OrbitControls>(null);
    const cloneRef = useRef<THREE.Object3D>(null);
    const batchedRendererRef = useRef<BatchedRenderer | null>(null);
    const clockRef = useRef(new THREE.Clock());
    const lastPlayerActionRef = useRef<ParticlePlayerActionType>("stop");

    const debouncedRefresh = useMemo(() => debounce(() => handleParticleEffect(), 150), [selectedObj]);

    const handleParticleEffect = () => {
        cloneRef.current?.traverse((obj: any) => {
            if (obj instanceof ParticleEmitter && obj.system) {
                if (!obj.userData.physics) {
                    obj.userData.physics = getPhysics(null, obj);
                    obj.userData.physics.enabled = false;
                }

                if (batchedRendererRef.current) {
                    QuarksUtil.addToBatchRenderer(obj, batchedRendererRef.current);
                    QuarksUtil.stop(obj);
                }

                const mesh = new ParticleSystemPreviewObject(obj.system as ParticleSystem);
                obj.add(mesh);
            }
        });
        if (cloneRef.current && lastPlayerActionRef.current === "play") {
            allEmittersPlayer(cloneRef.current, "play");
        }
    };

    const refreshPreview = (resetCamera = false) => {
        if (!viewer.current || !selectedObj || !sceneRef.current) return;

        if (cloneRef.current) {
            cloneRef.current.traverse((old: any) => {
                if (old instanceof ParticleEmitter) {
                    try {
                        old.children
                            .filter((c: any) => c instanceof ParticleSystemPreviewObject)
                            .forEach((c: any) => {
                                old.remove(c);
                                MeshUtils.dispose(c);
                            });
                        QuarksUtil.stop(old);
                    } catch (e) {
                        console.warn("Error while cleaning old emitter", e);
                    }
                }
            });
        }

        if (cloneRef.current) {
            sceneRef.current.remove(cloneRef.current);
            MeshUtils.dispose(cloneRef.current);
        }

        const clone = selectedObj.clone(true);

        clone.traverse((child: any) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        cloneRef.current = clone;
        sceneRef.current.add(clone);

        const bbox = new THREE.Box3().setFromObject(clone);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3()).length();

        if (resetCamera) {
            cameraRef.current!.position.set(center.x, center.y + size, size);
            cameraRef.current!.lookAt(center);
        }
        clone.position.sub(center);
        debouncedRefresh();
    };

    const handleEmitterPlayer = (action: ParticlePlayerActionType) => {
        if (!cloneRef.current) return;
        lastPlayerActionRef.current = action;
        allEmittersPlayer(cloneRef.current, action);
    };

    const handleEmitterUpdate = () => refreshPreview(false);

    useEffect(() => {
        if (!viewer.current || !selectedObj) return;

        const scene = new THREE.Scene();
        scene.name = "VFXPreviewScene";
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        cameraRef.current = camera;

        const forceWebGLForVFX = (global as any)?.app?.getRendererSettings?.()?.forceWebGLForVFX ?? true;
        const renderer = new THREE.WebGPURenderer({antialias: true, forceWebGL: forceWebGLForVFX});
        renderer.setClearColor(0x222233);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        resizeWindow(camera, viewer.current, renderer);
        rendererRef.current = renderer;

        if (viewer.current.children.length) {
            viewer.current.removeChild(viewer.current.lastChild as Node);
        }
        viewer.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controlsRef.current = controls;

        const hemiLight = new THREE.HemisphereLight(0x00aaff, 0xffaa00, 0.7);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.shadow.bias = 0;
        dirLight.shadow.normalBias = 0.1;
        dirLight.position.set(5, 10, 7.5);
        scene.add(dirLight);

        batchedRendererRef.current = new BatchedRenderer();
        scene.add(batchedRendererRef.current);

        refreshPreview(true);

        let resizeObserver: ResizeObserver | null = null;
        const handleResize = () => {
            if (!viewer.current || !cameraRef.current || !rendererRef.current) return;
            resizeWindow(cameraRef.current, viewer.current, rendererRef.current);
        };
        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(() => handleResize());
            resizeObserver.observe(viewer.current);
        }
        window.addEventListener("resize", handleResize);

        let mounted = true;
        const animate = () => {
            if (!mounted) return;
            requestAnimationFrame(animate);
            controls.update();
            void renderer.render(scene, camera);
            const delta = clockRef.current.getDelta();
            batchedRendererRef.current?.update(delta);
        };

        renderer.init().then(() => {
            animate();
        }).catch((err: Error) => {
            console.error("Failed to initialize renderer:", err);
        });

        app.on("emitterUpdate", handleEmitterUpdate);
        app.on("emitterPlay", handleEmitterPlayer);

        return () => {
            mounted = false;
            app.on("emitterUpdate", null);
            app.on("emitterPlay", null);

            if (cloneRef.current) {
                scene.remove(cloneRef.current);
                MeshUtils.dispose(cloneRef.current);
            }
            renderer.dispose();
            if (viewer.current) viewer.current.removeChild(renderer.domElement);
            window.removeEventListener("resize", handleResize);
            if (resizeObserver && viewer.current) resizeObserver.unobserve(viewer.current);
        };
    }, [selectedObj]);

    return <div style={{width: "100%", height: "100%"}}
        ref={viewer}
           />;
};
