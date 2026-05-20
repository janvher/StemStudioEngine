import AttributeUtil from "./AttributeUtil";
import {
    BehaviorAttributes,
    EnumAttribute,
    GroupAttribute,
    NumberAttribute,
    BooleanAttribute,
    VisibilityCondition,
} from "./BehaviorAttributes";
import BehaviorAttributeType from "./BehaviorAttributeType";
import global from "@stem/editor-oss/global";

// Mock global object for testing
const mockApp = {
    editor: {
        isSandbox: false,
    },
};

describe("AttributeUtil", () => {
    beforeEach(() => {
        // Reset sandbox mode before each test
        global.app = mockApp as any;
        mockApp.editor.isSandbox = false;
    });

    describe("isAttributeWithConditionVisible", () => {
        it("should return true when no visibility condition is provided", () => {
            const result = AttributeUtil.isAttributeWithConditionVisible(undefined, {});
            expect(result).toBe(true);
        });

        it("should return true when condition matches current value", () => {
            const visibilityCondition: VisibilityCondition = {
                enabled: true,
                mode: "auto",
            };
            const currentValues = {
                enabled: true,
                mode: "auto",
            };

            const result = AttributeUtil.isAttributeWithConditionVisible(visibilityCondition, currentValues);
            expect(result).toBe(true);
        });

        it("should return false when condition does not match current value", () => {
            const visibilityCondition: VisibilityCondition = {
                enabled: true,
                mode: "manual",
            };
            const currentValues = {
                enabled: true,
                mode: "auto",
            };

            const result = AttributeUtil.isAttributeWithConditionVisible(visibilityCondition, currentValues);
            expect(result).toBe(false);
        });

        it("should handle array conditions correctly", () => {
            const visibilityCondition: VisibilityCondition = {
                mode: ["auto", "manual"],
            };
            const currentValues1 = { mode: "auto" };
            const currentValues2 = { mode: "manual" };
            const currentValues3 = { mode: "custom" };

            expect(AttributeUtil.isAttributeWithConditionVisible(visibilityCondition, currentValues1)).toBe(true);
            expect(AttributeUtil.isAttributeWithConditionVisible(visibilityCondition, currentValues2)).toBe(true);
            expect(AttributeUtil.isAttributeWithConditionVisible(visibilityCondition, currentValues3)).toBe(false);
        });

        it("should return false when any condition fails (all conditions must match)", () => {
            const visibilityCondition: VisibilityCondition = {
                enabled: true,
                mode: "auto",
                level: 5,
            };
            const currentValues = {
                enabled: true,
                mode: "auto",
                level: 3, // This doesn't match
            };

            const result = AttributeUtil.isAttributeWithConditionVisible(visibilityCondition, currentValues);
            expect(result).toBe(false);
        });
    });

    describe("collectVisibleIfAttributes", () => {
        it("should collect attributes referenced in visibleIf conditions", () => {
            const attributes: BehaviorAttributes = {
                enabled: {
                    name: "enabled",
                    type: BehaviorAttributeType.Boolean,
                    array: false,
                    invisible: false,
                    default: false,
                    order: 1,
                },
                mode: {
                    name: "mode",
                    type: BehaviorAttributeType.Enum,
                    array: false,
                    invisible: false,
                    default: "auto",
                    order: 2,
                    options: [
                        { label: "Auto", value: "auto" },
                        { label: "Manual", value: "manual" },
                    ],
                },
                speed: {
                    name: "speed",
                    type: BehaviorAttributeType.Number,
                    array: false,
                    invisible: false,
                    default: 10,
                    order: 3,
                    visibleIf: {
                        enabled: true,
                        mode: "manual",
                    },
                    min: 0,
                    max: 100,
                },
            };

            const attributesData = {
                enabled: true,
                mode: "auto",
            };

            const result = AttributeUtil.collectVisibleIfAttributes(attributes, attributesData);

            expect(result).toEqual({
                enabled: true,
                mode: "auto",
            });
        });

        it("should use default values when attribute data is missing", () => {
            const attributes: BehaviorAttributes = {
                enabled: {
                    name: "enabled",
                    type: BehaviorAttributeType.Boolean,
                    array: false,
                    invisible: false,
                    default: false,
                    order: 1,
                },
                speed: {
                    name: "speed",
                    type: BehaviorAttributeType.Number,
                    array: false,
                    invisible: false,
                    default: 10,
                    order: 2,
                    visibleIf: {
                        enabled: true,
                    },
                    min: 0,
                    max: 100,
                },
            };

            const attributesData = {}; // Empty data

            const result = AttributeUtil.collectVisibleIfAttributes(attributes, attributesData);

            expect(result).toEqual({
                enabled: false, // Uses default value
            });
        });

        it("should log error when referenced attribute does not exist", () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const attributes: BehaviorAttributes = {
                speed: {
                    name: "speed",
                    type: BehaviorAttributeType.Number,
                    array: false,
                    invisible: false,
                    default: 10,
                    order: 1,
                    visibleIf: {
                        nonExistentAttribute: true,
                    },
                    min: 0,
                    max: 100,
                },
            };

            const attributesData = {};

            AttributeUtil.collectVisibleIfAttributes(attributes, attributesData);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Cannot find attribute "nonExistentAttribute" in behavior to use in visibleIf condition',
            );

            consoleSpy.mockRestore();
        });
    });

    describe("getAttributeValue", () => {
        it("should return value when it is defined and not empty string", () => {
            expect(AttributeUtil.getAttributeValue("test", "default")).toBe("test");
            expect(AttributeUtil.getAttributeValue(42, "default")).toBe(42);
            expect(AttributeUtil.getAttributeValue(false, "default")).toBe(false);
            expect(AttributeUtil.getAttributeValue(0, "default")).toBe(0);
        });

        it("should return default when value is undefined or empty string", () => {
            expect(AttributeUtil.getAttributeValue(undefined, "default")).toBe("default");
            expect(AttributeUtil.getAttributeValue("", "default")).toBe("default");
        });
    });

    describe("getDefaultValueForAttribute", () => {
        it("should return array with default values for array attributes", () => {
            const arrayAttribute: BooleanAttribute = {
                name: "items",
                type: BehaviorAttributeType.Boolean,
                array: true,
                invisible: false,
                default: [true, false, true],
                order: 1,
            };

            const result = AttributeUtil.getDefaultValueForAttribute(arrayAttribute);

            expect(result).toEqual([true, false, true]);
            expect(result).not.toBe(arrayAttribute.default); // Should be a copy
        });

        it("should return array of objects for group array attributes", () => {
            const groupArrayAttribute: GroupAttribute = {
                name: "buttons",
                type: BehaviorAttributeType.Group,
                array: true,
                invisible: false,
                default: [
                    { buttonId: "btn1", buttonEnabled: true, buttonSize: 60 },
                    { buttonId: "btn2", buttonEnabled: false, buttonSize: 50 },
                ],
                order: 1,
                attributes: {
                    buttonId: {
                        name: "buttonId",
                        type: BehaviorAttributeType.String,
                        array: false,
                        invisible: false,
                        default: "",
                        order: 1,
                    },
                    buttonEnabled: {
                        name: "buttonEnabled",
                        type: BehaviorAttributeType.Boolean,
                        array: false,
                        invisible: false,
                        default: true,
                        order: 2,
                    },
                    buttonSize: {
                        name: "buttonSize",
                        type: BehaviorAttributeType.Number,
                        array: false,
                        invisible: false,
                        default: 60,
                        order: 3,
                        min: 1,
                        max: 400,
                    },
                },
            };

            const result = AttributeUtil.getDefaultValueForAttribute(groupArrayAttribute);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual([
                { buttonId: "btn1", buttonEnabled: true, buttonSize: 60 },
                { buttonId: "btn2", buttonEnabled: false, buttonSize: 50 },
            ]);
            expect(result).not.toBe(groupArrayAttribute.default);
        });

        it("should merge partial defaults with group attribute structure for array items", () => {
            const groupArrayAttribute: GroupAttribute = {
                name: "buttons",
                type: BehaviorAttributeType.Group,
                array: true,
                invisible: false,
                default: [
                    { buttonId: "btn1" }, // partial - missing buttonEnabled and buttonSize
                    { buttonEnabled: false }, // partial - missing buttonId and buttonSize
                ],
                order: 1,
                attributes: {
                    buttonId: {
                        name: "buttonId",
                        type: BehaviorAttributeType.String,
                        array: false,
                        invisible: false,
                        default: "defaultBtn",
                        order: 1,
                    },
                    buttonEnabled: {
                        name: "buttonEnabled",
                        type: BehaviorAttributeType.Boolean,
                        array: false,
                        invisible: false,
                        default: true,
                        order: 2,
                    },
                    buttonSize: {
                        name: "buttonSize",
                        type: BehaviorAttributeType.Number,
                        array: false,
                        invisible: false,
                        default: 60,
                        order: 3,
                        min: 1,
                        max: 400,
                    },
                },
            };

            const result = AttributeUtil.getDefaultValueForAttribute(groupArrayAttribute);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual([
                { buttonId: "btn1", buttonEnabled: true, buttonSize: 60 }, // merged with defaults
                { buttonId: "defaultBtn", buttonEnabled: false, buttonSize: 60 }, // merged with defaults
            ]);
        });

        it("should return array with single default object for group array without explicit default array", () => {
            const groupArrayAttribute: GroupAttribute = {
                name: "buttons",
                type: BehaviorAttributeType.Group,
                array: true,
                invisible: false,
                default: undefined,
                order: 1,
                attributes: {
                    buttonId: {
                        name: "buttonId",
                        type: BehaviorAttributeType.String,
                        array: false,
                        invisible: false,
                        default: "defaultButton",
                        order: 1,
                    },
                    buttonEnabled: {
                        name: "buttonEnabled",
                        type: BehaviorAttributeType.Boolean,
                        array: false,
                        invisible: false,
                        default: true,
                        order: 2,
                    },
                },
            };

            const result = AttributeUtil.getDefaultValueForAttribute(groupArrayAttribute);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual([]);
        });

        it("should return empty array for array attributes without default", () => {
            const arrayAttribute: BooleanAttribute = {
                name: "items",
                type: BehaviorAttributeType.Boolean,
                array: true,
                invisible: false,
                default: undefined,
                order: 1,
            };

            const result = AttributeUtil.getDefaultValueForAttribute(arrayAttribute);

            expect(result).toEqual([]);
        });

        it("should return single default value for non-array attributes", () => {
            const numberAttribute: NumberAttribute = {
                name: "speed",
                type: BehaviorAttributeType.Number,
                array: false,
                invisible: false,
                default: 10,
                order: 1,
                min: 0,
                max: 100,
            };

            const result = AttributeUtil.getDefaultValueForAttribute(numberAttribute);

            expect(result).toBe(10);
        });
    });

    describe("getDefaultValueForSingleAttribute - Group attributes", () => {
        it("should create default object for group attributes without explicit default", () => {
            const groupAttribute: GroupAttribute = {
                name: "settings",
                type: BehaviorAttributeType.Group,
                array: false,
                invisible: false,
                default: undefined,
                order: 1,
                attributes: {
                    enabled: {
                        name: "enabled",
                        type: BehaviorAttributeType.Boolean,
                        array: false,
                        invisible: false,
                        default: true,
                        order: 1,
                    },
                    speed: {
                        name: "speed",
                        type: BehaviorAttributeType.Number,
                        array: false,
                        invisible: false,
                        default: 10,
                        order: 2,
                        min: 0,
                        max: 100,
                    },
                },
            };

            const result = AttributeUtil.getDefaultValueForAttribute(groupAttribute);

            expect(result).toEqual({
                enabled: true,
                speed: 10,
            });
        });

        it("should merge explicit default with attribute defaults for non-array group", () => {
            const groupAttribute: GroupAttribute = {
                name: "settings",
                type: BehaviorAttributeType.Group,
                array: false,
                invisible: false,
                default: {
                    enabled: false, // override default
                    // speed is missing - should use attribute default
                },
                order: 1,
                attributes: {
                    enabled: {
                        name: "enabled",
                        type: BehaviorAttributeType.Boolean,
                        array: false,
                        invisible: false,
                        default: true,
                        order: 1,
                    },
                    speed: {
                        name: "speed",
                        type: BehaviorAttributeType.Number,
                        array: false,
                        invisible: false,
                        default: 10,
                        order: 2,
                        min: 0,
                        max: 100,
                    },
                },
            };

            const result = AttributeUtil.getDefaultValueForAttribute(groupAttribute);

            expect(result).toEqual({
                enabled: false, // from explicit default
                speed: 10, // from attribute default
            });
        });
    });

    describe("getDefaultValueForSingleAttribute - Enum attributes", () => {
        it("should return default value for enum attribute", () => {
            const enumAttribute: EnumAttribute = {
                name: "mode",
                type: BehaviorAttributeType.Enum,
                array: false,
                invisible: false,
                default: "manual",
                order: 1,
                options: [
                    { label: "Auto", value: "auto" },
                    { label: "Manual", value: "manual" },
                ],
            };

            const result = AttributeUtil.getDefaultValueForAttribute(enumAttribute);

            expect(result).toBe("manual");
        });

        it("should return first option value when no default is set", () => {
            const enumAttribute: EnumAttribute = {
                name: "mode",
                type: BehaviorAttributeType.Enum,
                array: false,
                invisible: false,
                default: undefined,
                order: 1,
                options: [
                    { label: "Auto", value: "auto" },
                    { label: "Manual", value: "manual" },
                ],
            };

            const result = AttributeUtil.getDefaultValueForAttribute(enumAttribute);

            expect(result).toBe("auto");
        });

        it("should return first option value when default is not found in options", () => {
            const enumAttribute: EnumAttribute = {
                name: "mode",
                type: BehaviorAttributeType.Enum,
                array: false,
                invisible: false,
                default: "nonexistent",
                order: 1,
                options: [
                    { label: "Auto", value: "auto" },
                    { label: "Manual", value: "manual" },
                ],
            };

            const result = AttributeUtil.getDefaultValueForAttribute(enumAttribute);

            expect(result).toBe("auto");
        });

        it("should return null when no options are available", () => {
            const enumAttribute: EnumAttribute = {
                name: "mode",
                type: BehaviorAttributeType.Enum,
                array: false,
                invisible: false,
                default: undefined,
                order: 1,
                options: [],
            };

            const result = AttributeUtil.getDefaultValueForAttribute(enumAttribute);

            expect(result).toBe(null);
        });
    });

    describe("getDefaultValueForSingleAttribute - Sandbox mode", () => {
        it("should use sandbox default when in sandbox mode", () => {
            mockApp.editor.isSandbox = true;

            const attribute: NumberAttribute & { defaultSandbox: number } = {
                name: "speed",
                type: BehaviorAttributeType.Number,
                array: false,
                invisible: false,
                default: 10,
                defaultSandbox: 25,
                order: 1,
                min: 0,
                max: 100,
            };

            const result = AttributeUtil.getDefaultValueForAttribute(attribute);

            expect(result).toBe(25);
        });

        it("should use sandbox default for enum when in sandbox mode", () => {
            mockApp.editor.isSandbox = true;

            const enumAttribute: EnumAttribute & { defaultSandbox: string } = {
                name: "mode",
                type: BehaviorAttributeType.Enum,
                array: false,
                invisible: false,
                default: "auto",
                defaultSandbox: "manual",
                order: 1,
                options: [
                    { label: "Auto", value: "auto" },
                    { label: "Manual", value: "manual" },
                ],
            };

            const result = AttributeUtil.getDefaultValueForAttribute(enumAttribute);

            expect(result).toBe("manual");
        });

        it("should fall back to regular default when sandbox default is not in enum options", () => {
            mockApp.editor.isSandbox = true;

            const enumAttribute: EnumAttribute & { defaultSandbox: string } = {
                name: "mode",
                type: BehaviorAttributeType.Enum,
                array: false,
                invisible: false,
                default: "auto",
                defaultSandbox: "nonexistent",
                order: 1,
                options: [
                    { label: "Auto", value: "auto" },
                    { label: "Manual", value: "manual" },
                ],
            };

            const result = AttributeUtil.getDefaultValueForAttribute(enumAttribute);

            expect(result).toBe("auto");
        });
    });

    describe("setNestedProperty", () => {
        it("should set simple property", () => {
            const obj = {};
            AttributeUtil.setNestedProperty(obj, "name", "test");
            expect(obj).toEqual({ name: "test" });
        });

        it("should set nested object property", () => {
            const obj = {};
            AttributeUtil.setNestedProperty(obj, "position.x", 10);
            expect(obj).toEqual({ position: { x: 10 } });
        });

        it("should set array element", () => {
            const obj = { items: [{}] };
            AttributeUtil.setNestedProperty(obj, "items.0.value", "test");
            expect(obj).toEqual({ items: [{ value: "test" }] });
        });

        it("should set deeply nested property with existing array", () => {
            const obj = { buttons: [] };
            AttributeUtil.setNestedProperty(obj, "buttons.0.position.x", 100);
            expect(obj).toEqual({ buttons: [{ position: { x: 100 } }] });
        });

        it("should now correctly create arrays instead of warning", () => {
            const obj = {};
            AttributeUtil.setNestedProperty(obj, "buttons.0.position.x", 100);
            
            // Теперь должен создать правильную структуру массива
            expect(obj).toEqual({ buttons: [{ position: { x: 100 } }] });
            expect(Array.isArray((obj as any).buttons)).toBe(true);
        });

        it("should handle existing properties correctly", () => {
            const obj = { position: { y: 20 } };
            AttributeUtil.setNestedProperty(obj, "position.x", 10);
            expect(obj).toEqual({ position: { x: 10, y: 20 } });
        });

        it("should warn when trying to set array index on non-array", () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            const obj = { items: "not an array" };
            AttributeUtil.setNestedProperty(obj, "items.0.value", "test");
            
            expect(consoleSpy).toHaveBeenCalledWith(
                'Expected array at path "items" but found:',
                "not an array",
            );
            
            consoleSpy.mockRestore();
        });
    });

    describe("getNestedProperty", () => {
        it("should get simple property", () => {
            const obj = { name: "test" };
            const result = AttributeUtil.getNestedProperty(obj, "name");
            expect(result).toBe("test");
        });

        it("should get nested object property", () => {
            const obj = { position: { x: 10, y: 20 } };
            const result = AttributeUtil.getNestedProperty(obj, "position.x");
            expect(result).toBe(10);
        });

        it("should get array element", () => {
            const obj = { items: [{ value: "test" }] };
            const result = AttributeUtil.getNestedProperty(obj, "items.0.value");
            expect(result).toBe("test");
        });

        it("should return undefined for non-existent property", () => {
            const obj = { name: "test" };
            const result = AttributeUtil.getNestedProperty(obj, "nonexistent");
            expect(result).toBe(undefined);
        });

        it("should return undefined for non-existent nested property", () => {
            const obj = { position: { x: 10 } };
            const result = AttributeUtil.getNestedProperty(obj, "position.y");
            expect(result).toBe(undefined);
        });

        it("should return undefined for non-existent array element", () => {
            const obj = { items: [{ value: "test" }] };
            const result = AttributeUtil.getNestedProperty(obj, "items.1.value");
            expect(result).toBe(undefined);
        });

        it("should return undefined when accessing property on null/undefined", () => {
            const obj = { item: null };
            const result = AttributeUtil.getNestedProperty(obj, "item.property");
            expect(result).toBe(undefined);
        });

        it("should return undefined when accessing array index on non-array", () => {
            const obj = { items: "not an array" };
            const result = AttributeUtil.getNestedProperty(obj, "items.0");
            expect(result).toBe(undefined);
        });

        it("should handle deeply nested paths", () => {
            const obj = {
                level1: {
                    level2: {
                        level3: {
                            value: "deep value",
                        },
                    },
                },
            };
            const result = AttributeUtil.getNestedProperty(obj, "level1.level2.level3.value");
            expect(result).toBe("deep value");
        });

        it("should handle mixed object and array access", () => {
            const obj = {
                items: [
                    { data: { values: [1, 2, 3] } },
                    { data: { values: [4, 5, 6] } },
                ],
            };
            
            const result1 = AttributeUtil.getNestedProperty(obj, "items.0.data.values.2");
            const result2 = AttributeUtil.getNestedProperty(obj, "items.1.data.values.0");
            
            expect(result1).toBe(3);
            expect(result2).toBe(4);
        });

        it("should return undefined for out of bounds array access", () => {
            const obj = { items: ["a", "b"] };
            const result = AttributeUtil.getNestedProperty(obj, "items.5");
            expect(result).toBe(undefined);
        });
    });
});