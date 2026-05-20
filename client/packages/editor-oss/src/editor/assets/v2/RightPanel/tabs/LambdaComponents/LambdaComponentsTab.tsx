 
import { marked } from "marked";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { MathUtils } from "three";
import { toast } from "toastywave";

import { flexCenter, regularFont } from "../../../../../../assets/style";
import {
    AttachLambdaComponentCommand,
    DetachLambdaComponentCommand,
    UpdateLambdaComponentCommand,
} from "@stem/editor-oss/command/Commands";
import global from "@stem/editor-oss/global";
import type { LambdaComponentData, LambdaConfig } from "../../../../../../lambdas/Lambda";
import { useLambdaData } from "../../../../../lambdas/hooks/lambdas";
import { MarqueeLabel } from "../../../common/MarqueeLabel";
import { StyledButton } from "../../../common/StyledButton";
import { Tooltip } from "../../../common/Tooltip";
import { PanelCheckbox } from "../../common/PanelCheckbox";
import { SelectRow } from "../../common/SelectRow";
import {
    List,
    ListItem,
    ItemDescription,
    SearchWrapper,
    SearchIcon,
    SearchInput,
    NoResults,
} from "../ObjectBehaviors/AllBehaviorsList/AllBehaviorsList.style";
import infoIcon from "../ObjectBehaviors/icons/info.svg";

// --- Lambda Dropdown Selector ---

interface LambdaDropdownProps {
    configs: LambdaConfig[];
    attachedLambdaIds: Set<string>;
    onSelect: (config: LambdaConfig) => void;
    onClose: () => void;
    position: { top: number; left: number };
}

const LambdaDropdown = ({ configs, attachedLambdaIds, onSelect, onClose, position }: LambdaDropdownProps) => {
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const filtered = configs
        .filter(c => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return c.name.toLowerCase().includes(q) || (c.description?.toLowerCase().includes(q) ?? false);
        })
        .sort((a, b) => {
            // Show unattached lambdas first, then attached (disabled) ones
            const aAttached = attachedLambdaIds.has(a.id) ? 1 : 0;
            const bAttached = attachedLambdaIds.has(b.id) ? 1 : 0;
            if (aAttached !== bAttached) return aAttached - bAttached;
            return a.name.localeCompare(b.name);
        });

    return (
        <List ref={ref}
            style={{ position: "fixed", top: position.top, left: position.left }}
        >
            <SearchWrapper>
                <SearchIcon>
                    <svg width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M13 13L9.5 9.5M11 6C11 8.76142 8.76142 11 6 11C3.23858 11 1 8.76142 1 6C1 3.23858 3.23858 1 6 1C8.76142 1 11 3.23858 11 6Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </SearchIcon>
                <SearchInput
                    type="text"
                    placeholder="Search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoFocus
                />
            </SearchWrapper>
            {filtered.length === 0 && <NoResults>No lambdas found</NoResults>}
            {filtered.map(config => {
                const isAttached = attachedLambdaIds.has(config.id);
                return (
                    <ListItem key={config.id}
                        $inactive={isAttached}
                        onClick={() => !isAttached && onSelect(config)}
                    >
                        {config.name}
                        {config.description && 
                            <ItemDescription>
                                <span>{config.description}</span>
                            </ItemDescription>
                        }
                    </ListItem>
                );
            })}
        </List>
    );
};

// --- Component Data Editor ---

interface ComponentDataFieldsProps {
    component: LambdaComponentData;
    schema: Record<string, any>;
    onUpdate: (key: string, value: any) => void;
}

const ComponentDataFields = ({ component, schema, onUpdate }: ComponentDataFieldsProps) => {
    if (!schema || Object.keys(schema).length === 0) {
        return <FieldsEmpty>No configurable fields</FieldsEmpty>;
    }

    return (
        <FieldsContainer>
            {Object.entries(schema)
                .filter(([, fieldSchema]) => fieldSchema.userVisible !== false)
                .map(([key, fieldSchema]) => {
                    const s = fieldSchema as {
                        name?: string;
                        type?: string;
                        min?: number;
                        max?: number;
                        options?: { label: string; value: string }[];
                    };
                    const label = s.name || key;
                    const type = s.type || "string";
                    const value = component.componentData[key];

                    if (type === "enum" && s.options) {
                        const items = s.options.map(opt => ({
                            key: opt.value,
                            value: opt.label,
                        }));
                        const selected = items.find(i => i.key === value);
                        return (
                            <SelectRow
                                key={key}
                                label={label}
                                data={items}
                                value={selected}
                                onChange={item => onUpdate(key, item.key)}
                                width="120px"
                                disableTyping
                            />
                        );
                    }

                    if (type === "boolean") {
                        return (
                            <PanelCheckbox
                                key={key}
                                text={label}
                                checked={!!value}
                                onChange={() => onUpdate(key, !value)}
                                v2
                            />
                        );
                    }

                    if (type === "number") {
                        return (
                            <FieldRow key={key}>
                                <FieldLabel><MarqueeLabel>{label}</MarqueeLabel></FieldLabel>
                                <NumberInput
                                    type="number"
                                    value={value ?? ""}
                                    min={s.min}
                                    max={s.max}
                                    step="any"
                                    onChange={e => {
                                        const num = parseFloat(e.target.value);
                                        if (!isNaN(num)) onUpdate(key, num);
                                    }}
                                />
                            </FieldRow>
                        );
                    }

                    // Default: string input
                    return (
                        <FieldRow key={key}>
                            <FieldLabel><MarqueeLabel>{label}</MarqueeLabel></FieldLabel>
                            <TextInput type="text"
                                value={value ?? ""}
                                onChange={e => onUpdate(key, e.target.value)}
                            />
                        </FieldRow>
                    );
                })}
        </FieldsContainer>
    );
};

// --- Edit Lambda Button ---

interface EditLambdaButtonProps {
    lambdaId: string;
}

const EditLambdaButton = ({ lambdaId }: EditLambdaButtonProps) => {
    const editor = global.app?.editor;
    const assetMeta = editor?.lambdaConfigRegistry?.getAssetMeta(lambdaId);
    const { config, code } = useLambdaData(assetMeta?.assetId ?? lambdaId, assetMeta?.revisionId);

    if (!assetMeta) return null;

    const handleEdit = () => {
        if (!config || code == null) return;
        global.app?.editor?.component?.openCodeEditor({kind: "lambda", id: assetMeta.assetId});
    };

    return (
        <StyledButton isBlue
            width="100%"
            onClick={handleEdit}
            disabled={!config || code == null}
        >
            Edit Lambda
        </StyledButton>
    );
};

const formatFieldDefault = (value: unknown): string => {
    if (typeof value === "string") return `\`${value}\``;
    if (typeof value === "boolean" || typeof value === "number") return `\`${String(value)}\``;
    if (value == null) return "`null`";
    return `\`${JSON.stringify(value)}\``;
};

const formatFieldOptions = (options: unknown): string => {
    if (!Array.isArray(options) || options.length === 0) return "-";

    const first = options[0];
    if (typeof first === "string") {
        return (options as string[]).map(value => `\`${value}\``).join(", ");
    }

    return (options as Array<{label?: string; value?: string}>)
        .map(option => {
            if (option?.label && option?.value) return `\`${option.label}\` (\`${option.value}\`)`;
            return option?.value ? `\`${option.value}\`` : "";
        })
        .filter(Boolean)
        .join(", ");
};

const buildLambdaDocumentation = (config: LambdaConfig | null): string => {
    if (!config) return "";

    const schemaRows = Object.entries(config.componentSchema || {})
        .map(([key, field]) => {
            const type = field?.type || "string";
            return `| \`${key}\` | ${field?.name || key} | \`${type}\` | ${formatFieldDefault(field?.default)} | ${formatFieldOptions(field?.options)} |`;
        })
        .join("\n");

    const attributeRows = Object.entries(config.attributes || {})
        .map(([key, field]) => {
            const type = field?.type || "string";
            return `| \`${key}\` | ${field?.name || key} | \`${type}\` | ${formatFieldDefault(field?.default)} |`;
        })
        .join("\n");

    const sections: string[] = [
        `# ${config.name}`,
        config.description || "No description available.",
        "## Runtime Notes",
        "- **Auto Apply** enabled: lambda is applied every frame after game launch.",
        "- **Auto Apply** disabled: call `lambdaInstance.apply()` (via LambdaManager lookup) from another lambda or behavior.",
    ];

    if (schemaRows) {
        sections.push([
            "## Component Parameters",
            "| Key | Label | Type | Default | Options |",
            "| --- | --- | --- | --- | --- |",
            schemaRows,
        ].join("\n"));
    }

    if (attributeRows) {
        sections.push([
            "## Instance Attributes",
            "| Key | Label | Type | Default |",
            "| --- | --- | --- | --- |",
            attributeRows,
        ].join("\n"));
    }

    return sections.join("\n\n");
};

// --- Main Tab ---

export const LambdaComponentsTab = () => {
    const app = global.app!;
    const editor = app.editor!;
    const [, forceUpdate] = useState({});
    const [isListOpen, setIsListOpen] = useState(false);
    const [expandedUUID, setExpandedUUID] = useState<string | null>(null);
    const [docComponentUUID, setDocComponentUUID] = useState<string | null>(null);
    const [docPanelPosition, setDocPanelPosition] = useState({ top: 0, left: 0 });
    const buttonWrapperRef = useRef<HTMLDivElement>(null);
    const docPanelRef = useRef<HTMLDivElement>(null);
    const docButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    const updateUI = useCallback(() => {
        forceUpdate({});
    }, []);

    useEffect(() => {
        app.on("objectChanged.LambdaComponentsTab", updateUI);
        app.on("objectSelected.LambdaComponentsTab", () => {
            updateUI();
            setExpandedUUID(null);
            setIsListOpen(false);
            setDocComponentUUID(null);
        });

        return () => {
            app.on("objectChanged.LambdaComponentsTab", null);
            app.on("objectSelected.LambdaComponentsTab", null);
        };
    }, [app, updateUI]);

    const selected = editor.selected;
    // Compute view-derived state safely even when selected is missing or
    // multi-selected; useMemo/useEffect below must remain unconditional to
    // satisfy React's rules-of-hooks.
    const hasSingleSelection = !!selected && !Array.isArray(selected);
    const lambdaComponents = (hasSingleSelection
        ? (selected.userData?.lambdaComponents || [])
        : []) as LambdaComponentData[];
    const lambdaConfigs = editor.lambdaConfigRegistry?.getAllConfigs() ?? [];
    const attachedLambdaIds = useMemo(
        () => new Set(lambdaComponents.map(c => c.lambdaId)),
        // lambdaComponents is mutated in place, so use .length to detect changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [lambdaComponents.length],
    );
    const selectedDocComponent = useMemo(
        () => lambdaComponents.find(component => component.uuid === docComponentUUID) || null,
        [lambdaComponents, docComponentUUID],
    );
    const selectedDocConfig = selectedDocComponent
        ? editor.lambdaConfigRegistry?.getConfig(selectedDocComponent.lambdaId) ?? null
        : null;
    const selectedDocMarkdown = useMemo(() => buildLambdaDocumentation(selectedDocConfig), [selectedDocConfig]);
    const selectedDocHtml = useMemo(
        () => {
            if (!selectedDocMarkdown) return "";
            const normalizedMarkdown = selectedDocMarkdown.replace(/\r\n/g, "\n").replace(/\\n/g, "\n");
            return marked.parse(normalizedMarkdown, { gfm: true, breaks: true }) as string;
        },
        [selectedDocMarkdown],
    );

    useEffect(() => {
        if (!docComponentUUID) return;

        const handleClickOutside = (event: MouseEvent) => {
            const activeButton = docButtonRefs.current[docComponentUUID];
            const target = event.target as Node;
            const clickedPanel = !!docPanelRef.current && docPanelRef.current.contains(target);
            const clickedButton = !!activeButton && activeButton.contains(target);

            if (!clickedPanel && !clickedButton) {
                setDocComponentUUID(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [docComponentUUID]);

    if (!hasSingleSelection) return null;

    const handleAddLambda = (config: LambdaConfig) => {
        if (!selected || Array.isArray(selected)) return;

        // Find or create a scene-level lambda instance for this type
        const scene = editor.scene;
        if (!scene.userData.lambdaInstances) {
            scene.userData.lambdaInstances = [];
        }

        const instances = scene.userData.lambdaInstances as Array<{
            lambdaId: string;
            instanceId: string;
            enabled: boolean;
            attributes: Record<string, any>;
        }>;

        let instanceData = instances.find(inst => inst.lambdaId === config.id);

        if (!instanceData) {
            instanceData = {
                lambdaId: config.id,
                instanceId: MathUtils.generateUUID(),
                enabled: true,
                attributes: {},
            };
            instances.push(instanceData);

            // Create runtime instance if lambdaManager is available
            void app.game?.lambdaManager?.createInstance(config.id, {
                uuid: instanceData.instanceId,
                attributes: instanceData.attributes,
            });
        }

        new AttachLambdaComponentCommand(selected, config.id, instanceData.instanceId, {
            componentSchema: config.componentSchema,
        }).execute();

        setIsListOpen(false);
    };

    const handleRemove = (uuid: string) => {
        if (!selected || Array.isArray(selected)) return;

        const result = new DetachLambdaComponentCommand(selected, uuid).execute();
        if (result.status === "success" && expandedUUID === uuid) {
            setExpandedUUID(null);
        }
    };

    const handleToggle = (component: LambdaComponentData) => {
        if (!selected || Array.isArray(selected)) return;

        component.enabled = !component.enabled;

        if (!component.enabled) {
            app.game?.lambdaManager?.deregisterObject(component.instanceId, selected);
        } else {
            app.game?.lambdaManager?.registerObject(component.instanceId, selected, component.componentData);
        }

        app.call("objectChanged", editor, selected);
    };

    const handleUpdateField = (uuid: string, key: string, value: any) => {
        if (!selected || Array.isArray(selected)) return;

        new UpdateLambdaComponentCommand(selected, uuid, { [key]: value }).execute();
    };

    const handleUpdateAutoApply = (uuid: string, autoApply: boolean) => {
        if (!selected || Array.isArray(selected)) return;

        const components = selected.userData?.lambdaComponents as LambdaComponentData[] | undefined;
        if (!components) return;

        const component = components.find(c => c.uuid === uuid);
        if (!component) return;

        component.autoApply = autoApply;
        app.call("objectChanged", editor, selected);
    };

    const handleUpdateCriticality = (uuid: string, isCritical: boolean) => {
        if (!selected || Array.isArray(selected)) return;

        const components = selected.userData?.lambdaComponents as LambdaComponentData[] | undefined;
        if (!components) return;

        const component = components.find(c => c.uuid === uuid);
        if (!component) return;

        // Update criticality flag
        component.isCritical = isCritical;

        // Update runtime lambda if available
        const lambdaManager = app.game?.lambdaManager;
        if (lambdaManager && component.enabled) {
            // Re-register to apply new settings
            lambdaManager.deregisterObject(component.instanceId, selected);
            lambdaManager.registerObject(component.instanceId, selected, component.componentData);
        }

        app.call("objectChanged", editor, selected);
    };

    const getDropdownPosition = () => {
        if (!buttonWrapperRef.current) return { top: 0, left: 0 };
        const rect = buttonWrapperRef.current.getBoundingClientRect();
        return { top: rect.top, left: rect.left - 208 };
    };

    const handleToggleDocPanel = (componentUUID: string) => {
        const button = docButtonRefs.current[componentUUID];
        if (!button) return;

        const rect = button.getBoundingClientRect();
        setDocPanelPosition({
            top: rect.top,
            left: rect.left - 248,
        });
        setDocComponentUUID(prev => prev === componentUUID ? null : componentUUID);
    };

    return (
        <Wrapper>
            <div ref={buttonWrapperRef}>
                <StyledButton isBlue
                    onClick={() => setIsListOpen(!isListOpen)}
                    disabled={lambdaConfigs.length === 0}
                >
                    <PlusIcon>+</PlusIcon> <span>Add Lambda</span>
                </StyledButton>
            </div>

            {isListOpen &&
                createPortal(
                    <LambdaDropdown
                        configs={lambdaConfigs}
                        attachedLambdaIds={attachedLambdaIds}
                        onSelect={handleAddLambda}
                        onClose={() => setIsListOpen(false)}
                        position={getDropdownPosition()}
                    />,
                    document.body,
                )}

            <UsageNote>
                Adding lambdas to an object allows us to simplify lambda initialization with custom parameters.
                If Auto Apply is enabled, lambdas are applied on each frame after game launch. Otherwise, call
                <code> lambdaInstance.apply() </code>
                from another lambda or behavior.
            </UsageNote>

            <ComponentsList>
                {lambdaComponents.map(component => {
                    const config = editor.lambdaConfigRegistry?.getConfig(component.lambdaId) ?? null;
                    const name = config?.name ?? component.lambdaId;
                    const isExpanded = expandedUUID === component.uuid;
                    const hasDocumentation = !!config;

                    return (
                        <div key={component.uuid}>
                            <ComponentItem onClick={() => setExpandedUUID(isExpanded ? null : component.uuid)}>
                                <ComponentName $disabled={!component.enabled}><MarqueeLabel>{name}</MarqueeLabel></ComponentName>
                                <IconsWrapper onClick={e => e.stopPropagation()}>
                                    {hasDocumentation &&
                                        <DocsIconButton
                                            ref={ref => {
                                                docButtonRefs.current[component.uuid] = ref;
                                            }}
                                            onClick={() => handleToggleDocPanel(component.uuid)}
                                            title="Lambda documentation"
                                        >
                                            <img src={infoIcon}
                                                alt="lambda documentation"
                                            />
                                        </DocsIconButton>
                                    }
                                    <DeleteBtn
                                        onClick={() => handleRemove(component.uuid)}
                                        title="Remove lambda component"
                                    >
                                        &times;
                                    </DeleteBtn>
                                    <PanelCheckbox
                                        checked={component.enabled}
                                        onChange={() => handleToggle(component)}
                                        v2
                                    />
                                </IconsWrapper>
                            </ComponentItem>

                            {isExpanded && 
                                <LambdaIdRow
                                    onClick={() => {
                                        void navigator.clipboard.writeText(component.lambdaId);
                                        toast.success("Lambda ID copied");
                                    }}
                                >
                                    {component.lambdaId}
                                </LambdaIdRow>
                            }

                            {isExpanded && 
                                <ThrottleSection>
                                    <ThrottleSectionTitle>
                                        <span>Performance</span>
                                        <Tooltip content="Critical lambdas are never throttled and always update every frame. Use for player controls or physics-critical objects.">
                                            <InfoIcon>ⓘ</InfoIcon>
                                        </Tooltip>
                                    </ThrottleSectionTitle>
                                    <PanelCheckbox
                                        text="Auto Apply"
                                        checked={component.autoApply ?? false}
                                        onChange={() => handleUpdateAutoApply(component.uuid, !component.autoApply)}
                                        v2
                                    />
                                    <PanelCheckbox
                                        text="Critical (Always Update)"
                                        checked={component.isCritical ?? false}
                                        onChange={() => handleUpdateCriticality(component.uuid, !component.isCritical)}
                                        v2
                                    />
                                </ThrottleSection>
                            }

                            {isExpanded && config?.componentSchema && 
                                <ComponentDataFields
                                    component={component}
                                    schema={config.componentSchema}
                                    onUpdate={(key, value) => handleUpdateField(component.uuid, key, value)}
                                />
                            }
                            {isExpanded && 
                                <EditButtonWrapper>
                                    <EditLambdaButton lambdaId={component.lambdaId} />
                                </EditButtonWrapper>
                            }
                        </div>
                    );
                })}
            </ComponentsList>

            {lambdaComponents.length === 0 && <EmptyState>No lambda components attached</EmptyState>}
            {docComponentUUID && selectedDocHtml &&
                createPortal(
                    <DocumentationPanel ref={docPanelRef}
                        style={{
                            position: "fixed",
                            top: docPanelPosition.top,
                            left: docPanelPosition.left,
                        }}
                    >
                        <DocumentationHeader>
                            <DocumentationTitle>Lambda Docs</DocumentationTitle>
                            <DocumentationCloseButton onClick={() => setDocComponentUUID(null)}>
                                &times;
                            </DocumentationCloseButton>
                        </DocumentationHeader>
                        <DocumentationBody dangerouslySetInnerHTML={{__html: selectedDocHtml}} />
                    </DocumentationPanel>,
                    document.body,
                )}
        </Wrapper>
    );
};

// --- Styled Components ---

const Wrapper = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
`;

const PlusIcon = styled.span`
    font-size: 20px;
    font-weight: 400;
    margin-right: 11px;
    line-height: 100%;
    height: 22px;
`;

const ComponentsList = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    row-gap: 4px;
    margin-top: 12px;
`;

const ComponentItem = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
    height: 32px;
    ${regularFont("s")};
    font-weight: var(--theme-font-regular);
    color: #fff;
    background: transparent;
    box-sizing: border-box;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.3s ease-in-out;

    &:hover {
        background: #262626;
        .panelCheckboxWrapper {
            display: inline-block;
        }
    }
`;

const ComponentName = styled.span<{ $disabled: boolean }>`
    color: ${({ $disabled }) => $disabled ? "var(--theme-font-disabled)" : "var(--theme-font-selected-color)"};
    overflow: hidden;
    min-width: 0;
    flex: 1;
`;

const IconsWrapper = styled.div`
    ${flexCenter};
    gap: 8px;
    .panelCheckboxWrapper {
        display: none;
        pointer-events: all;
    }
`;

const DeleteBtn = styled.button`
    background: none;
    border: none;
    color: var(--theme-font-disabled);
    font-size: 16px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;

    &:hover {
        color: #ff4d4d;
    }
`;

const DocsIconButton = styled.button`
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    ${flexCenter};

    img {
        width: 12px;
        height: 12px;
        opacity: 0.7;
    }

    &:hover img {
        opacity: 1;
    }
`;

const LambdaIdRow = styled.div`
    ${regularFont("s")};
    color: #5b6178;
    font-family: monospace;
    font-size: 11px;
    padding: 2px 8px 4px;
    cursor: pointer;
    user-select: all;

    &:hover {
        color: #a1a1aa;
    }
`;

const EditButtonWrapper = styled.div`
    padding: 4px 8px 8px;
`;

const EmptyState = styled.div`
    ${regularFont("s")};
    color: var(--theme-font-disabled);
    text-align: center;
    padding: 16px 8px;
`;

const UsageNote = styled.div`
    ${regularFont("s")};
    color: var(--theme-font-disabled);
    font-size: 11px;
    line-height: 1.35;
    padding: 8px;
    border: 1px solid #ffffff0f;
    border-radius: 8px;
    background: #ffffff08;
    margin-top: 12px;

    code {
        font-size: 11px;
    }
`;

// --- Component Data Editor Styles ---

const FieldsContainer = styled.div`
    padding: 8px 12px;
    margin: 0 8px 8px;
    background: #1a1a1a;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const FieldsEmpty = styled.div`
    ${regularFont("s")};
    color: var(--theme-font-disabled);
    padding: 8px;
    text-align: center;
`;

const FieldRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const FieldLabel = styled.span`
    ${regularFont("s")};
    color: var(--theme-font-unselected-color);
    overflow: hidden;
    min-width: 0;
    flex: 1;
`;

const NumberInput = styled.input`
    width: 80px;
    height: 28px;
    padding: 4px 8px;
    border: 1px solid #ffffff1a;
    border-radius: 6px;
    background: var(--theme-grey-bg);
    ${regularFont("s")};
    color: var(--theme-font-input-color);
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: var(--theme-container-active-blue);
    }
`;

const TextInput = styled.input`
    flex: 1;
    min-width: 0;
    height: 28px;
    padding: 4px 8px;
    border: 1px solid #ffffff1a;
    border-radius: 6px;
    background: var(--theme-grey-bg);
    ${regularFont("s")};
    color: var(--theme-font-input-color);
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: var(--theme-container-active-blue);
    }
`;

// --- Throttle/Performance Section Styles ---

const ThrottleSection = styled.div`
    padding: 8px 12px;
    margin: 0 8px 8px;
    background: #1a1a1a;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const ThrottleSectionTitle = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    ${regularFont("s")};
    color: var(--theme-font-unselected-color);
    font-weight: 500;
`;

const InfoIcon = styled.span`
    color: var(--theme-font-disabled);
    cursor: help;
    font-size: 12px;
`;

const DocumentationPanel = styled.div`
    display: flex;
    flex-direction: column;
    width: 240px;
    height: 360px;
    min-width: 220px;
    min-height: 220px;
    max-width: 70vw;
    max-height: 80vh;
    border-radius: 8px;
    border: 1px solid #2a2a2a;
    background: #111;
    z-index: 1200;
    overflow: hidden;
    resize: both;
`;

const DocumentationHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-bottom: 1px solid #252525;
`;

const DocumentationTitle = styled.div`
    ${regularFont("s")};
    color: #ffffff;
`;

const DocumentationCloseButton = styled.button`
    background: transparent;
    border: none;
    color: var(--theme-font-disabled);
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
`;

const DocumentationBody = styled.div`
    flex: 1;
    min-height: 0;
    padding: 10px;
    overflow: auto;

    * {
        ${regularFont("s")};
        color: #ffffff;
    }

    h1, h2, h3 {
        color: #ffffff;
        margin: 0 0 8px;
        font-size: 12px;
    }

    p, ul {
        margin: 0 0 8px;
    }

    ul {
        padding-left: 16px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin: 4px 0 10px;
    }

    th, td {
        border: 1px solid #2a2a2a;
        padding: 4px 6px;
        font-size: 10px;
        vertical-align: top;
        color: #ffffff;
    }

    code {
        color: #ffffff;
        font-size: 10px;
    }
`;
