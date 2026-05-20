//@ts-nocheck
import {IAnythingModel, SUPPORTED_FORMATS} from "../types/animateAnything";

const getModelUrl = (model: IAnythingModel) => {
    let url = "";
    if (model.model.rig) {
        if (model.model.rig.animations?.idle) {
            const format = SUPPORTED_FORMATS.find(format => !!model.model.rig.animations.idle[format]);

            if (format) {
                url = model.model.rig.animations.idle[format];
            }
        } else {
            const format = SUPPORTED_FORMATS.find(format => !!model.model.rig[format]);

            if (format) {
                url = model.model.rig[format];
            }
        }
    } else if (model.model.formats) {
        const format = SUPPORTED_FORMATS.find(format => !!model.model.formats[format]);

        if (format) {
            url = model.model.formats[format];
        }
    } else {
        url = model.model.other.model;
    }

    return url;
};

const isModelSupported = (model: IAnythingModel) => {
    if (model.model.rig) {
        if (model.model.rig.animations?.idle) {
            const format = SUPPORTED_FORMATS.find(
                format => !!model.model.rig.animations.idle[format],
            );

            if (format) {
                return !!model.model.rig.animations.idle[format];
            }
        } else {
            const format = SUPPORTED_FORMATS.find(
                format => !!model.model.rig[format],
            );

            if (format) {
                return !!model.model.rig[format];
            }
        }
    } else if (model.model.formats) {
        const format = SUPPORTED_FORMATS.find(
            format => !!model.model.formats[format],
        );

        if (format) {
            return !!model.model.formats[format];
        }
    } else {
        const array = model.model.other.model.split(".");
        const extension = array[array.length - 1].split("?")[0];
        return SUPPORTED_FORMATS.indexOf(extension.toUpperCase()) > -1;
    }
};

const AiModelUtils = {
    getModelUrl: getModelUrl,
    isModelSupported: isModelSupported,
};

export default AiModelUtils;
