import {HUD_Z_INDEX} from "@stem/editor-oss/editor/assets/v2/HUD/HUDView/services";

export const joystickInnerCircleBaseCss = (thumbSizePercent: number) => {
    return `
    width: ${thumbSizePercent}%;
    height: ${thumbSizePercent}%; 
    position: absolute;
    left: 50%; 
    top: 50%;
    transform: translate(-50%, -50%);
    cursor: grab;
    touch-action: none;
    pointer-events: auto;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;`;
};

export const joystickInnerNoImgCss = `border-radius: 50%; background: rgba(255,255,255,0.7); border: 1.5px solid white;`;

export const joystickBackgroundBaseCss = (size: number, position: {x: number; y: number}, zIndex: number) => {
    return `
    width: ${size}px; 
    height: ${size}px; 
    position: fixed;
    left: ${position.x}px; 
    bottom: ${position.y}px; transform: translate(-50%, 50%); 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    z-index: ${zIndex};
    touch-action: none; 
    user-select: none;
    pointer-events: auto;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;`;
};

export const commonImageCss = (img: string) => {
    return `
    background-image: url("${img}"); 
    background-size: cover; 
    background-position: center; 
    background-repeat: no-repeat; 
    background-color: transparent; 
    border: none; 
    border-radius: 50%;`;
};

export const joystickBackgroundNoImageCss = `
border-radius: 50%; 
background: radial-gradient(circle, rgba(255,255,255,0.15) 60%, rgba(255,255,255,0.5) 100%); 
border: 1.5px solid white;
`;

export const buttonBaseCss = (size: number, position: {x: number; y: number}, viewportWidth: number, zIndex: number) => {
    return `
    width: ${size}px;
    height: ${size}px;
    position: fixed;
    right: ${viewportWidth - position.x}px;
    bottom: ${position.y}px;
    transform: translate(50%, 50%);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: ${zIndex};
    cursor: pointer;
    touch-action: none;
    user-select: none;
    pointer-events: auto;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.1s ease-in-out;`;
};

export const buttonNoImgCss = `
    border-radius: 50%;
    background: rgba(255,255,255,0.5);
    border: 1.5px solid white;`;
