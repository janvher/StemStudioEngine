import { useRef, useState } from 'react';
import { Object3D } from 'three';

import { SUPPORTED_MODEL_CONTENT_TYPES } from '@stem/network/api/asset';
import { saveScene } from '@stem/network/api/scene';
import { loadModelFromFile } from '@stem/editor-oss/model/loadModelFromFile';
import { showToast } from '@stem/editor-oss/showToast';
import Converter from '@stem/editor-oss/utils/Converter';
import { ModelUtils } from '@stem/editor-oss/utils/ModelUtils';
import { useCreateModel } from '../../../../../../../models/hooks/models';
import { THUMBNAIL_SIZE } from '../constants';

export const useBatchModelUploader = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [previewObject, setPreviewObject] = useState<Object3D | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const createModel = useCreateModel();
    const abortControllerRef = useRef<AbortController>(new AbortController());

    const uploadModelsAsync = async (files: FileList, signal: AbortSignal) => {
        const assets = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i]!;
            const loadResult = await loadModelFromFile(file, signal);
            signal.throwIfAborted();

            setPreviewObject(loadResult.model);
            setCurrentIndex(i);

            // Generate thumbnail
            const thumbnailUrl = await ModelUtils.createThumbnailFromModel(loadResult.model, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
            const thumbnailFile = Converter.dataURLtoFile(thumbnailUrl, "thumbnail");

            // Create model
            const contentType = SUPPORTED_MODEL_CONTENT_TYPES[loadResult.format][0];
            const asset = await createModel({
                name: file.name,
                blob: loadResult.rootFile,
                format: loadResult.format,
                contentType,
                thumbnail: {
                    file: thumbnailFile,
                    width: THUMBNAIL_SIZE,
                    height: THUMBNAIL_SIZE,
                },
            });

            assets.push(asset);
        }

        return assets;
    };

    const uploadModels = (files: FileList) => {
        // Abort previous upload
        cancelUpload();
        abortControllerRef.current = new AbortController();

        setIsUploading(true);
        setError(null);

        return uploadModelsAsync(files, abortControllerRef.current.signal)
            // Save the scene so that the asset resolution context is saved
            .then(async (assets) => {
                await saveScene(false, false);
                showToast({ type: 'success', title: 'Models uploaded' });
                return assets;
            })
            .catch((error) => {
                if (error?.name !== 'AbortError') {
                    console.error('Error uploading models:', error);
                    showToast({ type: 'error', title: 'Failed to upload models' });
                    setError(error);
                }

                throw error;
            })
            .finally(() => {
                setIsUploading(false);
            });
    };

    const cancelUpload = () => {
        abortControllerRef.current.abort();
        setCurrentIndex(0);
        setPreviewObject(null);
    };

    return {
        currentIndex,
        previewObject,
        isUploading,
        error,
        uploadModels,
        cancelUpload,
    };
};
