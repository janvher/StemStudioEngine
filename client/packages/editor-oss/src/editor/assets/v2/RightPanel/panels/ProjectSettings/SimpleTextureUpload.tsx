import React, { useEffect, useRef, useState } from "react";

import { TexturePreview } from "./TexturePreview";
import type {AssetRef} from "@stem/editor-oss/asset-management/AssetRef";
import global from "@stem/editor-oss/global";
import { showToast } from "@stem/editor-oss/showToast";
import { UploadUtils } from "@stem/editor-oss/utils/UploadUtils";
import { backendUrlFromPath } from "@stem/editor-oss/utils/UrlUtils";

export const SimpleTextureUpload = ({ 
    url, 
    assetRef,
    onChange, 
    label, 
    aspectRatio = '2/1', 
    hideTitle = false, 
    placeholder,
}: { 
    url?: string, 
    assetRef?: AssetRef,
    onChange: (url: string) => void, 
    label: string, 
    aspectRatio?: string,
    hideTitle?: boolean,
    placeholder?: string
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [resolvedUrl, setResolvedUrl] = useState(url || "");
    const [resolvedFormat, setResolvedFormat] = useState<string | undefined>(undefined);

    useEffect(() => {
        let disposed = false;

        if (url) {
            setResolvedUrl(url);
            setResolvedFormat(url.split(".").pop()?.split("?")[0]?.toLowerCase());
            return () => {
                disposed = true;
            };
        }

        if (!assetRef || !global.app?.assetLoader) {
            setResolvedUrl("");
            setResolvedFormat(undefined);
            return () => {
                disposed = true;
            };
        }

        void global.app.assetLoader.getImageDataUrl(assetRef).then(result => {
            if (disposed) {
                return;
            }

            setResolvedUrl(result.url);
            setResolvedFormat(result.format?.toLowerCase());
        }).catch(() => {
            if (disposed) {
                return;
            }

            setResolvedUrl("");
            setResolvedFormat(undefined);
        });

        return () => {
            disposed = true;
        };
    }, [assetRef, url]);

    const displayUrl = resolvedUrl;
    const hasTexture = Boolean(displayUrl || assetRef);
    const isHdrLike = (resolvedFormat || displayUrl.split(".").pop()?.split("?")[0] || "").toLowerCase();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset value to allow re-uploading the same file
        e.target.value = '';

        void UploadUtils.uploadSingleFile(file, backendUrlFromPath(`/api/Upload`) || "", (obj: any) => {
            if (obj.Code === 200 && obj.Data?.url) {
                onChange(obj.Data.url);
                showToast({type: "success", title: "Upload complete"});
            } else {
                showToast({type: "error", title: obj.Msg ?? "Upload failed"});
            }
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {!hideTitle && <div style={{ fontSize: 12, color: '#888' }}>{label}</div>}
            <div 
                style={{ 
                    width: '100%', 
                    aspectRatio: aspectRatio, 
                    border: hasTexture ? 'none' : '1px dashed #444', 
                    borderRadius: 4, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    background: '#222',
                }}
                onClick={() => fileInputRef.current?.click()}
            >
                {displayUrl ? 
                    <>
                        {isHdrLike === "hdr" || isHdrLike === "exr" ? 
                            <TexturePreview url={displayUrl} />
                         : 
                            <img
                                src={displayUrl}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                }}
                            />
                        }
                        <div
                            style={{
                                position: "absolute",
                                top: 2,
                                right: 2,
                                background: "rgba(0,0,0,0.5)",
                                width: 20,
                                height: 20,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 2,
                                color: "white",
                                fontSize: 10,
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange("");
                            }}
                        >
                            X
                        </div>
                    </>
                 : hasTexture ?
                    <span style={{ fontSize: 10, color: '#888', textAlign: 'center', padding: 4 }}>
                        Loading preview...
                    </span>
                 : 
                    <span style={{ fontSize: 10, color: '#888', textAlign: 'center', padding: 4 }}>
                        {placeholder || "Click to Upload"}
                    </span>
                }
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.hdr,.exr"
                style={{display: "none"}}
                onChange={handleFileChange}
            />
        </div>
    );
};
