# Remote-Go Adapter

The default backend adapter — wraps the canonical Go server's REST
endpoints. These modules used to live at `web/packages/shared/src/api/`
and were physically relocated here so the network library's adapter
structure is visible in the filesystem.

35 domains live here, each as its own subdirectory: `asset/`, `scene/`,
`behavior/`, `lambda/`, `audio/`, `image/`, etc. Public exports go
through `network/src/index.ts` and the path alias `@stem/network/api/*`.

Imports from elsewhere in the codebase should target the alias rather
than the file paths:

```typescript
// ✓ Preferred
import {getScene} from "@stem/network/api/scene";

// ✓ Legacy (still resolves to the same files via path alias)
import {getScene} from "@web-shared/api/scene";

// ✗ Avoid — couples consumers to the adapter's physical location
import {getScene} from "../../../network/src/adapters/remote-go/scene";
```

The 6 in-tree tests (`avatarCreator/index.test.ts`, `copilotTasks/index.test.ts`,
`scene/v2.test.ts`, `scene/index.test.ts`, …) verify each domain wraps
the underlying client correctly. They use `vi.mock("@web-shared/utils/Ajax", …)`
to stub the HTTP layer.
