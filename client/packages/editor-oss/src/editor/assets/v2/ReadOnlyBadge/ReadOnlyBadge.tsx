import {useEffect, useState} from "react";
import styled from "styled-components";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {flexCenter, regularFont} from "../../../../assets/style";
import {useAuthorizationContext} from "@stem/editor-oss/context";
import {isStemEditor} from "../../../../editor/stem-editor/isStemEditor";
import global from "@stem/editor-oss/global";
import {EDITOR_TOP_NAV_HEIGHT} from "@stem/editor-oss/types/editor";
import {isTemplateScene} from "@stem/editor-oss/utils/isTemplateScene";
import warningIcon from "../icons/warning.svg";

const Container = styled.div`
    position: absolute;
    top: calc(${EDITOR_TOP_NAV_HEIGHT} + 4px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: auto;
    height: 32px;
    padding: 8px 12px 8px 8px;
    ${flexCenter};
    ${regularFont("s")};
    column-gap: 4px;
    border-radius: 8px;
    border: 1px solid var(--theme-grey-bg);
    background: var(--theme-container-main-dark);
`;

export const ReadOnlyBadge = () => {
    const app = global.app as EngineRuntime;
    const {dbUser, isAdmin, isCollaborator} = useAuthorizationContext();
    const [projectUserId, setProjectUserId] = useState(app.editor?.projectUserId || "");

    useEffect(() => {
        setProjectUserId(app.editor?.projectUserId || "");
        app.on("clear.ReadOnlyBadge", () => {
            setProjectUserId(app.editor?.projectUserId || "");
        });

        return () => {
            app.on("clear.ReadOnlyBadge", null);
        };
    }, []);

    const isTemplate = isTemplateScene(app.editor?.sceneID);

    if (isTemplate) {
        return (
            <Container>
                <img src={warningIcon}
                    alt="warning"
                />
                Template - Read-Only
            </Container>
        );
    }

    const hasStemEditGrant = isStemEditor(app.editor?.scene) && !!app.assetToken;

    if (app.editor && (!projectUserId || dbUser?.id === projectUserId || isCollaborator || hasStemEditGrant)) {
        return null;
    }

    return (
        <Container>
            <img src={warningIcon}
                alt="warning"
            />
            {!isAdmin ? `Read-Only Mode` : `Administrator Mode`}
        </Container>
    );
};
