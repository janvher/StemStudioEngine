import { useMemo } from 'react';

import { ModelFormat } from '@stem/network/api/asset';
import { isGaussianSplatFormat } from '@stem/editor-oss/model/gaussianSplats';
import { MAX_POLYGON_COUNT } from '../constants';
import { UploadSettings } from '../types';

type UseModelWarningsProps = {
    polygonCount: number;
    isMixamoSupported: boolean;
    uploadSettings: UploadSettings;
    format?: ModelFormat;
};

export const useModelWarnings = ({
    format,
    polygonCount,
    isMixamoSupported,
    uploadSettings: {
        isHumanoid,
        simplifyModel,
        compressModel,
        compressTextures,
        limitTextureSize,
    },
}: UseModelWarningsProps) => {
    const warnings = useMemo(() => {
        const msgs: string[] = [];
        const isVrm = format === ModelFormat.Vrm;
        const isGaussianSplat = format !== undefined && isGaussianSplatFormat(format);

        if (isGaussianSplat && (simplifyModel || compressModel || compressTextures || limitTextureSize)) {
            msgs.push("Gaussian splat uploads keep their original data. Mesh optimization and texture compression settings are ignored");
        }

        if (isHumanoid && !isMixamoSupported) {
            msgs.push("Your model does not support mixamo animations. Animations will not be applied");
        }

        if (polygonCount > MAX_POLYGON_COUNT && !simplifyModel && !compressModel && !isVrm) {
            msgs.push(
                "3D model polycount is high, consider optimizing or compressing the model for better performance",
            );
        }

        if (isVrm && (simplifyModel || compressModel || compressTextures || limitTextureSize)) {
            msgs.push("VRM models cannot be optimized or compressed. If you continue model will be saved in GLB format");
        }

        return msgs;
    }, [
        format,
        isHumanoid,
        simplifyModel,
        compressModel,
        compressTextures,
        limitTextureSize,
        polygonCount,
        isMixamoSupported,
    ]);

    return { warnings };
};
