import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import styled from "styled-components";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import ModelLoader from "../../../../assets/js/loaders/ModelLoader";
import global from "@stem/editor-oss/global";
const Wrapper = styled.div`
    height: 100%;
    width: 100%;
    border-radius: 16px;
    box-sizing: border-box;
    overflow: hidden;

    canvas {
        border-radius: 16px;
    }
`;

type ModelViewerProps = {
    modelUrl: string;
    isRendered: boolean;
    setIsRendered: (isRendered: boolean) => void;
    autoRotate?: boolean;
};

export const ModelViewer: React.FC<ModelViewerProps> = ({ modelUrl, isRendered, setIsRendered, autoRotate = false }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [renderer, setRenderer] = useState<THREE.WebGLRenderer>();
    const [scene, setScene] = useState<THREE.Scene>();
    const [camera, setCamera] = useState<THREE.PerspectiveCamera>();
    const [controls, setControls] = useState<OrbitControls>();

    const app = global.app as EngineRuntime;

    useLayoutEffect(() => {
        if (wrapperRef.current && !isRendered) {
            const renderer = new THREE.WebGLRenderer({
                antialias: true,
                preserveDrawingBuffer: true,
            });
            const scene = new THREE.Scene();
            scene.name = "ModelViewerScene";
            scene.background = new THREE.Color(0x27272a);
            const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 1000);
            const controls = new OrbitControls(camera, renderer.domElement);
            setIsRendered(true);
            setRenderer(renderer);
            setCamera(camera);
            setControls(controls);
            setScene(scene);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(wrapperRef.current.offsetWidth || 100, wrapperRef.current.offsetHeight || 100);
            wrapperRef.current.appendChild(renderer.domElement);
        }

        return () => {
            if (renderer) {
                renderer.dispose();
            }
        };
    }, [wrapperRef.current, isRendered]);

    useEffect(() => {
        if (camera && scene && controls && renderer) {
            const loader = new (ModelLoader as any)(app);
            const type = modelUrl.split(".").pop()?.split(" ")[0]?.split("?")[0]?.toLowerCase();

            loader
                .load(
                    modelUrl,
                    { Type: type || "glb" },
                    {
                        camera: app.editor?.camera,
                        renderer: app.editor?.renderer,
                        audioListener: app.editor?.audioListener,
                    },
                )
                .then((object: any) => {
                    if (!object) return;
                    const model = object;
                    scene.clear();
                    scene.add(model);
                    // Models generated with meshy need stronger light, otherwise they appear black
                    if (modelUrl.includes("meshy.ai")) {
                        const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
                        directionalLight.shadow.bias = 0;
                        directionalLight.shadow.normalBias = 0.1;
                        directionalLight.position.set(10, 10, 10);
                        scene.add(directionalLight);

                        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222222, 3);
                        scene.add(hemiLight);

                        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
                        scene.add(ambientLight);
                    } else {
                        const light = new THREE.AmbientLight();
                        light.intensity = 5;
                        scene.add(light);
                    }

                    const box = new THREE.Box3().setFromObject(model);
                    const size = box.getSize(new THREE.Vector3());
                    const center = box.getCenter(new THREE.Vector3());

                    // Calculate the appropriate distance for the camera
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const fov = camera.fov * (Math.PI / 180);
                    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
                    cameraZ *= 1.5; // Add some margin

                    camera.position.set(center.x, center.y, cameraZ);
                    camera.lookAt(center);

                    controls.target.set(center.x, center.y, center.z);
                    controls.update();

                    const animate = () => {
                        requestAnimationFrame(animate);
                        if (autoRotate && model) {
                            model.rotation.y += 0.015;
                        }
                        renderer.render(scene, camera);
                        controls.update();
                    };

                    animate();
                })
                .catch((error: any) => {
                    console.error(error);
                });
        }
    }, [camera, scene, controls, renderer, modelUrl, autoRotate]);

    return <Wrapper ref={wrapperRef} />;
};
