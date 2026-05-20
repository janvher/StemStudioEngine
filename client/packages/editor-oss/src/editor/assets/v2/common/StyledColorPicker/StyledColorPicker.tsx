import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import ColorPicker from "react-best-gradient-color-picker";

import xIcon from "./icons/x-mark.svg";
import {ColorPickerWrapper, Label} from "./StyledColorPicker.style";
import global from "@stem/editor-oss/global";
import {rgbToHex} from "../../../../../v2/pages/services";
import {COLOR_PALETTES, DEFAULT_COLOR_PALETTE} from "../../RightPanel/panels/ProjectSettings/ColorPaletteSection";

const CUSTOM_SHORTCUTS_KEY = "erth-custom-color-shortcuts";
const LEGACY_CUSTOM_PICKS_KEY = "erth-custom-color-picks";
const MAX_SHORTCUTS = 18;
const PICKER_ID_SUFFIX = "erth-picker";

interface StoredCustomShortcuts {
    overrides: Record<number, string>;
    fifoIndex: number;
}

/**
 *
 * @param value
 */
function normalizeToRgba(value: string): string | null {
    const color = value.trim();

    const rgbaMatch = color.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d*\.?\d+))?\s*\)/i);
    if (rgbaMatch && rgbaMatch[1] && rgbaMatch[2] && rgbaMatch[3]) {
        const r = Math.min(255, Math.max(0, parseInt(rgbaMatch[1], 10)));
        const g = Math.min(255, Math.max(0, parseInt(rgbaMatch[2], 10)));
        const b = Math.min(255, Math.max(0, parseInt(rgbaMatch[3], 10)));
        const parsedAlpha = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
        const alpha = Number.isFinite(parsedAlpha) ? Math.min(1, Math.max(0, parsedAlpha)) : 1;
        const formattedAlpha = Number(alpha.toFixed(3)).toString();
        return `rgba(${r}, ${g}, ${b}, ${formattedAlpha})`;
    }

    const hexMatch = color.match(/^#([a-f\d]{3}|[a-f\d]{6})$/i);
    if (hexMatch && hexMatch[1]) {
        const hex = hexMatch[1];
        const normalizedHex = hex.length === 3 ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}` : hex;
        const r = parseInt(normalizedHex.substring(0, 2), 16);
        const g = parseInt(normalizedHex.substring(2, 4), 16);
        const b = parseInt(normalizedHex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, 1)`;
    }

    return null;
}

/**
 *
 * @param value
 */
function rgbaToHex(value: string): string | null {
    const rgbaMatch = value.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
    if (!rgbaMatch || !rgbaMatch[1] || !rgbaMatch[2] || !rgbaMatch[3]) {
        return null;
    }
    const r = Math.min(255, Math.max(0, parseInt(rgbaMatch[1], 10)));
    const g = Math.min(255, Math.max(0, parseInt(rgbaMatch[2], 10)));
    const b = Math.min(255, Math.max(0, parseInt(rgbaMatch[3], 10)));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 *
 * @param paletteSize
 */
function getStoredCustomShortcuts(paletteSize: number): StoredCustomShortcuts {
    const sanitizedSize = Math.max(1, Math.min(MAX_SHORTCUTS, paletteSize || MAX_SHORTCUTS));
    try {
        const stored = localStorage.getItem(CUSTOM_SHORTCUTS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as {overrides?: Record<string, string>; fifoIndex?: number};
            const parsedOverrides = parsed?.overrides ?? {};
            const normalizedOverrides: Record<number, string> = {};

            Object.entries(parsedOverrides).forEach(([index, color]) => {
                const slot = Number(index);
                const normalized = normalizeToRgba(color);
                if (Number.isInteger(slot) && slot >= 0 && slot < sanitizedSize && normalized) {
                    normalizedOverrides[slot] = normalized;
                }
            });

            const nextFifo = Number.isInteger(parsed?.fifoIndex) ? (parsed.fifoIndex as number) : 0;
            return {
                overrides: normalizedOverrides,
                fifoIndex: ((nextFifo % sanitizedSize) + sanitizedSize) % sanitizedSize,
            };
        }

        // Migrate legacy custom picks into the first N slots.
        const legacy = localStorage.getItem(LEGACY_CUSTOM_PICKS_KEY);
        if (legacy) {
            const parsedLegacy = JSON.parse(legacy) as string[];
            if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
                const normalizedOverrides: Record<number, string> = {};
                parsedLegacy.slice(0, sanitizedSize).forEach((pick, index) => {
                    const normalized = normalizeToRgba(pick);
                    if (normalized) {
                        normalizedOverrides[index] = normalized;
                    }
                });
                return {
                    overrides: normalizedOverrides,
                    fifoIndex: parsedLegacy.length % sanitizedSize,
                };
            }
        }
    } catch {
        // Ignore invalid localStorage payloads.
    }

    return {
        overrides: {},
        fifoIndex: 0,
    };
}

/**
 *
 * @param state
 * @param paletteSize
 */
function saveCustomShortcuts(state: StoredCustomShortcuts, paletteSize: number) {
    const sanitizedSize = Math.max(1, Math.min(MAX_SHORTCUTS, paletteSize || MAX_SHORTCUTS));
    const normalizedOverrides: Record<number, string> = {};

    Object.entries(state.overrides).forEach(([index, color]) => {
        const slot = Number(index);
        const normalized = normalizeToRgba(color);
        if (Number.isInteger(slot) && slot >= 0 && slot < sanitizedSize && normalized) {
            normalizedOverrides[slot] = normalized;
        }
    });

    const payload: StoredCustomShortcuts = {
        overrides: normalizedOverrides,
        fifoIndex: ((state.fifoIndex % sanitizedSize) + sanitizedSize) % sanitizedSize,
    };

    localStorage.setItem(CUSTOM_SHORTCUTS_KEY, JSON.stringify(payload));
    localStorage.removeItem(LEGACY_CUSTOM_PICKS_KEY);
}

/**
 *
 */
function getActivePalette(): string[] {
    const name = (global as any).app?.editor?.scene?.userData?.colorPalette || DEFAULT_COLOR_PALETTE;
    return COLOR_PALETTES[name] ?? COLOR_PALETTES[DEFAULT_COLOR_PALETTE] ?? [];
}

interface Props {
    color: string;
    setColor: (value: string) => void;
    setAlpha?: (value: number) => void;
    hide: () => void;
    hideAlpha?: boolean;
    className?: string;
    customPresets?: string[];
}

export const getDefaultHexColor = (color: string) => {
    if (color.startsWith("#")) {
        return color;
    } else {
        return rgbToHex(color);
    }
};

/**
 *
 * @param root0
 * @param root0.color
 * @param root0.setColor
 * @param root0.hide
 * @param root0.hideAlpha
 * @param root0.className
 * @param root0.customPresets
 */
export default function StyledColorPicker({color, setColor, hide, hideAlpha, className, customPresets}: Props) {
    const [currentColor, setCurrentColor] = useState(getDefaultHexColor(color));
    const colorPickerRef = useRef<HTMLDivElement>(null);
    const skipNextCloseCommitRef = useRef(false);
    const basePalette = useMemo(() => getActivePalette().slice(0, MAX_SHORTCUTS), []);
    const paletteSize = basePalette.length > 0 ? basePalette.length : MAX_SHORTCUTS;
    const [shortcutState, setShortcutState] = useState<StoredCustomShortcuts>(() =>
        getStoredCustomShortcuts(paletteSize),
    );
    const [selectedShortcutIndex, setSelectedShortcutIndex] = useState<number | null>(null);

    const {overrides, fifoIndex} = shortcutState;

    const activePresets = useMemo(() => {
        return basePalette.map((paletteColor, index) => {
            return overrides[index] ?? paletteColor;
        });
    }, [basePalette, overrides]);

    const hasCustomShortcuts = Object.keys(overrides).length > 0;

    const updateShortcutSlot = useCallback(
        (slot: number, normalized: string) => {
            if (slot < 0 || slot >= activePresets.length) {
                return;
            }

            setShortcutState(prev => {
                const nextOverrides = {...prev.overrides};
                if (basePalette[slot] === normalized) {
                    delete nextOverrides[slot];
                } else {
                    nextOverrides[slot] = normalized;
                }

                const nextState: StoredCustomShortcuts = {
                    overrides: nextOverrides,
                    fifoIndex: (slot + 1) % activePresets.length,
                };
                saveCustomShortcuts(nextState, activePresets.length);
                return nextState;
            });
        },
        [activePresets.length, basePalette],
    );

    const commitColorToShortcut = useCallback(() => {
        const normalized = normalizeToRgba(currentColor);
        if (!normalized || activePresets.length === 0) {
            return;
        }

        // No-op if the color already exists in shortcuts.
        if (activePresets.includes(normalized)) {
            return;
        }

        const targetSlot = ((fifoIndex % activePresets.length) + activePresets.length) % activePresets.length;
        if (targetSlot < 0 || targetSlot >= activePresets.length) {
            return;
        }

        updateShortcutSlot(targetSlot, normalized);
    }, [activePresets, currentColor, fifoIndex, updateShortcutSlot]);

    const closePicker = useCallback(() => {
        if (skipNextCloseCommitRef.current) {
            skipNextCloseCommitRef.current = false;
        } else if (selectedShortcutIndex !== null) {
            // Active manual target slot already updates in real-time.
        } else {
            commitColorToShortcut();
        }
        hide();
    }, [commitColorToShortcut, hide, selectedShortcutIndex]);

    useEffect(() => {
        /**
         *
         * @param event
         */
        function handleClickOutside(event: MouseEvent) {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
                const inputs = colorPickerRef.current?.querySelectorAll("input");
                if (inputs.length > 0) {
                    inputs.forEach(input => {
                        input.blur();
                    });
                }
                closePicker();
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [closePicker]);

    useEffect(() => {
        /**
         *
         * @param event
         */
        function handlePresetTargetSelection(event: MouseEvent) {
            if (!event.shiftKey || !colorPickerRef.current) {
                return;
            }

            const target = event.target as HTMLElement | null;
            if (!target) {
                return;
            }

            const presetEl = target.closest<HTMLElement>(`[id^="rbgcp-preset-"][id$="${PICKER_ID_SUFFIX}"]`);
            if (!presetEl) {
                return;
            }

            const match = presetEl.id.match(/^rbgcp-preset-(\d+)/);
            if (!match || !match[1]) {
                return;
            }

            const slot = parseInt(match[1], 10);
            if (Number.isNaN(slot) || slot < 0 || slot >= activePresets.length) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const normalized = normalizeToRgba(currentColor);
            if (!normalized) {
                return;
            }

            setSelectedShortcutIndex(prev => (prev === slot ? null : slot));
            updateShortcutSlot(slot, normalized);

            skipNextCloseCommitRef.current = true;
        }

        const root = colorPickerRef.current;
        if (!root) {
            return;
        }
        root.addEventListener("click", handlePresetTargetSelection, true);
        return () => {
            root.removeEventListener("click", handlePresetTargetSelection, true);
        };
    }, [activePresets.length, currentColor, updateShortcutSlot]);

    const handleColorChange = (newColor: string) => {
        setCurrentColor(newColor);
        const normalized = normalizeToRgba(newColor);
        if (normalized && selectedShortcutIndex !== null) {
            updateShortcutSlot(selectedShortcutIndex, normalized);
        }

        if (newColor.startsWith("rgba") || newColor.startsWith("rgb")) {
            const hex = rgbaToHex(newColor);
            if (hex) {
                setColor(hex);
                return;
            }
        }
        setColor(newColor);
    };

    return (
        <ColorPickerWrapper
            ref={colorPickerRef}
            className={`${className} colorPickerWrapper`}
        >
            <Label>
                Color Picker
                <button
                    className="reset-css"
                    onClick={closePicker}
                >
                    <img
                        src={xIcon}
                        alt="close"
                    />
                </button>
            </Label>
            {hasCustomShortcuts && (
                <button
                    className="reset-css"
                    style={{
                        fontSize: "10px",
                        color: "#888",
                        textDecoration: "underline",
                        cursor: "pointer",
                        padding: "0 0 2px",
                        alignSelf: "flex-end",
                    }}
                    onClick={() => {
                        const resetState: StoredCustomShortcuts = {overrides: {}, fifoIndex: 0};
                        setShortcutState(resetState);
                        setSelectedShortcutIndex(null);
                        saveCustomShortcuts(resetState, activePresets.length);
                    }}
                >
                    Reset to palette
                </button>
            )}
            <div className="pickerContainer">
                <ColorPicker
                    value={currentColor}
                    onChange={handleColorChange}
                    hideGradientControls
                    hideGradientType
                    hideGradientAngle
                    hideGradientStop
                    hideColorTypeBtns
                    hideAdvancedSliders
                    hideColorGuide
                    hideInputType
                    hideOpacity={hideAlpha}
                    idSuffix={PICKER_ID_SUFFIX}
                    presets={customPresets || activePresets}
                    width={204}
                    height={150}
                />
            </div>
        </ColorPickerWrapper>
    );
}
