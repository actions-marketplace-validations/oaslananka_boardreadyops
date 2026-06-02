[**@boardreadyops/plugin-sdk API**](../README.md)

***

[@boardreadyops/plugin-sdk API](../README.md) / Rule

# Interface: Rule

Runtime rule implementation contributed by a plugin.

## Properties

### meta

> **meta**: [`PluginRuleMetadata`](PluginRuleMetadata.md)

## Methods

### run()

> **run**(`context`): [`PluginFinding`](PluginFinding.md)[] \| `Promise`\<[`PluginFinding`](PluginFinding.md)[]\>

Inspect the project context and return findings for this rule.

#### Parameters

##### context

[`PluginRuleContext`](PluginRuleContext.md)

#### Returns

[`PluginFinding`](PluginFinding.md)[] \| `Promise`\<[`PluginFinding`](PluginFinding.md)[]\>
