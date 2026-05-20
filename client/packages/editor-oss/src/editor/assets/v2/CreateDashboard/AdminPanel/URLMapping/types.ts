export type CredentialType = "none" | "basic" | "apikey";

export interface MAPPING_EMPTY_PLACEHOLDER {
    key: string;
    target_url: string;
    tmpId: string;
    credential_type?: CredentialType;
}

export interface MAPPING_RESPONSE {
    id: string;
    key: string;
    target_url: string;
    active: boolean;
    created_at: string;
    updated_at: string;
    credential_type: CredentialType;
    basic_username: string;
    apikey_header: string;
    has_credentials: boolean;
}

export interface MAPPING_POST_BODY {
    key: string;
    target_url: string;
    active: boolean;
    credential_type?: CredentialType;
    basic_username?: string;
    basic_password?: string;
    apikey_header?: string;
    apikey_value?: string;
}

export const MAPPING_BASE_PATH = "/api/internal/api-mappings";
