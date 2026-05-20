import React, {useState} from "react";

import checkIcon from "./icons/check.svg";
import deleteIcon from "./icons/trash.svg";
import xIcon from "./icons/x.svg";
import {CredentialType, MAPPING_BASE_PATH, MAPPING_POST_BODY} from "./types";
import {MappingItem} from "./URLMapping";
import {
    IconBtn,
    Field,
    URLRow,
    EditWrapper,
    MappingWrapper,
    CredentialSection,
    CredentialBadge,
    StyledSelect,
} from "./URLMapping.style";
import {showToast} from "@stem/editor-oss/showToast";
import Ajax from "@stem/editor-oss/utils/Ajax";
import {backendUrlFromPath} from "@stem/editor-oss/utils/UrlUtils";
import {TextInput} from "../../../common/TextInput";

interface Props {
    prefix: string;
    target: string;
    id?: string;
    tmpId?: string;
    setMappings: React.Dispatch<React.SetStateAction<MappingItem[]>>;
    index: number;
    credentialType?: CredentialType;
    basicUsername?: string;
    apikeyHeader?: string;
    hasCredentials?: boolean;
}

export const SingleURL = ({
    prefix,
    target,
    id,
    setMappings,
    tmpId,
    credentialType = "none",
    basicUsername = "",
    apikeyHeader = "",
    hasCredentials = false,
}: Props) => {
    const [prefixInput, setPrefixInput] = useState(prefix);
    const [targetInput, setTargetInput] = useState(target);
    const [isEditing, setIsEditing] = useState(false);

    const [credType, setCredType] = useState<CredentialType>(credentialType);
    const [basicUser, setBasicUser] = useState(basicUsername);
    const [basicPass, setBasicPass] = useState("");
    const [keyHeader, setKeyHeader] = useState(apikeyHeader || "X-API-Key");
    const [keyValue, setKeyValue] = useState("");

    const deleteMap = async () => {
        if (id) {
            try {
                const response = await Ajax.ajaxDelete({
                    url: backendUrlFromPath(`${MAPPING_BASE_PATH}/Delete?key=${prefix}`),
                    msgBodyType: "json",
                });

                if (response?.status === 200) {
                    setMappings(prev => prev.filter((el: any) => el.id !== id));
                }
            } catch (error: any) {
                showToast({type: "error", title: error.response.data});
            }
        } else {
            setMappings(prev => prev.filter((el: any) => el.tmpId !== tmpId));
        }
    };

    const cancelEdit = () => {
        setPrefixInput(prefix);
        setTargetInput(target);
        setCredType(credentialType);
        setBasicUser(basicUsername);
        setBasicPass("");
        setKeyHeader(apikeyHeader || "X-API-Key");
        setKeyValue("");
        setIsEditing(false);
    };

    const saveMapping = async () => {
        const data: MAPPING_POST_BODY = {
            active: true,
            target_url: targetInput,
            key: prefixInput,
            credential_type: credType,
        };

        if (credType === "basic") {
            data.basic_username = basicUser;
            if (basicPass) data.basic_password = basicPass;
        } else if (credType === "apikey") {
            data.apikey_header = keyHeader;
            if (keyValue) data.apikey_value = keyValue;
        }

        if (id) {
            try {
                await Ajax.put({
                    url: backendUrlFromPath(`${MAPPING_BASE_PATH}/Put?key=${prefix}`),
                    data: JSON.stringify(data),
                    msgBodyType: "json",
                });
                showToast({type: "success", title: "Updated!"});
            } catch (error: any) {
                showToast({type: "error", title: error.response.data});
            }
        } else {
            try {
                await Ajax.post({
                    url: backendUrlFromPath(`${MAPPING_BASE_PATH}/Post`),
                    data: JSON.stringify(data),
                    msgBodyType: "json",
                });
                showToast({type: "success", title: "Created!"});
            } catch (error: any) {
                showToast({type: "error", title: error.response.data});
            }
        }
        setIsEditing(false);
    };

    const canSave = prefixInput.trim() !== "" && targetInput.trim() !== "";

    return (
        <MappingWrapper>
            <URLRow>
                <Field>
                    <label>Prefix</label>
                    <TextInput
                        disabled={!!id}
                        placeholder="develop-erth"
                        value={prefixInput}
                        setValue={value => {
                            setPrefixInput(value);
                            setIsEditing(true);
                        }}
                    />
                </Field>
                <Field>
                    <label>
                        Target
                        {!isEditing && hasCredentials && (
                            <CredentialBadge>
                                {credentialType === "basic" ? "Basic Auth" : "API Key"}
                            </CredentialBadge>
                        )}
                    </label>
                    <TextInput
                        placeholder="api.develop.erth.xyz"
                        value={targetInput}
                        setValue={value => {
                            setTargetInput(value);
                            setIsEditing(true);
                        }}
                    />
                </Field>

                {isEditing && (
                    <EditWrapper>
                        <IconBtn className="reset-css" onClick={cancelEdit}>
                            <img src={xIcon} alt="cancel" />
                        </IconBtn>
                        <IconBtn
                            className="reset-css"
                            onClick={saveMapping}
                            disabled={!canSave}
                            style={{opacity: canSave ? 1 : 0.5}}
                        >
                            <img src={checkIcon} alt="save" />
                        </IconBtn>
                    </EditWrapper>
                )}
                <IconBtn
                    className="reset-css"
                    onClick={deleteMap}
                    $isEditing={isEditing}
                    disabled={isEditing}
                >
                    <img src={deleteIcon} alt="delete" />
                </IconBtn>
            </URLRow>

            {isEditing && (
                <CredentialSection>
                    <Field>
                        <label>Auth Type</label>
                        <StyledSelect
                            value={credType}
                            onChange={e => {
                                setCredType(e.target.value as CredentialType);
                                setIsEditing(true);
                            }}
                        >
                            <option value="none">None</option>
                            <option value="basic">Basic Auth</option>
                            <option value="apikey">API Key</option>
                        </StyledSelect>
                    </Field>

                    {credType === "basic" && (
                        <>
                            <Field>
                                <label>Username</label>
                                <TextInput
                                    placeholder="username"
                                    value={basicUser}
                                    setValue={value => {
                                        setBasicUser(value);
                                        setIsEditing(true);
                                    }}
                                />
                            </Field>
                            <Field>
                                <label>Password</label>
                                <input
                                    type="password"
                                    placeholder={hasCredentials && credentialType === "basic" ? "........" : "password"}
                                    value={basicPass}
                                    onChange={e => {
                                        setBasicPass(e.target.value);
                                        setIsEditing(true);
                                    }}
                                />
                            </Field>
                        </>
                    )}

                    {credType === "apikey" && (
                        <>
                            <Field>
                                <label>Header Name</label>
                                <TextInput
                                    placeholder="X-API-Key"
                                    value={keyHeader}
                                    setValue={value => {
                                        setKeyHeader(value);
                                        setIsEditing(true);
                                    }}
                                />
                            </Field>
                            <Field>
                                <label>API Key</label>
                                <input
                                    type="password"
                                    placeholder={hasCredentials && credentialType === "apikey" ? "........" : "api key value"}
                                    value={keyValue}
                                    onChange={e => {
                                        setKeyValue(e.target.value);
                                        setIsEditing(true);
                                    }}
                                />
                            </Field>
                        </>
                    )}
                </CredentialSection>
            )}
        </MappingWrapper>
    );
};
