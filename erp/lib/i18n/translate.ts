import type { Dict } from './ar';

export type Lang = 'ar' | 'en';
export type TFn = (key: string, vars?: Record<string, string | number>) => string;

/** Looks up a dotted key ("leads.stages.new") and fills {placeholders}. Missing keys show the key. */
export function makeT(dict: Dict): TFn {
  return (key, vars) => {
    let node: unknown = dict;
    for (const part of key.split('.')) {
      node = node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined;
    }
    if (typeof node !== 'string') return key;
    return vars ? node.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : node;
  };
}
