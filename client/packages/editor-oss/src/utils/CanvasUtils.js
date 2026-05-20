
/**
 * Module: CanvasUtils.js
 * Purpose: Contains logic for canvas utils.
 */


const CanvasUtils = {
    
    makePowerOfTwo: function (num) {
        let result = 1;
        while (result < num) {
            result *= 2;
        }
        return result;
    },
};

export default CanvasUtils;
