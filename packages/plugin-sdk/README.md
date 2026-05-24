# @boardreadyops/plugin-sdk

`@boardreadyops/plugin-sdk` provides the stable plugin contract for BoardReadyOps extensions.

```ts
import { definePlugin } from "@boardreadyops/plugin-sdk";

export default definePlugin({
  name: "boardreadyops-plugin-example",
  version: "1.0.0",
  rules: [],
});
```

Plugins run in the same Node.js process as BoardReadyOps. Install and execute plugins only from sources you trust.
