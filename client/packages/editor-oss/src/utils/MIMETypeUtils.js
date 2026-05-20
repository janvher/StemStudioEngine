
/**
 * Module: MIMETypeUtils.js
 * Purpose: Contains logic for mimetype utils.
 */


/**
 *
 * @param {String} mimeType MIME-Type
 *
 */
function getExtension(mimeType) {
    switch (mimeType) {
        case "image/jpeg":
            return "jpg";
        case "image/png":
            return "png";
        case "image/webp":
            return "webp";
        case "image/gif":
            return "gif";
        case "image/bmp":
            return "bmp";
        default:
            console.error(`MIMETypeUtils: unknown MIME-Type: ${mimeType}`);
            return "unknown";
    }
}

/**
 *
 *
 * @param extension
 * @returns {String} MIME-Type
 */
function getMIMEType(extension) {
    extension = extension.trimLeft(".");
    switch (extension.toLowerCase()) {
        case "jpg":
        case "jpeg":
            return "image/jpeg";
        case "png":
            return "image/png";
        case "webp":
            return "image/webp";
        case "gif":
            return "image/gif";
        case "bmp":
            return "image/bmp";
        default:
            console.warn(`MIMETypeUtils: unknown extension ${extension}.`);
            return "application/octet-stream";
    }
}

const MIMETypeUtils = {
    getExtension: getExtension,
    getMIMEType: getMIMEType,
};

export default MIMETypeUtils;
