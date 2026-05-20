## BurstEditor

### Overview

The `BurstEditor` component provides an interface for editing emission burst parameters in particle systems. Bursts create sudden emissions of particles at specific times during the particle system lifecycle.

### Features

- **Timing Control**: Set when the burst occurs
- **Count Configuration**: Define how many particles to emit (supports generators)
- **Cycle Management**: Configure burst repetition
- **Probability Settings**: Control burst probability
- **Generator Integration**: Uses GeneratorEditor for particle count

### Props

| Prop       | Type              | Description                            |
| ---------- | ----------------- | -------------------------------------- |
| `params`   | `BurstParameters` | The burst parameters to edit           |
| `index`    | `number`          | Index of this burst in the burst array |
| `onDelete` | `() => void`      | Callback to delete this burst          |
| `onUpdate` | `() => void`      | Callback when burst parameters change  |

### BurstParameters Interface

```tsx
interface BurstParameters {
    time: number; // When the burst occurs (seconds)
    count: ValueGenerator; // How many particles to emit
    cycle: number; // How many times to repeat
    interval: number; // Interval between cycles
    probability: number; // Probability of burst occurring (0-1)
}
```

### Usage Example

```tsx
import {BurstEditor} from "./BurstEditor";
import {BurstParameters, ConstantValue} from "three.quarks";

const burstParams: BurstParameters = {
    time: 0.5,
    count: new ConstantValue(10),
    cycle: 1,
    interval: 0.1,
    probability: 1.0,
};

<BurstEditor params={burstParams} index={0} onDelete={handleDeleteBurst} onUpdate={handleBurstUpdate} />;
```

### Field Descriptions

- **Time**: The time offset when the burst should occur (in seconds from particle system start)
- **Count**: Number of particles to emit (can be constant, random, or function-based)
- **Cycle**: How many times the burst should repeat
- **Interval**: Time between burst repetitions
- **Probability**: Chance that the burst will actually fire (0.0 = never, 1.0 = always)
