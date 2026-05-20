/**
 * Module: Timeline.tsx
 * Purpose: Contains logic for timeline.
 */

import classNames from "classnames";
import I18n from "i18next";
import React, {useCallback, useLayoutEffect, useMemo, useRef, useState} from "react";

import {IconButton} from "../form/v2";
import "./css/Timeline.css";
import settingsIcon from "./icons/settings-icon.svg";

import {useOnClickOutside} from "usehooks-ts";

// Memoized layer info component to prevent re-renders
interface LayerInfoProps {
    layer: any;
    isSelected: boolean;
    isEditing: boolean;
    editedLayerName: string;
    selectedLayerToDelete: string | null;
    layerMenuRef: React.RefObject<HTMLDivElement | null>;
    onDoubleClick: (name: string, uuid: string) => void;
    onClick: (uuid: string) => void;
    onContextMenu: (uuid: string) => void;
    onDelete: (uuid: string) => void;
    onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onEditBlur: () => void;
}

const LayerInfo = React.memo(({
    layer,
    isSelected,
    isEditing,
    editedLayerName,
    selectedLayerToDelete,
    layerMenuRef,
    onDoubleClick,
    onClick,
    onContextMenu,
    onDelete,
    onNameChange,
    onEditBlur,
}: LayerInfoProps) => {
    const handleDoubleClick = useCallback(() => {
        onDoubleClick(layer.layerName, layer.uuid);
    }, [layer.layerName, layer.uuid, onDoubleClick]);

    const handleClick = useCallback(() => {
        onClick(layer.uuid);
    }, [layer.uuid, onClick]);

    const handleContextMenu = useCallback(() => {
        onContextMenu(layer.uuid);
    }, [layer.uuid, onContextMenu]);

    const handleDelete = useCallback(() => {
        onDelete(layer.uuid);
    }, [layer.uuid, onDelete]);

    return (
        <div
            className={classNames("info", isSelected ? "active" : "")}
            onDoubleClick={handleDoubleClick}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
        >
            {isEditing ? 
                <input
                    className="layer-name-edit"
                    type="text"
                    value={editedLayerName}
                    onChange={onNameChange}
                    onBlur={onEditBlur}
                />
             : 
                <>{layer.layerName}</>
            }
            {selectedLayerToDelete === layer.uuid && 
                <div ref={layerMenuRef}
                    className={classNames("layer-menu")}
                >
                    <span onClick={handleDelete}>Delete</span>
                </div>
            }
        </div>
    );
});

// Memoized animation item component
interface AnimationItemProps {
    animation: any;
    layerUuid: string;
    isSelected: boolean;
    scale: number;
    onClick: (event: any) => void;
    onDragStart: (event: any) => void;
    onDragEnd: (event: any) => void;
}

const AnimationItem = React.memo(({
    animation,
    layerUuid,
    isSelected,
    scale,
    onClick,
    onDragStart,
    onDragEnd,
}: AnimationItemProps) => {
    const style = useMemo(() => ({
        left: animation.beginTime * scale + "px",
        width: (animation.endTime - animation.beginTime) * scale + "px",
    }), [animation.beginTime, animation.endTime, scale]);

    return (
        <div
            className={classNames("animation", isSelected && "selected")}
            title={animation.name}
            draggable="true"
            data-type="animation"
            data-id={animation.uuid}
            data-pid={layerUuid}
            style={style}
            onClick={onClick}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            {animation.name}
        </div>
    );
});

// Memoized layer row component
interface LayerRowProps {
    layer: any;
    isSelected: boolean;
    selectedAnimation: any;
    scale: number;
    onDoubleClick: (event: any) => void;
    onDragEnter: (event: any) => void;
    onDragOver: (event: any) => void;
    onDragLeave: (event: any) => void;
    onDrop: (event: any) => void;
    onLayerClick: (uuid: string | null) => void;
    onAnimationClick: (event: any) => void;
    onAnimationDragStart: (event: any) => void;
    onAnimationDragEnd: (event: any) => void;
}

const LayerRow = React.memo(({
    layer,
    isSelected,
    selectedAnimation,
    scale,
    onDoubleClick,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    onLayerClick,
    onAnimationClick,
    onAnimationDragStart,
    onAnimationDragEnd,
}: LayerRowProps) => {
    const handleClick = useCallback(() => {
        onLayerClick(isSelected ? null : layer.uuid);
    }, [isSelected, layer.uuid, onLayerClick]);

    return (
        <div
            className={classNames("layer", isSelected ? "active" : "")}
            data-type="layer"
            data-id={layer.uuid}
            onDoubleClick={onDoubleClick}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={handleClick}
        >
            {layer.animations.map((animation: any) => 
                <AnimationItem
                    key={animation.uuid}
                    animation={animation}
                    layerUuid={layer.uuid}
                    isSelected={selectedAnimation === animation.uuid}
                    scale={scale}
                    onClick={onAnimationClick}
                    onDragStart={onAnimationDragStart}
                    onDragEnd={onAnimationDragEnd}
                />,
            )}
        </div>
    );
});

type Props = {
    className: string;
    animations: any;
    selectedLayer: any;
    selected: any;
    onAddLayer: () => void;
    onEditLayer: (selectedLayer: any, name: string) => void;
    onDeleteLayer: (selectedLayer: any) => void;
    onSelectedLayerChange: (value: any) => void;
    onAddAnimation: (layerID: any, beginTime: any, endTime: any) => void;
    onDropAnimation: (id: any, oldLayerID: any, newLayerID: any, beginTime: any) => void;
    onClickAnimation: (id: any, pid: any) => void;
    style?: React.CSSProperties;
    onStartPlay: () => void;
    onStopPlay: () => void;
    onPausePlay: () => void;
};

const TimelineComponent = ({
    className,
    animations,
    selectedLayer,
    selected,
    onAddLayer,
    onAddAnimation,
    onClickAnimation,
    onDeleteLayer,
    onDropAnimation,
    onEditLayer,
    onSelectedLayerChange,
    style,
    onStartPlay,
    onStopPlay,
    onPausePlay,
}: Props) => {
    const [opened, setOpened] = useState(false);
    const [editedLayer, setEditedLayer] = useState<string | null>(null);
    const [editedLayerName, setEditedLayerName] = useState("");
    const [selectedLayerToDelete, setSelectedLayerToDelete] = useState<string | null>(null);

    const duration = 120;
    const scale = 30;
    const time = 0;
    const speed = 16;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const layersRef = useRef(null);
    const leftRef = useRef<HTMLDivElement>(null);
    const rightRef = useRef<HTMLDivElement>(null);
    const sliderRef = useRef<HTMLDivElement>(null);
    const layerMenuRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(layerMenuRef as React.RefObject<HTMLElement>, () => setSelectedLayerToDelete(null));

    const renderTimeline = () => {
        const width = duration * scale;
        const scale5 = scale / 5;
        const margin = 0;

        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.style.width = width + margin * 2 + "px";
        canvas.width = canvas.clientWidth;
        canvas.height = 28;

        const context = canvas.getContext("2d");

        if (!context) return;

        context.fillStyle = "var(--theme-grey-bg-tertiary)";
        context.fillRect(0, 0, canvas.width, canvas.height);

        /*context.strokeStyle = "#555";
    context.beginPath();

    for (let i = margin; i <= width + margin; i += scale) {

      for (let j = 0; j < 5; j++) {

        if (j === 0) {

          context.moveTo(i + scale5 * j, 22);
          context.lineTo(i + scale5 * j, 30);
        } else {

          context.moveTo(i + scale5 * j, 26);
          context.lineTo(i + scale5 * j, 30);
        }
      }
    }

    context.stroke();*/

        context.font = "14px Roboto";
        context.fillStyle = "var(--theme-font-unselected-color)";

        for (let i = 0; i <= duration; i += 2) {

            let minute = Math.floor(i / 60);
            let second = Math.floor(i % 60);

            let text = (minute > 0 ? minute + ":" : "") + `${second}`.slice(-2);

            if (i === 0) {
                context.textAlign = "left";
            } else if (i === duration) {
                context.textAlign = "right";
            } else {
                context.textAlign = "center";
            }

            context.fillText(text, margin + i * scale, 18);
        }
    };

    const handleAddLayer = useCallback(() => {
        onAddLayer && onAddLayer();
    }, [onAddLayer]);

    const handleEditLayer = useCallback(() => {
        onEditLayer && onEditLayer(editedLayer, editedLayerName);
        setEditedLayer(null);
        setEditedLayerName("");
    }, [editedLayer, editedLayerName, onEditLayer]);

    const onLayerDoubleClick = useCallback((name: string, layer: any) => {
        setEditedLayerName(name);
        setEditedLayer(layer);
    }, []);

    const handleDeleteLayer = useCallback((id: any) => {
        onDeleteLayer && onDeleteLayer(id);
        setSelectedLayerToDelete(null);
    }, [onDeleteLayer]);

    const handleSelectedLayerChange = useCallback((value: any) => {
        onSelectedLayerChange(value);
    }, [onSelectedLayerChange]);

    const toggleOpened = useCallback(() => {
        setOpened(prevState => !prevState);
    }, []);

    const handleLayerContextMenu = useCallback((uuid: string) => {
        setSelectedLayerToDelete(uuid);
    }, []);

    const handleLayerNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedLayerName(e.target.value);
    }, []);

    const handleClick = useCallback((event: any) => {
        const type = event.target.getAttribute("data-type");

        if (type !== "animation") {
            return;
        }

        const pid = event.target.getAttribute("data-pid");
        const id = event.target.getAttribute("data-id");

        onClickAnimation && onClickAnimation(id, pid);
    }, [onClickAnimation]);

    const handleDoubleClick = useCallback((event: any) => {
        const type = event.target.getAttribute("data-type");

        if (type !== "layer") {
            return;
        }

        const layerID = event.target.getAttribute("data-id");

        const beginTime = event.nativeEvent.offsetX / scale;
        const endTime = beginTime + 2;

        onAddAnimation && onAddAnimation(layerID, beginTime, endTime);
    }, [onAddAnimation, scale]);

    const handleRightScroll = useCallback((event: any) => {
        let left = leftRef.current;
        let canvas = canvasRef.current;

        if (!left || !canvas) {
            return;
        }

        left.scrollTop = event.target.scrollTop;
        canvas.style.left = `${100 - event.target.scrollLeft}px`;
    }, []);

    const handleDragStart = useCallback((event: any) => {
        const type = event.target.getAttribute("data-type");

        if (type !== "animation") {
            return;
        }

        const id = event.target.getAttribute("data-id");
        const pid = event.target.getAttribute("data-pid");

        event.nativeEvent.dataTransfer.setData("id", id);
        event.nativeEvent.dataTransfer.setData("pid", pid);
        event.nativeEvent.dataTransfer.setData("offsetX", event.nativeEvent.offsetX);
    }, []);

    const handleDragEnd = useCallback((event: any) => {
        event.nativeEvent.dataTransfer.clearData();
    }, []);

    const handleDragEnter = useCallback((event: any) => {
        event.preventDefault();
    }, []);

    const handleDragOver = useCallback((event: any) => {
        event.preventDefault();
    }, []);

    const handleDragLeave = useCallback((event: any) => {
        event.preventDefault();
    }, []);

    const handleDrop = useCallback((event: any) => {
        const type = event.target.getAttribute("data-type");

        if (type !== "layer") {
            return;
        }

        const id = event.nativeEvent.dataTransfer.getData("id");
        const oldLayerID = event.nativeEvent.dataTransfer.getData("pid");
        const offsetX = event.nativeEvent.dataTransfer.getData("offsetX");

        const newLayerID = event.target.getAttribute("data-id");

        const beginTime = (event.nativeEvent.offsetX - offsetX) / scale;

        onDropAnimation && onDropAnimation(id, oldLayerID, newLayerID, beginTime);
    }, [onDropAnimation, scale]);

    const handlePlay = useCallback(() => {
        onStartPlay();
    }, [onStartPlay]);

    const handlePause = useCallback(() => {
        onPausePlay();
    }, [onPausePlay]);

    const handleStop = useCallback(() => {
        onStopPlay();
    }, [onStopPlay]);

    useLayoutEffect(() => {
        renderTimeline();
    }, []);

    return (
        <div className={classNames("TimelineV2", className, opened ? "opened" : "")}
            style={style}
        >
            <div className="timeline-button"
                onClick={toggleOpened}
            >
                <img src={settingsIcon}
                    alt="settings"
                />
            </div>
            <div className={classNames("controls", className)}
                style={style}
            >
                <IconButton icon={"play"}
                    title={I18n.t("Play")}
                    onClick={handlePlay}
                />
                <IconButton icon={"pause"}
                    title={I18n.t("Pause")}
                    onClick={handlePause}
                />
                <IconButton icon={"stop"}
                    title={I18n.t("Stop")}
                    onClick={handleStop}
                />
            </div>
            <div className="box">
                <div className={"timeline"}>
                    <div className="mask" />
                    <canvas ref={canvasRef} />
                </div>
                <div className={"layers"}>
                    <div className={"left"}
                        ref={leftRef}
                    >
                        {animations.map((layer: any) => 
                            <LayerInfo
                                key={layer.uuid}
                                layer={layer}
                                isSelected={selectedLayer === layer.uuid}
                                isEditing={editedLayer === layer.uuid}
                                editedLayerName={editedLayerName}
                                selectedLayerToDelete={selectedLayerToDelete}
                                layerMenuRef={layerMenuRef}
                                onDoubleClick={onLayerDoubleClick}
                                onClick={handleSelectedLayerChange}
                                onContextMenu={handleLayerContextMenu}
                                onDelete={handleDeleteLayer}
                                onNameChange={handleLayerNameChange}
                                onEditBlur={handleEditLayer}
                            />,
                        )}
                        <div className="empty-layer"
                            onDoubleClick={handleAddLayer}
                        />
                    </div>
                    <div className={"right"}
                        ref={rightRef}
                        onScroll={handleRightScroll}
                    >
                        {animations.map((layer: any) => 
                            <LayerRow
                                key={layer.uuid}
                                layer={layer}
                                isSelected={selectedLayer === layer.uuid}
                                selectedAnimation={selected}
                                scale={scale}
                                onDoubleClick={handleDoubleClick}
                                onDragEnter={handleDragEnter}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onLayerClick={handleSelectedLayerChange}
                                onAnimationClick={handleClick}
                                onAnimationDragStart={handleDragStart}
                                onAnimationDragEnd={handleDragEnd}
                            />,
                        )}
                    </div>
                    <div className={"right-padding"}>
                        {animations.map((layer: any) => 
                            <div key={layer.uuid} />,
                        )}
                    </div>
                    <div className="slider"
                        ref={sliderRef}
                    />
                </div>
            </div>
        </div>
    );
};

export const Timeline = React.memo(TimelineComponent);
