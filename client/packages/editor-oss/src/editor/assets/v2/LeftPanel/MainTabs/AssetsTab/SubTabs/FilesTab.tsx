import {useEffect, useState} from "react";
import styled, {keyframes} from "styled-components";

import {EmptyAssetsState} from "./EmptyAssetsState";
import {useListSceneFiles} from "./hooks/useListSceneFiles";
import {flexCenter} from "../../../../../../../assets/style";
import global from "@stem/editor-oss/global";
import {useRemoveAssetsAndInstancesFromScene} from "../../../../../../asset-management/hooks/scene";
import {AssetsList, AssetItem} from "../../../../common/AssetsList";
import noImageIcon from "../../../../icons/no-image.png";

const TEXT_EXTENSIONS = new Set([
    "json", "xml", "txt", "md", "markdown", "html", "htm", "css", "js", "mjs",
    "cjs", "ts", "tsx", "jsx", "yaml", "yml", "toml", "ini", "csv", "tsv",
    "svg", "log", "conf", "cfg", "env", "properties", "sh", "bash", "py",
    "rb", "go", "rs", "java", "c", "cpp", "h", "hpp", "glsl", "vert", "frag",
    "stemscript",
]);

/**
 *
 * @param fileObj
 * @param fileObj.name
 * @param fileObj.format
 * @param fileObj.contentType
 */
function isTextFile(fileObj: {name: string; format?: string; contentType?: string}): boolean {
    const format = fileObj.format?.toLowerCase();
    if (format && TEXT_EXTENSIONS.has(format)) return true;

    const ct = fileObj.contentType?.toLowerCase() || "";
    if (ct.startsWith("text/")) return true;
    if (ct.includes("json") || ct.includes("xml") || ct.includes("yaml") || ct.includes("javascript")) return true;

    const parts = fileObj.name.split(".");
    if (parts.length > 1) {
        const ext = parts.pop()?.toLowerCase() || "";
        if (TEXT_EXTENSIONS.has(ext)) return true;
    }
    return false;
}

type PendingUpload = {id: string; name: string};

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const PlaceholderItem = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 108px;
`;

const PlaceholderThumb = styled.div`
    width: 108px;
    height: 108px;
    background: var(--theme-editor-box-bg);
    ${flexCenter};
    border-radius: 8px;
    position: relative;
`;

const Spinner = styled.div`
    width: 24px;
    height: 24px;
    border: 3px solid rgba(255, 255, 255, 0.15);
    border-top-color: rgba(255, 255, 255, 0.6);
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
    position: absolute;
`;

const PlaceholderName = styled.span`
    font-size: 11px;
    color: var(--theme-text-secondary, #a1a1aa);
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 108px;
`;

interface Props {
    search: string;
}

export const FilesTab = ({search}: Props) => {
    const app = (global as any).app;
    const [filteredData, setFilteredData] = useState<AssetItem[]>();
    const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

    const removeAssetsAndInstancesFromScene = useRemoveAssetsAndInstancesFromScene();
    const {assets: files, isLoading} = useListSceneFiles(app?.editor?.sceneID || "missing-scene-id");

    useEffect(() => {
        if (!app) return;
        const onStart = (info: PendingUpload) => {
            setPendingUploads(prev => [...prev, info]);
        };
        const onFinish = (info: {id: string}) => {
            setPendingUploads(prev => prev.filter(u => u.id !== info.id));
        };
        app.on("fileUploadStarted.FilesTab", onStart);
        app.on("fileUploadFinished.FilesTab", onFinish);
        return () => {
            app.off("fileUploadStarted.FilesTab");
            app.off("fileUploadFinished.FilesTab");
        };
    }, [app]);

    const handleClick = (id: string) => {
        const obj = files?.find(item => item.id === id);
        if (!obj) return;
        if (!isTextFile(obj)) return;
        app?.editor?.component?.openCodeEditor({kind: "file", id: obj.id});
    };

    const handleDelete = (args: {id: string; name: string}) => {
        removeAssetsAndInstancesFromScene([args.id]).catch(console.error);
    };

    useEffect(() => {
        if (!search) {
            setFilteredData(files);
            return;
        } else {
            setFilteredData(
                files?.filter(n => {
                    return n.name.toLowerCase().indexOf(search.toLowerCase()) > -1;
                }),
            );
        }
    }, [search, files]);

    if (isLoading) {
        return <div>Loading files...</div>;
    }

    const hasContent = (filteredData && filteredData.length > 0) || pendingUploads.length > 0;

    if (!hasContent) {
        return (
            <EmptyAssetsState
                search={search}
                label="data files"
            />
        );
    }

    return (
        <>
            {pendingUploads.length > 0 && (
                <div className="assets-list">
                    {pendingUploads.map(u => (
                        <PlaceholderItem key={u.id}>
                            <PlaceholderThumb>
                                <img
                                    src={noImageIcon}
                                    alt=""
                                    style={{width: 65, height: 65, opacity: 0.3}}
                                />
                                <Spinner />
                            </PlaceholderThumb>
                            <PlaceholderName title={u.name}>{u.name}</PlaceholderName>
                        </PlaceholderItem>
                    ))}
                </div>
            )}
            {filteredData && filteredData.length > 0 && (
                <AssetsList
                    data={filteredData}
                    onClick={handleClick}
                    onDelete={handleDelete}
                />
            )}
        </>
    );
};
