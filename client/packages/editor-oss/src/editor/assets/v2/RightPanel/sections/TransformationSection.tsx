import {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import * as THREE from "three";

import {SetPositionCommand} from "@stem/editor-oss/command/SetPositionCommand.js";
import {SetRotationCommand} from "@stem/editor-oss/command/SetRotationCommand.js";
import {SetScaleCommand} from "@stem/editor-oss/command/SetScaleCommand.js";
import global from "@stem/editor-oss/global";
import {isAabbMode} from "@stem/editor-oss/helper/boundingBoxMode";
import {convertFromMetersDisplay, convertToMetersDisplay, getActiveDisplayUnit} from "@stem/editor-oss/helper/displayUnits";
import {computeOrientedBox} from "@stem/editor-oss/helper/orientedBox";
import {useAngleUnits} from "@stem/editor-oss/hooks/useAngleUnits";
import {useUnits} from "@stem/editor-oss/hooks/useUnits";
import {isGaussianSplatObject} from "@stem/editor-oss/model/gaussianSplats";
import {ITransformValue, TRANSFORMATION_OPTIONS} from "@stem/editor-oss/types/editor";
import {MovementSection} from "../../common/MovementSection/MovementSection";
import {basePlaneY} from "../../LeftPanel/MainTabs/AssetsTab/SubTabs/primitivesHelpers";
import {roundNumber} from "../../utils/roundNumber";

interface Props {
    isLocked?: boolean;
    justPosition?: boolean;
    customObj?: THREE.Object3D;
    emitterUpdate?: boolean;
}

const roundTransformValue = (value: ITransformValue, precision = 4): ITransformValue => ({
    x: roundNumber(value.x, precision),
    y: roundNumber(value.y, precision),
    z: roundNumber(value.z, precision),
});

const GAUSSIAN_SPLAT_SIZE_VALUE: ITransformValue = {
    x: 0,
    y: 0,
    z: 0,
};

const getObjectSize = (object: THREE.Object3D): ITransformValue => {
    const meshObject = object as THREE.Mesh;
    const sizeVec = new THREE.Vector3();

    if (isAabbMode()) {
        new THREE.Box3().setFromObject(object).getSize(sizeVec);
    } else {
        const obb = computeOrientedBox(object);
        if (obb.hasGeometry && !obb.box.isEmpty()) {
            obb.box.getSize(sizeVec);
        } else {
            new THREE.Box3().setFromObject(object).getSize(sizeVec);
        }
    }

    if (object.type === "Mesh" && meshObject.geometry?.type === "PlaneGeometry") {
        sizeVec.y = basePlaneY * object.scale.y;
    }

    return {
        x: Math.abs(sizeVec.x),
        y: Math.abs(sizeVec.y),
        z: Math.abs(sizeVec.z),
    };
};

export const TransformationSection = ({isLocked, justPosition, customObj, emitterUpdate}: Props) => {
    const app = (global as any).app;
    const editor = app?.editor;
    const selected = customObj || editor?.selected;
    const {currentUnit, convertFromRadians, convertToRadians} = useAngleUnits();
    const {unitsSettings} = useUnits();
    const [positionValue, setPositionValue] = useState<ITransformValue>({
        x: 0,
        y: 0,
        z: 0,
    });
    const [rotationValue, setRotationValue] = useState<ITransformValue>({
        x: 0,
        y: 0,
        z: 0,
    });
    const [sizeValue, setSizeValue] = useState<ITransformValue>({
        x: 0,
        y: 0,
        z: 0,
    });
    const [scaleValue, setScaleValue] = useState<ITransformValue>({
        x: 0,
        y: 0,
        z: 0,
    });
    const [scaleLocked, setScaleLocked] = useState(true);
    const [labelEdit, setLabelEdit] = useState<
        | null
        | {
              axis: "x" | "y" | "z";
              value: number;
              clientX: number;
              clientY: number;
              label?: THREE.Sprite;
          }
    >(null);
    const [labelEditValue, setLabelEditValue] = useState("");
    const labelInputRef = useRef<HTMLInputElement>(null);
    const labelOverlayRef = useRef<HTMLDivElement>(null);

    const getSelectedObject = () => {
        const selectedObj = customObj ? app?.editor?.objectByUuid(customObj.uuid) : editor?.selected;
        return !selectedObj || Array.isArray(selectedObj) ? null : selectedObj;
    };

    const updateTransformationValues = () => {
        const selectedObj = getSelectedObject();
        if (!selectedObj) return;

        const currentSize = isGaussianSplatObject(selectedObj)
            ? GAUSSIAN_SPLAT_SIZE_VALUE
            : getObjectSize(selectedObj);
        const objectScale: ITransformValue = {
            x: selectedObj.scale.x,
            y: selectedObj.scale.y,
            z: selectedObj.scale.z,
        };

        setScaleValue(roundTransformValue(objectScale));
        setSizeValue(roundTransformValue(currentSize));

        setPositionValue({
            x: roundNumber(selectedObj.position.x, 4),
            y: roundNumber(selectedObj.position.y, 4),
            z: roundNumber(selectedObj.position.z, 4),
        });

        setRotationValue({
            x: roundNumber(convertFromRadians(selectedObj.rotation._x), currentUnit === "radians" ? 4 : 2),
            y: roundNumber(convertFromRadians(selectedObj.rotation._y), currentUnit === "radians" ? 4 : 2),
            z: roundNumber(convertFromRadians(selectedObj.rotation._z), currentUnit === "radians" ? 4 : 2),
        });
    };

    useEffect(() => {
        updateTransformationValues();
    }, [customObj, currentUnit]);

    useEffect(() => {
        if (!app) return;
        updateTransformationValues();
        app.on("objectChanged.TransformationSection", updateTransformationValues);
        app.on("objectSelected.TransformationSection", updateTransformationValues);
        app.on("boundingBoxModeChanged.TransformationSection", updateTransformationValues);
        return () => {
            app.on("objectChanged.TransformationSection", null);
            app.on("objectSelected.TransformationSection", null);
            app.on("boundingBoxModeChanged.TransformationSection", null);
        };
    }, [app, selected, currentUnit]);

    const getSetValueFunc = (type: TRANSFORMATION_OPTIONS, value: number, toUpdate: "x" | "y" | "z") => {
        const selectedObj = getSelectedObject();
        if (!selectedObj) return;

        if (emitterUpdate) {
            app.call("emitterUpdate");
        }

        if (type === TRANSFORMATION_OPTIONS.SCALE) {
            // Displayed scale is the raw object.scale, so the input value
            // is the new world scale on that axis. Read live scale to keep
            // drag updates frame-accurate.
            const currentObjectScale = selectedObj.scale;
            const oldAxis = currentObjectScale[toUpdate];
            const nextObjectScale = new THREE.Vector3();

            if (scaleLocked) {
                if (oldAxis === 0) return;
                const ratio = value / oldAxis;
                if (ratio === 0 || !Number.isFinite(ratio)) return;
                nextObjectScale.set(
                    currentObjectScale.x * ratio,
                    currentObjectScale.y * ratio,
                    currentObjectScale.z * ratio,
                );
            } else {
                nextObjectScale.copy(currentObjectScale);
                nextObjectScale[toUpdate] = value;
            }

            app.editor.execute(new SetScaleCommand(selectedObj, nextObjectScale));
            return;
        }

        if (type === TRANSFORMATION_OPTIONS.SIZE) {
            if (isGaussianSplatObject(selectedObj)) {
                return;
            }

            // Size on the input is the OBB world size on the chosen axis.
            // Read the current size live from the object so realtime drag
            // ticks compute the ratio from the up-to-date size, not from
            // possibly-stale React state.
            const liveSize = getObjectSize(selectedObj);
            const oldAxisSize = liveSize[toUpdate];
            if (oldAxisSize === 0) return;
            const ratio = value / oldAxisSize;
            if (ratio === 0 || !Number.isFinite(ratio)) return;

            const currentObjectScale = selectedObj.scale;
            const nextObjectScale = scaleLocked
                ? new THREE.Vector3(
                      currentObjectScale.x * ratio,
                      currentObjectScale.y * ratio,
                      currentObjectScale.z * ratio,
                  )
                : new THREE.Vector3(
                      toUpdate === "x" ? currentObjectScale.x * ratio : currentObjectScale.x,
                      toUpdate === "y" ? currentObjectScale.y * ratio : currentObjectScale.y,
                      toUpdate === "z" ? currentObjectScale.z * ratio : currentObjectScale.z,
                  );

            app.editor.execute(new SetScaleCommand(selectedObj, nextObjectScale));
            return;
        }

        if (type === TRANSFORMATION_OPTIONS.POSITION) {
            const livePos = selectedObj.position;
            const next = new THREE.Vector3(livePos.x, livePos.y, livePos.z);
            next[toUpdate] = +value;
            editor.execute(new SetPositionCommand(selectedObj, next));
            return setPositionValue(prevState => ({...prevState, [toUpdate]: value}));
        }

        if (type === TRANSFORMATION_OPTIONS.ROTATION) {
            const liveRot = selectedObj.rotation;
            const eulerArgs: [number, number, number] = [liveRot.x, liveRot.y, liveRot.z];
            const axisIndex = toUpdate === "x" ? 0 : toUpdate === "y" ? 1 : 2;
            eulerArgs[axisIndex] = +convertToRadians(value);
            editor.execute(
                new SetRotationCommand(
                    selectedObj,
                    new THREE.Euler(eulerArgs[0], eulerArgs[1], eulerArgs[2]),
                ),
            );
            return setRotationValue(prevState => ({...prevState, [toUpdate]: value}));
        }
    };

    useEffect(() => {
        if (!app) return;
        const handler = (
            _helper: unknown,
            payload: {
                axis: "x" | "y" | "z";
                value: number;
                clientX: number;
                clientY: number;
                label?: THREE.Sprite;
            },
        ) => {
            if (!payload?.axis) return;
            setLabelEdit(payload);
            setLabelEditValue(String(roundNumber(convertFromMetersDisplay(payload.value), 4)));
        };
        app.on("obbLabelEdit.TransformationSection", handler);
        return () => {
            app.on("obbLabelEdit.TransformationSection", null);
        };
    }, [app]);

    // Hide the 3D label sprite while editing so the input takes its place.
    useEffect(() => {
        const label = labelEdit?.label as any;
        if (!label?.material) return;
        const prevOpacity = label.material.opacity;
        const prevVisible = label.visible;
        label.visible = false;
        return () => {
            label.visible = prevVisible;
            label.material.opacity = prevOpacity;
        };
    }, [labelEdit]);

    // If the unit setting changes while the editor is open, refresh the
    // displayed value in the current unit (value.internal is in meters).
    useEffect(() => {
        if (!labelEdit) return;
        setLabelEditValue(String(roundNumber(convertFromMetersDisplay(labelEdit.value), 4)));
    }, [unitsSettings?.enabled, unitsSettings?.currentUnit, labelEdit]);

    // Track the label's projected screen rect every frame while editing.
    // Uses direct DOM mutation to avoid per-frame React re-renders that
    // would fight the controlled input and kill focus/typing.
    useEffect(() => {
        if (!labelEdit?.label) return;
        const label = labelEdit.label as any;
        const canvas: HTMLCanvasElement | undefined = app?.editor?.renderer?.domElement;
        const camera: THREE.Camera | undefined = app?.editor?.camera;
        if (!canvas || !camera) return;

        let rafId = 0;
        const vec = new THREE.Vector3();
        const update = () => {
            const node = labelOverlayRef.current;
            const inputEl = labelInputRef.current;
            if (node) {
                const rect = canvas.getBoundingClientRect();
                label.getWorldPosition(vec);
                vec.project(camera);
                const left = rect.left + (vec.x * 0.5 + 0.5) * rect.width;
                const top = rect.top + (-vec.y * 0.5 + 0.5) * rect.height;
                const proj = (camera as any).projectionMatrix?.elements;
                let widthPx = 80;
                let heightPx = 22;
                if (proj && label.scale) {
                    const halfNdcX = Math.abs(proj[0]) * label.scale.x * 0.5;
                    const halfNdcY = Math.abs(proj[5]) * label.scale.y * 0.5;
                    widthPx = Math.max(60, halfNdcX * rect.width * 2);
                    heightPx = Math.max(18, halfNdcY * rect.height * 2);
                }
                node.style.left = `${left}px`;
                node.style.top = `${top}px`;
                node.style.height = `${heightPx}px`;
                if (inputEl) {
                    inputEl.style.width = `${Math.max(50, widthPx - 24)}px`;
                }
            }
            rafId = window.requestAnimationFrame(update);
        };
        rafId = window.requestAnimationFrame(update);
        return () => window.cancelAnimationFrame(rafId);
    }, [labelEdit, app]);

    useEffect(() => {
        if (!labelEdit) return;
        const focusInput = () => {
            if (!labelInputRef.current) return;
            labelInputRef.current.focus();
            labelInputRef.current.select();
        };

        // Defer focus across the pointer up/click cycle to avoid instant blur.
        const timeoutId = window.setTimeout(focusInput, 0);
        const rafId = window.requestAnimationFrame(focusInput);
        return () => {
            window.clearTimeout(timeoutId);
            window.cancelAnimationFrame(rafId);
        };
    }, [labelEdit]);

    const closeLabelEdit = () => {
        setLabelEdit(null);
        setLabelEditValue("");
    };

    const commitLabelEdit = () => {
        if (!labelEdit) {
            closeLabelEdit();
            return;
        }
        const next = parseFloat(labelEditValue);
        if (Number.isFinite(next) && next > 0) {
            const nextMeters = convertToMetersDisplay(next);
            getSetValueFunc(TRANSFORMATION_OPTIONS.SIZE, nextMeters, labelEdit.axis);
        }
        closeLabelEdit();
    };

    const labelEditOverlay = labelEdit
        ? createPortal(
              <div
                  ref={labelOverlayRef}
                  style={{
                      position: "fixed",
                      left: labelEdit.clientX,
                      top: labelEdit.clientY,
                      transform: "translate(-50%, -50%)",
                      zIndex: 100001,
                      background: "rgba(20,20,20,0.95)",
                      border: "1px solid #555",
                      borderRadius: 4,
                      padding: "2px 4px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: "#fff",
                      font: "12px sans-serif",
                  }}
                  onMouseDown={e => e.stopPropagation()}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => e.stopPropagation()}
              >
                  <span style={{opacity: 0.7, fontSize: 10}}>{labelEdit.axis.toUpperCase()}</span>
                  <input
                      ref={labelInputRef}
                      autoFocus
                      type="number"
                      step="any"
                      value={labelEditValue}
                      onPointerDown={e => {
                          e.stopPropagation();
                          labelInputRef.current?.focus();
                      }}
                      onMouseDown={e => {
                          e.stopPropagation();
                          labelInputRef.current?.focus();
                      }}
                      onChange={e => setLabelEditValue(e.target.value)}
                      onInput={e => setLabelEditValue((e.target as HTMLInputElement).value)}
                      onKeyDown={e => {
                          e.stopPropagation();
                          if (e.key === "Enter") commitLabelEdit();
                          else if (e.key === "Escape") closeLabelEdit();
                      }}
                      onKeyUp={e => e.stopPropagation()}
                      onKeyPress={e => e.stopPropagation()}
                      style={{
                          width: 80,
                          background: "#111",
                          color: "#fff",
                          border: "1px solid #444",
                          borderRadius: 3,
                          padding: "1px 3px",
                          outline: "none",
                          caretColor: "#fff",
                          font: "inherit",
                      }}
                  />
                  {getActiveDisplayUnit().label && (
                      <span style={{opacity: 0.7, fontSize: 10}}>{getActiveDisplayUnit().label}</span>
                  )}
              </div>,
              document.body,
          )
        : null;

    return (
        <>
            <MovementSection
                isLocked={isLocked}
                scaleLocked={scaleLocked}
                setScaleLocked={setScaleLocked}
                positionValue={positionValue}
                rotationValue={justPosition ? undefined : rotationValue}
                scaleValue={justPosition ? undefined : scaleValue}
                sizeValue={justPosition ? undefined : sizeValue}
                noScale={!!justPosition}
                noSize={!!justPosition}
                noRotation={!!justPosition}
                getSetValueFunc={getSetValueFunc}
                setRotationValue={setRotationValue}
                setScaleValue={setScaleValue}
                setSizeValue={setSizeValue}
            />
            {labelEditOverlay}
        </>
    );
};
