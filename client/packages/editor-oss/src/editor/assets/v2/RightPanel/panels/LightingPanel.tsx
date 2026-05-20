import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { useLightingContext } from "@stem/editor-oss/context";
import global from "@stem/editor-oss/global";
import { ILightState } from "@stem/editor-oss/types/editor";
import { isTemplateScene } from "@stem/editor-oss/utils/isTemplateScene";
import { isExtendedDirectionalLight } from "@stem/editor-oss/utils/LightUtils";
import { LightingSection } from "../sections/LightingSection";

const LightingPanel = () => {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const { colorChangeActivated, skyColorChangeActivated, groundColorChangeActivated, lightState, setLightState } =
        useLightingContext();
    const [isLocked, setIsLocked] = useState(false);
    const [selectedObj, setSelectedObj] = useState<any>(null);
    const app = (global as any).app;
    const editor = app.editor;

    useEffect(() => {
        handleLightUpdate();
        app.on(`objectSelected.LightingPanel`, handleLightUpdate);
        app.on(`objectChanged.LightingPanel`, handleLightUpdate);

        return () => {
            app.on(`objectSelected.LightingPanel`, null);
            app.on(`objectChanged.LightingPanel`, null);
        };
    }, []);

    const handleLightUpdate = () => {
        setIsLocked(editor.sceneLockedItems?.includes(editor.selected?.uuid));

        const selected = editor.selected;
        if (!selected || !selected.isLight) return;

        setSelectedObj(selected);
        const selectedShadowCameraWidth = selected.shadow?.camera?.right - selected.shadow?.camera?.left;
        const selectedShadowCameraHeight = selected.shadow?.camera?.top - selected.shadow?.camera?.bottom;
        const selectedShadowMapSize = selected.shadow?.mapSize?.width;
        const selectedShadowRadius = selected.shadow?.radius;
        const selectedShadowBlurSamples = selected.shadow?.blurSamples;
        const selectedShadowBias = selected.shadow?.bias;
        const selectedShadowNormalBias = selected.shadow?.normalBias;
        const selectedShadowCameraNear = selected.shadow?.camera?.near;
        const selectedShadowCameraFar = selected.shadow?.camera.far;

        let newState: ILightState = {
            show: true,
            showIntensity: true,
            intensity: selected.intensity,
            showCastShadow: true,
            castShadow: false,
            showColor: false,
            showDistance: false,
            showDecay: false,
            showSkyColor: false,
            showGroundColor: false,
            showAngle: false,
            showPenumbra: false,
            showWidth: false,
            showHeight: false,
            showTarget: false,
            showUnityStyle: false,
            target: undefined,
            shadowMapSize: undefined,
            shadowCameraWidth: undefined,
            shadowCameraHeight: undefined,
            shadowRadius: undefined,
            shadowBlurSamples: undefined,
            shadowNormalBias: undefined,
            shadowBias: undefined,
            shadowFocus: undefined,
            shadowCameraNear: undefined,
            shadowCameraFar: undefined,
            showShadowParams: false,
            isUnityStyle: undefined,
        };

        if (selected.castShadow) {
            newState.shadowMapSize = selectedShadowMapSize;
            newState.shadowCameraNear = selectedShadowCameraNear;
            newState.shadowCameraFar = selectedShadowCameraFar;
            newState.shadowBias = selectedShadowBias;
            newState.shadowNormalBias = selectedShadowNormalBias;
            const shadowMapType = app.editor?.rendering.shadowMapType;
            if (shadowMapType === THREE.PCFShadowMap || shadowMapType === THREE.VSMShadowMap) {
                newState.shadowRadius = selectedShadowRadius;
            }
            if (shadowMapType === THREE.VSMShadowMap && typeof selected.shadow.blurSamples === "number") {
                newState.shadowBlurSamples = selectedShadowBlurSamples;
            }
        }

        if (selected instanceof THREE.AmbientLight) {
            newState.label = "Ambient Light";
            newState.showColor = true;
            newState.color = `#${selected.color?.getHexString()}`;
            newState.castShadow = false;
            newState.showCastShadow = false;
            newState.showShadowParams = false;
        }

        if (selected instanceof THREE.DirectionalLight) {
            newState.label = "Directional Light";
            newState.showColor = true;
            newState.color = `#${selected.color?.getHexString()}`;
            newState.showCastShadow = true;
            newState.castShadow = selected.castShadow;
            newState.showShadowParams = !!selected.castShadow;
            if (selected.castShadow) {
                newState.shadowCameraWidth = selectedShadowCameraWidth;
                newState.shadowCameraHeight = selectedShadowCameraHeight;
            }

            if (isExtendedDirectionalLight(selected)) {
                newState.showUnityStyle = true;
                newState.isUnityStyle = selected.isUnityStyle;
            }
        }

        if (selected instanceof THREE.HemisphereLight) {
            newState.showColor = false;
            newState.label = "Hemisphere Light";
            newState.showSkyColor = true;
            newState.showGroundColor = true;
            newState.skyColor = `#${selected.color?.getHexString()}`;
            newState.groundColor = `#${selected.groundColor?.getHexString()}`;
            newState.castShadow = false;
            newState.showCastShadow = false;
            newState.showShadowParams = false;
        }

        if (selected instanceof THREE.PointLight || selected instanceof THREE.SpotLight) {
            newState.label = selected instanceof THREE.PointLight ? "Point Light" : "Spot Light";
            newState.showColor = true;
            newState.color = `#${selected.color?.getHexString()}`;
            newState.showDistance = true;
            newState.distance = selected.distance;
            newState.showDecay = true;
            newState.decay = selected.decay;
            newState.showCastShadow = true;
            newState.castShadow = selected.castShadow;
            newState.startOnTrigger = selected.userData.startOnTrigger;
        }

        if (selected instanceof THREE.PointLight) {
            newState.showShadowParams = !!selected.castShadow;
            if (selected.castShadow) {
                newState.shadowMapSize = selectedShadowMapSize;
                const shadowMapType = app.editor?.rendering.shadowMapType;
                if (shadowMapType === THREE.PCFShadowMap && shadowMapType === THREE.VSMShadowMap) {
                    newState.shadowRadius = selectedShadowRadius;
                }
                if (shadowMapType === THREE.VSMShadowMap && typeof selected.shadow.blurSamples === "number") {
                    newState.shadowBlurSamples = selectedShadowBlurSamples;
                }
            }
        }

        if (selected instanceof THREE.SpotLight) {
            newState.showAngle = true;
            newState.angle = selected.angle;
            newState.showPenumbra = true;
            newState.penumbra = selected.penumbra;
            newState.showCastShadow = true;
            newState.castShadow = selected.castShadow;
            newState.showTarget = true;
            newState.target = selected.target;
            newState.showShadowParams = !!selected.castShadow;
            if (selected.castShadow) {
                newState.shadowMapSize = selectedShadowMapSize;
                const shadowMapType = app.editor?.rendering.shadowMapType;
                if (shadowMapType === THREE.PCFShadowMap && shadowMapType === THREE.VSMShadowMap) {
                    newState.shadowRadius = selectedShadowRadius;
                }
                if (shadowMapType === THREE.VSMShadowMap && typeof selected.shadow.blurSamples === "number") {
                    newState.shadowBlurSamples = selectedShadowBlurSamples;
                }
            }
        }

        if (selected instanceof THREE.RectAreaLight) {
            newState.label = "Rect Area Light";
            newState.showColor = true;
            newState.color = `#${selected.color?.getHexString()}`;
            newState.showWidth = true;
            newState.width = selected.width;
            newState.showHeight = true;
            newState.height = selected.height;
            newState.castShadow = false;
            newState.showCastShadow = false;
            newState.showShadowParams = false;
        }

        setLightState(prevState => ({
            ...prevState,
            ...newState,
        }));
    };

    useEffect(() => {
        if (colorChangeActivated || skyColorChangeActivated || groundColorChangeActivated) {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }
    }, [colorChangeActivated, skyColorChangeActivated, groundColorChangeActivated]);

    const isTemplate = isTemplateScene(editor?.sceneID);

    return lightState.show ?
        <LightingSection lightState={lightState}
            isLocked={isTemplate || isLocked}
            selectedObj={selectedObj}
        />
     : null;
};

export default LightingPanel;
