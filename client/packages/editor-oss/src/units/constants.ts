export type UnitType = "meters" | "centimeters" | "millimeters" | "inches" | "feet";

export const UNITS: Record<UnitType, number> = {
    meters: 1,
    centimeters: 0.01,
    millimeters: 0.001,
    inches: 0.0254,
    feet: 0.3048,
};

export const UNIT_LABELS: Record<UnitType, string> = {
    meters: "m",
    centimeters: "cm",
    millimeters: "mm",
    inches: "in",
    feet: "ft",
};

export const UNIT_OPTIONS = [
    {key: "meters", value: "Meters (m)"},
    {key: "centimeters", value: "Centimeters (cm)"},
    {key: "millimeters", value: "Millimeters (mm)"},
    {key: "inches", value: "Inches (in)"},
    {key: "feet", value: "Feet (ft)"},
];

export interface UnitsSettings {
    enabled: boolean;
    currentUnit: UnitType;
}
