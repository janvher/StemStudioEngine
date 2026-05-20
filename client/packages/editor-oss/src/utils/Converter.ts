
/**
 * Module: Converter.ts
 * Purpose: Contains logic for converter.
 */


/**
 *
 * @param canvas
 * @param type
 * @param quality
 * @author cuixiping / https://blog.csdn.net/cuixiping/article/details/45932793
 *
 *
 *
 *
 */
function canvasToDataURL(canvas: HTMLCanvasElement, type = "image/png", quality = 0.8) {
    if (type.toLowerCase() === "image/png") {
        return canvas.toDataURL(type);
    } else {
        return canvas.toDataURL(type, quality);
    }
}

/**
 *
 * @param blob
 * @author cuixiping / https://blog.csdn.net/cuixiping/article/details/45932793
 *
 *
 */
function blobToDataURL(blob: Blob): Promise<string> {
    var reader = new FileReader();

    return new Promise(resolve => {
        reader.onload = e => {
            resolve((e.target as FileReader).result as string);
        };
        reader.readAsDataURL(blob);
    });
}

/**
 *
 * @param file
 * @author cuixiping / https://blog.csdn.net/cuixiping/article/details/45932793
 *
 *
 */
function fileToDataURL(file: File) {
    return blobToDataURL(file);
}

/**
 *
 * @param dataURL
 * @author cuixiping / https://blog.csdn.net/cuixiping/article/details/45932793
 *
 *
 */
function dataURLToBlob(dataURL: string) {
    var array = dataURL.split(",");
    var mimeType = (/:(.*?);/.exec(array[0] ?? "") ?? ["", ""])[1] ?? "";
    var binaryString = atob(array[1] ?? "");
    var length = binaryString.length;
    var uint8Array = new Uint8Array(length);
    while (length--) {
        uint8Array[length] = binaryString.charCodeAt(length);
    }
    return new Blob([uint8Array], {type: mimeType});
}

/**
 *
 * @param dataURL
 * @param filename
 * @author cuixiping / https://blog.csdn.net/cuixiping/article/details/45932793
 *
 *
 *
 */
function dataURLtoFile(dataURL: string, filename: string) {
    var array = dataURL.split(",");
    var mimeType = (/:(.*?);/.exec(array[0] ?? "") ?? ["", ""])[1] ?? "";
    var binaryString = atob(array[1] ?? "");
    var length = binaryString.length;
    var uint8Array = new Uint8Array(length);
    while (length--) {
        uint8Array[length] = binaryString.charCodeAt(length);
    }

    if (mimeType === "image/jpeg") {
        filename = filename + ".jpg";
    } else if (mimeType === "image/png") {
        filename = filename + ".png";
    } else {
        console.warn(`Converter: not supported mime-type: ${mimeType}.`);
    }

    return new File([uint8Array], filename, {type: mimeType});
}

/**
 *
 * @param dataURL
 * @author cuixiping / https://blog.csdn.net/cuixiping/article/details/45932793
 *
 *
 */
function dataURLToImage(dataURL: string) {
    var image = new Image();

    return new Promise(resolve => {
        image.onload = () => {
            image.onload = null;
            image.onerror = null;
            resolve(image);
        };
        image.onerror = () => {
            image.onload = null;
            image.onerror = null;
            resolve(null);
        };
        image.src = dataURL;
    });
}

/**
 *
 * @param blob
 * @author cuixiping / https://blog.csdn.net/cuixiping/article/details/45932793
 *
 *
 */
async function BlobToImage(blob: Blob) {
    const dataUrl = await blobToDataURL(blob);
    const image = await dataURLToImage(dataUrl);
    return image;
}

/**
 *
 * @param file
 * @author cuixiping / https://blog.csdn.net/cuixiping/article/details/45932793
 *
 *
 */
function FileToImage(file: File) {
    return BlobToImage(file);
}

/**
 *
 * @param image
 * @author cuixiping / https://blog.csdn.net/cuixiping/article/details/45932793
 *
 *
 */
function ImageToCanvas(image: HTMLImageElement) {
    var canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    var context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);

    return canvas;
}

/**
 *
 * @param canvas
 * @param type
 * @param quality
 */
function CanvasToImage(canvas: HTMLCanvasElement, type = "image/png", quality = 0.8) {
    var image = new Image();
    if (type === "image/jpeg") {
        image.src = canvas.toDataURL("image/jpeg", quality);
    } else {
        image.src = canvas.toDataURL("image/png");
    }
    return image;
}

const Converter = {
    canvasToDataURL: canvasToDataURL,
    blobToDataURL: blobToDataURL,
    fileToDataURL: fileToDataURL,
    dataURLToBlob: dataURLToBlob,
    dataURLtoFile: dataURLtoFile,
    dataURLToImage: dataURLToImage,
    BlobToImage: BlobToImage,
    FileToImage: FileToImage,
    imageToCanvas: ImageToCanvas,
    canvasToImage: CanvasToImage,
};

export default Converter;
