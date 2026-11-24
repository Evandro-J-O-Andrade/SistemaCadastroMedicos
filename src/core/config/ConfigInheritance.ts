// Config Inheritance Resolver — Global → Tenant → Unit
// Uma configuração de unidade sobrescreve apenas campos autorizados.

export interface ConfigLayer {
  global?: Record<string, any>;
  tenant?: Record<string, any>;
  unit?: Record<string, any>;
}

export interface ResolvedConfig {
  [key: string]: any;
}

export function resolveConfig(layers: ConfigLayer, allowedOverrideFields: string[] = []): ResolvedConfig {
  const result: ResolvedConfig = { ...(layers.global || {}) };

  // Tenant overrides (all fields)
  if (layers.tenant) {
    for (const [k, v] of Object.entries(layers.tenant)) {
      result[k] = v;
    }
  }

  // Unit overrides (only allowed fields)
  if (layers.unit) {
    for (const [k, v] of Object.entries(layers.unit)) {
      if (allowedOverrideFields.length === 0 || allowedOverrideFields.includes(k)) {
        result[k] = v;
      }
    }
  }

  return result;
}

export function getAllowedOverrideFields(): string[] {
  return ['theme', 'layout', 'widgets', 'filters', 'navigation', 'dashboard'];
}
