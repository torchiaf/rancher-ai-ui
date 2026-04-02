import { UIToolsSpecConfig, UITool } from '../types';

/**
 * Compare two tool for differences ignoring enabled fields which are handled separately
 */
export function compareSpecTools(tool1: Record<string, any>, tool2: Record<string, any>): boolean {
  const t1 = { ...tool1 };
  const t2 = { ...tool2 };

  delete t1.enabled;
  delete t2.enabled;

  try {
    return JSON.stringify(t1, Object.keys(t1).sort()) !== JSON.stringify(t2, Object.keys(t2).sort()) ||
      JSON.stringify(t1.defaultValues, Object.keys(t1.defaultValues || {}).sort()) !== JSON.stringify(t2.defaultValues, Object.keys(t2.defaultValues || {}).sort());
  } catch {
    return t1 !== t2;
  }
}

/**
 * Compare two spec configs for differences, ignoring enabled and systemPrompt fields which are handled separately
 */
export function compareSpecConfig(config1: Record<string, any>, config2: Record<string, any>): boolean {
  const c1 = { ...config1 };
  const c2 = { ...config2 };

  delete c1.enabled;
  delete c2.enabled;
  delete c1.systemPrompt;
  delete c2.systemPrompt;

  try {
    return JSON.stringify(c1, Object.keys(c1).sort()) !== JSON.stringify(c2, Object.keys(c2).sort()) ||
      JSON.stringify(c1.defaultValues, Object.keys(c1.defaultValues || {}).sort()) !== JSON.stringify(c2.defaultValues, Object.keys(c2.defaultValues || {}).sort());
  } catch {
    return c1 !== c2;
  }
}

/**
 * Check if changes are detected between provided and current tools/config
 */
export function hasChanges(
  providedTools: UITool[],
  currentTools: UITool[],
  providedSpecConfig: UIToolsSpecConfig,
  currentSpecConfig: UIToolsSpecConfig,
): boolean {
  if (providedTools.length !== currentTools.length) {
    return true;
  }

  if (providedTools.map((t) => t.name).sort().join(',') !== currentTools.map((t) => t.name).sort().join(',')) {
    return true;
  }

  const providedByName = Object.fromEntries(providedTools.map((t) => [t.name, t]));
  const currentByName = Object.fromEntries(currentTools.map((t) => [t.name, t]));

  for (const name of Object.keys(providedByName)) {
    const providedTool = providedByName[name];
    const currentTool = currentByName[name];
    const providedToolRevision = providedTool.revision || 0;
    const currentToolRevision = currentTool.revision || 0;

    if (compareSpecTools(providedTool, currentTool)) {
      return true;
    }

    if (providedToolRevision > currentToolRevision) {
      if ((providedTool.enabled ?? true) !== (currentTool.enabled ?? true)) {
        return true;
      }
    }
  }

  if (compareSpecConfig(providedSpecConfig, currentSpecConfig)) {
    return true;
  }

  if (providedSpecConfig.revision > currentSpecConfig.revision) {
    if (providedSpecConfig.systemPrompt !== currentSpecConfig.systemPrompt) {
      return true;
    }
    if (providedSpecConfig.enabled !== currentSpecConfig.enabled) {
      return true;
    }
  }

  return false;
}
