## BezierCurveEditor

### Overview

The `BezierCurveEditor` is an interactive visual editor for creating and modifying Bézier curves used in particle system animations. It provides a graphical interface for editing `PiecewiseBezier` functions from the three.quarks library.

### Features

- **Interactive Visual Editing**: Drag and drop interface for curve manipulation
- **Multiple Curve Segments**: Support for piecewise Bézier curves with multiple segments
- **Real-time Preview**: Live curve visualization as you edit
- **Zoom and Pan**: Navigate complex curves with zoom controls
- **Control Points**: Edit both curve points and control handles
- **Grid Background**: Visual grid for precise positioning

### Props

| Prop                 | Type                               | Default     | Description                               |
| -------------------- | ---------------------------------- | ----------- | ----------------------------------------- |
| `value`              | `PiecewiseBezier`                  | -           | The Bézier curve data to edit             |
| `onChange`           | `(value: PiecewiseBezier) => void` | -           | Callback when curve is modified           |
| `width`              | `number`                           | -           | Editor canvas width                       |
| `height`             | `number`                           | -           | Editor canvas height                      |
| `padding`            | `Array<number>`                    | `[0,0,0,0]` | Canvas padding [top, right, bottom, left] |
| `background`         | `string`                           | `"#fff"`    | Background color                          |
| `gridColor`          | `string`                           | -           | Grid line color                           |
| `curveColor`         | `string`                           | `"#000"`    | Curve line color                          |
| `handleColor`        | `string`                           | `"#f00"`    | Control point color                       |
| `controlHandleColor` | `string`                           | `"#a0f"`    | Control handle color                      |
| `curveWidth`         | `number`                           | `1`         | Curve line width                          |
| `handleRadius`       | `number`                           | `4`         | Control point radius                      |
| `readOnly`           | `boolean`                          | `false`     | Disable editing                           |

### Usage Example

```tsx
import {BezierCurveEditor} from "./BezierCurveEditor";
import {PiecewiseBezier} from "three.quarks";

const curve = new PiecewiseBezier([
    {
        function: {p0: 0, p1: 0.33, p2: 0.66, p3: 1},
        start: 0,
    },
]);

<BezierCurveEditor
    value={curve}
    onChange={handleCurveChange}
    width={300}
    height={200}
    background="#2a2a2a"
    curveColor="#fff"
    handleColor="#ff6b6b"
/>;
```

### Interaction Controls

- **Click and Drag**: Move curve points and control handles
- **Mouse Wheel**: Zoom in/out on the curve
- **Right Click**: Context menu for adding/removing points
