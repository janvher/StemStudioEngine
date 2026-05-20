
/**
 * Module: ImageUtils.js
 * Purpose: Contains logic for image utils.
 */


/**
 *
 * @param color
 */
function onePixelCanvas(color = "#000000") {
    var canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return canvas;
}

const ImageUtils = {
    onePixelCanvas: onePixelCanvas,
};

export default ImageUtils;
