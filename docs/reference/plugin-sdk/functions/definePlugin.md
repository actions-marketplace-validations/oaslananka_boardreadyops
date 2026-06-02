[**@boardreadyops/plugin-sdk API**](../README.md)

***

[@boardreadyops/plugin-sdk API](../README.md) / definePlugin

# Function: definePlugin()

> **definePlugin**(`plugin`): [`BoardReadyOpsPlugin`](../interfaces/BoardReadyOpsPlugin.md)

Returns a plugin definition with its public type checked at authoring time.

## Parameters

### plugin

[`BoardReadyOpsPlugin`](../interfaces/BoardReadyOpsPlugin.md)

## Returns

[`BoardReadyOpsPlugin`](../interfaces/BoardReadyOpsPlugin.md)

## Example

```ts
import { definePlugin } from "@boardreadyops/plugin-sdk";

export default definePlugin({
  name: "boardreadyops-plugin-example",
  version: "1.0.0",
  rules: [],
});
```
