import type { ModelMeta } from "../types.js";

export function createsInheritanceCycle(
  models: ModelMeta[],
  sourceModelId: string,
  targetModelId: string,
): boolean {
  if (sourceModelId === targetModelId) return true;
  const byId = new Map(models.map((item) => [item.model.id, item]));
  const visited = new Set<string>();
  let current: string | null | undefined = targetModelId;
  while (current) {
    if (current === sourceModelId) return true;
    if (visited.has(current)) return true;
    visited.add(current);
    current = byId.get(current)?.model.parentModelId;
  }
  return false;
}
