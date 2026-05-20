import { useState } from 'react';
import styled from 'styled-components';

import { AssetRef } from '@stem/editor-oss/asset-management/AssetRef';
import { flexCenter, regularFont } from '../../../../../assets/style';
import { showToast } from '@stem/editor-oss/showToast';
import { ElementsUtils } from '@stem/editor-oss/utils/ElementsUtils';
import { useCreateAssetRelease } from '../../../../asset-management/hooks/assets';
import { useAutoCreateAssetReleases, useGetUnreleasedAssetDependencies } from '../../../../asset-management/hooks/dependencies';
import { StyledButton } from '../../common/StyledButton';
import { StyledTextarea } from '../../common/StyledTextarea';
import { TextInput } from '../../common/TextInput';

export type PublishSectionProps = {
    assetId: string;
    revisionId: string;
    onPublished: () => void;
};

export const PublishSection = ({
    assetId,
    revisionId,
    onPublished,
}: PublishSectionProps) => {
    const [version, setVersion] = useState("");
    const [versionTouched, setVersionTouched] = useState(false);
    const versionIsValid = isValidSemver(version);
    const [description, setDescription] = useState("");

    const createAssetRelease = useCreateAssetRelease();
    const autoCreateAssetReleases = useAutoCreateAssetReleases();
    const getUnreleasedAssetDependencies = useGetUnreleasedAssetDependencies();

    const handlePublishDependenciesOk = (
        assetId: string,
        revisionId: string,
        unreleased: AssetRef[],
    ) => {
        // Unreleased dependencies are ordered in a pre-order DFS traversal, so
        // we need to reverse it before publishing to ensure that dependencies
        // are published in the correct order.
        const reversedUnreleased = [...unreleased].reverse();

        autoCreateAssetReleases(reversedUnreleased)
            .then(() => {
                return createAssetRelease.mutateAsync({
                    assetId,
                    revisionId,
                    version: {
                        major: Number(version.split(".")[0]),
                        minor: Number(version.split(".")[1]),
                        patch: Number(version.split(".")[2]),
                    },
                    description: "",
                }).then(() => {
                    showToast({ type: "success", title: "Asset published" });
                    onPublished();
                });
            })
            .catch((error) => {
                console.error("Failed to create asset release", error);
                showToast({ type: "error", title: "Failed to publish asset" });
            });
    };

    const handlePublish = () => {
        // Check if there are any unreleased dependencies
        getUnreleasedAssetDependencies(assetId, revisionId)
            .then((unreleased) => {
                if (unreleased.length > 0) {
                    ElementsUtils.confirm({
                        title: "Asset has unpublished dependencies",
                        content: "Those dependencies must be published before this asset can be published. Continue with publish?",
                        onOK: () => handlePublishDependenciesOk(assetId, revisionId, unreleased),
                    });
                    return;
                }

                // Create the asset release
                return createAssetRelease.mutateAsync({
                    assetId,
                    revisionId,
                    version: {
                        major: Number(version.split(".")[0]),
                        minor: Number(version.split(".")[1]),
                        patch: Number(version.split(".")[2]),
                    },
                    description: "",
                }).then(() => {
                    onPublished();
                });
            })
            .catch((error) => {
                console.error("Failed to create asset release", error);
                showToast({ type: "error", title: "Failed to publish asset" });
            });
    };

    return (
        <>
            {/* Publish settings */}
            <Settings>
                <Property>
                    <Label>Version</Label>
                    <TextInput
                        value={version}
                        setValue={(value: string) => {
                            setVersion(value);
                            setVersionTouched(true);
                        }}
                        placeholder="0.0.1"
                    />
                    {versionTouched && !versionIsValid && 
                        <ValidationError>
                            Version must be in semantic version format (e.g. 1.2.3)
                        </ValidationError>
                    }
                </Property>
                <Property>
                    <Label>Description</Label>
                    <StyledTextarea
                        value={description}
                        setValue={setDescription}
                        placeholder="Write a description..."
                    />
                </Property>
            </Settings>

            {/* Publish button */}
            <StyledButton
                onClick={handlePublish}
                isBlue
                disabled={!versionIsValid}
            >
                Publish
            </StyledButton>
        </>
    );
};

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

const isValidSemver = (version: string): boolean => {
    return SEMVER_REGEX.test(version.trim());
};

const Settings = styled.div`
    padding: 8px 12px;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    row-gap: 12px;
`;

const Property = styled.div`
    ${flexCenter};
    align-items: flex-start;
    flex-direction: column;
    row-gap: 8px;
    width: 100%;
`;

const Label = styled.label`
    display: block;
    ${regularFont("s")};
    color: #a1a1aa;
`;

const ValidationError = styled.div`
    ${regularFont("s")};
    color: #ef4444; /* red-500 */
`;
