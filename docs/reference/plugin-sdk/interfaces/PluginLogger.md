[**@boardreadyops/plugin-sdk API**](../README.md)

***

[@boardreadyops/plugin-sdk API](../README.md) / PluginLogger

# Interface: PluginLogger

Structured logger exposed to plugins during rule execution.

## Methods

### debug()

> **debug**(`event`, `data?`): `void`

Emit development diagnostics for a plugin execution event.

#### Parameters

##### event

`string`

##### data?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

***

### error()

> **error**(`event`, `data?`): `void`

Emit an unrecoverable plugin execution error.

#### Parameters

##### event

`string`

##### data?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

***

### info()

> **info**(`event`, `data?`): `void`

Emit an informational plugin execution event.

#### Parameters

##### event

`string`

##### data?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

***

### warn()

> **warn**(`event`, `data?`): `void`

Emit a recoverable plugin execution warning.

#### Parameters

##### event

`string`

##### data?

`Record`\<`string`, `unknown`\>

#### Returns

`void`
