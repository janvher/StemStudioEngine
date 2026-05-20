## GeneratorEditor

### Overview

The `GeneratorEditor` is a specialized component for editing three.quarks generators. It provides different editing interfaces depending on the generator type and supports switching between different generator types dynamically.

### Features

- **Multi-Type Support**: Handles value, color, and rotation generators
- **Dynamic Type Switching**: Change generator types on the fly
- **Inline Editing**: Compact interface for simple values
- **Advanced Editing**: Detailed controls for complex generators
- **Visual Previews**: Live preview of generator output
- **Type Constraints**: Configurable allowed generator types

### Supported Generator Types

#### Value Generators

- **Constant**: Single numeric value
- **Interval**: Random value between min/max
- **Bezier**: Piecewise Bézier curve function

#### Color Generators

- **Constant Color**: Single color value
- **Color Range**: Interpolation between two colors
- **Random Color**: Random color within bounds
- **Gradient**: Complex color/alpha curves
- **Random Between Gradients**: Random selection between gradients

#### Rotation Generators

- **Euler**: Euler angle rotation
- **Axis Angle**: Rotation around specific axis
- **Random Quaternion**: Random 3D rotation

### Props

| Prop          | Type                         | Description                     |
| ------------- | ---------------------------- | ------------------------------- |
| `value`       | `Generator`                  | Current generator value         |
| `onChange`    | `(value: Generator) => void` | Callback when generator changes |
| `name`        | `string`                     | Display name for the generator  |
| `allowedType` | `EditorType[]`               | Allowed generator types         |
| `inline`      | `boolean`                    | Use compact inline layout       |
| `$margin`     | `string`                     | CSS margin for spacing          |

### EditorType Options

```tsx
type EditorType =
    | "constant"
    | "intervalValue"
    | "bezier"
    | "constantColor"
    | "colorRange"
    | "randomColor"
    | "gradient"
    | "randomBetweenGradient"
    | "euler"
    | "axisAngle"
    | "randomQuat";
```

### Usage Examples

```tsx
import {GeneratorEditor} from "./GeneratorEditor";
import {ConstantValue, IntervalValue} from "three.quarks";

// Value generator with type constraints
<GeneratorEditor
  name="Start Speed"
  value={new ConstantValue(5)}
  allowedType={["constant", "intervalValue", "bezier"]}
  onChange={handleSpeedChange}
/>

// Color generator
<GeneratorEditor
  name="Particle Color"
  value={colorGenerator}
  allowedType={["constantColor", "gradient", "colorRange"]}
  onChange={handleColorChange}
/>

// Inline layout for compact display
<GeneratorEditor
  name="Life"
  value={lifeGenerator}
  allowedType={["constant", "intervalValue"]}
  inline={true}
  onChange={handleLifeChange}
/>
```

### Generator Type Details

#### Constant Value

Simple numeric input for constant values.

#### Interval Value

Min/max range inputs for random values between bounds.

#### Bézier Curve

Integration with BezierCurveEditor for complex function curves.

#### Color Range

Two color pickers for interpolation between colors.

#### Gradient

Full gradient editor with color and alpha curves.

### Integration with Particle Systems

The GeneratorEditor seamlessly integrates with three.quarks particle systems:

```tsx
// Particle system configuration
const particleSystem = new ParticleSystem({
  startLife: new IntervalValue(1, 3),
  startSpeed: new PiecewiseBezier([...]),
  startColor: new Gradient([...], [...]),
  // ...
});

// Edit start life
<GeneratorEditor
  name="Start Life"
  value={particleSystem.startLife}
  allowedType={["constant", "intervalValue", "bezier"]}
  onChange={(newValue) => {
    particleSystem.startLife = newValue;
    particleSystem.restart();
  }}
/>;
```
