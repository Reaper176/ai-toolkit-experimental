import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';

export type TrainingBookValueFact =
  | { kind: 'undefined' }
  | { kind: 'null' }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'array'; items: TrainingBookValueFact[] }
  | { kind: 'object'; entries: Array<{ key: string; value: TrainingBookValueFact }> };

export interface PresenceFact {
  present: boolean;
  value?: TrainingBookValueFact;
}

export interface StaticJsxFact {
  present: boolean;
  text_literals?: string[];
  code_literals?: string[];
  link_hrefs?: string[];
}

export type ModelOptionPredicateFact =
  | { kind: 'always' }
  | { kind: 'truthy'; path: string }
  | { kind: 'nonblank-string'; path: string }
  | { kind: 'not'; operand: ModelOptionPredicateFact }
  | { kind: 'and' | 'or'; operands: [ModelOptionPredicateFact, ModelOptionPredicateFact] };

export interface CustomModelSelectOptionFact {
  label: string;
  options: Array<{ value: string; label: string }>;
  doc: StaticJsxFact;
  get_value_cases: Array<{ condition: ModelOptionPredicateFact; return_value: TrainingBookValueFact }>;
  writes: Array<{
    selected_value: string;
    path: string;
    value: TrainingBookValueFact;
    guard: ModelOptionPredicateFact;
  }>;
}

export interface CustomModelSelectOptionsFact {
  present: boolean;
  value?: CustomModelSelectOptionFact[];
}

export interface ArchitectureDefaultFact {
  declaration_path: string;
  path: string;
  selected: PresenceFact;
  unselected: PresenceFact;
}

export interface ArchitectureDefaultContainerFact {
  path: string;
  selected_present: boolean;
  unselected_present: boolean;
}

export interface ModelArchitectureFact {
  name: string;
  label: string;
  group: string;
  model_path: PresenceFact;
  gate_url: PresenceFact;
  is_video_model: PresenceFact;
  has_multiline_prompts: PresenceFact;
  accuracy_recovery_adapters: PresenceFact;
  sample_tags: PresenceFact;
  custom_model_select_options: CustomModelSelectOptionsFact;
  model_notes: StaticJsxFact;
  controls: string[];
  defaults: ArchitectureDefaultFact[];
  default_containers: ArchitectureDefaultContainerFact[];
  disable_sections: string[];
  additional_sections: string[];
}

export interface UiDefaultFact {
  path: string;
  value: PresenceFact;
  source_path: string;
  symbol: string;
}

export interface UiSourceClaim {
  source_path: string;
  symbol: string;
  path: string;
  kind: 'setter' | 'default' | 'doc' | 'setting' | 'server-state';
  ui_label: PresenceFact;
  value_contract: {
    ui_type:
      | 'boolean'
      | 'integer'
      | 'number'
      | 'string'
      | 'path'
      | 'boolean-list'
      | 'integer-list'
      | 'number-list'
      | 'string-list'
      | 'object'
      | 'object-list'
      | null;
    widget_kind:
      | 'checkbox'
      | 'number'
      | 'text'
      | 'multiline'
      | 'path'
      | 'select'
      | 'json'
      | 'read-only'
      | null;
    optional: boolean;
    nullable: boolean;
    accepted_values?: TrainingBookValueFact[];
    minimum?: number;
    maximum?: number;
  };
}

export interface ArchitectureTransitionFact {
  architecture: string;
  path: string;
  selected: PresenceFact;
  unselected: PresenceFact;
}

export interface TrainingBookUiFacts {
  schema_version: 1;
  model_architectures: ModelArchitectureFact[];
  defaults: UiDefaultFact[];
  config_claims: UiSourceClaim[];
  global_settings: UiSourceClaim[];
  architecture_transitions: ArchitectureTransitionFact[];
}

class FactsError extends Error {}

type Binding = { expression: ts.Expression; source: ts.SourceFile };

const compareCodePoint = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

function fail(node: ts.Node | undefined, message: string): never {
  const location = node === undefined
    ? ''
    : ` at ${node.getSourceFile().fileName}:${node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
  throw new FactsError(`${message}${location}`);
}

function ownKeys(value: object): string[] {
  return Object.keys(value).sort(compareCodePoint);
}

function requireKeys(value: unknown, required: readonly string[], label: string, optional: readonly string[] = []): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new FactsError(`${label} must be an object`);
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new FactsError(`${label} has unexpected field ${key}`);
  for (const key of required) if (!Object.prototype.hasOwnProperty.call(value, key)) throw new FactsError(`${label} is missing field ${key}`);
}

function propertyName(node: ts.PropertyName): string {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return fail(node, 'computed property names are unsupported');
}

function objectProperties(node: ts.ObjectLiteralExpression): Map<string, ts.Expression> {
  const result = new Map<string, ts.Expression>();
  for (const item of node.properties) {
    if (ts.isPropertyAssignment(item)) {
      const key = propertyName(item.name);
      if (result.has(key)) fail(item, `duplicate object property ${key}`);
      result.set(key, item.initializer);
    } else if (ts.isShorthandPropertyAssignment(item)) {
      if (result.has(item.name.text)) fail(item, `duplicate object property ${item.name.text}`);
      result.set(item.name.text, item.name);
    } else {
      fail(item, 'object spread, methods, accessors, and computed fields are unsupported');
    }
  }
  return result;
}

function unwrap(node: ts.Expression): ts.Expression {
  while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)) {
    node = node.expression;
  }
  return node;
}

class AstRepository {
  private readonly bindings = new Map<string, Binding>();
  private readonly sources = new Map<string, ts.SourceFile>();

  constructor(private readonly root: string) {}

  source(path: string): ts.SourceFile {
    const existing = this.sources.get(path);
    if (existing !== undefined) return existing;
    const filename = join(this.root, path);
    const scriptKind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const source = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, scriptKind);
    const diagnostics = (source as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];
    if (diagnostics.length > 0) fail(source, `TypeScript parse failed: ${diagnostics[0].messageText}`);
    this.sources.set(path, source);
    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) continue;
        const existingBinding = this.bindings.get(declaration.name.text);
        if (existingBinding !== undefined && existingBinding.source !== source) {
          // Imported source constants may share ordinary helper names. Only the
          // explicitly requested exported/default bindings need cross-file identity.
          continue;
        }
        this.bindings.set(declaration.name.text, { expression: declaration.initializer, source });
      }
    }
    return source;
  }

  loadStandardSources(): void {
    this.source('ui/src/helpers/defaultSamples.ts');
    this.source('ui/src/app/jobs/new/jobConfig.ts');
    this.source('ui/src/app/jobs/new/options.tsx');
  }

  binding(name: string, at?: ts.Node): Binding {
    const binding = this.bindings.get(name);
    if (binding === undefined) fail(at, `unresolved identifier ${name}`);
    return binding;
  }

  expression(name: string): ts.Expression {
    return this.binding(name).expression;
  }

  value(node: ts.Expression, seen = new Set<string>()): TrainingBookValueFact {
    node = unwrap(node);
    if (node.kind === ts.SyntaxKind.UndefinedKeyword || (ts.isIdentifier(node) && node.text === 'undefined')) return { kind: 'undefined' };
    if (node.kind === ts.SyntaxKind.NullKeyword) return { kind: 'null' };
    if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return { kind: 'boolean', value: node.kind === ts.SyntaxKind.TrueKeyword };
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { kind: 'string', value: node.text };
    if (ts.isNumericLiteral(node)) {
      const value = Number(node.text);
      if (!Number.isFinite(value)) fail(node, 'numbers must be finite');
      return { kind: 'number', value };
    }
    if (ts.isPrefixUnaryExpression(node) && (node.operator === ts.SyntaxKind.MinusToken || node.operator === ts.SyntaxKind.PlusToken)) {
      const operand = this.value(node.operand, seen);
      if (operand.kind !== 'number') fail(node, 'numeric unary operator requires a number');
      const value = node.operator === ts.SyntaxKind.MinusToken ? -operand.value : operand.value;
      if (!Number.isFinite(value)) fail(node, 'numbers must be finite');
      return { kind: 'number', value };
    }
    if (ts.isTemplateExpression(node)) {
      let value = node.head.text;
      for (const span of node.templateSpans) {
        const part = this.value(span.expression, seen);
        if (!['string', 'number', 'boolean'].includes(part.kind)) fail(span.expression, 'template interpolation must be a scalar literal');
        value += String('value' in part ? part.value : '') + span.literal.text;
      }
      return { kind: 'string', value };
    }
    if (ts.isArrayLiteralExpression(node)) return { kind: 'array', items: node.elements.map(item => this.value(item as ts.Expression, new Set(seen))) };
    if (ts.isObjectLiteralExpression(node)) {
      const entries = [...objectProperties(node)].map(([key, expression]) => ({ key, value: this.value(expression, new Set(seen)) }));
      entries.sort((left, right) => compareCodePoint(left.key, right.key));
      return { kind: 'object', entries };
    }
    if (ts.isIdentifier(node)) {
      if (seen.has(node.text)) fail(node, `cyclic constant ${node.text}`);
      const nextSeen = new Set(seen).add(node.text);
      return this.value(this.binding(node.text, node).expression, nextSeen);
    }
    fail(node, 'unsupported non-JSON-safe value');
  }
}

function presence(value?: TrainingBookValueFact): PresenceFact {
  return value === undefined ? { present: false } : { present: true, value };
}

function objectEntry(value: TrainingBookValueFact, key: string): TrainingBookValueFact | undefined {
  if (value.kind !== 'object') return undefined;
  return value.entries.find(entry => entry.key === key)?.value;
}

export function normalizeTrainingBookPath(raw: string): string {
  if (raw.length === 0 || raw.includes('..')) throw new FactsError(`canonical path is invalid: ${raw}`);
  const segments = raw.split('.');
  const normalized = segments.map(segment => {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)(?:\[([^\]]+)\])?$/.exec(segment);
    if (match === null) throw new FactsError(`canonical path contains an unresolved computed segment: ${raw}`);
    const [, name, index] = match;
    if (index === undefined) return name;
    if (name === 'process' && index === '0') return 'process[*]';
    if (name === 'datasets' && index === 'x') return 'datasets[*]';
    if (index === '*') return `${name}[*]`;
    if (/^\d+$/.test(index)) throw new FactsError(`canonical path contains an unsupported numeric index: ${raw}`);
    throw new FactsError(`canonical path contains an unresolved index ${index}: ${raw}`);
  });
  return normalized.join('.');
}

function pathFromAccess(node: ts.Expression): string | undefined {
  const collect = (expression: ts.Expression): string[] | undefined => {
    expression = unwrap(expression);
    if (ts.isIdentifier(expression)) return expression.text === 'config' ? [] : undefined;
    if (ts.isPropertyAccessExpression(expression)) {
      const base = collect(expression.expression);
      return base === undefined ? undefined : [...base, expression.name.text];
    }
    if (ts.isElementAccessExpression(expression)) {
      const base = collect(expression.expression);
      if (base === undefined) return undefined;
      const argument = expression.argumentExpression;
      if (argument === undefined || (!ts.isNumericLiteral(argument) && !ts.isStringLiteral(argument))) fail(expression, 'computed configuration path is unsupported');
      if (base.length === 0) fail(expression, 'configuration index has no property');
      base[base.length - 1] = `${base[base.length - 1]}[${argument.text}]`;
      return base;
    }
    return undefined;
  };
  const parts = collect(node);
  return parts === undefined ? undefined : normalizeTrainingBookPath(parts.join('.'));
}

function accessParts(node: ts.Expression): string[] | undefined {
  node = unwrap(node);
  if (ts.isIdentifier(node)) return [node.text];
  if (ts.isPropertyAccessExpression(node)) {
    const base = accessParts(node.expression);
    return base === undefined ? undefined : [...base, node.name.text];
  }
  if (ts.isElementAccessExpression(node)) {
    const base = accessParts(node.expression);
    if (base === undefined || node.argumentExpression === undefined) return undefined;
    const argument = unwrap(node.argumentExpression);
    if (!ts.isNumericLiteral(argument) && !ts.isStringLiteral(argument)) return undefined;
    base[base.length - 1] = `${base[base.length - 1]}[${argument.text}]`;
    return base;
  }
  return undefined;
}

function canonicalAccessPath(node: ts.Expression, aliases: Map<string, string>): string | undefined {
  node = unwrap(node);
  if (ts.isIdentifier(node) && aliases.has(node.text)) return aliases.get(node.text);
  const parts = accessParts(node);
  if (parts === undefined) return undefined;
  const alias = aliases.get(parts[0]);
  if (alias !== undefined) return normalizeTrainingBookPath([alias, ...parts.slice(1)].join('.'));
  let base: ts.Expression = node;
  while (ts.isPropertyAccessExpression(base) || ts.isElementAccessExpression(base)) base = unwrap(base.expression);
  if (ts.isIdentifier(base)) {
    const row = directMapRowPath(base, aliases);
    if (row !== undefined) return normalizeTrainingBookPath([row, ...parts.slice(1)].join('.'));
  }
  const configIndex = parts.indexOf('config');
  if (configIndex < 0) return undefined;
  return normalizeTrainingBookPath(parts.slice(configIndex).join('.'));
}

function directMapRowPath(identifier: ts.Identifier, aliases: Map<string, string>): string | undefined {
  let current: ts.Node | undefined = identifier;
  while (current !== undefined) {
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) && current.parameters.length > 0 && ts.isIdentifier(current.parameters[0].name) && current.parameters[0].name.text === identifier.text) {
      if (!ts.isCallExpression(current.parent) || !ts.isPropertyAccessExpression(current.parent.expression) || current.parent.expression.name.text !== 'map') return undefined;
      const receiver = canonicalAccessPath(current.parent.expression.expression, aliases);
      if (receiver === undefined || !['config.process[*].datasets', 'config.process[*].train.validation_config.validation_items', 'config.process[*].sample.samples'].includes(receiver)) return undefined;
      return `${receiver}[*]`;
    }
    current = current.parent;
  }
  return undefined;
}

function sourceAliases(source: ts.SourceFile): Map<string, string> {
  const aliases = new Map<string, string>();
  let changed = true;
  while (changed) {
    changed = false;
    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined && !aliases.has(node.name.text)) {
        const path = canonicalAccessPath(node.initializer, aliases);
        if (path !== undefined) { aliases.set(node.name.text, path); changed = true; }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return aliases;
}

function enclosingFunctionForIdentifier(identifier: ts.Identifier): ts.ArrowFunction | ts.FunctionExpression | undefined {
  let current: ts.Node | undefined = identifier;
  while (current !== undefined) {
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) return current;
    current = current.parent;
  }
  return undefined;
}

function directMapBinding(identifier: ts.Identifier, aliases: Map<string, string>): { kind: 'index'; path: string } | { kind: 'values'; values: string[] } | undefined {
  let current: ts.Node | undefined = identifier;
  let callback: ts.ArrowFunction | ts.FunctionExpression | undefined;
  let parameterIndex = -1;
  while (current !== undefined) {
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      const candidate = current.parameters.findIndex(parameter => ts.isIdentifier(parameter.name) && parameter.name.text === identifier.text);
      if (candidate >= 0) { callback = current; parameterIndex = candidate; break; }
    }
    current = current.parent;
  }
  if (callback === undefined) return undefined;
  if (parameterIndex < 0 || callback.parent === undefined || !ts.isCallExpression(callback.parent)) return undefined;
  const call = callback.parent;
  if (!ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'map' || !call.arguments.includes(callback)) return undefined;
  const receiver = unwrap(call.expression.expression);
  if (parameterIndex === 1) {
    const path = canonicalAccessPath(receiver, aliases);
    if (path === undefined || !['config.process[*].datasets', 'config.process[*].train.validation_config.validation_items', 'config.process[*].sample.samples'].includes(path)) {
      fail(identifier, 'template index is not bound to an approved direct repeatable-array map');
    }
    return { kind: 'index', path };
  }
  if (parameterIndex === 0 && ts.isArrayLiteralExpression(receiver)) {
    const values = receiver.elements.map(element => {
      const value = unwrap(element as ts.Expression);
      if (!ts.isStringLiteral(value)) fail(value, 'finite template map keys must be string literals');
      return value.text;
    });
    return { kind: 'values', values };
  }
  return undefined;
}

function finiteForInBinding(identifier: ts.Identifier, source: ts.SourceFile): string[] | undefined {
  let current: ts.Node | undefined = identifier;
  while (current !== undefined) {
    if (ts.isForInStatement(current)) {
      const initializer = current.initializer;
      const declaration = ts.isVariableDeclarationList(initializer) ? initializer.declarations[0] : undefined;
      if (declaration !== undefined && ts.isIdentifier(declaration.name) && declaration.name.text === identifier.text) {
        const objectName = unwrap(current.expression);
        if (!ts.isIdentifier(objectName)) fail(current.expression, 'finite for-in template source must be an exact object binding');
        let objectExpression: ts.ObjectLiteralExpression | undefined;
        const find = (node: ts.Node): void => {
          if (objectExpression !== undefined) return;
          if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === objectName.text && node.initializer !== undefined) {
            const value = unwrap(node.initializer);
            if (ts.isObjectLiteralExpression(value)) objectExpression = value;
          }
          ts.forEachChild(node, find);
        };
        find(source);
        if (objectExpression === undefined) fail(objectName, `unresolved finite options object ${objectName.text}`);
        return [...objectProperties(objectExpression).keys()].sort(compareCodePoint);
      }
    }
    current = current.parent;
  }
  return undefined;
}

function modalAdapterIndex(identifier: ts.Identifier, aliases: Map<string, string>): boolean {
  const callback = enclosingFunctionForIdentifier(identifier);
  if (callback === undefined || callback.parameters.length < 1 || !ts.isIdentifier(callback.parameters[0].name) || callback.parameters[0].name.text !== identifier.text) return false;
  if (!ts.isCallExpression(callback.parent) || callback.parent.arguments[1] !== callback || !ts.isIdentifier(callback.parent.expression) || callback.parent.expression.text !== 'openUpsamplePromptsModal') return false;
  let block: ts.Node | undefined = callback.parent;
  while (block !== undefined && !ts.isBlock(block)) block = block.parent;
  if (block === undefined || !ts.isBlock(block)) return false;
  for (const statement of block.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== 'items' || declaration.initializer === undefined) continue;
      let expression = unwrap(declaration.initializer);
      if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression) && expression.expression.name.text === 'filter') expression = unwrap(expression.expression.expression);
      if (!ts.isCallExpression(expression) || !ts.isPropertyAccessExpression(expression.expression) || expression.expression.name.text !== 'map') continue;
      const arrayPath = canonicalAccessPath(expression.expression.expression, aliases);
      if (arrayPath !== 'config.process[*].sample.samples') continue;
      const mapper = expression.arguments[0];
      if (!ts.isArrowFunction(mapper) || mapper.parameters.length < 2 || !ts.isIdentifier(mapper.parameters[1].name)) continue;
      const mapperIndex = mapper.parameters[1].name.text;
      const body = unwrap(mapper.body as ts.Expression);
      if (!ts.isObjectLiteralExpression(body)) continue;
      const indexValue = objectProperties(body).get('index');
      if (indexValue !== undefined && ts.isIdentifier(unwrap(indexValue)) && (unwrap(indexValue) as ts.Identifier).text === mapperIndex) return true;
    }
  }
  return false;
}

function canonicalSetterPathsFromAst(source: ts.SourceFile, root: ts.Node, aliases: Map<string, string>): string[] {
  const paths = new Set<string>();
  const expandPath = (expression: ts.Expression): string[] => {
    expression = unwrap(expression);
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return [normalizeTrainingBookPath(expression.text)];
    if (!ts.isTemplateExpression(expression)) fail(expression, 'setter path must be a literal or proven finite template');
    let values = [expression.head.text];
    for (const span of expression.templateSpans) {
      const interpolation = unwrap(span.expression);
      if (!ts.isIdentifier(interpolation)) fail(interpolation, 'setter path template interpolation must be a proven identifier');
      const binding = directMapBinding(interpolation, aliases);
      let replacements: string[];
      if (binding?.kind === 'index') replacements = ['*'];
      else if (binding?.kind === 'values') replacements = binding.values;
      else if (finiteForInBinding(interpolation, source) !== undefined) replacements = finiteForInBinding(interpolation, source)!;
      else if (modalAdapterIndex(interpolation, aliases)) replacements = ['*'];
      else fail(interpolation, `unbound setter path template identifier ${interpolation.text}`);
      values = values.flatMap(prefix => replacements.map(replacement => `${prefix}${replacement}${span.literal.text}`));
    }
    return values.map(normalizeTrainingBookPath);
  };
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      const pathIndex = name === 'setNestedValue' ? 2 : name === 'setJobConfig' ? 1 : -1;
      if (pathIndex >= 0 && node.arguments[pathIndex] !== undefined) for (const path of expandPath(node.arguments[pathIndex])) paths.add(path);
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return [...paths].sort(compareCodePoint);
}

export function collectCanonicalSetterPathsFromSource(sourceText: string, sourceName = 'fixture.tsx'): string[] {
  const source = ts.createSourceFile(sourceName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return canonicalSetterPathsFromAst(source, source, sourceAliases(source));
}

type VisibleControlKind = {
  ui_type: NonNullable<UiSourceClaim['value_contract']['ui_type']>;
  widget_kind: NonNullable<UiSourceClaim['value_contract']['widget_kind']>;
  nullable: boolean;
};

const visibleControlKinds: Readonly<Record<string, VisibleControlKind>> = {
  Checkbox: { ui_type: 'boolean', widget_kind: 'checkbox', nullable: false },
  CreatableSelectInput: { ui_type: 'string', widget_kind: 'select', nullable: false },
  NumberInput: { ui_type: 'number', widget_kind: 'number', nullable: true },
  SelectInput: { ui_type: 'string', widget_kind: 'select', nullable: false },
  SliderInput: { ui_type: 'number', widget_kind: 'number', nullable: false },
  TextAreaInput: { ui_type: 'string', widget_kind: 'multiline', nullable: false },
  TextInput: { ui_type: 'string', widget_kind: 'text', nullable: false },
};

function jsxAttributeNode(element: ts.JsxOpeningLikeElement, name: string): ts.JsxAttribute | undefined {
  const attribute = element.attributes.properties.find(item => ts.isJsxAttribute(item) && ts.isIdentifier(item.name) && item.name.text === name);
  return attribute !== undefined && ts.isJsxAttribute(attribute) ? attribute : undefined;
}

function jsxAttributeExpression(attribute: ts.JsxAttribute | undefined): ts.Expression | undefined {
  if (attribute?.initializer === undefined) return undefined;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer;
  if (ts.isJsxExpression(attribute.initializer)) return attribute.initializer.expression;
  return undefined;
}

function staticControlLabel(attribute: ts.JsxAttribute | undefined): string | undefined {
  const initializer = attribute?.initializer;
  if (initializer === undefined) return undefined;
  if (ts.isStringLiteral(initializer)) return initializer.text;
  if (!ts.isJsxExpression(initializer) || initializer.expression === undefined) return undefined;
  const expression = unwrap(initializer.expression);
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  if (!ts.isJsxElement(expression) && !ts.isJsxFragment(expression)) return undefined;
  const parts: string[] = [];
  let dynamic = false;
  const walk = (node: ts.Node): void => {
    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim();
      if (text !== '') parts.push(text);
      return;
    }
    if (ts.isJsxExpression(node)) {
      if (node.expression === undefined) return;
      const child = unwrap(node.expression);
      if (ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child)) {
        const text = child.text.replace(/\s+/g, ' ').trim();
        if (text !== '') parts.push(text);
        return;
      }
      dynamic = true;
      return;
    }
    if (ts.isJsxSelfClosingElement(node)) return;
    ts.forEachChild(node, walk);
  };
  walk(expression);
  return dynamic || parts.length === 0 ? undefined : parts.join(' ');
}

function finiteMapLiteral(node: ts.Expression): TrainingBookValueFact | undefined {
  node = unwrap(node);
  if (ts.isNumericLiteral(node)) {
    const value = Number(node.text);
    if (!Number.isFinite(value)) fail(node, 'finite mapped numeric values must be finite');
    return { kind: 'number', value };
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { kind: 'string', value: node.text };
  if (ts.isArrayLiteralExpression(node)) {
    const items = node.elements.map(item => finiteMapLiteral(item as ts.Expression));
    return items.some(item => item === undefined) ? undefined : { kind: 'array', items: items as TrainingBookValueFact[] };
  }
  return undefined;
}

function finiteMapParameterValues(identifier: ts.Identifier): TrainingBookValueFact[] | undefined {
  let current: ts.Node | undefined = identifier;
  while (current !== undefined) {
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) && current.parameters.length > 0 && ts.isIdentifier(current.parameters[0].name) && current.parameters[0].name.text === identifier.text) {
      if (!ts.isCallExpression(current.parent) || !ts.isPropertyAccessExpression(current.parent.expression) || current.parent.expression.name.text !== 'map') return undefined;
      const receiver = unwrap(current.parent.expression.expression);
      let receiverValues: TrainingBookValueFact[] | undefined;
      if (ts.isArrayLiteralExpression(receiver)) {
        const values = receiver.elements.map(item => finiteMapLiteral(item as ts.Expression));
        if (!values.some(value => value === undefined)) receiverValues = values as TrainingBookValueFact[];
      } else if (ts.isIdentifier(receiver)) {
        receiverValues = finiteMapParameterValues(receiver);
      }
      if (receiverValues === undefined) return undefined;
      return receiverValues.flatMap(value => value.kind === 'array' ? value.items : [value]);
    }
    current = current.parent;
  }
  return undefined;
}

function finiteMappedLabels(attribute: ts.JsxAttribute | undefined): string[] | undefined {
  const expression = jsxAttributeExpression(attribute);
  if (expression === undefined) return undefined;
  const value = unwrap(expression);
  if (!ts.isCallExpression(value) || value.arguments.length !== 0 || !ts.isPropertyAccessExpression(value.expression) || value.expression.name.text !== 'toString') return undefined;
  const receiver = unwrap(value.expression.expression);
  if (!ts.isIdentifier(receiver)) return undefined;
  const values = finiteMapParameterValues(receiver);
  if (values === undefined || values.some(item => item.kind !== 'number' && item.kind !== 'string')) return undefined;
  return values.map(item => String((item as { kind: 'number' | 'string'; value: number | string }).value));
}

function maximalConfigReadPaths(expression: ts.Expression | undefined, aliases: Map<string, string>): string[] {
  if (expression === undefined) return [];
  const direct = canonicalAccessPath(expression, aliases);
  if (direct !== undefined) return [direct];
  const paths: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isExpression(node)) {
      const parent = node.parent;
      const isNestedAccess = (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === node;
      const isAccessName = ts.isIdentifier(node) && ts.isPropertyAccessExpression(parent) && parent.name === node;
      if (!isNestedAccess && !isAccessName) {
        const path = canonicalAccessPath(node, aliases);
        if (path !== undefined) paths.push(path);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(expression);
  return [...new Set(paths)];
}

function semanticPrimaryReadPaths(expression: ts.Expression | undefined, aliases: Map<string, string>): string[] {
  if (expression === undefined) return [];
  expression = unwrap(expression);
  const direct = canonicalAccessPath(expression, aliases);
  if (direct !== undefined) return [direct];
  if (ts.isConditionalExpression(expression)) {
    return [...new Set([
      ...semanticPrimaryReadPaths(expression.whenTrue, aliases),
      ...semanticPrimaryReadPaths(expression.whenFalse, aliases),
    ])];
  }
  if (ts.isBinaryExpression(expression) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(expression.operatorToken.kind)) {
    const left = semanticPrimaryReadPaths(expression.left, aliases);
    return left.length > 0 ? left : semanticPrimaryReadPaths(expression.right, aliases);
  }
  if (ts.isCallExpression(expression)) {
    if (ts.isPropertyAccessExpression(expression.expression)) {
      const receiver = semanticPrimaryReadPaths(expression.expression.expression, aliases);
      if (receiver.length > 0) return receiver;
    }
    const argumentPaths = expression.arguments.flatMap(argument => semanticPrimaryReadPaths(argument, aliases));
    if (argumentPaths.length > 0) return [...new Set(argumentPaths)];
  }
  if (ts.isTemplateExpression(expression)) {
    return [...new Set(expression.templateSpans.flatMap(span => semanticPrimaryReadPaths(span.expression, aliases)))];
  }
  return maximalConfigReadPaths(expression, aliases);
}

function controlOptional(attribute: ts.JsxAttribute | undefined): boolean {
  if (attribute === undefined) return true;
  if (attribute.initializer === undefined) return false;
  const expression = jsxAttributeExpression(attribute);
  if (expression?.kind === ts.SyntaxKind.TrueKeyword) return false;
  if (expression?.kind === ts.SyntaxKind.FalseKeyword) return true;
  fail(attribute, 'dynamic JSX required is unsupported');
}

function literalNumberAttribute(attribute: ts.JsxAttribute | undefined, name: string): number | undefined {
  const expression = jsxAttributeExpression(attribute);
  if (expression === undefined) return undefined;
  const value = unwrap(expression);
  let result: number | undefined;
  if (ts.isNumericLiteral(value)) result = Number(value.text);
  else if (ts.isPrefixUnaryExpression(value) && (value.operator === ts.SyntaxKind.MinusToken || value.operator === ts.SyntaxKind.PlusToken) && ts.isNumericLiteral(value.operand)) {
    result = Number(value.operand.text) * (value.operator === ts.SyntaxKind.MinusToken ? -1 : 1);
  } else fail(attribute, `dynamic JSX ${name} is unsupported`);
  if (!Number.isFinite(result)) fail(attribute, `${name} must be finite`);
  return result;
}

function literalSelectValues(expression: ts.Expression | undefined): TrainingBookValueFact[] | undefined {
  if (expression === undefined) return undefined;
  expression = unwrap(expression);
  if (!ts.isArrayLiteralExpression(expression) || expression.elements.some(item => ts.isSpreadElement(item))) return undefined;
  const result: TrainingBookValueFact[] = [];
  for (const item of expression.elements) {
    const option = unwrap(item as ts.Expression);
    if (!ts.isObjectLiteralExpression(option)) fail(option, 'select option must remain an exact object literal');
    const value = objectProperties(option).get('value');
    if (value === undefined) fail(option, 'select option is missing its accepted value');
    const raw = unwrap(value);
    if (ts.isStringLiteral(raw) || ts.isNoSubstitutionTemplateLiteral(raw)) result.push({ kind: 'string', value: raw.text });
    else if (ts.isNumericLiteral(raw)) result.push({ kind: 'number', value: Number(raw.text) });
    else if (raw.kind === ts.SyntaxKind.TrueKeyword || raw.kind === ts.SyntaxKind.FalseKeyword) result.push({ kind: 'boolean', value: raw.kind === ts.SyntaxKind.TrueKeyword });
    else fail(raw, 'select option value must remain a scalar literal accepted value');
  }
  return result;
}

function uniqueValues(values: TrainingBookValueFact[]): TrainingBookValueFact[] {
  const seen = new Set<string>();
  return values.filter(value => {
    const serialized = JSON.stringify(value);
    if (seen.has(serialized)) return false;
    seen.add(serialized);
    return true;
  });
}

function semanticControlContract(
  node: ts.JsxOpeningLikeElement,
  component: string,
  path: string,
  base: UiSourceClaim['value_contract'],
): UiSourceClaim['value_contract'] {
  const onChange = jsxAttributeExpression(jsxAttributeNode(node, 'onChange'));
  const source = node.getSourceFile();
  const onChangeText = onChange?.getText(source).replace(/\s+/g, ' ') ?? '';
  const contract = { ...base };
  if (/value\s*=\s*null\b/.test(onChangeText) || /\?\s*null\s*:\s*value\b/.test(onChangeText)) contract.nullable = true;
  if (path === 'config.process[*].network.lokr_factor') {
    if (!/setJobConfig\(parseInt\(value\),\s*['"]config\.process\[0\]\.network\.lokr_factor['"]\)/.test(onChangeText)) fail(onChange ?? node, 'LoKr factor semantic integer adapter is unsupported');
    contract.ui_type = 'integer';
    if (contract.accepted_values !== undefined) contract.accepted_values = contract.accepted_values.map(value => {
      if (value.kind !== 'string' || !/^-?\d+$/.test(value.value)) fail(node, 'LoKr factor accepted value must be an integer string');
      return { kind: 'number', value: Number.parseInt(value.value, 10) };
    });
  } else if (path === 'config.process[*].train.validation_config.validation_sigmas') {
    if (!onChangeText.includes("value.split(',').map") || !onChangeText.includes('parseFloat(v)')) fail(onChange ?? node, 'validation sigmas semantic number-list adapter is unsupported');
    contract.ui_type = 'number-list';
    if (contract.accepted_values !== undefined) contract.accepted_values = contract.accepted_values.map(value => {
      if (value.kind !== 'string') fail(node, 'validation sigma accepted value must be a string choice');
      const items = value.value.split(',').map(item => Number.parseFloat(item.trim()));
      if (items.some(item => !Number.isFinite(item))) fail(node, 'validation sigma accepted values must be finite');
      return { kind: 'array', items: items.map(item => ({ kind: 'number', value: item })) };
    });
  } else if (/^config\.process\[\*\]\.datasets\[\*\]\.control_path(?:_[123])?$/.test(path)) {
    if (!/value\s*==\s*['"]['"]\s*\?\s*null\s*:\s*value/.test(onChangeText)) fail(onChange ?? node, 'control dataset nullable adapter is unsupported');
    contract.ui_type = 'string';
    contract.nullable = true;
  } else if (/^config\.process\[\*\]\.sample\.samples\[\*\]\.(?:width|height|seed)$/.test(path)) {
    if (component !== 'TextInput' || !onChangeText.includes('parseInt(value)')) fail(onChange ?? node, 'sample integer text adapter is unsupported');
    contract.ui_type = 'integer';
    contract.nullable = false;
  } else if (path === 'config.process[*].datasets[*].resolution') {
    if (component !== 'Checkbox' || !onChangeText.includes('const resolutions = dataset.resolution.includes(res)')) fail(onChange ?? node, 'dataset resolution integer-list adapter is unsupported');
    contract.ui_type = 'integer-list';
    contract.nullable = false;
  }
  return contract;
}

function lexicalComponentSymbol(node: ts.Node, fallback: string): string {
  let current: ts.Node | undefined = node;
  let result = fallback;
  while (current !== undefined) {
    if (ts.isFunctionDeclaration(current) && current.name !== undefined) result = current.name.text;
    current = current.parent;
  }
  return result;
}

function normalizedDynamicLabel(attribute: ts.JsxAttribute): string {
  const expression = jsxAttributeExpression(attribute);
  if (expression === undefined) return '<dynamic-label>';
  return `<dynamic-label:${expression.getText(attribute.getSourceFile()).replace(/\s+/g, ' ').trim()}>`;
}

export function collectVisibleControlClaimsFromSource(
  sourceText: string,
  sourceName = 'fixture.tsx',
  fallbackSymbol = 'Fixture',
  allowUnresolvedLabels = false,
  allowArchitectureProjectedLabels = false,
): UiSourceClaim[] {
  const source = ts.createSourceFile(sourceName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const aliases = sourceAliases(source);
  const claims = new Map<string, UiSourceClaim>();
  const visit = (node: ts.Node): void => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName)) {
      const component = node.tagName.text;
      const kind = visibleControlKinds[component];
      if (kind !== undefined) {
        const onChange = jsxAttributeExpression(jsxAttributeNode(node, 'onChange'));
        const setterPaths = onChange === undefined ? [] : canonicalSetterPathsFromAst(source, onChange, aliases);
        const boundExpression = jsxAttributeExpression(jsxAttributeNode(node, component === 'Checkbox' ? 'checked' : 'value'));
        const readPaths = semanticPrimaryReadPaths(boundExpression, aliases);
        const matchingReads = readPaths.filter(path => setterPaths.includes(path));
        if (matchingReads.length > 1 || (matchingReads.length === 0 && readPaths.length > 1)) fail(boundExpression, 'visible control primary bound path is ambiguous');
        let path = matchingReads[0] ?? (readPaths.length === 1 ? readPaths[0] : undefined);
        if (path === undefined && setterPaths.length > 0) {
          const longest = [...setterPaths].sort((left, right) => right.split('.').length - left.split('.').length || compareCodePoint(left, right));
          if (longest.length === 1 || longest[0].split('.').length > longest[1].split('.').length) path = longest[0];
        }
        // Controls with neither a bound config value nor a direct config setter are
        // server/transient/adaptor surfaces and are classified by their own slices.
        if (path !== undefined) {
          const labelAttribute = jsxAttributeNode(node, 'label');
          const staticLabel = staticControlLabel(labelAttribute);
          const dynamicText = labelAttribute === undefined ? '<missing-label>' : normalizedDynamicLabel(labelAttribute);
          if (staticLabel === undefined && allowArchitectureProjectedLabels && dynamicText === '<dynamic-label:tag.title>') {
            // Expanded below from each architecture's exact sample_tags projection.
          } else {
            const mappedLabels = staticLabel === undefined ? finiteMappedLabels(labelAttribute) : undefined;
            if (staticLabel === undefined && mappedLabels === undefined && !allowUnresolvedLabels) fail(labelAttribute ?? node, 'dynamic JSX label is unsupported');
            const labels = staticLabel === undefined ? (mappedLabels ?? [dynamicText]) : [staticLabel];
            for (const label of labels) {
              const resolved = staticLabel !== undefined || mappedLabels !== undefined;
              const lexicalSymbol = lexicalComponentSymbol(node, fallbackSymbol);
              const baseContract: UiSourceClaim['value_contract'] = {
                ui_type: kind.ui_type,
                widget_kind: kind.widget_kind,
                optional: controlOptional(jsxAttributeNode(node, 'required')),
                nullable: kind.nullable,
              };
              const acceptedValues = component === 'SelectInput' || component === 'CreatableSelectInput'
                ? literalSelectValues(jsxAttributeExpression(jsxAttributeNode(node, 'options')))
                : undefined;
              if (acceptedValues !== undefined) baseContract.accepted_values = acceptedValues;
              const claim: UiSourceClaim = {
                source_path: sourceName,
                symbol: `${lexicalSymbol}::${component}::${path}::${label}`,
                path,
                kind: 'setting',
                ui_label: resolved ? presence({ kind: 'string', value: label }) : { present: false },
                value_contract: semanticControlContract(node, component, path, baseContract),
              };
              const minimum = literalNumberAttribute(jsxAttributeNode(node, 'min'), 'min');
              const maximum = literalNumberAttribute(jsxAttributeNode(node, 'max'), 'max');
              if (minimum !== undefined) claim.value_contract.minimum = minimum;
              if (maximum !== undefined) claim.value_contract.maximum = maximum;
              const identity = `${claim.source_path}\0${claim.symbol}\0${claim.path}\0${claim.kind}`;
              const existing = claims.get(identity);
              if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(claim)) fail(node, `conflicting duplicate visible control ${claim.symbol}`);
              claims.set(identity, claim);
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...claims.values()].sort((left, right) => compareCodePoint(`${left.path}\0${left.symbol}`, `${right.path}\0${right.symbol}`));
}

function jsxAttribute(element: ts.JsxOpeningLikeElement, name: string): string | undefined {
  const attribute = element.attributes.properties.find(item => ts.isJsxAttribute(item) && ts.isIdentifier(item.name) && item.name.text === name);
  if (attribute === undefined || !ts.isJsxAttribute(attribute) || attribute.initializer === undefined) return undefined;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression !== undefined) {
    const expression = unwrap(attribute.initializer.expression);
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  }
  fail(attribute, `dynamic JSX ${name} is unsupported`);
}

function jsxFact(node: ts.Expression | undefined, repo: AstRepository): StaticJsxFact {
  if (node === undefined) return { present: false };
  node = unwrap(node);
  const text_literals: string[] = [];
  const code_literals: string[] = [];
  const link_hrefs: string[] = [];
  const walk = (child: ts.Node, insideCode = false): void => {
    if (ts.isJsxText(child)) {
      const normalized = child.text.replace(/\s+/g, ' ');
      if (normalized.trim() !== '') (insideCode ? code_literals : text_literals).push(normalized);
      return;
    }
    if (ts.isJsxExpression(child)) {
      if (child.expression === undefined) return;
      const value = repo.value(child.expression);
      if (value.kind !== 'string' && value.kind !== 'number') fail(child, 'dynamic JSX expression is unsupported');
      (insideCode ? code_literals : text_literals).push(String(value.value));
      return;
    }
    if (ts.isJsxElement(child)) {
      const tag = child.openingElement.tagName.getText();
      if (tag === 'a' || tag === 'Link') {
        const href = jsxAttribute(child.openingElement, 'href');
        if (href === undefined) fail(child, 'link JSX requires a static href');
        link_hrefs.push(href);
      }
      const nextInsideCode = insideCode || tag === 'code';
      for (const nested of child.children) walk(nested, nextInsideCode);
      return;
    }
    if (ts.isJsxSelfClosingElement(child)) {
      const tag = child.tagName.getText();
      if (tag === 'a' || tag === 'Link') {
        const href = jsxAttribute(child, 'href');
        if (href === undefined) fail(child, 'link JSX requires a static href');
        link_hrefs.push(href);
      }
      return;
    }
    if (ts.isJsxFragment(child)) {
      for (const nested of child.children) walk(nested, insideCode);
      return;
    }
    fail(child, 'unsupported JSX node');
  };
  if (!ts.isJsxElement(node) && !ts.isJsxFragment(node) && !ts.isJsxSelfClosingElement(node)) fail(node, 'model notes/doc must be static JSX');
  walk(node);
  return { present: true, text_literals, code_literals, link_hrefs };
}

function combinePredicates(kind: 'and' | 'or', operands: ModelOptionPredicateFact[]): ModelOptionPredicateFact {
  if (operands.length === 1) return operands[0];
  let result = operands[0];
  for (const operand of operands.slice(1)) result = { kind, operands: [result, operand] };
  return result;
}

type BlockFunction = (ts.ArrowFunction | ts.FunctionExpression) & { body: ts.Block };

function functionLike(node: ts.Expression): BlockFunction {
  node = unwrap(node);
  if (!ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) fail(node, 'custom option callback must be a local function expression');
  if (!ts.isBlock(node.body)) fail(node, 'custom option callback must use a block body');
  return node as BlockFunction;
}

function pathAliasExpression(expression: ts.Expression, pathAliases: Map<string, string>): string | undefined {
  expression = unwrap(expression);
  if (ts.isIdentifier(expression)) return pathAliases.get(expression.text);
  return pathFromAccess(expression);
}

function parsePredicate(expression: ts.Expression, pathAliases: Map<string, string>, predicateAliases: Map<string, ModelOptionPredicateFact>): ModelOptionPredicateFact {
  expression = unwrap(expression);
  if (ts.isIdentifier(expression)) {
    const predicate = predicateAliases.get(expression.text);
    if (predicate !== undefined) return predicate;
    const path = pathAliases.get(expression.text);
    if (path !== undefined) return { kind: 'truthy', path };
  }
  if (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.ExclamationToken) {
    return { kind: 'not', operand: parsePredicate(expression.operand, pathAliases, predicateAliases) };
  }
  if (ts.isBinaryExpression(expression) && (expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken || expression.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
    return {
      kind: expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ? 'and' : 'or',
      operands: [parsePredicate(expression.left, pathAliases, predicateAliases), parsePredicate(expression.right, pathAliases, predicateAliases)],
    };
  }
  if (ts.isBinaryExpression(expression) && [ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(expression.operatorToken.kind)) {
    const right = unwrap(expression.right);
    const left = unwrap(expression.left);
    if ((ts.isStringLiteral(right) && right.text === '') && ts.isCallExpression(left) && ts.isPropertyAccessExpression(left.expression) && left.expression.name.text === 'trim' && left.arguments.length === 0) {
      const path = pathAliasExpression(left.expression.expression, pathAliases);
      if (path === undefined) fail(left, 'trim predicate must read an exact config path');
      return { kind: 'nonblank-string', path };
    }
  }
  const path = pathAliasExpression(expression, pathAliases);
  if (path !== undefined) return { kind: 'truthy', path };
  fail(expression, 'unsupported custom option predicate');
}

function callbackAliases(callback: BlockFunction): { paths: Map<string, string>; predicates: Map<string, ModelOptionPredicateFact> } {
  const paths = new Map<string, string>();
  const predicates = new Map<string, ModelOptionPredicateFact>();
  for (const statement of callback.body.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) fail(declaration, 'callback aliases must be initialized identifiers');
      const path = pathAliasExpression(declaration.initializer, paths);
      if (path !== undefined) paths.set(declaration.name.text, path);
      else predicates.set(declaration.name.text, parsePredicate(declaration.initializer, paths, predicates));
    }
  }
  return { paths, predicates };
}

function getValueCases(node: ts.Expression, repo: AstRepository): CustomModelSelectOptionFact['get_value_cases'] {
  const callback = functionLike(node);
  const aliases = callbackAliases(callback);
  const result: CustomModelSelectOptionFact['get_value_cases'] = [];
  for (const statement of callback.body.statements) {
    if (ts.isVariableStatement(statement)) continue;
    if (ts.isIfStatement(statement)) {
      const thenStatement = ts.isBlock(statement.thenStatement) ? statement.thenStatement.statements[0] : statement.thenStatement;
      if (thenStatement === undefined || !ts.isReturnStatement(thenStatement) || thenStatement.expression === undefined) fail(statement, 'getValue if branch must contain exactly one return');
      result.push({ condition: parsePredicate(statement.expression, aliases.paths, aliases.predicates), return_value: repo.value(thenStatement.expression) });
      if (statement.elseStatement !== undefined) fail(statement.elseStatement, 'getValue else branches are unsupported; use ordered returns');
      continue;
    }
    if (ts.isReturnStatement(statement) && statement.expression !== undefined) {
      result.push({ condition: { kind: 'always' }, return_value: repo.value(statement.expression) });
      continue;
    }
    fail(statement, 'unsupported getValue control flow');
  }
  if (result.length === 0 || result[result.length - 1].condition.kind !== 'always') fail(callback, 'getValue requires a final unconditional return');
  return result;
}

function selectedBranch(expression: ts.Expression, valueParameter: string): string {
  expression = unwrap(expression);
  if (!ts.isBinaryExpression(expression) || ![ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(expression.operatorToken.kind)) fail(expression, 'onChange branch must compare the selected value');
  const left = unwrap(expression.left);
  const right = unwrap(expression.right);
  if (!ts.isIdentifier(left) || left.text !== valueParameter || !ts.isStringLiteral(right)) fail(expression, 'onChange branch must compare its value parameter with a string literal');
  return right.text;
}

function onChangeWrites(node: ts.Expression, repo: AstRepository): CustomModelSelectOptionFact['writes'] {
  const callback = functionLike(node);
  if (callback.parameters.length < 3 || !ts.isIdentifier(callback.parameters[0].name) || !ts.isIdentifier(callback.parameters[2].name)) fail(callback, 'onChange requires value and setter parameters');
  const valueParameter = callback.parameters[0].name.text;
  const setter = callback.parameters[2].name.text;
  const aliases = callbackAliases(callback);
  const result: CustomModelSelectOptionFact['writes'] = [];
  const walkStatements = (statements: readonly ts.Statement[], selected: string, guard: ModelOptionPredicateFact): void => {
    for (const statement of statements) {
      if (ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression) && ts.isIdentifier(statement.expression.expression) && statement.expression.expression.text === setter) {
        if (statement.expression.arguments.length !== 2 || !ts.isStringLiteral(statement.expression.arguments[1])) fail(statement, 'setter call requires literal value and path arguments');
        result.push({ selected_value: selected, path: normalizeTrainingBookPath(statement.expression.arguments[1].text), value: repo.value(statement.expression.arguments[0]), guard });
      } else if (ts.isIfStatement(statement)) {
        const nestedGuard = parsePredicate(statement.expression, aliases.paths, aliases.predicates);
        const combined = guard.kind === 'always' ? nestedGuard : combinePredicates('and', [guard, nestedGuard]);
        const nestedStatements = ts.isBlock(statement.thenStatement) ? statement.thenStatement.statements : [statement.thenStatement];
        walkStatements(nestedStatements, selected, combined);
        if (statement.elseStatement !== undefined) fail(statement.elseStatement, 'nested onChange else is unsupported');
      } else if (!ts.isVariableStatement(statement)) {
        fail(statement, 'unsupported onChange statement');
      }
    }
  };
  let statement: ts.Statement | undefined = callback.body.statements.find((item: ts.Statement) => !ts.isVariableStatement(item));
  while (statement !== undefined) {
    if (!ts.isIfStatement(statement)) fail(statement, 'onChange requires an if/else-if branch chain');
    const selected = selectedBranch(statement.expression, valueParameter);
    walkStatements(ts.isBlock(statement.thenStatement) ? statement.thenStatement.statements : [statement.thenStatement], selected, { kind: 'always' });
    statement = statement.elseStatement;
    if (statement !== undefined && ts.isBlock(statement)) fail(statement, 'onChange terminal else is unsupported');
  }
  return result;
}

function stringArray(expression: ts.Expression | undefined, repo: AstRepository): string[] {
  if (expression === undefined) return [];
  const value = repo.value(expression);
  if (value.kind !== 'array' || value.items.some(item => item.kind !== 'string')) fail(expression, 'field must be an array of strings');
  return value.items.map(item => (item as { kind: 'string'; value: string }).value);
}

function expandArchitectureDefault(declarationPath: string, selected: TrainingBookValueFact, unselected: TrainingBookValueFact): { leaves: ArchitectureDefaultFact[]; containers: ArchitectureDefaultContainerFact[] } {
  const leaves: ArchitectureDefaultFact[] = [];
  const containers: ArchitectureDefaultContainerFact[] = [];
  const walk = (path: string, left: TrainingBookValueFact | undefined, right: TrainingBookValueFact | undefined): void => {
    const leftObject = left?.kind === 'object' ? left : undefined;
    const rightObject = right?.kind === 'object' ? right : undefined;
    if (leftObject !== undefined || rightObject !== undefined) {
      if ((left !== undefined && leftObject === undefined) || (right !== undefined && rightObject === undefined)) throw new FactsError(`architecture default ${declarationPath} changes container type at ${path}`);
      containers.push({ path, selected_present: leftObject !== undefined, unselected_present: rightObject !== undefined });
      const keys = new Set([...(leftObject?.entries.map(item => item.key) ?? []), ...(rightObject?.entries.map(item => item.key) ?? [])]);
      for (const key of [...keys].sort(compareCodePoint)) walk(`${path}.${key}`, objectEntry(leftObject ?? { kind: 'undefined' }, key), objectEntry(rightObject ?? { kind: 'undefined' }, key));
      return;
    }
    leaves.push({ declaration_path: declarationPath, path, selected: presence(left), unselected: presence(right) });
  };
  walk(declarationPath, selected, unselected);
  leaves.sort((a, b) => compareCodePoint(a.path, b.path));
  containers.sort((a, b) => compareCodePoint(a.path, b.path));
  return { leaves, containers };
}

function customOptions(expression: ts.Expression | undefined, repo: AstRepository): CustomModelSelectOptionsFact {
  if (expression === undefined) return { present: false };
  expression = unwrap(expression);
  if (!ts.isArrayLiteralExpression(expression)) fail(expression, 'customModelSelectOptions must be an array literal');
  const value = expression.elements.map(element => {
    element = unwrap(element as ts.Expression);
    if (!ts.isObjectLiteralExpression(element)) fail(element, 'custom option must be an object literal');
    const fields = objectProperties(element);
    const label = repo.value(fields.get('label') ?? fail(element, 'custom option label is required'));
    if (label.kind !== 'string') fail(element, 'custom option label must be a string');
    const optionsValue = repo.value(fields.get('options') ?? fail(element, 'custom option options are required'));
    if (optionsValue.kind !== 'array') fail(element, 'custom option options must be an array');
    const options = optionsValue.items.map(item => {
      if (item.kind !== 'object') fail(element, 'custom option choice must be an object');
      const optionValue = objectEntry(item, 'value');
      const optionLabel = objectEntry(item, 'label');
      if (optionValue?.kind !== 'string' || optionLabel?.kind !== 'string') fail(element, 'custom option choice needs string value and label');
      if (item.entries.length !== 2) fail(element, 'custom option choice has unsupported fields');
      return { value: optionValue.value, label: optionLabel.value };
    });
    let doc = jsxFact(undefined, repo);
    const docExpression = fields.get('doc');
    if (docExpression !== undefined) {
      const unwrapped = unwrap(docExpression);
      if (!ts.isObjectLiteralExpression(unwrapped)) fail(unwrapped, 'custom option doc must be an object literal');
      const docFields = objectProperties(unwrapped);
      const title = docFields.get('title') === undefined ? undefined : repo.value(docFields.get('title')!);
      if (title !== undefined && title.kind !== 'string') fail(docFields.get('title'), 'custom option doc title must be a string');
      doc = jsxFact(docFields.get('description'), repo);
      if (title !== undefined) doc.text_literals = [title.value, ...(doc.text_literals ?? [])];
    }
    return {
      label: label.value,
      options,
      doc,
      get_value_cases: getValueCases(fields.get('getValue') ?? fail(element, 'custom option getValue is required'), repo),
      writes: onChangeWrites(fields.get('onChange') ?? fail(element, 'custom option onChange is required'), repo),
    };
  });
  return { present: true, value };
}

function architectureFacts(repo: AstRepository): ModelArchitectureFact[] {
  let expression = unwrap(repo.expression('modelArchs'));
  if (
    ts.isCallExpression(expression)
    && ts.isPropertyAccessExpression(expression.expression)
    && expression.expression.name.text === 'sort'
    && expression.arguments.length === 1
  ) {
    const comparator = unwrap(expression.arguments[0]);
    if (!ts.isArrowFunction(comparator) || comparator.parameters.length !== 2 || !ts.isBlock(comparator.body)) {
      fail(expression, 'modelArchs sort must use the known finite label comparator');
    }
    expression = unwrap(expression.expression.expression);
  }
  if (!ts.isArrayLiteralExpression(expression)) fail(expression, 'modelArchs must be an array literal');
  const allowedFields = new Set(['name', 'label', 'group', 'controls', 'isVideoModel', 'hasMultiLinePrompts', 'defaults', 'disableSections', 'additionalSections', 'accuracyRecoveryAdapters', 'sampleTags', 'gateUrl', 'modelNotes', 'customModelSelectOptions']);
  return expression.elements.map(element => {
    element = unwrap(element as ts.Expression);
    if (!ts.isObjectLiteralExpression(element)) fail(element, 'modelArchs entries must be object literals');
    const fields = objectProperties(element);
    for (const key of fields.keys()) if (!allowedFields.has(key)) fail(fields.get(key), `unrepresented ModelArch field ${key}`);
    const requireString = (name: string): string => {
      const value = repo.value(fields.get(name) ?? fail(element, `architecture ${name} is required`));
      if (value.kind !== 'string') fail(fields.get(name), `architecture ${name} must be a string`);
      return value.value;
    };
    const defaults: ArchitectureDefaultFact[] = [];
    const default_containers: ArchitectureDefaultContainerFact[] = [];
    let model_path: PresenceFact = { present: false };
    const defaultsExpression = fields.get('defaults');
    if (defaultsExpression !== undefined) {
      const resolved = unwrap(defaultsExpression);
      if (!ts.isObjectLiteralExpression(resolved)) fail(resolved, 'architecture defaults must be an object literal');
      for (const [rawPath, pairExpression] of objectProperties(resolved)) {
        const declarationPath = normalizeTrainingBookPath(rawPath);
        const pair = repo.value(pairExpression);
        if (pair.kind !== 'array' || pair.items.length !== 2) fail(pairExpression, 'architecture default must be a selected/unselected pair');
        const expanded = expandArchitectureDefault(declarationPath, pair.items[0], pair.items[1]);
        defaults.push(...expanded.leaves);
        default_containers.push(...expanded.containers);
        if (declarationPath === 'config.process[*].model.name_or_path') model_path = presence(pair.items[0]);
      }
    }
    defaults.sort((a, b) => compareCodePoint(a.path, b.path));
    default_containers.sort((a, b) => compareCodePoint(a.path, b.path));
    return {
      name: requireString('name'),
      label: requireString('label'),
      group: requireString('group'),
      model_path,
      gate_url: presence(fields.get('gateUrl') === undefined ? undefined : repo.value(fields.get('gateUrl')!)),
      is_video_model: presence(fields.get('isVideoModel') === undefined ? undefined : repo.value(fields.get('isVideoModel')!)),
      has_multiline_prompts: presence(fields.get('hasMultiLinePrompts') === undefined ? undefined : repo.value(fields.get('hasMultiLinePrompts')!)),
      accuracy_recovery_adapters: presence(fields.get('accuracyRecoveryAdapters') === undefined ? undefined : repo.value(fields.get('accuracyRecoveryAdapters')!)),
      sample_tags: presence(fields.get('sampleTags') === undefined ? undefined : repo.value(fields.get('sampleTags')!)),
      custom_model_select_options: customOptions(fields.get('customModelSelectOptions'), repo),
      model_notes: jsxFact(fields.get('modelNotes'), repo),
      controls: stringArray(fields.get('controls'), repo),
      defaults,
      default_containers,
      disable_sections: stringArray(fields.get('disableSections'), repo),
      additional_sections: stringArray(fields.get('additionalSections'), repo),
    };
  });
}

function flattenDefaults(repo: AstRepository, symbol: string, sourcePath: string, basePath: string): UiDefaultFact[] {
  const value = repo.value(repo.expression(symbol));
  const result: UiDefaultFact[] = [];
  const walk = (path: string, item: TrainingBookValueFact): void => {
    if (item.kind === 'object') {
      for (const entry of item.entries) walk(path === '' ? entry.key : `${path}.${entry.key}`, entry.value);
    } else {
      result.push({ path: normalizeTrainingBookPath(path), value: presence(item), source_path: sourcePath, symbol });
    }
  };
  walk(basePath, value);
  return result;
}

function semanticType(value: TrainingBookValueFact): UiSourceClaim['value_contract']['ui_type'] {
  if (value.kind === 'boolean') return 'boolean';
  if (value.kind === 'number') return 'number';
  if (value.kind === 'string') return 'string';
  if (value.kind === 'object') return 'object';
  if (value.kind === 'array') {
    const kinds = new Set(value.items.map(item => item.kind));
    if (kinds.size === 0) return 'object-list';
    if (kinds.size === 1 && kinds.has('boolean')) return 'boolean-list';
    if (kinds.size === 1 && kinds.has('number')) return 'number-list';
    if (kinds.size === 1 && kinds.has('string')) return 'string-list';
    return 'object-list';
  }
  return null;
}

function defaultClaims(defaults: UiDefaultFact[]): UiSourceClaim[] {
  return defaults.map(item => ({
    source_path: item.source_path,
    symbol: item.symbol,
    path: item.path,
    kind: 'default',
    ui_label: { present: false },
    value_contract: {
      ui_type: item.value.present ? semanticType(item.value.value!) : null,
      widget_kind: null,
      optional: item.value.value?.kind === 'undefined',
      nullable: item.value.value?.kind === 'null',
    },
  }));
}

function canonicalDocPath(raw: string): string {
  if (raw.startsWith('config.')) return normalizeTrainingBookPath(raw);
  if (raw.startsWith('datasets.')) return normalizeTrainingBookPath(`config.process[*].datasets[*].${raw.slice('datasets.'.length)}`);
  for (const prefix of ['model', 'network', 'train', 'save', 'sample', 'logging']) {
    if (raw.startsWith(`${prefix}.`)) return normalizeTrainingBookPath(`config.process[*].${raw}`);
  }
  return normalizeTrainingBookPath(raw);
}

function docClaims(root: string, repo: AstRepository): UiSourceClaim[] {
  const path = 'ui/src/docs.tsx';
  const source = repo.source(path);
  let docsExpression: ts.Expression | undefined;
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === 'docs' && declaration.initializer !== undefined) docsExpression = unwrap(declaration.initializer);
    }
  }
  if (docsExpression === undefined || !ts.isObjectLiteralExpression(docsExpression)) fail(docsExpression, 'docs export must be an object literal');
  return [...objectProperties(docsExpression)].map(([rawPath, expression]) => {
    expression = unwrap(expression);
    if (!ts.isObjectLiteralExpression(expression)) fail(expression, 'docs entry must be an object literal');
    const titleExpression = objectProperties(expression).get('title');
    let title: TrainingBookValueFact | undefined;
    if (titleExpression !== undefined) {
      const resolved = unwrap(titleExpression);
      if (ts.isStringLiteral(resolved) || ts.isNoSubstitutionTemplateLiteral(resolved)) title = { kind: 'string', value: resolved.text };
      else {
        const jsx = jsxFact(resolved, repo);
        const joined = [...(jsx.text_literals ?? []), ...(jsx.code_literals ?? [])].join(' ').replace(/\s+/g, ' ').trim();
        if (joined === '') fail(resolved, `docs title ${rawPath} has no static text`);
        title = { kind: 'string', value: joined };
      }
    }
    return {
      source_path: path,
      symbol: 'docs',
      path: canonicalDocPath(rawPath),
      kind: 'doc' as const,
      ui_label: presence(title),
      value_contract: { ui_type: null, widget_kind: null, optional: false, nullable: false },
    };
  }).sort((left, right) => compareCodePoint(left.path, right.path));
}

function setterClaims(root: string): UiSourceClaim[] {
  const sourcePath = 'ui/src/app/jobs/new/SimpleJob.tsx';
  const compilePrefix = "const defaultCompileOptions = { block_compile: true };\n";
  const sourceText = compilePrefix + readFileSync(join(root, sourcePath), 'utf8');
  return collectCanonicalSetterPathsFromSource(sourceText, sourcePath).map(path => ({
    source_path: sourcePath,
    symbol: 'SimpleJob',
    path,
    kind: 'setter' as const,
    ui_label: { present: false },
    value_contract: { ui_type: null, widget_kind: null, optional: true, nullable: true },
  }));
}

function invertedMaskPriorSettingClaims(sourceText: string, sourcePath: string): UiSourceClaim[] {
  if (!/export\s+function\s+InvertedMaskPriorControl\b/.test(sourceText)) return [];
  const source = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const aliases = sourceAliases(source);
  let occurrence: ts.JsxOpeningLikeElement | undefined;
  const visit = (node: ts.Node): void => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName) && node.tagName.text === 'InvertedMaskPriorControl') {
      if (occurrence !== undefined) fail(node, 'duplicate InvertedMaskPriorControl binding');
      occurrence = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (occurrence === undefined) fail(source, 'missing InvertedMaskPriorControl binding');
  const train = jsxAttributeExpression(jsxAttributeNode(occurrence, 'train'));
  const trainPath = train === undefined ? undefined : canonicalAccessPath(train, aliases);
  if (trainPath !== 'config.process[*].train') fail(train ?? occurrence, 'InvertedMaskPriorControl train prop must bind exact training config');
  const setTrain = jsxAttributeExpression(jsxAttributeNode(occurrence, 'setTrain'));
  const writes = setTrain === undefined ? [] : canonicalSetterPathsFromAst(source, setTrain, aliases);
  const expected = [
    'config.process[*].train.inverted_mask_prior',
    'config.process[*].train.inverted_mask_prior_multiplier',
  ];
  if (JSON.stringify(writes) !== JSON.stringify(expected)) fail(setTrain ?? occurrence, 'InvertedMaskPriorControl setTrain prop writes must remain exact');
  const controls: Array<{ component: string; label: string; field: string; contract: UiSourceClaim['value_contract'] }> = [
    {
      component: 'Checkbox',
      label: 'Inverted Mask Prior',
      field: 'inverted_mask_prior',
      contract: { ui_type: 'boolean', widget_kind: 'checkbox', optional: true, nullable: false },
    },
    {
      component: 'NumberInput',
      label: 'Inverted Mask Prior Multiplier',
      field: 'inverted_mask_prior_multiplier',
      contract: { ui_type: 'number', widget_kind: 'number', optional: true, nullable: true, minimum: 0 },
    },
  ];
  const declaration = source.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === 'InvertedMaskPriorControl');
  if (declaration === undefined || !ts.isFunctionDeclaration(declaration)) fail(source, 'missing InvertedMaskPriorControl declaration');
  for (const expectedControl of controls) {
    let matched: ts.JsxOpeningLikeElement | undefined;
    const findControl = (node: ts.Node): void => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName) && node.tagName.text === expectedControl.component && staticControlLabel(jsxAttributeNode(node, 'label')) === expectedControl.label) {
        if (matched !== undefined) fail(node, `duplicate ${expectedControl.label} control`);
        matched = node;
      }
      ts.forEachChild(node, findControl);
    };
    findControl(declaration);
    if (matched === undefined) fail(declaration, `missing ${expectedControl.label} control`);
    const bound = jsxAttributeExpression(jsxAttributeNode(matched, expectedControl.component === 'Checkbox' ? 'checked' : 'value'));
    const onChange = jsxAttributeExpression(jsxAttributeNode(matched, 'onChange'));
    const boundText = bound?.getText(source) ?? '';
    const changeText = onChange?.getText(source).replace(/\s+/g, ' ') ?? '';
    if (!boundText.includes(`train.${expectedControl.field}`) || !changeText.includes(`${expectedControl.field}: value`)) fail(matched, `${expectedControl.label} control no longer matches its scoped train binding`);
  }
  return controls.map(control => {
    const path = `${trainPath}.${control.field}`;
    return {
      source_path: sourcePath,
      symbol: `InvertedMaskPriorControl::${control.component}::${path}::${control.label}`,
      path,
      kind: 'setting' as const,
      ui_label: presence({ kind: 'string', value: control.label }),
      value_contract: control.contract,
    };
  });
}

function predicatePaths(predicate: ModelOptionPredicateFact): string[] {
  if (predicate.kind === 'truthy' || predicate.kind === 'nonblank-string') return [predicate.path];
  if (predicate.kind === 'not') return predicatePaths(predicate.operand);
  if (predicate.kind === 'and' || predicate.kind === 'or') return predicate.operands.flatMap(predicatePaths);
  return [];
}

export function validateArchitectureProjectedControlTemplates(
  sourceText: string,
  sourcePath = 'fixture.tsx',
  requireSampleTags = false,
  requireCustomModelOptions = false,
): void {
  const source = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const aliases = sourceAliases(source);
  const tagComponents = new Set<string>();
  let customOptions = 0;
  const visit = (node: ts.Node): void => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName)) {
      const label = jsxAttributeNode(node, 'label');
      const dynamicLabel = label === undefined ? undefined : normalizedDynamicLabel(label);
      if (dynamicLabel === '<dynamic-label:tag.title>') {
        if (!['TextInput', 'TextAreaInput', 'NumberInput'].includes(node.tagName.text)) fail(node, 'sample tag control component is unsupported');
        const onChange = jsxAttributeExpression(jsxAttributeNode(node, 'onChange'));
        const writes = onChange === undefined ? [] : canonicalSetterPathsFromAst(source, onChange, aliases);
        if (JSON.stringify(writes) !== JSON.stringify(['config.process[*].sample.samples[*].prompt'])) fail(node, 'sample tag control must write only its exact projected prompt path');
        let projectedWrite = false;
        const findProjectedWrite = (child: ts.Node): void => {
          if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && child.expression.text === 'setJobConfig') {
            const value = child.arguments[0] === undefined ? undefined : unwrap(child.arguments[0]);
            projectedWrite = value !== undefined && ts.isCallExpression(value) && ts.isIdentifier(value.expression) && value.expression.text === 'objToTags' && value.arguments.length === 1 && ts.isIdentifier(unwrap(value.arguments[0])) && (unwrap(value.arguments[0]) as ts.Identifier).text === 'taggedSample';
          }
          ts.forEachChild(child, findProjectedWrite);
        };
        if (onChange !== undefined) findProjectedWrite(onChange);
        if (!projectedWrite) fail(node, 'sample tag control value must use its exact architecture tag projection');
        tagComponents.add(node.tagName.text);
      }
      if (dynamicLabel === '<dynamic-label:customOption.label>') {
        if (node.tagName.text !== 'SelectInput') fail(node, 'custom model option must remain a SelectInput');
        const value = jsxAttributeExpression(jsxAttributeNode(node, 'value'));
        const onChange = jsxAttributeExpression(jsxAttributeNode(node, 'onChange'));
        const options = jsxAttributeExpression(jsxAttributeNode(node, 'options'));
        const valueText = value?.getText(source).replace(/\s+/g, ' ');
        const optionsText = options?.getText(source);
        let exactChange = false;
        if (onChange !== undefined && ts.isArrowFunction(onChange) && onChange.parameters.length === 1 && ts.isIdentifier(onChange.parameters[0].name)) {
          const parameterName = onChange.parameters[0].name.text;
          const body = unwrap(onChange.body as ts.Expression);
          if (ts.isCallExpression(body) && ts.isPropertyAccessExpression(body.expression) && ts.isIdentifier(body.expression.expression) && body.expression.expression.text === 'customOption' && body.expression.name.text === 'onChange') {
            exactChange = body.arguments.length === 3 && body.arguments.every((argument, index) => ts.isIdentifier(unwrap(argument)) && (unwrap(argument) as ts.Identifier).text === [parameterName, 'jobConfig', 'setJobConfig'][index]);
          }
        }
        if (valueText !== "customOption.getValue(jobConfig) ?? ''" || !exactChange || optionsText !== 'customOption.options') fail(node, 'custom model option control no longer matches its architecture projection');
        customOptions += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (requireSampleTags && JSON.stringify([...tagComponents].sort(compareCodePoint)) !== JSON.stringify(['NumberInput', 'TextAreaInput', 'TextInput'])) fail(source, 'sample tag architecture projection must have all three exact control templates');
  if (requireCustomModelOptions && customOptions !== 1) fail(source, 'custom model option architecture projection must have one exact control template');
}

function validateKnownLiveOptionBindings(sourceText: string, sourcePath: string, required: boolean): void {
  const source = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const expected = new Map<string, string>([
    ['Model Architecture', 'groupedModelOptions'],
    ['Transformer', 'transformerQuantizationOptions'],
    ['Text Encoder', 'quantizationOptions'],
  ]);
  const seen = new Set<string>();
  const visit = (node: ts.Node): void => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName) && node.tagName.text === 'SelectInput') {
      const label = staticControlLabel(jsxAttributeNode(node, 'label'));
      const binding = label === undefined ? undefined : expected.get(label);
      if (label !== undefined && binding !== undefined) {
        const options = jsxAttributeExpression(jsxAttributeNode(node, 'options'));
        if (options === undefined || !ts.isIdentifier(unwrap(options)) || (unwrap(options) as ts.Identifier).text !== binding) fail(node, `${label} options must remain bound to ${binding}`);
        if (seen.has(label)) fail(node, `duplicate ${label} options control`);
        seen.add(label);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  for (const [label, binding] of expected) {
    if ((required || new RegExp(`\\b${binding}\\b`).test(sourceText)) && !seen.has(label)) fail(source, `missing ${label} options control`);
  }
}

function arrayOptionValues(repo: AstRepository, symbol: string): TrainingBookValueFact[] {
  const options = repo.value(repo.expression(symbol));
  if (options.kind !== 'array') fail(undefined, `${symbol} must remain an exact finite options array`);
  return options.items.map((item, index) => {
    if (item.kind !== 'object') fail(undefined, `${symbol}[${index}] must remain an option object`);
    const value = objectEntry(item, 'value');
    if (value === undefined || !['string', 'number', 'boolean'].includes(value.kind)) fail(undefined, `${symbol}[${index}].value must remain a scalar`);
    return value;
  });
}

function architectureModelOptionValues(architectures: ModelArchitectureFact[]): TrainingBookValueFact[] {
  const groups = new Map<string, ModelArchitectureFact[]>();
  for (const architecture of architectures) {
    const group = groups.get(architecture.group);
    if (group === undefined) groups.set(architecture.group, [architecture]);
    else group.push(architecture);
  }
  return [...groups.values()].flatMap(group => group.map(architecture => ({ kind: 'string' as const, value: architecture.name })));
}

function architectureProjectedSettingClaims(
  architectures: ModelArchitectureFact[],
  sourcePath: string,
  quantizationValues: TrainingBookValueFact[],
  includeTransformerQuantization: boolean,
  includeSampleTags: boolean,
  includeCustomModelOptions: boolean,
): UiSourceClaim[] {
  const claims: UiSourceClaim[] = [];
  for (const architecture of architectures) {
    if (includeSampleTags && architecture.sample_tags.present && architecture.sample_tags.value?.kind === 'object') {
      for (const tag of architecture.sample_tags.value.entries) {
        if (tag.value.kind !== 'object') fail(undefined, `${architecture.name} sample tag ${tag.key} must be an object`);
        const title = objectEntry(tag.value, 'title');
        const type = objectEntry(tag.value, 'type');
        if (title?.kind !== 'string' || type?.kind !== 'string' || !['text', 'multiline', 'number'].includes(type.value)) fail(undefined, `${architecture.name} sample tag ${tag.key} has an unsupported control projection`);
        const component = type.value === 'multiline' ? 'TextAreaInput' : type.value === 'number' ? 'NumberInput' : 'TextInput';
        const control = visibleControlKinds[component];
        claims.push({
          source_path: sourcePath,
          symbol: `SimpleJob::${component}::config.process[*].sample.samples[*].prompt::${title.value}::architecture=${architecture.name}::tag=${tag.key}`,
          path: 'config.process[*].sample.samples[*].prompt',
          kind: 'setting',
          ui_label: presence(title),
          value_contract: {
            ui_type: control.ui_type,
            widget_kind: control.widget_kind,
            optional: true,
            nullable: control.nullable,
          },
        });
      }
    }
    if (includeCustomModelOptions && architecture.custom_model_select_options.present) {
      for (const option of architecture.custom_model_select_options.value ?? []) {
        const paths = new Set<string>([
          ...option.get_value_cases.flatMap(item => predicatePaths(item.condition)),
          ...option.writes.map(item => item.path),
        ]);
        for (const path of [...paths].sort(compareCodePoint)) {
          const writtenValues = uniqueValues(option.writes.filter(item => item.path === path).map(item => item.value));
          if (writtenValues.length === 0) fail(undefined, `${architecture.name}.${option.label}.${path} has no exact projected writes`);
          const concreteKinds = new Set(writtenValues.filter(value => value.kind !== 'undefined' && value.kind !== 'null').map(value => value.kind));
          if (concreteKinds.size !== 1) fail(undefined, `${architecture.name}.${option.label}.${path} has ambiguous projected semantic types`);
          const concreteKind = [...concreteKinds][0];
          if (!['boolean', 'number', 'string'].includes(concreteKind)) fail(undefined, `${architecture.name}.${option.label}.${path} has an unsupported projected semantic type`);
          claims.push({
            source_path: sourcePath,
            symbol: `SimpleJob::SelectInput::${path}::${option.label}::architecture=${architecture.name}`,
            path,
            kind: 'setting',
            ui_label: presence({ kind: 'string', value: option.label }),
            value_contract: {
              ui_type: concreteKind as 'boolean' | 'number' | 'string',
              widget_kind: 'select',
              optional: writtenValues.some(value => value.kind === 'undefined'),
              nullable: writtenValues.some(value => value.kind === 'null'),
              accepted_values: writtenValues,
            },
          });
        }
      }
    }
    if (includeTransformerQuantization && !architecture.disable_sections.includes('model.quantize')) {
      let acceptedValues = quantizationValues;
      if (architecture.accuracy_recovery_adapters.present && architecture.accuracy_recovery_adapters.value?.kind === 'object') {
        const adapters = architecture.accuracy_recovery_adapters.value.entries.map(entry => entry.value);
        if (adapters.some(value => value.kind !== 'string')) fail(undefined, `${architecture.name} accuracy recovery adapter values must be strings`);
        acceptedValues = [
          ...quantizationValues.slice(0, 2),
          ...adapters,
          ...quantizationValues.slice(2),
        ];
      }
      claims.push({
        source_path: sourcePath,
        symbol: `SimpleJob::SelectInput::config.process[*].model.qtype::Transformer::architecture=${architecture.name}`,
        path: 'config.process[*].model.qtype',
        kind: 'setting',
        ui_label: presence({ kind: 'string', value: 'Transformer' }),
        value_contract: {
          ui_type: 'string',
          widget_kind: 'select',
          optional: true,
          nullable: false,
          accepted_values: uniqueValues(acceptedValues.map(value =>
            value.kind === 'string' && value.value === '' ? { kind: 'string', value: 'qfloat8' } : value)),
        },
      });
    }
  }
  return claims;
}

function visibleSettingClaims(root: string, architectures: ModelArchitectureFact[], repo: AstRepository): UiSourceClaim[] {
  const sourcePath = 'ui/src/app/jobs/new/SimpleJob.tsx';
  const compilePrefix = "const defaultCompileOptions = { block_compile: true };\n";
  const sourceText = readFileSync(join(root, sourcePath), 'utf8');
  const liveInventory = architectures.length === 51;
  const includeTransformerQuantization = liveInventory;
  const includeSampleTags = liveInventory && architectures.some(architecture => architecture.sample_tags.present);
  const includeCustomModelOptions = liveInventory && architectures.some(architecture => architecture.custom_model_select_options.present);
  validateArchitectureProjectedControlTemplates(sourceText, sourcePath, includeSampleTags, includeCustomModelOptions);
  validateKnownLiveOptionBindings(sourceText, sourcePath, liveInventory);
  const quantizationValues = includeTransformerQuantization ? arrayOptionValues(repo, 'quantizationOptions') : [];
  const directClaims = collectVisibleControlClaimsFromSource(
    compilePrefix + sourceText,
    sourcePath,
    'SimpleJob',
    false,
    true,
  ).filter(claim => claim.path !== 'config.process[*].model.qtype');
  for (const claim of directClaims) {
    if (claim.path === 'config.process[*].model.arch') claim.value_contract.accepted_values = architectureModelOptionValues(architectures);
    if (claim.path === 'config.process[*].model.qtype_te') claim.value_contract.accepted_values = uniqueValues(quantizationValues.map(value =>
      value.kind === 'string' && value.value === '' ? { kind: 'string', value: 'qfloat8' } : value));
  }
  return [
    ...directClaims,
    ...invertedMaskPriorSettingClaims(sourceText, sourcePath),
    ...architectureProjectedSettingClaims(
      architectures,
      sourcePath,
      quantizationValues,
      includeTransformerQuantization,
      includeSampleTags,
      includeCustomModelOptions,
    ),
  ];
}

interface DeclaredServerFact {
  source_path: string;
  symbol: string;
  path: string;
  ui_type: UiSourceClaim['value_contract']['ui_type'];
  required: string[];
  accepted_values?: TrainingBookValueFact[];
}

const serverFact = (
  source_path: string,
  symbol: string,
  path: string,
  ui_type: DeclaredServerFact['ui_type'],
  required: string[],
  accepted_values?: TrainingBookValueFact[],
): DeclaredServerFact => ({ source_path, symbol, path, ui_type, required, accepted_values });

const stringValues = (...values: string[]): TrainingBookValueFact[] =>
  values.map(value => ({ kind: 'string', value }));

const SERVER_GLOBAL_FACTS: DeclaredServerFact[] = [
  serverFact('ui/src/app/jobs/new/SimpleJob.tsx', 'SimpleJob::process.env.NODE_ENV', 'NODE_ENV', 'string', ["process.env.NODE_ENV === 'development'"]),
  serverFact('ui/src/app/jobs/new/page.tsx', 'TrainingForm::process.env.NODE_ENV', 'NODE_ENV', 'string', ["process.env.NODE_ENV === 'development'"]),
  serverFact('ui/src/app/jobs/new/page.tsx', 'TrainingForm::hydrate::gpuids', 'gpuids', 'string', ['setGpuIDs(data.gpu_ids)']),
  serverFact('ui/src/app/jobs/new/page.tsx', 'TrainingForm::default::gpuids', 'gpuids', 'string', ['setGpuIDs(`${gpuList[0].index}`)']),
  serverFact('ui/src/app/jobs/new/page.tsx', 'TrainingForm::import::config.process[*].sqlite_db_path', 'config.process[*].sqlite_db_path', 'path', ["parsed.config.process[0].sqlite_db_path = './aitk_db.db'"]),
  serverFact('ui/src/app/jobs/new/page.tsx', 'TrainingForm::import::config.process[*].training_folder', 'config.process[*].training_folder', 'path', ['parsed.config.process[0].training_folder = settings.TRAINING_FOLDER']),
  serverFact('ui/src/app/jobs/new/page.tsx', 'TrainingForm::import::config.process[*].device', 'config.process[*].device', 'string', ["parsed.config.process[0].device = 'cuda'"], stringValues('cuda')),
  serverFact('ui/src/app/jobs/new/page.tsx', 'TrainingForm::import::config.process[*].performance_log_every', 'config.process[*].performance_log_every', 'number', ['parsed.config.process[0].performance_log_every = 10']),
  serverFact('ui/src/app/jobs/new/page.tsx', 'TrainingForm::settings::config.process[*].training_folder', 'config.process[*].training_folder', 'path', ["setJobConfig(settings.TRAINING_FOLDER, 'config.process[0].training_folder')"]),

  ...(['HF_TOKEN', 'TRAINING_FOLDER', 'DATASETS_FOLDER', 'MODELS_PATH'] as const).map(key =>
    serverFact(
      'ui/src/hooks/useSettings.tsx',
      `useSettings::hydrate::settings.${key}`,
      `settings.${key}`,
      key.endsWith('FOLDER') || key === 'MODELS_PATH' ? 'path' : 'string',
      [`${key}: data.${key} || ''`],
    )),
  ...(['HF_TOKEN', 'TRAINING_FOLDER', 'DATASETS_FOLDER', 'MODELS_PATH'] as const).map(key =>
    serverFact(
      'ui/src/app/api/settings/route.ts',
      `Settings.POST::settings.${key}`,
      `settings.${key}`,
      key.endsWith('FOLDER') || key === 'MODELS_PATH' ? 'path' : 'string',
      [`where: { key: '${key}' }`, `create: { key: '${key}', value: ${key} }`],
    )),
  serverFact('ui/src/app/api/settings/route.ts', 'Settings.GET::process.env.MODELS_PATH', 'MODELS_PATH', 'path', ['process.env.MODELS_PATH', 'settingsObject.MODELS_PATH = process.env.MODELS_PATH']),

  serverFact('ui/src/server/settings.ts', 'getDatasetsRoot::settings.DATASETS_FOLDER', 'settings.DATASETS_FOLDER', 'path', ["const key = 'DATASETS_FOLDER'", 'datasetsPath = path.resolve(datasetsPath)']),
  serverFact('ui/src/server/settings.ts', 'getTrainingFolder::settings.TRAINING_FOLDER', 'settings.TRAINING_FOLDER', 'path', ["const key = 'TRAINING_FOLDER'", 'trainingRoot = path.resolve(trainingRoot)']),
  serverFact('ui/src/server/settings.ts', 'getHFToken::settings.HF_TOKEN', 'settings.HF_TOKEN', 'string', ["const key = 'HF_TOKEN'", "token = ''"]),
  serverFact('ui/src/server/settings.ts', 'getDataRoot::settings.DATA_ROOT', 'settings.DATA_ROOT', 'path', ["const key = 'DATA_ROOT'", 'dataRoot = path.resolve(dataRoot)']),
  serverFact('ui/cron/paths.ts', 'getTrainingFolder::settings.TRAINING_FOLDER', 'settings.TRAINING_FOLDER', 'path', ["const key = 'TRAINING_FOLDER'", 'trainingRoot = defaultTrainFolder']),
  serverFact('ui/cron/paths.ts', 'getHFToken::settings.HF_TOKEN', 'settings.HF_TOKEN', 'string', ["const key = 'HF_TOKEN'", "let token = ''"]),
  serverFact('ui/cron/paths.ts', 'getModelsPath::settings.MODELS_PATH', 'settings.MODELS_PATH', 'path', ["const key = 'MODELS_PATH'", "let modelsPath = ''"]),
  serverFact('ui/cron/paths.ts', 'getDataRoot::settings.DATA_ROOT', 'settings.DATA_ROOT', 'path', ["key: 'DATA_ROOT'", 'defaultDataRoot']),
  serverFact('ui/cron/paths.ts', '<module>::process.env.AI_TOOLKIT_QUIET_PATHS', 'AI_TOOLKIT_QUIET_PATHS', 'string', ['process.env.AI_TOOLKIT_QUIET_PATHS']),

  serverFact('ui/src/app/layout.tsx', 'RootLayout::process.env.AI_TOOLKIT_AUTH', 'AI_TOOLKIT_AUTH', 'string', ['process.env.AI_TOOLKIT_AUTH ? true : false']),
  serverFact('ui/src/app/layout.tsx', 'RootLayout::os.platform', 'server.platform', 'string', ['const platform = os.platform()', 'window.server_platform']),
  serverFact('ui/src/app/layout.tsx', 'RootLayout::localStorage.getItem(theme)', 'browser.localStorage.theme', 'string', ["localStorage.getItem('theme') || 'dark'"], stringValues('dark', 'light')),
  serverFact('ui/src/components/Sidebar.tsx', 'Sidebar::process.env.NEXT_PUBLIC_APP_VERSION', 'NEXT_PUBLIC_APP_VERSION', 'string', ['process.env.NEXT_PUBLIC_APP_VERSION']),
  serverFact('ui/src/components/ThemeProvider.tsx', 'ThemeProvider::localStorage.getItem(theme)', 'browser.localStorage.theme', 'string', ["localStorage.getItem('theme') as Theme | null"]),
  serverFact('ui/src/components/ThemeProvider.tsx', 'ThemeProvider::localStorage.setItem(theme)', 'browser.localStorage.theme', 'string', ["localStorage.setItem('theme', next)"], stringValues('dark', 'light')),
  serverFact('ui/src/server/prisma.ts', '<module>::process.env.NODE_ENV', 'NODE_ENV', 'string', ["process.env.NODE_ENV !== 'production'"]),

  serverFact('ui/src/middleware.ts', 'middleware::process.env.AI_TOOLKIT_AUTH', 'AI_TOOLKIT_AUTH', 'string', ['process.env.AI_TOOLKIT_AUTH || null']),
  serverFact('ui/src/middleware.ts', 'middleware::Authorization.bearer', 'http.Authorization', 'string', ["request.headers.get('Authorization')?.split(' ')[1]", 'token !== tokenToUse']),
  serverFact('ui/src/components/AuthWrapper.tsx', 'AuthWrapper::mount::localStorage.getItem(AI_TOOLKIT_AUTH)', 'browser.localStorage.AI_TOOLKIT_AUTH', 'string', ["localStorage.getItem('AI_TOOLKIT_AUTH') || ''", 'setToken(storedToken)']),
  serverFact('ui/src/components/AuthWrapper.tsx', 'AuthWrapper::checkAuth::localStorage.getItem(AI_TOOLKIT_AUTH)', 'browser.localStorage.AI_TOOLKIT_AUTH', 'string', ["const currentToken = localStorage.getItem('AI_TOOLKIT_AUTH') || ''", "apiClient.get('/api/auth')"]),
  serverFact('ui/src/components/AuthWrapper.tsx', 'AuthWrapper::handleSubmit::localStorage.setItem(AI_TOOLKIT_AUTH)', 'browser.localStorage.AI_TOOLKIT_AUTH', 'string', ["localStorage.setItem('AI_TOOLKIT_AUTH', token)"]),
  serverFact('ui/src/utils/api.ts', 'apiClient.request::localStorage.getItem(AI_TOOLKIT_AUTH)', 'browser.localStorage.AI_TOOLKIT_AUTH', 'string', ["localStorage.getItem('AI_TOOLKIT_AUTH')"]),
  serverFact('ui/src/utils/api.ts', 'apiClient.request::Authorization.bearer', 'http.Authorization', 'string', ["config.headers['Authorization'] = `Bearer ${token}`"]),
  serverFact('ui/src/utils/api.ts', 'apiClient.response::status=401', 'auth.is_authorized', 'boolean', ['error.response.status === 401', 'isAuthorizedState.set(false)']),
  serverFact('ui/src/utils/api.ts', 'apiClient.response::localStorage.removeItem(AI_TOOLKIT_AUTH)', 'browser.localStorage.AI_TOOLKIT_AUTH', 'string', ["localStorage.removeItem('AI_TOOLKIT_AUTH')"]),
  serverFact('ui/src/utils/callScript.ts', 'callScriptStream::localStorage.getItem(AI_TOOLKIT_AUTH)', 'browser.localStorage.AI_TOOLKIT_AUTH', 'string', ["localStorage.getItem('AI_TOOLKIT_AUTH') : null"]),
  serverFact('ui/src/utils/callScript.ts', 'callScriptStream::Authorization.bearer', 'http.Authorization', 'string', ["headers['Authorization'] = `Bearer ${token}`"]),

  serverFact('ui/cron/worker.ts', 'ensureJournalMode::process.env.AI_TOOLKIT_DB_JOURNAL_MODE', 'AI_TOOLKIT_DB_JOURNAL_MODE', 'string', ['process.env.AI_TOOLKIT_DB_JOURNAL_MODE', 'VALID_JOURNAL_MODES.includes(targetMode)'], stringValues('DELETE', 'TRUNCATE', 'PERSIST', 'MEMORY', 'WAL', 'OFF')),
  serverFact('ui/cron/fileServer.ts', '<module>::process.env.AI_TOOLKIT_FILE_SERVER_WORKERS', 'AI_TOOLKIT_FILE_SERVER_WORKERS', 'integer', ['process.env.AI_TOOLKIT_FILE_SERVER_WORKERS', 'env > 0']),
  serverFact('ui/cron/fileServer.ts', '<module>::cli.port', 'ui.file_server.port', 'integer', ["argValue('--port', isDev ? 3000 : 8675)"]),
  serverFact('ui/cron/fileServer.ts', '<module>::process.env.LD_LIBRARY_PATH', 'LD_LIBRARY_PATH', 'string', ['process.env.LD_LIBRARY_PATH']),
  serverFact('ui/cron/fileServer.ts', 'cluster.worker::process.env.AI_TOOLKIT_QUIET_PATHS', 'AI_TOOLKIT_QUIET_PATHS', 'string', ["AI_TOOLKIT_QUIET_PATHS: '1'"]),
  serverFact('ui/cron/fileServer.ts', 'cluster.worker::process.env.PUBLIC_PORT', 'PUBLIC_PORT', 'integer', ['process.env.PUBLIC_PORT!']),
  serverFact('ui/cron/fileServer.ts', 'cluster.worker::process.env.UPSTREAM_PORT', 'UPSTREAM_PORT', 'integer', ['process.env.UPSTREAM_PORT!']),
  serverFact('ui/cron/fileServer.ts', 'getRoots::settings.DATASETS_FOLDER', 'settings.DATASETS_FOLDER', 'path', ["key: { in: ['DATASETS_FOLDER', 'TRAINING_FOLDER', 'DATA_ROOT'] }", "datasets: fromRow('DATASETS_FOLDER'"]),
  serverFact('ui/cron/fileServer.ts', 'getRoots::settings.TRAINING_FOLDER', 'settings.TRAINING_FOLDER', 'path', ["training: fromRow('TRAINING_FOLDER'"]),
  serverFact('ui/cron/fileServer.ts', 'getRoots::settings.DATA_ROOT', 'settings.DATA_ROOT', 'path', ["data: fromRow('DATA_ROOT'"]),
  serverFact('ui/cron/actions/startJob.ts', 'startJob::settings.HF_TOKEN', 'settings.HF_TOKEN', 'string', ['const hfToken = await getHFToken()', 'additionalEnv.HF_TOKEN = hfToken']),
  serverFact('ui/cron/actions/startJob.ts', 'startJob::process.env.MODELS_PATH', 'MODELS_PATH', 'path', ['process.env.MODELS_PATH', 'additionalEnv.MODELS_PATH = modelsPath']),
  serverFact('ui/cron/actions/startJob.ts', 'startJob::job.status', 'job.status', 'string', ["status: 'running'", "status: 'error'"], stringValues('error', 'running')),
  serverFact('ui/cron/actions/startJob.ts', 'startJob::job.return_to_queue', 'job.return_to_queue', 'boolean', ['return_to_queue: false']),
  serverFact('ui/cron/actions/startJob.ts', 'startJob::job.info', 'job.info', 'string', ["info: 'Starting job...'", 'Error launching job:']),
  serverFact('ui/cron/actions/startJob.ts', 'startJob::job.pid', 'job.pid', 'integer', ['data: { pid }', 'pid: null']),

  serverFact('ui/src/app/api/ostris_cloud/route.ts', 'GET::process.env.OSTRIS_CLOUD_APP_URL', 'OSTRIS_CLOUD_APP_URL', 'string', ['process.env.OSTRIS_CLOUD_APP_URL']),
  serverFact('ui/src/app/api/ostris_cloud/route.ts', 'GET::process.env.OSTRIS_CLOUD_API_KEY', 'OSTRIS_CLOUD_API_KEY', 'string', ['process.env.OSTRIS_CLOUD_API_KEY', 'Authorization: `Bearer ${apiKey}`']),
  serverFact('ui/src/app/api/jobs/route.ts', 'POST::gpuids', 'gpuids', 'string', ['resolveGpuIds(body.gpu_ids, isMac())', 'gpu_ids,']),
  serverFact('ui/src/app/api/queue/[queueID]/start/route.ts', 'GET::queue.gpu_ids', 'queue.gpu_ids', 'string', ['data: { gpu_ids: queueID, is_running: true }']),
  serverFact('ui/src/app/api/queue/[queueID]/start/route.ts', 'GET::queue.is_running', 'queue.is_running', 'boolean', ['is_running: true']),
  serverFact('ui/src/app/api/queue/[queueID]/stop/route.ts', 'GET::queue.is_running', 'queue.is_running', 'boolean', ['is_running: false']),
  serverFact('ui/cron/actions/processQueue.ts', 'processQueue::queue.is_running', 'queue.is_running', 'boolean', ['if (queue.is_running)', 'data: { is_running: false }']),
  serverFact('ui/cron/actions/processQueue.ts', 'processQueue::job.return_to_queue', 'job.return_to_queue', 'boolean', ['return_to_queue: true']),
  serverFact('ui/cron/actions/processQueue.ts', 'processQueue::job.info', 'job.info', 'string', ["info: 'Stopping job...'"]),
  serverFact('ui/src/app/api/jobs/[jobID]/start/route.ts', 'GET::job.queue_position', 'job.queue_position', 'integer', ['queue_position: queuePosition']),
  serverFact('ui/src/app/api/jobs/[jobID]/start/route.ts', 'GET::job.status', 'job.status', 'string', ["status: 'queued'"], stringValues('queued')),
  serverFact('ui/src/app/api/jobs/[jobID]/start/route.ts', 'GET::job.stop', 'job.stop', 'boolean', ['stop: false']),
  serverFact('ui/src/app/api/jobs/[jobID]/start/route.ts', 'GET::job.return_to_queue', 'job.return_to_queue', 'boolean', ['return_to_queue: false']),
  serverFact('ui/src/app/api/jobs/[jobID]/start/route.ts', 'GET::job.info', 'job.info', 'string', ["info: 'Job queued'"]),
  serverFact('ui/src/app/api/jobs/[jobID]/start/route.ts', 'GET::queue.is_running', 'queue.is_running', 'boolean', ['is_running: false']),
  serverFact('ui/src/app/api/jobs/[jobID]/stop/route.ts', 'GET::job.stop', 'job.stop', 'boolean', ['stop: true']),
  serverFact('ui/src/app/api/jobs/[jobID]/stop/route.ts', 'GET::job.status', 'job.status', 'string', ["status: 'stopped'"], stringValues('stopped')),
  serverFact('ui/src/app/api/jobs/[jobID]/stop/route.ts', 'GET::job.info', 'job.info', 'string', ["info: 'Stopping job...'", "info: 'Job stopped'"]),
  serverFact('ui/src/app/api/jobs/[jobID]/mark_stopped/route.ts', 'GET::job.stop', 'job.stop', 'boolean', ['stop: true']),
  serverFact('ui/src/app/api/jobs/[jobID]/mark_stopped/route.ts', 'GET::job.status', 'job.status', 'string', ["status: 'stopped'"], stringValues('stopped')),
  serverFact('ui/src/app/api/jobs/[jobID]/mark_stopped/route.ts', 'GET::job.info', 'job.info', 'string', ["info: 'Job stopped'"]),
  serverFact('ui/src/app/api/jobs/[jobID]/mark_stopped/route.ts', 'GET::job.pid', 'job.pid', 'integer', ['pid: null']),
  serverFact('ui/src/app/api/jobs/[jobID]/save_now/route.ts', 'GET::job.save_now', 'job.save_now', 'boolean', ['save_now: true']),
  serverFact('ui/src/app/api/jobs/[jobID]/sample_now/route.ts', 'GET::job.sample_now', 'job.sample_now', 'boolean', ['sample_now: true']),
];

const SETTINGS_CONTROL_FACTS: Array<{
  key: 'HF_TOKEN' | 'TRAINING_FOLDER' | 'DATASETS_FOLDER' | 'MODELS_PATH';
  label: string;
  ui_type: 'string' | 'path';
  input_type: 'password' | 'text';
}> = [
  { key: 'HF_TOKEN', label: 'Hugging Face Token', ui_type: 'string', input_type: 'password' },
  { key: 'TRAINING_FOLDER', label: 'Training Folder Path', ui_type: 'path', input_type: 'text' },
  { key: 'DATASETS_FOLDER', label: 'Dataset Folder Path', ui_type: 'path', input_type: 'text' },
  { key: 'MODELS_PATH', label: 'Models Folder Path', ui_type: 'path', input_type: 'text' },
];

export function collectDeclaredServerGlobalClaimsFromSource(
  sourcePath: string,
  source: string,
): UiSourceClaim[] {
  const specs = SERVER_GLOBAL_FACTS.filter(
    spec => spec.source_path === sourcePath,
  );
  const claims: UiSourceClaim[] = specs.map(spec => {
    for (const required of spec.required) {
      if (!source.includes(required)) {
        throw new FactsError(
          `${spec.source_path} no longer satisfies ${spec.symbol}: missing ${required}`,
        );
      }
    }
    return {
      source_path: spec.source_path,
      symbol: spec.symbol,
      path: spec.path,
      kind: 'server-state' as const,
      ui_label: { present: false },
      value_contract: {
        ui_type: spec.ui_type,
        widget_kind: 'read-only' as const,
        optional: true,
        nullable: true,
        ...(spec.accepted_values === undefined ? {} : { accepted_values: spec.accepted_values }),
      },
    };
  });
  const settingsPath = 'ui/src/app/settings/page.tsx';
  if (sourcePath === settingsPath) {
    for (const control of SETTINGS_CONTROL_FACTS) {
      for (const required of [
        `htmlFor="${control.key}"`,
        `type="${control.input_type}"`,
        `name="${control.key}"`,
        `value={settings.${control.key}}`,
        'onChange={handleChange}',
      ]) {
        if (!source.includes(required)) {
          throw new FactsError(`${settingsPath} no longer satisfies ${control.key} control: missing ${required}`);
        }
      }
      claims.push({
        source_path: settingsPath,
        symbol: `Settings::input::settings.${control.key}::${control.label}`,
        path: `settings.${control.key}`,
        kind: 'setting',
        ui_label: presence({ kind: 'string', value: control.label }),
        value_contract: {
          ui_type: control.ui_type,
          widget_kind: 'text',
          optional: true,
          nullable: false,
        },
      });
    }
  }
  const authPath = 'ui/src/components/AuthWrapper.tsx';
  if (sourcePath === authPath) {
    for (const required of ['htmlFor="token"', 'name="token"', 'type="password"', 'value={token}', 'onChange={e => setToken(e.target.value)}']) {
      if (!source.includes(required)) throw new FactsError(`${authPath} no longer satisfies Password control: missing ${required}`);
    }
    claims.push({
      source_path: authPath,
      symbol: 'AuthWrapper::input::browser.localStorage.AI_TOOLKIT_AUTH::Password',
      path: 'browser.localStorage.AI_TOOLKIT_AUTH',
      kind: 'setting',
      ui_label: presence({ kind: 'string', value: 'Password' }),
      value_contract: {
        ui_type: 'string', widget_kind: 'text', optional: false, nullable: false,
      },
    });
  }
  if (claims.length === 0) {
    throw new FactsError(
      `${sourcePath} is not a declared server/global source boundary`,
    );
  }
  return claims.sort((left, right) => compareCodePoint(
    `${left.source_path}\0${left.symbol}\0${left.path}\0${left.kind}`,
    `${right.source_path}\0${right.symbol}\0${right.path}\0${right.kind}`,
  ));
}

function declaredServerGlobalClaims(root: string): UiSourceClaim[] {
  const sourcePaths = new Set(SERVER_GLOBAL_FACTS.map(spec => spec.source_path));
  sourcePaths.add('ui/src/app/settings/page.tsx');
  sourcePaths.add('ui/src/components/AuthWrapper.tsx');
  return [...sourcePaths]
    .sort(compareCodePoint)
    .flatMap(sourcePath => collectDeclaredServerGlobalClaimsFromSource(
      sourcePath,
      readFileSync(join(root, sourcePath), 'utf8'),
    ));
}

function globalSettingClaims(root: string, required: boolean): UiSourceClaim[] {
  const sourcePath = 'ui/src/app/jobs/new/SimpleJob.tsx';
  const sourceText = readFileSync(join(root, sourcePath), 'utf8');
  if (!/\bgpuIDs\b/.test(sourceText)) {
    if (required) fail(undefined, 'missing required live GPU ID state binding');
    return [];
  }
  const source = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let gpuControl: ts.JsxOpeningLikeElement | undefined;
  const visit = (node: ts.Node): void => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName) && node.tagName.text === 'SelectInput' && staticControlLabel(jsxAttributeNode(node, 'label')) === 'GPU ID') {
      if (gpuControl !== undefined) fail(node, 'duplicate GPU ID control');
      gpuControl = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (gpuControl === undefined) fail(source, 'missing GPU ID control');
  const value = jsxAttributeExpression(jsxAttributeNode(gpuControl, 'value'));
  const onChange = jsxAttributeExpression(jsxAttributeNode(gpuControl, 'onChange'));
  const exactValue = value !== undefined && ts.isTemplateExpression(value) && value.head.text === '' && value.templateSpans.length === 1 && ts.isIdentifier(unwrap(value.templateSpans[0].expression)) && (unwrap(value.templateSpans[0].expression) as ts.Identifier).text === 'gpuIDs' && value.templateSpans[0].literal.text === '';
  let exactChange = false;
  if (onChange !== undefined && ts.isArrowFunction(onChange) && onChange.parameters.length === 1 && ts.isIdentifier(onChange.parameters[0].name)) {
    const body = unwrap(onChange.body as ts.Expression);
    exactChange = ts.isCallExpression(body) && ts.isIdentifier(body.expression) && body.expression.text === 'setGpuIDs' && body.arguments.length === 1 && ts.isIdentifier(unwrap(body.arguments[0])) && (unwrap(body.arguments[0]) as ts.Identifier).text === onChange.parameters[0].name.text;
  }
  if (!exactValue || !exactChange) fail(gpuControl, 'GPU ID control binding is unsupported');
  const claims: UiSourceClaim[] = [{
    source_path: sourcePath,
    symbol: 'SimpleJob::SelectInput::gpuids::GPU ID',
    path: 'gpuids',
    kind: 'setting',
    ui_label: presence({ kind: 'string', value: 'GPU ID' }),
    value_contract: {
      ui_type: 'string',
      widget_kind: 'select',
      optional: true,
      nullable: false,
    },
  }];
  if (required) claims.push(...declaredServerGlobalClaims(root));
  return claims.sort((left, right) => compareCodePoint(
    `${left.source_path}\0${left.symbol}\0${left.path}\0${left.kind}`,
    `${right.source_path}\0${right.symbol}\0${right.path}\0${right.kind}`,
  ));
}

export function collectTrainingBookUiFacts(repositoryRoot: string): TrainingBookUiFacts {
  const root = resolve(repositoryRoot);
  const repo = new AstRepository(root);
  repo.loadStandardSources();
  repo.source('ui/src/docs.tsx');
  const defaults = [
    ...flattenDefaults(repo, 'defaultJobConfig', 'ui/src/app/jobs/new/jobConfig.ts', ''),
    ...flattenDefaults(repo, 'defaultDatasetConfig', 'ui/src/app/jobs/new/jobConfig.ts', 'config.process[*].datasets[*]'),
    ...flattenDefaults(repo, 'defaultSampleConfig', 'ui/src/helpers/defaultSamples.ts', 'config.process[*].sample'),
    ...flattenDefaults(repo, 'defaultAudioSampleConfig', 'ui/src/helpers/defaultSamples.ts', 'config.process[*].sample'),
    ...flattenDefaults(repo, 'defaultIdeogramSamplesConfig', 'ui/src/helpers/defaultSamples.ts', 'config.process[*].sample'),
  ];
  defaults.sort((left, right) => compareCodePoint(`${left.path}\0${left.source_path}\0${left.symbol}`, `${right.path}\0${right.source_path}\0${right.symbol}`));
  const model_architectures = architectureFacts(repo);
  const config_claims = [...defaultClaims(defaults), ...docClaims(root, repo), ...setterClaims(root), ...visibleSettingClaims(root, model_architectures, repo)];
  config_claims.sort((left, right) => compareCodePoint(`${left.source_path}\0${left.symbol}\0${left.path}\0${left.kind}`, `${right.source_path}\0${right.symbol}\0${right.path}\0${right.kind}`));
  const facts: TrainingBookUiFacts = {
    schema_version: 1,
    model_architectures,
    defaults,
    config_claims,
    global_settings: globalSettingClaims(root, model_architectures.length === 51),
    architecture_transitions: [],
  };
  facts.architecture_transitions = facts.model_architectures
    .flatMap(architecture => architecture.defaults.map(item => ({
      architecture: architecture.name,
      path: item.path,
      selected: item.selected,
      unselected: item.unselected,
    })))
    .sort((left, right) => compareCodePoint(`${left.architecture}\0${left.path}`, `${right.architecture}\0${right.path}`));
  validateTrainingBookUiFacts(facts);
  return facts;
}

function validateValue(value: unknown, label: string): void {
  requireKeys(value, ['kind'], label, ['value', 'items', 'entries']);
  const kind = value.kind;
  if (!['undefined', 'null', 'boolean', 'number', 'string', 'array', 'object'].includes(String(kind))) throw new FactsError(`${label}.kind is unsupported`);
  if (kind === 'undefined' || kind === 'null') requireKeys(value, ['kind'], label);
  else if (kind === 'boolean') { requireKeys(value, ['kind', 'value'], label); if (typeof value.value !== 'boolean') throw new FactsError(`${label}.value must be boolean`); }
  else if (kind === 'number') { requireKeys(value, ['kind', 'value'], label); if (typeof value.value !== 'number' || !Number.isFinite(value.value)) throw new FactsError(`${label}.value must be finite`); }
  else if (kind === 'string') { requireKeys(value, ['kind', 'value'], label); if (typeof value.value !== 'string') throw new FactsError(`${label}.value must be string`); }
  else if (kind === 'array') { requireKeys(value, ['kind', 'items'], label); if (!Array.isArray(value.items)) throw new FactsError(`${label}.items must be an array`); value.items.forEach((item, index) => validateValue(item, `${label}.items[${index}]`)); }
  else if (kind === 'object') {
    requireKeys(value, ['kind', 'entries'], label);
    if (!Array.isArray(value.entries)) throw new FactsError(`${label}.entries must be an array`);
    let previous: string | undefined;
    value.entries.forEach((entry, index) => {
      requireKeys(entry, ['key', 'value'], `${label}.entries[${index}]`);
      if (typeof entry.key !== 'string') throw new FactsError(`${label}.entries[${index}].key must be string`);
      if (previous !== undefined && compareCodePoint(previous, entry.key) >= 0) throw new FactsError(`${label}.entries must have unique code-point-sorted keys`);
      previous = entry.key;
      validateValue(entry.value, `${label}.entries[${index}].value`);
    });
  }
}

function validatePresence(value: unknown, label: string): void {
  requireKeys(value, ['present'], label, ['value']);
  if (typeof value.present !== 'boolean') throw new FactsError(`${label}.present must be boolean`);
  const hasValue = Object.prototype.hasOwnProperty.call(value, 'value');
  if (value.present && !hasValue) throw new FactsError(`${label} present fact requires own value`);
  if (!value.present && hasValue) throw new FactsError(`${label} absent fact forbids value`);
  if (hasValue) validateValue(value.value, `${label}.value`);
}

function validateStringArray(value: unknown, label: string): void {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new FactsError(`${label} must be a string array`);
}

function validateStaticJsx(value: unknown, label: string): void {
  requireKeys(value, ['present'], label, ['text_literals', 'code_literals', 'link_hrefs']);
  if (typeof value.present !== 'boolean') throw new FactsError(`${label}.present must be boolean`);
  const optional = ['text_literals', 'code_literals', 'link_hrefs'] as const;
  if (!value.present && optional.some(key => Object.prototype.hasOwnProperty.call(value, key))) throw new FactsError(`${label} absent fact forbids projection fields`);
  if (value.present) for (const key of optional) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) throw new FactsError(`${label} present fact requires ${key}`);
    validateStringArray(value[key], `${label}.${key}`);
  }
}

function validatePredicate(value: unknown, label: string): void {
  requireKeys(value, ['kind'], label, ['path', 'operand', 'operands']);
  if (value.kind === 'always') requireKeys(value, ['kind'], label);
  else if (value.kind === 'truthy' || value.kind === 'nonblank-string') {
    requireKeys(value, ['kind', 'path'], label);
    if (typeof value.path !== 'string' || normalizeTrainingBookPath(value.path) !== value.path) throw new FactsError(`${label}.path must be canonical`);
  } else if (value.kind === 'not') {
    requireKeys(value, ['kind', 'operand'], label);
    validatePredicate(value.operand, `${label}.operand`);
  } else if (value.kind === 'and' || value.kind === 'or') {
    requireKeys(value, ['kind', 'operands'], label);
    if (!Array.isArray(value.operands) || value.operands.length !== 2) throw new FactsError(`${label}.operands must contain exactly two predicates`);
    validatePredicate(value.operands[0], `${label}.operands[0]`);
    validatePredicate(value.operands[1], `${label}.operands[1]`);
  } else throw new FactsError(`${label}.kind is unsupported`);
}

function validateValueContract(value: unknown, label: string): void {
  requireKeys(value, ['ui_type', 'widget_kind', 'optional', 'nullable'], label, ['accepted_values', 'minimum', 'maximum']);
  const semantic = [null, 'boolean', 'integer', 'number', 'string', 'path', 'boolean-list', 'integer-list', 'number-list', 'string-list', 'object', 'object-list'];
  const widgets = [null, 'checkbox', 'number', 'text', 'multiline', 'path', 'select', 'json', 'read-only'];
  if (!semantic.includes(value.ui_type as never)) throw new FactsError(`${label}.ui_type is unsupported`);
  if (!widgets.includes(value.widget_kind as never)) throw new FactsError(`${label}.widget_kind is unsupported`);
  if (typeof value.optional !== 'boolean' || typeof value.nullable !== 'boolean') throw new FactsError(`${label} optional/nullable must be boolean`);
  if (value.accepted_values !== undefined) {
    if (!Array.isArray(value.accepted_values)) throw new FactsError(`${label}.accepted_values must be an array`);
    value.accepted_values.forEach((item, index) => validateValue(item, `${label}.accepted_values[${index}]`));
  }
  for (const key of ['minimum', 'maximum'] as const) if (value[key] !== undefined && (typeof value[key] !== 'number' || !Number.isFinite(value[key]))) throw new FactsError(`${label}.${key} must be finite`);
  if (typeof value.minimum === 'number' && typeof value.maximum === 'number' && value.minimum > value.maximum) throw new FactsError(`${label} minimum exceeds maximum`);
}

export function validateTrainingBookUiFacts(value: unknown): asserts value is TrainingBookUiFacts {
  requireKeys(value, ['schema_version', 'model_architectures', 'defaults', 'config_claims', 'global_settings', 'architecture_transitions'], 'facts');
  if (value.schema_version !== 1) throw new FactsError('facts.schema_version must equal 1');
  for (const key of ['model_architectures', 'defaults', 'config_claims', 'global_settings', 'architecture_transitions'] as const) if (!Array.isArray(value[key])) throw new FactsError(`facts.${key} must be an array`);
  const names = new Set<string>();
  const architectures = value.model_architectures as unknown[];
  const defaults = value.defaults as unknown[];
  architectures.forEach((architecture, index) => {
    const label = `facts.model_architectures[${index}]`;
    requireKeys(architecture, ['name', 'label', 'group', 'model_path', 'gate_url', 'is_video_model', 'has_multiline_prompts', 'accuracy_recovery_adapters', 'sample_tags', 'custom_model_select_options', 'model_notes', 'controls', 'defaults', 'default_containers', 'disable_sections', 'additional_sections'], label);
    if (typeof architecture.name !== 'string' || names.has(architecture.name)) throw new FactsError(`${label}.name must be a unique string`);
    names.add(architecture.name);
    for (const key of ['label', 'group'] as const) if (typeof architecture[key] !== 'string') throw new FactsError(`${label}.${key} must be string`);
    for (const key of ['model_path', 'gate_url', 'is_video_model', 'has_multiline_prompts', 'accuracy_recovery_adapters', 'sample_tags'] as const) validatePresence(architecture[key], `${label}.${key}`);
    for (const key of ['controls', 'disable_sections', 'additional_sections'] as const) validateStringArray(architecture[key], `${label}.${key}`);
    for (const key of ['defaults', 'default_containers'] as const) if (!Array.isArray(architecture[key])) throw new FactsError(`${label}.${key} must be array`);
    requireKeys(architecture.custom_model_select_options, ['present'], `${label}.custom_model_select_options`, ['value']);
    const customHasValue = Object.prototype.hasOwnProperty.call(architecture.custom_model_select_options, 'value');
    if (architecture.custom_model_select_options.present !== customHasValue) throw new FactsError(`${label}.custom_model_select_options presence/value mismatch`);
    if (customHasValue) {
      if (!Array.isArray(architecture.custom_model_select_options.value)) throw new FactsError(`${label}.custom_model_select_options.value must be array`);
      architecture.custom_model_select_options.value.forEach((option, optionIndex) => {
        const optionLabel = `${label}.custom_model_select_options.value[${optionIndex}]`;
        requireKeys(option, ['label', 'options', 'doc', 'get_value_cases', 'writes'], optionLabel);
        if (typeof option.label !== 'string' || !Array.isArray(option.options) || !Array.isArray(option.get_value_cases) || !Array.isArray(option.writes)) throw new FactsError(`${optionLabel} has invalid scalar/array fields`);
        option.options.forEach((choice, choiceIndex) => {
          requireKeys(choice, ['value', 'label'], `${optionLabel}.options[${choiceIndex}]`);
          if (typeof choice.value !== 'string' || typeof choice.label !== 'string') throw new FactsError(`${optionLabel}.options[${choiceIndex}] fields must be strings`);
        });
        validateStaticJsx(option.doc, `${optionLabel}.doc`);
        option.get_value_cases.forEach((item, caseIndex) => {
          requireKeys(item, ['condition', 'return_value'], `${optionLabel}.get_value_cases[${caseIndex}]`);
          validatePredicate(item.condition, `${optionLabel}.get_value_cases[${caseIndex}].condition`);
          validateValue(item.return_value, `${optionLabel}.get_value_cases[${caseIndex}].return_value`);
        });
        option.writes.forEach((item, writeIndex) => {
          const writeLabel = `${optionLabel}.writes[${writeIndex}]`;
          requireKeys(item, ['selected_value', 'path', 'value', 'guard'], writeLabel);
          if (typeof item.selected_value !== 'string' || typeof item.path !== 'string' || normalizeTrainingBookPath(item.path) !== item.path) throw new FactsError(`${writeLabel} has invalid selected value/path`);
          validateValue(item.value, `${writeLabel}.value`);
          validatePredicate(item.guard, `${writeLabel}.guard`);
        });
      });
    }
    validateStaticJsx(architecture.model_notes, `${label}.model_notes`);
    const defaultPaths = new Set<string>();
    (architecture.defaults as unknown[]).forEach((item, defaultIndex) => {
      const defaultLabel = `${label}.defaults[${defaultIndex}]`;
      requireKeys(item, ['declaration_path', 'path', 'selected', 'unselected'], defaultLabel);
      if (typeof item.path !== 'string' || typeof item.declaration_path !== 'string' || normalizeTrainingBookPath(item.path) !== item.path || normalizeTrainingBookPath(item.declaration_path) !== item.declaration_path) throw new FactsError(`${defaultLabel} paths must be canonical`);
      if (defaultPaths.has(item.path)) throw new FactsError(`${label}.defaults contains duplicate path ${item.path}`);
      defaultPaths.add(item.path);
      validatePresence(item.selected, `${defaultLabel}.selected`);
      validatePresence(item.unselected, `${defaultLabel}.unselected`);
    });
    const containerPaths = new Set<string>();
    (architecture.default_containers as unknown[]).forEach((item, containerIndex) => {
      const containerLabel = `${label}.default_containers[${containerIndex}]`;
      requireKeys(item, ['path', 'selected_present', 'unselected_present'], containerLabel);
      if (typeof item.path !== 'string' || normalizeTrainingBookPath(item.path) !== item.path || typeof item.selected_present !== 'boolean' || typeof item.unselected_present !== 'boolean') throw new FactsError(`${containerLabel} is invalid`);
      if (containerPaths.has(item.path)) throw new FactsError(`${label}.default_containers contains duplicate path ${item.path}`);
      containerPaths.add(item.path);
      if (![...defaultPaths].some(path => path.startsWith(`${item.path}.`))) throw new FactsError(`${containerLabel} has no separately owned descendant leaf`);
    });
  });
  defaults.forEach((item, index) => {
    const label = `facts.defaults[${index}]`;
    requireKeys(item, ['path', 'value', 'source_path', 'symbol'], label);
    if (typeof item.path !== 'string' || normalizeTrainingBookPath(item.path) !== item.path) throw new FactsError(`${label}.path is not canonical`);
    validatePresence(item.value, `${label}.value`);
    if (typeof item.source_path !== 'string' || typeof item.symbol !== 'string') throw new FactsError(`${label} source_path/symbol must be strings`);
  });
  const claimIdentities = new Set<string>();
  for (const collectionName of ['config_claims', 'global_settings'] as const) {
    (value[collectionName] as unknown[]).forEach((item, index) => {
      const label = `facts.${collectionName}[${index}]`;
      requireKeys(item, ['source_path', 'symbol', 'path', 'kind', 'ui_label', 'value_contract'], label);
      if (typeof item.source_path !== 'string' || typeof item.symbol !== 'string' || typeof item.path !== 'string' || !['setter', 'default', 'doc', 'setting', 'server-state'].includes(String(item.kind))) throw new FactsError(`${label} identity is invalid`);
      if (normalizeTrainingBookPath(item.path) !== item.path) throw new FactsError(`${label}.path is not canonical`);
      const identity = `${item.source_path}\0${item.symbol}\0${item.path}\0${item.kind}`;
      if (claimIdentities.has(identity)) throw new FactsError(`duplicate UI source claim ${identity}`);
      claimIdentities.add(identity);
      validatePresence(item.ui_label, `${label}.ui_label`);
      validateValueContract(item.value_contract, `${label}.value_contract`);
    });
  }
  const transitionIdentities = new Set<string>();
  (value.architecture_transitions as unknown[]).forEach((item, index) => {
    const label = `facts.architecture_transitions[${index}]`;
    requireKeys(item, ['architecture', 'path', 'selected', 'unselected'], label);
    if (typeof item.architecture !== 'string' || !names.has(item.architecture) || typeof item.path !== 'string' || normalizeTrainingBookPath(item.path) !== item.path) throw new FactsError(`${label} identity is invalid`);
    const identity = `${item.architecture}\0${item.path}`;
    if (transitionIdentities.has(identity)) throw new FactsError(`duplicate architecture transition ${identity}`);
    transitionIdentities.add(identity);
    validatePresence(item.selected, `${label}.selected`);
    validatePresence(item.unselected, `${label}.unselected`);
  });
}

export function writeTrainingBookUiFacts(repositoryRoot: string, destination: string): void {
  const root = resolve(repositoryRoot);
  const output = resolve(destination);
  const facts = collectTrainingBookUiFacts(root);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(facts, null, 2)}\n`, 'utf8');
}
