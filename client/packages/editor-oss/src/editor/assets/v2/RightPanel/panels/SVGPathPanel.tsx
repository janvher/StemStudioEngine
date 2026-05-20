import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import CustomShape from "../../../../../object/geometry/CustomShape";
import { Separator } from "../common/Separator";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 4px;
`;

const Label = styled.label`
    color: var(--theme-font-main-selected-color);
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
    display: block;
`;

const TextArea = styled.textarea`
    width: 100%;
    min-height: 200px;
    padding: 12px;
    background: var(--theme-container-secondary-dark);
    border: 1px solid var(--theme-grey-bg);
    border-radius: 8px;
    color: var(--theme-font-main-selected-color);
    font-family: "Courier New", monospace;
    font-size: 13px;
    resize: vertical;

    &:focus {
        outline: none;
        border-color: var(--theme-primary-color);
    }
`;

const HelpText = styled.div`
    color: var(--theme-font-main-color);
    font-size: 12px;
    line-height: 1.5;
    margin-top: 8px;
`;

const ExampleLink = styled.span`
    color: var(--theme-primary-color);
    cursor: pointer;
    text-decoration: underline;

    &:hover {
        opacity: 0.8;
    }
`;

const UploadButton = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--theme-container-secondary-dark);
    border: 1px solid var(--theme-grey-bg);
    border-radius: 8px;
    color: var(--theme-font-main-selected-color);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: var(--theme-grey-bg);
    }

    input[type="file"] {
        display: none;
    }
`;


const defaultSVGPath = "M 0,50 L 15,15 L 50,10 L 20,-10 L 30,-50 L 0,-20 L -30,-50 L -20,-10 L -50,10 L -15,15 Z";

const examples = [
    {
        name: "Star",
        path: "M 0,50 L 15,15 L 50,10 L 20,-10 L 30,-50 L 0,-20 L -30,-50 L -20,-10 L -50,10 L -15,15 Z",
    },
    {
        name: "Heart",
        path: "M 0,40 C -20,20 -40,0 -40,-20 C -40,-40 -20,-60 0,-60 C 20,-60 40,-40 40,-20 C 40,0 20,20 0,40 Z",
    },
    {
        name: "Circle",
        path: "M 0,50 A 50,50 0 1,0 0,-50 A 50,50 0 1,0 0,50 Z",
    },
    {
        name: "Square",
        path: "M -50,-50 L 50,-50 L 50,50 L -50,50 Z",
    },
];

export const SVGPathPanel = () => {
    const app = (global.app as EngineRuntime) || null;
    const [svgPath, setSvgPath] = useState(defaultSVGPath);
    const [isInitialized, setIsInitialized] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load SVG path from selected object
    useEffect(() => {
        const selected = app?.editor?.selected;
        if (selected && !Array.isArray(selected)) {
            const path = selected.userData?.svgPath;
            if (path) {
                setSvgPath(path);
                setIsInitialized(true);
            }
        }
    }, [app?.editor?.selected]);

    // Auto-update shape when SVG path changes (real-time with debounce)
    useEffect(() => {
        // Don't update until we've loaded initial values from the selected object
        if (!isInitialized) return;
        if (!svgPath.trim()) return;

        const selected = app?.editor?.selected;
        if (!selected || Array.isArray(selected) || !(selected instanceof CustomShape)) return;

        // Debounce the update to avoid updating on every keystroke
        const timeoutId = setTimeout(() => {
            try {
                // Update CustomShape with new SVG path
                selected.updateShape(svgPath.trim());
                // Trigger object update
                app.editor?.engine?.call("objectChanged", app.editor, selected);
            } catch (error) {
                console.error("Failed to update SVG shape:", error);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [svgPath, isInitialized, app?.editor?.selected]);

    const handleExampleClick = (examplePath: string) => {
        setSvgPath(examplePath);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const svgContent = event.target?.result as string;
            const trimmedContent = svgContent.trim();

            if (/<svg[\s>]/i.test(trimmedContent)) {
                // Preserve full SVG content so groups/transforms/multiple paths are all imported.
                setSvgPath(trimmedContent);
            } else {
                // Fallback for plain path command strings.
                setSvgPath(trimmedContent);
            }
        };
        reader.readAsText(file);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <>
            <span className="common-text white-bold">SVG Path Editor</span>
            <Separator invisible />
            <Container>
                <div>
                    <Label>SVG Path Data / SVG Markup</Label>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                        <UploadButton>
                            📁 Upload SVG File
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".svg"
                                onChange={handleFileUpload}
                            />
                        </UploadButton>
                    </div>
                    <TextArea
                        value={svgPath}
                        onChange={e => setSvgPath(e.target.value)}
                        placeholder="Enter SVG path data (e.g., M 0,0 L 10,10 Z) or paste full <svg>...</svg>"
                    />
                    <HelpText>
                        Upload an SVG file or enter SVG path commands using the standard syntax.
                        <br />
                        Examples:{" "}
                        {examples.map((example, index) =>
                            <React.Fragment key={example.name}>
                                {index > 0 && ", "}
                                <ExampleLink
                                    onClick={() => handleExampleClick(example.path)}
                                >
                                    {example.name}
                                </ExampleLink>
                            </React.Fragment>,
                        )}
                    </HelpText>
                </div>
            </Container>
        </>
    );
};
