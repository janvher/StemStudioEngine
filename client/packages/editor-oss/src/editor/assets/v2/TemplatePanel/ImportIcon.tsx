import {RefObject, useRef, useState} from "react";
import styled from "styled-components";
import {useOnClickOutside} from "usehooks-ts";

import {useAuthorizationContext, useHomepageContext} from "@stem/editor-oss/context";
import {showToast} from "@stem/editor-oss/showToast";
import {DashboardAssetPackImportUtils} from "@stem/editor-oss/utils/DashboardAssetPackImportUtils";
import {DashboardImportUtils} from "@stem/editor-oss/utils/DashboardImportUtils";
import {ImportProgressDialog, type ImportProgress} from "../common/ImportProgressDialog";
import {MissingTextureDialog} from "../common/MissingTextureDialog";
import {TextureVariantDialog} from "../common/TextureVariantDialog";
import importIcon from "../icons/import-icon.svg";

export const ImportIcon = () => {
    const {isAdmin} = useAuthorizationContext();
    const {setShouldRefreshDashboard, setShowTemplatePanel} = useHomepageContext();

    const [optionsVisible, setOptionsVisible] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
    const [importDialogTitle, setImportDialogTitle] = useState("Importing Scene");
    const [variantOptions, setVariantOptions] = useState<File[] | null>(null);
    const [variantResolver, setVariantResolver] = useState<((file: File | null) => void) | null>(null);
    const [texturePromptOpen, setTexturePromptOpen] = useState(false);
    const [textureResolver, setTextureResolver] = useState<((files: File[] | null) => void) | null>(null);

    const handleVariantConfirm = (file: File) => {
        variantResolver?.(file);
        setVariantOptions(null);
        setVariantResolver(null);
    };

    const handleVariantCancel = () => {
        variantResolver?.(null);
        setVariantOptions(null);
        setVariantResolver(null);
    };

    const handleTextureSelect = (files: File[]) => {
        textureResolver?.(files);
        setTexturePromptOpen(false);
        setTextureResolver(null);
    };

    const handleTextureContinue = () => {
        textureResolver?.(null);
        setTexturePromptOpen(false);
        setTextureResolver(null);
    };

    const ref = useRef<HTMLButtonElement>(null);

    useOnClickOutside(ref as RefObject<HTMLElement>, () => setOptionsVisible(false));

    const handleImportAssetPack = () => {
        if (isImporting || !isAdmin) return;

        setImportDialogTitle("Importing Asset Pack");

        DashboardAssetPackImportUtils.dashboardAssetPackImport(
            () => {
                setIsImporting(true);
                setImportProgress({
                    currentStep: "Initializing import...",
                });
            },
            result => {
                setIsImporting(false);
                setImportProgress(null);

                if (result.success) {
                    if (result.failedCount && result.failedCount > 0) {
                        const total = (result.successCount ?? 0) + result.failedCount;
                        const failedNames = result.failedAssets?.join(", ") ?? "";
                        showToast({
                            type: "warning",
                            title: `Imported ${result.successCount} of ${total} assets`,
                            body: `Failed: ${failedNames}`,
                        });
                    } else {
                        showToast({type: "success", title: "Asset pack imported and published"});
                        setShowTemplatePanel(false);
                    }
                    setShouldRefreshDashboard(true);
                } else {
                    showToast({
                        type: "error",
                        body: result.error || "Asset pack import failed",
                    });
                    console.error("Asset pack import failed:", result.error);
                }
            },
            progress => {
                setImportProgress(progress);
            },
        );
    };

    const handleImportGame = () => {
        if (isImporting) return;

        setImportDialogTitle("Importing Scene");

        DashboardImportUtils.dashboardSceneImport(
            () => {
                setIsImporting(true);
                setImportProgress({
                    currentStep: "Initializing import...",
                });
            },
            result => {
                setIsImporting(false);
                setImportProgress(null);

                if (result.success) {
                    showToast({type: "success", title: "Scene imported successfully"});
                    // Refresh the dashboard to show the newly imported scene
                    setShouldRefreshDashboard(true);
                    setShowTemplatePanel(false);
                } else {
                    showToast({
                        type: "error",
                        body: result.error || "Import failed",
                    });
                    console.error("Import failed:", result.error);
                }
            },
            window.location.origin, // Use current domain as options server
            progress => {
                setImportProgress(progress);
            },
            {isAdmin},
        );
    };

    const importOptions = [
        {label: "Import Game", handler: handleImportGame},
        {label: "Import Asset Pack", handler: handleImportAssetPack},
    ];

    return (
        <>
            <ImportProgressDialog
                isOpen={isImporting}
                progress={importProgress}
                title={importDialogTitle}
            />
            {variantOptions && (
                <TextureVariantDialog
                    variants={variantOptions}
                    onConfirm={handleVariantConfirm}
                    onCancel={handleVariantCancel}
                />
            )}

            {texturePromptOpen && (
                <MissingTextureDialog
                    onSelectTextures={handleTextureSelect}
                    onContinue={handleTextureContinue}
                    onCancel={handleTextureContinue}
                />
            )}
            <button
                className="reset-css"
                onClick={isAdmin ? () => setOptionsVisible(true) : handleImportGame}
                style={{position: "relative"}}
                ref={ref}
            >
                <img
                    src={importIcon}
                    alt="import game"
                />
                {optionsVisible && isAdmin && (
                    <Menu>
                        {importOptions.map(({label, handler}) => (
                            <MenuItem
                                key={label}
                                disabled={isImporting}
                                onClick={handler}
                                className="reset-css"
                            >
                                {isImporting ? "Importing..." : label}
                            </MenuItem>
                        ))}
                    </Menu>
                )}
            </button>
        </>
    );
};

const Menu = styled.div`
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translate(-50%, 100%);
    width: 135px;
    padding: 8px;

    background: var(--theme-container-secondary-dark);
    border-radius: 8px;
    box-shadow: 0px 4px 15px 0px rgba(0, 0, 0, 0.5);
    z-index: 1000;
    overflow: hidden;
`;
const MenuItem = styled.button`
    padding: 12px 16px;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    color: white;
    cursor: pointer;
    transition: background-color 0.2s ease;
    width: 100%;
    padding: 4px 0 !important;
    border-radius: 4px;

    &:hover {
        background-color: #4f4f5d;
    }
`;
