
/**
 * Module: MathUtils.js
 * Purpose: Contains logic for math utils.
 */


/**
 *
 * @author mrdoob / http://mrdoob.com/
 */
var NUMBER_PRECISION = 6;

/**
 *
 * @param key
 * @param value
 */
function parseNumber(key, value) {
    return typeof value === "number" ? parseFloat(value.toFixed(NUMBER_PRECISION)) : value;
}

const GeoUtils = {
    NUMBER_PRECISION: NUMBER_PRECISION,
    parseNumber: parseNumber,
};

export default GeoUtils;
