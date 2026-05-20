/**
 * Right-panel content for file entries in the CodeEditor.
 *
 * Files are read-only in the unified editor, so this panel shows metadata
 * only: name, format, content type, and size. No editing controls.
 */
import React from "react";

import {
    SectionTitle,
    DetailsData,
    Property,
    Label,
    ReadOnlyInput,
} from "../../BehaviorCreator/BehaviorCreator.style";
import type {AssetTreeEntry} from "../hooks/useAssetTree";

export interface FilePanelProps {
    entry: AssetTreeEntry;
}

function formatBytes(bytes: number | undefined): string {
    if (bytes == null) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FilePanel: React.FC<FilePanelProps> = ({entry}) => {
    return (
        <div style={{width: "100%"}}>
            <SectionTitle>
                <span className="title">File Details</span>
            </SectionTitle>
            <DetailsData>
                <Property>
                    <Label>Name</Label>
                    <ReadOnlyInput value={entry.name} disabled />
                </Property>
                {entry.format && (
                    <Property>
                        <Label>Format</Label>
                        <ReadOnlyInput value={entry.format} disabled />
                    </Property>
                )}
                {entry.contentType && (
                    <Property>
                        <Label>Content Type</Label>
                        <ReadOnlyInput value={entry.contentType} disabled />
                    </Property>
                )}
                <Property>
                    <Label>Size</Label>
                    <ReadOnlyInput value={formatBytes(entry.size)} disabled />
                </Property>
            </DetailsData>
        </div>
    );
};
