import I18n from "i18next";
import {useEffect, useRef, useState} from "react";
import styled from "styled-components";
import {useOnClickOutside} from "usehooks-ts";

import {AssetsListLegacy} from "./AssetsListLegacy";
import {StyledButton} from "./StyledButton";
import {flexCenter, regularFont} from "../../../../assets/style";
import {showToast} from "@stem/editor-oss/showToast";
import Ajax from "@stem/editor-oss/utils/Ajax";
import {backendUrlFromPath} from "@stem/editor-oss/utils/UrlUtils";
import closeIcon from "../icons/close-panel.svg";
import {FileData} from "../types/file";
import {useEscapeDismiss} from "./hooks/useEscapeDismiss";

export const Container = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    width: 682px;
    height: 610px;
    padding: 16px 0px 32px;

    background: var(--theme-dialog-bg);
    border: none;
    border-radius: var(--theme-dialog-border-radius);
    box-shadow: var(--theme-dialog-shadow);
    color: var(--theme-font-main-selected-color);

    ${flexCenter};
    flex-direction: column;
    justify-content: flex-start;
    row-gap: 30px;

    .title {
        width: 100%;
        ${regularFont("s")};
        text-align: center;
    }
`;

export const CloseBtn = styled.button`
    position: absolute;
    right: 16px;
    top: 16px;

    img {
        width: 13px;
        height: auto;
    }
`;

const Wrapper = styled.div`
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 20px;

    .assets-list {
        width: 100%;
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
        gap: 30px;
        padding: 0 25px;
        flex-wrap: wrap;
        max-height: 387px;
        min-height: 387px;
        overflow-y: auto;
        box-sizing: border-box;
    }

    .assets-item {
        display: flex;
        flex-direction: column;
        gap: 9px;
        align-items: center;
        justify-content: center;
        width: fit-content;
        color: #fff;
        font-size: var(--theme-font-size-s);
        font-weight: var(--theme-font-regular);
        position: relative;
        cursor: pointer;
        box-sizing: border-box;
        padding-bottom: 20px;
    }

    .assets-item .assets-item-name {
        display: inline-block;
        max-width: 132px;
        text-align: left;
        overflow: hidden;
        white-space: wrap;
        word-break: break-word;
    }

    .assets-item img {
        border-radius: 24px;
        width: 132px;
        height: 132px;
    }

    .assets-item .select-border {
        border-radius: 24px;
        width: 132px;
        height: 132px;
        border: 2px solid #ffffff;
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
    }

    .assets-list::-webkit-scrollbar-track {
        border-radius: 0;
        background: var(--theme-container-secondary-dark);
    }

    .assets-list::-webkit-scrollbar-thumb {
        border-radius: 0px;
        background-color: var(--theme-scroll-list-thumb);
    }

    .assets-item-menu {
        display: none;
    }
`;

const SearchSection = styled.div`
    width: 100%;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;

    .search-input {
        width: 287px;
        height: 28px;
        border: none;
        background: none;
        box-sizing: border-box;
        border-radius: 8px;
        background: var(--theme-container-secondary-dark);
        padding: 0 32px;
        font-size: var(--theme-font-size-s);
        font-weight: var(--theme-font-regular);
        line-height: 19px;
        text-align: left;
        color: var(--theme-font-main-selected-color);
    }
`;

type Props = {
    onClose: () => void;
    onApprove?: (id: FileData) => void;
};

export const TexturesModal = ({onClose, onApprove}: Props) => {
    const ref = useRef<HTMLDivElement>(null);
    const [selectedId, setSelectedId] = useState<string>("");
    const [search, setSearch] = useState("");
    const [data, setData] = useState<FileData[]>([]);
    const [filteredData, setFilteredData] = useState<FileData[]>([]);

    useOnClickOutside(ref as any, onClose);
    useEscapeDismiss({onEscape: onClose});

    const fetchData = () => {
        Ajax.get({url: backendUrlFromPath(`/api/Map/List`)}).then(response => {
            const obj = response?.data;
            if (obj.Code !== 200) {
                showToast({type: "warning", body: I18n.t(obj.Msg)});
                return;
            }
            setData(obj.Data);
        });
    };

    const handleSave = () => {
        const texture = data.find(n => n.ID === selectedId);
        if (texture) {
            if (onApprove) onApprove(texture);
            onClose();
        }
    };

    useEffect(() => {
        if (!search) {
            setFilteredData(data);
            return;
        } else {
            setFilteredData(
                data?.filter(n => {
                    return n.Name.toLowerCase().indexOf(search.toLowerCase()) > -1;
                }),
            );
        }
    }, [search, data]);

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <Container ref={ref}>
            <div className="title">
                Textures
                <CloseBtn className="reset-css" onClick={onClose}>
                    <img src={closeIcon} alt="close" />
                </CloseBtn>
            </div>
            <Wrapper>
                <SearchSection>
                    <input
                        className="search-input"
                        type="text"
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search"
                    />
                </SearchSection>
                {filteredData && filteredData.length > 0 ? (
                    <AssetsListLegacy
                        data={filteredData.map(d => ({...d, Type: d.Type ?? ""}))}
                        selectedItemsIds={[selectedId]}
                        onClick={id => setSelectedId(id)}
                    />
                ) : (
                    <div className="no-data">
                        <div className="description">No saved projects yet. Click New to get started</div>
                    </div>
                )}
            </Wrapper>
            <StyledButton isBlue style={{width: "200px", height: "32px"}} onClick={handleSave} disabled={!selectedId}>
                Save
            </StyledButton>
        </Container>
    );
};
