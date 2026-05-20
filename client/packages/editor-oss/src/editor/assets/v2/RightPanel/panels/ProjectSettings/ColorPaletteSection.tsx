import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";

import arrow from "../../icons/arrow-down.svg";

// Each palette: 18 colors as rgba strings (format required by react-best-gradient-color-picker)
// Structure: 5 base + 5 complementary (opposite hue) + 5 tints (lighter) + 3 shades (darker)
export const COLOR_PALETTES: Record<string, string[]> = {
    "Neon Carnival": [
        // Base
        "rgba(255, 215, 0, 1)",     // Gold
        "rgba(255, 99, 71, 1)",     // Tomato
        "rgba(138, 43, 226, 1)",    // Blue Violet
        "rgba(0, 191, 255, 1)",     // Deep Sky Blue
        "rgba(255, 105, 180, 1)",   // Hot Pink
        // Complementary
        "rgba(0, 40, 255, 1)",      // Royal Blue
        "rgba(0, 225, 184, 1)",     // Turquoise
        "rgba(131, 226, 43, 1)",    // Yellow Green
        "rgba(255, 64, 0, 1)",      // Vermillion
        "rgba(0, 200, 120, 1)",     // Emerald
        // Tints
        "rgba(255, 233, 102, 1)",   // Light Gold
        "rgba(255, 161, 145, 1)",   // Light Coral
        "rgba(184, 127, 238, 1)",   // Light Violet
        "rgba(102, 216, 255, 1)",   // Light Sky
        "rgba(255, 168, 210, 1)",   // Light Pink
        // Shades
        "rgba(153, 129, 0, 1)",     // Dark Gold
        "rgba(153, 59, 43, 1)",     // Dark Red
        "rgba(83, 26, 136, 1)",     // Dark Violet
    ],
    "Chrome Rain": [
        // Base
        "rgba(255, 20, 147, 1)",    // Deep Pink
        "rgba(0, 255, 127, 1)",     // Spring Green
        "rgba(30, 144, 255, 1)",    // Dodger Blue
        "rgba(255, 140, 0, 1)",     // Dark Orange
        "rgba(47, 79, 79, 1)",      // Dark Slate Gray
        // Complementary
        "rgba(20, 255, 128, 1)",    // Mint
        "rgba(255, 0, 128, 1)",     // Rose
        "rgba(255, 171, 30, 1)",    // Amber
        "rgba(0, 115, 255, 1)",     // Azure
        "rgba(208, 176, 176, 1)",   // Dusty Rose
        // Tints
        "rgba(255, 114, 189, 1)",   // Light Pink
        "rgba(102, 255, 178, 1)",   // Light Mint
        "rgba(120, 188, 255, 1)",   // Light Blue
        "rgba(255, 186, 102, 1)",   // Light Amber
        "rgba(128, 150, 150, 1)",   // Light Slate
        // Shades
        "rgba(153, 12, 88, 1)",     // Dark Pink
        "rgba(0, 153, 76, 1)",      // Dark Green
        "rgba(18, 86, 153, 1)",     // Dark Blue
    ],
    "Ember & Amethyst": [
        // Base
        "rgba(139, 69, 19, 1)",     // Saddle Brown
        "rgba(255, 215, 0, 1)",     // Gold
        "rgba(106, 90, 205, 1)",    // Slate Blue
        "rgba(255, 69, 0, 1)",      // Orange Red
        "rgba(240, 230, 140, 1)",   // Khaki
        // Complementary
        "rgba(19, 89, 139, 1)",     // Steel Blue
        "rgba(0, 40, 255, 1)",      // Royal Blue
        "rgba(199, 205, 90, 1)",    // Yellow Green
        "rgba(0, 186, 255, 1)",     // Cyan
        "rgba(140, 150, 240, 1)",   // Periwinkle
        // Tints
        "rgba(184, 143, 113, 1)",   // Light Brown
        "rgba(255, 233, 102, 1)",   // Light Gold
        "rgba(168, 156, 226, 1)",   // Light Lavender
        "rgba(255, 143, 102, 1)",   // Light Orange
        "rgba(246, 240, 186, 1)",   // Light Khaki
        // Shades
        "rgba(83, 41, 11, 1)",      // Dark Brown
        "rgba(153, 129, 0, 1)",     // Dark Gold
        "rgba(64, 54, 123, 1)",     // Dark Slate
    ],
    "Void Signal": [
        // Base
        "rgba(30, 30, 30, 1)",      // Near Black
        "rgba(0, 191, 255, 1)",     // Deep Sky Blue
        "rgba(255, 69, 0, 1)",      // Orange Red
        "rgba(255, 215, 0, 1)",     // Gold
        "rgba(138, 43, 226, 1)",    // Blue Violet
        // Complementary
        "rgba(225, 225, 225, 1)",   // Near White
        "rgba(255, 64, 0, 1)",      // Vermillion
        "rgba(0, 186, 255, 1)",     // Cyan
        "rgba(0, 40, 255, 1)",      // Royal Blue
        "rgba(131, 226, 43, 1)",    // Yellow Green
        // Tints
        "rgba(120, 120, 120, 1)",   // Medium Gray
        "rgba(102, 216, 255, 1)",   // Light Sky
        "rgba(255, 143, 102, 1)",   // Light Orange
        "rgba(255, 233, 102, 1)",   // Light Gold
        "rgba(184, 127, 238, 1)",   // Light Violet
        // Shades
        "rgba(0, 115, 153, 1)",     // Dark Cyan
        "rgba(153, 41, 0, 1)",      // Dark Red
        "rgba(83, 26, 136, 1)",     // Dark Violet
    ],
    "Sugar Rush": [
        // Base
        "rgba(255, 105, 180, 1)",   // Hot Pink
        "rgba(0, 255, 255, 1)",     // Cyan
        "rgba(255, 215, 0, 1)",     // Gold
        "rgba(255, 99, 71, 1)",     // Tomato
        "rgba(138, 43, 226, 1)",    // Blue Violet
        // Complementary
        "rgba(0, 200, 120, 1)",     // Emerald
        "rgba(255, 0, 0, 1)",       // Red
        "rgba(0, 40, 255, 1)",      // Royal Blue
        "rgba(0, 225, 184, 1)",     // Turquoise
        "rgba(131, 226, 43, 1)",    // Yellow Green
        // Tints
        "rgba(255, 168, 210, 1)",   // Light Pink
        "rgba(102, 255, 255, 1)",   // Light Cyan
        "rgba(255, 233, 102, 1)",   // Light Gold
        "rgba(255, 161, 145, 1)",   // Light Coral
        "rgba(184, 127, 238, 1)",   // Light Violet
        // Shades
        "rgba(153, 63, 108, 1)",    // Dark Pink
        "rgba(0, 153, 153, 1)",     // Dark Cyan
        "rgba(153, 129, 0, 1)",     // Dark Gold
    ],
    "Primal Forge": [
        // Base
        "rgba(255, 69, 0, 1)",      // Orange Red
        "rgba(30, 144, 255, 1)",    // Dodger Blue
        "rgba(50, 205, 50, 1)",     // Lime Green
        "rgba(255, 215, 0, 1)",     // Gold
        "rgba(139, 0, 139, 1)",     // Dark Magenta
        // Complementary
        "rgba(0, 186, 255, 1)",     // Cyan
        "rgba(255, 141, 30, 1)",    // Amber
        "rgba(205, 50, 205, 1)",    // Orchid
        "rgba(0, 40, 255, 1)",      // Royal Blue
        "rgba(0, 139, 0, 1)",       // Green
        // Tints
        "rgba(255, 143, 102, 1)",   // Light Orange
        "rgba(120, 188, 255, 1)",   // Light Blue
        "rgba(140, 225, 140, 1)",   // Light Green
        "rgba(255, 233, 102, 1)",   // Light Gold
        "rgba(184, 102, 184, 1)",   // Light Magenta
        // Shades
        "rgba(153, 41, 0, 1)",      // Dark Red
        "rgba(18, 86, 153, 1)",     // Dark Blue
        "rgba(30, 123, 30, 1)",     // Dark Green
    ],
    "Velvet Abyss": [
        // Base
        "rgba(75, 0, 130, 1)",      // Indigo
        "rgba(138, 43, 226, 1)",    // Blue Violet
        "rgba(0, 255, 255, 1)",     // Cyan
        "rgba(255, 20, 147, 1)",    // Deep Pink
        "rgba(47, 79, 79, 1)",      // Dark Slate Gray
        // Complementary
        "rgba(130, 180, 0, 1)",     // Olive Green
        "rgba(131, 226, 43, 1)",    // Yellow Green
        "rgba(255, 0, 0, 1)",       // Red
        "rgba(20, 255, 128, 1)",    // Mint
        "rgba(208, 176, 176, 1)",   // Dusty Rose
        // Tints
        "rgba(147, 102, 180, 1)",   // Light Indigo
        "rgba(184, 127, 238, 1)",   // Light Violet
        "rgba(102, 255, 255, 1)",   // Light Cyan
        "rgba(255, 114, 189, 1)",   // Light Pink
        "rgba(128, 150, 150, 1)",   // Light Slate
        // Shades
        "rgba(45, 0, 78, 1)",       // Deep Indigo
        "rgba(83, 26, 136, 1)",     // Dark Violet
        "rgba(0, 153, 153, 1)",     // Dark Cyan
    ],
    "Synth Wave": [
        // Base
        "rgba(0, 255, 0, 1)",       // Green
        "rgba(255, 0, 255, 1)",     // Magenta
        "rgba(30, 144, 255, 1)",    // Dodger Blue
        "rgba(255, 215, 0, 1)",     // Gold
        "rgba(255, 99, 71, 1)",     // Tomato
        // Complementary
        "rgba(128, 0, 128, 1)",     // Purple
        "rgba(0, 128, 0, 1)",       // Dark Green
        "rgba(255, 141, 30, 1)",    // Amber
        "rgba(0, 40, 255, 1)",      // Royal Blue
        "rgba(0, 225, 184, 1)",     // Turquoise
        // Tints
        "rgba(102, 255, 102, 1)",   // Light Green
        "rgba(255, 102, 255, 1)",   // Light Magenta
        "rgba(120, 188, 255, 1)",   // Light Blue
        "rgba(255, 233, 102, 1)",   // Light Gold
        "rgba(255, 161, 145, 1)",   // Light Coral
        // Shades
        "rgba(0, 153, 0, 1)",       // Forest Green
        "rgba(153, 0, 153, 1)",     // Dark Magenta
        "rgba(18, 86, 153, 1)",     // Dark Blue
    ],
    "Iron Banner": [
        // Base
        "rgba(220, 20, 60, 1)",     // Crimson
        "rgba(255, 215, 0, 1)",     // Gold
        "rgba(34, 139, 34, 1)",     // Forest Green
        "rgba(30, 144, 255, 1)",    // Dodger Blue
        "rgba(139, 69, 19, 1)",     // Saddle Brown
        // Complementary
        "rgba(20, 220, 195, 1)",    // Teal
        "rgba(0, 40, 255, 1)",      // Royal Blue
        "rgba(221, 34, 221, 1)",    // Orchid
        "rgba(255, 141, 30, 1)",    // Amber
        "rgba(19, 89, 139, 1)",     // Steel Blue
        // Tints
        "rgba(234, 114, 138, 1)",   // Light Crimson
        "rgba(255, 233, 102, 1)",   // Light Gold
        "rgba(122, 185, 122, 1)",   // Light Green
        "rgba(120, 188, 255, 1)",   // Light Blue
        "rgba(184, 143, 113, 1)",   // Light Brown
        // Shades
        "rgba(132, 12, 36, 1)",     // Dark Crimson
        "rgba(20, 83, 20, 1)",      // Dark Green
        "rgba(83, 41, 11, 1)",      // Dark Brown
    ],
    "Valor Rising": [
        // Base
        "rgba(139, 0, 0, 1)",       // Dark Red
        "rgba(255, 215, 0, 1)",     // Gold
        "rgba(50, 205, 50, 1)",     // Lime Green
        "rgba(30, 144, 255, 1)",    // Dodger Blue
        "rgba(211, 211, 211, 1)",   // Light Gray
        // Complementary
        "rgba(0, 139, 139, 1)",     // Dark Cyan
        "rgba(0, 40, 255, 1)",      // Royal Blue
        "rgba(205, 50, 205, 1)",    // Orchid
        "rgba(255, 141, 30, 1)",    // Amber
        "rgba(44, 44, 44, 1)",      // Dark Gray
        // Tints
        "rgba(184, 102, 102, 1)",   // Light Red
        "rgba(255, 233, 102, 1)",   // Light Gold
        "rgba(140, 225, 140, 1)",   // Light Green
        "rgba(120, 188, 255, 1)",   // Light Blue
        "rgba(233, 233, 233, 1)",   // Near White
        // Shades
        "rgba(83, 0, 0, 1)",        // Deep Red
        "rgba(153, 129, 0, 1)",     // Dark Gold
        "rgba(30, 123, 30, 1)",     // Dark Green
    ],
    "Aurora Bloom": [
        // Base
        "rgba(255, 99, 71, 1)",     // Tomato
        "rgba(255, 215, 0, 1)",     // Gold
        "rgba(0, 191, 255, 1)",     // Deep Sky Blue
        "rgba(138, 43, 226, 1)",    // Blue Violet
        "rgba(255, 255, 255, 1)",   // White
        // Complementary
        "rgba(0, 225, 184, 1)",     // Turquoise
        "rgba(0, 40, 255, 1)",      // Royal Blue
        "rgba(255, 64, 0, 1)",      // Vermillion
        "rgba(131, 226, 43, 1)",    // Yellow Green
        "rgba(30, 30, 30, 1)",      // Near Black
        // Tints
        "rgba(255, 161, 145, 1)",   // Light Coral
        "rgba(255, 233, 102, 1)",   // Light Gold
        "rgba(102, 216, 255, 1)",   // Light Sky
        "rgba(184, 127, 238, 1)",   // Light Violet
        "rgba(200, 200, 220, 1)",   // Lavender Gray
        // Shades
        "rgba(153, 59, 43, 1)",     // Dark Red
        "rgba(153, 129, 0, 1)",     // Dark Gold
        "rgba(0, 115, 153, 1)",     // Dark Cyan
    ],
    "Cloud Bounce": [
        // Base
        "rgba(135, 206, 235, 1)",   // Sky Blue
        "rgba(176, 224, 230, 1)",   // Powder Blue
        "rgba(255, 160, 122, 1)",   // Light Salmon
        "rgba(255, 179, 71, 1)",    // Orange Yellow
        "rgba(255, 255, 255, 1)",   // White
        // Complementary
        "rgba(235, 164, 135, 1)",   // Peach
        "rgba(230, 182, 176, 1)",   // Dusty Rose
        "rgba(122, 217, 255, 1)",   // Light Azure
        "rgba(71, 147, 255, 1)",    // Cornflower
        "rgba(220, 220, 235, 1)",   // Lavender
        // Tints
        "rgba(180, 225, 243, 1)",   // Pale Sky
        "rgba(208, 237, 240, 1)",   // Ice Blue
        "rgba(255, 198, 173, 1)",   // Pale Salmon
        "rgba(255, 210, 148, 1)",   // Pale Orange
        "rgba(245, 240, 255, 1)",   // Ghost White
        // Shades
        "rgba(81, 124, 141, 1)",    // Steel Blue
        "rgba(153, 96, 73, 1)",     // Sienna
        "rgba(153, 107, 43, 1)",    // Dark Amber
    ],
};

export const DEFAULT_COLOR_PALETTE = "Neon Carnival";

const PALETTE_NAMES = Object.keys(COLOR_PALETTES);

const ColorBar = ({ colors }: { colors: string[] }) => 
    <ColorBarRow>
        {colors.map((c, i) => 
            <ColorStripe key={i}
                style={{ background: c }}
            />,
        )}
    </ColorBarRow>
;

interface ColorPaletteSectionProps {
    palette: string;
    onChange: (palette: string) => void;
}

export const ColorPaletteSection = ({ palette, onChange }: ColorPaletteSectionProps) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleClickOutside = useCallback((e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
            setOpen(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [open, handleClickOutside]);

    const colors = COLOR_PALETTES[palette] ?? COLOR_PALETTES[DEFAULT_COLOR_PALETTE] ?? [];

    return (
        <DropdownContainer ref={containerRef}>
            <Trigger onClick={() => setOpen(o => !o)}>
                <TriggerContent>
                    <span>{palette}</span>
                    <ColorBar colors={colors} />
                </TriggerContent>
                <Arrow src={arrow}
                    alt="open"
                    $open={open}
                />
            </Trigger>
            {open && 
                <OptionsList>
                    {PALETTE_NAMES.map(name => 
                        <Option
                            key={name}
                            $active={name === palette}
                            onClick={() => { onChange(name); setOpen(false); }}
                        >
                            <span>{name}</span>
                            <ColorBar colors={COLOR_PALETTES[name] ?? []} />
                        </Option>,
                    )}
                </OptionsList>
            }
        </DropdownContainer>
    );
};

const DropdownContainer = styled.div`
    position: relative;
    width: 100%;
`;

const Trigger = styled.button`
    display: flex;
    align-items: center;
    width: 100%;
    padding: 6px 8px;
    background: var(--theme-grey-bg);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    color: var(--theme-font-input-color);
    font-size: var(--theme-font-size-extra-small);
`;

const TriggerContent = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    flex: 1;
    min-width: 0;
    gap: 3px;
`;

const Arrow = styled.img<{ $open: boolean }>`
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    transition: transform 0.15s;
    transform: rotate(${({ $open }) => $open ? "180deg" : "0deg"});
`;

const OptionsList = styled.div`
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    width: 100%;
    background: #232323;
    border-radius: 4px;
    z-index: 10000;
    max-height: 200px;
    overflow-y: auto;
    padding: 4px;
    box-sizing: border-box;
`;

const Option = styled.div<{ $active: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 4px 6px;
    cursor: pointer;
    border-radius: 4px;
    font-size: var(--theme-font-size-extra-small);
    color: var(--theme-font-input-color);
    background: ${({ $active }) => $active ? "var(--theme-grey-bg-secondary)" : "transparent"};

    &:hover {
        background: var(--theme-grey-bg-secondary);
    }
`;

const ColorBarRow = styled.div`
    display: flex;
    width: 100%;
    height: 3px;
    border-radius: 1px;
    overflow: hidden;
`;

const ColorStripe = styled.div`
    flex: 1;
    height: 100%;
`;
