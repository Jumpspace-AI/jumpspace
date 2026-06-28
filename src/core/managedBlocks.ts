export type ManagedBlockOptions = {
  name: string;
  content: string;
};

export function upsertManagedBlock(existing: string | undefined, options: ManagedBlockOptions): string {
  const start = startMarker(options.name);
  const end = endMarker(options.name);
  const block = `${start}\n${options.content.trimEnd()}\n${end}`;
  const current = existing?.trimEnd();

  if (!current) {
    return `${block}\n`;
  }

  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
  if (pattern.test(current)) {
    return `${current.replace(pattern, block)}\n`;
  }

  return `${current}\n\n${block}\n`;
}

export function startMarker(name: string): string {
  return `<!-- BEGIN JUMPSPACE MANAGED: ${name} -->`;
}

export function endMarker(name: string): string {
  return `<!-- END JUMPSPACE MANAGED: ${name} -->`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
