import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import type { ModelArch } from '@/app/jobs/new/options';

/** Execute bundled UI metadata independently of the static facts collector. */
export function loadBundledModelArchs(root: string): ModelArch[] {
  const byName = new Map<string, ModelArch>();
  const directory = join(root, 'extensions_built_in');
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || /^[._]/.test(entry.name)) continue;
    const files = readdirSync(join(directory, entry.name));
    const filename = ['ui.tsx', 'ui.ts', 'ui.jsx', 'ui.js'].find(name => files.includes(name));
    if (!filename) continue;
    const code = ts.transpileModule(readFileSync(join(directory, entry.name, filename), 'utf8'), {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const module = { exports: {} as { AI_TOOLKIT_UI_MODELS: ModelArch[] } };
    new Function('require', 'module', 'exports', code)(require, module, module.exports);
    for (const arch of module.exports.AI_TOOLKIT_UI_MODELS) byName.set(arch.name, arch);
  }
  return [...byName.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}
