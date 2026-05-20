## FieldEditor

### Overview

The `FieldEditor` is a universal field editing component that automatically renders the appropriate input control based on the field type. It supports all particle system data types and provides a consistent interface for editing various value types.

### Features

- **Universal Field Support**: Handles all three.quarks field types
- **Type-Safe Editing**: Automatic type detection and validation
- **Generator Integration**: Seamless integration with value/function generators
- **Vector Support**: Built-in support for Vector2, Vector3, and Vector4 types
- **Color Management**: Advanced color and gradient editing
- **Object Selection**: 3D object picking and selection

### Supported Field Types

| Type         | Input Component     | Description               |
| ------------ | ------------------- | ------------------------- |
| `"number"`   | `NumericInputRow`   | Numeric values            |
| `"string"`   | `TextInputRow`      | Text input                |
| `"boolean"`  | `RoundedCheckbox`   | Boolean toggle            |
| `"vec2"`     | `Vector2Row`        | 2D vector input           |
| `"vec3"`     | `Vector3Row`        | 3D vector input           |
| `"color"`    | `ColorSelectionRow` | Color picker              |
| `"gradient"` | `GradientPicker`    | Gradient editor           |
| `"function"` | `GeneratorEditor`   | Function/generator editor |
| `"rotation"` | `GeneratorEditor`   | Rotation generator        |
| `"texture"`  | `Object3DSelect`    | Texture selection         |

### Props

| Prop        | Type                          | Description                               |
| ----------- | ----------------------------- | ----------------------------------------- |
| `label`     | `string`                      | Display label for the field               |
| `fieldType` | `FieldType`                   | Type of field to edit                     |
| `value`     | `unknown`                     | Current field value                       |
| `onChange`  | `(newValue: unknown) => void` | Callback when value changes               |
| `target`    | `{[k: string]: any}`          | Target object for direct property updates |
| `fieldName` | `string`                      | Property name on target object            |
| `disabled`  | `boolean`                     | Disable editing                           |
| `$margin`   | `string`                      | CSS margin for spacing                    |

### Usage Examples

```tsx
import {FieldEditor} from "./FieldEditor";

// Numeric field
<FieldEditor
  label="Duration"
  fieldType="number"
  value={5.0}
  onChange={(value) => setDuration(value as number)}
/>

// Color field
<FieldEditor
  label="Start Color"
  fieldType="color"
  value={new Vector4(1, 0, 0, 1)}
  onChange={handleColorChange}
/>

// Function field
<FieldEditor
  label="Size Over Time"
  fieldType="function"
  value={sizeFunction}
  onChange={handleFunctionChange}
/>

// Direct object property editing
<FieldEditor
  label="World Space"
  fieldType="boolean"
  target={particleSystem}
  fieldName="worldSpace"
  onChange={handleUpdate}
/>
```

### Advanced Features

#### Generator Support

The FieldEditor automatically detects and handles three.quarks generators:

- `ValueGenerator` / `FunctionValueGenerator`
- `ColorGenerator` / `FunctionColorGenerator`
- `RotationGenerator` (Euler, AxisAngle, RandomQuat)

#### Vector Editing

Supports all vector types with appropriate input components:

```tsx
// Vector3 with separate X, Y, Z inputs
<FieldEditor label="Position" fieldType="vec3" value={new Vector3(0, 1, 0)} onChange={handlePositionChange} />
```

#### Gradient Editing

Advanced gradient editing with color and alpha curves:

```tsx
<FieldEditor label="Color Over Life" fieldType="gradient" value={gradientValue} onChange={handleGradientChange} />
```
