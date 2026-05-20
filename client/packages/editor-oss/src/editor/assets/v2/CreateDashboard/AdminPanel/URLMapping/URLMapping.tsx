import {useEffect, useState} from "react";
import {MathUtils} from "three";

import {SingleURL} from "./SingleURL";
import {MAPPING_BASE_PATH, MAPPING_EMPTY_PLACEHOLDER, MAPPING_RESPONSE} from "./types";
import Ajax from "@stem/editor-oss/utils/Ajax";
import {showToast} from "@stem/editor-oss/showToast";
import {backendUrlFromPath} from "@stem/editor-oss/utils/UrlUtils";
import {StyledButton} from "../../../common/StyledButton";
import {AccountBox} from "../../SettingsPage/SettingsPage.style";

export type MappingItem = MAPPING_RESPONSE | MAPPING_EMPTY_PLACEHOLDER;

const createEmptyPlaceholder = (): MAPPING_EMPTY_PLACEHOLDER => ({
    key: "",
    target_url: "",
    tmpId: MathUtils.generateUUID(),
    credential_type: "none",
});

export const URLMapping = () => {
    const [mappings, setMappings] = useState<MappingItem[]>([]);

    useEffect(() => {
        const getMappings = async () => {
            try {
                const response = await Ajax.get({url: backendUrlFromPath(`${MAPPING_BASE_PATH}/Get`)});
                const maps = response?.data;
                if (response?.status !== 200) {
                    showToast({type: "error", body: "Fetching URL Mappings failed."});
                    return;
                } else {
                    if (maps) {
                        setMappings(maps);
                    }
                    console.log("maps", maps);
                }
            } catch (error: any) {
                showToast({type: "error", title: error.response.data});
            }
        };
        getMappings();
    }, []);

    return (
        <AccountBox className="box">
            {mappings.map((item, index) => {
                const isResponse = "id" in item;
                return (
                    <SingleURL
                        key={isResponse ? item.id : item.tmpId}
                        id={isResponse ? item.id : undefined}
                        tmpId={"tmpId" in item ? item.tmpId : undefined}
                        prefix={item.key}
                        target={item.target_url}
                        setMappings={setMappings}
                        index={index}
                        credentialType={isResponse ? (item).credential_type : item.credential_type}
                        basicUsername={isResponse ? (item).basic_username : undefined}
                        apikeyHeader={isResponse ? (item).apikey_header : undefined}
                        hasCredentials={isResponse ? (item).has_credentials : false}
                    />
                );
            })}
            <StyledButton
                isBlue
                onClick={() => setMappings(prev => [...prev, createEmptyPlaceholder()])}
                height="40px"
                width="auto"
                style={{fontSize: "14px"}}
            >
                Add Another URL Mapping
            </StyledButton>
        </AccountBox>
    );
};
