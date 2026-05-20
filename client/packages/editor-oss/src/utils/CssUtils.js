
/**
 * Module: CssUtils.js
 * Purpose: Contains logic for css utils.
 */


var CssUtils = {
    
    serializeFilter: function (filters) {
        var _filters = Object.assign(
            {},
            {
                hueRotate: filters.hueRotate || 0,
                saturate: filters.saturate === undefined ? 1 : filters.saturate,
                brightness: filters.brightness === undefined ? 1 : filters.brightness,
                blur: filters.blur || 0,
                contrast: filters.contrast === undefined ? 1 : filters.contrast,
                grayscale: filters.grayscale || 0,
                invert: filters.invert || 0,
                sepia: filters.sepia || 0,
            },
        );

        return (
            `hue-rotate(${_filters.hueRotate}deg) saturate(${_filters.saturate}) brightness(${_filters.brightness}) ` +
            `blur(${_filters.blur}px) contrast(${_filters.contrast}) grayscale(${_filters.grayscale}) invert(${_filters.invert}) sepia(${_filters.sepia})`
        );
    },

    
    parseFilter: function (str) {
        var list = str.split(" ");

        var filters = {
            hueRotate: 0,
            saturate: 1,
            brightness: 1,
            blur: 0,
            contrast: 1,
            grayscale: 0,
            invert: 0,
            sepia: 0,
        };

        list.forEach(n => {
            if (n.startsWith("hue-rotate")) {

                filters.hueRotate = parseFloat(n.substring(11, n.length - 4));
            } else if (n.startsWith("saturate")) {

                filters.saturate = parseFloat(n.substring(9, n.length - 1));
            } else if (n.startsWith("brightness")) {

                filters.brightness = parseFloat(n.substring(11, n.length - 1));
            } else if (n.startsWith("blur")) {

                filters.blur = parseFloat(n.substring(5, n.length - 3));
            } else if (n.startsWith("contrast")) {

                filters.contrast = parseFloat(n.substring(9, n.length - 1));
            } else if (n.startsWith("grayscale")) {
                filters.grayscale = parseFloat(n.substring(10, n.length - 1));
            } else if (n.startsWith("invert")) {

                filters.invert = parseFloat(n.substring(7, n.length - 1));
            } else if (n.startsWith("sepia")) {

                filters.sepia = parseFloat(n.substring(6, n.length - 1));
            }
        });

        return filters;
    },
};

export default CssUtils;
