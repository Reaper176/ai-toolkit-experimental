import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
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

export type UiBehaviorPayload =
  | { kind: 'literal'; value: TrainingBookValueFact }
  | { kind: 'undefined' }
  | { kind: 'copy'; source_path: string; fallback?: TrainingBookValueFact }
  | { kind: 'map-prompt-objects'; source_path: string; item_key: 'prompt' }
  | { kind: 'architecture-name' }
  | { kind: 'architecture-field'; field: 'controls' }
  | { kind: 'architecture-default'; phase: 'revert' | 'apply'; value_index: 1 | 0 };

export type UiBehaviorGuard =
  | 'prompts-nonempty-array' | 'after-prompts-write'
  | 'type-is-ui-trainer' | 'property-present' | 'property-absent'
  | 'platform-mac' | 'cleaned-model-changed'
  | 'section-unsupported' | 'section-supported-property-absent'
  | 'architecture-change' | 'multi-control' | 'single-control'
  | 'no-control' | 'source-nonempty-target-empty' | 'source-nonempty'
  | 'frame-count-unsupported' | 'auto-frame-count-unsupported'
  | 'sample-control-unsupported' | 'revert-current-defaults'
  | 'apply-next-defaults';

export interface UiBehaviorContract {
  guard: UiBehaviorGuard;
  operation: 'write' | 'delete';
  sources: string[];
  payload: UiBehaviorPayload;
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
  behavior_contract?: UiBehaviorContract;
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

const compareCodePoint = (left: string, right: string): number => {
  const leftPoints = Array.from(left, character => character.codePointAt(0)!);
  const rightPoints = Array.from(right, character => character.codePointAt(0)!);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) return leftPoints[index] < rightPoints[index] ? -1 : 1;
  }
  return leftPoints.length < rightPoints.length ? -1 : leftPoints.length > rightPoints.length ? 1 : 0;
};

function fail(node: ts.Node | undefined, message: string): never {
  const source = node?.getSourceFile();
  const location = node === undefined || source === undefined || source.fileName === undefined
    ? ''
    : ` at ${source.fileName}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
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
  if (ts.isComputedPropertyName(node)) {
    const expression = unwrap(node.expression);
    if (ts.isStringLiteral(expression) || ts.isNumericLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  }
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

type PathNormalizationOptions = {
  allowCanonicalWildcards?: boolean;
  allowDatasetPlaceholder?: boolean;
  repeatableArrays?: ReadonlySet<string>;
};

function normalizePath(raw: string, options: PathNormalizationOptions): string {
  if (raw.length === 0 || raw.includes('..')) throw new FactsError(`canonical path is invalid: ${raw}`);
  const segments = raw.split('.');
  const normalized: string[] = [];
  for (const segment of segments) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)(?:\[([^\]]+)\])?$/.exec(segment);
    if (match === null) throw new FactsError(`canonical path contains an unresolved computed segment: ${raw}`);
    const [, name, index] = match;
    if (index === undefined) {
      normalized.push(name);
      continue;
    }
    const arrayPath = [...normalized, name].join('.');
    if (name === 'process' && index === '0' && arrayPath === 'config.process') {
      normalized.push('process[*]');
      continue;
    }
    if (index === 'x') {
      if (options.allowDatasetPlaceholder && arrayPath === 'config.process[*].datasets') {
        normalized.push('datasets[*]');
        continue;
      }
      throw new FactsError(`canonical path contains an unresolved index x: ${raw}`);
    }
    if (index === '*') {
      if (options.allowCanonicalWildcards || options.repeatableArrays?.has(arrayPath)) {
        normalized.push(`${name}[*]`);
        continue;
      }
      const reason = (options.repeatableArrays?.size ?? 0) > 0
        ? 'mapped array does not match setter wildcard'
        : 'canonical path contains an unproven wildcard';
      throw new FactsError(`${reason}: ${raw}`);
    }
    if (/^\d+$/.test(index)) throw new FactsError(`canonical path contains an unsupported numeric index: ${raw}`);
    throw new FactsError(`canonical path contains an unresolved index ${index}: ${raw}`);
  }
  return normalized.join('.');
}

export function normalizeTrainingBookPath(raw: string): string {
  return normalizePath(raw, { allowCanonicalWildcards: true });
}

function normalizeArchitecturePath(raw: string): string {
  return normalizePath(raw, { allowDatasetPlaceholder: true });
}

type LexicalBindingEvent = {
  kind: 'declaration' | 'assignment';
  name: ts.Identifier;
  initializer?: ts.Expression;
  candidate?: AliasCandidate;
  position: number;
  parameter?: boolean;
  invalid?: boolean;
  branch?: {
    owner: ts.Node;
    arm: string;
    arms: readonly string[];
    exhaustive: boolean;
  };
};

type LexicalLookup =
  | { found: false }
  | { found: true; event?: LexicalBindingEvent };

type DefaultAliasCandidate = {
  kind: 'default';
  source: AliasCandidate;
  fallback: ts.Expression;
};
type ProjectedAliasCandidate = {
  kind: 'projection';
  source: AliasCandidate;
  key: string | number;
  at: ts.Node;
};
type AliasCandidate = ts.Expression | 'absent' | 'tainted' | 'ambiguous-identity' | DefaultAliasCandidate | ProjectedAliasCandidate;
type InvocationQueryContext = {
  owner: ts.FunctionLikeDeclaration | ts.SourceFile;
  site: ts.Node;
};

function isDefaultAliasCandidate(candidate: AliasCandidate): candidate is DefaultAliasCandidate {
  return typeof candidate !== 'string' && (candidate as { kind: unknown }).kind === 'default';
}

function isProjectedAliasCandidate(candidate: AliasCandidate): candidate is ProjectedAliasCandidate {
  return typeof candidate !== 'string' && (candidate as { kind: unknown }).kind === 'projection';
}

function isLexicalFunction(node: ts.Node): node is ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration {
  return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node);
}

function isLexicalScope(node: ts.Node): boolean {
  return ts.isSourceFile(node)
    || ts.isBlock(node)
    || isLexicalFunction(node)
    || ts.isForStatement(node)
    || ts.isForInStatement(node)
    || ts.isForOfStatement(node)
    || ts.isCatchClause(node)
    || ts.isClassLike(node);
}

function isAssignmentOperator(kind: ts.SyntaxKind): boolean {
  return kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
}

function assignmentTargetIdentifiers(expression: ts.Expression): ts.Identifier[] {
  expression = unwrap(expression);
  if (ts.isIdentifier(expression)) return [expression];
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.flatMap(element => {
      if (ts.isOmittedExpression(element)) return [];
      return assignmentTargetIdentifiers(ts.isSpreadElement(element) ? element.expression : element as ts.Expression);
    });
  }
  if (ts.isObjectLiteralExpression(expression)) {
    return expression.properties.flatMap(property => {
      if (ts.isShorthandPropertyAssignment(property)) return [property.name];
      if (ts.isPropertyAssignment(property)) return assignmentTargetIdentifiers(property.initializer);
      if (ts.isSpreadAssignment(property)) return assignmentTargetIdentifiers(property.expression);
      return [];
    });
  }
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    return assignmentTargetIdentifiers(expression.left);
  }
  return [];
}

function assignedIdentifiers(node: ts.Node): ts.Identifier[] {
  if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
    return assignmentTargetIdentifiers(node.left);
  }
  if ((ts.isForInStatement(node) || ts.isForOfStatement(node)) && !ts.isVariableDeclarationList(node.initializer)) {
    return assignmentTargetIdentifiers(node.initializer);
  }
  if (
    ts.isPostfixUnaryExpression(node)
    && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)
  ) {
    return assignmentTargetIdentifiers(node.operand);
  }
  if (
    ts.isPrefixUnaryExpression(node)
    && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)
  ) {
    return assignmentTargetIdentifiers(node.operand);
  }
  return [];
}

function staticTruthValue(
  expression: ts.Expression,
  bindings?: LexicalBindings,
  seen = new Set<ts.Identifier>(),
): boolean | undefined {
  expression = unwrap(expression);
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression.kind === ts.SyntaxKind.NullKeyword) return false;
  if (ts.isIdentifier(expression) && expression.text === 'undefined' && bindings !== undefined && !bindings.lookup(expression).found) return false;
  if (ts.isIdentifier(expression) && bindings !== undefined) {
    const declaration = bindings.bindingDeclaration(expression);
    if (declaration === undefined || seen.has(declaration)) return undefined;
    const lookup = bindings.provenanceCandidates(expression);
    if (!lookup.found || lookup.candidates.length === 0) return undefined;
    if (
      ts.isClassDeclaration(declaration.parent)
      && declaration.parent.name === declaration
      && lookup.candidates.every(candidate => candidate === 'absent')
    ) return true;
    const nextSeen = new Set(seen).add(declaration);
    const values = lookup.candidates.map(candidate => {
      if (candidate === 'absent') return false;
      if (candidate === 'tainted' || candidate === 'ambiguous-identity' || isDefaultAliasCandidate(candidate) || isProjectedAliasCandidate(candidate)) return undefined;
      return staticTruthValue(candidate, bindings, nextSeen);
    });
    return values.some(value => value === undefined) || values.some(value => value !== values[0])
      ? undefined
      : values[0];
  }
  if (ts.isNumericLiteral(expression)) return Number(expression.text) !== 0;
  if (ts.isBigIntLiteral(expression)) return BigInt(expression.text.slice(0, -1).replace(/_/gu, '')) !== 0n;
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text.length !== 0;
  if (
    ts.isArrayLiteralExpression(expression)
    || ts.isObjectLiteralExpression(expression)
    || ts.isFunctionExpression(expression)
    || ts.isArrowFunction(expression)
    || ts.isRegularExpressionLiteral(expression)
    || ts.isClassExpression(expression)
  ) return true;
  if (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.ExclamationToken) {
    const operand = staticTruthValue(expression.operand, bindings, seen);
    return operand === undefined ? undefined : !operand;
  }
  if (ts.isVoidExpression(expression)) return false;
  return undefined;
}

function staticNullishValue(
  expression: ts.Expression,
  bindings?: LexicalBindings,
  seen = new Set<ts.Identifier>(),
): boolean | undefined {
  expression = unwrap(expression);
  if (expression.kind === ts.SyntaxKind.NullKeyword || ts.isVoidExpression(expression)) return true;
  if (ts.isIdentifier(expression) && expression.text === 'undefined' && bindings !== undefined && !bindings.lookup(expression).found) return true;
  if (ts.isIdentifier(expression) && bindings !== undefined) {
    const declaration = bindings.bindingDeclaration(expression);
    if (declaration === undefined || seen.has(declaration)) return undefined;
    const lookup = bindings.provenanceCandidates(expression);
    if (!lookup.found || lookup.candidates.length === 0) return undefined;
    if (
      ts.isClassDeclaration(declaration.parent)
      && declaration.parent.name === declaration
      && lookup.candidates.every(candidate => candidate === 'absent')
    ) return false;
    const nextSeen = new Set(seen).add(declaration);
    const values = lookup.candidates.map(candidate => {
      if (candidate === 'absent') return true;
      if (candidate === 'tainted' || candidate === 'ambiguous-identity' || isDefaultAliasCandidate(candidate) || isProjectedAliasCandidate(candidate)) return undefined;
      return staticNullishValue(candidate, bindings, nextSeen);
    });
    return values.some(value => value === undefined) || values.some(value => value !== values[0])
      ? undefined
      : values[0];
  }
  if (
    expression.kind === ts.SyntaxKind.TrueKeyword
    || expression.kind === ts.SyntaxKind.FalseKeyword
    || ts.isNumericLiteral(expression)
    || ts.isBigIntLiteral(expression)
    || ts.isStringLiteral(expression)
    || ts.isNoSubstitutionTemplateLiteral(expression)
    || ts.isArrayLiteralExpression(expression)
    || ts.isObjectLiteralExpression(expression)
    || ts.isFunctionExpression(expression)
    || ts.isArrowFunction(expression)
    || ts.isRegularExpressionLiteral(expression)
    || ts.isClassExpression(expression)
  ) return false;
  return undefined;
}

class LexicalBindings {
  private readonly events = new Map<ts.Node, Map<string, LexicalBindingEvent[]>>();
  private readonly memberTimelines = new Map<ts.FunctionLikeDeclaration, Array<{
    node: ts.Node;
    substitutions: InvocationSubstitutions;
    execution: 'known' | 'unmodeled-callback';
    sequence: number;
    current: ts.FunctionLikeDeclaration;
  }>>();
  private readonly memberProjections = new WeakMap<ts.Expression, Map<string, ts.ElementAccessExpression>>();
  private readonly projectedMembers = new WeakSet<ts.Expression>();
  private readonly activeMemberApiResolution = new Set<ts.CallExpression>();
  private readonly activeMemberValueResolution = new Set<ts.Expression>();
  private readonly activeMemberCandidateQueries = new WeakMap<ts.Node, WeakMap<ts.Expression, Set<string>>>();
  private readonly memberCandidateQueries = new WeakMap<ts.Node, WeakMap<ts.Expression, Map<string, AliasCandidate[] | null>>>();
  private readonly arrayAppendQueries = new WeakMap<object, WeakMap<ts.Node, WeakMap<ts.Expression, { values: readonly ts.Expression[]; tainted: boolean } | null>>>();
  private readonly descriptorQueries = new WeakMap<object, WeakMap<ts.Node, WeakMap<ts.Node, FiniteOwnDescriptorResult>>>();
  private readonly activeDescriptorQueries = new WeakMap<object, WeakMap<ts.Node, WeakSet<ts.Node>>>();
  private readonly invocationQueryContexts = new WeakMap<object, InvocationQueryContext>();
  private readonly exactGlobalMemberExpressions = new Map<string, ts.Expression | null>();
  private moduleExecutableTimeline?: readonly {
    node: ts.Node;
    substitutions: InvocationSubstitutions;
    execution: 'known' | 'unmodeled-callback';
    current: ts.Node;
  }[];
  private activeModuleExecutableTimeline?: readonly {
    node: ts.Node;
    substitutions: InvocationSubstitutions;
    execution: 'known' | 'unmodeled-callback';
    current: ts.Node;
  }[];
  private activeMemberTimelineBuildDepth = 0;

  constructor(private readonly source: ts.SourceFile) {}

  isBuildingMemberTimeline(): boolean {
    return this.activeMemberTimelineBuildDepth > 0;
  }

  registerInvocationQueryContext(
    projected: InvocationSubstitutions,
    parent: InvocationSubstitutions,
    site: ts.Node,
  ): void {
    const inherited = this.invocationQueryContexts.get(parent as object);
    if (inherited !== undefined) {
      this.invocationQueryContexts.set(projected as object, inherited);
      return;
    }
    let owner: ts.Node | undefined = site;
    while (owner !== undefined && !isLexicalFunction(owner) && !ts.isSourceFile(owner)) owner = owner.parent;
    if (owner !== undefined && (isLexicalFunction(owner) || ts.isSourceFile(owner))) {
      this.invocationQueryContexts.set(projected as object, { owner, site });
    }
  }

  invocationQueryContext(substitutions: InvocationSubstitutions): InvocationQueryContext | undefined {
    return this.invocationQueryContexts.get(substitutions as object);
  }

  finiteDescriptorQuery(
    root: ts.Node,
    substitutions: InvocationSubstitutions,
    at: ts.Node,
    compute: () => FiniteOwnDescriptorResult,
  ): FiniteOwnDescriptorResult {
    const substitutionIdentity = substitutions as object;
    let activeByPosition = this.activeDescriptorQueries.get(substitutionIdentity);
    if (activeByPosition === undefined) {
      activeByPosition = new WeakMap();
      this.activeDescriptorQueries.set(substitutionIdentity, activeByPosition);
    }
    let activeRoots = activeByPosition.get(at);
    if (activeRoots === undefined) {
      activeRoots = new WeakSet();
      activeByPosition.set(at, activeRoots);
    }
    if (activeRoots.has(root)) return { properties: new Map(), unknown: true, prototype: { kind: 'unknown' } };

    let cachedByPosition = this.descriptorQueries.get(substitutionIdentity);
    if (cachedByPosition === undefined) {
      cachedByPosition = new WeakMap();
      this.descriptorQueries.set(substitutionIdentity, cachedByPosition);
    }
    let cachedRoots = cachedByPosition.get(at);
    if (cachedRoots === undefined) {
      cachedRoots = new WeakMap();
      cachedByPosition.set(at, cachedRoots);
    }
    const cached = cachedRoots.get(root);
    if (cached !== undefined) return cached;

    activeRoots.add(root);
    try {
      const completed = compute();
      cachedRoots.set(root, completed);
      return completed;
    } finally {
      activeRoots.delete(root);
    }
  }

  executableFunctionTimeline(owner: ts.FunctionLikeDeclaration): readonly {
    node: ts.Node;
    substitutions: InvocationSubstitutions;
    execution: 'known' | 'unmodeled-callback';
    sequence: number;
    current: ts.FunctionLikeDeclaration;
  }[] | undefined {
    const cached = this.memberTimelines.get(owner);
    if (cached !== undefined) return cached;
    if (this.activeMemberTimelineBuildDepth !== 0) return undefined;
    const timeline: Array<{
      node: ts.Node;
      substitutions: InvocationSubstitutions;
      execution: 'known' | 'unmodeled-callback';
      sequence: number;
      current: ts.FunctionLikeDeclaration;
    }> = [];
    this.activeMemberTimelineBuildDepth += 1;
    try {
      visitExecutableFunctionNodes(owner, this, (node, substitutions, execution, sequence, current) => {
        timeline.push({ node, substitutions, execution, sequence, current });
      }, true);
    } finally {
      this.activeMemberTimelineBuildDepth -= 1;
    }
    this.memberTimelines.set(owner, timeline);
    return timeline;
  }

  stableMemberProjection(base: ts.Expression, key: string | number): ts.ElementAccessExpression {
    base = unwrap(base);
    const canonicalKey = String(key);
    let projections = this.memberProjections.get(base);
    if (projections === undefined) {
      projections = new Map();
      this.memberProjections.set(base, projections);
    }
    let projection = projections.get(canonicalKey);
    if (projection === undefined) {
      projection = ts.factory.createElementAccessExpression(
        base,
        typeof key === 'number' ? ts.factory.createNumericLiteral(key) : ts.factory.createStringLiteral(key),
      );
      projections.set(canonicalKey, projection);
      this.projectedMembers.add(projection);
    }
    return projection;
  }

  isStableMemberProjection(expression: ts.Expression): boolean {
    return this.projectedMembers.has(expression);
  }

  exactGlobalMemberExpression(receiver: string, key: string): ts.Expression | undefined {
    const cacheKey = `${receiver}.${key}`;
    if (this.exactGlobalMemberExpressions.has(cacheKey)) return this.exactGlobalMemberExpressions.get(cacheKey) ?? undefined;
    let result: ts.Expression | undefined;
    let globalReceiver: ts.Identifier | undefined;
    const visit = (node: ts.Node): void => {
      if (result !== undefined) return;
      if (ts.isExpression(node)) {
        if (ts.isIdentifier(node) && node.text === receiver && !this.lookup(node).found) globalReceiver ??= node;
        const member = staticMember(node);
        const base = member === undefined ? undefined : unwrap(member.base);
        if (
          member?.key === key
          && base !== undefined
          && ts.isIdentifier(base)
          && base.text === receiver
          && !this.lookup(base).found
        ) result = node;
      }
      ts.forEachChild(node, visit);
    };
    visit(this.source);
    if (result === undefined && globalReceiver !== undefined) result = this.stableMemberProjection(globalReceiver, key);
    this.exactGlobalMemberExpressions.set(cacheKey, result ?? null);
    return result;
  }

  executableModuleNodes(): readonly {
    node: ts.Node;
    substitutions: InvocationSubstitutions;
    execution: 'known' | 'unmodeled-callback';
    current: ts.Node;
  }[] {
    if (this.moduleExecutableTimeline !== undefined) return this.moduleExecutableTimeline;
    if (this.activeModuleExecutableTimeline !== undefined) return this.activeModuleExecutableTimeline;
    const result: Array<{
      node: ts.Node;
      substitutions: InvocationSubstitutions;
      execution: 'known' | 'unmodeled-callback';
      current: ts.Node;
    }> = [];
    // Expose an active (never cached) finite prefix so normalization queries do
    // not recursively rebuild the same module timeline. Repeated member-query
    // identities still fail closed through the active provenance guard.
    this.activeModuleExecutableTimeline = result;
    const visit = (node: ts.Node): void => {
      if (node !== this.source && (ts.isFunctionLike(node) || ts.isClassLike(node))) return;
      if (isStaticallyDead(node, this)) return;
      result.push({ node, substitutions: new Map(), execution: 'known', current: this.source });
      if (ts.isCallExpression(node)) {
        const substitutions = new Map<ts.Node, InvocationValue>();
        const invocation = normalizeInvocation(node, this, substitutions);
        const target = localFunctionFromExpression(invocation.target, this, substitutions, false);
        if (target !== undefined) {
          visitExecutableFunctionNodes(
            target,
            this,
            (invokedNode, substitutions, execution, _sequence, current) => {
              result.push({ node: invokedNode, substitutions, execution, current });
            },
            true,
            {
              arguments: invocation.arguments ?? target.parameters.map(() => 'tainted' as const),
              substitutions,
              execution: invocation.arguments === undefined ? 'unmodeled-callback' : 'known',
            },
          );
        }
      }
      ts.forEachChild(node, visit);
    };
    try {
      for (const statement of this.source.statements) visit(statement);
      this.moduleExecutableTimeline = [...result];
      return this.moduleExecutableTimeline;
    } finally {
      this.activeModuleExecutableTimeline = undefined;
    }
  }

  lookup(identifier: ts.Identifier): LexicalLookup {
    for (const scope of this.scopes(identifier)) {
      const events = this.eventsFor(scope).get(identifier.text);
      if (events === undefined) continue;
      const declarations = events.filter(event => event.kind === 'declaration');
      if (declarations.length > 1) return { found: true };
      const preceding = events.filter(event => event.position <= identifier.getStart(this.source));
      if (preceding.length === 0) return { found: true };
      const event = preceding[preceding.length - 1];
      return event.kind === 'assignment' && event.initializer === undefined ? { found: true } : { found: true, event };
    }
    return { found: false };
  }

  provenanceCandidates(identifier: ts.Identifier): { found: false } | { found: true; candidates: AliasCandidate[] } {
    const eventCandidates = (event: Pick<LexicalBindingEvent, 'candidate' | 'initializer' | 'invalid'>): AliasCandidate[] => {
      const source = event.candidate ?? event.initializer;
      if (event.invalid !== true) return [source ?? 'tainted'];
      return source === undefined ? ['tainted'] : ['tainted', source];
    };
    for (const scope of this.scopes(identifier)) {
      const events = this.eventsFor(scope).get(identifier.text);
      if (events === undefined) continue;
      const declarations = events.filter(event => event.kind === 'declaration');
      if (declarations.length !== 1) return { found: true, candidates: ['tainted'] };
      const declaration = declarations[0];
      if (declaration.position > identifier.getStart(this.source)) return { found: true, candidates: ['tainted'] };
      let candidates: AliasCandidate[] = declaration.invalid
        ? eventCandidates(declaration)
        : declaration.candidate !== undefined
          ? [declaration.candidate]
          : declaration.initializer !== undefined
            ? [declaration.initializer]
            : declaration.parameter === true || ts.isFunctionDeclaration(declaration.name.parent)
              ? [declaration.name]
              : ['absent'];
      const preceding = events.filter(event => event.kind === 'assignment' && event.position <= identifier.getStart(this.source));
      for (let index = 0; index < preceding.length;) {
        const event = preceding[index];
        if (event.branch === undefined) {
          candidates = eventCandidates(event);
          index += 1;
          continue;
        }
        const owner = event.branch.owner;
        const grouped: LexicalBindingEvent[] = [];
        while (index < preceding.length && preceding[index].branch?.owner === owner) grouped.push(preceding[index++]);
        const lastByArm = new Map<string, LexicalBindingEvent>();
        for (const item of grouped) lastByArm.set(item.branch!.arm, item);
        const next: AliasCandidate[] = [];
        for (const arm of event.branch.arms) {
          const branchEvent = lastByArm.get(arm);
          if (branchEvent === undefined) next.push(...candidates);
          else next.push(...eventCandidates(branchEvent));
        }
        if (!event.branch.exhaustive) next.push(...candidates);
        candidates = next;
      }
      return { found: true, candidates };
    }
    return { found: false };
  }

  memberProvenanceCandidates(
    base: ts.Expression,
    key: string,
    at: ts.Node,
    substitutions?: InvocationSubstitutions,
  ): AliasCandidate[] | undefined {
    base = unwrap(base);
    const queryKey = substitutions === undefined
      ? key
      : `${key}|${normalizedInvocationSubstitutionKey(substitutions, this)}`;
    let activeByBase = this.activeMemberCandidateQueries.get(at);
    if (activeByBase === undefined) {
      activeByBase = new WeakMap();
      this.activeMemberCandidateQueries.set(at, activeByBase);
    }
    let activeKeys = activeByBase.get(base);
    if (activeKeys === undefined) {
      activeKeys = new Set();
      activeByBase.set(base, activeKeys);
    }
    if (activeKeys.has(queryKey)) return ['tainted'];
    activeKeys.add(queryKey);
    try {
      const cacheable = this.activeMemberTimelineBuildDepth === 0
        && this.activeMemberApiResolution.size === 0
        && this.activeMemberValueResolution.size === 0;
      if (!cacheable) return this.computeMemberProvenanceCandidates(base, key, at, substitutions);
      let byBase = this.memberCandidateQueries.get(at);
      if (byBase === undefined) {
        byBase = new WeakMap();
        this.memberCandidateQueries.set(at, byBase);
      }
      let byKey = byBase.get(base);
      if (byKey === undefined) {
        byKey = new Map();
        byBase.set(base, byKey);
      }
      if (byKey.has(queryKey)) return byKey.get(queryKey) ?? undefined;
      const result = this.computeMemberProvenanceCandidates(base, key, at, substitutions);
      byKey.set(queryKey, result ?? null);
      return result;
    } finally {
      activeKeys.delete(queryKey);
    }
  }

  private computeMemberProvenanceCandidates(
    base: ts.Expression,
    key: string,
    at: ts.Node,
    querySubstitutions?: InvocationSubstitutions,
  ): AliasCandidate[] | undefined {
    const root = (
      expression: ts.Expression,
      substitutions: InvocationSubstitutions = new Map(),
      seen = new Set<ts.Identifier>(),
    ): ts.Node | string | undefined => {
      expression = unwrap(expression);
      const directSubstitution = substitutions.get(expression);
      if (directSubstitution !== undefined) return typeof directSubstitution === 'string'
        ? undefined
        : root(directSubstitution, substitutions, seen);
      if (!ts.isIdentifier(expression)) {
        const member = staticMember(expression);
        if (member !== undefined) {
          const baseRoot = root(member.base, substitutions, seen);
          if (member.key === '__proto__' && typeof baseRoot !== 'string' && baseRoot !== undefined && ts.isArrayLiteralExpression(baseRoot)) {
            return 'global:Array.prototype';
          }
          if (typeof baseRoot === 'string' && baseRoot.startsWith('global:')) return `${baseRoot}.${member.key}`;
        }
        return expression;
      }
      const declaration = this.bindingDeclaration(expression);
      if (declaration === undefined) return `global:${expression.text}`;
      if (seen.has(declaration)) return undefined;
      const substitution = substitutions.get(declaration);
      if (substitution !== undefined) return typeof substitution === 'string'
        ? undefined
        : root(substitution, substitutions, new Set(seen).add(declaration));
      const lookup = this.provenanceCandidates(expression);
      if (lookup.found && lookup.candidates.length > 0 && lookup.candidates.every(candidate => typeof candidate !== 'string' && !isDefaultAliasCandidate(candidate) && !isProjectedAliasCandidate(candidate))) {
        const nextSeen = new Set(seen).add(declaration);
        const roots = lookup.candidates.map(candidate => candidate === declaration ? declaration : root(candidate as ts.Expression, substitutions, nextSeen));
        if (roots.every(candidate => candidate !== undefined && candidate === roots[0])) return roots[0];
        if (roots.some(candidate => candidate === undefined || candidate !== roots[0])) return undefined;
      }
      const initializer = this.declarationInitializer(expression);
      return initializer === undefined ? declaration : root(initializer, substitutions, new Set(seen).add(declaration));
    };
    const expectedRoot = root(base, querySubstitutions);
    if (expectedRoot === undefined) return ['tainted'];
    let owner: ts.Node | undefined = at;
    while (owner !== undefined && !isLexicalFunction(owner) && !ts.isSourceFile(owner)) owner = owner.parent;
    if (owner === undefined) return undefined;
    type MemberEvent = { initializer?: ts.Expression; invalid: boolean; deleted?: boolean; ambiguousIdentity?: boolean; position: number; branch?: NonNullable<LexicalBindingEvent['branch']> };
    const events: MemberEvent[] = [];
    type OwnDescriptorState = 'absent' | 'writable-data' | 'readonly-data' | 'accessor' | 'unknown';
    const descriptorStates = new Map<ts.Node | string, Map<string, OwnDescriptorState>>();
    const resolvedPropertyKey = (
      name: ts.PropertyName,
      substitutions: InvocationSubstitutions,
    ): string | undefined => ts.isComputedPropertyName(name)
      ? resolveStaticString(name.expression, this, substitutions)
      : propertyName(name);
    const initialOwnDescriptor = (
      origin: ts.Node | string,
      memberKey: string,
      substitutions: InvocationSubstitutions,
      seen = new Set<ts.ObjectLiteralExpression>(),
    ): OwnDescriptorState => {
      if (origin === 'global:Array.prototype' && ['map', 'forEach', 'push'].includes(memberKey)) return 'writable-data';
      if (typeof origin === 'string' || !ts.isObjectLiteralExpression(origin)) return 'absent';
      if (seen.has(origin)) return 'unknown';
      const nextSeen = new Set(seen).add(origin);
      for (let index = origin.properties.length - 1; index >= 0; index -= 1) {
        const property = origin.properties[index];
        if (ts.isSpreadAssignment(property)) {
          const provenance = resolveAliasProvenance(property.expression, this, substitutions);
          if (provenance.kind === 'tainted') return 'unknown';
          if (provenance.kind === 'absent' || ts.isMethodDeclaration(provenance.origin)) continue;
          const nested = unwrap(provenance.origin);
          if (!ts.isObjectLiteralExpression(nested)) return 'unknown';
          const state = initialOwnDescriptor(nested, memberKey, substitutions, nextSeen);
          if (state === 'unknown') return state;
          // Object spread always creates a fresh writable data property.
          if (state !== 'absent') return 'writable-data';
          continue;
        }
        const propertyKey = resolvedPropertyKey(property.name, substitutions);
        if (propertyKey === undefined) return 'unknown';
        if (propertyKey !== memberKey) continue;
        if (
          memberKey === '__proto__'
          && !ts.isComputedPropertyName(property.name)
          && ts.isPropertyAssignment(property)
        ) continue;
        return ts.isGetAccessorDeclaration(property) || ts.isSetAccessorDeclaration(property)
          ? 'accessor'
          : 'writable-data';
      }
      return 'absent';
    };
    const descriptorState = (
      target: ts.Expression,
      memberKey: string,
      substitutions: InvocationSubstitutions,
    ): OwnDescriptorState => {
      const targetRoot = root(target, substitutions);
      if (targetRoot === undefined) return 'unknown';
      let states = descriptorStates.get(targetRoot);
      if (states === undefined) {
        states = new Map();
        descriptorStates.set(targetRoot, states);
      }
      if (!states.has(memberKey)) states.set(memberKey, initialOwnDescriptor(targetRoot, memberKey, substitutions));
      return states.get(memberKey)!;
    };
    const setDescriptorState = (
      target: ts.Expression,
      memberKey: string | undefined,
      state: OwnDescriptorState,
      substitutions: InvocationSubstitutions,
    ): void => {
      const targetRoot = root(target, substitutions);
      if (targetRoot === undefined) return;
      if (memberKey === undefined) {
        const states = descriptorStates.get(targetRoot) ?? new Map<string, OwnDescriptorState>();
        states.set(key, 'unknown');
        descriptorStates.set(targetRoot, states);
        return;
      }
      let states = descriptorStates.get(targetRoot);
      if (states === undefined) {
        states = new Map();
        descriptorStates.set(targetRoot, states);
      }
      states.set(memberKey, state);
    };
    type FunctionMethod = 'call' | 'apply' | 'bind';
    type FunctionMethodState = 'native' | 'rebound' | 'unknown';
    const functionMethodStates = new Map<ts.Node | string, Map<FunctionMethod, FunctionMethodState>>();
    const functionMethod = (value: string): value is FunctionMethod => value === 'call' || value === 'apply' || value === 'bind';
    const obviousCallable = (
      expression: ts.Expression,
      substitutions: InvocationSubstitutions,
      seen = new Set<ts.Identifier>(),
    ): boolean => {
      expression = unwrap(expression);
      const substitution = substitutions.get(expression);
      if (substitution !== undefined) return typeof substitution !== 'string' && obviousCallable(substitution, substitutions, seen);
      if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) return true;
      if (!ts.isIdentifier(expression)) return false;
      const declaration = this.bindingDeclaration(expression);
      if (declaration === undefined || seen.has(declaration)) return false;
      if (ts.isFunctionDeclaration(declaration.parent) && declaration.parent.name === declaration) return true;
      const initializer = this.declarationInitializer(expression);
      return initializer !== undefined && obviousCallable(initializer, substitutions, new Set(seen).add(declaration));
    };
    const obviousNativeFunctionMember = (
      expression: ts.Expression | undefined,
      method: FunctionMethod,
      substitutions: InvocationSubstitutions,
      seen = new Set<ts.Identifier>(),
    ): boolean => {
      if (expression === undefined) return false;
      expression = unwrap(expression);
      if (ts.isIdentifier(expression)) {
        const declaration = this.bindingDeclaration(expression);
        if (declaration === undefined || seen.has(declaration)) return false;
        const initializer = this.declarationInitializer(expression);
        return initializer !== undefined && obviousNativeFunctionMember(initializer, method, substitutions, new Set(seen).add(declaration));
      }
      const member = staticMember(expression);
      return member?.key === method && obviousCallable(member.base, substitutions);
    };
    const setFunctionMethodState = (
      target: ts.Expression,
      method: FunctionMethod,
      state: FunctionMethodState,
      substitutions: InvocationSubstitutions,
    ): void => {
      const targetRoot = root(target, substitutions);
      if (targetRoot === undefined) return;
      let states = functionMethodStates.get(targetRoot);
      if (states === undefined) {
        states = new Map();
        functionMethodStates.set(targetRoot, states);
      }
      states.set(method, state);
    };
    const nativeFunctionWrapper = (
      target: ts.Expression,
      method: FunctionMethod,
      substitutions: InvocationSubstitutions,
    ): boolean => {
      if (!obviousCallable(target, substitutions)) return false;
      const targetRoot = root(target, substitutions);
      if (targetRoot === undefined) return false;
      const own = functionMethodStates.get(targetRoot)?.get(method);
      if (own !== undefined) return own === 'native';
      return (functionMethodStates.get('global:Function.prototype')?.get(method) ?? 'native') === 'native';
    };
    const branchAt = (node: ts.Node, scope: ts.Node): MemberEvent['branch'] | 'dead' | 'invalid' | undefined => {
      let current: ts.Node | undefined = node;
      let result: MemberEvent['branch'] | undefined;
      while (current?.parent !== undefined && current.parent !== scope) {
        const parent: ts.Node = current.parent;
        if (ts.isIfStatement(parent)) {
          const truth = staticTruthValue(parent.expression);
          if ((truth === true && current === parent.thenStatement) || (truth === false && current === parent.elseStatement)) {
            current = parent;
            continue;
          }
          if (truth !== undefined) return 'dead';
          if (result !== undefined) return 'invalid';
          result = { owner: parent, arm: current === parent.thenStatement ? 'then' : 'else', arms: ['then', 'else'], exhaustive: parent.elseStatement !== undefined };
        } else if (ts.isCaseClause(parent) || ts.isDefaultClause(parent)) {
          const switchStatement = ts.isCaseBlock(parent.parent) && ts.isSwitchStatement(parent.parent.parent) ? parent.parent.parent : undefined;
          if (switchStatement === undefined || result !== undefined) return 'invalid';
          const clauses = switchStatement.caseBlock.clauses;
          result = { owner: switchStatement, arm: String(clauses.indexOf(parent)), arms: clauses.map((_, index) => String(index)), exhaustive: clauses.some(ts.isDefaultClause) };
        } else if (ts.isConditionalExpression(parent)) {
          const truth = staticTruthValue(parent.condition);
          if ((truth === true && current === parent.whenTrue) || (truth === false && current === parent.whenFalse)) {
            current = parent;
            continue;
          }
          if (truth !== undefined) return 'dead';
          if (result !== undefined) return 'invalid';
          result = { owner: parent, arm: current === parent.whenTrue ? 'true' : 'false', arms: ['true', 'false'], exhaustive: true };
        } else if (ts.isBinaryExpression(parent) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(parent.operatorToken.kind)) {
          const truth = staticTruthValue(parent.left, this);
          const nullish = staticNullishValue(parent.left, this);
          const rightIsCertain = (parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && truth === true)
            || (parent.operatorToken.kind === ts.SyntaxKind.BarBarToken && truth === false)
            || (parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken && nullish === true);
          const rightIsDead = (parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && truth === false)
            || (parent.operatorToken.kind === ts.SyntaxKind.BarBarToken && truth === true)
            || (parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken && nullish === false);
          if (current === parent.right && rightIsCertain) {
            current = parent;
            continue;
          }
          if (current === parent.right && rightIsDead) return 'dead';
          if (current === parent.right && result !== undefined) return 'invalid';
          if (current === parent.right) result = { owner: parent, arm: 'right', arms: ['left', 'right'], exhaustive: false };
        } else if (ts.isForStatement(parent) || ts.isForInStatement(parent) || ts.isForOfStatement(parent) || ts.isWhileStatement(parent) || ts.isDoStatement(parent) || ts.isTryStatement(parent)) return 'invalid';
        current = parent;
      }
      return result;
    };
    let atPosition: number | undefined;
    const recordNode = (
      node: ts.Node,
      substitutions: InvocationSubstitutions,
      execution: 'known' | 'unmodeled-callback',
      position: number,
      scope: ts.Node,
    ): void => {
      const record = (target: ts.Expression, initializer: ts.Expression | undefined, invalid: boolean, deleted = false, ambiguousIdentity = false): void => {
        for (let current: ts.Node | undefined = at; current !== undefined && current !== node; current = current.parent) {
          if (current === target) return;
        }
        let member = staticMember(target);
        let dynamicProjection = false;
        if (member === undefined && ts.isElementAccessExpression(unwrap(target))) {
          const element = unwrap(target) as ts.ElementAccessExpression;
          if (element.argumentExpression === undefined || root(element.expression, substitutions) !== expectedRoot) return;
          const projectedKey = resolveAliasProvenance(element.argumentExpression, this, substitutions);
          const projectedOrigin = projectedKey.kind === 'exact' && !ts.isMethodDeclaration(projectedKey.origin)
            ? unwrap(projectedKey.origin)
            : undefined;
          if (projectedOrigin !== undefined && (ts.isStringLiteral(projectedOrigin) || ts.isNumericLiteral(projectedOrigin) || ts.isNoSubstitutionTemplateLiteral(projectedOrigin))) {
            member = { base: element.expression, key: projectedOrigin.text };
          } else {
            member = { base: element.expression, key };
            dynamicProjection = true;
          }
        }
        const mayResolveToGlobalArray = (candidate: ts.Expression, candidateSeen = new Set<ts.Identifier>()): boolean => {
          candidate = unwrap(candidate);
          if (ts.isIdentifier(candidate) && candidate.text === 'Array' && !this.lookup(candidate).found) return true;
          if (!ts.isIdentifier(candidate)) return false;
          const declaration = this.bindingDeclaration(candidate);
          if (declaration === undefined || candidateSeen.has(declaration)) return false;
          const provenance = resolveAliasProvenance(candidate, this, substitutions, candidateSeen);
          if (provenance.kind === 'exact' && !ts.isMethodDeclaration(provenance.origin)) {
            const origin = unwrap(provenance.origin);
            return origin !== candidate && mayResolveToGlobalArray(origin, new Set(candidateSeen).add(declaration));
          }
          const declared = this.declarationInitializer(candidate);
          return provenance.kind === 'tainted'
            && declared !== undefined
            && mayResolveToGlobalArray(declared, new Set(candidateSeen).add(declaration));
        };
        const maySelectArrayPrototype = (candidate: ts.Expression): boolean => {
          candidate = unwrap(candidate);
          const staticCandidate = staticMember(candidate);
          if (staticCandidate?.key === 'prototype') return mayResolveToGlobalArray(staticCandidate.base);
          if (!ts.isElementAccessExpression(candidate) || candidate.argumentExpression === undefined) return false;
          const baseRoot = root(candidate.expression, substitutions);
          return mayResolveToGlobalArray(candidate.expression)
            || (typeof baseRoot !== 'string' && baseRoot !== undefined && ts.isArrayLiteralExpression(baseRoot));
        };
        if (member === undefined || member.key !== key) return;
        const memberRoot = root(member.base, substitutions);
        if (memberRoot !== expectedRoot) {
          if (expectedRoot !== 'global:Array.prototype' || !maySelectArrayPrototype(member.base)) return;
          dynamicProjection = true;
        }
        const enclosingBranch = branchAt(node, scope);
        if (enclosingBranch === 'dead') return;
        const branch = dynamicProjection && enclosingBranch === undefined
          ? { owner: target, arm: 'write', arms: ['write'], exhaustive: false }
          : dynamicProjection
            ? 'invalid'
            : enclosingBranch;
        let projected: AliasProvenance | undefined;
        if (initializer !== undefined && !this.activeMemberValueResolution.has(initializer)) {
          this.activeMemberValueResolution.add(initializer);
          try {
            projected = resolveAliasProvenance(initializer, this, substitutions);
          } finally {
            this.activeMemberValueResolution.delete(initializer);
          }
        }
        const directInitializer = initializer === undefined ? undefined : unwrap(initializer);
        const directDeclaration = directInitializer !== undefined && ts.isIdentifier(directInitializer)
          ? this.bindingDeclaration(directInitializer)
          : undefined;
        const projectedInitializer = projected?.kind === 'exact' && !ts.isMethodDeclaration(projected.origin)
          ? directInitializer !== undefined
            && directDeclaration !== undefined
            && projected.lineage?.has(directDeclaration) === true
            ? directInitializer
            : projected.origin
          : initializer;
        events.push({
          initializer: projectedInitializer,
          invalid: invalid || execution !== 'known' || branch === 'invalid' || (initializer !== undefined && projected?.kind !== 'exact'),
          deleted,
          ambiguousIdentity,
          branch: branch === 'invalid' ? undefined : branch,
          position,
        });
      };
      const recordAssignmentTargets = (
        target: ts.Expression,
        initializer: ts.Expression | undefined,
        invalid: boolean,
      ): void => {
        const projectedInitializer = (
          sourceExpression: ts.Expression | undefined,
          key: string | number,
        ): { expression?: ts.Expression; invalid: boolean } => {
          if (sourceExpression === undefined) return { invalid: true };
          const source = unwrap(sourceExpression);
          if (typeof key === 'number' && ts.isArrayLiteralExpression(source)) {
            const element = source.elements[key];
            if (element === undefined || ts.isOmittedExpression(element) || ts.isSpreadElement(element)) return { invalid: true };
            return { expression: element, invalid: false };
          }
          if (typeof key === 'string' && ts.isObjectLiteralExpression(source)) {
            const projection = resolveObjectLiteralProperty(source, key, this, substitutions, new Set());
            return projection.kind === 'exact' && !ts.isMethodDeclaration(projection.origin)
              ? { expression: projection.origin, invalid: false }
              : { invalid: projection.kind === 'tainted' };
          }
          return { expression: this.stableMemberProjection(sourceExpression, key), invalid: false };
        };
        target = unwrap(target);
        if (ts.isBinaryExpression(target) && target.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
          recordAssignmentTargets(target.left, initializer, true);
          return;
        }
        if (ts.isArrayLiteralExpression(target)) {
          target.elements.forEach((element, index) => {
            if (ts.isOmittedExpression(element)) return;
            const projected = projectedInitializer(initializer, index);
            if (ts.isSpreadElement(element)) recordAssignmentTargets(element.expression, projected.expression, true);
            else recordAssignmentTargets(element as ts.Expression, projected.expression, invalid || projected.invalid);
          });
          return;
        }
        if (ts.isObjectLiteralExpression(target)) {
          for (const property of target.properties) {
            if (ts.isSpreadAssignment(property)) {
              recordAssignmentTargets(property.expression, initializer, true);
              continue;
            }
            if (ts.isMethodDeclaration(property) || ts.isGetAccessorDeclaration(property) || ts.isSetAccessorDeclaration(property)) continue;
            const key = resolvedPropertyKey(property.name, substitutions);
            const projected = key === undefined
              ? { expression: undefined, invalid: true }
              : projectedInitializer(initializer, key);
            if (ts.isShorthandPropertyAssignment(property)) {
              recordAssignmentTargets(property.name, projected.expression, invalid || projected.invalid || property.objectAssignmentInitializer !== undefined);
            } else {
              recordAssignmentTargets(property.initializer, projected.expression, invalid || projected.invalid);
            }
          }
          return;
        }
        record(target, initializer, invalid);
      };
      if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
        if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
          const assignedMember = staticMember(node.left);
          if (assignedMember?.key === '__proto__' && root(assignedMember.base, substitutions) === expectedRoot) {
            const prototype = unwrap(node.right);
            const projected = ts.isObjectLiteralExpression(prototype)
              ? resolveObjectLiteralProperty(prototype, key, this, substitutions, new Set())
              : { kind: 'tainted' as const };
            if (projected.kind === 'exact' && !ts.isMethodDeclaration(projected.origin)) {
              record(this.stableMemberProjection(assignedMember.base, key), projected.origin, false);
            } else record(this.stableMemberProjection(assignedMember.base, key), undefined, true);
          }
          if (assignedMember !== undefined && assignedMember.key !== '__proto__') {
            const currentDescriptor = descriptorState(assignedMember.base, assignedMember.key, substitutions);
            setDescriptorState(
              assignedMember.base,
              assignedMember.key,
              currentDescriptor === 'readonly-data' ? 'readonly-data' : 'writable-data',
              substitutions,
            );
          }
          if (assignedMember !== undefined && functionMethod(assignedMember.key)) {
            setFunctionMethodState(
              assignedMember.base,
              assignedMember.key,
              branchAt(node, scope) === undefined && obviousNativeFunctionMember(node.right, assignedMember.key, substitutions)
                ? 'native'
                : branchAt(node, scope) === undefined
                  ? 'rebound'
                  : 'unknown',
              substitutions,
            );
          }
          recordAssignmentTargets(node.left, node.right, false);
        }
        else record(node.left, undefined, true);
      }
      else if (ts.isDeleteExpression(node)) {
        const deletedMember = staticMember(node.expression);
        if (deletedMember !== undefined) {
          setDescriptorState(deletedMember.base, deletedMember.key, 'absent', substitutions);
          if (functionMethod(deletedMember.key)) {
            const deletedRoot = root(deletedMember.base, substitutions);
            if (deletedRoot === 'global:Function.prototype') {
              setFunctionMethodState(deletedMember.base, deletedMember.key, 'rebound', substitutions);
            } else if (deletedRoot !== undefined) {
              functionMethodStates.get(deletedRoot)?.delete(deletedMember.key);
            }
          }
        }
        record(node.expression, undefined, false, true);
      }
      else if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)) record(node.operand, undefined, true);
      else if (ts.isCallExpression(node)) {
        const directMember = staticMember(node.expression);
        const directReceiver = directMember === undefined ? undefined : unwrap(directMember.base);
        const directApi: MutationApiIdentity | undefined = directMember !== undefined
          && directReceiver !== undefined
          && ts.isIdentifier(directReceiver)
          && (directReceiver.text === 'Object' || directReceiver.text === 'Reflect')
          ? { receiver: directReceiver.text, method: directMember.key, exactGlobal: !this.lookup(directReceiver).found }
          : undefined;
        const callee = unwrap(node.expression);
        const directMutationApi = directApi?.exactGlobal === true
          ? directApi
          : ts.isIdentifier(callee)
            ? (() => {
              const initializer = this.declarationInitializer(callee);
              const apiMember = initializer === undefined ? undefined : staticMember(initializer);
              const receiver = apiMember === undefined ? undefined : unwrap(apiMember.base);
              return receiver !== undefined
                && ts.isIdentifier(receiver)
                && (receiver.text === 'Object' || receiver.text === 'Reflect')
                && !this.lookup(receiver).found
                ? { receiver: receiver.text, method: apiMember!.key, exactGlobal: true } as MutationApiIdentity
                : undefined;
            })()
            : undefined;
        const directLocal = (() => {
          if (ts.isArrowFunction(callee) || ts.isFunctionExpression(callee)) return callee;
          if (!ts.isIdentifier(callee)) return undefined;
          const declaration = this.bindingDeclaration(callee);
          if (declaration !== undefined && ts.isFunctionDeclaration(declaration.parent) && declaration.parent.name === declaration) return declaration.parent;
          const initializer = this.declarationInitializer(callee);
          const value = initializer === undefined ? undefined : unwrap(initializer);
          return value !== undefined && (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) ? value : undefined;
        })();
        const receiverRoot = directReceiver === undefined ? undefined : root(directReceiver, substitutions);
        let obviousArrayMethodRebind = false;
        if (
          directMember !== undefined
          && receiverRoot !== undefined
          && typeof receiverRoot !== 'string'
          && ts.isArrayLiteralExpression(receiverRoot)
          && (directMember.key === 'map' || directMember.key === 'forEach' || directMember.key === 'push')
        ) {
          const inspectPriorWrites = (candidate: ts.Node): void => {
            if (obviousArrayMethodRebind || candidate.getStart(this.source) >= node.getStart(this.source)) return;
            if (candidate !== scope && ts.isFunctionLike(candidate)) return;
            if (ts.isBinaryExpression(candidate) && isAssignmentOperator(candidate.operatorToken.kind)) {
              const assigned = staticMember(candidate.left);
              const assignedRoot = assigned === undefined ? undefined : root(assigned.base, substitutions);
              if (
                assigned?.key === directMember.key
                && (assignedRoot === receiverRoot || assignedRoot === 'global:Array.prototype')
              ) obviousArrayMethodRebind = true;
            }
            ts.forEachChild(candidate, inspectPriorWrites);
          };
          ts.forEachChild(scope, inspectPriorWrites);
        }
        const nativeArrayCall = directMember !== undefined
          && directReceiver !== undefined
          && (directMember.key === 'map' || directMember.key === 'forEach' || directMember.key === 'push')
          && receiverRoot !== undefined
          && typeof receiverRoot !== 'string'
          && ts.isArrayLiteralExpression(receiverRoot)
          && !obviousArrayMethodRebind;
        const exactFunctionWrapper = directMember !== undefined
          && (directMember.key === 'call' || directMember.key === 'apply' || directMember.key === 'bind')
          && nativeFunctionWrapper(directMember.base, directMember.key, substitutions);
        const knownNonEscapingCall = directLocal !== undefined
          || directMutationApi?.exactGlobal === true
          || nativeArrayCall
          || exactFunctionWrapper
          || (directMember?.key === 'isArray'
            && directReceiver !== undefined
            && ts.isIdentifier(directReceiver)
            && directReceiver.text === 'Array'
            && !this.lookup(directReceiver).found);
        const escapeRelevantRoot = expectedRoot === 'global:Array.prototype'
          || (typeof expectedRoot !== 'string' && ts.isArrayLiteralExpression(expectedRoot))
          || (typeof expectedRoot !== 'string'
            && ts.isObjectLiteralExpression(expectedRoot)
            && ['map', 'forEach', 'push'].includes(key));
        if (!knownNonEscapingCall && escapeRelevantRoot) {
          for (const argument of node.arguments) {
            const value = ts.isSpreadElement(argument) ? argument.expression : argument;
            const aggregate = finiteAggregateRelevance(value, this, substitutions);
            const candidates = [value, ...(aggregate?.identities ?? []), ...(aggregate?.leaves ?? [])];
            const escaped = candidates.find(candidate => root(candidate, substitutions) === expectedRoot);
            if (escaped !== undefined) {
              record(this.stableMemberProjection(escaped, key), undefined, true);
            }
          }
        }
        let invocation: NormalizedInvocation;
        let api: MutationApiIdentity | undefined;
        if (directApi?.exactGlobal === true && !node.arguments.some(ts.isSpreadElement)) {
          invocation = { target: node.expression, arguments: node.arguments };
          api = directApi;
        } else {
          const mutationMethods = new Set(['assign', 'defineProperty', 'defineProperties', 'set', 'deleteProperty', 'setPrototypeOf']);
          const candidateMayResolveToApi = (candidate: AliasCandidate, seen = new Set<ts.Identifier>()): boolean => {
            if (typeof candidate === 'string') return false;
            if (isDefaultAliasCandidate(candidate)) return candidateMayResolveToApi(candidate.source, seen)
              || candidateMayResolveToApi(candidate.fallback, seen);
            if (isProjectedAliasCandidate(candidate)) return mutationMethods.has(String(candidate.key))
              && candidateMayResolveToGlobal(candidate.source, seen);
            return expressionMayResolveToApi(candidate, seen);
          };
          const candidateMayResolveToGlobal = (candidate: AliasCandidate, seen: Set<ts.Identifier>): boolean => {
            if (typeof candidate === 'string') return false;
            if (isDefaultAliasCandidate(candidate)) return candidateMayResolveToGlobal(candidate.source, seen)
              || candidateMayResolveToGlobal(candidate.fallback, seen);
            if (isProjectedAliasCandidate(candidate)) return false;
            const expression = unwrap(candidate);
            if (ts.isIdentifier(expression) && (expression.text === 'Object' || expression.text === 'Reflect')) return !this.lookup(expression).found;
            return false;
          };
          const expressionMayResolveToApi = (expression: ts.Expression, seen = new Set<ts.Identifier>()): boolean => {
            expression = unwrap(expression);
            const member = staticMember(expression);
            if (member !== undefined) {
              const receiver = unwrap(member.base);
              return mutationMethods.has(member.key)
                && ts.isIdentifier(receiver)
                && (receiver.text === 'Object' || receiver.text === 'Reflect')
                && !this.lookup(receiver).found;
            }
            if (!ts.isIdentifier(expression) || seen.has(expression)) return false;
            const declaration = this.bindingDeclaration(expression);
            if (declaration === undefined || seen.has(declaration)) return false;
            const lookup = this.provenanceCandidates(expression);
            return lookup.found && lookup.candidates.some(candidate => candidateMayResolveToApi(candidate, new Set(seen).add(declaration)));
          };
          if (!expressionMayResolveToApi(node.expression) || this.activeMemberApiResolution.has(node)) return;
          this.activeMemberApiResolution.add(node);
          try {
            invocation = normalizeInvocation(node, this, substitutions);
            api = resolveMutationApiIdentity(invocation.target, this, substitutions);
          } finally {
            this.activeMemberApiResolution.delete(node);
          }
        }
        if (api?.exactGlobal !== true || invocation.arguments === undefined || invocation.arguments[0] === undefined) return;
        const args = invocation.arguments;
        const recordOn = (target: ts.Expression, memberKey: string | undefined, initializer: ts.Expression | undefined, invalid = false, ambiguousIdentity = false): void => {
          if (memberKey !== undefined && memberKey !== key) return;
          record(this.stableMemberProjection(target, key), initializer, invalid || memberKey === undefined, false, ambiguousIdentity);
        };
        const recordKey = (memberKey: string | undefined, initializer: ts.Expression | undefined, invalid = false, ambiguousIdentity = false): void => {
          recordOn(args[0], memberKey, initializer, invalid, ambiguousIdentity);
        };
        const descriptorField = (
          expression: ts.Expression | undefined,
          field: 'value' | 'writable' | 'get' | 'set',
          seen = new Set<ts.ObjectLiteralExpression>(),
        ): AliasProvenance => {
          if (expression === undefined) return { kind: 'tainted' };
          const provenance = resolveAliasProvenance(expression, this, substitutions);
          if (provenance.kind !== 'exact' || ts.isMethodDeclaration(provenance.origin)) return provenance;
          const descriptor = unwrap(provenance.origin);
          if (!ts.isObjectLiteralExpression(descriptor) || seen.has(descriptor)) return { kind: 'tainted' };
          const nextSeen = new Set(seen).add(descriptor);
          for (let index = descriptor.properties.length - 1; index >= 0; index -= 1) {
            const property = descriptor.properties[index];
            if (ts.isSpreadAssignment(property)) {
              const spreadValue = descriptorField(property.expression, field, nextSeen);
              if (spreadValue.kind !== 'absent') return spreadValue;
              continue;
            }
            const memberKey = ts.isComputedPropertyName(property.name)
              ? resolveStaticString(property.name.expression, this, substitutions)
              : propertyName(property.name);
            if (memberKey === undefined) return { kind: 'tainted' };
            if (memberKey !== field) continue;
            if (ts.isPropertyAssignment(property)) return resolveAliasProvenance(property.initializer, this, substitutions);
            if (ts.isShorthandPropertyAssignment(property)) return resolveAliasProvenance(property.name, this, substitutions);
            return { kind: 'tainted' };
          }
          return { kind: 'absent' };
        };
        const descriptorValue = (expression: ts.Expression | undefined): AliasProvenance => descriptorField(expression, 'value');
        const descriptorDefinitionState = (expression: ts.Expression | undefined): OwnDescriptorState => {
          const value = descriptorField(expression, 'value');
          const getter = descriptorField(expression, 'get');
          const setter = descriptorField(expression, 'set');
          if (value.kind === 'tainted' || getter.kind === 'tainted' || setter.kind === 'tainted') return 'unknown';
          if (value.kind === 'absent' && (getter.kind !== 'absent' || setter.kind !== 'absent')) return 'accessor';
          const writable = descriptorField(expression, 'writable');
          if (writable.kind === 'tainted') return 'unknown';
          if (writable.kind === 'absent') return 'readonly-data';
          if (ts.isMethodDeclaration(writable.origin)) return 'unknown';
          const truth = staticTruthValue(writable.origin, this);
          return truth === true ? 'writable-data' : truth === false ? 'readonly-data' : 'unknown';
        };
        if (api.method === 'assign') {
          for (const sourceExpression of args.slice(1)) {
            const source = unwrap(sourceExpression);
            if (!ts.isObjectLiteralExpression(source)) {
              recordKey(key, undefined, true);
              continue;
            }
            for (const property of source.properties) {
              if (ts.isSpreadAssignment(property)) recordKey(key, undefined, true);
              else {
                const assignedKey = resolvedPropertyKey(property.name, substitutions);
                if (assignedKey !== undefined && functionMethod(assignedKey)) {
                  const initializer = ts.isPropertyAssignment(property)
                    ? property.initializer
                    : ts.isShorthandPropertyAssignment(property)
                      ? property.name
                      : undefined;
                  setFunctionMethodState(
                    args[0],
                    assignedKey,
                    branchAt(node, scope) === undefined && obviousNativeFunctionMember(initializer, assignedKey, substitutions)
                      ? 'native'
                      : branchAt(node, scope) === undefined
                        ? 'rebound'
                        : 'unknown',
                    substitutions,
                  );
                }
                if (assignedKey === key) {
                  recordKey(key, ts.isPropertyAssignment(property) ? property.initializer : undefined, !ts.isPropertyAssignment(property));
                  setDescriptorState(args[0], key, 'writable-data', substitutions);
                }
              }
            }
          }
        } else if (api.method === 'defineProperty') {
          const memberKey = resolveStaticString(args[1], this, substitutions);
          const value = descriptorValue(args[2]);
          recordKey(
            memberKey,
            value.kind === 'exact' && !ts.isMethodDeclaration(value.origin) ? value.origin : undefined,
            memberKey === undefined || value.kind !== 'exact' || ts.isMethodDeclaration(value.origin),
            value.kind === 'tainted',
          );
          setDescriptorState(
            args[0],
            memberKey,
            branchAt(node, scope) === undefined ? descriptorDefinitionState(args[2]) : 'unknown',
            substitutions,
          );
          if (memberKey !== undefined && functionMethod(memberKey)) {
            setFunctionMethodState(
              args[0],
              memberKey,
              branchAt(node, scope) === undefined
                && value.kind === 'exact'
                && !ts.isMethodDeclaration(value.origin)
                && obviousNativeFunctionMember(value.origin, memberKey, substitutions)
                ? 'native'
                : branchAt(node, scope) === undefined
                  ? 'rebound'
                  : 'unknown',
              substitutions,
            );
          }
        } else if (api.receiver === 'Reflect' && api.method === 'set') {
          if (definitelyPrimitiveExpression(args[0], this, substitutions)) return;
          const memberKey = resolveStaticString(args[1], this, substitutions);
          if (memberKey === undefined || args[2] === undefined) {
            recordKey(memberKey, args[2], true, true);
            if (args[3] !== undefined) recordOn(args[3], memberKey, args[2], true, true);
          } else {
            const receiver = args[3] ?? args[0];
            const receiverProvenance = resolveAliasProvenance(receiver, this, substitutions);
            const primitiveReceiver = definitelyPrimitiveExpression(receiver, this, substitutions);
            const targetDescriptor = descriptorState(args[0], memberKey, substitutions);
            if (!primitiveReceiver && targetDescriptor !== 'readonly-data') {
              const exactDescriptor = finiteOwnDescriptorsAt(args[0], this, substitutions, node).properties.get(memberKey);
              if (exactDescriptor?.kind === 'accessor') {
                if (exactDescriptor.setter === 'unknown') recordOn(receiver, memberKey, args[2], true, true);
              } else if (memberKey === '__proto__' && targetDescriptor === 'absent') {
                const prototype = resolveAliasProvenance(args[2], this, substitutions);
                const projected = prototype.kind === 'exact' && !ts.isMethodDeclaration(prototype.origin)
                  && ts.isObjectLiteralExpression(unwrap(prototype.origin))
                  ? resolveObjectLiteralProperty(unwrap(prototype.origin) as ts.ObjectLiteralExpression, key, this, substitutions, new Set())
                  : { kind: 'tainted' as const };
                recordOn(
                  receiver,
                  key,
                  projected.kind === 'exact' && !ts.isMethodDeclaration(projected.origin) ? projected.origin : undefined,
                  projected.kind !== 'exact' || ts.isMethodDeclaration(projected.origin),
                  projected.kind === 'tainted',
                );
              } else if (targetDescriptor === 'accessor' || targetDescriptor === 'unknown' || receiverProvenance.kind !== 'exact') {
                recordOn(receiver, memberKey, args[2], true, targetDescriptor === 'unknown' || receiverProvenance.kind !== 'exact');
                if (functionMethod(memberKey)) setFunctionMethodState(receiver, memberKey, 'unknown', substitutions);
              } else {
                const receiverDescriptor = descriptorState(receiver, memberKey, substitutions);
                if (receiverDescriptor === 'accessor' || receiverDescriptor === 'unknown') {
                  recordOn(receiver, memberKey, args[2], true, receiverDescriptor === 'unknown');
                  if (functionMethod(memberKey)) setFunctionMethodState(receiver, memberKey, 'unknown', substitutions);
                } else if (receiverDescriptor !== 'readonly-data') {
                  recordOn(receiver, memberKey, args[2]);
                  setDescriptorState(receiver, memberKey, 'writable-data', substitutions);
                  if (functionMethod(memberKey)) {
                    setFunctionMethodState(
                      receiver,
                      memberKey,
                      obviousNativeFunctionMember(args[2], memberKey, substitutions) ? 'native' : 'rebound',
                      substitutions,
                    );
                  }
                }
              }
            }
          }
        } else if (api.method === 'defineProperties') {
          const descriptors = args[1] === undefined ? undefined : unwrap(args[1]);
          if (descriptors === undefined || !ts.isObjectLiteralExpression(descriptors)) recordKey(key, undefined, true);
          else {
            const descriptor = resolveObjectLiteralProperty(descriptors, key, this, substitutions, new Set());
            if (descriptor.kind !== 'absent') {
              const value = descriptor.kind === 'exact' && !ts.isMethodDeclaration(descriptor.origin)
                ? descriptorValue(descriptor.origin)
                : { kind: 'tainted' as const };
              recordKey(
                key,
                value.kind === 'exact' && !ts.isMethodDeclaration(value.origin) ? value.origin : undefined,
                descriptor.kind !== 'exact' || ts.isMethodDeclaration(descriptor.origin)
                  || value.kind !== 'exact' || ts.isMethodDeclaration(value.origin),
                descriptor.kind === 'tainted' || value.kind === 'tainted',
              );
              setDescriptorState(
                args[0],
                key,
                descriptor.kind === 'exact' && !ts.isMethodDeclaration(descriptor.origin) && branchAt(node, scope) === undefined
                  ? descriptorDefinitionState(descriptor.origin)
                  : 'unknown',
                substitutions,
              );
            }
            for (const method of ['call', 'apply', 'bind'] as const) {
              const methodDescriptor = resolveObjectLiteralProperty(descriptors, method, this, substitutions, new Set());
              if (methodDescriptor.kind === 'absent') continue;
              const methodValue = methodDescriptor.kind === 'exact' && !ts.isMethodDeclaration(methodDescriptor.origin)
                ? descriptorValue(methodDescriptor.origin)
                : { kind: 'tainted' as const };
              setFunctionMethodState(
                args[0],
                method,
                branchAt(node, scope) === undefined
                  && methodValue.kind === 'exact'
                  && !ts.isMethodDeclaration(methodValue.origin)
                  && obviousNativeFunctionMember(methodValue.origin, method, substitutions)
                  ? 'native'
                  : branchAt(node, scope) === undefined
                    ? 'rebound'
                    : 'unknown',
                substitutions,
              );
            }
          }
        } else if (api.method === 'setPrototypeOf') {
          const prototype = args[1] === undefined ? undefined : unwrap(args[1]);
          if (prototype === undefined || !ts.isObjectLiteralExpression(prototype)) recordKey(key, undefined, true);
          else {
            const projected = resolveObjectLiteralProperty(prototype, key, this, substitutions, new Set());
            if (projected.kind === 'exact' && !ts.isMethodDeclaration(projected.origin)) recordKey(key, projected.origin);
            else recordKey(key, undefined, true);
          }
        } else if (api.receiver === 'Reflect' && api.method === 'deleteProperty') {
          const memberKey = resolveStaticString(args[1], this, substitutions);
          if (memberKey !== undefined && functionMethod(memberKey)) {
            const deletedRoot = root(args[0], substitutions);
            if (deletedRoot === 'global:Function.prototype') setFunctionMethodState(args[0], memberKey, 'rebound', substitutions);
            else if (deletedRoot !== undefined) functionMethodStates.get(deletedRoot)?.delete(memberKey);
          }
          if (memberKey === undefined || memberKey === key) {
            record(this.stableMemberProjection(args[0], key), undefined, memberKey === undefined, memberKey !== undefined);
          }
        }
      }
    };
    const lexicalVisit = (node: ts.Node): void => {
      if (node !== owner && ts.isFunctionLike(node)) return;
      if (isStaticallyDead(node, this)) return;
      if (node === at) atPosition = node.getStart(this.source);
      recordNode(node, new Map(), 'known', node.end, owner!);
      ts.forEachChild(node, lexicalVisit);
    };
    const queryContext = querySubstitutions === undefined
      ? undefined
      : this.invocationQueryContext(querySubstitutions);
    const replayOwner = queryContext?.owner ?? (isLexicalFunction(owner) ? owner : undefined);
    if (replayOwner !== undefined && !ts.isSourceFile(replayOwner)) {
      let moduleSequence = -1_000_000;
      for (const item of this.executableModuleNodes()) {
        recordNode(item.node, item.substitutions, item.execution, moduleSequence++, item.current);
      }
    }
    if (queryContext !== undefined && replayOwner !== undefined && isLexicalFunction(replayOwner)) {
      const timeline = this.executableFunctionTimeline(replayOwner);
      if (timeline === undefined) return ['tainted'];
      const querySubstitutionKey = normalizedInvocationSubstitutionKey(querySubstitutions!, this);
      const contextMatches = timeline.filter(item => {
        if (item.node !== at) return false;
        const itemContext = this.invocationQueryContext(item.substitutions);
        return itemContext?.owner === queryContext.owner && itemContext.site === queryContext.site;
      });
      const exactMatches = contextMatches.filter(item => (
        normalizedInvocationSubstitutionKey(item.substitutions, this) === querySubstitutionKey
      ));
      const selected = exactMatches.length > 0 ? exactMatches : contextMatches;
      if (selected.length === 0) return ['tainted'];
      atPosition = selected[selected.length - 1].sequence;
      for (const item of timeline) {
        recordNode(item.node, item.substitutions, item.execution, item.sequence, item.current);
      }
    } else if (queryContext !== undefined && replayOwner !== undefined && ts.isSourceFile(replayOwner)) {
      const timeline = this.executableModuleNodes();
      const querySubstitutionKey = normalizedInvocationSubstitutionKey(querySubstitutions!, this);
      const contextMatches = timeline.flatMap((item, sequence) => {
        if (item.node !== at) return [];
        const itemContext = this.invocationQueryContext(item.substitutions);
        return itemContext?.owner === queryContext.owner && itemContext.site === queryContext.site
          ? [{ ...item, sequence }]
          : [];
      });
      const exactMatches = contextMatches.filter(item => (
        normalizedInvocationSubstitutionKey(item.substitutions, this) === querySubstitutionKey
      ));
      const selected = exactMatches.length > 0 ? exactMatches : contextMatches;
      if (selected.length === 0) return ['tainted'];
      atPosition = selected[selected.length - 1].sequence;
      timeline.forEach((item, sequence) => {
        recordNode(item.node, item.substitutions, item.execution, sequence, item.current);
      });
    } else if (replayOwner !== undefined && isLexicalFunction(replayOwner) && this.activeMemberTimelineBuildDepth === 0) {
      let timeline = this.memberTimelines.get(replayOwner);
      if (timeline === undefined) {
        timeline = [];
        this.activeMemberTimelineBuildDepth += 1;
        try {
          visitExecutableFunctionNodes(replayOwner, this, (node, substitutions, execution, sequence, current) => {
            timeline!.push({ node, substitutions, execution, sequence, current });
          }, true);
        } finally {
          this.activeMemberTimelineBuildDepth -= 1;
        }
        this.memberTimelines.set(replayOwner, timeline);
      }
      for (const item of timeline) {
        if (item.node === at) atPosition = item.sequence;
        recordNode(item.node, item.substitutions, item.execution, item.sequence, item.current);
      }
    } else {
      ts.forEachChild(owner, lexicalVisit);
      atPosition ??= at.getStart(this.source);
    }
    if (atPosition === undefined) return ['tainted'];
    const preceding = events.filter(event => event.position < atPosition!).sort((left, right) => left.position - right.position);
    if (preceding.length === 0) return undefined;
    const eventCandidates = (event: MemberEvent): AliasCandidate[] => {
      if (event.deleted && !event.invalid) return ['absent'];
      if (event.ambiguousIdentity) return event.initializer === undefined
        ? ['ambiguous-identity']
        : ['ambiguous-identity', event.initializer];
      if (!event.invalid && event.initializer !== undefined) return [event.initializer];
      return event.initializer === undefined ? ['tainted'] : ['tainted', event.initializer];
    };
    let candidates: AliasCandidate[] = ['absent'];
    for (let index = 0; index < preceding.length;) {
      const event = preceding[index];
      if (event.branch === undefined) {
        candidates = eventCandidates(event);
        index += 1;
        continue;
      }
      const grouped: MemberEvent[] = [];
      while (index < preceding.length && preceding[index].branch?.owner === event.branch.owner) grouped.push(preceding[index++]);
      const lastByArm = new Map(grouped.map(item => [item.branch!.arm, item]));
      const next: AliasCandidate[] = [];
      for (const arm of event.branch.arms) {
        const item = lastByArm.get(arm);
        if (item === undefined) next.push(...candidates);
        else next.push(...eventCandidates(item));
      }
      if (!event.branch.exhaustive) next.push(...candidates);
      candidates = next;
    }
    return candidates;
  }

  arrayAppendCandidates(
    base: ts.Expression,
    at: ts.Node,
    substitutions: InvocationSubstitutions,
  ): { values: readonly ts.Expression[]; tainted: boolean } | undefined {
    base = unwrap(base);
    if (this.activeMemberTimelineBuildDepth !== 0) return this.computeArrayAppendCandidates(base, at, substitutions);
    let byNode = this.arrayAppendQueries.get(substitutions as object);
    if (byNode === undefined) {
      byNode = new WeakMap();
      this.arrayAppendQueries.set(substitutions as object, byNode);
    }
    let byBase = byNode.get(at);
    if (byBase === undefined) {
      byBase = new WeakMap();
      byNode.set(at, byBase);
    }
    if (byBase.has(base)) return byBase.get(base) ?? undefined;
    const result = this.computeArrayAppendCandidates(base, at, substitutions);
    byBase.set(base, result ?? null);
    return result;
  }

  private computeArrayAppendCandidates(
    base: ts.Expression,
    at: ts.Node,
    substitutions: InvocationSubstitutions,
  ): { values: readonly ts.Expression[]; tainted: boolean } | undefined {
    const root = (
      expression: ts.Expression,
      projected: InvocationSubstitutions,
      seen = new Set<ts.Identifier>(),
    ): ts.Node | string | undefined => {
      expression = unwrap(expression);
      const direct = projected.get(expression);
      if (direct !== undefined) return typeof direct === 'string' ? undefined : root(direct, projected, seen);
      if (!ts.isIdentifier(expression)) return expression;
      const declaration = this.bindingDeclaration(expression);
      if (declaration === undefined) return `global:${expression.text}`;
      if (seen.has(declaration)) return undefined;
      const substitution = projected.get(declaration);
      if (substitution !== undefined) return typeof substitution === 'string'
        ? undefined
        : root(substitution, projected, new Set(seen).add(declaration));
      const initializer = this.declarationInitializer(expression);
      return initializer === undefined ? declaration : root(initializer, projected, new Set(seen).add(declaration));
    };
    const expectedRoot = root(base, substitutions);
    if (expectedRoot === undefined) return { values: [], tainted: true };
    let owner: ts.Node | undefined = at;
    while (owner !== undefined && !isLexicalFunction(owner)) owner = owner.parent;
    if (owner === undefined) return undefined;
    let timeline = this.memberTimelines.get(owner);
    if (timeline === undefined) {
      if (this.activeMemberTimelineBuildDepth !== 0) return undefined;
      timeline = [];
      this.activeMemberTimelineBuildDepth += 1;
      try {
        visitExecutableFunctionNodes(owner, this, (node, projected, execution, sequence, current) => {
          timeline!.push({ node, substitutions: projected, execution, sequence, current });
        }, true);
      } finally {
        this.activeMemberTimelineBuildDepth -= 1;
      }
      this.memberTimelines.set(owner, timeline);
    }
    const positions = timeline.filter(item => item.node === at).map(item => item.sequence);
    const atPosition = positions.length === 0 ? undefined : positions[positions.length - 1];
    if (atPosition === undefined) return { values: [], tainted: true };
    const values: ts.Expression[] = [];
    let tainted = false;
    for (const item of timeline) {
      if (item.sequence >= atPosition || !ts.isCallExpression(item.node)) continue;
      const member = staticMember(item.node.expression);
      if (member?.key !== 'push' || root(member.base, item.substitutions) !== expectedRoot) continue;
      if (item.execution !== 'known' || ownStaticMember(item.node.expression, this)) {
        tainted = true;
        continue;
      }
      for (const argument of item.node.arguments) {
        if (ts.isSpreadElement(argument)) {
          tainted = true;
          continue;
        }
        const provenance = resolveAliasProvenance(argument, this, item.substitutions);
        if (provenance.kind === 'tainted') tainted = true;
        else if (provenance.kind === 'exact') {
          if (ts.isMethodDeclaration(provenance.origin)) tainted = true;
          else values.push(provenance.origin);
        } else values.push(argument);
      }
    }
    return values.length === 0 && !tainted ? undefined : { values, tainted };
  }

  path(identifier: ts.Identifier, seen = new Set<ts.Node>()): string | undefined {
    const lookup = this.lookup(identifier);
    const event = lookup.found ? lookup.event : undefined;
    if (event?.initializer === undefined || seen.has(event.name)) return undefined;
    return canonicalAccessPath(event.initializer, this, new Set(seen).add(event.name));
  }

  isBinding(identifier: ts.Identifier, declaration: ts.Identifier): boolean {
    const lookup = this.lookup(identifier);
    return lookup.found && lookup.event?.name === declaration;
  }

  bindingDeclaration(identifier: ts.Identifier): ts.Identifier | undefined {
    const lookup = this.lookup(identifier);
    return lookup.found ? lookup.event?.name : undefined;
  }

  sameBinding(left: ts.Identifier, right: ts.Identifier): boolean {
    const leftLookup = this.lookup(left);
    const rightLookup = this.lookup(right);
    if (leftLookup.found || rightLookup.found) {
      return leftLookup.found
        && rightLookup.found
        && leftLookup.event?.name !== undefined
        && leftLookup.event.name === rightLookup.event?.name;
    }
    return left.text === right.text;
  }

  declarationInitializer(identifier: ts.Identifier): ts.Expression | undefined {
    const lookup = this.lookup(identifier);
    return lookup.found ? lookup.event?.initializer : undefined;
  }

  uniqueLexicalInitializer(identifier: ts.Identifier): ts.Expression | undefined {
    for (const scope of this.scopes(identifier)) {
      const declarations = (this.eventsFor(scope).get(identifier.text) ?? []).filter(event => event.kind === 'declaration');
      if (declarations.length === 0) continue;
      return declarations.length === 1 ? declarations[0].initializer : undefined;
    }
    return undefined;
  }

  componentPropBinding(identifier: ts.Identifier, propName: string): { declaration: ts.Identifier; owner: ts.FunctionLikeDeclaration } | undefined {
    const lookup = this.lookup(identifier);
    const declaration = lookup.found && lookup.event?.parameter === true
      ? lookup.event.name
      : undefined;
    if (declaration === undefined || declaration.text !== propName) return undefined;
    const element = declaration.parent;
    if (
      !ts.isBindingElement(element)
      || element.name !== declaration
      || element.dotDotDotToken !== undefined
      || element.propertyName !== undefined
      || element.initializer !== undefined
      || !ts.isObjectBindingPattern(element.parent)
      || !ts.isParameter(element.parent.parent)
    ) return undefined;
    const parameter = element.parent.parent;
    const owner = parameter.parent;
    const isPascalCase = (name: string): boolean => /^[A-Z][A-Za-z0-9]*$/.test(name);
    if (ts.isFunctionDeclaration(owner)) {
      return owner.name !== undefined
        && isPascalCase(owner.name.text)
        && owner.parameters[0] === parameter
        && ts.isSourceFile(owner.parent)
        ? { declaration, owner }
        : undefined;
    }
    if (!ts.isArrowFunction(owner) && !ts.isFunctionExpression(owner)) return undefined;
    const variable = owner.parent;
    return ts.isVariableDeclaration(variable)
      && variable.initializer === owner
      && ts.isIdentifier(variable.name)
      && isPascalCase(variable.name.text)
      && owner.parameters[0] === parameter
      && ts.isVariableDeclarationList(variable.parent)
      && ts.isVariableStatement(variable.parent.parent)
      && ts.isSourceFile(variable.parent.parent.parent)
      ? { declaration, owner }
      : undefined;
  }

  isJobConfigPropParameter(identifier: ts.Identifier): boolean {
    return this.componentPropBinding(identifier, 'jobConfig') !== undefined;
  }

  isExactNamedImport(identifier: ts.Identifier, importedName: string, moduleName: string): boolean {
    if (identifier.text !== importedName || this.lookup(identifier).found) return false;
    const matches = this.source.statements.filter(statement => {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== moduleName) return false;
      const importClause = statement.importClause;
      if (importClause === undefined || importClause.isTypeOnly) return false;
      const bindings = importClause.namedBindings;
      return bindings !== undefined && ts.isNamedImports(bindings)
        && bindings.elements.some(specifier => !specifier.isTypeOnly && specifier.propertyName === undefined && specifier.name.text === importedName);
    });
    return matches.length === 1;
  }

  isExactImportBinding(identifier: ts.Identifier): boolean {
    if (this.lookup(identifier).found) return false;
    const matches = this.source.statements.filter(statement => {
      if (!ts.isImportDeclaration(statement) || statement.importClause === undefined || statement.importClause.isTypeOnly) return false;
      if (statement.importClause.name?.text === identifier.text) return true;
      const named = statement.importClause.namedBindings;
      return named !== undefined && ts.isNamedImports(named)
        && named.elements.some(specifier => !specifier.isTypeOnly && specifier.name.text === identifier.text);
    });
    return matches.length === 1;
  }

  isExactDefaultImport(identifier: ts.Identifier, moduleName: string): boolean {
    if (this.lookup(identifier).found) return false;
    const matches = this.source.statements.filter(statement => (
      ts.isImportDeclaration(statement)
      && ts.isStringLiteral(statement.moduleSpecifier)
      && statement.moduleSpecifier.text === moduleName
      && statement.importClause !== undefined
      && !statement.importClause.isTypeOnly
      && statement.importClause.name?.text === identifier.text
    ));
    return matches.length === 1;
  }

  private scopes(node: ts.Node): ts.Node[] {
    const result: ts.Node[] = [];
    let current: ts.Node | undefined = node;
    while (current !== undefined) {
      if (isLexicalScope(current)) result.push(current);
      current = current.parent;
    }
    return result;
  }

  private eventsFor(scope: ts.Node): Map<string, LexicalBindingEvent[]> {
    const cached = this.events.get(scope);
    if (cached !== undefined) return cached;
    const result = new Map<string, LexicalBindingEvent[]>();
    const add = (event: LexicalBindingEvent): void => {
      const events = result.get(event.name.text) ?? [];
      events.push(event);
      events.sort((left, right) => left.position - right.position);
      result.set(event.name.text, events);
    };
    const collectBindingNames = (name: ts.BindingName, names: Set<string>): void => {
      if (ts.isIdentifier(name)) names.add(name.text);
      else for (const element of name.elements) if (!ts.isOmittedExpression(element)) collectBindingNames(element.name, names);
    };
    const project = (initializer: ts.Expression | undefined, key: string | number): ts.Expression | undefined => initializer === undefined
      ? undefined
      : this.stableMemberProjection(initializer, key);
    const bindingPropertyName = (node: ts.PropertyName, position: number): string | undefined => {
      if (!ts.isComputedPropertyName(node)) return propertyName(node);
      const resolve = (expression: ts.Expression, seen = new Set<ts.Identifier>()): string | undefined => {
        expression = unwrap(expression);
        if (ts.isStringLiteral(expression) || ts.isNumericLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
        if (!ts.isIdentifier(expression)) return undefined;
        const events = result.get(expression.text);
        const declarations = events?.filter(event => event.kind === 'declaration') ?? [];
        const assignments = events?.filter(event => event.kind === 'assignment' && event.position <= position) ?? [];
        if (declarations.length !== 1 || assignments.length > 0 || seen.has(declarations[0].name) || declarations[0].initializer === undefined) return undefined;
        return resolve(declarations[0].initializer, new Set(seen).add(declarations[0].name));
      };
      return resolve(node.expression);
    };
    const projectBindingValue = (initializer: ts.Expression | undefined, key: string | number): { initializer?: ts.Expression; invalid?: boolean } => {
      if (initializer === undefined) return {};
      const source = unwrap(initializer);
      if (typeof key === 'number' && ts.isArrayLiteralExpression(source)) {
        if (source.elements.some(ts.isSpreadElement)) return { invalid: true };
        const element = source.elements[key];
        return element === undefined || ts.isOmittedExpression(element) ? {} : { initializer: element };
      }
      if (typeof key === 'string' && ts.isObjectLiteralExpression(source)) {
        if (source.properties.some(property => ts.isSpreadAssignment(property) || ts.isGetAccessorDeclaration(property) || ts.isSetAccessorDeclaration(property))) return { invalid: true };
        let value: ts.Expression | undefined;
        for (const property of source.properties) {
          if (ts.isShorthandPropertyAssignment(property) && property.name.text === key) value = property.name;
          else if (ts.isPropertyAssignment(property) && propertyName(property.name) === key) value = property.initializer;
          else if (ts.isMethodDeclaration(property) && propertyName(property.name) === key) return { invalid: true };
        }
        return { initializer: value };
      }
      return { initializer: project(initializer, key) };
    };
    const addBindingName = (
      name: ts.BindingName,
      initializer: ts.Expression | undefined,
      position: number,
      parameter = false,
      invalid = false,
      candidate?: AliasCandidate,
    ): void => {
      if (ts.isIdentifier(name)) add({ kind: 'declaration', name, initializer, candidate, position, parameter, invalid });
      else if (ts.isObjectBindingPattern(name)) {
        for (const element of name.elements) {
          if (element.dotDotDotToken !== undefined) {
            addBindingName(element.name, undefined, position, parameter, true);
            continue;
          }
          const key = bindingPropertyName(element.propertyName ?? element.name as ts.PropertyName, position);
          if (key === undefined) {
            addBindingName(element.name, undefined, position, parameter, true, 'tainted');
            continue;
          }
          const projected = projectBindingValue(initializer, key);
          const source: AliasCandidate = candidate === undefined
            ? projected.invalid ? 'tainted' : projected.initializer ?? 'absent'
            : { kind: 'projection', source: candidate, key, at: element };
          const projectedCandidate: AliasCandidate = element.initializer === undefined
            ? source
            : { kind: 'default', source, fallback: element.initializer };
          addBindingName(
            element.name,
            projected.initializer,
            position,
            parameter,
            invalid || projected.invalid === true,
            projectedCandidate,
          );
        }
      } else {
        name.elements.forEach((element, index) => {
          if (ts.isOmittedExpression(element)) return;
          if (element.dotDotDotToken !== undefined) {
            addBindingName(element.name, undefined, position, parameter, true);
            return;
          }
          const projected = projectBindingValue(initializer, index);
          const source: AliasCandidate = candidate === undefined
            ? projected.invalid ? 'tainted' : projected.initializer ?? 'absent'
            : { kind: 'projection', source: candidate, key: index, at: element };
          const projectedCandidate: AliasCandidate = element.initializer === undefined
            ? source
            : { kind: 'default', source, fallback: element.initializer };
          addBindingName(
            element.name,
            projected.initializer,
            position,
            parameter,
            invalid || projected.invalid === true,
            projectedCandidate,
          );
        });
      }
    };
    const isBlockScopedVariable = (declaration: ts.VariableDeclaration): boolean => (
      ts.isVariableDeclarationList(declaration.parent)
      && (declaration.parent.flags & ts.NodeFlags.BlockScoped) !== 0
    );
    const assignmentPosition = (node: ts.Node): number => (
      (ts.isForInStatement(node) || ts.isForOfStatement(node))
        ? node.statement.getStart(this.source)
        : node.end
    );
    const assignmentBranch = (node: ts.Node): LexicalBindingEvent['branch'] | 'invalid' | undefined => {
      let current: ts.Node | undefined = node;
      let result: LexicalBindingEvent['branch'] | undefined;
      while (current?.parent !== undefined && current.parent !== scope) {
        const parent: ts.Node = current.parent;
        if (ts.isIfStatement(parent)) {
          const truth = staticTruthValue(parent.expression);
          if ((truth === true && current === parent.thenStatement) || (truth === false && current === parent.elseStatement)) {
            current = parent;
            continue;
          }
          if (truth !== undefined) return 'invalid';
          if (result !== undefined) return 'invalid';
          result = {
            owner: parent,
            arm: current === parent.thenStatement ? 'then' : 'else',
            arms: ['then', 'else'],
            exhaustive: parent.elseStatement !== undefined,
          };
        } else if (ts.isConditionalExpression(parent)) {
          const truth = staticTruthValue(parent.condition);
          if ((truth === true && current === parent.whenTrue) || (truth === false && current === parent.whenFalse)) {
            current = parent;
            continue;
          }
          if (truth !== undefined || result !== undefined) return 'invalid';
          result = { owner: parent, arm: current === parent.whenTrue ? 'true' : 'false', arms: ['true', 'false'], exhaustive: true };
        } else if (ts.isBinaryExpression(parent) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(parent.operatorToken.kind)) {
          const truth = staticTruthValue(parent.left);
          const nullish = staticNullishValue(parent.left);
          const rightIsCertain = (parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && truth === true)
            || (parent.operatorToken.kind === ts.SyntaxKind.BarBarToken && truth === false)
            || (parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken && nullish === true);
          const rightIsDead = (parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && truth === false)
            || (parent.operatorToken.kind === ts.SyntaxKind.BarBarToken && truth === true)
            || (parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken && nullish === false);
          if (current === parent.right && rightIsCertain) {
            current = parent;
            continue;
          }
          if (current === parent.right && (rightIsDead || result !== undefined)) return 'invalid';
          if (current === parent.right) result = { owner: parent, arm: 'right', arms: ['left', 'right'], exhaustive: false };
        } else if (ts.isCaseClause(parent) || ts.isDefaultClause(parent)) {
          const switchStatement = ts.isCaseBlock(parent.parent) && ts.isSwitchStatement(parent.parent.parent) ? parent.parent.parent : undefined;
          if (switchStatement === undefined || result !== undefined) return 'invalid';
          const clauses = switchStatement.caseBlock.clauses;
          result = {
            owner: switchStatement,
            arm: String(clauses.indexOf(parent)),
            arms: clauses.map((_, index) => String(index)),
            exhaustive: clauses.some(ts.isDefaultClause),
          };
        } else if (ts.isSwitchStatement(parent)) {
          if (result?.owner === parent) {
            current = parent;
            continue;
          }
          const clause = current.parent !== undefined && (ts.isCaseClause(current.parent) || ts.isDefaultClause(current.parent))
            ? current.parent
            : undefined;
          if (clause === undefined || result !== undefined) return 'invalid';
          const clauses = parent.caseBlock.clauses;
          result = {
            owner: parent,
            arm: String(clauses.indexOf(clause)),
            arms: clauses.map((_, index) => String(index)),
            exhaustive: clauses.some(ts.isDefaultClause),
          };
        } else if (ts.isForStatement(parent) || ts.isForInStatement(parent) || ts.isForOfStatement(parent) || ts.isWhileStatement(parent) || ts.isDoStatement(parent) || ts.isTryStatement(parent)) return 'invalid';
        current = parent;
      }
      return result;
    };
    const assignmentBindings = (node: ts.Node): Array<{
      name: ts.Identifier;
      initializer?: ts.Expression;
      candidate?: AliasCandidate;
      invalid?: boolean;
      branch?: LexicalBindingEvent['branch'];
    }> => {
      if (isStaticallyDead(node)) return [];
      const expressionCandidate = (candidate: AliasCandidate): ts.Expression | undefined => (
        typeof candidate === 'string' || isDefaultAliasCandidate(candidate) || isProjectedAliasCandidate(candidate) ? undefined : candidate
      );
      const projectedCandidate = (candidate: AliasCandidate, key: string | number, at: ts.Node): AliasCandidate => {
        const initializer = expressionCandidate(candidate);
        if (initializer === undefined) return candidate === 'absent'
          ? 'absent'
          : candidate === 'tainted'
            ? 'tainted'
            : { kind: 'projection', source: candidate, key, at };
        const projected = projectBindingValue(initializer, key);
        return projected.invalid ? 'tainted' : projected.initializer ?? 'absent';
      };
      const bind = (target: ts.Expression, candidate: AliasCandidate): Array<{ name: ts.Identifier; initializer?: ts.Expression; candidate: AliasCandidate }> => {
        target = unwrap(target);
        if (ts.isIdentifier(target)) return [{ name: target, initializer: expressionCandidate(candidate), candidate }];
        if (ts.isBinaryExpression(target) && target.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
          return bind(target.left, { kind: 'default', source: candidate, fallback: target.right });
        }
        if (ts.isArrayLiteralExpression(target)) return target.elements.flatMap((element, index) => {
          if (ts.isOmittedExpression(element)) return [];
          const value: AliasCandidate = ts.isSpreadElement(element) ? 'tainted' : projectedCandidate(candidate, index, node);
          return bind(ts.isSpreadElement(element) ? element.expression : element as ts.Expression, value);
        });
        if (ts.isObjectLiteralExpression(target)) return target.properties.flatMap(property => {
          if (ts.isShorthandPropertyAssignment(property)) {
            const source = projectedCandidate(candidate, property.name.text, node);
            return bind(property.name, property.objectAssignmentInitializer === undefined
              ? source
              : { kind: 'default', source, fallback: property.objectAssignmentInitializer });
          }
          if (ts.isPropertyAssignment(property)) {
            const key = bindingPropertyName(property.name, assignmentPosition(node));
            return key === undefined
              ? assignmentTargetIdentifiers(property.initializer).map(name => ({ name, candidate: 'tainted' as const }))
              : bind(property.initializer, projectedCandidate(candidate, key, node));
          }
          return ts.isSpreadAssignment(property)
            ? assignmentTargetIdentifiers(property.expression).map(name => ({ name, candidate: 'tainted' as const }))
            : [];
        });
        return [];
      };
      const branch = assignmentBranch(node);
      if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
        const source: AliasCandidate = node.operatorToken.kind === ts.SyntaxKind.EqualsToken && branch !== 'invalid' ? node.right : 'tainted';
        return bind(node.left, source)
          .map(item => ({ ...item, branch: branch === 'invalid' ? undefined : branch, invalid: branch === 'invalid' }));
      }
      return assignedIdentifiers(node).map(name => ({ name, invalid: true }));
    };
    if (isLexicalFunction(scope)) {
      for (const parameter of scope.parameters) addBindingName(parameter.name, undefined, Number.NEGATIVE_INFINITY, true);
      if (scope.name !== undefined && ts.isIdentifier(scope.name)) add({ kind: 'declaration', name: scope.name, position: Number.NEGATIVE_INFINITY });
      const collectVarDeclarations = (node: ts.Node): void => {
        if (node !== scope && (isLexicalFunction(node) || ts.isClassLike(node))) return;
        if (ts.isVariableDeclaration(node) && !isBlockScopedVariable(node)) {
          addBindingName(node.name, undefined, Number.NEGATIVE_INFINITY);
        }
        ts.forEachChild(node, collectVarDeclarations);
      };
      ts.forEachChild(scope, collectVarDeclarations);
      if (ts.isArrowFunction(scope) && !ts.isBlock(scope.body)) {
        const collectConciseAssignments = (node: ts.Node): void => {
          if (isLexicalFunction(node) || ts.isClassLike(node)) return;
          for (const target of assignmentBindings(node)) {
            add({ kind: 'assignment', ...target, position: target.branch?.owner.end ?? assignmentPosition(node) });
          }
          ts.forEachChild(node, collectConciseAssignments);
        };
        collectConciseAssignments(scope.body);
      }
    } else if (ts.isCatchClause(scope) && scope.variableDeclaration !== undefined) {
      addBindingName(scope.variableDeclaration.name, undefined, Number.NEGATIVE_INFINITY);
    }
    const declarationsIn = (nestedScope: ts.Node): Set<string> => {
      const names = new Set<string>();
      if (isLexicalFunction(nestedScope)) {
        for (const parameter of nestedScope.parameters) collectBindingNames(parameter.name, names);
      } else if (ts.isCatchClause(nestedScope) && nestedScope.variableDeclaration !== undefined) {
        collectBindingNames(nestedScope.variableDeclaration.name, names);
      }
      const collect = (node: ts.Node): void => {
        if (node !== nestedScope && isLexicalScope(node)) {
          if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name !== undefined) names.add(node.name.text);
          return;
        }
        if (ts.isVariableDeclaration(node) && isBlockScopedVariable(node)) collectBindingNames(node.name, names);
        ts.forEachChild(node, collect);
      };
      if (!isLexicalFunction(nestedScope) && !ts.isClassLike(nestedScope)) ts.forEachChild(nestedScope, collect);
      return names;
    };
    const addNestedAssignments = (node: ts.Node): void => {
      const walk = (child: ts.Node, shadowed: ReadonlySet<string>): void => {
        if (isLexicalScope(child)) {
          if (isLexicalFunction(child) || ts.isClassLike(child)) return;
          for (const target of assignmentBindings(child)) {
            if (!shadowed.has(target.name.text)) add({ kind: 'assignment', ...target, position: target.branch?.owner.end ?? assignmentPosition(child) });
          }
          const nestedShadowed = new Set([...shadowed, ...declarationsIn(child)]);
          ts.forEachChild(child, descendant => walk(descendant, nestedShadowed));
          return;
        }
        for (const target of assignmentBindings(child)) {
          if (!shadowed.has(target.name.text)) add({ kind: 'assignment', ...target, position: target.branch?.owner.end ?? assignmentPosition(child) });
        }
        ts.forEachChild(child, descendant => walk(descendant, shadowed));
      };
      const shadowed = declarationsIn(node);
      ts.forEachChild(node, child => walk(child, shadowed));
    };
    const visit = (node: ts.Node): void => {
      if (node !== scope && isLexicalScope(node)) {
        if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name !== undefined) {
          add({ kind: 'declaration', name: node.name, position: Number.NEGATIVE_INFINITY });
        } else if (!isLexicalFunction(node) && !ts.isClassLike(node)) {
          for (const target of assignmentBindings(node)) add({ kind: 'assignment', ...target, position: target.branch?.owner.end ?? assignmentPosition(node) });
          addNestedAssignments(node);
        }
        return;
      }
      if (ts.isImportClause(node) && node.name?.text === 'jobConfig') {
        add({ kind: 'declaration', name: node.name, position: Number.NEGATIVE_INFINITY });
      } else if ((ts.isNamespaceImport(node) || ts.isImportSpecifier(node)) && node.name.text === 'jobConfig') {
        add({ kind: 'declaration', name: node.name, position: Number.NEGATIVE_INFINITY });
      } else if (ts.isVariableDeclaration(node) && (isBlockScopedVariable(node) || ts.isSourceFile(scope))) {
        const listOwner = ts.isVariableDeclarationList(node.parent) ? node.parent.parent : undefined;
        addBindingName(node.name, node.initializer, node.end, listOwner !== undefined && (ts.isForInStatement(listOwner) || ts.isForOfStatement(listOwner)));
      } else {
        for (const target of assignmentBindings(node)) add({ kind: 'assignment', ...target, position: target.branch?.owner.end ?? assignmentPosition(node) });
      }
      ts.forEachChild(node, visit);
    };
    if (!isLexicalFunction(scope) && !ts.isClassLike(scope)) ts.forEachChild(scope, visit);
    this.events.set(scope, result);
    return result;
  }
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
  return parts === undefined ? undefined : normalizePath(parts.join('.'), {});
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

function canonicalAccessPath(node: ts.Expression, bindings: LexicalBindings, seen = new Set<ts.Node>()): string | undefined {
  node = unwrap(node);
  if (ts.isIdentifier(node)) return bindings.path(node, seen);
  const parts = accessParts(node);
  if (parts === undefined) return undefined;
  let base: ts.Expression = node;
  while (ts.isPropertyAccessExpression(base) || ts.isElementAccessExpression(base)) base = unwrap(base.expression);
  if (ts.isIdentifier(base)) {
    const alias = bindings.path(base, seen);
    if (alias !== undefined) return normalizeTrainingBookPath([alias, ...parts.slice(1)].join('.'));
    const lookup = bindings.lookup(base);
    const row = directMapRowPath(base, bindings);
    if (row !== undefined) return normalizeTrainingBookPath([row, ...parts.slice(1)].join('.'));
    const directJobConfig = base.text === 'jobConfig'
      && lookup.found
      && bindings.isJobConfigPropParameter(base);
    if (!directJobConfig || parts[1] !== 'config') return undefined;
  }
  return normalizePath(parts.slice(1).join('.'), {});
}

function exactCallbackIdentifier(parameter: ts.ParameterDeclaration | undefined): ts.Identifier | undefined {
  return parameter !== undefined
    && parameter.dotDotDotToken === undefined
    && parameter.questionToken === undefined
    && parameter.initializer === undefined
    && ts.isIdentifier(parameter.name)
    ? parameter.name
    : undefined;
}

function directMapRowPath(identifier: ts.Identifier, bindings: LexicalBindings): string | undefined {
  const lookup = bindings.lookup(identifier);
  const declaration = lookup.found ? lookup.event?.name : undefined;
  if (declaration === undefined) return undefined;
  let current: ts.Node | undefined = identifier;
  while (current !== undefined) {
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) && exactCallbackIdentifier(current.parameters[0]) === declaration) {
      if (!ts.isCallExpression(current.parent) || !ts.isPropertyAccessExpression(current.parent.expression) || current.parent.expression.name.text !== 'map') return undefined;
      if (current.parent.arguments[0] !== current) return undefined;
      const receiver = canonicalAccessPath(current.parent.expression.expression, bindings);
      if (receiver === undefined || !['config.process[*].datasets', 'config.process[*].train.validation_config.validation_items', 'config.process[*].sample.samples'].includes(receiver)) return undefined;
      return `${receiver}[*]`;
    }
    current = current.parent;
  }
  return undefined;
}

function directMapBinding(identifier: ts.Identifier, bindings: LexicalBindings): { kind: 'index'; path: string } | { kind: 'values'; values: string[] } | undefined {
  const lookup = bindings.lookup(identifier);
  const declaration = lookup.found ? lookup.event?.name : undefined;
  if (declaration === undefined) return undefined;
  let current: ts.Node | undefined = identifier;
  let callback: ts.ArrowFunction | ts.FunctionExpression | undefined;
  let parameterIndex = -1;
  while (current !== undefined) {
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      const candidate = current.parameters.findIndex(parameter => exactCallbackIdentifier(parameter) === declaration);
      if (candidate >= 0) { callback = current; parameterIndex = candidate; break; }
    }
    current = current.parent;
  }
  if (callback === undefined) return undefined;
  if (parameterIndex < 0 || callback.parent === undefined || !ts.isCallExpression(callback.parent)) return undefined;
  const call = callback.parent;
  if (!ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'map' || call.arguments[0] !== callback) return undefined;
  const receiver = unwrap(call.expression.expression);
  if (parameterIndex === 1) {
    const path = canonicalAccessPath(receiver, bindings);
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

function finiteForInBinding(identifier: ts.Identifier, bindings: LexicalBindings): string[] | undefined {
  const lookup = bindings.lookup(identifier);
  const lookupDeclaration = lookup.found ? lookup.event?.name : undefined;
  if (lookupDeclaration === undefined) return undefined;
  let current: ts.Node | undefined = identifier;
  while (current !== undefined) {
    if (ts.isForInStatement(current)) {
      const initializer = current.initializer;
      const loopDeclaration = ts.isVariableDeclarationList(initializer) ? initializer.declarations[0] : undefined;
      if (loopDeclaration !== undefined && ts.isIdentifier(loopDeclaration.name) && loopDeclaration.name === lookupDeclaration) {
        const objectName = unwrap(current.expression);
        if (!ts.isIdentifier(objectName)) fail(current.expression, 'finite for-in template source must be an exact object binding');
        const initializer = bindings.declarationInitializer(objectName);
        const objectExpression = initializer === undefined ? undefined : unwrap(initializer);
        if (objectExpression === undefined) fail(objectName, `unresolved finite options object ${objectName.text}`);
        if (!ts.isObjectLiteralExpression(objectExpression)) fail(objectName, `unresolved finite options object ${objectName.text}`);
        return [...objectProperties(objectExpression).keys()].sort(compareCodePoint);
      }
    }
    current = current.parent;
  }
  return undefined;
}

function modalAdapterIndex(identifier: ts.Identifier, bindings: LexicalBindings): boolean {
  const lookup = bindings.lookup(identifier);
  const declaration = lookup.found ? lookup.event?.name : undefined;
  if (declaration === undefined) return false;
  let callback: ts.ArrowFunction | ts.FunctionExpression | undefined;
  let current: ts.Node | undefined = identifier;
  while (current !== undefined) {
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) && current.parameters.some(parameter => exactCallbackIdentifier(parameter) === declaration)) {
      callback = current;
      break;
    }
    current = current.parent;
  }
  if (callback === undefined || exactCallbackIdentifier(callback.parameters[0]) !== declaration) return false;
  if (!ts.isCallExpression(callback.parent) || callback.parent.arguments[1] !== callback || !ts.isIdentifier(callback.parent.expression) || callback.parent.expression.text !== 'openUpsamplePromptsModal') return false;
  const items = unwrap(callback.parent.arguments[0]);
  if (!ts.isIdentifier(items)) return false;
  const initializer = bindings.declarationInitializer(items);
  if (initializer === undefined) return false;
  let expression = unwrap(initializer);
  if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression) && expression.expression.name.text === 'filter') expression = unwrap(expression.expression.expression);
  if (!ts.isCallExpression(expression) || !ts.isPropertyAccessExpression(expression.expression) || expression.expression.name.text !== 'map') return false;
  const arrayPath = canonicalAccessPath(expression.expression.expression, bindings);
  if (arrayPath !== 'config.process[*].sample.samples') return false;
  const mapper = expression.arguments[0];
  if (!ts.isArrowFunction(mapper)) return false;
  const mapperIndex = exactCallbackIdentifier(mapper.parameters[1]);
  if (mapperIndex === undefined) return false;
  const body = unwrap(mapper.body as ts.Expression);
  if (!ts.isObjectLiteralExpression(body)) return false;
  const indexValue = objectProperties(body).get('index');
  const mappedIndex = indexValue === undefined ? undefined : unwrap(indexValue);
  return mappedIndex !== undefined && ts.isIdentifier(mappedIndex) && bindings.isBinding(mappedIndex, mapperIndex);
}

function enclosingOnChangeCallback(node: ts.Node): ts.ArrowFunction | ts.FunctionExpression | undefined {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if (
      ts.isJsxExpression(current)
      && current.expression !== undefined
      && ts.isJsxAttribute(current.parent)
      && ts.isIdentifier(current.parent.name)
      && current.parent.name.text === 'onChange'
    ) {
      const expression = unwrap(current.expression);
      return ts.isArrowFunction(expression) || ts.isFunctionExpression(expression) ? expression : undefined;
    }
    current = current.parent;
  }
  return undefined;
}

function requireComponentSetterBinding(identifier: ts.Identifier, bindings: LexicalBindings): ts.FunctionLikeDeclaration {
  const binding = bindings.componentPropBinding(identifier, 'setJobConfig');
  if (binding === undefined) fail(identifier, 'setting setter requires the exact component setJobConfig prop binding');
  return binding.owner;
}

function canonicalSetterPathsFromAst(source: ts.SourceFile, root: ts.Node, bindings: LexicalBindings): string[] {
  const paths = new Set<string>();
  const expandPath = (expression: ts.Expression): string[] => {
    expression = unwrap(expression);
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return [normalizePath(expression.text, {})];
    if (!ts.isTemplateExpression(expression)) fail(expression, 'setter path must be a literal or proven finite template');
    let values = [expression.head.text];
    const repeatableArrays = new Set<string>();
    for (const span of expression.templateSpans) {
      const interpolation = unwrap(span.expression);
      if (!ts.isIdentifier(interpolation)) fail(interpolation, 'setter path template interpolation must be a proven identifier');
      const binding = directMapBinding(interpolation, bindings);
      let replacements: string[];
      if (binding?.kind === 'index') {
        replacements = ['*'];
        repeatableArrays.add(binding.path);
      }
      else if (binding?.kind === 'values') replacements = binding.values;
      else if (finiteForInBinding(interpolation, bindings) !== undefined) replacements = finiteForInBinding(interpolation, bindings)!;
      else if (modalAdapterIndex(interpolation, bindings)) {
        replacements = ['*'];
        repeatableArrays.add('config.process[*].sample.samples');
      }
      else fail(interpolation, `unbound setter path template identifier ${interpolation.text}`);
      values = values.flatMap(prefix => replacements.map(replacement => `${prefix}${replacement}${span.literal.text}`));
    }
    return values.map(value => normalizePath(value, { repeatableArrays }));
  };
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (name === 'setJobConfig') {
        const setterPaths = node.arguments[1] === undefined ? [] : expandPath(node.arguments[1]);
        requireComponentSetterBinding(node.expression, bindings);
        for (const path of setterPaths) paths.add(path);
      } else if (name === 'setNestedValue') {
        fail(node.expression, 'setNestedValue setting setter provenance is unsupported');
      } else if (name === 'handleModelArchChange') {
        if (!bindings.isExactNamedImport(node.expression, 'handleModelArchChange', './utils')) {
          fail(node.expression, 'architecture mediator requires the exact named import from ./utils');
        }
        if (node.arguments.length !== 4) fail(node, 'architecture mediator requires four exact arguments');
        const currentPath = canonicalAccessPath(node.arguments[0], bindings);
        const [nextArchitecture, config, setter] = node.arguments.slice(1).map(unwrap);
        const configBinding = ts.isIdentifier(config) ? bindings.componentPropBinding(config, 'jobConfig') : undefined;
        const setterBinding = ts.isIdentifier(setter) ? bindings.componentPropBinding(setter, 'setJobConfig') : undefined;
        if (configBinding === undefined || setterBinding === undefined || configBinding.owner !== setterBinding.owner) {
          fail(node, 'architecture mediator jobConfig and setJobConfig must bind the same component owner');
        }
        const callback = enclosingOnChangeCallback(node);
        const valueDeclaration = callback === undefined ? undefined : exactCallbackIdentifier(callback.parameters[0]);
        if (
          !ts.isIdentifier(nextArchitecture)
          || valueDeclaration === undefined
          || !bindings.isBinding(nextArchitecture, valueDeclaration)
        ) fail(nextArchitecture, 'architecture mediator requires the exact onChange value binding');
        if (currentPath !== 'config.process[*].model.arch') fail(node.arguments[0], 'architecture mediator requires the exact model architecture read path');
        let readBase = unwrap(node.arguments[0]);
        while (ts.isPropertyAccessExpression(readBase) || ts.isElementAccessExpression(readBase)) readBase = unwrap(readBase.expression);
        const readBinding = ts.isIdentifier(readBase) ? bindings.componentPropBinding(readBase, 'jobConfig') : undefined;
        if (readBinding === undefined || readBinding.owner !== configBinding.owner) fail(node.arguments[0], 'architecture mediator read and arguments must bind the same component owner');
        paths.add(currentPath);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return [...paths].sort(compareCodePoint);
}

export function collectCanonicalSetterPathsFromSource(sourceText: string, sourceName = 'fixture.tsx'): string[] {
  const source = ts.createSourceFile(sourceName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return canonicalSetterPathsFromAst(source, source, new LexicalBindings(source));
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

function maximalConfigReadPaths(expression: ts.Expression | undefined, bindings: LexicalBindings): string[] {
  if (expression === undefined) return [];
  const direct = canonicalAccessPath(expression, bindings);
  if (direct !== undefined) return [direct];
  const paths: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isExpression(node) && unwrap(node) === node) {
      const parent = node.parent;
      const isNestedAccess = (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === node;
      const isAccessName = ts.isIdentifier(node) && ts.isPropertyAccessExpression(parent) && parent.name === node;
      if (!isNestedAccess && !isAccessName) {
        const path = canonicalAccessPath(node, bindings);
        if (path !== undefined) paths.push(path);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(expression);
  return [...new Set(paths)];
}

function semanticPrimaryReadPaths(expression: ts.Expression | undefined, bindings: LexicalBindings): string[] {
  if (expression === undefined) return [];
  expression = unwrap(expression);
  const direct = canonicalAccessPath(expression, bindings);
  if (direct !== undefined) return [direct];
  if (ts.isConditionalExpression(expression)) {
    return [...new Set([
      ...semanticPrimaryReadPaths(expression.whenTrue, bindings),
      ...semanticPrimaryReadPaths(expression.whenFalse, bindings),
    ])];
  }
  if (ts.isBinaryExpression(expression) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(expression.operatorToken.kind)) {
    const left = semanticPrimaryReadPaths(expression.left, bindings);
    return left.length > 0 ? left : semanticPrimaryReadPaths(expression.right, bindings);
  }
  if (ts.isCallExpression(expression)) {
    if (ts.isPropertyAccessExpression(expression.expression)) {
      const receiver = semanticPrimaryReadPaths(expression.expression.expression, bindings);
      if (receiver.length > 0) return receiver;
    }
    const argumentPaths = expression.arguments.flatMap(argument => semanticPrimaryReadPaths(argument, bindings));
    if (argumentPaths.length > 0) return [...new Set(argumentPaths)];
  }
  if (ts.isTemplateExpression(expression)) {
    return [...new Set(expression.templateSpans.flatMap(span => semanticPrimaryReadPaths(span.expression, bindings)))];
  }
  return maximalConfigReadPaths(expression, bindings);
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
  const bindings = new LexicalBindings(source);
  const claims = new Map<string, UiSourceClaim>();
  const visit = (node: ts.Node): void => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName)) {
      const component = node.tagName.text;
      const kind = visibleControlKinds[component];
      if (kind !== undefined) {
        const onChange = jsxAttributeExpression(jsxAttributeNode(node, 'onChange'));
        const setterPaths = onChange === undefined ? [] : canonicalSetterPathsFromAst(source, onChange, bindings);
        const boundExpression = jsxAttributeExpression(jsxAttributeNode(node, component === 'Checkbox' ? 'checked' : 'value'));
        const readPaths = semanticPrimaryReadPaths(boundExpression, bindings);
        if (readPaths.length > 0 && onChange === undefined) fail(node, 'editable visible control bound to config requires onChange');
        const matchingReads = readPaths.filter(path => setterPaths.includes(path));
        if (readPaths.length === 1 && !setterPaths.includes(readPaths[0])) fail(onChange ?? node, 'visible control primary bound read path requires an exact onChange setter');
        if (matchingReads.length > 1 || (matchingReads.length === 0 && readPaths.length > 1)) fail(boundExpression, 'visible control primary bound path is ambiguous');
        let path = matchingReads[0] ?? (readPaths.length === 1 ? readPaths[0] : undefined);
        if (path === undefined && setterPaths.length > 0) {
          const longest = [...setterPaths].sort((left, right) => right.split('.').length - left.split('.').length || compareCodePoint(left, right));
          if (longest.length === 1 || longest[0].split('.').length > longest[1].split('.').length) path = longest[0];
        }
        // Controls with neither a bound config value nor a direct config setter are
        // server/transient/adaptor surfaces and are classified by their own slices.
        if (path !== undefined) {
          if (onChange === undefined) fail(node, 'editable visible control bound to config requires onChange');
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
              if (existing !== undefined) fail(node, `duplicate visible control ${claim.symbol}`);
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

function jsxFact(node: ts.Expression | undefined, repo: AstRepository, context?: { docsTitlePath: string }): StaticJsxFact {
  if (node === undefined) return { present: false };
  node = unwrap(node);
  const text_literals: string[] = [];
  const code_literals: string[] = [];
  const link_hrefs: string[] = [];
  const normalizeJsxText = (text: string): string => {
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    let lastNonEmptyLine = -1;
    for (let index = 0; index < lines.length; index += 1) if (lines[index].replace(/\t/g, ' ').trim() !== '') lastNonEmptyLine = index;
    let normalized = '';
    for (let index = 0; index < lines.length; index += 1) {
      let line = lines[index].replace(/\t/g, ' ');
      if (index !== 0) line = line.trimStart();
      if (index !== lines.length - 1) line = line.trimEnd();
      if (line === '') continue;
      normalized += line;
      if (index !== lastNonEmptyLine) normalized += ' ';
    }
    return normalized;
  };
  const validateStaticAttributes = (element: ts.JsxOpeningLikeElement): void => {
    for (const property of element.attributes.properties) {
      if (!ts.isJsxAttribute(property)) fail(property, 'dynamic JSX attribute spread is unsupported');
      if (property.initializer === undefined || ts.isStringLiteral(property.initializer)) continue;
      if (!ts.isJsxExpression(property.initializer) || property.initializer.expression === undefined) fail(property, 'unsupported static JSX attribute');
      const expression = unwrap(property.initializer.expression);
      if (!ts.isStringLiteral(expression) && !ts.isNoSubstitutionTemplateLiteral(expression) && !ts.isNumericLiteral(expression) && expression.kind !== ts.SyntaxKind.TrueKeyword && expression.kind !== ts.SyntaxKind.FalseKeyword) {
        fail(property, 'dynamic JSX attribute is unsupported');
      }
    }
  };
  const staticJsxTag = (element: ts.JsxOpeningLikeElement): string => {
    if (!ts.isIdentifier(element.tagName)) fail(element.tagName, 'member or dynamic JSX tags are unsupported');
    const tag = element.tagName.text;
    if (tag === 'IoFlaskSharp') {
      if (context?.docsTitlePath !== 'model.layer_offloading' || !ts.isJsxSelfClosingElement(element)) fail(element, 'IoFlaskSharp docs-title projection is allowed only for the exact layer-offloading icon');
      const attributes = element.attributes.properties;
      if (attributes.length !== 2 || attributes.some(property => !ts.isJsxAttribute(property))) fail(element, 'IoFlaskSharp docs-title projection requires exactly className and name');
      const values = new Map<string, string>();
      for (const property of attributes) {
        if (!ts.isJsxAttribute(property) || !ts.isIdentifier(property.name)) fail(property, 'IoFlaskSharp docs-title projection requires exact static attributes');
        const initializer = property.initializer;
        if (initializer === undefined || !ts.isStringLiteral(initializer)) fail(property, 'IoFlaskSharp docs-title projection requires exact static attributes');
        values.set(property.name.text, initializer.text);
      }
      if (values.size !== 2 || values.get('className') !== 'inline text-yellow-500' || values.get('name') !== 'Experimental') fail(element, 'IoFlaskSharp docs-title projection attributes changed');
      return tag;
    }
    if (tag !== 'Link' && !/^[a-z][a-z0-9-]*$/.test(tag)) fail(element.tagName, `unprojected JSX component ${tag}`);
    return tag;
  };
  const walk = (child: ts.Node, insideCode = false): void => {
    if (ts.isJsxText(child)) {
      const normalized = normalizeJsxText(child.text);
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
      validateStaticAttributes(child.openingElement);
      const tag = staticJsxTag(child.openingElement);
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
      validateStaticAttributes(child);
      const tag = staticJsxTag(child);
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

function requireExactCallbackSignature(callback: BlockFunction, label: 'getValue' | 'onChange', expected: readonly string[]): void {
  if (callback.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) || callback.asteriskToken !== undefined) {
    fail(callback, `custom option requires a synchronous non-generator ${label} callback`);
  }
  if (
    callback.parameters.length !== expected.length
    || callback.parameters.some((parameter, index) =>
      !ts.isIdentifier(parameter.name)
      || parameter.name.text !== expected[index]
      || parameter.dotDotDotToken !== undefined
      || parameter.initializer !== undefined
      || parameter.questionToken !== undefined)
  ) fail(callback, `exact ${label} callback signature is (${expected.join(', ')})`);
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
  let reachedBehavior = false;
  for (const statement of callback.body.statements) {
    if (!ts.isVariableStatement(statement)) {
      reachedBehavior = true;
      continue;
    }
    if (reachedBehavior) fail(statement, 'custom option callback aliases must precede the complete callback body');
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
  requireExactCallbackSignature(callback, 'getValue', ['config']);
  const aliases = callbackAliases(callback);
  const result: CustomModelSelectOptionFact['get_value_cases'] = [];
  const behaviorStatements = callback.body.statements.filter(statement => !ts.isVariableStatement(statement));
  for (const [index, statement] of behaviorStatements.entries()) {
    if (ts.isIfStatement(statement)) {
      if (ts.isBlock(statement.thenStatement) && statement.thenStatement.statements.length !== 1) fail(statement.thenStatement, 'getValue if branch must contain exactly one return');
      const thenStatement = ts.isBlock(statement.thenStatement) ? statement.thenStatement.statements[0] : statement.thenStatement;
      if (thenStatement === undefined || !ts.isReturnStatement(thenStatement) || thenStatement.expression === undefined) fail(statement, 'getValue if branch must contain exactly one return');
      result.push({ condition: parsePredicate(statement.expression, aliases.paths, aliases.predicates), return_value: repo.value(thenStatement.expression) });
      if (statement.elseStatement !== undefined) fail(statement.elseStatement, 'getValue else branches are unsupported; use ordered returns');
      continue;
    }
    if (ts.isReturnStatement(statement) && statement.expression !== undefined) {
      if (index !== behaviorStatements.length - 1) fail(statement, 'getValue final unconditional return must be the last statement');
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
  requireExactCallbackSignature(callback, 'onChange', ['value', 'config', 'setJobConfig']);
  const valueParameter = (callback.parameters[0].name as ts.Identifier).text;
  const setter = (callback.parameters[2].name as ts.Identifier).text;
  const aliases = callbackAliases(callback);
  const result: CustomModelSelectOptionFact['writes'] = [];
  const walkStatements = (statements: readonly ts.Statement[], selected: string, guard: ModelOptionPredicateFact): void => {
    for (const statement of statements) {
      if (ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression) && ts.isIdentifier(statement.expression.expression) && statement.expression.expression.text === setter) {
        if (statement.expression.arguments.length !== 2 || !ts.isStringLiteral(statement.expression.arguments[1])) fail(statement, 'setter call requires literal value and path arguments');
        result.push({ selected_value: selected, path: normalizePath(statement.expression.arguments[1].text, {}), value: repo.value(statement.expression.arguments[0]), guard });
      } else if (ts.isIfStatement(statement)) {
        const nestedGuard = parsePredicate(statement.expression, aliases.paths, aliases.predicates);
        const combined = guard.kind === 'always' ? nestedGuard : combinePredicates('and', [guard, nestedGuard]);
        const nestedStatements = ts.isBlock(statement.thenStatement) ? statement.thenStatement.statements : [statement.thenStatement];
        walkStatements(nestedStatements, selected, combined);
        if (statement.elseStatement !== undefined) fail(statement.elseStatement, 'nested onChange else is unsupported');
      } else {
        fail(statement, 'unsupported onChange statement');
      }
    }
  };
  const behaviorStatements = callback.body.statements.filter((item: ts.Statement) => !ts.isVariableStatement(item));
  if (behaviorStatements.length !== 1) fail(callback.body, 'onChange callback must contain exactly one complete if/else-if branch chain');
  let statement: ts.Statement | undefined = behaviorStatements[0];
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

function architectureComparatorDirection(comparator: ts.Expression): 1 | -1 {
  comparator = unwrap(comparator);
  if (!ts.isArrowFunction(comparator) || comparator.parameters.length !== 2 || !ts.isBlock(comparator.body)) {
    fail(comparator, 'modelArchs sort must use the known finite label comparator');
  }
  if (!comparator.parameters.every(parameter => ts.isIdentifier(parameter.name) && parameter.initializer === undefined && parameter.dotDotDotToken === undefined)) {
    fail(comparator, 'modelArchs sort comparator parameters must be exact identifiers');
  }
  if (comparator.body.statements.length !== 1 || !ts.isReturnStatement(comparator.body.statements[0]) || comparator.body.statements[0].expression === undefined) {
    fail(comparator.body, 'modelArchs sort comparator must contain exactly one return');
  }
  const expression = unwrap(comparator.body.statements[0].expression);
  if (!ts.isCallExpression(expression) || !ts.isPropertyAccessExpression(expression.expression) || expression.expression.name.text !== 'localeCompare' || expression.arguments.length !== 3) {
    fail(expression, 'modelArchs sort must compare exact architecture labels');
  }
  const receiver = unwrap(expression.expression.expression);
  const argument = unwrap(expression.arguments[0]);
  const undefinedArgument = unwrap(expression.arguments[1]);
  const optionsArgument = unwrap(expression.arguments[2]);
  if (
    !ts.isPropertyAccessExpression(receiver) || receiver.name.text !== 'label' || !ts.isIdentifier(receiver.expression)
    || !ts.isPropertyAccessExpression(argument) || argument.name.text !== 'label' || !ts.isIdentifier(argument.expression)
    || !ts.isIdentifier(undefinedArgument) || undefinedArgument.text !== 'undefined'
    || !ts.isObjectLiteralExpression(optionsArgument)
  ) fail(expression, 'modelArchs sort must compare exact architecture labels');
  const options = objectProperties(optionsArgument);
  const sensitivity = options.get('sensitivity') === undefined ? undefined : unwrap(options.get('sensitivity')!);
  if (options.size !== 1 || sensitivity === undefined || !ts.isStringLiteral(sensitivity) || sensitivity.text !== 'base') {
    fail(optionsArgument, 'modelArchs sort must use base label sensitivity');
  }
  const [leftParameter, rightParameter] = comparator.parameters.map(parameter => (parameter.name as ts.Identifier).text);
  if (receiver.expression.text === leftParameter && argument.expression.text === rightParameter) return 1;
  if (receiver.expression.text === rightParameter && argument.expression.text === leftParameter) return -1;
  fail(expression, 'modelArchs sort must compare its exact parameters');
}

function architectureFacts(repo: AstRepository): ModelArchitectureFact[] {
  let expression = unwrap(repo.expression('modelArchs'));
  let comparatorDirection: 1 | -1 | undefined;
  if (
    ts.isCallExpression(expression)
    && ts.isPropertyAccessExpression(expression.expression)
    && expression.expression.name.text === 'sort'
    && expression.arguments.length === 1
  ) {
    comparatorDirection = architectureComparatorDirection(expression.arguments[0]);
    expression = unwrap(expression.expression.expression);
  }
  if (!ts.isArrayLiteralExpression(expression)) fail(expression, 'modelArchs must be an array literal');
  const allowedFields = new Set(['name', 'label', 'group', 'controls', 'isVideoModel', 'hasMultiLinePrompts', 'defaults', 'disableSections', 'additionalSections', 'accuracyRecoveryAdapters', 'sampleTags', 'gateUrl', 'modelNotes', 'customModelSelectOptions']);
  const facts = expression.elements.map(element => {
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
        const declarationPath = normalizeArchitecturePath(rawPath);
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
  if (comparatorDirection !== undefined) {
    facts.sort((left, right) => comparatorDirection * left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }));
  }
  return facts;
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
        const jsx = jsxFact(resolved, repo, { docsTitlePath: rawPath });
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
  const bindings = new LexicalBindings(source);
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
  const trainPath = train === undefined ? undefined : canonicalAccessPath(train, bindings);
  if (trainPath !== 'config.process[*].train') fail(train ?? occurrence, 'InvertedMaskPriorControl train prop must bind exact training config');
  const setTrain = jsxAttributeExpression(jsxAttributeNode(occurrence, 'setTrain'));
  const writes = setTrain === undefined ? [] : canonicalSetterPathsFromAst(source, setTrain, bindings);
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
  const bindings = new LexicalBindings(source);
  const tagComponents = new Set<string>();
  let customOptions = 0;
  const visit = (node: ts.Node): void => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName)) {
      const label = jsxAttributeNode(node, 'label');
      const dynamicLabel = label === undefined ? undefined : normalizedDynamicLabel(label);
      if (dynamicLabel === '<dynamic-label:tag.title>') {
        if (!['TextInput', 'TextAreaInput', 'NumberInput'].includes(node.tagName.text)) fail(node, 'sample tag control component is unsupported');
        const onChange = jsxAttributeExpression(jsxAttributeNode(node, 'onChange'));
        const writes = onChange === undefined ? [] : canonicalSetterPathsFromAst(source, onChange, bindings);
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

function lexicalFactSymbol(node: ts.Node): string {
  const frames: string[] = [];
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if ((ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current)) && current.name !== undefined) {
      frames.push(current.name.getText(current.getSourceFile()));
    }
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      const parent = current.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) frames.push(parent.name.text);
      else if (ts.isPropertyAssignment(parent)) frames.push(propertyName(parent.name));
      else if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const left = unwrap(parent.left);
        if (ts.isPropertyAccessExpression(left)) frames.push(left.name.text);
      }
    }
    current = current.parent;
  }
  return frames.length === 0 ? '<module>' : frames.reverse().join('::');
}

function interceptorFactSymbol(node: ts.Node): string | undefined {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      const parent = current.parent;
      if (ts.isCallExpression(parent)) {
        const parts = accessParts(parent.expression);
        if (
          parts !== undefined
          && parts.length === 4
          && parts[0] === 'apiClient'
          && parts[1] === 'interceptors'
          && (parts[2] === 'request' || parts[2] === 'response')
          && parts[3] === 'use'
        ) return `apiClient.${parts[2]}`;
      }
    }
    current = current.parent;
  }
  return undefined;
}

function enclosingHookName(node: ts.Node): string | undefined {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) && ts.isCallExpression(current.parent)) {
      const call = current.parent;
      if (ts.isIdentifier(call.expression) && ['useEffect', 'useLayoutEffect'].includes(call.expression.text)) return 'mount';
    }
    current = current.parent;
  }
  return undefined;
}

function factSymbol(node: ts.Node, sourcePath: string): string {
  const interceptor = interceptorFactSymbol(node);
  if (interceptor !== undefined) return interceptor;
  const lexical = lexicalFactSymbol(node);
  const hook = enclosingHookName(node);
  if (hook !== undefined && sourcePath === 'ui/src/components/AuthWrapper.tsx' && lexical === 'AuthWrapper') return `${lexical}::${hook}`;
  if (sourcePath === 'ui/src/app/api/settings/route.ts' && (lexical === 'GET' || lexical === 'POST')) return `Settings.${lexical}`;
  return lexical;
}

type AbruptKind = 'return' | 'throw' | 'break' | 'continue';
type AbruptAnalysis = { definite: boolean; kinds: Set<AbruptKind> };
type StaticDeadAnalysisCache = {
  dead: WeakMap<ts.Node, boolean>;
  nonThrowingExpressions: WeakMap<ts.Expression, boolean>;
  throwingNodes: WeakMap<ts.Node, boolean>;
  abruptStatements: WeakMap<ts.Statement, AbruptAnalysis | null>;
};
const unboundStaticDeadCacheKey = {};
const staticDeadAnalysisCaches = new WeakMap<object, StaticDeadAnalysisCache>();

function isStaticallyDead(node: ts.Node, bindings?: LexicalBindings): boolean {
  const cacheKey = bindings ?? unboundStaticDeadCacheKey;
  let cache = staticDeadAnalysisCaches.get(cacheKey);
  if (cache === undefined) {
    cache = {
      dead: new WeakMap(),
      nonThrowingExpressions: new WeakMap(),
      throwingNodes: new WeakMap(),
      abruptStatements: new WeakMap(),
    };
    staticDeadAnalysisCaches.set(cacheKey, cache);
  }
  const cachedDead = cache.dead.get(node);
  if (cachedDead !== undefined) return cachedDead;
  const staticTruth = (expression: ts.Expression): boolean | undefined => {
    if (bindings !== undefined) return staticTruthValue(expression, bindings);
    const value = unwrap(expression);
    if (value.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (value.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (ts.isNumericLiteral(value)) return Number(value.text) !== 0;
    if (ts.isBigIntLiteral(value)) return BigInt(value.text.slice(0, -1).replace(/_/gu, '')) !== 0n;
    if (ts.isRegularExpressionLiteral(value) || ts.isClassExpression(value)) return true;
    return undefined;
  };
  const staticNullish = (expression: ts.Expression): boolean | undefined => bindings === undefined
    ? undefined
    : staticNullishValue(expression, bindings);
  const expressionDefinitelyNonThrowing = (candidate: ts.Expression): boolean => {
    const expression = unwrap(candidate);
    const cached = cache.nonThrowingExpressions.get(expression);
    if (cached !== undefined) return cached;
    const compute = (): boolean => {
    if (
      ts.isStringLiteral(expression)
      || ts.isNoSubstitutionTemplateLiteral(expression)
      || ts.isNumericLiteral(expression)
      || ts.isBigIntLiteral(expression)
      || ts.isRegularExpressionLiteral(expression)
      || expression.kind === ts.SyntaxKind.TrueKeyword
      || expression.kind === ts.SyntaxKind.FalseKeyword
      || expression.kind === ts.SyntaxKind.NullKeyword
    ) return true;
    if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) return true;
    if (ts.isClassExpression(expression)) {
      return expression.heritageClauses === undefined
        && expression.members.every(member => (
          !ts.isClassStaticBlockDeclaration(member)
          && (member.name === undefined || !ts.isComputedPropertyName(member.name))
        ));
    }
    if (ts.isArrayLiteralExpression(expression)) {
      return expression.elements.every(element => (
        ts.isOmittedExpression(element)
        || (!ts.isSpreadElement(element) && expressionDefinitelyNonThrowing(element))
      ));
    }
    if (ts.isObjectLiteralExpression(expression)) {
      return expression.properties.every(property => {
        if (ts.isPropertyAssignment(property)) {
          return !ts.isComputedPropertyName(property.name)
            && expressionDefinitelyNonThrowing(property.initializer);
        }
        return (ts.isMethodDeclaration(property)
          || ts.isGetAccessorDeclaration(property)
          || ts.isSetAccessorDeclaration(property))
          && !ts.isComputedPropertyName(property.name);
      });
    }
    if (ts.isConditionalExpression(expression)) {
      if (!expressionDefinitelyNonThrowing(expression.condition)) return false;
      const truth = staticTruth(expression.condition);
      return truth === true
        ? expressionDefinitelyNonThrowing(expression.whenTrue)
        : truth === false
          ? expressionDefinitelyNonThrowing(expression.whenFalse)
          : expressionDefinitelyNonThrowing(expression.whenTrue) && expressionDefinitelyNonThrowing(expression.whenFalse);
    }
    if (ts.isBinaryExpression(expression)) {
      if (!expressionDefinitelyNonThrowing(expression.left)) return false;
      const truth = staticTruth(expression.left);
      if (expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && truth === false) return true;
      if (expression.operatorToken.kind === ts.SyntaxKind.BarBarToken && truth === true) return true;
      return false;
    }
    if (ts.isTypeOfExpression(expression)) {
      const operand = unwrap(expression.expression);
      return !ts.isIdentifier(operand) && expressionDefinitelyNonThrowing(operand);
    }
    if (ts.isVoidExpression(expression)) return expressionDefinitelyNonThrowing(expression.expression);
    if (ts.isPrefixUnaryExpression(expression)) {
      if (expression.operator === ts.SyntaxKind.ExclamationToken) return expressionDefinitelyNonThrowing(expression.operand);
      return [ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken].includes(expression.operator)
        && ts.isNumericLiteral(unwrap(expression.operand));
    }
    return false;
    };
    const result = compute();
    cache.nonThrowingExpressions.set(expression, result);
    return result;
  };
  const hasPotentiallyThrowingEvaluation = (node: ts.Node): boolean => {
    const cached = cache.throwingNodes.get(node);
    if (cached !== undefined) return cached;
    const compute = (): boolean => {
    if (ts.isExpression(node)) return !expressionDefinitelyNonThrowing(node);
    if (ts.isExpressionStatement(node)) return !expressionDefinitelyNonThrowing(node.expression);
    if (ts.isVariableStatement(node)) {
      // AwaitUsing includes the Using bit. Both forms execute acquisition and
      // disposal protocol hooks even when their initializer syntax is literal.
      if ((node.declarationList.flags & ts.NodeFlags.Using) !== 0) return true;
      return node.declarationList.declarations.some(declaration => (
        !ts.isIdentifier(declaration.name)
        || (declaration.initializer !== undefined && !expressionDefinitelyNonThrowing(declaration.initializer))
      ));
    }
    if (ts.isBlock(node)) return node.statements.some(hasPotentiallyThrowingEvaluation);
    if (ts.isIfStatement(node)) {
      if (!expressionDefinitelyNonThrowing(node.expression)) return true;
      const truth = staticTruth(node.expression);
      return (truth !== false && hasPotentiallyThrowingEvaluation(node.thenStatement))
        || (truth !== true && node.elseStatement !== undefined && hasPotentiallyThrowingEvaluation(node.elseStatement));
    }
    if (
      ts.isEmptyStatement(node)
      || ts.isFunctionDeclaration(node)
      || ts.isInterfaceDeclaration(node)
      || ts.isTypeAliasDeclaration(node)
      || ts.isImportDeclaration(node)
      || ts.isBreakStatement(node)
      || ts.isContinueStatement(node)
    ) return false;
    return true;
    };
    const result = compute();
    cache.throwingNodes.set(node, result);
    return result;
  };
  const abruptAnalysis = (statement: ts.Statement): AbruptAnalysis | undefined => {
    const cached = cache.abruptStatements.get(statement);
    if (cached !== undefined) return cached ?? undefined;
    const compute = (): AbruptAnalysis | undefined => {
    if (ts.isReturnStatement(statement)) return {
      definite: true,
      kinds: new Set(statement.expression !== undefined && hasPotentiallyThrowingEvaluation(statement.expression) ? ['return', 'throw'] : ['return']),
    };
    if (ts.isThrowStatement(statement)) return { definite: true, kinds: new Set(['throw']) };
    if (ts.isBreakStatement(statement)) return { definite: true, kinds: new Set(['break']) };
    if (ts.isContinueStatement(statement)) return { definite: true, kinds: new Set(['continue']) };
    if (ts.isBlock(statement)) {
      const kinds = new Set<AbruptKind>();
      for (const child of statement.statements) {
        const abrupt = abruptAnalysis(child);
        if (abrupt === undefined) continue;
        for (const kind of abrupt.kinds) kinds.add(kind);
        if (abrupt.definite) return { definite: true, kinds };
      }
      return kinds.size === 0 ? undefined : { definite: false, kinds };
    }
    if (ts.isIfStatement(statement)) {
      const truth = staticTruth(statement.expression);
      if (truth === true) return abruptAnalysis(statement.thenStatement);
      if (truth === false) return statement.elseStatement === undefined ? undefined : abruptAnalysis(statement.elseStatement);
      const thenAbrupt = abruptAnalysis(statement.thenStatement);
      const elseAbrupt = statement.elseStatement === undefined ? undefined : abruptAnalysis(statement.elseStatement);
      const kinds = new Set<AbruptKind>();
      for (const kind of thenAbrupt?.kinds ?? []) kinds.add(kind);
      for (const kind of elseAbrupt?.kinds ?? []) kinds.add(kind);
      if (hasPotentiallyThrowingEvaluation(statement.expression)) kinds.add('throw');
      return kinds.size === 0
        ? undefined
        : { definite: thenAbrupt?.definite === true && elseAbrupt?.definite === true, kinds };
    }
    if (ts.isTryStatement(statement)) {
      const finallyAbrupt = statement.finallyBlock === undefined ? undefined : abruptAnalysis(statement.finallyBlock);
      if (finallyAbrupt?.definite === true) return finallyAbrupt;
      const tryAbrupt = abruptAnalysis(statement.tryBlock);
      const catchAbrupt = statement.catchClause === undefined ? undefined : abruptAnalysis(statement.catchClause.block);
      const kinds = new Set<AbruptKind>();
      for (const kind of finallyAbrupt?.kinds ?? []) kinds.add(kind);
      if (statement.catchClause === undefined) {
        for (const kind of tryAbrupt?.kinds ?? []) kinds.add(kind);
        return kinds.size === 0 ? undefined : { definite: tryAbrupt?.definite === true, kinds };
      }
      const tryCanThrow = tryAbrupt?.kinds.has('throw') === true;
      for (const kind of tryAbrupt?.kinds ?? []) if (kind !== 'throw') kinds.add(kind);
      if (tryCanThrow) for (const kind of catchAbrupt?.kinds ?? []) kinds.add(kind);
      const definite = tryAbrupt?.definite === true && (!tryCanThrow || catchAbrupt?.definite === true);
      return kinds.size === 0 && !definite ? undefined : { definite, kinds };
    }
    return hasPotentiallyThrowingEvaluation(statement) ? { definite: false, kinds: new Set(['throw']) } : undefined;
    };
    const result = compute();
    cache.abruptStatements.set(statement, result ?? null);
    return result;
  };
  const isDefinitelyAbrupt = (statement: ts.Statement): boolean => abruptAnalysis(statement)?.definite === true;
  const computeDead = (): boolean => {
    let current: ts.Node | undefined = node;
    while (current?.parent !== undefined) {
      const parent: ts.Node = current.parent;
      if (ts.isIfStatement(parent)) {
        const condition = staticTruth(parent.expression);
        if (condition === false && current === parent.thenStatement) return true;
        if (condition === true && current === parent.elseStatement) return true;
      }
      if (ts.isConditionalExpression(parent)) {
        const condition = staticTruth(parent.condition);
        if (condition === false && current === parent.whenTrue) return true;
        if (condition === true && current === parent.whenFalse) return true;
      }
      if (ts.isBinaryExpression(parent) && current === parent.right) {
        const left = staticTruth(parent.left);
        if (parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && left === false) return true;
        if (parent.operatorToken.kind === ts.SyntaxKind.BarBarToken && left === true) return true;
        if (parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken && staticNullish(parent.left) === false) return true;
      }
      if (ts.isWhileStatement(parent) && staticTruth(parent.expression) === false) return true;
      if (ts.isForStatement(parent) && parent.condition !== undefined && staticTruth(parent.condition) === false && current === parent.statement) return true;
      if (ts.isBlock(parent) && ts.isStatement(current)) {
        const index = parent.statements.indexOf(current);
        if (index > 0 && parent.statements.slice(0, index).some(isDefinitelyAbrupt)) return true;
      }
      if ((ts.isCaseClause(parent) || ts.isDefaultClause(parent)) && ts.isStatement(current)) {
        const index = parent.statements.indexOf(current);
        if (index > 0 && parent.statements.slice(0, index).some(isDefinitelyAbrupt)) return true;
      }
      current = parent;
    }
    return false;
  };
  const result = computeDead();
  cache.dead.set(node, result);
  return result;
}

function serverStateClaim(
  sourcePath: string,
  symbol: string,
  path: string,
  uiType: UiSourceClaim['value_contract']['ui_type'],
  acceptedValues?: TrainingBookValueFact[],
): UiSourceClaim {
  return {
    source_path: sourcePath,
    symbol,
    path,
    kind: 'server-state',
    ui_label: { present: false },
    value_contract: {
      ui_type: uiType,
      widget_kind: 'read-only',
      optional: true,
      nullable: true,
      ...(acceptedValues === undefined ? {} : { accepted_values: acceptedValues }),
    },
  };
}

function behaviorSettingClaim(
  sourcePath: string,
  symbol: string,
  path: string,
  uiType: UiSourceClaim['value_contract']['ui_type'],
  behavior: UiBehaviorContract,
  acceptedValues?: TrainingBookValueFact[],
): UiSourceClaim {
  return {
    source_path: sourcePath,
    symbol,
    path,
    kind: 'setting',
    ui_label: { present: false },
    value_contract: {
      ui_type: uiType,
      widget_kind: null,
      optional: true,
      nullable: true,
      ...(acceptedValues === undefined ? {} : { accepted_values: acceptedValues }),
    },
    behavior_contract: behavior,
  };
}

function exportedArrowFunction(source: ts.SourceFile, name: string): ts.ArrowFunction | undefined {
  const declarations: Array<{ statement: ts.VariableStatement; declaration: ts.VariableDeclaration }> = [];
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) declarations.push({ statement, declaration });
    }
  }
  if (declarations.length === 0) return undefined;
  if (declarations.length !== 1) fail(source, `${name} behavior requires one exact top-level declaration`);
  const [{ statement, declaration }] = declarations;
  const modifiers = ts.getModifiers(statement) ?? [];
  if (!modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) fail(statement, `${name} behavior requires an exported declaration`);
  if ((statement.declarationList.flags & ts.NodeFlags.Const) === 0) fail(statement, `${name} behavior requires a const declaration`);
  const initializer = declaration.initializer === undefined ? undefined : unwrap(declaration.initializer);
  if (initializer === undefined || !ts.isArrowFunction(initializer) || !ts.isBlock(initializer.body)) fail(declaration, `${name} behavior requires a block-bodied arrow function`);
  return initializer;
}

type ConfigMutation = {
  node: ts.Node;
  operation: 'write' | 'delete';
  path: string;
  syntax: 'assign' | 'delete' | 'compound' | 'update' | 'destructure' | 'api' | 'unmodeled-api';
  execution: 'known' | 'unmodeled-callback';
  substitutions: InvocationSubstitutions;
};

type InvocationValue = ts.Expression | 'tainted' | 'absent';
type InvocationSubstitutions = ReadonlyMap<ts.Node, InvocationValue>;
type ConditionalExecutionContext = {
  owner: ts.Node;
  arm: string;
  substitutions: InvocationSubstitutions;
};

function staticMember(
  expression: ts.Expression,
): { base: ts.Expression; key: string } | undefined {
  expression = unwrap(expression);
  if (ts.isPropertyAccessExpression(expression)) return { base: expression.expression, key: expression.name.text };
  if (ts.isElementAccessExpression(expression) && expression.argumentExpression !== undefined) {
    const key = unwrap(expression.argumentExpression);
    if (ts.isStringLiteral(key) || ts.isNumericLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key)) return { base: expression.expression, key: key.text };
  }
  return undefined;
}

type AliasOriginNode = ts.Expression | ts.MethodDeclaration;
type AliasProvenance =
  | { kind: 'exact'; origin: AliasOriginNode; lineage?: ReadonlySet<ts.Identifier> }
  | { kind: 'tainted' }
  | { kind: 'absent' };

const activeInvocationSummaries = new Set<ts.FunctionLikeDeclaration>();
const activeIdentityReachabilitySummaries = new Set<ts.FunctionLikeDeclaration>();

function sameAliasOrigin(left: AliasOriginNode, right: AliasOriginNode, bindings: LexicalBindings): boolean {
  if (left === right) return true;
  if (ts.isIdentifier(left) && ts.isIdentifier(right)) {
    const leftLookup = bindings.lookup(left);
    const rightLookup = bindings.lookup(right);
    return leftLookup.found || rightLookup.found
      ? bindings.sameBinding(left, right)
      : left.text === right.text;
  }
  if (ts.isMethodDeclaration(left) || ts.isMethodDeclaration(right)) return false;
  const leftMember = staticMember(left);
  const rightMember = staticMember(right);
  if (leftMember !== undefined && rightMember !== undefined) {
    return leftMember.key === rightMember.key && sameAliasOrigin(leftMember.base, rightMember.base, bindings);
  }
  if ((ts.isStringLiteral(left) || ts.isNoSubstitutionTemplateLiteral(left)) && (ts.isStringLiteral(right) || ts.isNoSubstitutionTemplateLiteral(right))) return left.text === right.text;
  if (ts.isNumericLiteral(left) && ts.isNumericLiteral(right)) return Number(left.text) === Number(right.text);
  return left.kind === right.kind && [ts.SyntaxKind.NullKeyword, ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(left.kind);
}

function joinAliasProvenance(values: readonly AliasProvenance[], bindings: LexicalBindings): AliasProvenance {
  if (values.length === 0 || values.some(value => value.kind === 'tainted')) return { kind: 'tainted' };
  if (values.every(value => value.kind === 'absent')) return { kind: 'absent' };
  if (values.some(value => value.kind === 'absent')) return { kind: 'tainted' };
  const exact = values as Array<{ kind: 'exact'; origin: AliasOriginNode; lineage?: ReadonlySet<ts.Identifier> }>;
  if (!exact.every(value => sameAliasOrigin(value.origin, exact[0].origin, bindings))) return { kind: 'tainted' };
  const lineage = new Set(exact[0].lineage ?? []);
  for (const value of exact.slice(1)) {
    for (const declaration of lineage) if (!value.lineage?.has(declaration)) lineage.delete(declaration);
  }
  return lineage.size === 0 ? { kind: 'exact', origin: exact[0].origin } : { kind: 'exact', origin: exact[0].origin, lineage };
}

function definitelyUndefinedOrigin(origin: AliasOriginNode, bindings: LexicalBindings): boolean {
  if (ts.isMethodDeclaration(origin)) return false;
  origin = unwrap(origin);
  return (ts.isIdentifier(origin) && origin.text === 'undefined' && !bindings.lookup(origin).found)
    || ts.isVoidExpression(origin);
}

function definitelyPresentOrigin(origin: AliasOriginNode, bindings: LexicalBindings): boolean {
  if (ts.isMethodDeclaration(origin)) return true;
  origin = unwrap(origin);
  if (definitelyUndefinedOrigin(origin, bindings)) return false;
  return origin.kind === ts.SyntaxKind.NullKeyword
    || origin.kind === ts.SyntaxKind.TrueKeyword
    || origin.kind === ts.SyntaxKind.FalseKeyword
    || ts.isNumericLiteral(origin)
    || ts.isStringLiteral(origin)
    || ts.isNoSubstitutionTemplateLiteral(origin)
    || ts.isArrayLiteralExpression(origin)
    || ts.isObjectLiteralExpression(origin)
    || ts.isFunctionExpression(origin)
    || ts.isArrowFunction(origin);
}

function resolveObjectLiteralProperty(
  object: ts.ObjectLiteralExpression,
  key: string,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  seen: Set<ts.Identifier>,
  objectSeen = new Set<ts.ObjectLiteralExpression>(),
): AliasProvenance {
  if (objectSeen.has(object)) return { kind: 'tainted' };
  const nextObjectSeen = new Set(objectSeen).add(object);
  const resolvedKey = (name: ts.PropertyName): string | undefined => {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
    if (!ts.isComputedPropertyName(name)) return undefined;
    const provenance = resolveAliasProvenance(name.expression, bindings, substitutions, seen);
    if (provenance.kind !== 'exact' || ts.isMethodDeclaration(provenance.origin)) return undefined;
    const origin = unwrap(provenance.origin);
    return ts.isStringLiteral(origin) || ts.isNumericLiteral(origin) || ts.isNoSubstitutionTemplateLiteral(origin)
      ? origin.text
      : undefined;
  };
  for (let index = object.properties.length - 1; index >= 0; index -= 1) {
    const property = object.properties[index];
    if (ts.isSpreadAssignment(property)) {
      const timelineCandidates = bindings.memberProvenanceCandidates(property.expression, key, property);
      if (timelineCandidates !== undefined) {
        return joinAliasProvenance(
          timelineCandidates.map(candidate => resolveAliasCandidate(candidate, bindings, substitutions, seen)),
          bindings,
        );
      }
      const provenance = resolveAliasProvenance(property.expression, bindings, substitutions, seen);
      if (provenance.kind === 'tainted') return provenance;
      if (provenance.kind === 'absent' || ts.isMethodDeclaration(provenance.origin)) continue;
      const origin = unwrap(provenance.origin);
      if (ts.isObjectLiteralExpression(origin)) {
        const projected = resolveObjectLiteralProperty(origin, key, bindings, substitutions, seen, nextObjectSeen);
        if (projected.kind !== 'absent') return projected;
        continue;
      }
      if (ts.isArrayLiteralExpression(origin)) {
        if (!/^\d+$/.test(key)) continue;
        const element = origin.elements[Number(key)];
        if (element === undefined || ts.isOmittedExpression(element)) continue;
        if (ts.isSpreadElement(element)) return { kind: 'tainted' };
        return resolveAliasProvenance(element, bindings, substitutions, seen);
      }
      if (
        origin.kind === ts.SyntaxKind.NullKeyword
        || origin.kind === ts.SyntaxKind.TrueKeyword
        || origin.kind === ts.SyntaxKind.FalseKeyword
        || ts.isNumericLiteral(origin)
        || definitelyUndefinedOrigin(origin, bindings)
      ) continue;
      if (ts.isIdentifier(origin) && bindings.lookup(origin).found) {
        return resolveAliasProvenance(bindings.stableMemberProjection(origin, key), bindings, substitutions, seen);
      }
      return { kind: 'tainted' };
    }
    const name = resolvedKey(property.name);
    if (name === undefined) return { kind: 'tainted' };
    if (name !== key) continue;
    if (ts.isShorthandPropertyAssignment(property)) {
      return resolveAliasProvenance(property.name, bindings, substitutions, seen);
    }
    if (ts.isPropertyAssignment(property)) {
      return resolveAliasProvenance(property.initializer, bindings, substitutions, seen);
    }
    if (ts.isMethodDeclaration(property)) return { kind: 'exact', origin: property };
    return { kind: 'tainted' };
  }
  return { kind: 'absent' };
}

function resolveAliasCandidate(
  candidate: AliasCandidate,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  seen: Set<ts.Identifier>,
): AliasProvenance {
  if (candidate === 'tainted' || candidate === 'ambiguous-identity') return { kind: 'tainted' };
  if (candidate === 'absent') return { kind: 'absent' };
  if (isProjectedAliasCandidate(candidate)) {
    const source = resolveAliasCandidate(candidate.source, bindings, substitutions, seen);
    if (source.kind !== 'exact') return source;
    if (ts.isMethodDeclaration(source.origin)) return { kind: 'tainted' };
    const origin = unwrap(source.origin);
    const projectionSeen = new Set([...seen, ...(source.lineage ?? [])]);
    const timelineCandidates = bindings.memberProvenanceCandidates(origin, String(candidate.key), candidate.at);
    if (timelineCandidates !== undefined) {
      return joinAliasProvenance(
        timelineCandidates.map(item => resolveAliasCandidate(item, bindings, substitutions, projectionSeen)),
        bindings,
      );
    }
    if (ts.isArrayLiteralExpression(origin) && typeof candidate.key === 'number') {
      const element = origin.elements[candidate.key];
      if (element === undefined || ts.isOmittedExpression(element)) return { kind: 'absent' };
      if (ts.isSpreadElement(element)) return { kind: 'tainted' };
      return resolveAliasProvenance(element, bindings, substitutions, projectionSeen);
    }
    if (ts.isObjectLiteralExpression(origin)) return resolveObjectLiteralProperty(
      origin,
      String(candidate.key),
      bindings,
      substitutions,
      projectionSeen,
    );
    return resolveAliasProvenance(bindings.stableMemberProjection(origin, candidate.key), bindings, substitutions, projectionSeen);
  }
  if (!isDefaultAliasCandidate(candidate)) return resolveAliasProvenance(candidate, bindings, substitutions, seen);
  const source = resolveAliasCandidate(candidate.source, bindings, substitutions, seen);
  if (source.kind === 'absent' || (source.kind === 'exact' && definitelyUndefinedOrigin(source.origin, bindings))) {
    return resolveAliasProvenance(candidate.fallback, bindings, substitutions, seen);
  }
  if (source.kind === 'exact' && definitelyPresentOrigin(source.origin, bindings)) return source;
  return joinAliasProvenance([
    source,
    resolveAliasProvenance(candidate.fallback, bindings, substitutions, seen),
  ], bindings);
}

type FiniteAggregateRelevance =
  | { kind: 'exact'; leaves: readonly ts.Expression[]; identities: readonly ts.Expression[] }
  | { kind: 'tainted'; leaves: readonly ts.Expression[]; identities: readonly ts.Expression[] };

function finiteAggregateRelevance(
  expression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions = new Map(),
  seen = new Set<ts.Identifier>(),
  aggregateSeen = new Set<ts.Node>(),
): FiniteAggregateRelevance | undefined {
  expression = unwrap(expression);
  const marker = ts.isIdentifier(expression) ? bindings.bindingDeclaration(expression) ?? expression : expression;
  if (aggregateSeen.has(marker)) return { kind: 'tainted', leaves: [], identities: [expression] };
  const nextAggregateSeen = new Set(aggregateSeen).add(marker);
  if (ts.isArrayLiteralExpression(expression)) {
    const leaves: ts.Expression[] = [];
    const identities: ts.Expression[] = [expression];
    let tainted = false;
    for (const element of expression.elements) {
      if (ts.isOmittedExpression(element)) continue;
      if (ts.isSpreadElement(element)) {
        const nested = finiteAggregateRelevance(element.expression, bindings, substitutions, seen, nextAggregateSeen);
        if (nested === undefined || nested.kind === 'tainted') tainted = true;
        if (nested !== undefined) {
          leaves.push(...nested.leaves);
          identities.push(...nested.identities);
        } else identities.push(element.expression);
        continue;
      }
      const nested = finiteAggregateRelevance(element, bindings, substitutions, seen, nextAggregateSeen);
      if (nested === undefined) leaves.push(element);
      else {
        if (nested.kind === 'tainted') tainted = true;
        leaves.push(...nested.leaves);
        identities.push(...nested.identities);
      }
    }
    return tainted ? { kind: 'tainted', leaves, identities } : { kind: 'exact', leaves, identities };
  }
  if (ts.isObjectLiteralExpression(expression)) {
    const leaves: ts.Expression[] = [];
    const identities: ts.Expression[] = [expression];
    let tainted = false;
    for (const property of expression.properties) {
      let value: ts.Expression | undefined;
      if (ts.isSpreadAssignment(property)) value = property.expression;
      else if (ts.isPropertyAssignment(property)) value = property.initializer;
      else if (ts.isShorthandPropertyAssignment(property)) value = property.name;
      else {
        tainted = true;
        continue;
      }
      const nested = finiteAggregateRelevance(value, bindings, substitutions, seen, nextAggregateSeen);
      if (ts.isSpreadAssignment(property) && nested === undefined) {
        tainted = true;
        identities.push(value);
        continue;
      }
      if (nested === undefined) leaves.push(value);
      else {
        if (nested.kind === 'tainted') tainted = true;
        leaves.push(...nested.leaves);
        identities.push(...nested.identities);
      }
    }
    return tainted ? { kind: 'tainted', leaves, identities } : { kind: 'exact', leaves, identities };
  }
  const provenance = resolveAliasProvenance(expression, bindings, substitutions, seen);
  if (provenance.kind === 'tainted') return { kind: 'tainted', leaves: [], identities: [expression] };
  if (provenance.kind === 'absent' || ts.isMethodDeclaration(provenance.origin)) return undefined;
  const origin = unwrap(provenance.origin);
  if (origin === expression) return bindings.isStableMemberProjection(origin)
    ? { kind: 'tainted', leaves: [], identities: [expression] }
    : undefined;
  const nested = finiteAggregateRelevance(origin, bindings, substitutions, seen, nextAggregateSeen);
  const appended = ts.isIdentifier(expression)
    ? bindings.arrayAppendCandidates(expression, expression, substitutions)
    : undefined;
  if (nested === undefined && appended === undefined) return undefined;
  const leaves = [...(nested?.leaves ?? [])];
  const identities = [expression, ...(nested?.identities ?? [])];
  let tainted = nested?.kind === 'tainted' || appended?.tainted === true;
  for (const value of appended?.values ?? []) {
    const projected = finiteAggregateRelevance(value, bindings, substitutions, seen, nextAggregateSeen);
    if (projected === undefined) leaves.push(value);
    else {
      leaves.push(...projected.leaves);
      identities.push(...projected.identities);
      if (projected.kind === 'tainted') tainted = true;
    }
  }
  return tainted ? { kind: 'tainted', leaves, identities } : { kind: 'exact', leaves, identities };
}

function resolveAliasProvenance(
  expression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions = new Map(),
  seen = new Set<ts.Identifier>(),
): AliasProvenance {
  expression = unwrap(expression);
  if (expression.kind === ts.SyntaxKind.ThisKeyword && substitutions.has(expression)) {
    const substitution = substitutions.get(expression)!;
    return substitution === 'tainted'
      ? { kind: 'tainted' }
      : substitution === 'absent'
        ? { kind: 'absent' }
        : resolveAliasProvenance(substitution, bindings, substitutions, seen);
  }
  if (ts.isCallExpression(expression)) {
    return summarizeInvocationReturnProvenance(expression, bindings, substitutions) ?? { kind: 'exact', origin: expression };
  }
  if (ts.isConditionalExpression(expression)) {
    const truth = staticTruthValue(expression.condition, bindings);
    if (truth !== undefined) return resolveAliasProvenance(truth ? expression.whenTrue : expression.whenFalse, bindings, substitutions, seen);
    return joinAliasProvenance([
      resolveAliasProvenance(expression.whenTrue, bindings, substitutions, seen),
      resolveAliasProvenance(expression.whenFalse, bindings, substitutions, seen),
    ], bindings);
  }
  if (ts.isBinaryExpression(expression) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(expression.operatorToken.kind)) {
    const truth = staticTruthValue(expression.left, bindings);
    const nullish = staticNullishValue(expression.left, bindings);
    if (expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && truth !== undefined) return resolveAliasProvenance(truth ? expression.right : expression.left, bindings, substitutions, seen);
    if (expression.operatorToken.kind === ts.SyntaxKind.BarBarToken && truth !== undefined) return resolveAliasProvenance(truth ? expression.left : expression.right, bindings, substitutions, seen);
    if (expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken && nullish !== undefined) return resolveAliasProvenance(nullish ? expression.right : expression.left, bindings, substitutions, seen);
    const right = unwrap(expression.right);
    if (
      right.kind === ts.SyntaxKind.TrueKeyword
      || right.kind === ts.SyntaxKind.FalseKeyword
      || right.kind === ts.SyntaxKind.NullKeyword
      || ts.isNumericLiteral(right)
      || ts.isStringLiteral(right)
      || ts.isNoSubstitutionTemplateLiteral(right)
      || ts.isObjectLiteralExpression(right)
    ) return { kind: 'exact', origin: expression };
    return joinAliasProvenance([
      resolveAliasProvenance(expression.left, bindings, substitutions, seen),
      resolveAliasProvenance(expression.right, bindings, substitutions, seen),
    ], bindings);
  }
  if (ts.isIdentifier(expression)) {
    const declaration = bindings.bindingDeclaration(expression);
    if (declaration !== undefined && substitutions.has(declaration)) {
      if (seen.has(declaration)) return { kind: 'tainted' };
      const substitution = substitutions.get(declaration)!;
      return substitution === 'tainted'
        ? { kind: 'tainted' }
        : substitution === 'absent'
          ? { kind: 'absent' }
          : resolveAliasProvenance(substitution, bindings, substitutions, new Set(seen).add(declaration));
    }
    const lookup = bindings.provenanceCandidates(expression);
    if (!lookup.found) return { kind: 'exact', origin: expression };
    if (declaration !== undefined && seen.has(declaration)) return { kind: 'tainted' };
    const nextSeen = declaration === undefined ? seen : new Set(seen).add(declaration);
    const resolved = joinAliasProvenance(lookup.candidates.map(candidate => candidate === declaration
      ? { kind: 'exact' as const, origin: candidate }
      : resolveAliasCandidate(candidate, bindings, substitutions, nextSeen)), bindings);
    if (resolved.kind !== 'exact' || declaration === undefined) return resolved;
    return { ...resolved, lineage: new Set([...(resolved.lineage ?? []), declaration]) };
  }
  const computedKey = ts.isElementAccessExpression(expression) && expression.argumentExpression !== undefined
    ? resolveAliasProvenance(expression.argumentExpression, bindings, substitutions, seen)
    : undefined;
  const computedOrigin = computedKey?.kind === 'exact' && !ts.isMethodDeclaration(computedKey.origin)
    ? unwrap(computedKey.origin)
    : undefined;
  const computedMemberKey = computedOrigin !== undefined && (
    ts.isStringLiteral(computedOrigin) || ts.isNumericLiteral(computedOrigin) || ts.isNoSubstitutionTemplateLiteral(computedOrigin)
  ) ? computedOrigin.text : undefined;
  if (ts.isElementAccessExpression(expression) && computedMemberKey === undefined) {
    const aggregate = finiteAggregateRelevance(expression.expression, bindings, substitutions, seen);
    if (aggregate?.kind === 'tainted') return { kind: 'tainted' };
    if (aggregate?.kind === 'exact') {
      return joinAliasProvenance(aggregate.leaves.map(leaf => resolveAliasProvenance(leaf, bindings, substitutions, seen)), bindings);
    }
  }
  const member = staticMember(expression) ?? (ts.isElementAccessExpression(expression) && computedMemberKey !== undefined
    ? { base: expression.expression, key: computedMemberKey }
    : undefined);
  if (member === undefined) return { kind: 'exact', origin: expression };
  const memberCandidates = bindings.memberProvenanceCandidates(member.base, member.key, expression);
  if (memberCandidates !== undefined) {
    return joinAliasProvenance(memberCandidates.map(candidate => resolveAliasCandidate(candidate, bindings, substitutions, seen)), bindings);
  }
  const baseProvenance = resolveAliasProvenance(member.base, bindings, substitutions, seen);
  if (baseProvenance.kind !== 'exact') return baseProvenance;
  const base = baseProvenance.origin;
  if (ts.isMethodDeclaration(base)) return { kind: 'tainted' };
  if (ts.isArrayLiteralExpression(base) && /^\d+$/.test(member.key)) {
    const item = base.elements[Number(member.key)];
    if (item !== undefined && !ts.isOmittedExpression(item) && !ts.isSpreadElement(item)) return resolveAliasProvenance(item, bindings, substitutions, seen);
  }
  if (ts.isObjectLiteralExpression(base)) {
    const projected = resolveObjectLiteralProperty(base, member.key, bindings, substitutions, seen);
    if (projected.kind !== 'absent') return projected;
  }
  return { kind: 'exact', origin: bindings.stableMemberProjection(base, member.key) };
}

function resolveAliasOrigin(
  expression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions = new Map(),
  seen = new Set<ts.Identifier>(),
): ts.Expression {
  const provenance = resolveAliasProvenance(expression, bindings, substitutions, seen);
  return provenance.kind === 'exact' && !ts.isMethodDeclaration(provenance.origin) ? provenance.origin : expression;
}

function aliasOriginReachesBinding(
  expression: ts.Expression,
  target: ts.Identifier,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions = new Map(),
  seen = new Set<ts.Identifier>(),
): boolean {
  expression = unwrap(expression);
  if (substitutions.has(expression)) {
    const substitution = substitutions.get(expression)!;
    if (typeof substitution === 'string') fail(expression, 'unsupported local invocation: tainted callback receiver provenance');
    return aliasOriginReachesBinding(substitution, target, bindings, substitutions, seen);
  }
  if (ts.isIdentifier(expression)) {
    if (bindings.isBinding(expression, target)) return true;
    const declaration = bindings.bindingDeclaration(expression);
    if (declaration !== undefined && seen.has(declaration)) fail(expression, 'unsupported local invocation: tainted alias provenance');
    if (declaration !== undefined && substitutions.has(declaration)) {
      const substitution = substitutions.get(declaration)!;
      if (typeof substitution === 'string') fail(expression, 'unsupported local invocation: tainted binding-pattern provenance');
      return aliasOriginReachesBinding(substitution, target, bindings, substitutions, new Set(seen).add(declaration));
    }
    const lookup = bindings.provenanceCandidates(expression);
    if (lookup.found) {
      const nextSeen = declaration === undefined ? seen : new Set(seen).add(declaration);
      const outcomes = lookup.candidates.map(candidate => {
        if (candidate === declaration) return false;
        if (typeof candidate !== 'string' && !isDefaultAliasCandidate(candidate) && !isProjectedAliasCandidate(candidate)) {
          return aliasOriginReachesBinding(candidate, target, bindings, substitutions, nextSeen);
        }
        const provenance = resolveAliasCandidate(candidate, bindings, substitutions, nextSeen);
        if (provenance.kind === 'tainted') return 'tainted';
        if (provenance.kind === 'absent' || ts.isMethodDeclaration(provenance.origin)) return false;
        return aliasOriginReachesBinding(provenance.origin, target, bindings, substitutions, nextSeen);
      });
      if (outcomes.includes('tainted') || new Set(outcomes).size > 1) fail(expression, 'unsupported local invocation: tainted alias provenance');
      return outcomes[0] === true;
    }
  }
  const member = staticMember(expression);
  if (member !== undefined && aliasOriginReachesBinding(member.base, target, bindings, substitutions, seen)) return true;
  const provenance = resolveAliasProvenance(expression, bindings, substitutions, seen);
  if (provenance.kind === 'tainted') fail(expression, 'unsupported local invocation: tainted alias provenance');
  return provenance.kind === 'exact' && (
    (ts.isIdentifier(provenance.origin) && bindings.isBinding(provenance.origin, target))
    || provenance.lineage?.has(target) === true
  );
}

type BindingReachability = 'unrelated' | 'relevant' | 'tainted';

function joinBindingReachability(values: readonly BindingReachability[]): BindingReachability {
  if (values.includes('relevant')) return 'relevant';
  return values.includes('tainted') ? 'tainted' : 'unrelated';
}

function invocationReturnBindingReachability(
  call: ts.CallExpression,
  targetBinding: ts.Identifier,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  seen: Set<ts.Node>,
): BindingReachability | undefined {
  const invocation = normalizeInvocation(call, bindings, substitutions);
  const target = localFunctionFromExpression(invocation.target, bindings, substitutions, false);
  if (target === undefined) return undefined;
  if (invocation.unsupported !== undefined || invocation.arguments === undefined) return 'tainted';
  if (activeIdentityReachabilitySummaries.has(target)) return 'tainted';
  const projected = projectInvocationParameters(target.parameters, invocation.arguments, bindings, substitutions);
  activeIdentityReachabilitySummaries.add(target);
  try {
    if (ts.isArrowFunction(target) && !ts.isBlock(target.body)) {
      return expressionBindingReachability(target.body, targetBinding, bindings, projected, seen);
    }
    if (target.body === undefined) return 'unrelated';
    if (!ts.isBlock(target.body)) return 'tainted';
    const returns: BindingReachability[] = [];
    const visit = (node: ts.Node): void => {
      if (isStaticallyDead(node, bindings) || (node !== target && ts.isFunctionLike(node))) return;
      if (ts.isReturnStatement(node)) {
        returns.push(node.expression === undefined
          ? 'unrelated'
          : expressionBindingReachability(node.expression, targetBinding, bindings, projected, seen));
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(target.body);
    if (!statementDefinitelyReturns(target.body)) returns.push('unrelated');
    return joinBindingReachability(returns);
  } finally {
    activeIdentityReachabilitySummaries.delete(target);
  }
}

function expressionBindingReachability(
  expression: ts.Expression,
  target: ts.Identifier,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions = new Map(),
  seen = new Set<ts.Node>(),
): BindingReachability {
  expression = unwrap(expression);
  const declaration = ts.isIdentifier(expression) ? bindings.bindingDeclaration(expression) : undefined;
  if (declaration !== undefined && declaration === target) return 'relevant';
  const marker = declaration ?? expression;
  if (seen.has(marker)) return 'tainted';
  const nextSeen = new Set(seen).add(marker);
  try {
    if (aliasOriginReachesBinding(expression, target, bindings, substitutions)) return 'relevant';
  } catch (error) {
    if (!(error instanceof FactsError)) throw error;
  }
  const candidateReachability = (candidate: AliasCandidate): BindingReachability => {
    if (candidate === 'ambiguous-identity') return 'tainted';
    if (candidate === 'tainted') return 'unrelated';
    if (candidate === 'absent') return 'unrelated';
    if (isDefaultAliasCandidate(candidate) || isProjectedAliasCandidate(candidate)) {
      const provenance = resolveAliasCandidate(candidate, bindings, substitutions, new Set());
      if (provenance.kind === 'absent') return 'unrelated';
      if (provenance.kind === 'exact' && !ts.isMethodDeclaration(provenance.origin)) {
        return expressionBindingReachability(provenance.origin, target, bindings, substitutions, nextSeen);
      }
      const structural = isDefaultAliasCandidate(candidate)
        ? joinBindingReachability([
          candidateReachability(candidate.source),
          expressionBindingReachability(candidate.fallback, target, bindings, substitutions, nextSeen),
        ])
        : candidateReachability(candidate.source);
      return structural;
    }
    if (ts.isIdentifier(candidate) && declaration !== undefined && (candidate === declaration || bindings.bindingDeclaration(candidate) === declaration)) return 'unrelated';
    return expressionBindingReachability(candidate, target, bindings, substitutions, nextSeen);
  };
  if (ts.isIdentifier(expression)) {
    const substitution = substitutions.get(expression) ?? (declaration === undefined ? undefined : substitutions.get(declaration));
    if (substitution !== undefined) {
      return substitution === 'tainted'
        ? 'unrelated'
        : substitution === 'absent'
          ? 'unrelated'
          : expressionBindingReachability(substitution, target, bindings, substitutions, nextSeen);
    }
    const lookup = bindings.provenanceCandidates(expression);
    return lookup.found
      ? joinBindingReachability(lookup.candidates.map(candidateReachability))
      : 'unrelated';
  }
  if (ts.isConditionalExpression(expression)) {
    const truth = staticTruthValue(expression.condition, bindings);
    if (truth !== undefined) return expressionBindingReachability(
      truth ? expression.whenTrue : expression.whenFalse,
      target,
      bindings,
      substitutions,
      nextSeen,
    );
    return joinBindingReachability([
      expressionBindingReachability(expression.whenTrue, target, bindings, substitutions, nextSeen),
      expressionBindingReachability(expression.whenFalse, target, bindings, substitutions, nextSeen),
    ]);
  }
  if (ts.isBinaryExpression(expression) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(expression.operatorToken.kind)) {
    const truth = staticTruthValue(expression.left, bindings);
    const nullish = staticNullishValue(expression.left, bindings);
    if (expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && truth !== undefined) {
      return expressionBindingReachability(truth ? expression.right : expression.left, target, bindings, substitutions, nextSeen);
    }
    if (expression.operatorToken.kind === ts.SyntaxKind.BarBarToken && truth !== undefined) {
      return expressionBindingReachability(truth ? expression.left : expression.right, target, bindings, substitutions, nextSeen);
    }
    if (expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken && nullish !== undefined) {
      return expressionBindingReachability(nullish ? expression.right : expression.left, target, bindings, substitutions, nextSeen);
    }
    return joinBindingReachability([
      expressionBindingReachability(expression.left, target, bindings, substitutions, nextSeen),
      expressionBindingReachability(expression.right, target, bindings, substitutions, nextSeen),
    ]);
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return joinBindingReachability(expression.elements.filter((element): element is ts.Expression => !ts.isOmittedExpression(element)).map(element => {
      const value = ts.isSpreadElement(element) ? element.expression : element;
      const reachability = expressionBindingReachability(value, target, bindings, substitutions, nextSeen);
      if (!ts.isSpreadElement(element) || reachability !== 'unrelated') return reachability;
      return finiteAggregateRelevance(value, bindings, substitutions)?.kind === 'exact' ? 'unrelated' : 'tainted';
    }));
  }
  if (ts.isObjectLiteralExpression(expression)) {
    return joinBindingReachability(expression.properties.map(property => {
      if (ts.isMethodDeclaration(property) || ts.isGetAccessorDeclaration(property) || ts.isSetAccessorDeclaration(property)) return 'tainted';
      let keyReachability: BindingReachability = 'unrelated';
      if (!ts.isSpreadAssignment(property) && ts.isComputedPropertyName(property.name)) {
        keyReachability = expressionBindingReachability(property.name.expression, target, bindings, substitutions, nextSeen);
        if (keyReachability === 'unrelated') {
          const key = resolveAliasProvenance(property.name.expression, bindings, substitutions);
          const origin = key.kind === 'exact' && !ts.isMethodDeclaration(key.origin) ? unwrap(key.origin) : undefined;
          if (origin === undefined || (!ts.isStringLiteral(origin) && !ts.isNumericLiteral(origin) && !ts.isNoSubstitutionTemplateLiteral(origin))) keyReachability = 'tainted';
        }
      }
      const value = ts.isSpreadAssignment(property)
        ? property.expression
        : ts.isPropertyAssignment(property)
          ? property.initializer
          : ts.isShorthandPropertyAssignment(property)
            ? property.name
            : undefined;
      if (value === undefined) return joinBindingReachability([keyReachability, 'tainted']);
      let valueReachability = expressionBindingReachability(value, target, bindings, substitutions, nextSeen);
      if (ts.isSpreadAssignment(property) && valueReachability === 'unrelated' && finiteAggregateRelevance(value, bindings, substitutions)?.kind !== 'exact') valueReachability = 'tainted';
      return joinBindingReachability([keyReachability, valueReachability]);
    }));
  }
  if (ts.isCallExpression(expression)) {
    const returned = invocationReturnBindingReachability(expression, target, bindings, substitutions, nextSeen);
    if (returned !== undefined) return returned;
    const receiver = staticMember(expression.expression)?.base;
    return joinBindingReachability([
      ...(receiver === undefined ? [] : [expressionBindingReachability(receiver, target, bindings, substitutions, nextSeen)]),
      ...expression.arguments.map(argument => expressionBindingReachability(
        ts.isSpreadElement(argument) ? argument.expression : argument,
        target,
        bindings,
        substitutions,
        nextSeen,
      )),
    ]);
  }
  const member = staticMember(expression);
  if (member !== undefined) {
    const candidates = bindings.memberProvenanceCandidates(member.base, member.key, expression);
    if (candidates !== undefined) return joinBindingReachability(candidates.map(candidateReachability));
    const baseProvenance = resolveAliasProvenance(member.base, bindings, substitutions);
    if (baseProvenance.kind === 'exact' && !ts.isMethodDeclaration(baseProvenance.origin)) {
      const base = unwrap(baseProvenance.origin);
      if (ts.isObjectLiteralExpression(base)) {
        const projected = resolveObjectLiteralProperty(base, member.key, bindings, substitutions, new Set());
        if (projected.kind === 'tainted') return 'tainted';
        if (projected.kind === 'absent' || ts.isMethodDeclaration(projected.origin)) return 'unrelated';
        return expressionBindingReachability(projected.origin, target, bindings, substitutions, nextSeen);
      }
      if (ts.isArrayLiteralExpression(base) && /^\d+$/.test(member.key)) {
        const element = base.elements[Number(member.key)];
        if (element === undefined || ts.isOmittedExpression(element)) return 'unrelated';
        if (ts.isSpreadElement(element)) return 'tainted';
        return expressionBindingReachability(element, target, bindings, substitutions, nextSeen);
      }
    }
    return expressionBindingReachability(member.base, target, bindings, substitutions, nextSeen);
  }
  if (ts.isElementAccessExpression(expression)) return expressionBindingReachability(expression.expression, target, bindings, substitutions, nextSeen);
  return 'unrelated';
}

const KNOWN_CONFIG_ARRAY_PATHS = new Set([
  'config.process',
  'config.process[*].datasets',
  'config.process[*].sample.samples',
  'config.process[*].train.validation_config.validation_items',
]);

function exactLiteralArrayIdentity(
  expression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
): boolean {
  const provenance = resolveAliasProvenance(expression, bindings, substitutions);
  return provenance.kind === 'exact'
    && !ts.isMethodDeclaration(provenance.origin)
    && ts.isArrayLiteralExpression(unwrap(provenance.origin));
}

function provenArrayIdentity(
  expression: ts.Expression,
  relevantBindings: readonly ts.Identifier[],
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
): 'literal' | 'config-path' | undefined {
  if (exactLiteralArrayIdentity(expression, bindings, substitutions)) return 'literal';
  return relevantBindings.some(binding => {
    const path = scopedFunctionConfigPath(expression, binding, bindings, new Set(), substitutions);
    return path !== undefined && KNOWN_CONFIG_ARRAY_PATHS.has(path);
  }) ? 'config-path' : undefined;
}

function exactNativeArrayPrototypeMethod(
  method: 'map' | 'forEach' | 'push',
  at: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  seen = new Set<ts.Node>(),
): boolean {
  const prototype = bindings.exactGlobalMemberExpression('Array', 'prototype');
  if (prototype === undefined) return true;
  const candidates = bindings.memberProvenanceCandidates(prototype, method, at);
  if (candidates === undefined) return true;
  const candidateIsNative = (candidate: AliasCandidate, lineage: Set<ts.Node>): boolean => {
    if (typeof candidate === 'string' || isDefaultAliasCandidate(candidate) || isProjectedAliasCandidate(candidate)) return false;
    const expression = unwrap(candidate);
    if (ts.isIdentifier(expression)) {
      const declaration = bindings.bindingDeclaration(expression);
      if (declaration === undefined || lineage.has(declaration)) return false;
      const lookup = bindings.provenanceCandidates(expression);
      return lookup.found
        && lookup.candidates.length > 0
        && lookup.candidates.every(item => candidateIsNative(item, new Set(lineage).add(declaration)));
    }
    const member = staticMember(expression);
    if (member?.key !== method) return false;
    const base = unwrap(member.base);
    const prototypeMember = staticMember(base);
    const prototypeReceiver = prototypeMember === undefined ? undefined : unwrap(prototypeMember.base);
    if (
      prototypeMember?.key === 'prototype'
      && prototypeReceiver !== undefined
      && ts.isIdentifier(prototypeReceiver)
      && prototypeReceiver.text === 'Array'
      && !bindings.lookup(prototypeReceiver).found
    ) return exactNativeArrayPrototypeMethod(method, expression, bindings, substitutions, lineage);
    return exactLiteralArrayIdentity(base, bindings, substitutions)
      && !ownStaticMember(expression, bindings)
      && exactNativeArrayPrototypeMethod(method, expression, bindings, substitutions, lineage);
  };
  if (seen.has(at)) return false;
  const nextSeen = new Set(seen).add(at);
  return candidates.length > 0 && candidates.every(candidate => candidateIsNative(candidate, nextSeen));
}

function exactNativeArrayMethod(
  call: ts.CallExpression,
  method: 'map' | 'forEach' | 'push',
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
): boolean {
  const member = staticMember(call.expression);
  if (member === undefined) return false;
  const candidates = bindings.memberProvenanceCandidates(member.base, method, call.expression);
  if (candidates === undefined) {
    return !ownStaticMember(call.expression, bindings)
      && exactNativeArrayPrototypeMethod(method, call.expression, bindings, substitutions);
  }
  return candidates.length > 0 && candidates.every(candidate => {
    const provenance = resolveAliasCandidate(candidate, bindings, substitutions, new Set());
    if (provenance.kind === 'absent') {
      return exactNativeArrayPrototypeMethod(method, call.expression, bindings, substitutions);
    }
    if (provenance.kind !== 'exact' || ts.isMethodDeclaration(provenance.origin)) return false;
    const nativeMember = staticMember(provenance.origin);
    if (nativeMember?.key !== method || !exactLiteralArrayIdentity(nativeMember.base, bindings, substitutions)) return false;
    return exactNativeArrayPrototypeMethod(method, provenance.origin, bindings, substitutions);
  });
}

function exactNativeFunctionPrototypeMethod(
  method: 'call' | 'apply' | 'bind',
  at: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  seen = new Set<ts.Node>(),
): boolean {
  const prototype = bindings.exactGlobalMemberExpression('Function', 'prototype');
  if (prototype === undefined) return true;
  const contextualSubstitutions = bindings.invocationQueryContext(substitutions) === undefined
    ? undefined
    : substitutions;
  const candidates = bindings.memberProvenanceCandidates(prototype, method, at, contextualSubstitutions);
  if (candidates === undefined) return true;
  if (seen.has(at)) return false;
  const nextSeen = new Set(seen).add(at);
  return candidates.length > 0 && candidates.every(candidate => {
    const provenance = resolveAliasCandidate(candidate, bindings, substitutions, new Set());
    if (provenance.kind !== 'exact' || ts.isMethodDeclaration(provenance.origin)) return false;
    const member = staticMember(provenance.origin);
    if (member?.key !== method) return false;
    const prototypeMember = staticMember(member.base);
    const receiver = prototypeMember === undefined ? undefined : unwrap(prototypeMember.base);
    if (
      prototypeMember?.key === 'prototype'
      && receiver !== undefined
      && ts.isIdentifier(receiver)
      && receiver.text === 'Function'
      && !bindings.lookup(receiver).found
    ) return exactNativeFunctionPrototypeMethod(method, provenance.origin, bindings, substitutions, nextSeen);
    return callableAliasOrigin(member.base, bindings)
      && exactNativeFunctionMethod(provenance.origin, method, bindings, substitutions, nextSeen);
  });
}

function exactNativeFunctionMethod(
  expression: ts.Expression,
  method: 'call' | 'apply' | 'bind',
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  seen = new Set<ts.Node>(),
): boolean {
  const member = staticMember(expression);
  const exactMutationTarget = member === undefined
    ? undefined
    : resolveMutationApiIdentity(member.base, bindings, substitutions);
  if (
    member?.key !== method
    || (!callableAliasOrigin(member.base, bindings) && exactMutationTarget?.exactGlobal !== true)
  ) return false;
  const contextualSubstitutions = bindings.invocationQueryContext(substitutions) === undefined
    ? undefined
    : substitutions;
  const candidates = bindings.memberProvenanceCandidates(member.base, method, expression, contextualSubstitutions);
  if (candidates === undefined) {
    return exactNativeFunctionPrototypeMethod(method, expression, bindings, substitutions, seen);
  }
  if (seen.has(expression)) return false;
  const nextSeen = new Set(seen).add(expression);
  return candidates.length > 0 && candidates.every(candidate => {
    const provenance = resolveAliasCandidate(candidate, bindings, substitutions, new Set());
    if (provenance.kind === 'absent') return exactNativeFunctionPrototypeMethod(method, expression, bindings, substitutions, nextSeen);
    if (provenance.kind !== 'exact' || ts.isMethodDeclaration(provenance.origin)) return false;
    return exactNativeFunctionMethod(provenance.origin, method, bindings, substitutions, nextSeen);
  });
}

function exactDeletedFunctionWrapper(
  expression: ts.Expression,
  method: 'call' | 'apply' | 'bind',
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
): boolean {
  const member = staticMember(expression);
  if (member?.key !== method) return false;
  const contextualSubstitutions = bindings.invocationQueryContext(substitutions) === undefined
    ? undefined
    : substitutions;
  const candidateIsAbsent = (candidate: AliasCandidate): boolean => (
    resolveAliasCandidate(candidate, bindings, substitutions, new Set()).kind === 'absent'
  );
  const ownCandidates = bindings.memberProvenanceCandidates(
    member.base,
    method,
    expression,
    contextualSubstitutions,
  );
  if (ownCandidates !== undefined && (
    ownCandidates.length === 0 || !ownCandidates.every(candidateIsAbsent)
  )) return false;
  const prototype = bindings.exactGlobalMemberExpression('Function', 'prototype');
  if (prototype === undefined) return false;
  const prototypeCandidates = bindings.memberProvenanceCandidates(
    prototype,
    method,
    expression,
    contextualSubstitutions,
  );
  return prototypeCandidates !== undefined
    && prototypeCandidates.length > 0
    && prototypeCandidates.every(candidateIsAbsent);
}

function unmodeledCallConsumesRelevantIdentity(
  call: ts.CallExpression,
  relevantBindings: readonly ts.Identifier[],
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
): boolean {
  const invocation = normalizeInvocation(call, bindings, substitutions);
  if (invocation.abrupt !== undefined) return false;
  if (localFunctionFromExpression(invocation.target, bindings, substitutions, false) !== undefined) return false;
  const mutationApi = resolveMutationApiIdentity(invocation.target, bindings, substitutions);
  if (mutationApi?.exactGlobal === true && (
    (mutationApi.receiver === 'Object' && ['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf'].includes(mutationApi.method))
    || (mutationApi.receiver === 'Reflect' && ['set', 'deleteProperty'].includes(mutationApi.method))
  )) return false;
  const member = staticMember(call.expression);
  const receiver = member === undefined ? undefined : unwrap(member.base);
  if (member !== undefined && receiver !== undefined && ts.isIdentifier(receiver) && !bindings.lookup(receiver).found && receiver.text === 'Array' && member.key === 'isArray') return false;
  if (member !== undefined && receiver !== undefined && (member.key === 'map' || member.key === 'forEach')) {
    if (
      provenArrayIdentity(receiver, relevantBindings, bindings, substitutions) !== undefined
      && exactNativeArrayMethod(call, member.key, bindings, substitutions)
    ) return false;
  }
  if (member?.key === 'bind' && exactNativeFunctionMethod(call.expression, 'bind', bindings, substitutions)) return false;
  if (member?.key === 'push' && receiver !== undefined) {
    if (
      provenArrayIdentity(receiver, relevantBindings, bindings, substitutions) === 'literal'
      && exactNativeArrayMethod(call, 'push', bindings, substitutions)
    ) return false;
  }
  const values = [
    ...(receiver === undefined ? [] : [receiver]),
    ...call.arguments.map(argument => ts.isSpreadElement(argument) ? argument.expression : argument),
  ];
  return values.some(value => relevantBindings.some(binding => expressionBindingReachability(value, binding, bindings, substitutions) !== 'unrelated'));
}

type NormalizedInvocation = {
  target: ts.Expression;
  arguments?: readonly ts.Expression[];
  unsupported?: string;
  abrupt?: string;
};

type NormalizedInvocationIdentity = {
  invocation: NormalizedInvocation;
  mutationApi?: MutationApiIdentity;
};

type NormalizedInvocationQueryScope = {
  completed: WeakMap<ts.CallExpression, Map<string, NormalizedInvocationIdentity>>;
  active: WeakMap<ts.CallExpression, Set<string>>;
};

const normalizedInvocationQueryScopes = new WeakMap<
  LexicalBindings,
  Map<string, NormalizedInvocationQueryScope>
>();
const normalizedInvocationNodeIdentities = new WeakMap<ts.Node, number>();
let normalizedInvocationNodeIdentitySequence = 0;

function normalizedInvocationNodeIdentity(node: ts.Node): number {
  let identity = normalizedInvocationNodeIdentities.get(node);
  if (identity === undefined) {
    identity = ++normalizedInvocationNodeIdentitySequence;
    normalizedInvocationNodeIdentities.set(node, identity);
  }
  return identity;
}

function normalizedInvocationSubstitutionKey(
  substitutions: InvocationSubstitutions,
  bindings?: LexicalBindings,
): string {
  const context = bindings?.invocationQueryContext(substitutions);
  const contextKey = context === undefined
    ? 'root'
    : `${normalizedInvocationNodeIdentity(context.owner)}@${normalizedInvocationNodeIdentity(context.site)}`;
  const substitutionsKey = [...substitutions.entries()]
    .map(([node, value]) => [
      normalizedInvocationNodeIdentity(node),
      typeof value === 'string' ? `value:${value}` : `node:${normalizedInvocationNodeIdentity(value)}`,
    ] as const)
    .sort(([left], [right]) => left - right)
    .map(([node, value]) => `${node}=${value}`)
    .join(',');
  return `${contextKey}|${substitutionsKey}`;
}

function completedNormalizedInvocationIdentity(
  call: ts.CallExpression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  key: string,
  compute: () => NormalizedInvocationIdentity,
): NormalizedInvocationIdentity {
  let bySubstitutions = normalizedInvocationQueryScopes.get(bindings);
  if (bySubstitutions === undefined) {
    bySubstitutions = new Map();
    normalizedInvocationQueryScopes.set(bindings, bySubstitutions);
  }
  const substitutionKey = normalizedInvocationSubstitutionKey(substitutions, bindings);
  let scope = bySubstitutions.get(substitutionKey);
  if (scope === undefined) {
    scope = { completed: new WeakMap(), active: new WeakMap() };
    bySubstitutions.set(substitutionKey, scope);
  }
  let completedByKey = scope.completed.get(call);
  if (completedByKey === undefined) {
    completedByKey = new Map();
    scope.completed.set(call, completedByKey);
  }
  const completed = completedByKey.get(key);
  if (completed !== undefined) return completed;
  const cacheable = bindings.invocationQueryContext(substitutions) === undefined
    || !bindings.isBuildingMemberTimeline();

  let activeKeys = scope.active.get(call);
  if (activeKeys === undefined) {
    activeKeys = new Set();
    scope.active.set(call, activeKeys);
  }
  if (activeKeys.has(key)) {
    return {
      invocation: {
        target: call.expression,
        arguments: finiteInvocationArgumentList(call.arguments, bindings),
        unsupported: 'active normalized invocation provenance cycle',
      },
    };
  }
  activeKeys.add(key);
  try {
    const result = compute();
    if (cacheable) completedByKey.set(key, result);
    return result;
  } finally {
    activeKeys.delete(key);
  }
}

function finiteInvocationArguments(
  expression: ts.Expression,
  bindings: LexicalBindings,
): readonly ts.Expression[] | undefined {
  const provenance = resolveAliasProvenance(expression, bindings);
  if (provenance.kind !== 'exact' || ts.isMethodDeclaration(provenance.origin)) return undefined;
  const array = unwrap(provenance.origin);
  if (!ts.isArrayLiteralExpression(array) || array.elements.some(ts.isOmittedExpression)) return undefined;
  const result: ts.Expression[] = [];
  for (const element of array.elements) {
    if (ts.isSpreadElement(element)) {
      const nested = finiteInvocationArguments(element.expression, bindings);
      if (nested === undefined) return undefined;
      result.push(...nested);
    } else result.push(element);
  }
  return result;
}

function finiteInvocationArgumentList(
  argumentsList: readonly ts.Expression[],
  bindings: LexicalBindings,
): readonly ts.Expression[] | undefined {
  const result: ts.Expression[] = [];
  for (const argument of argumentsList) {
    if (ts.isSpreadElement(argument)) {
      const spread = finiteInvocationArguments(argument.expression, bindings);
      if (spread === undefined) return undefined;
      result.push(...spread);
    } else result.push(argument);
  }
  return result;
}

function exactThisArgument(expression: ts.Expression | undefined, bindings: LexicalBindings): boolean {
  if (expression === undefined) return false;
  expression = unwrap(expression);
  return expression.kind === ts.SyntaxKind.NullKeyword
    || (ts.isIdentifier(expression) && expression.text === 'undefined' && !bindings.lookup(expression).found)
    || (ts.isVoidExpression(expression) && ts.isNumericLiteral(unwrap(expression.expression)) && Number((unwrap(expression.expression) as ts.NumericLiteral).text) === 0);
}

function callableAliasOrigin(expression: ts.Expression, bindings: LexicalBindings): boolean {
  const provenance = resolveAliasProvenance(expression, bindings);
  if (provenance.kind !== 'exact') return false;
  const origin = provenance.origin;
  if (ts.isFunctionLike(origin)) return true;
  if (ts.isIdentifier(origin)) {
    const declaration = bindings.bindingDeclaration(origin);
    if (declaration !== undefined && ts.isFunctionDeclaration(declaration.parent) && declaration.parent.name === declaration) return true;
    return declaration !== undefined && ts.isParameter(declaration.parent) && declaration.parent.type !== undefined
      && (ts.isFunctionTypeNode(declaration.parent.type) || ts.isConstructorTypeNode(declaration.parent.type));
  }
  if (ts.isMethodDeclaration(origin)) return true;
  const api = ts.isMethodDeclaration(origin) ? undefined : staticMember(origin);
  if (api === undefined) return false;
  const receiver = resolveAliasOrigin(api.base, bindings);
  return ts.isIdentifier(receiver)
    && !bindings.lookup(receiver).found
    && ((receiver.text === 'Object' && ['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf'].includes(api.key))
      || (receiver.text === 'Reflect' && ['set', 'deleteProperty'].includes(api.key)));
}

function ownStaticMember(expression: ts.Expression, bindings: LexicalBindings): boolean {
  const member = staticMember(expression);
  if (member === undefined) return false;
  if (bindings.memberProvenanceCandidates(member.base, member.key, expression) !== undefined) return true;
  const base = resolveAliasProvenance(member.base, bindings);
  if (base.kind !== 'exact' || !ts.isObjectLiteralExpression(base.origin)) return false;
  return base.origin.properties.some(property => !ts.isSpreadAssignment(property) && propertyName(property.name) === member.key);
}

function computeNormalizedInvocation(
  call: ts.CallExpression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions = new Map(),
): NormalizedInvocation {
  const callee = unwrap(call.expression);
  if (ts.isCallExpression(callee)) {
    const bindCallee = staticMember(callee.expression);
    if (bindCallee?.key === 'bind' && exactNativeFunctionMethod(callee.expression, 'bind', bindings, substitutions)) {
      const bound = finiteInvocationArgumentList(callee.arguments, bindings);
      const later = finiteInvocationArgumentList(call.arguments, bindings);
      return bound !== undefined && later !== undefined && exactThisArgument(bound[0], bindings)
        ? { target: unwrap(bindCallee.base), arguments: [...bound.slice(1), ...later] }
        : { target: unwrap(bindCallee.base), unsupported: 'bind requires an exact null/undefined this argument' };
    }
    if (bindCallee?.key === 'bind' && exactDeletedFunctionWrapper(callee.expression, 'bind', bindings, substitutions)) {
      return {
        target: unwrap(bindCallee.base),
        arguments: finiteInvocationArgumentList(callee.arguments, bindings),
        abrupt: 'deleted Function.prototype.bind is non-callable',
      };
    }
  }
  const member = staticMember(callee);
  if (
    member?.key === 'bind'
    && exactDeletedFunctionWrapper(callee, 'bind', bindings, substitutions)
  ) {
    return {
      target: unwrap(member.base),
      arguments: finiteInvocationArgumentList(call.arguments, bindings),
      abrupt: 'deleted Function.prototype.bind is non-callable',
    };
  }
  if (
    member !== undefined
    && (member.key === 'call' || member.key === 'apply')
    && exactNativeFunctionMethod(callee, member.key, bindings, substitutions)
  ) {
    const target = unwrap(member.base);
    const directArguments = finiteInvocationArgumentList(call.arguments, bindings);
    if (directArguments === undefined || !exactThisArgument(directArguments[0], bindings)) return { target, unsupported: `${member.key} requires an exact null/undefined this argument` };
    if (member.key === 'call') return { target, arguments: directArguments.slice(1) };
    const applied = directArguments.length === 2 ? finiteInvocationArguments(directArguments[1], bindings) : undefined;
    return applied === undefined
      ? { target, unsupported: 'apply requires one exact finite array/tuple argument' }
      : { target, arguments: applied };
  }
  if (
    member !== undefined
    && (member.key === 'call' || member.key === 'apply')
    && exactDeletedFunctionWrapper(callee, member.key, bindings, substitutions)
  ) {
    return {
      target: unwrap(member.base),
      arguments: finiteInvocationArgumentList(call.arguments, bindings),
      abrupt: `deleted Function.prototype.${member.key} is non-callable`,
    };
  }
  const direct = resolveAliasProvenance(call.expression, bindings, substitutions);
  const directArguments = finiteInvocationArgumentList(call.arguments, bindings);
  if (direct.kind === 'tainted') return {
    target: call.expression,
    arguments: directArguments,
    unsupported: 'tainted call target provenance',
  };
  return {
    target: direct.kind === 'exact' && !ts.isMethodDeclaration(direct.origin) ? direct.origin : call.expression,
    arguments: directArguments,
    ...(directArguments === undefined ? { unsupported: 'dynamic or ambiguous argument spread' } : {}),
  };
}

function normalizedMutationInvocationIdentity(
  call: ts.CallExpression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  candidate: MutationApiIdentity,
): NormalizedInvocationIdentity {
  return completedNormalizedInvocationIdentity(
    call,
    bindings,
    substitutions,
    normalizedMutationInvocationQueryKey(call, candidate),
    () => {
      const invocation = computeNormalizedInvocation(call, bindings, substitutions);
      return {
        invocation,
        mutationApi: invocation.abrupt === undefined
          ? resolveMutationApiIdentity(invocation.target, bindings, substitutions)
          : undefined,
      };
    },
  );
}

function normalizeInvocation(
  call: ts.CallExpression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions = new Map(),
): NormalizedInvocation {
  const candidate = preflightMutationApiCandidate(call, bindings, substitutions);
  const invocation = candidate === undefined
    ? computeNormalizedInvocation(call, bindings, substitutions)
    : normalizedMutationInvocationIdentity(call, bindings, substitutions, candidate).invocation;
  return call.questionDotToken === undefined
    ? invocation
    : { ...invocation, unsupported: invocation.unsupported ?? 'optional invocation is conditionally executed' };
}

function bindingIdentifiers(name: ts.BindingName): ts.Identifier[] {
  if (ts.isIdentifier(name)) return [name];
  return name.elements.flatMap(element => ts.isOmittedExpression(element) ? [] : bindingIdentifiers(element.name));
}

type InvocationDefaultEffect = {
  expression: ts.Expression;
  selection: 'always' | 'maybe';
  substitutions: InvocationSubstitutions;
};

type InvocationAccessEffect = {
  target: ts.FunctionLikeDeclaration;
  receiver: ts.Expression;
};

function projectInvocationParameters(
  parameters: readonly Pick<ts.ParameterDeclaration, 'name' | 'dotDotDotToken' | 'initializer'>[],
  argumentValues: readonly InvocationValue[],
  bindings: LexicalBindings,
  inherited: InvocationSubstitutions,
  defaultEffects?: InvocationDefaultEffect[],
  accessEffects?: InvocationAccessEffect[],
  accessAt?: ts.Node,
): Map<ts.Node, InvocationValue> {
  const projected = new Map(inherited);
  const taint = (name: ts.BindingName): void => {
    for (const identifier of bindingIdentifiers(name)) projected.set(identifier, 'tainted');
  };
  const exactAggregate = (value: InvocationValue): ts.Expression | 'tainted' | 'absent' => {
    if (typeof value === 'string') return value;
    const provenance = resolveAliasProvenance(value, bindings, projected);
    return provenance.kind === 'tainted'
      ? 'tainted'
      : provenance.kind === 'absent' || ts.isMethodDeclaration(provenance.origin)
        ? 'absent'
        : unwrap(provenance.origin);
  };
  const notePossibleDefaults = (name: ts.BindingName): void => {
    if (ts.isIdentifier(name)) return;
    for (const element of name.elements) {
      if (ts.isOmittedExpression(element)) continue;
      if (element.initializer !== undefined) defaultEffects?.push({
        expression: element.initializer,
        selection: 'maybe',
        substitutions: new Map(projected),
      });
      notePossibleDefaults(element.name);
    }
  };
  const selectedGetter = (
    object: ts.ObjectLiteralExpression,
    key: string,
    seen = new Set<ts.ObjectLiteralExpression>(),
  ): ts.GetAccessorDeclaration | 'unknown' | undefined => {
    if (seen.has(object)) return 'unknown';
    const nextSeen = new Set(seen).add(object);
    for (let index = object.properties.length - 1; index >= 0; index -= 1) {
      const property = object.properties[index];
      if (ts.isSpreadAssignment(property)) {
        const provenance = resolveAliasProvenance(property.expression, bindings, projected);
        if (provenance.kind !== 'exact' || ts.isMethodDeclaration(provenance.origin)) return 'unknown';
        const origin = unwrap(provenance.origin);
        if (!ts.isObjectLiteralExpression(origin)) return 'unknown';
        const nested = selectedGetter(origin, key, nextSeen);
        if (nested !== undefined) return nested;
        continue;
      }
      const propertyKey = ts.isComputedPropertyName(property.name)
        ? resolveStaticString(property.name.expression, bindings, projected)
        : propertyName(property.name);
      if (propertyKey === undefined) return 'unknown';
      if (propertyKey !== key) continue;
      return ts.isGetAccessorDeclaration(property) ? property : undefined;
    }
    return undefined;
  };
  const project = (name: ts.BindingName, rawValue: InvocationValue, fallback?: ts.Expression): void => {
    const selection: 'always' | 'maybe' | 'never' = rawValue === 'absent'
      ? 'always'
      : rawValue === 'tainted'
        ? 'maybe'
        : (() => {
          const provenance = resolveAliasProvenance(rawValue, bindings, projected);
          if (provenance.kind === 'tainted') return 'maybe';
          return provenance.kind === 'absent'
            || (provenance.kind === 'exact' && definitelyUndefinedOrigin(provenance.origin, bindings))
            ? 'always'
            : 'never';
        })();
    if (fallback !== undefined && selection !== 'never') defaultEffects?.push({
      expression: fallback,
      selection,
      substitutions: new Map(projected),
    });
    const value = selection === 'always' && fallback !== undefined ? fallback : rawValue;
    if (ts.isIdentifier(name)) {
      projected.set(name, value);
      return;
    }
    const aggregate = exactAggregate(value);
    if (typeof aggregate === 'string') {
      if (aggregate === 'tainted') notePossibleDefaults(name);
      taint(name);
      return;
    }
    if (ts.isObjectBindingPattern(name)) {
      if (ts.isObjectLiteralExpression(aggregate)) {
        const restAccess = name.elements.some(element => element.dotDotDotToken !== undefined)
          ? finiteObjectSpreadGetters(aggregate, bindings, projected, accessAt)
          : { getters: [], properties: new Map<string, ts.FunctionLikeDeclaration | undefined>(), unknown: false };
        const excluded = new Set<string>();
        for (const element of name.elements) {
          if (element.dotDotDotToken !== undefined) {
            for (const [key, getter] of restAccess.properties) {
              if (getter !== undefined && !excluded.has(key)) accessEffects?.push({ target: getter, receiver: aggregate });
            }
            continue;
          }
          const key = element.propertyName === undefined && ts.isIdentifier(element.name)
            ? element.name.text
            : element.propertyName === undefined
              ? undefined
              : ts.isComputedPropertyName(element.propertyName)
                ? resolveStaticString(element.propertyName.expression, bindings, projected)
                : propertyName(element.propertyName);
          if (key === undefined) continue;
          excluded.add(key);
          const getter = selectedGetter(aggregate, key);
          if (getter === 'unknown') {
            notePossibleDefaults(element.name);
            taint(element.name);
          } else if (getter !== undefined) accessEffects?.push({ target: getter, receiver: aggregate });
        }
      }
      if (!ts.isObjectLiteralExpression(aggregate) || aggregate.properties.some(property => ts.isSpreadAssignment(property) || ts.isGetAccessorDeclaration(property) || ts.isSetAccessorDeclaration(property))) {
        notePossibleDefaults(name);
        taint(name);
        return;
      }
      const properties = objectProperties(aggregate);
      for (const element of name.elements) {
        if (element.dotDotDotToken !== undefined) {
          taint(element.name);
          continue;
        }
        const key = element.propertyName === undefined && ts.isIdentifier(element.name)
          ? element.name.text
          : element.propertyName === undefined
            ? undefined
            : ts.isComputedPropertyName(element.propertyName)
              ? resolveStaticString(element.propertyName.expression, bindings, projected)
              : propertyName(element.propertyName);
        if (key === undefined) {
          taint(element.name);
          continue;
        }
        project(element.name, properties.get(key) ?? 'absent', element.initializer);
      }
      return;
    }
    const iterator = finiteIteratorMethod(aggregate, bindings, projected);
    if (iterator === 'unknown') {
      notePossibleDefaults(name);
      taint(name);
      return;
    }
    if (iterator !== undefined) accessEffects?.push({ target: iterator, receiver: aggregate });
    if (!ts.isArrayLiteralExpression(aggregate) || aggregate.elements.some(element => ts.isOmittedExpression(element) || ts.isSpreadElement(element))) {
      notePossibleDefaults(name);
      taint(name);
      return;
    }
    name.elements.forEach((element, index) => {
      if (ts.isOmittedExpression(element)) return;
      if (element.dotDotDotToken !== undefined) {
        taint(element.name);
        return;
      }
      project(element.name, aggregate.elements[index] as ts.Expression | undefined ?? 'absent', element.initializer);
    });
  };
  parameters.forEach((parameter, index) => {
    if (parameter.dotDotDotToken !== undefined) {
      taint(parameter.name);
      return;
    }
    project(parameter.name, argumentValues[index] ?? 'absent', parameter.initializer);
  });
  return projected;
}

function localFunctionFromExpression(
  expression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  failOnTainted = true,
): ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration | ts.MethodDeclaration | undefined {
  const provenance = resolveAliasProvenance(expression, bindings, substitutions);
  if (provenance.kind === 'tainted') {
    if (!failOnTainted || expression.getSourceFile() === undefined || bindings.isBuildingMemberTimeline()) return undefined;
    fail(expression, `unsupported local invocation: tainted call-target provenance for ${expression.getText()}`);
  }
  if (provenance.kind === 'exact' && ts.isMethodDeclaration(provenance.origin)) return provenance.origin;
  const callee = provenance.kind === 'exact' && !ts.isMethodDeclaration(provenance.origin) ? provenance.origin : expression;
  if (ts.isArrowFunction(callee) || ts.isFunctionExpression(callee)) return callee;
  if (ts.isIdentifier(callee)) {
    const declaration = bindings.bindingDeclaration(callee);
    return declaration !== undefined && ts.isFunctionDeclaration(declaration.parent) && declaration.parent.name === declaration
      ? declaration.parent
      : undefined;
  }
  return undefined;
}

function statementDefinitelyReturns(statement: ts.Statement): boolean {
  if (isStaticallyDead(statement)) return false;
  if (ts.isReturnStatement(statement) || ts.isThrowStatement(statement)) return true;
  if (ts.isBlock(statement)) return statement.statements.some(statementDefinitelyReturns);
  if (ts.isIfStatement(statement)) {
    const truth = staticTruthValue(statement.expression);
    if (truth === true) return statementDefinitelyReturns(statement.thenStatement);
    if (truth === false) return statement.elseStatement !== undefined && statementDefinitelyReturns(statement.elseStatement);
    return statement.elseStatement !== undefined
      && statementDefinitelyReturns(statement.thenStatement)
      && statementDefinitelyReturns(statement.elseStatement);
  }
  if (ts.isSwitchStatement(statement)) {
    return statement.caseBlock.clauses.some(ts.isDefaultClause)
      && statement.caseBlock.clauses.every(clause => clause.statements.some(statementDefinitelyReturns));
  }
  if (ts.isTryStatement(statement)) {
    if (statement.finallyBlock !== undefined && statementDefinitelyReturns(statement.finallyBlock)) return true;
    return statementDefinitelyReturns(statement.tryBlock)
      && (statement.catchClause === undefined || statementDefinitelyReturns(statement.catchClause.block));
  }
  return false;
}

function functionDefinitelyThrows(target: ts.FunctionLikeDeclaration): boolean {
  if (target.body === undefined || !ts.isBlock(target.body)) return false;
  const statementThrows = (statement: ts.Statement): boolean => {
    if (ts.isThrowStatement(statement)) return true;
    if (ts.isBlock(statement)) return statement.statements.some(statementThrows);
    if (ts.isIfStatement(statement)) {
      const truth = staticTruthValue(statement.expression);
      if (truth === true) return statementThrows(statement.thenStatement);
      if (truth === false) return statement.elseStatement !== undefined && statementThrows(statement.elseStatement);
      return statement.elseStatement !== undefined
        && statementThrows(statement.thenStatement)
        && statementThrows(statement.elseStatement);
    }
    return false;
  };
  return target.body.statements.some(statementThrows);
}

function summarizeInvocationReturnProvenance(
  call: ts.CallExpression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
): AliasProvenance | undefined {
  const invocation = normalizeInvocation(call, bindings, substitutions);
  const target = localFunctionFromExpression(invocation.target, bindings, substitutions);
  if (target === undefined) return undefined;
  if (invocation.unsupported !== undefined || invocation.arguments === undefined) return { kind: 'tainted' };
  return summarizeFunctionReturnProvenance(target, invocation.arguments, bindings, substitutions);
}

function summarizeFunctionReturnProvenance(
  target: ts.FunctionLikeDeclaration,
  argumentsToBind: readonly InvocationValue[],
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  thisValue: InvocationValue = 'absent',
): AliasProvenance {
  if (activeInvocationSummaries.has(target)) return { kind: 'tainted' };
  const next = projectInvocationParameters(target.parameters, argumentsToBind, bindings, substitutions);
  if (!ts.isArrowFunction(target) && target.body !== undefined) {
    const bindThis = (node: ts.Node): void => {
      if (node.kind === ts.SyntaxKind.ThisKeyword) {
        next.set(node, thisValue);
        return;
      }
      if (node !== target.body && ts.isFunctionLike(node) && !ts.isArrowFunction(node)) return;
      ts.forEachChild(node, bindThis);
    };
    bindThis(target.body);
  }
  activeInvocationSummaries.add(target);
  try {
    if (ts.isArrowFunction(target) && !ts.isBlock(target.body)) {
      return resolveAliasProvenance(target.body, bindings, next);
    }
    if (target.body === undefined) return { kind: 'absent' };
    const block = target.body;
    if (!ts.isBlock(block)) return { kind: 'tainted' };
    const returns: AliasProvenance[] = [];
    const visit = (node: ts.Node): void => {
      if (isStaticallyDead(node)) return;
      if (node !== target && ts.isFunctionLike(node)) return;
      if (ts.isReturnStatement(node)) {
        returns.push(node.expression === undefined ? { kind: 'absent' } : resolveAliasProvenance(node.expression, bindings, next));
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(block);
    if (!statementDefinitelyReturns(block)) returns.push({ kind: 'absent' });
    return joinAliasProvenance(returns, bindings);
  } finally {
    activeInvocationSummaries.delete(target);
  }
}

type FiniteAccessorTarget = ts.FunctionLikeDeclaration | 'unknown';
type FiniteOwnDescriptor =
  | { kind: 'data'; enumerable: boolean | 'unknown'; configurable: boolean | 'unknown' }
  | {
    kind: 'accessor';
    getter?: FiniteAccessorTarget;
    setter?: FiniteAccessorTarget;
    enumerable: boolean | 'unknown';
    configurable: boolean | 'unknown';
  }
  | { kind: 'unknown' };
type FinitePrototypeState =
  | { kind: 'exact'; expression: ts.Expression }
  | { kind: 'builtin-object' | 'builtin-array' | 'null' | 'unknown' };
type FiniteOwnDescriptorResult = {
  properties: ReadonlyMap<string, FiniteOwnDescriptor>;
  unknown: boolean;
  prototype: FinitePrototypeState;
};

function syntacticExactAliasOrigin(
  expression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  seen = new Set<ts.Node>(),
): ts.Expression | undefined {
  expression = unwrap(expression);
  if (seen.has(expression)) return undefined;
  const nextSeen = new Set(seen).add(expression);
  const directSubstitution = substitutions.get(expression);
  if (directSubstitution !== undefined) return typeof directSubstitution === 'string'
    ? undefined
    : syntacticExactAliasOrigin(directSubstitution, bindings, substitutions, nextSeen);
  if (!ts.isIdentifier(expression)) return expression;
  const declaration = bindings.bindingDeclaration(expression);
  if (declaration === undefined) return expression;
  if (seen.has(declaration)) return undefined;
  const declarationSubstitution = substitutions.get(declaration);
  if (declarationSubstitution !== undefined) return typeof declarationSubstitution === 'string'
    ? undefined
    : syntacticExactAliasOrigin(declarationSubstitution, bindings, substitutions, new Set(nextSeen).add(declaration));
  const lookup = bindings.provenanceCandidates(expression);
  if (!lookup.found || lookup.candidates.length !== 1) return undefined;
  const [candidate] = lookup.candidates;
  if (
    typeof candidate === 'string'
    || isDefaultAliasCandidate(candidate)
    || isProjectedAliasCandidate(candidate)
    || candidate === declaration
  ) return undefined;
  return syntacticExactAliasOrigin(candidate, bindings, substitutions, new Set(nextSeen).add(declaration));
}

function definitelyPrimitiveExpression(
  expression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
): boolean {
  const provenance = resolveAliasProvenance(expression, bindings, substitutions);
  if (provenance.kind !== 'exact' || ts.isMethodDeclaration(provenance.origin)) return false;
  const origin = unwrap(provenance.origin);
  if (
    origin.kind === ts.SyntaxKind.NullKeyword
    || origin.kind === ts.SyntaxKind.TrueKeyword
    || origin.kind === ts.SyntaxKind.FalseKeyword
    || ts.isNumericLiteral(origin)
    || ts.isBigIntLiteral(origin)
    || ts.isStringLiteral(origin)
    || ts.isNoSubstitutionTemplateLiteral(origin)
    || ts.isTemplateExpression(origin)
    || definitelyUndefinedOrigin(origin, bindings)
  ) return true;
  if (!ts.isCallExpression(origin) || origin.arguments.length > 1) return false;
  const callee = unwrap(origin.expression);
  return ts.isIdentifier(callee)
    && (callee.text === 'Symbol' || callee.text === 'BigInt')
    && !bindings.lookup(callee).found;
}

function finiteOwnDescriptorsAt(
  expression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  at: ts.Node,
): FiniteOwnDescriptorResult {
  const root = syntacticExactAliasOrigin(expression, bindings, substitutions);
  if (root === undefined) return { properties: new Map(), unknown: true, prototype: { kind: 'unknown' } };
  return bindings.finiteDescriptorQuery(root, substitutions, at, () => computeFiniteOwnDescriptorsAt(root, bindings, substitutions, at));
}

function computeFiniteOwnDescriptorsAt(
  rootExpression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  at: ts.Node,
): FiniteOwnDescriptorResult {
  const properties = new Map<string, FiniteOwnDescriptor>();
  let unknown = false;
  const root = unwrap(rootExpression);
  let prototype: FinitePrototypeState = ts.isArrayLiteralExpression(root)
    ? { kind: 'builtin-array' }
    : { kind: 'builtin-object' };
  const propertyKey = (
    name: ts.PropertyName,
    projected: InvocationSubstitutions = substitutions,
  ): string | undefined => {
    if (!ts.isComputedPropertyName(name)) return propertyName(name);
    return resolveStaticString(name.expression, bindings, projected);
  };
  const seedObject = (
    object: ts.ObjectLiteralExpression,
    seen = new Set<ts.ObjectLiteralExpression>(),
    seedPrototype = false,
  ): void => {
    if (seen.has(object)) {
      unknown = true;
      return;
    }
    const nextSeen = new Set(seen).add(object);
    for (const property of object.properties) {
      if (ts.isSpreadAssignment(property)) {
        const spread = resolveAliasProvenance(property.expression, bindings, substitutions);
        if (spread.kind !== 'exact' || ts.isMethodDeclaration(spread.origin)) {
          unknown = true;
          continue;
        }
        const spreadOrigin = unwrap(spread.origin);
        if (!ts.isObjectLiteralExpression(spreadOrigin)) {
          unknown = true;
          continue;
        }
        const nested = new Map(properties);
        const beforeUnknown = unknown;
        properties.clear();
        seedObject(spreadOrigin, nextSeen);
        const spreadProperties = new Map(properties);
        properties.clear();
        for (const [key, descriptor] of nested) properties.set(key, descriptor);
        for (const [key, descriptor] of spreadProperties) {
          if (descriptor.kind === 'unknown' || descriptor.enumerable === 'unknown') unknown = true;
          if (descriptor.kind !== 'unknown' && descriptor.enumerable === true) {
            properties.set(key, { kind: 'data', enumerable: true, configurable: true });
          }
        }
        unknown ||= beforeUnknown;
        continue;
      }
      const key = propertyKey(property.name);
      if (key === undefined) {
        unknown = true;
        continue;
      }
      if (key === '__proto__' && !ts.isComputedPropertyName(property.name) && ts.isPropertyAssignment(property)) {
        if (seedPrototype) {
          const origin = syntacticExactAliasOrigin(property.initializer, bindings, substitutions);
          if (origin === undefined) prototype = { kind: 'unknown' };
          else if (unwrap(origin).kind === ts.SyntaxKind.NullKeyword) prototype = { kind: 'null' };
          else if (!definitelyPrimitiveExpression(origin, bindings, substitutions)) prototype = { kind: 'exact', expression: origin };
        }
        continue;
      }
      if (ts.isGetAccessorDeclaration(property) || ts.isSetAccessorDeclaration(property)) {
        const previous = properties.get(key);
        const accessor = previous?.kind === 'accessor'
          ? { ...previous }
          : { kind: 'accessor' as const, enumerable: true as const, configurable: true as const };
        if (ts.isGetAccessorDeclaration(property)) accessor.getter = property;
        else accessor.setter = property;
        properties.set(key, accessor);
      } else properties.set(key, { kind: 'data', enumerable: true, configurable: true });
    }
  };
  if (ts.isObjectLiteralExpression(root)) seedObject(root, new Set(), true);
  else if (!ts.isArrayLiteralExpression(root)) return { properties, unknown: true, prototype: { kind: 'unknown' } };

  const sameTarget = (
    candidate: ts.Expression,
    projected: InvocationSubstitutions = substitutions,
  ): boolean => {
    const candidateRoot = syntacticExactAliasOrigin(candidate, bindings, projected);
    return candidateRoot !== undefined && sameAliasOrigin(candidateRoot, root, bindings);
  };
  const field = (
    descriptor: ts.Expression,
    key: 'value' | 'get' | 'set' | 'enumerable' | 'configurable',
    projected: InvocationSubstitutions,
  ): AliasProvenance => {
    const descriptorProvenance = resolveAliasProvenance(descriptor, bindings, projected);
    if (descriptorProvenance.kind !== 'exact' || ts.isMethodDeclaration(descriptorProvenance.origin)) return descriptorProvenance;
    const object = unwrap(descriptorProvenance.origin);
    return ts.isObjectLiteralExpression(object)
      ? resolveObjectLiteralProperty(object, key, bindings, projected, new Set())
      : { kind: 'tainted' };
  };
  const booleanField = (
    descriptor: ts.Expression,
    key: 'enumerable' | 'configurable',
    fallback: boolean | 'unknown',
    projected: InvocationSubstitutions,
  ): boolean | 'unknown' => {
    const value = field(descriptor, key, projected);
    if (value.kind === 'absent') return fallback;
    if (value.kind !== 'exact' || ts.isMethodDeclaration(value.origin)) return 'unknown';
    return staticTruthValue(value.origin, bindings) ?? 'unknown';
  };
  const accessorTarget = (
    value: AliasProvenance,
    projected: InvocationSubstitutions,
  ): FiniteAccessorTarget | undefined | 'noncallable' => {
    if (value.kind === 'absent') return undefined;
    if (value.kind !== 'exact') return 'unknown';
    if (ts.isMethodDeclaration(value.origin)) return value.origin;
    if (definitelyUndefinedOrigin(value.origin, bindings)) return undefined;
    const target = localFunctionFromExpression(value.origin, bindings, projected, false);
    return target ?? 'noncallable';
  };
  const applyDescriptor = (
    key: string,
    descriptor: ts.Expression,
    uncertain: boolean,
    projected: InvocationSubstitutions,
  ): void => {
    if (uncertain) {
      properties.set(key, { kind: 'unknown' });
      return;
    }
    const previous = properties.get(key);
    const projectedValue = field(descriptor, 'value', projected);
    const projectedGetter = field(descriptor, 'get', projected);
    const projectedSetter = field(descriptor, 'set', projected);
    const hasValue = projectedValue.kind !== 'absent';
    const hasAccessor = projectedGetter.kind !== 'absent' || projectedSetter.kind !== 'absent';
    if (hasValue && hasAccessor) return;
    const enumerable = booleanField(
      descriptor,
      'enumerable',
      previous === undefined || previous.kind === 'unknown' ? false : previous.enumerable,
      projected,
    );
    const configurable = booleanField(
      descriptor,
      'configurable',
      previous === undefined || previous.kind === 'unknown' ? false : previous.configurable,
      projected,
    );
    if (hasAccessor) {
      const getter = accessorTarget(projectedGetter, projected);
      const setter = accessorTarget(projectedSetter, projected);
      if (getter === 'noncallable' || setter === 'noncallable') return;
      const previousAccessor = previous?.kind === 'accessor' ? previous : undefined;
      properties.set(key, {
        kind: 'accessor',
        ...(projectedGetter.kind === 'absent' ? { getter: previousAccessor?.getter } : { getter }),
        ...(projectedSetter.kind === 'absent' ? { setter: previousAccessor?.setter } : { setter }),
        enumerable,
        configurable,
      });
      return;
    }
    if (hasValue) {
      properties.set(key, projectedValue.kind === 'tainted'
        ? { kind: 'unknown' }
        : { kind: 'data', enumerable, configurable });
      return;
    }
    if (previous !== undefined) properties.set(key, previous.kind === 'unknown' ? previous : { ...previous, enumerable, configurable });
  };
  const uncertainExecution = (node: ts.Node, owner: ts.Node): boolean => {
    let current: ts.Node | undefined = node;
    while (current?.parent !== undefined && current.parent !== owner) {
      const parent: ts.Node = current.parent;
      if (ts.isIfStatement(parent) && staticTruthValue(parent.expression, bindings) === undefined) return true;
      if (ts.isConditionalExpression(parent) && staticTruthValue(parent.condition, bindings) === undefined) return true;
      if (
        ts.isForStatement(parent) || ts.isForInStatement(parent) || ts.isForOfStatement(parent)
        || ts.isWhileStatement(parent) || ts.isDoStatement(parent) || ts.isTryStatement(parent)
      ) return true;
      current = parent;
    }
    return false;
  };
  let owner: ts.Node | undefined = at;
  while (owner !== undefined && !isLexicalFunction(owner) && !ts.isSourceFile(owner)) owner = owner.parent;
  if (owner === undefined) return { properties, unknown: true, prototype: { kind: 'unknown' } };
  const processNode = (
    node: ts.Node,
    projected: InvocationSubstitutions,
    executionOwner: ts.Node,
    uncertainInvocation: boolean,
  ): void => {
    const uncertain = uncertainInvocation || uncertainExecution(node, executionOwner);
    const replacePrototype = (value: ts.Expression): void => {
      const origin = syntacticExactAliasOrigin(value, bindings, projected);
      prototype = uncertain || origin === undefined
        ? { kind: 'unknown' }
        : unwrap(origin).kind === ts.SyntaxKind.NullKeyword
          ? { kind: 'null' }
          : definitelyPrimitiveExpression(origin, bindings, projected)
            ? prototype
            : { kind: 'exact', expression: origin };
    };
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const member = staticMember(node.left);
      if (member !== undefined && sameTarget(member.base, projected)) {
        if (member.key === '__proto__') {
          const own = properties.get('__proto__');
          const selected: FiniteReachableDescriptor = own ?? (() => {
            if (prototype.kind === 'exact') {
              return finiteReachableDescriptorAt(prototype.expression, '__proto__', bindings, projected, node);
            }
            if (prototype.kind === 'unknown') return { kind: 'unknown' };
            if (prototype.kind === 'null') return { kind: 'absent' };
            return { kind: 'builtin-proto-setter' };
          })();
          if (selected.kind === 'builtin-proto-setter') replacePrototype(node.right);
          else if (own === undefined && (selected.kind === 'absent' || selected.kind === 'data')) {
            properties.set('__proto__', uncertain ? { kind: 'unknown' } : { kind: 'data', enumerable: true, configurable: true });
          } else if (selected.kind === 'unknown') {
            prototype = { kind: 'unknown' };
            properties.set('__proto__', { kind: 'unknown' });
          }
        } else properties.set(member.key, uncertain ? { kind: 'unknown' } : { kind: 'data', enumerable: true, configurable: true });
      }
    } else if (ts.isDeleteExpression(node)) {
      const member = staticMember(node.expression);
      if (member !== undefined && sameTarget(member.base, projected)) {
        const previous = properties.get(member.key);
        if (uncertain || previous?.kind === 'unknown' || previous?.configurable === 'unknown') properties.set(member.key, { kind: 'unknown' });
        else if (previous?.configurable === true) properties.delete(member.key);
      }
    } else if (ts.isCallExpression(node)) {
      const invocation = normalizeInvocation(node, bindings, projected);
      const api = resolveMutationApiIdentity(invocation.target, bindings, projected);
      const args = invocation.arguments;
      if (api?.exactGlobal !== true || invocation.unsupported !== undefined || args === undefined || args[0] === undefined) return;
      if (api.receiver === 'Object' && api.method === 'defineProperty' && sameTarget(args[0], projected)) {
        const key = args[1] === undefined ? undefined : resolveStaticString(args[1], bindings, projected);
        if (key === undefined || args[2] === undefined) unknown = true;
        else applyDescriptor(key, args[2], uncertain, projected);
      } else if (api.receiver === 'Object' && api.method === 'defineProperties' && sameTarget(args[0], projected)) {
        const descriptorProvenance = args[1] === undefined
          ? undefined
          : resolveAliasProvenance(args[1], bindings, projected);
        const descriptors = descriptorProvenance?.kind === 'exact' && !ts.isMethodDeclaration(descriptorProvenance.origin)
          ? unwrap(descriptorProvenance.origin)
          : undefined;
        if (descriptors === undefined || !ts.isObjectLiteralExpression(descriptors)) unknown = true;
        else {
          for (const property of descriptors.properties) {
            if (!ts.isPropertyAssignment(property)) {
              unknown = true;
              continue;
            }
            const key = propertyKey(property.name, projected);
            if (key === undefined) unknown = true;
            else applyDescriptor(key, property.initializer, uncertain, projected);
          }
        }
      } else if (api.receiver === 'Reflect' && api.method === 'deleteProperty' && sameTarget(args[0], projected)) {
        const key = args[1] === undefined ? undefined : resolveStaticString(args[1], bindings, projected);
        if (key === undefined) unknown = true;
        else {
          const previous = properties.get(key);
          if (uncertain || previous?.kind === 'unknown' || previous?.configurable === 'unknown') properties.set(key, { kind: 'unknown' });
          else if (previous?.configurable === true) properties.delete(key);
        }
      } else if (api.receiver === 'Object' && api.method === 'setPrototypeOf' && sameTarget(args[0], projected)) {
        if (args[1] === undefined || (
          unwrap(args[1]).kind !== ts.SyntaxKind.NullKeyword
          && definitelyPrimitiveExpression(args[1], bindings, projected)
        )) prototype = { kind: 'unknown' };
        else replacePrototype(args[1]);
      }
    }
  };
  const timeline = isLexicalFunction(owner) ? bindings.executableFunctionTimeline(owner) : undefined;
  const timelinePositions = timeline?.filter(item => item.node === at).map(item => item.sequence) ?? [];
  const atPosition = timelinePositions.length === 0 ? undefined : timelinePositions[timelinePositions.length - 1];
  if (timeline !== undefined && atPosition !== undefined) {
    for (const item of timeline) {
      if (item.sequence >= atPosition || isStaticallyDead(item.node, bindings)) continue;
      processNode(item.node, item.substitutions, item.current, item.execution !== 'known');
    }
  } else {
    const atStart = at.getStart(at.getSourceFile());
    const visit = (node: ts.Node): void => {
      if (node !== owner && ts.isFunctionLike(node)) return;
      if (node.getStart(node.getSourceFile()) >= atStart || isStaticallyDead(node, bindings)) return;
      processNode(node, substitutions, owner!, false);
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(owner, visit);
  }
  return { properties, unknown, prototype };
}

type FiniteReachableSetterResult = {
  setters: ReadonlyMap<string, ts.FunctionLikeDeclaration>;
  unknown: boolean;
};

function finiteReachableSettersAt(
  expression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  at: ts.Node,
  seen = new Set<ts.Expression>(),
): FiniteReachableSetterResult {
  const root = syntacticExactAliasOrigin(expression, bindings, substitutions);
  if (root === undefined || seen.has(root)) return { setters: new Map(), unknown: true };
  const descriptors = finiteOwnDescriptorsAt(root, bindings, substitutions, at);
  const setters = new Map<string, ts.FunctionLikeDeclaration>();
  let unknown = descriptors.unknown;
  for (const [key, descriptor] of descriptors.properties) {
    if (descriptor.kind === 'unknown') {
      unknown = true;
      continue;
    }
    if (descriptor.kind === 'accessor') {
      if (descriptor.setter === 'unknown') unknown = true;
      else if (descriptor.setter !== undefined) setters.set(key, descriptor.setter);
    }
  }
  if (descriptors.prototype.kind === 'unknown') unknown = true;
  else if (descriptors.prototype.kind === 'exact') {
    const inherited = finiteReachableSettersAt(
      descriptors.prototype.expression,
      bindings,
      substitutions,
      at,
      new Set(seen).add(root),
    );
    unknown ||= inherited.unknown;
    for (const [key, setter] of inherited.setters) {
      if (!descriptors.properties.has(key)) setters.set(key, setter);
    }
  }
  return { setters, unknown };
}

type FiniteReachableDescriptor = FiniteOwnDescriptor | { kind: 'absent' | 'builtin-proto-setter' };

function finiteReachableDescriptorAt(
  expression: ts.Expression,
  key: string,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  at: ts.Node,
  seen = new Set<ts.Expression>(),
): FiniteReachableDescriptor {
  const root = syntacticExactAliasOrigin(expression, bindings, substitutions);
  if (root === undefined || seen.has(root)) return { kind: 'unknown' };
  const descriptors = finiteOwnDescriptorsAt(root, bindings, substitutions, at);
  const own = descriptors.properties.get(key);
  if (own !== undefined) return own;
  if (descriptors.unknown) return { kind: 'unknown' };
  if (descriptors.prototype.kind === 'exact') {
    return finiteReachableDescriptorAt(
      descriptors.prototype.expression,
      key,
      bindings,
      substitutions,
      at,
      new Set(seen).add(root),
    );
  }
  if (descriptors.prototype.kind === 'unknown') return { kind: 'unknown' };
  if (descriptors.prototype.kind === 'null') return { kind: 'absent' };
  return key === '__proto__' ? { kind: 'builtin-proto-setter' } : { kind: 'absent' };
}

type FiniteProxyInfo = {
  target: ts.Expression;
  handler?: ts.ObjectLiteralExpression;
  unknownHandler: boolean;
};

function finiteProxyInfo(
  expression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
): FiniteProxyInfo | undefined {
  const root = syntacticExactAliasOrigin(expression, bindings, substitutions);
  if (root === undefined) return undefined;
  const candidate = unwrap(root);
  if (!ts.isNewExpression(candidate) || candidate.arguments?.length !== 2) return undefined;
  const callee = unwrap(candidate.expression);
  if (!ts.isIdentifier(callee) || callee.text !== 'Proxy' || bindings.lookup(callee).found) return undefined;
  const handlerProvenance = resolveAliasProvenance(candidate.arguments[1], bindings, substitutions);
  const handler = handlerProvenance.kind === 'exact' && !ts.isMethodDeclaration(handlerProvenance.origin)
    ? unwrap(handlerProvenance.origin)
    : undefined;
  return {
    target: candidate.arguments[0],
    ...(handler !== undefined && ts.isObjectLiteralExpression(handler) ? { handler } : {}),
    unknownHandler: handler === undefined || !ts.isObjectLiteralExpression(handler),
  };
}

function finiteProxyTrap(
  proxy: FiniteProxyInfo,
  trap: 'set' | 'defineProperty',
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
): ts.FunctionLikeDeclaration | 'unknown' | undefined {
  if (proxy.unknownHandler || proxy.handler === undefined) return 'unknown';
  const value = resolveObjectLiteralProperty(proxy.handler, trap, bindings, substitutions, new Set());
  if (value.kind === 'absent') return undefined;
  if (value.kind !== 'exact') return 'unknown';
  if (ts.isMethodDeclaration(value.origin)) return value.origin;
  if (definitelyUndefinedOrigin(value.origin, bindings)) return undefined;
  return localFunctionFromExpression(value.origin, bindings, substitutions, false) ?? 'unknown';
}

type FiniteCopyEntry = {
  key: string;
  getter?: FiniteAccessorTarget;
  value: InvocationValue;
};

function invocationValueFromProvenance(provenance: AliasProvenance): InvocationValue {
  if (provenance.kind === 'absent') return 'absent';
  if (provenance.kind === 'tainted' || ts.isMethodDeclaration(provenance.origin)) return 'tainted';
  return provenance.origin;
}

type FiniteCopiedValue =
  | { kind: 'present'; value: InvocationValue }
  | { kind: 'absent' | 'unknown' };

function finiteCopiedObjectValue(
  expression: ts.Expression,
  key: string,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  seen = new Set<ts.Expression>(),
): FiniteCopiedValue {
  const root = syntacticExactAliasOrigin(expression, bindings, substitutions);
  if (root === undefined || seen.has(root)) return { kind: 'unknown' };
  const object = unwrap(root);
  if (!ts.isObjectLiteralExpression(object)) return { kind: 'unknown' };
  const nextSeen = new Set(seen).add(root);
  for (let index = object.properties.length - 1; index >= 0; index -= 1) {
    const property = object.properties[index];
    if (ts.isSpreadAssignment(property)) {
      const nested = finiteCopiedObjectValue(property.expression, key, bindings, substitutions, nextSeen);
      if (nested.kind !== 'absent') return nested;
      continue;
    }
    const propertyKey = ts.isComputedPropertyName(property.name)
      ? resolveStaticString(property.name.expression, bindings, substitutions)
      : propertyName(property.name);
    if (propertyKey === undefined) return { kind: 'unknown' };
    if (propertyKey !== key) continue;
    if (ts.isPropertyAssignment(property)) return { kind: 'present', value: property.initializer };
    if (ts.isShorthandPropertyAssignment(property)) return { kind: 'present', value: property.name };
    if (ts.isGetAccessorDeclaration(property)) {
      return {
        kind: 'present',
        value: invocationValueFromProvenance(
          summarizeFunctionReturnProvenance(property, [], bindings, substitutions, object),
        ),
      };
    }
    if (ts.isSetAccessorDeclaration(property)) return { kind: 'present', value: 'absent' };
    return { kind: 'present', value: 'tainted' };
  }
  return { kind: 'absent' };
}

function finiteObjectCopyEntries(
  expression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  at: ts.Node,
): { entries: readonly FiniteCopyEntry[]; unknown: boolean } {
  const root = syntacticExactAliasOrigin(expression, bindings, substitutions);
  if (root === undefined) return { entries: [], unknown: true };
  const descriptors = finiteOwnDescriptorsAt(root, bindings, substitutions, at);
  const literal = unwrap(root);
  const entries: FiniteCopyEntry[] = [];
  let unknown = descriptors.unknown;
  for (const [key, descriptor] of descriptors.properties) {
    if (descriptor.kind === 'unknown' || descriptor.enumerable === 'unknown') {
      unknown = true;
      continue;
    }
    if (descriptor.enumerable !== true) continue;
    if (descriptor.kind === 'accessor') {
      if (descriptor.getter === 'unknown') unknown = true;
      else entries.push({
        key,
        getter: descriptor.getter,
        value: descriptor.getter === undefined
          ? 'absent'
          : invocationValueFromProvenance(
            summarizeFunctionReturnProvenance(descriptor.getter, [], bindings, substitutions, root),
          ),
      });
      continue;
    }
    let value: InvocationValue = 'tainted';
    if (ts.isObjectLiteralExpression(literal)) {
      const copied = finiteCopiedObjectValue(literal, key, bindings, substitutions);
      if (copied.kind === 'absent') value = 'absent';
      else if (copied.kind === 'present') value = copied.value;
    } else if (ts.isArrayLiteralExpression(literal) && /^\d+$/u.test(key)) {
      const element = literal.elements[Number(key)];
      if (element === undefined || ts.isOmittedExpression(element)) value = 'absent';
      else if (!ts.isSpreadElement(element)) value = element;
    }
    entries.push({ key, value });
  }
  return { entries, unknown };
}

function finiteObjectSpreadGetters(
  expression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  at?: ts.Node,
  seen = new Set<ts.ObjectLiteralExpression>(),
): { getters: readonly ts.FunctionLikeDeclaration[]; properties: ReadonlyMap<string, ts.FunctionLikeDeclaration | undefined>; unknown: boolean } {
  if (at !== undefined) {
    const descriptors = finiteOwnDescriptorsAt(expression, bindings, substitutions, at);
    const properties = new Map<string, ts.FunctionLikeDeclaration | undefined>();
    let unknown = descriptors.unknown;
    for (const [key, descriptor] of descriptors.properties) {
      if (descriptor.kind === 'unknown' || descriptor.enumerable === 'unknown') {
        unknown = true;
        continue;
      }
      if (descriptor.enumerable !== true) continue;
      const getter = descriptor.kind === 'accessor' ? descriptor.getter : undefined;
      if (getter === 'unknown') unknown = true;
      else properties.set(key, getter);
    }
    return { getters: [...properties.values()].filter((getter): getter is ts.FunctionLikeDeclaration => getter !== undefined), properties, unknown };
  }
  const provenance = resolveAliasProvenance(expression, bindings, substitutions);
  if (provenance.kind !== 'exact' || ts.isMethodDeclaration(provenance.origin)) return { getters: [], properties: new Map(), unknown: true };
  const object = unwrap(provenance.origin);
  if (!ts.isObjectLiteralExpression(object) || seen.has(object)) return { getters: [], properties: new Map(), unknown: true };
  const nextSeen = new Set(seen).add(object);
  const properties = new Map<string, ts.FunctionLikeDeclaration | undefined>();
  let unknown = false;
  for (const property of object.properties) {
    if (ts.isSpreadAssignment(property)) {
      const nested = finiteObjectSpreadGetters(property.expression, bindings, substitutions, undefined, nextSeen);
      unknown ||= nested.unknown;
      for (const [key, getter] of nested.properties) properties.set(key, getter);
      continue;
    }
    const key = ts.isComputedPropertyName(property.name)
      ? resolveStaticString(property.name.expression, bindings, substitutions)
      : propertyName(property.name);
    if (key === undefined) {
      unknown = true;
      continue;
    }
    properties.set(key, ts.isGetAccessorDeclaration(property) ? property : undefined);
  }
  return { getters: [...properties.values()].filter((getter): getter is ts.FunctionLikeDeclaration => getter !== undefined), properties, unknown };
}

function finiteIteratorMethod(
  expression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  seen = new Set<ts.ObjectLiteralExpression>(),
): ts.MethodDeclaration | ts.FunctionExpression | ts.ArrowFunction | 'unknown' | undefined {
  const provenance = resolveAliasProvenance(expression, bindings, substitutions);
  if (provenance.kind !== 'exact' || ts.isMethodDeclaration(provenance.origin)) return 'unknown';
  const value = unwrap(provenance.origin);
  if (ts.isArrayLiteralExpression(value)) return undefined;
  if (!ts.isObjectLiteralExpression(value) || seen.has(value)) return 'unknown';
  const nextSeen = new Set(seen).add(value);
  for (let index = value.properties.length - 1; index >= 0; index -= 1) {
    const property = value.properties[index];
    if (ts.isSpreadAssignment(property)) {
      const nested = finiteIteratorMethod(property.expression, bindings, substitutions, nextSeen);
      if (nested !== undefined) return nested;
      continue;
    }
    if (!ts.isComputedPropertyName(property.name)) continue;
    const iterator = staticMember(property.name.expression);
    const receiver = iterator === undefined ? undefined : unwrap(iterator.base);
    const exactIterator = iterator?.key === 'iterator'
      && receiver !== undefined
      && ts.isIdentifier(receiver)
      && receiver.text === 'Symbol'
      && !bindings.lookup(receiver).found;
    if (!exactIterator) return 'unknown';
    if (ts.isMethodDeclaration(property)) return property;
    if (ts.isPropertyAssignment(property)) {
      const target = localFunctionFromExpression(property.initializer, bindings, substitutions, false);
      return target !== undefined && (ts.isFunctionExpression(target) || ts.isArrowFunction(target) || ts.isMethodDeclaration(target))
        ? target
        : 'unknown';
    }
    return 'unknown';
  }
  return undefined;
}

function visitExecutableFunctionNodes(
  owner: ts.FunctionLikeDeclaration,
  bindings: LexicalBindings,
  visitor: (
    node: ts.Node,
    substitutions: InvocationSubstitutions,
    execution: 'known' | 'unmodeled-callback',
    sequence: number,
    current: ts.FunctionLikeDeclaration,
    conditions: readonly ConditionalExecutionContext[],
  ) => void,
  invokeMapCallbacks = false,
  initialInvocation?: {
    arguments: readonly InvocationValue[];
    substitutions: InvocationSubstitutions;
    execution: 'known' | 'unmodeled-callback';
  },
  relevantBindings: readonly ts.Identifier[] = [],
  strictUnknownAccessEffects = false,
): void {
  const active = new Set<ts.FunctionLikeDeclaration>([owner]);
  const invocationConditions = new Map<ts.FunctionLikeDeclaration, readonly ConditionalExecutionContext[]>();
  const nodeConditions = new WeakMap<ts.Node, readonly ConditionalExecutionContext[]>();
  const synchronousArrayCallbacks = new Set(['map', 'forEach']);
  const obviouslyNonThrowingExpression = (candidate: ts.Expression): boolean => {
    const expression = unwrap(candidate);
    if (
      ts.isStringLiteral(expression)
      || ts.isNoSubstitutionTemplateLiteral(expression)
      || ts.isNumericLiteral(expression)
      || ts.isBigIntLiteral(expression)
      || ts.isRegularExpressionLiteral(expression)
      || expression.kind === ts.SyntaxKind.TrueKeyword
      || expression.kind === ts.SyntaxKind.FalseKeyword
      || expression.kind === ts.SyntaxKind.NullKeyword
      || ts.isArrowFunction(expression)
      || ts.isFunctionExpression(expression)
    ) return true;
    if (ts.isArrayLiteralExpression(expression)) return expression.elements.every(element => (
      ts.isOmittedExpression(element)
      || (!ts.isSpreadElement(element) && obviouslyNonThrowingExpression(element))
    ));
    if (ts.isObjectLiteralExpression(expression)) return expression.properties.every(property => (
      ts.isPropertyAssignment(property)
        ? !ts.isComputedPropertyName(property.name) && obviouslyNonThrowingExpression(property.initializer)
        : (ts.isMethodDeclaration(property) || ts.isGetAccessorDeclaration(property) || ts.isSetAccessorDeclaration(property))
          && !ts.isComputedPropertyName(property.name)
    ));
    if (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.ExclamationToken) return obviouslyNonThrowingExpression(expression.operand);
    if (ts.isVoidExpression(expression)) return obviouslyNonThrowingExpression(expression.expression);
    return false;
  };
  const statementMayThrow = (statement: ts.Statement): boolean => {
    if (ts.isEmptyStatement(statement) || ts.isFunctionDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) return false;
    if (ts.isExpressionStatement(statement)) return !obviouslyNonThrowingExpression(statement.expression);
    if (ts.isVariableStatement(statement)) return statement.declarationList.declarations.some(declaration => (
      !ts.isIdentifier(declaration.name)
      || (declaration.initializer !== undefined && !obviouslyNonThrowingExpression(declaration.initializer))
    ));
    if (ts.isBlock(statement)) return statement.statements.some(statementMayThrow);
    return true;
  };
  const lexicalConditions = (
    node: ts.Node,
    current: ts.FunctionLikeDeclaration,
    substitutions: InvocationSubstitutions,
  ): ConditionalExecutionContext[] => {
    const conditions: ConditionalExecutionContext[] = [];
    let child: ts.Node = node;
    while (child !== current && child.parent !== undefined) {
      const parent = child.parent;
      if (ts.isIfStatement(parent)) {
        const truth = staticTruthValue(parent.expression, bindings);
        if (truth === undefined) {
          if (child === parent.thenStatement) conditions.push({ owner: parent, arm: 'then', substitutions });
          else if (child === parent.elseStatement) conditions.push({ owner: parent, arm: 'else', substitutions });
        }
      } else if (ts.isConditionalExpression(parent) && staticTruthValue(parent.condition, bindings) === undefined) {
        if (child === parent.whenTrue) conditions.push({ owner: parent, arm: 'true', substitutions });
        else if (child === parent.whenFalse) conditions.push({ owner: parent, arm: 'false', substitutions });
      } else if (
        ts.isBinaryExpression(parent)
        && child === parent.right
        && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(parent.operatorToken.kind)
      ) {
        const truth = staticTruthValue(parent.left, bindings);
        const nullish = staticNullishValue(parent.left, bindings);
        const conditional = (parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && truth === undefined)
          || (parent.operatorToken.kind === ts.SyntaxKind.BarBarToken && truth === undefined)
          || (parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken && nullish === undefined);
        if (conditional) conditions.push({ owner: parent, arm: 'right', substitutions });
      } else if (ts.isCaseClause(parent) || ts.isDefaultClause(parent)) {
        const caseBlock = parent.parent;
        const switchStatement = ts.isCaseBlock(caseBlock) && ts.isSwitchStatement(caseBlock.parent) ? caseBlock.parent : undefined;
        if (switchStatement !== undefined) conditions.push({
          owner: switchStatement,
          arm: String(caseBlock.clauses.indexOf(parent)),
          substitutions,
        });
      } else if (
        (ts.isForInStatement(parent) || ts.isForOfStatement(parent))
        && child === parent.statement
      ) {
        conditions.push({ owner: parent, arm: 'body', substitutions });
      } else if (ts.isForStatement(parent) && child === parent.statement) {
        const truth = parent.condition === undefined ? true : staticTruthValue(parent.condition, bindings);
        if (truth !== true) conditions.push({ owner: parent, arm: 'body', substitutions });
      } else if (ts.isWhileStatement(parent) && child === parent.statement && staticTruthValue(parent.expression, bindings) !== true) {
        conditions.push({ owner: parent, arm: 'body', substitutions });
      } else if (ts.isBlock(parent) && ts.isStatement(child) && ts.isTryStatement(parent.parent) && parent.parent.tryBlock === parent) {
        const index = parent.statements.indexOf(child);
        if (index > 0 && parent.statements.slice(0, index).some(statementMayThrow)) {
          conditions.push({ owner: parent.parent, arm: 'try-after-possibly-throwing', substitutions });
        }
      } else if (ts.isCatchClause(parent) && child === parent.block) {
        conditions.push({ owner: parent, arm: 'catch', substitutions });
      }
      child = parent;
    }
    return conditions.reverse();
  };
  const mergeConditions = (
    inherited: readonly ConditionalExecutionContext[],
    local: readonly ConditionalExecutionContext[],
  ): readonly ConditionalExecutionContext[] => {
    const merged: ConditionalExecutionContext[] = [...inherited];
    for (const condition of local) {
      if (!merged.some(existing => existing.owner === condition.owner && existing.arm === condition.arm)) merged.push(condition);
    }
    return merged;
  };
  const finiteProjectedValue = (
    expression: ts.Expression,
    substitutions: InvocationSubstitutions,
  ): InvocationValue => {
    const provenance = resolveAliasProvenance(expression, bindings, substitutions);
    const exactUndefined = ts.isIdentifier(expression)
      && expression.text === 'undefined'
      && !bindings.lookup(expression).found;
    return !exactUndefined && (provenance.kind !== 'exact'
      || ts.isMethodDeclaration(provenance.origin)
      || (ts.isIdentifier(provenance.origin)
        && !bindings.lookup(provenance.origin).found
        && !bindings.isExactImportBinding(provenance.origin)))
      ? 'tainted'
      : expression;
  };
  let sequence = 0;
  const replayedObjectSpreads = new Set<ts.SpreadAssignment>();
  const hasPotentialEffect = (target: ts.FunctionLikeDeclaration): boolean => {
    let found = false;
    const inspect = (node: ts.Node): void => {
      if (found || isStaticallyDead(node, bindings) || (node !== target && ts.isFunctionLike(node))) return;
      if (
        ts.isDeleteExpression(node)
        || (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind))
        || ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator))
      ) {
        found = true;
        return;
      }
      if (ts.isCallExpression(node)) {
        const recursiveIdentifier = ts.isIdentifier(unwrap(node.expression)) ? unwrap(node.expression) as ts.Identifier : undefined;
        const initializer = recursiveIdentifier === undefined
          ? undefined
          : bindings.declarationInitializer(recursiveIdentifier)
            ?? bindings.uniqueLexicalInitializer(recursiveIdentifier);
        const forwardAlias = initializer === undefined
          ? undefined
          : localFunctionFromExpression(initializer, bindings, new Map(), false);
        const recursiveTarget = forwardAlias === target
          ? forwardAlias
          : recursiveIdentifier === undefined
            ? undefined
            : localFunctionFromExpression(recursiveIdentifier, bindings, new Map(), false);
        if (
          recursiveTarget !== target
          && (recursiveIdentifier === undefined || target.name === undefined || !ts.isIdentifier(target.name) || !bindings.isBinding(recursiveIdentifier, target.name))
        ) {
          found = true;
          return;
        }
      }
      ts.forEachChild(node, inspect);
    };
    for (const parameter of target.parameters) inspect(parameter);
    if (target.body === undefined) return found;
    inspect(target.body);
    return found;
  };
  let visit: (
    node: ts.Node,
    substitutions: InvocationSubstitutions,
    current: ts.FunctionLikeDeclaration,
    execution: 'known' | 'unmodeled-callback',
  ) => void;
  const invoke = (
    site: ts.Node,
    target: ts.FunctionLikeDeclaration,
    argumentsToBind: readonly InvocationValue[] | undefined,
    targetExecution: 'known' | 'unmodeled-callback',
    substitutions: InvocationSubstitutions,
    thisValue: InvocationValue = 'absent',
  ): void => {
    if (target.body === undefined) return;
    if (active.has(target)) {
      if (hasPotentialEffect(target)) fail(site, `unsupported recursive local invocation: tainted effect provenance cycle for ${target.name?.getText() ?? '<anonymous>'}`);
      return;
    }
    const defaultEffects: InvocationDefaultEffect[] = [];
    const accessEffects: InvocationAccessEffect[] = [];
    const next = projectInvocationParameters(
      target.parameters,
      argumentsToBind ?? target.parameters.map(() => 'tainted' as const),
      bindings,
      substitutions,
      defaultEffects,
      accessEffects,
      site,
    );
    bindings.registerInvocationQueryContext(next, substitutions, site);
    if (ts.isGetAccessorDeclaration(target) || ts.isSetAccessorDeclaration(target)) {
      const parameterValues = new Map<string, InvocationValue>();
      for (const parameter of target.parameters) {
        for (const identifier of bindingIdentifiers(parameter.name)) {
          const value = next.get(identifier);
          if (value !== undefined) parameterValues.set(identifier.text, value);
        }
      }
      const declaredWithinTarget = (declaration: ts.Node): boolean => {
        let current: ts.Node | undefined = declaration;
        while (current !== undefined && current !== target) current = current.parent;
        return current === target;
      };
      const bindAccessorParameters = (candidate: ts.Node): void => {
        if (candidate !== target.body && ts.isFunctionLike(candidate)) return;
        if (ts.isIdentifier(candidate)) {
          const value = parameterValues.get(candidate.text);
          if (value !== undefined) {
            const lookup = bindings.lookup(candidate);
            if (!lookup.found || (lookup.event?.name !== undefined && !declaredWithinTarget(lookup.event.name))) {
              next.set(candidate, value);
            }
          }
        }
        ts.forEachChild(candidate, bindAccessorParameters);
      };
      bindAccessorParameters(target.body);
    }
    if (!ts.isArrowFunction(target)) {
      const bindThis = (candidate: ts.Node): void => {
        if (candidate.kind === ts.SyntaxKind.ThisKeyword) {
          next.set(candidate, thisValue);
          return;
        }
        if (candidate !== target.body && ts.isFunctionLike(candidate) && !ts.isArrowFunction(candidate)) return;
        ts.forEachChild(candidate, bindThis);
      };
      bindThis(target.body);
    }
    const priorConditions = invocationConditions.get(target);
    invocationConditions.set(target, nodeConditions.get(site) ?? []);
    active.add(target);
    try {
      for (const effect of accessEffects) invoke(site, effect.target, [], targetExecution, substitutions, effect.receiver);
      for (const effect of defaultEffects) {
        visit(
          effect.expression,
          effect.substitutions,
          target,
          effect.selection === 'maybe' ? 'unmodeled-callback' : targetExecution,
        );
      }
      visit(target.body, next, target, targetExecution);
    } finally {
      active.delete(target);
      if (priorConditions === undefined) invocationConditions.delete(target);
      else invocationConditions.set(target, priorConditions);
    }
  };
  visit = (
    node: ts.Node,
    substitutions: InvocationSubstitutions,
    current: ts.FunctionLikeDeclaration,
    execution: 'known' | 'unmodeled-callback',
  ): void => {
    if (isStaticallyDead(node, bindings)) return;
    if (node !== current && ts.isFunctionLike(node)) return;
    const conditions = mergeConditions(
      invocationConditions.get(current) ?? [],
      lexicalConditions(node, current, substitutions),
    );
    nodeConditions.set(node, conditions);
    let normalizedCall: {
      invocation: NormalizedInvocation;
      activeForwardTarget?: ts.FunctionLikeDeclaration;
      mutationApi?: MutationApiIdentity;
    } | undefined;
    let computeNormalizedCall: (() => {
      invocation: NormalizedInvocation;
      activeForwardTarget?: ts.FunctionLikeDeclaration;
      mutationApi?: MutationApiIdentity;
    }) | undefined;
    if (ts.isCallExpression(node)) {
      computeNormalizedCall = () => {
        const rawIdentifier = ts.isIdentifier(unwrap(node.expression)) ? unwrap(node.expression) as ts.Identifier : undefined;
        const forwardInitializer = rawIdentifier === undefined
          ? undefined
          : bindings.declarationInitializer(rawIdentifier)
            ?? bindings.uniqueLexicalInitializer(rawIdentifier);
        const forwardTarget = forwardInitializer === undefined
          ? undefined
          : localFunctionFromExpression(forwardInitializer, bindings, substitutions, false);
        const activeForwardTarget = forwardTarget !== undefined && active.has(forwardTarget) ? forwardTarget : undefined;
        const forwardArguments = activeForwardTarget === undefined ? undefined : finiteInvocationArgumentList(node.arguments, bindings);
        const invocation: NormalizedInvocation = activeForwardTarget === undefined
          ? normalizeInvocation(node, bindings, substitutions)
          : forwardArguments === undefined
            ? { target: forwardInitializer!, unsupported: 'dynamic or ambiguous argument spread' }
            : { target: forwardInitializer!, arguments: forwardArguments };
        const mutationApi = resolveMutationApiIdentity(invocation.target, bindings, substitutions);
        return { invocation, activeForwardTarget, mutationApi };
      };
      const preflightCandidate = preflightMutationApiCandidate(node, bindings, substitutions);
      if (preflightCandidate !== undefined) {
        normalizedCall = normalizedMutationInvocationIdentity(node, bindings, substitutions, preflightCandidate);
      }
      const exactOwnCallable = (expression: ts.Expression | undefined, key: string): ts.FunctionLikeDeclaration | undefined => {
        if (expression === undefined) return undefined;
        const root = syntacticExactAliasOrigin(expression, bindings, substitutions);
        if (root === undefined || !ts.isObjectLiteralExpression(unwrap(root))) return undefined;
        const object = unwrap(root) as ts.ObjectLiteralExpression;
        for (let index = object.properties.length - 1; index >= 0; index -= 1) {
          const property = object.properties[index];
          if (ts.isSpreadAssignment(property)) break;
          const propertyKey = ts.isComputedPropertyName(property.name)
            ? resolveStaticString(property.name.expression, bindings, substitutions)
            : propertyName(property.name);
          if (propertyKey === undefined) break;
          if (propertyKey !== key) continue;
          if (ts.isGetAccessorDeclaration(property) || ts.isMethodDeclaration(property)) return property;
          if (ts.isPropertyAssignment(property)) return localFunctionFromExpression(property.initializer, bindings, substitutions, false);
          return undefined;
        }
        const selected = resolveObjectLiteralProperty(object, key, bindings, substitutions, new Set());
        if (selected.kind !== 'exact') return undefined;
        return ts.isMethodDeclaration(selected.origin)
          ? selected.origin
          : localFunctionFromExpression(selected.origin, bindings, substitutions, false);
      };
      const mutationApi = normalizedCall?.mutationApi;
      const preflightArguments = normalizedCall?.invocation.arguments;
      const exactPreflightApi = mutationApi?.exactGlobal === true && (
        (mutationApi.receiver === 'Reflect' && mutationApi.method === 'set')
        || (mutationApi.receiver === 'Object' && (mutationApi.method === 'defineProperty' || mutationApi.method === 'defineProperties'))
      );
      if (
        exactPreflightApi
        && preflightArguments !== undefined
        && preflightArguments[0] !== undefined
        && !definitelyPrimitiveExpression(preflightArguments[0], bindings, substitutions)
      ) {
        if (
          (mutationApi.receiver === 'Reflect' && mutationApi.method === 'set')
          || (mutationApi.receiver === 'Object' && mutationApi.method === 'defineProperty')
        ) {
          const keyCoercion = exactOwnCallable(preflightArguments[1], 'toString');
          if (keyCoercion !== undefined && functionDefinitelyThrows(keyCoercion)) {
            invoke(node, keyCoercion, [], execution, substitutions, preflightArguments[1]);
            return;
          }
        }
        if (mutationApi.receiver === 'Object' && mutationApi.method === 'defineProperty') {
          for (const field of ['enumerable', 'configurable', 'value', 'writable', 'get', 'set'] as const) {
            const fieldGetter = exactOwnCallable(preflightArguments[2], field);
            if (fieldGetter === undefined) continue;
            if (functionDefinitelyThrows(fieldGetter)) {
              invoke(node, fieldGetter, [], execution, substitutions, preflightArguments[2]);
              return;
            }
            break;
          }
        }
        if (mutationApi.receiver === 'Object' && mutationApi.method === 'defineProperties' && preflightArguments[1] !== undefined) {
          type ConstructionEffect = {
            target: ts.FunctionLikeDeclaration;
            receiver: ts.Expression;
            spread: ts.SpreadAssignment;
          };
          const constructionPlan = (
            expression: ts.Expression,
            seen = new Set<ts.Expression>(),
          ): { effects: readonly ConstructionEffect[]; abrupt: boolean } => {
            const root = syntacticExactAliasOrigin(expression, bindings, substitutions);
            if (root === undefined || seen.has(root)) return { effects: [], abrupt: false };
            const object = unwrap(root);
            if (!ts.isObjectLiteralExpression(object)) return { effects: [], abrupt: false };
            const nextSeen = new Set(seen).add(root);
            const effects: ConstructionEffect[] = [];
            for (const property of object.properties) {
              if (ts.isPropertyAssignment(property) && ts.isObjectLiteralExpression(unwrap(property.initializer))) {
                const nested = constructionPlan(property.initializer, nextSeen);
                effects.push(...nested.effects);
                if (nested.abrupt) return { effects, abrupt: true };
                continue;
              }
              if (!ts.isSpreadAssignment(property)) continue;
              if (ts.isObjectLiteralExpression(unwrap(property.expression))) {
                const nested = constructionPlan(property.expression, nextSeen);
                effects.push(...nested.effects);
                if (nested.abrupt) return { effects, abrupt: true };
              }
              const copied = finiteObjectCopyEntries(property.expression, bindings, substitutions, node);
              for (const entry of copied.entries) {
                if (entry.getter === undefined || entry.getter === 'unknown') continue;
                effects.push({ target: entry.getter, receiver: property.expression, spread: property });
                if (functionDefinitelyThrows(entry.getter)) return { effects, abrupt: true };
              }
            }
            return { effects, abrupt: false };
          };
          const mapConstruction = constructionPlan(preflightArguments[1]);
          if (ts.isObjectLiteralExpression(unwrap(preflightArguments[1]))) {
            for (const effect of mapConstruction.effects) {
              replayedObjectSpreads.add(effect.spread);
              invoke(node, effect.target, [], execution, substitutions, effect.receiver);
            }
          }
          if (mapConstruction.abrupt) return;
          const copied = finiteObjectCopyEntries(preflightArguments[1], bindings, substitutions, node);
          const pending: Array<{ target: ts.FunctionLikeDeclaration; receiver: ts.Expression }> = [];
          for (const entry of copied.entries) {
            if (entry.getter !== undefined && entry.getter !== 'unknown') {
              pending.push({ target: entry.getter, receiver: preflightArguments[1] });
              if (functionDefinitelyThrows(entry.getter)) {
                for (const effect of pending) invoke(node, effect.target, [], execution, substitutions, effect.receiver);
                return;
              }
            }
            if (typeof entry.value !== 'string' && !ts.isObjectLiteralExpression(unwrap(entry.value))) {
              const priorConstruction = constructionPlan(entry.value);
              if (priorConstruction.abrupt) return;
            }
            if (typeof entry.value === 'string' || definitelyPrimitiveExpression(entry.value, bindings, substitutions)) continue;
            for (const field of ['enumerable', 'configurable', 'value', 'writable', 'get', 'set'] as const) {
              const selected = finiteReachableDescriptorAt(entry.value, field, bindings, substitutions, node);
              if (selected.kind !== 'accessor' || selected.getter === undefined || selected.getter === 'unknown') continue;
              pending.push({ target: selected.getter, receiver: entry.value });
              if (functionDefinitelyThrows(selected.getter)) {
                for (const effect of pending) invoke(node, effect.target, [], execution, substitutions, effect.receiver);
                return;
              }
            }
          }
        }
      }
    }
    visitor(node, substitutions, execution, sequence++, current, conditions);
    if (
      ts.isVariableDeclaration(node)
      && node.initializer !== undefined
      && (ts.isObjectBindingPattern(node.name) || ts.isArrayBindingPattern(node.name))
      && !node.name.elements.some(element => (
        !ts.isOmittedExpression(element)
        && (ts.isObjectBindingPattern(element.name) || ts.isArrayBindingPattern(element.name))
      ))
    ) {
      visit(node.initializer, substitutions, current, execution);
      const defaultEffects: InvocationDefaultEffect[] = [];
      const accessEffects: InvocationAccessEffect[] = [];
      projectInvocationParameters(
        [{ name: node.name, dotDotDotToken: undefined, initializer: undefined }],
        [node.initializer],
        bindings,
        substitutions,
        defaultEffects,
        accessEffects,
        node,
      );
      for (const effect of accessEffects) invoke(node, effect.target, [], execution, substitutions, effect.receiver);
      for (const effect of defaultEffects) {
        visit(
          effect.expression,
          effect.substitutions,
          current,
          effect.selection === 'maybe' ? 'unmodeled-callback' : execution,
        );
      }
      return;
    }
    if (ts.isForOfStatement(node)) {
      visit(node.expression, substitutions, current, execution);
      const iterator = finiteIteratorMethod(node.expression, bindings, substitutions);
      if (iterator !== undefined && iterator !== 'unknown') invoke(node, iterator, [], execution, substitutions, node.expression);
      visit(node.initializer, substitutions, current, execution);
      visit(node.statement, substitutions, current, execution);
      return;
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const member = staticMember(node.left);
      if (member?.key === '__proto__') {
        const selected = finiteReachableDescriptorAt(member.base, '__proto__', bindings, substitutions, node);
        if (selected.kind === 'accessor') {
          if (selected.setter === 'unknown') {
            if (strictUnknownAccessEffects && relevantBindings.some(binding => (
              expressionBindingReachability(member.base, binding, bindings, substitutions) !== 'unrelated'
              || expressionBindingReachability(node.right, binding, bindings, substitutions) !== 'unrelated'
            ))) fail(node, 'unsupported __proto__ assignment: tainted setter provenance');
          } else if (selected.setter !== undefined) {
            invoke(node, selected.setter, [node.right], execution, substitutions, member.base);
          }
        } else if (selected.kind === 'unknown' && strictUnknownAccessEffects && relevantBindings.some(binding => (
          expressionBindingReachability(member.base, binding, bindings, substitutions) !== 'unrelated'
          || expressionBindingReachability(node.right, binding, bindings, substitutions) !== 'unrelated'
        ))) {
          fail(node, 'unsupported __proto__ assignment: unknown descriptor provenance');
        }
      }
    }
    if (ts.isSpreadAssignment(node)) {
      if (!replayedObjectSpreads.has(node)) {
        const access = finiteObjectSpreadGetters(node.expression, bindings, substitutions, node);
        for (const getter of access.getters) invoke(node, getter, [], execution, substitutions, node.expression);
        if (access.unknown && strictUnknownAccessEffects && relevantBindings.some(binding => (
          expressionBindingReachability(node.expression, binding, bindings, substitutions) === 'relevant'
        ))) {
          fail(node, 'unsupported object spread: tainted accessor provenance may consume relevant identity');
        }
      }
    }
    if (ts.isSpreadElement(node)) {
      const iterator = finiteIteratorMethod(node.expression, bindings, substitutions);
      if (iterator === 'unknown') {
        if (strictUnknownAccessEffects && relevantBindings.some(binding => (
          expressionBindingReachability(node.expression, binding, bindings, substitutions) === 'relevant'
        ))) {
          fail(node, 'unsupported spread: tainted iterator provenance may consume relevant identity');
        }
      } else if (iterator !== undefined) invoke(node, iterator, [], execution, substitutions, node.expression);
    }
    if (ts.isCallExpression(node)) {
      normalizedCall ??= computeNormalizedCall!();
      const { invocation, activeForwardTarget, mutationApi } = normalizedCall!;
      let direct = activeForwardTarget ?? localFunctionFromExpression(invocation.target, bindings, substitutions, false);
      if (direct === undefined) direct = localFunctionFromExpression(invocation.target, bindings, substitutions);
      if (direct !== undefined) {
        if (invocation.arguments !== undefined) invoke(node, direct, invocation.arguments, execution, substitutions);
        else if (invocation.unsupported !== undefined) invoke(node, direct, undefined, 'unmodeled-callback', substitutions);
      }
      const relevantExpression = (expression: ts.Expression | undefined): boolean => expression !== undefined
        && relevantBindings.some(binding => (
          expressionBindingReachability(expression, binding, bindings, substitutions) !== 'unrelated'
        ));
      const relevantInvocationValue = (value: InvocationValue): boolean => typeof value !== 'string'
        && relevantExpression(value);
      const replayToPropertyKey = (expression: ts.Expression | undefined): 'normal' | 'throw' | 'unknown' => {
        if (expression === undefined || definitelyPrimitiveExpression(expression, bindings, substitutions)) return 'normal';
        const root = syntacticExactAliasOrigin(expression, bindings, substitutions);
        if (root === undefined || !ts.isObjectLiteralExpression(unwrap(root))) return 'unknown';
        const method = resolveObjectLiteralProperty(unwrap(root) as ts.ObjectLiteralExpression, 'toString', bindings, substitutions, new Set());
        if (method.kind === 'absent') return 'normal';
        const target = method.kind === 'exact'
          ? ts.isMethodDeclaration(method.origin)
            ? method.origin
            : localFunctionFromExpression(method.origin, bindings, substitutions, false)
          : undefined;
        if (target === undefined) return 'unknown';
        invoke(node, target, [], execution, substitutions, expression);
        return functionDefinitelyThrows(target) ? 'throw' : 'normal';
      };
      const replayProxyTrap = (
        targetExpression: ts.Expression,
        trapName: 'set' | 'defineProperty',
        trapArguments: readonly InvocationValue[],
      ): 'not-proxy' | 'forward' | 'handled' => {
        const proxy = finiteProxyInfo(targetExpression, bindings, substitutions);
        if (proxy === undefined) return 'not-proxy';
        const trap = finiteProxyTrap(proxy, trapName, bindings, substitutions);
        if (trap === 'unknown') {
          if (strictUnknownAccessEffects && trapArguments.some(relevantInvocationValue)) {
            fail(node, `unsupported Proxy ${trapName} trap: tainted callable provenance`);
          }
          return 'handled';
        }
        if (trap === undefined) return 'forward';
        invoke(node, trap, trapArguments, execution, substitutions, proxy.handler ?? targetExpression);
        return 'handled';
      };
      const replayOrdinarySetter = (
        targetExpression: ts.Expression,
        key: string,
        value: InvocationValue,
        receiver: InvocationValue = targetExpression,
      ): void => {
        const selected = finiteReachableDescriptorAt(targetExpression, key, bindings, substitutions, node);
        if (selected.kind === 'accessor') {
          if (selected.setter === 'unknown') {
            if (strictUnknownAccessEffects && (relevantInvocationValue(value) || relevantExpression(targetExpression))) {
              fail(node, 'unsupported reachable mutation: exact setter has tainted callable provenance');
            }
          } else if (selected.setter !== undefined) invoke(node, selected.setter, [value], execution, substitutions, receiver);
        } else if (selected.kind === 'unknown' && strictUnknownAccessEffects && (
          relevantInvocationValue(value) || relevantExpression(targetExpression)
        )) fail(node, 'unsupported reachable mutation: exact setter has unknown descriptor provenance');
      };
      const replayPropertyDescriptor = (value: InvocationValue): 'normal' | 'throw' => {
        if (value === 'absent') return 'throw';
        if (value === 'tainted') return 'normal';
        if (definitelyPrimitiveExpression(value, bindings, substitutions)) return 'throw';
        for (const field of ['enumerable', 'configurable', 'value', 'writable', 'get', 'set'] as const) {
          const selected = finiteReachableDescriptorAt(value, field, bindings, substitutions, node);
          if (selected.kind === 'accessor') {
            if (selected.getter === 'unknown') {
              if (strictUnknownAccessEffects && relevantExpression(value)) {
                fail(node, `unsupported property descriptor ${field} getter provenance`);
              }
            } else if (selected.getter !== undefined) {
              invoke(node, selected.getter, [], execution, substitutions, value);
              if (functionDefinitelyThrows(selected.getter)) return 'throw';
            }
          } else if (selected.kind === 'unknown' && strictUnknownAccessEffects && relevantExpression(value)) {
            fail(node, `unsupported property descriptor ${field} provenance`);
          }
        }
        return 'normal';
      };
      let propertyKeyAbrupt = false;
      if (
        mutationApi?.exactGlobal === true
        && invocation.arguments !== undefined
        && invocation.arguments[0] !== undefined
        && (
          (mutationApi.receiver === 'Reflect' && mutationApi.method === 'set')
          || (mutationApi.receiver === 'Object' && mutationApi.method === 'defineProperty')
        )
        && !definitelyPrimitiveExpression(invocation.arguments[0], bindings, substitutions)
      ) {
        const keyEffect = replayToPropertyKey(invocation.arguments[1]);
        if (keyEffect === 'unknown' && strictUnknownAccessEffects && relevantExpression(invocation.arguments[1])) {
          fail(node, 'unsupported property key coercion: tainted callable provenance');
        }
        propertyKeyAbrupt = keyEffect === 'throw';
      }
      if (propertyKeyAbrupt) return;
      if (
        mutationApi?.exactGlobal === true
        && mutationApi.receiver === 'Object'
        && mutationApi.method === 'defineProperty'
        && invocation.arguments !== undefined
        && invocation.arguments[2] !== undefined
      ) {
        if (replayPropertyDescriptor(invocation.arguments[2]) === 'throw') return;
      }
      if (
        mutationApi?.exactGlobal === true
        && mutationApi.receiver === 'Object'
        && mutationApi.method === 'defineProperties'
        && invocation.arguments !== undefined
        && invocation.arguments[1] !== undefined
      ) {
        const copied = finiteObjectCopyEntries(invocation.arguments[1], bindings, substitutions, node);
        if (copied.unknown && strictUnknownAccessEffects && relevantExpression(invocation.arguments[1])) {
          fail(node, 'unsupported Object.defineProperties descriptor map provenance');
        }
        for (const entry of copied.entries) {
          if (entry.getter === 'unknown') {
            if (strictUnknownAccessEffects && relevantExpression(invocation.arguments[1])) {
              fail(node, 'unsupported Object.defineProperties outer getter provenance');
            }
          } else if (entry.getter !== undefined) {
            invoke(node, entry.getter, [], execution, substitutions, invocation.arguments[1]);
            if (functionDefinitelyThrows(entry.getter)) return;
          }
          if (replayPropertyDescriptor(entry.value) === 'throw') return;
        }
      }
      if (
        mutationApi?.exactGlobal === true
        && mutationApi.receiver === 'Object'
        && mutationApi.method === 'assign'
        && invocation.arguments !== undefined
        && invocation.arguments[0] !== undefined
      ) {
        const target = invocation.arguments[0];
        objectAssignSources: for (const source of invocation.arguments.slice(1)) {
          const copied = finiteObjectCopyEntries(source, bindings, substitutions, node);
          if (copied.unknown && strictUnknownAccessEffects && relevantExpression(source)) {
            fail(node, 'unsupported Object.assign source descriptor provenance');
          }
          for (const entry of copied.entries) {
            if (entry.getter === 'unknown') {
              if (strictUnknownAccessEffects && relevantExpression(source)) fail(node, 'unsupported Object.assign source getter provenance');
            } else if (entry.getter !== undefined) {
              invoke(node, entry.getter, [], execution, substitutions, source);
              if (functionDefinitelyThrows(entry.getter)) break objectAssignSources;
            }
            const proxy = finiteProxyInfo(target, bindings, substitutions);
            const proxyResult = replayProxyTrap(
              target,
              'set',
              [proxy?.target ?? target, ts.factory.createStringLiteral(entry.key), entry.value, target],
            );
            if (proxyResult === 'handled') continue;
            replayOrdinarySetter(proxyResult === 'forward' && proxy !== undefined ? proxy.target : target, entry.key, entry.value, target);
          }
        }
      }
      let reflectSetHandled = false;
      let reflectSetTarget = invocation.arguments?.[0];
      if (
        mutationApi?.exactGlobal === true
        && mutationApi.receiver === 'Reflect'
        && mutationApi.method === 'set'
        && invocation.arguments !== undefined
        && invocation.arguments[0] !== undefined
      ) {
        const proxy = finiteProxyInfo(invocation.arguments[0], bindings, substitutions);
        if (proxy !== undefined) {
          const proxyResult = replayProxyTrap(
            invocation.arguments[0],
            'set',
            [proxy.target, invocation.arguments[1] ?? 'absent', invocation.arguments[2] ?? 'absent', invocation.arguments[3] ?? invocation.arguments[0]],
          );
          reflectSetHandled = proxyResult === 'handled';
          if (proxyResult === 'forward') reflectSetTarget = proxy.target;
        }
      }
      if (
        mutationApi?.exactGlobal === true
        && mutationApi.receiver === 'Object'
        && mutationApi.method === 'defineProperty'
        && invocation.arguments !== undefined
        && invocation.arguments[0] !== undefined
      ) {
        replayProxyTrap(
          invocation.arguments[0],
          'defineProperty',
          [
            finiteProxyInfo(invocation.arguments[0], bindings, substitutions)?.target ?? invocation.arguments[0],
            invocation.arguments[1] ?? 'absent',
            invocation.arguments[2] ?? 'absent',
          ],
        );
      }
      if (
        mutationApi?.exactGlobal === true
        && mutationApi.receiver === 'Reflect'
        && mutationApi.method === 'set'
        && invocation.arguments !== undefined
        && invocation.arguments[0] !== undefined
        && reflectSetTarget !== undefined
        && !reflectSetHandled
        && !definitelyPrimitiveExpression(invocation.arguments[0], bindings, substitutions)
      ) {
        const memberKey = resolveStaticString(invocation.arguments[1], bindings, substitutions);
        if (memberKey !== undefined) {
          const targetRoot = syntacticExactAliasOrigin(reflectSetTarget, bindings, substitutions);
          const finiteTarget = targetRoot !== undefined
            && (ts.isObjectLiteralExpression(unwrap(targetRoot)) || ts.isArrayLiteralExpression(unwrap(targetRoot)));
          if (finiteTarget) {
            const possible = finiteReachableSettersAt(reflectSetTarget, bindings, substitutions, node);
            if (possible.unknown && strictUnknownAccessEffects) fail(node, 'unsupported Reflect.set: exact key has unknown descriptor or prototype state');
            const setter = possible.setters.get(memberKey);
            if (setter !== undefined) {
              invoke(
                node,
                setter,
                [invocation.arguments[2] ?? 'absent'],
                execution,
                substitutions,
                invocation.arguments[3] ?? invocation.arguments[0],
              );
            }
          }
        } else {
          const targetRoot = syntacticExactAliasOrigin(reflectSetTarget, bindings, substitutions);
          const finiteTarget = targetRoot !== undefined
            && (ts.isObjectLiteralExpression(unwrap(targetRoot)) || ts.isArrayLiteralExpression(unwrap(targetRoot)));
          if (finiteTarget) {
            const possible = finiteReachableSettersAt(reflectSetTarget, bindings, substitutions, node);
            if (possible.unknown && strictUnknownAccessEffects) fail(node, 'unsupported Reflect.set: dynamic key has unknown descriptor or prototype state');
            for (const setter of possible.setters.values()) {
              invoke(
                node,
                setter,
                [invocation.arguments[2] ?? 'absent'],
                'unmodeled-callback',
                substitutions,
                invocation.arguments[3] ?? invocation.arguments[0],
              );
            }
          } else if (strictUnknownAccessEffects && relevantBindings.some(binding => {
            const targetReachability = expressionBindingReachability(invocation.arguments![0], binding, bindings, substitutions);
            const suppliedReachability = [invocation.arguments![2], invocation.arguments![3]]
              .filter((value): value is ts.Expression => value !== undefined)
              .some(value => expressionBindingReachability(value, binding, bindings, substitutions) !== 'unrelated');
            return targetReachability === 'relevant' || suppliedReachability;
          })) {
            fail(node, 'unsupported Reflect.set: dynamic key may invoke a relevant setter');
          }
        }
      }
      const callee = unwrap(node.expression);
      const calleeMember = staticMember(callee);
      const synchronousMethod = invokeMapCallbacks && calleeMember !== undefined && synchronousArrayCallbacks.has(calleeMember.key);
      const rawReceiverParts = calleeMember === undefined ? undefined : accessParts(calleeMember.base);
      const configIndex = rawReceiverParts?.indexOf('config') ?? -1;
      const rawReceiverPath = rawReceiverParts !== undefined && configIndex >= 0
        ? normalizePath(rawReceiverParts.slice(configIndex).join('.'), { allowCanonicalWildcards: true })
        : undefined;
      const receiverPath = calleeMember === undefined
        ? undefined
        : canonicalAccessPath(calleeMember.base, bindings) ?? rawReceiverPath;
      const callbackArguments = direct === undefined
        ? synchronousMethod
          ? node.arguments.slice(0, 1)
          : node.arguments
        : [];
      for (const argument of callbackArguments) {
        const callback = unwrap(argument);
        const callbackTarget = localFunctionFromExpression(callback, bindings, substitutions, false);
        if (callbackTarget === undefined) {
          if (synchronousMethod && receiverPath?.startsWith('config.')) fail(argument, 'unsupported synchronous callback: dynamic callback may mutate configuration elements');
          if (synchronousMethod && calleeMember !== undefined) {
            const aggregate = finiteAggregateRelevance(calleeMember.base, bindings, substitutions);
            if (aggregate?.kind === 'tainted') fail(argument, 'unsupported synchronous callback: tainted finite receiver aggregate');
            const receiverProvenance = resolveAliasProvenance(calleeMember.base, bindings, substitutions);
            const receiver = receiverProvenance.kind === 'exact' && !ts.isMethodDeclaration(receiverProvenance.origin)
              ? unwrap(receiverProvenance.origin)
              : undefined;
            const finiteElements = receiver !== undefined && ts.isArrayLiteralExpression(receiver)
              ? finiteInvocationArguments(receiver, bindings)
              : undefined;
            const relevantElements = aggregate?.leaves ?? finiteElements ?? (receiver !== undefined && ts.isArrayLiteralExpression(receiver)
              ? receiver.elements.filter(element => !ts.isOmittedExpression(element) && !ts.isSpreadElement(element)) as readonly ts.Expression[]
              : undefined);
            if (relevantElements?.some(element => {
              const value = finiteProjectedValue(element, substitutions);
              if (value === 'tainted') return true;
              if (value === 'absent') return false;
              const exact = unwrap(value);
              return !(ts.isNumericLiteral(exact)
                || ts.isStringLiteral(exact)
                || ts.isNoSubstitutionTemplateLiteral(exact)
                || exact.kind === ts.SyntaxKind.TrueKeyword
                || exact.kind === ts.SyntaxKind.FalseKeyword
                || exact.kind === ts.SyntaxKind.NullKeyword
                || (ts.isIdentifier(exact) && exact.text === 'undefined' && !bindings.lookup(exact).found));
            })) fail(argument, 'unsupported synchronous callback: dynamic callback may consume a relevant finite receiver');
          }
          continue;
        }
        if (callbackTarget === direct) continue;
        if (!synchronousMethod || calleeMember === undefined) {
          invoke(node, callbackTarget, undefined, 'unmodeled-callback', substitutions);
          continue;
        }
        if (receiverPath !== undefined && receiverPath.startsWith('config.')) {
          const wildcard = ts.factory.createStringLiteral('*');
          const element = ts.factory.createElementAccessExpression(calleeMember.base, wildcard);
          const callbackThis: InvocationValue = node.arguments[1] === undefined
            ? 'absent'
            : finiteProjectedValue(node.arguments[1], substitutions);
          invoke(node, callbackTarget, [element, wildcard, calleeMember.base], execution, substitutions, callbackThis);
          continue;
        }
        const receiverProvenance = resolveAliasProvenance(calleeMember.base, bindings, substitutions);
        const receiver = receiverProvenance.kind === 'exact' && !ts.isMethodDeclaration(receiverProvenance.origin)
          ? unwrap(receiverProvenance.origin)
          : undefined;
        if (receiver !== undefined && ts.isArrayLiteralExpression(receiver) && !receiver.elements.some(ts.isOmittedExpression)) {
          const finiteElements = finiteInvocationArguments(receiver, bindings);
          if (finiteElements !== undefined) {
            finiteElements.forEach((element, index) => {
              const value = finiteProjectedValue(element, substitutions);
              const callbackThis: InvocationValue = node.arguments[1] === undefined
                ? 'absent'
                : finiteProjectedValue(node.arguments[1], substitutions);
              invoke(node, callbackTarget, [value, ts.factory.createNumericLiteral(index), calleeMember.base], execution, substitutions, callbackThis);
            });
            continue;
          }
        }
        invoke(node, callbackTarget, ['tainted', 'tainted', 'tainted'], execution, substitutions, node.arguments[1] === undefined ? 'absent' : 'tainted');
      }
    }
    ts.forEachChild(node, child => visit(child, substitutions, current, execution));
  };
  if (owner.body !== undefined) {
    if (initialInvocation === undefined) visit(owner.body, new Map(), owner, 'known');
    else {
      const defaultEffects: InvocationDefaultEffect[] = [];
      const accessEffects: InvocationAccessEffect[] = [];
      const projected = projectInvocationParameters(
        owner.parameters,
        initialInvocation.arguments,
        bindings,
        initialInvocation.substitutions,
        defaultEffects,
        accessEffects,
      );
      for (const effect of accessEffects) {
        invoke(owner, effect.target, [], initialInvocation.execution, initialInvocation.substitutions, effect.receiver);
      }
      for (const effect of defaultEffects) {
        visit(
          effect.expression,
          effect.substitutions,
          owner,
          effect.selection === 'maybe' ? 'unmodeled-callback' : initialInvocation.execution,
        );
      }
      visit(owner.body, projected, owner, initialInvocation.execution);
    }
  }
}

function assignmentTargetExpressions(expression: ts.Expression): ts.Expression[] {
  expression = unwrap(expression);
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.flatMap(element => ts.isOmittedExpression(element)
      ? []
      : assignmentTargetExpressions(ts.isSpreadElement(element) ? element.expression : element as ts.Expression));
  }
  if (ts.isObjectLiteralExpression(expression)) {
    return expression.properties.flatMap(property => {
      if (ts.isShorthandPropertyAssignment(property)) return [property.name];
      if (ts.isPropertyAssignment(property)) return assignmentTargetExpressions(property.initializer);
      if (ts.isSpreadAssignment(property)) return assignmentTargetExpressions(property.expression);
      return [];
    });
  }
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    return assignmentTargetExpressions(expression.left);
  }
  return [expression];
}

type MutationApiIdentity = { receiver: 'Object' | 'Reflect'; method: string; exactGlobal: boolean };

function resolveMutationApiIdentity(
  expression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions = new Map(),
): MutationApiIdentity | undefined {
  const provenance = resolveAliasProvenance(expression, bindings, substitutions);
  const resolved = provenance.kind === 'exact' && !ts.isMethodDeclaration(provenance.origin) ? provenance.origin : expression;
  const member = staticMember(resolved);
  if (member === undefined) return undefined;
  const receiver = resolveAliasOrigin(member.base, bindings);
  return ts.isIdentifier(receiver) && (receiver.text === 'Object' || receiver.text === 'Reflect')
    ? { receiver: receiver.text, method: member.key, exactGlobal: !bindings.lookup(receiver).found }
    : undefined;
}

function preflightMutationApiCandidate(
  call: ts.CallExpression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
): MutationApiIdentity | undefined {
  const callee = unwrap(call.expression);
  let target = callee;
  if (ts.isCallExpression(callee)) {
    const bound = staticMember(callee.expression);
    if (bound?.key !== 'bind') return undefined;
    target = unwrap(bound.base);
  } else {
    const wrapper = staticMember(callee);
    if (wrapper?.key === 'call' || wrapper?.key === 'apply') target = unwrap(wrapper.base);
  }
  const origin = syntacticExactAliasOrigin(target, bindings, substitutions);
  const member = origin === undefined ? undefined : staticMember(origin);
  const receiverOrigin = member === undefined
    ? undefined
    : syntacticExactAliasOrigin(member.base, bindings, substitutions);
  const api: MutationApiIdentity | undefined = receiverOrigin !== undefined
    && ts.isIdentifier(receiverOrigin)
    && (receiverOrigin.text === 'Object' || receiverOrigin.text === 'Reflect')
    && !bindings.lookup(receiverOrigin).found
    ? { receiver: receiverOrigin.text, method: member!.key, exactGlobal: true }
    : undefined;
  return api !== undefined && (
    (api.receiver === 'Reflect' && api.method === 'set')
    || (api.receiver === 'Object' && (api.method === 'defineProperty' || api.method === 'defineProperties'))
  ) ? api : undefined;
}

function normalizedMutationInvocationQueryKey(
  call: ts.CallExpression,
  api: MutationApiIdentity,
): string {
  const callee = unwrap(call.expression);
  const wrapper = ts.isCallExpression(callee)
    ? staticMember(callee.expression)?.key ?? 'nested'
    : (() => {
      const key = staticMember(callee)?.key;
      return key === 'call' || key === 'apply' ? key : 'direct';
    })();
  // The call position and affected API/member key keep completed results from
  // crossing source-ordered own/prototype mutation states.
  return `${call.getStart()}:${call.end}:${api.receiver}.${api.method}:${wrapper}`;
}

function boundedMutationApi(
  node: ts.CallExpression,
  parameter: ts.Identifier,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  execution: ConfigMutation['execution'],
): ConfigMutation[] {
  const invocation = normalizeInvocation(node, bindings, substitutions);
  const api = resolveMutationApiIdentity(invocation.target, bindings, substitutions);
  if (api === undefined || !api.exactGlobal) {
    const original = staticMember(node.expression);
    const receiver = original === undefined ? undefined : resolveAliasOrigin(original.base, bindings);
    const overriddenGlobalApi = original !== undefined
      && receiver !== undefined
      && ts.isIdentifier(receiver)
      && (receiver.text === 'Object' || receiver.text === 'Reflect')
      && !bindings.lookup(receiver).found
      && bindings.memberProvenanceCandidates(original.base, original.key, node.expression) !== undefined;
    if (!overriddenGlobalApi) return [];
    const target = invocation.arguments?.[0] === undefined
      ? undefined
      : scopedFunctionConfigPath(invocation.arguments[0], parameter, bindings, new Set(), substitutions);
    return target !== undefined
      ? [{ node, operation: 'write', path: target, syntax: 'unmodeled-api', execution, substitutions }]
      : [];
  }
  if (invocation.unsupported !== undefined || invocation.arguments === undefined) fail(node, `unsupported mutation API invocation: ${invocation.unsupported ?? 'unknown arguments'}`);
  const args = invocation.arguments;
  if (args[0] === undefined) return [];
  const targetPath = scopedFunctionConfigPath(args[0], parameter, bindings, new Set(), substitutions);
  if (targetPath === undefined) return [];
  const make = (operation: ConfigMutation['operation'], path: string): ConfigMutation => ({
    node,
    operation,
    path,
    syntax: 'api',
    execution,
    substitutions,
  });
  const keyedPath = (keyExpression: ts.Expression | undefined): string | undefined => {
    if (keyExpression === undefined) return undefined;
    const key = resolveStaticString(keyExpression, bindings, substitutions);
    return key === undefined ? undefined : normalizePath(`${targetPath}.${key}`, { allowCanonicalWildcards: true });
  };
  const mutationPropertyKey = (name: ts.PropertyName): string | undefined => ts.isComputedPropertyName(name)
    ? resolveStaticString(name.expression, bindings, substitutions)
    : propertyName(name);
  if (api.receiver === 'Reflect' && api.method === 'set') return [make('write', keyedPath(args[1]) ?? targetPath)];
  if (api.receiver === 'Reflect' && api.method === 'deleteProperty') return [make('delete', keyedPath(args[1]) ?? targetPath)];
  if (api.receiver !== 'Object') return [];
  if (api.method === 'defineProperty') return [make('write', keyedPath(args[1]) ?? targetPath)];
  if (api.method === 'assign') {
    const paths = args.slice(1).flatMap(argument => {
      const source = unwrap(argument);
      if (!ts.isObjectLiteralExpression(source)) return [];
      return source.properties.flatMap(property => ts.isSpreadAssignment(property)
        ? []
        : (() => {
          const key = mutationPropertyKey(property.name);
          return key === undefined ? [] : [normalizePath(`${targetPath}.${key}`, { allowCanonicalWildcards: true })];
        })());
    });
    return paths.length === args.length - 1 && paths.length > 0
      ? paths.map(path => make('write', path))
      : [make('write', targetPath)];
  }
  if (api.method === 'defineProperties') {
    const descriptors = args[1] === undefined ? undefined : unwrap(args[1]);
    return descriptors !== undefined && ts.isObjectLiteralExpression(descriptors) && descriptors.properties.length > 0
      ? descriptors.properties.flatMap(property => ts.isSpreadAssignment(property)
        ? [make('write', targetPath)]
        : (() => {
          const key = mutationPropertyKey(property.name);
          return [make('write', key === undefined ? targetPath : normalizePath(`${targetPath}.${key}`, { allowCanonicalWildcards: true }))];
        })())
      : [make('write', targetPath)];
  }
  return [];
}

function configMutationsAtNode(
  node: ts.Node,
  parameter: ts.Identifier,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
  execution: ConfigMutation['execution'],
): ConfigMutation[] {
  if (ts.isCallExpression(node)) return boundedMutationApi(node, parameter, bindings, substitutions, execution);
  if (ts.isDeleteExpression(node)) {
    const path = scopedFunctionConfigPath(node.expression, parameter, bindings, new Set(), substitutions);
    return path === undefined ? [] : [{ node, operation: 'delete', path, syntax: 'delete', execution, substitutions }];
  }
  if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
    const targets = assignmentTargetExpressions(node.left);
    const destructuring = ts.isArrayLiteralExpression(unwrap(node.left)) || ts.isObjectLiteralExpression(unwrap(node.left));
    const syntax = destructuring
      ? 'destructure'
      : node.operatorToken.kind === ts.SyntaxKind.EqualsToken ? 'assign' : 'compound';
    return targets.flatMap(target => {
      const path = scopedFunctionConfigPath(target, parameter, bindings, new Set(), substitutions, false);
      return path === undefined ? [] : [{ node, operation: 'write' as const, path, syntax, execution, substitutions }];
    });
  }
  if (
    (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node))
    && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)
  ) {
    const path = scopedFunctionConfigPath(node.operand, parameter, bindings, new Set(), substitutions);
    return path === undefined ? [] : [{ node, operation: 'write', path, syntax: 'update', execution, substitutions }];
  }
  return [];
}

function parameterConfigPath(
  expression: ts.Expression,
  parameter: ts.Identifier,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions = new Map(),
): string | undefined {
  const path = scopedFunctionConfigPath(expression, parameter, bindings, new Set(), substitutions);
  return path?.startsWith('config.') ? path : undefined;
}

function enclosingIfWithin(node: ts.Node, owner: ts.FunctionLikeDeclaration): ts.IfStatement | undefined {
  let current: ts.Node | undefined = node;
  while (current !== undefined && current !== owner) {
    if (ts.isIfStatement(current)) return current;
    current = current.parent;
  }
  return undefined;
}

function flattenAnd(expression: ts.Expression): ts.Expression[] {
  expression = unwrap(expression);
  return ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    ? [...flattenAnd(expression.left), ...flattenAnd(expression.right)]
    : [expression];
}

function exactString(expression: ts.Expression, value: string): boolean {
  expression = unwrap(expression);
  return (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) && expression.text === value;
}

function exactBoolean(expression: ts.Expression, value: boolean): boolean {
  expression = unwrap(expression);
  return expression.kind === (value ? ts.SyntaxKind.TrueKeyword : ts.SyntaxKind.FalseKeyword);
}

function exactNumber(expression: ts.Expression, value: number): boolean {
  expression = unwrap(expression);
  return ts.isNumericLiteral(expression) && Number(expression.text) === value;
}

function collectFunctionConfigMutations(
  owner: ts.ArrowFunction,
  parameter: ts.Identifier,
  bindings: LexicalBindings,
): { mutations: ConfigMutation[]; conditions: Map<ConfigMutation, readonly ConditionalExecutionContext[]> } {
  const mutations: ConfigMutation[] = [];
  const conditions = new Map<ConfigMutation, readonly ConditionalExecutionContext[]>();
  visitExecutableFunctionNodes(owner, bindings, (node, substitutions, execution, _sequence, _current, executionConditions) => {
    if (ts.isCallExpression(node) && unmodeledCallConsumesRelevantIdentity(node, [parameter], bindings, substitutions)) {
      fail(node, `migrateJobConfig behavior has an unsupported unmodeled call consuming configuration identity: ${node.getText()}`);
    }
    const found = configMutationsAtNode(node, parameter, bindings, substitutions, execution);
    for (const mutation of found) conditions.set(mutation, executionConditions);
    mutations.push(...found);
  }, true, undefined, [parameter], true);
  return { mutations, conditions };
}

function invocationIdentifierResolvesTo(
  identifier: ts.Identifier,
  target: ts.Identifier,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions,
): boolean {
  return aliasOriginReachesBinding(identifier, target, bindings, substitutions);
}

function identifierResolvesToExactImport(
  identifier: ts.Identifier,
  importedName: string,
  moduleName: string,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions = new Map(),
): boolean {
  const resolved = resolveAliasProvenance(identifier, bindings, substitutions);
  return resolved.kind === 'exact' && ts.isIdentifier(resolved.origin) && bindings.isExactNamedImport(resolved.origin, importedName, moduleName);
}

export function collectMigrateJobConfigBehaviorClaimsFromSource(
  sourceText: string,
  sourceName = 'ui/src/app/jobs/new/jobConfig.ts',
): UiSourceClaim[] {
  const source = ts.createSourceFile(sourceName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const owner = exportedArrowFunction(source, 'migrateJobConfig');
  if (owner === undefined) return [];
  const parameter = exactCallbackIdentifier(owner.parameters[0]);
  if (parameter === undefined || owner.parameters.length !== 1) fail(owner, 'migrateJobConfig behavior requires one exact parameter');
  const bindings = new LexicalBindings(source);
  const { mutations, conditions: mutationConditions } = collectFunctionConfigMutations(owner, parameter, bindings);
  const consumed = new Set<ConfigMutation>();
  const take = (operation: ConfigMutation['operation'], path: string): ConfigMutation => {
    const expectedSyntax = operation === 'write' ? 'assign' : 'delete';
    const matches = mutations.filter(item => item.operation === operation && item.path === path && item.syntax === expectedSyntax && item.execution === 'known');
    if (matches.length !== 1) fail(owner, `migrateJobConfig behavior requires one ${operation} for ${path}`);
    consumed.add(matches[0]);
    return matches[0];
  };
  const requireExactConditions = (
    mutation: ConfigMutation,
    expected: readonly { owner: ts.Node; arm: string }[],
    label: string,
  ): void => {
    const actual = mutationConditions.get(mutation) ?? [];
    if (
      actual.length !== expected.length
      || expected.some(item => !actual.some(condition => condition.owner === item.owner && condition.arm === item.arm))
    ) fail(mutation.node, `migrateJobConfig ${label} behavior has an unsupported enclosing runtime guard`);
  };
  const pathIs = (
    expression: ts.Expression,
    path: string,
    substitutions: InvocationSubstitutions = new Map(),
  ): boolean => parameterConfigPath(expression, parameter, bindings, substitutions) === path;
  const exactInGuard = (
    expression: ts.Expression,
    key: string,
    path: string,
    negated = false,
    substitutions: InvocationSubstitutions = new Map(),
  ): boolean => {
    expression = unwrap(expression);
    if (negated) {
      if (!ts.isPrefixUnaryExpression(expression) || expression.operator !== ts.SyntaxKind.ExclamationToken) return false;
      expression = unwrap(expression.operand);
    }
    return ts.isBinaryExpression(expression)
      && expression.operatorToken.kind === ts.SyntaxKind.InKeyword
      && exactString(expression.left, key)
      && pathIs(expression.right, path, substitutions);
  };

  const sampleWrite = take('write', 'config.process[*].sample.samples');
  const promptDelete = take('delete', 'config.process[*].sample.prompts');
  const promptSubstitutions = sampleWrite.substitutions;
  const promptIf = enclosingIfWithin(sampleWrite.node, owner);
  if (promptIf === undefined || enclosingIfWithin(promptDelete.node, owner) !== promptIf) fail(sampleWrite.node, 'migrateJobConfig prompts behavior requires one shared guard');
  requireExactConditions(sampleWrite, [{ owner: promptIf, arm: 'then' }], 'prompts write');
  requireExactConditions(promptDelete, [{ owner: promptIf, arm: 'then' }], 'prompts delete');
  const promptGuard = flattenAnd(promptIf.expression);
  if (promptGuard.length !== 4
    || !pathIs(promptGuard[0], 'config.process', promptSubstitutions)
    || !pathIs(promptGuard[1], 'config.process[*].sample', promptSubstitutions)) fail(promptIf.expression, 'migrateJobConfig prompts behavior has an unsupported guard');
  const arrayGuard = unwrap(promptGuard[2]);
  const lengthGuard = unwrap(promptGuard[3]);
  const lengthAccess = ts.isBinaryExpression(lengthGuard) ? unwrap(lengthGuard.left) : undefined;
  if (!ts.isCallExpression(arrayGuard)
    || accessParts(arrayGuard.expression)?.join('.') !== 'Array.isArray'
    || arrayGuard.arguments.length !== 1
    || !pathIs(arrayGuard.arguments[0], 'config.process[*].sample.prompts', promptSubstitutions)
    || !ts.isBinaryExpression(lengthGuard)
    || lengthGuard.operatorToken.kind !== ts.SyntaxKind.GreaterThanToken
    || !exactNumber(lengthGuard.right, 0)
    || lengthAccess === undefined
    || !ts.isPropertyAccessExpression(lengthAccess)
    || lengthAccess.name.text !== 'length'
    || !pathIs(lengthAccess.expression, 'config.process[*].sample.prompts', promptSubstitutions)) fail(promptIf.expression, 'migrateJobConfig prompts behavior has an unsupported array guard');
  const sampleAssignment = sampleWrite.node as ts.BinaryExpression;
  const samplesValue = unwrap(sampleAssignment.right);
  if (!ts.isIdentifier(samplesValue)) fail(samplesValue, 'migrateJobConfig prompts behavior requires an exact samples binding');
  const samplesDeclaration = bindings.bindingDeclaration(samplesValue);
  const samplesInitializer = bindings.declarationInitializer(samplesValue);
  const unwrappedSamplesInitializer = samplesInitializer === undefined ? undefined : unwrap(samplesInitializer);
  if (samplesDeclaration === undefined || unwrappedSamplesInitializer === undefined || !ts.isArrayLiteralExpression(unwrappedSamplesInitializer) || unwrappedSamplesInitializer.elements.length !== 0) fail(samplesValue, 'migrateJobConfig prompts behavior requires an empty samples accumulator');
  const loops = (() => {
    const result: ts.ForOfStatement[] = [];
    const visit = (node: ts.Node): void => { if (ts.isForOfStatement(node)) result.push(node); else ts.forEachChild(node, visit); };
    visit(promptIf.thenStatement);
    return result;
  })();
  if (loops.length !== 1 || !pathIs(loops[0].expression, 'config.process[*].sample.prompts', promptSubstitutions)) fail(promptIf.thenStatement, 'migrateJobConfig prompts behavior requires one exact source-order loop');
  const loopDeclaration = loops[0].initializer;
  if (!ts.isVariableDeclarationList(loopDeclaration) || loopDeclaration.declarations.length !== 1 || !ts.isIdentifier(loopDeclaration.declarations[0].name)) fail(loops[0], 'migrateJobConfig prompts behavior requires one exact prompt binding');
  const promptBinding = loopDeclaration.declarations[0].name;
  const pushes: ts.CallExpression[] = [];
  const collectPush = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'push') pushes.push(node);
    ts.forEachChild(node, collectPush);
  };
  collectPush(loops[0].statement);
  const pushExpression = pushes.length === 1 && ts.isPropertyAccessExpression(pushes[0].expression)
    ? unwrap(pushes[0].expression.expression)
    : undefined;
  if (pushes.length !== 1 || pushExpression === undefined || !ts.isIdentifier(pushExpression) || !invocationIdentifierResolvesTo(pushExpression, samplesDeclaration, bindings, new Map()) || pushes[0].arguments.length !== 1) fail(loops[0], 'migrateJobConfig prompts behavior requires one accumulator push');
  const pushed = resolveAliasOrigin(pushes[0].arguments[0], bindings);
  if (!ts.isObjectLiteralExpression(pushed)) fail(pushed, 'migrateJobConfig prompts behavior requires prompt objects');
  const promptValue = objectProperties(pushed).get('prompt');
  const unwrappedPromptValue = promptValue === undefined ? undefined : unwrap(promptValue);
  if (pushed.properties.length !== 1 || unwrappedPromptValue === undefined || !ts.isIdentifier(unwrappedPromptValue) || !invocationIdentifierResolvesTo(unwrappedPromptValue, promptBinding, bindings, new Map())) fail(pushed, 'migrateJobConfig prompts behavior requires one exact prompt property');
  let pushStatement: ts.Node = pushes[0];
  while (pushStatement.parent !== loops[0].statement && !ts.isFunctionLike(pushStatement.parent)) pushStatement = pushStatement.parent;
  const loopBodyStatements = ts.isBlock(loops[0].statement) ? loops[0].statement.statements : [loops[0].statement];
  const approvedLoopDeclarations = new Set<ts.Identifier>();
  const pushedArgument = unwrap(pushes[0].arguments[0]);
  if (ts.isIdentifier(pushedArgument)) {
    const declaration = bindings.bindingDeclaration(pushedArgument);
    if (declaration !== undefined) approvedLoopDeclarations.add(declaration);
  }
  if (ts.isIdentifier(pushExpression)) {
    const declaration = bindings.bindingDeclaration(pushExpression);
    if (declaration !== undefined && declaration !== samplesDeclaration) approvedLoopDeclarations.add(declaration);
  }
  const allowedItemDeclarations = loopBodyStatements.flatMap(statement => ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : []).filter(declaration => ts.isIdentifier(declaration.name) && approvedLoopDeclarations.has(declaration.name));
  const pushTopLevel = loopBodyStatements.find(statement => branchContains(statement, pushes[0]));
  if (pushTopLevel === undefined || !ts.isExpressionStatement(pushTopLevel) || pushTopLevel.expression !== pushes[0] || loopBodyStatements.length !== allowedItemDeclarations.length + 1) fail(pushes[0], 'migrateJobConfig prompts behavior requires exactly one unconditional push per source element');
  const isAccumulatorAccess = (expression: ts.Expression, substitutions: InvocationSubstitutions = new Map()): boolean => {
    expression = unwrap(expression);
    if (ts.isIdentifier(expression)) return invocationIdentifierResolvesTo(expression, samplesDeclaration, bindings, substitutions);
    if (ts.isElementAccessExpression(expression) && staticMember(expression) === undefined) {
      const aggregate = finiteAggregateRelevance(expression.expression, bindings, substitutions);
      if (aggregate?.kind === 'tainted') fail(expression, 'migrateJobConfig prompts behavior has tainted finite aggregate provenance');
      if (aggregate?.identities.some(leaf => aliasOriginReachesBinding(leaf, samplesDeclaration, bindings, substitutions))) return true;
    }
    const member = staticMember(expression);
    if (member !== undefined) return (unwrap(member.base).kind === ts.SyntaxKind.ThisKeyword
      && aliasOriginReachesBinding(expression, samplesDeclaration, bindings, substitutions))
      || isAccumulatorAccess(member.base, substitutions);
    return aliasOriginReachesBinding(expression, samplesDeclaration, bindings, substitutions);
  };
  const pushedItemBinding = ts.isIdentifier(pushedArgument) ? bindings.bindingDeclaration(pushedArgument) : undefined;
  const isPromptItemAccess = (expression: ts.Expression, substitutions: InvocationSubstitutions = new Map()): boolean => {
    expression = unwrap(expression);
    if (ts.isIdentifier(expression)) {
      if (pushedItemBinding !== undefined && invocationIdentifierResolvesTo(expression, pushedItemBinding, bindings, substitutions)) return true;
      return invocationIdentifierResolvesTo(expression, samplesDeclaration, bindings, substitutions);
    }
    if (ts.isElementAccessExpression(expression) && staticMember(expression) === undefined) {
      const aggregate = finiteAggregateRelevance(expression.expression, bindings, substitutions);
      if (aggregate?.kind === 'tainted') fail(expression, 'migrateJobConfig prompts behavior has tainted finite aggregate provenance');
      if (aggregate?.identities.some(leaf => (pushedItemBinding !== undefined && aliasOriginReachesBinding(leaf, pushedItemBinding, bindings, substitutions))
        || aliasOriginReachesBinding(leaf, samplesDeclaration, bindings, substitutions))) return true;
    }
    const member = staticMember(expression);
    if (member !== undefined) return (unwrap(member.base).kind === ts.SyntaxKind.ThisKeyword
      && ((pushedItemBinding !== undefined && aliasOriginReachesBinding(expression, pushedItemBinding, bindings, substitutions))
        || aliasOriginReachesBinding(expression, samplesDeclaration, bindings, substitutions)))
      || isPromptItemAccess(member.base, substitutions);
    return (pushedItemBinding !== undefined && aliasOriginReachesBinding(expression, pushedItemBinding, bindings, substitutions))
      || aliasOriginReachesBinding(expression, samplesDeclaration, bindings, substitutions);
  };
  const isTrackedPromptMutationTarget = (expression: ts.Expression, substitutions: InvocationSubstitutions): boolean => isAccumulatorAccess(expression, substitutions) || isPromptItemAccess(expression, substitutions);
  const unsupportedAccumulatorEffects: ts.Node[] = [];
  visitExecutableFunctionNodes(owner, bindings, (node, substitutions) => {
    if (ts.isCallExpression(node) && node !== pushes[0] && unmodeledCallConsumesRelevantIdentity(node, [samplesDeclaration], bindings, substitutions)) unsupportedAccumulatorEffects.push(node);
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(unwrap(node.expression))) {
      const callee = unwrap(node.expression) as ts.PropertyAccessExpression;
      if (isTrackedPromptMutationTarget(callee.expression, substitutions) && node !== pushes[0]) unsupportedAccumulatorEffects.push(node);
    }
    if (ts.isCallExpression(node)) {
      const invocation = normalizeInvocation(node, bindings, substitutions);
      const api = resolveMutationApiIdentity(invocation.target, bindings, substitutions);
      if (api?.exactGlobal === true && (invocation.arguments === undefined || invocation.arguments[0] === undefined || invocation.unsupported !== undefined ? false : isTrackedPromptMutationTarget(invocation.arguments[0], substitutions))) unsupportedAccumulatorEffects.push(node);
    }
    if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind) && assignmentTargetExpressions(node.left).some(target => isTrackedPromptMutationTarget(target, substitutions))) unsupportedAccumulatorEffects.push(node);
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && isTrackedPromptMutationTarget(node.operand, substitutions)) unsupportedAccumulatorEffects.push(node);
  }, true, undefined, [samplesDeclaration]);
  if (unsupportedAccumulatorEffects.length > 0) fail(unsupportedAccumulatorEffects[0], 'migrateJobConfig prompts behavior has an unsupported accumulator mutation');
  if (!(samplesDeclaration.getStart() < loops[0].getStart() && loops[0].getStart() < sampleWrite.node.getStart() && sampleWrite.node.getStart() < promptDelete.node.getStart())) fail(promptIf, 'migrateJobConfig prompts behavior requires map, write, then delete order');

  const typeWrite = take('write', 'config.process[*].type');
  const typeIf = enclosingIfWithin(typeWrite.node, owner);
  const typeParts = typeIf === undefined ? [] : flattenAnd(typeIf.expression);
  const typeComparison = typeParts[1] === undefined ? undefined : unwrap(typeParts[1]);
  if (typeParts.length !== 2 || !pathIs(typeParts[0], 'config.process', typeWrite.substitutions) || typeComparison === undefined || !ts.isBinaryExpression(typeComparison) || typeComparison.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken || !pathIs(typeComparison.left, 'config.process[*].type', typeWrite.substitutions) || !exactString(typeComparison.right, 'ui_trainer') || !exactString((typeWrite.node as ts.BinaryExpression).right, 'diffusion_trainer')) fail(typeWrite.node, 'migrateJobConfig type behavior is unsupported');
  requireExactConditions(typeWrite, [{ owner: typeIf!, arm: 'then' }], 'type');

  const autoWrite = take('write', 'config.process[*].model.layer_offloading');
  const autoDelete = take('delete', 'config.process[*].model.auto_memory');
  const autoIf = enclosingIfWithin(autoWrite.node, owner);
  if (autoIf === undefined || enclosingIfWithin(autoDelete.node, owner) !== autoIf || !exactInGuard(autoIf.expression, 'auto_memory', 'config.process[*].model', false, autoWrite.substitutions)) fail(autoWrite.node, 'migrateJobConfig auto_memory behavior requires the exact presence guard');
  requireExactConditions(autoWrite, [{ owner: autoIf, arm: 'then' }], 'auto_memory write');
  requireExactConditions(autoDelete, [{ owner: autoIf, arm: 'then' }], 'auto_memory delete');
  const autoValue = unwrap((autoWrite.node as ts.BinaryExpression).right);
  if (!ts.isBinaryExpression(autoValue) || autoValue.operatorToken.kind !== ts.SyntaxKind.BarBarToken || !pathIs(autoValue.left, 'config.process[*].model.auto_memory', autoWrite.substitutions) || !exactBoolean(autoValue.right, false) || autoWrite.node.getStart() >= autoDelete.node.getStart()) fail(autoWrite.node, 'migrateJobConfig auto_memory behavior requires falsey fallback, write, then delete');

  const loggingWrite = take('write', 'config.process[*].logging');
  const loggingIf = enclosingIfWithin(loggingWrite.node, owner);
  const loggingValue = unwrap((loggingWrite.node as ts.BinaryExpression).right);
  if (loggingIf === undefined || !exactInGuard(loggingIf.expression, 'logging', 'config.process[*]', true, loggingWrite.substitutions) || !ts.isObjectLiteralExpression(loggingValue)) fail(loggingWrite.node, 'migrateJobConfig logging behavior is unsupported');
  requireExactConditions(loggingWrite, [{ owner: loggingIf, arm: 'then' }], 'logging');
  const loggingProperties = objectProperties(loggingValue);
  if (loggingProperties.size !== 2 || !exactNumber(loggingProperties.get('log_every')!, 1) || !exactBoolean(loggingProperties.get('use_ui_logger')!, true)) fail(loggingValue, 'migrateJobConfig logging behavior requires exact defaults');

  const deviceWrite = take('write', 'config.process[*].device');
  const deviceIf = enclosingIfWithin(deviceWrite.node, owner);
  const deviceGuard = deviceIf === undefined ? undefined : unwrap(deviceIf.expression);
  const deviceInvocation = deviceGuard !== undefined && ts.isCallExpression(deviceGuard) ? normalizeInvocation(deviceGuard, bindings, deviceWrite.substitutions) : undefined;
  const deviceTarget = deviceInvocation === undefined ? undefined : unwrap(deviceInvocation.target);
  if (deviceInvocation === undefined || deviceInvocation.unsupported !== undefined || deviceInvocation.arguments?.length !== 0 || deviceTarget === undefined || !ts.isIdentifier(deviceTarget) || !identifierResolvesToExactImport(deviceTarget, 'isMac', '@/helpers/basic', bindings, deviceWrite.substitutions) || !exactString((deviceWrite.node as ts.BinaryExpression).right, 'mps')) fail(deviceWrite.node, 'migrateJobConfig device behavior requires exact isMac/mps semantics');
  requireExactConditions(deviceWrite, [{ owner: deviceIf!, arm: 'then' }], 'device');

  const unsupported = mutations.filter(item => !consumed.has(item));
  if (unsupported.length > 0) fail(unsupported[0].node, `migrateJobConfig unsupported reachable mutation ${unsupported[0].syntax} ${unsupported[0].path}`);

  const claims: UiSourceClaim[] = [
    behaviorSettingClaim(sourceName, 'migrateJobConfig::prompts-to-samples::nonempty-array::write', 'config.process[*].sample.samples', 'object-list', {
      guard: 'prompts-nonempty-array', operation: 'write', sources: ['config.process[*].sample.prompts'],
      payload: { kind: 'map-prompt-objects', source_path: 'config.process[*].sample.prompts', item_key: 'prompt' },
    }),
    behaviorSettingClaim(sourceName, 'migrateJobConfig::prompts-to-samples::after-write::delete', 'config.process[*].sample.prompts', 'string-list', {
      guard: 'after-prompts-write', operation: 'delete', sources: ['config.process[*].sample.prompts', 'config.process[*].sample.samples'], payload: { kind: 'undefined' },
    }),
    behaviorSettingClaim(sourceName, 'migrateJobConfig::type::ui_trainer::write', 'config.process[*].type', 'string', {
      guard: 'type-is-ui-trainer', operation: 'write', sources: ['config.process[*].type'], payload: { kind: 'literal', value: { kind: 'string', value: 'diffusion_trainer' } },
    }, [{ kind: 'string', value: 'diffusion_trainer' }]),
    behaviorSettingClaim(sourceName, 'migrateJobConfig::auto_memory::present::write', 'config.process[*].model.layer_offloading', 'boolean', {
      guard: 'property-present', operation: 'write', sources: ['config.process[*].model.auto_memory'], payload: { kind: 'copy', source_path: 'config.process[*].model.auto_memory', fallback: { kind: 'boolean', value: false } },
    }),
    behaviorSettingClaim(sourceName, 'migrateJobConfig::auto_memory::after-write::delete', 'config.process[*].model.auto_memory', 'boolean', {
      guard: 'property-present', operation: 'delete', sources: ['config.process[*].model.auto_memory', 'config.process[*].model.layer_offloading'], payload: { kind: 'undefined' },
    }),
    behaviorSettingClaim(sourceName, 'migrateJobConfig::logging::absent::write', 'config.process[*].logging', 'object', {
      guard: 'property-absent', operation: 'write', sources: [], payload: { kind: 'literal', value: { kind: 'object', entries: [
        { key: 'log_every', value: { kind: 'number', value: 1 } }, { key: 'use_ui_logger', value: { kind: 'boolean', value: true } },
      ] } },
    }),
    behaviorSettingClaim(sourceName, 'migrateJobConfig::device::mac::write', 'config.process[*].device', 'string', {
      guard: 'platform-mac', operation: 'write', sources: [], payload: { kind: 'literal', value: { kind: 'string', value: 'mps' } },
    }, [{ kind: 'string', value: 'mps' }]),
  ];
  return claims.sort((left, right) => compareCodePoint(left.symbol, right.symbol));
}

function scopedFunctionConfigPath(
  expression: ts.Expression,
  configParameter: ts.Identifier,
  bindings: LexicalBindings,
  seen = new Set<ts.Identifier>(),
  substitutions: InvocationSubstitutions = new Map(),
  followTerminalAliasProjection = true,
): string | undefined {
  const normalizeScopedPath = (raw: string): string => {
    const canonical = raw.startsWith('$job.') ? raw.slice('$job.'.length) : raw;
    return canonical.startsWith('config.')
      ? normalizePath(canonical, { allowCanonicalWildcards: true })
      : raw;
  };
  expression = unwrap(expression);
  if (substitutions.has(expression)) {
    const substitution = substitutions.get(expression)!;
    if (substitution === 'tainted' || substitution === 'absent') fail(expression, 'unsupported reachable mutation: tainted callback receiver provenance');
    return scopedFunctionConfigPath(substitution, configParameter, bindings, seen, substitutions);
  }
  const syntacticMember = staticMember(expression);
  if (syntacticMember !== undefined) {
    const provenance = resolveAliasProvenance(expression, bindings, substitutions, seen);
    const basePath = scopedFunctionConfigPath(syntacticMember.base, configParameter, bindings, seen, substitutions);
    if (provenance.kind === 'tainted' && basePath === undefined && expressionBindingReachability(expression, configParameter, bindings, substitutions) !== 'unrelated') {
      fail(expression, `unsupported reachable mutation: tainted member provenance for ${expression.getText()}`);
    }
  }
  if (ts.isIdentifier(expression)) {
    if (bindings.isBinding(expression, configParameter)) return '$job';
    const declaration = bindings.bindingDeclaration(expression);
    if (declaration === undefined || seen.has(declaration)) return undefined;
    const nextSeen = new Set(seen).add(declaration);
    if (substitutions.has(declaration)) {
      const resolved = resolveAliasProvenance(expression, bindings, substitutions, seen);
      if (resolved.kind === 'tainted') fail(expression, 'unsupported reachable mutation: tainted configuration provenance');
      return resolved.kind !== 'exact' || ts.isMethodDeclaration(resolved.origin) || resolved.origin === expression
        ? undefined
        : scopedFunctionConfigPath(resolved.origin, configParameter, bindings, nextSeen, substitutions);
    }
    const resolved = resolveAliasProvenance(expression, bindings, substitutions, seen);
    if (resolved.kind === 'tainted') fail(expression, 'unsupported reachable mutation: tainted configuration provenance');
    return resolved.kind !== 'exact' || ts.isMethodDeclaration(resolved.origin) || resolved.origin === expression
      ? undefined
      : scopedFunctionConfigPath(resolved.origin, configParameter, bindings, nextSeen, substitutions);
  }
  if (ts.isCallExpression(expression) && expression.arguments[0] !== undefined) {
    const returned = resolveAliasProvenance(expression, bindings, substitutions, seen);
    if (returned.kind === 'tainted') fail(expression, 'unsupported reachable mutation: tainted call return provenance');
    if (returned.kind === 'exact' && !ts.isMethodDeclaration(returned.origin) && returned.origin !== expression) {
      return scopedFunctionConfigPath(returned.origin, configParameter, bindings, seen, substitutions);
    }
    const invocation = normalizeInvocation(expression, bindings, substitutions);
    const callName = unwrap(invocation.target);
    if (ts.isIdentifier(callName) && (
      identifierResolvesToExactImport(callName, 'objectCopy', '@/utils/basic', bindings)
      || identifierResolvesToExactImport(callName, 'clearUnsupportedAnimaPaths', '@/helpers/animaModelPaths', bindings)
    ) && invocation.arguments?.[0] !== undefined) return scopedFunctionConfigPath(invocation.arguments[0], configParameter, bindings, seen, substitutions);
  }
  const staticComputedKey = (candidate: ts.Expression): string | 'tainted' => {
    candidate = unwrap(candidate);
    if (ts.isBinaryExpression(candidate) && candidate.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = staticComputedKey(candidate.left);
      const right = staticComputedKey(candidate.right);
      return left !== 'tainted' && right !== 'tainted' && /^-?\d+(?:\.\d+)?$/.test(left) && /^-?\d+(?:\.\d+)?$/.test(right)
        ? String(Number(left) + Number(right))
        : 'tainted';
    }
    const provenance = resolveAliasProvenance(candidate, bindings, substitutions);
    if (provenance.kind !== 'exact' || ts.isMethodDeclaration(provenance.origin)) return 'tainted';
    const origin = unwrap(provenance.origin);
    return ts.isStringLiteral(origin) || ts.isNumericLiteral(origin) || ts.isNoSubstitutionTemplateLiteral(origin)
      ? origin.text
      : 'tainted';
  };
  let member = staticMember(expression);
  if (member === undefined && ts.isElementAccessExpression(expression) && expression.argumentExpression !== undefined) {
    const key = staticComputedKey(expression.argumentExpression);
    if (key === 'tainted') {
      const base = scopedFunctionConfigPath(expression.expression, configParameter, bindings, seen, substitutions);
      const aggregate = finiteAggregateRelevance(expression.expression, bindings, substitutions, seen);
      const relevantLeaf = (leaf: ts.Expression): boolean => {
        const path = scopedFunctionConfigPath(leaf, configParameter, bindings, seen, substitutions);
        return path === '$job' || path?.startsWith('config.') === true;
      };
      const relevantAggregate = aggregate?.leaves.some(relevantLeaf) === true
        || (aggregate?.kind === 'tainted' && aggregate.identities.some(identity => {
        if (relevantLeaf(identity)) return true;
        const provenance = resolveAliasProvenance(identity, bindings, substitutions, seen);
        return provenance.kind === 'tainted'
          || (provenance.kind === 'exact'
            && ts.isIdentifier(provenance.origin)
            && !bindings.lookup(provenance.origin).found
            && !bindings.isExactImportBinding(provenance.origin));
      }));
      if (base !== undefined || relevantAggregate) fail(expression.argumentExpression, 'unsupported reachable mutation: tainted configuration index provenance');
      return undefined;
    }
    member = { base: expression.expression, key };
  }
  if (member !== undefined) {
    const baseExpression = unwrap(member.base);
    const directBaseSubstitution = substitutions.get(baseExpression);
    if (directBaseSubstitution !== undefined) {
      if (directBaseSubstitution === 'tainted' || directBaseSubstitution === 'absent') {
        fail(baseExpression, 'unsupported reachable mutation: tainted callback receiver provenance');
      }
      const substitutedBase = resolveAliasProvenance(directBaseSubstitution, bindings, substitutions);
      if (substitutedBase.kind === 'tainted') fail(baseExpression, 'unsupported reachable mutation: tainted callback receiver provenance');
      if (substitutedBase.kind === 'exact' && !ts.isMethodDeclaration(substitutedBase.origin)) {
        const exactBase = unwrap(substitutedBase.origin);
        if (ts.isObjectLiteralExpression(exactBase)) {
          const projected = resolveObjectLiteralProperty(exactBase, member.key, bindings, substitutions, seen);
          if (projected.kind === 'tainted') fail(expression, `unsupported reachable mutation: tainted object-member provenance for ${expression.getText()}`);
          if (projected.kind === 'exact' && !ts.isMethodDeclaration(projected.origin)) {
            return scopedFunctionConfigPath(projected.origin, configParameter, bindings, seen, substitutions, followTerminalAliasProjection);
          }
          if (projected.kind === 'absent') return undefined;
        }
      }
    }
    const baseProvenance = resolveAliasProvenance(baseExpression, bindings, substitutions);
    const resolvedBase = baseProvenance.kind === 'exact' && !ts.isMethodDeclaration(baseProvenance.origin)
      ? unwrap(baseProvenance.origin)
      : baseExpression;
    if (ts.isArrayLiteralExpression(resolvedBase) && /^\d+$/.test(member.key)) {
      const element = resolvedBase.elements[Number(member.key)];
      if (element === undefined || ts.isOmittedExpression(element)) fail(expression, 'unsupported reachable mutation: sparse configuration receiver provenance');
      return scopedFunctionConfigPath(element as ts.Expression, configParameter, bindings, seen, substitutions);
    }
    const base = scopedFunctionConfigPath(member.base, configParameter, bindings, seen, substitutions);
    if (base === undefined) {
      const projected = resolveAliasProvenance(expression, bindings, substitutions, seen);
      return followTerminalAliasProjection
        && projected.kind === 'exact'
        && !ts.isMethodDeclaration(projected.origin)
        && projected.origin !== expression
        && !bindings.isStableMemberProjection(projected.origin)
        ? scopedFunctionConfigPath(projected.origin, configParameter, bindings, seen, substitutions)
        : undefined;
    }
    return normalizeScopedPath(member.key === '*'
      ? `${base}[*]`
      : /^\d+$/.test(member.key)
        ? `${base}[${member.key}]`
        : `${base}.${member.key}`);
  }
  return undefined;
}

function branchContains(branch: ts.Statement, node: ts.Node): boolean {
  return branch.getStart() <= node.getStart() && node.getEnd() <= branch.getEnd();
}

function resolveStaticString(
  expression: ts.Expression,
  bindings: LexicalBindings,
  substitutions: InvocationSubstitutions = new Map(),
): string | undefined {
  const provenance = resolveAliasProvenance(expression, bindings, substitutions);
  if (provenance.kind !== 'exact' || ts.isMethodDeclaration(provenance.origin)) return undefined;
  const origin = unwrap(provenance.origin);
  if (ts.isStringLiteral(origin) || ts.isNumericLiteral(origin) || ts.isNoSubstitutionTemplateLiteral(origin)) return origin.text;
  return undefined;
}

function additionalSectionCall(
  expression: ts.Expression,
  architecture: ts.Identifier,
  bindings: LexicalBindings,
): string | undefined {
  expression = unwrap(expression);
  if (!ts.isCallExpression(expression) || expression.arguments.length !== 1 || !ts.isPropertyAccessExpression(expression.expression) || expression.expression.name.text !== 'includes') return undefined;
  const receiver = unwrap(expression.expression.expression);
  if (!ts.isPropertyAccessExpression(receiver) || receiver.name.text !== 'additionalSections') return undefined;
  const base = unwrap(receiver.expression);
  return ts.isIdentifier(base) && invocationIdentifierResolvesTo(base, architecture, bindings, new Map())
    ? resolveStaticString(expression.arguments[0], bindings)
    : undefined;
}

function sectionFlag(
  expression: ts.Expression,
  architecture: ts.Identifier,
  bindings: LexicalBindings,
): string | undefined {
  const value = resolveAliasOrigin(expression, bindings);
  if (!ts.isBinaryExpression(value) || value.operatorToken.kind !== ts.SyntaxKind.BarBarToken || !exactBoolean(value.right, false)) return undefined;
  return additionalSectionCall(value.left, architecture, bindings);
}

function negatedSection(
  expression: ts.Expression,
  architecture: ts.Identifier,
  section: string,
  bindings: LexicalBindings,
): boolean {
  expression = unwrap(expression);
  return ts.isPrefixUnaryExpression(expression)
    && expression.operator === ts.SyntaxKind.ExclamationToken
    && additionalSectionCall(expression.operand, architecture, bindings) === section;
}

function exactMembershipGuard(
  expression: ts.Expression,
  key: string,
  objectPath: string,
  configParameter: ts.Identifier,
  bindings: LexicalBindings,
  negated = false,
  substitutions: InvocationSubstitutions = new Map(),
): boolean {
  expression = unwrap(expression);
  if (negated) {
    if (!ts.isPrefixUnaryExpression(expression) || expression.operator !== ts.SyntaxKind.ExclamationToken) return false;
    expression = unwrap(expression.operand);
  }
  return ts.isBinaryExpression(expression)
    && expression.operatorToken.kind === ts.SyntaxKind.InKeyword
    && exactString(expression.left, key)
    && scopedFunctionConfigPath(expression.right, configParameter, bindings, new Set(), substitutions) === objectPath;
}

function validateAnimaPathBehavior(sourceText: string, sourceName: string): void {
  const source = ts.createSourceFile(sourceName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const bindings = new LexicalBindings(source);
  const matches = source.statements.filter(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === 'clearUnsupportedAnimaPaths') as ts.FunctionDeclaration[];
  if (matches.length !== 1) fail(source, 'Anima path behavior requires one exact helper declaration');
  const helper = matches[0];
  const modifiers = ts.getModifiers(helper) ?? [];
  if (!modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) || helper.body === undefined || helper.parameters.length !== 2 || !ts.isIdentifier(helper.parameters[0].name) || !ts.isIdentifier(helper.parameters[1].name)) fail(helper, 'Anima path behavior requires an exported two-parameter helper');
  const [modelParameter, sectionsParameter] = helper.parameters.map(parameter => parameter.name as ts.Identifier);
  const supportByBinding = new Map<ts.Identifier, string>();
  let cleanedBinding: ts.Identifier | undefined;
  const liveReturns: ts.ReturnStatement[] = [];
  const visit = (node: ts.Node): void => {
    if (isStaticallyDead(node)) return;
    if (node !== helper && ts.isFunctionLike(node)) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      const initializer = unwrap(node.initializer);
      if (ts.isBinaryExpression(initializer) && initializer.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken && exactBoolean(initializer.right, true)) {
        const section = (() => {
          const call = unwrap(initializer.left);
          if (!ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'includes' || call.arguments.length !== 1) return undefined;
          const receiver = unwrap(call.expression.expression);
          return ts.isIdentifier(receiver) && bindings.isBinding(receiver, sectionsParameter)
            ? resolveStaticString(call.arguments[0], bindings)
            : undefined;
        })();
        if (section !== undefined) supportByBinding.set(node.name, section);
      }
      if (ts.isObjectLiteralExpression(initializer) && initializer.properties.length === 1 && ts.isSpreadAssignment(initializer.properties[0])) {
        const spread = unwrap(initializer.properties[0].expression);
        if (ts.isIdentifier(spread) && bindings.isBinding(spread, modelParameter)) cleanedBinding = node.name;
      }
    }
    if (ts.isReturnStatement(node)) liveReturns.push(node);
    ts.forEachChild(node, visit);
  };
  visit(helper.body);
  const expected = new Map([
    ['te_name_or_path', 'model.te_name_or_path'],
    ['vae_path', 'model.vae_path'],
  ]);
  if (cleanedBinding === undefined || supportByBinding.size !== expected.size) fail(helper, 'Anima path behavior has unsupported cleanup structure');
  type AnimaMutation = {
    node: ts.Node;
    root: 'model' | 'cleaned';
    path: string;
    operation: 'write' | 'delete';
    syntax: 'direct' | 'api';
    execution: 'known' | 'unmodeled-callback';
  };
  const mutations: AnimaMutation[] = [];
  const animaPath = (
    expression: ts.Expression,
    substitutions: InvocationSubstitutions,
  ): { root: AnimaMutation['root']; path: string } | undefined => {
    expression = unwrap(expression);
    let projectedRoot: AnimaMutation['root'] | undefined;
    let projectedAnchor: ts.Expression | undefined;
    const hasDynamicAggregateAccess = (candidate: ts.Expression): boolean => {
      candidate = unwrap(candidate);
      if (ts.isElementAccessExpression(candidate) && staticMember(candidate) === undefined
        && finiteAggregateRelevance(candidate.expression, bindings, substitutions) !== undefined) return true;
      const member = staticMember(candidate);
      return member !== undefined && hasDynamicAggregateAccess(member.base);
    };
    if (hasDynamicAggregateAccess(expression)) {
      const projected = resolveAliasProvenance(expression, bindings, substitutions);
      if (projected.kind === 'tainted') fail(expression, 'Anima path behavior has tainted finite aggregate provenance');
    }
    let syntacticRoot = expression;
    for (let member = staticMember(syntacticRoot); member !== undefined; member = staticMember(syntacticRoot)) syntacticRoot = unwrap(member.base);
    if (syntacticRoot.kind === ts.SyntaxKind.ThisKeyword) {
      const projected = resolveAliasProvenance(expression, bindings, substitutions);
      if (projected.kind === 'tainted') fail(expression, 'Anima path behavior has tainted callback receiver provenance');
    }
    for (let candidate: ts.Expression | undefined = expression; candidate !== undefined;) {
      const projected = resolveAliasProvenance(candidate, bindings, substitutions);
      if (projected.kind === 'tainted' && (
        expressionBindingReachability(candidate, modelParameter, bindings, substitutions) !== 'unrelated'
        || expressionBindingReachability(candidate, cleanedBinding!, bindings, substitutions) !== 'unrelated'
      )) fail(candidate, 'Anima path behavior has tainted member provenance');
      if (projected.kind === 'exact') {
        if (projected.lineage?.has(cleanedBinding!)) projectedRoot = 'cleaned';
        else if (projected.lineage?.has(modelParameter)) projectedRoot = 'model';
        if (projectedRoot !== undefined) {
          projectedAnchor = candidate;
          break;
        }
      }
      const member = staticMember(candidate);
      candidate = member === undefined ? undefined : unwrap(member.base);
    }
    const parts: string[] = [];
    while (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
      if (expression === projectedAnchor) break;
      if (ts.isPropertyAccessExpression(expression)) parts.unshift(expression.name.text);
      else {
        const key = expression.argumentExpression === undefined ? undefined : resolveStaticString(expression.argumentExpression, bindings, substitutions);
        if (key === undefined) return undefined;
        parts.unshift(key);
      }
      expression = unwrap(expression.expression);
    }
    const root = projectedRoot ?? (aliasOriginReachesBinding(expression, cleanedBinding!, bindings, substitutions)
      ? 'cleaned'
      : aliasOriginReachesBinding(expression, modelParameter, bindings, substitutions)
        ? 'model'
        : undefined);
    return root === undefined ? undefined : { root, path: parts.join('.') };
  };
  visitExecutableFunctionNodes(helper, bindings, (node, substitutions, execution) => {
    if (ts.isCallExpression(node) && unmodeledCallConsumesRelevantIdentity(node, [modelParameter, cleanedBinding!], bindings, substitutions)) {
      fail(node, 'Anima path behavior has an unsupported unmodeled call consuming model identity');
    }
    const record = (target: ts.Expression, operation: AnimaMutation['operation'], syntax: AnimaMutation['syntax'], key?: string): void => {
      const resolved = animaPath(target, substitutions);
      if (resolved === undefined) return;
      mutations.push({ node, root: resolved.root, path: [resolved.path, key].filter(Boolean).join('.'), operation, syntax, execution });
    };
    if (ts.isDeleteExpression(node)) record(node.expression, 'delete', 'direct');
    else if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
      for (const target of assignmentTargetExpressions(node.left)) record(target, 'write', 'direct');
    } else if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)) record(node.operand, 'write', 'direct');
    else if (ts.isCallExpression(node)) {
      const invocation = normalizeInvocation(node, bindings, substitutions);
      const api = resolveMutationApiIdentity(invocation.target, bindings, substitutions);
      if (api?.exactGlobal !== true) return;
      if (invocation.unsupported !== undefined || invocation.arguments === undefined) fail(node, `Anima path behavior has unsupported mutation API invocation: ${invocation.unsupported ?? 'unknown arguments'}`);
      const args = invocation.arguments;
      if (args[0] === undefined) return;
      const key = ['defineProperty', 'set', 'deleteProperty'].includes(api.method) ? resolveStaticString(args[1], bindings, substitutions) : undefined;
      const apiPropertyKey = (name: ts.PropertyName): string | undefined => ts.isComputedPropertyName(name)
        ? resolveStaticString(name.expression, bindings, substitutions)
        : propertyName(name);
      if (api.method === 'assign') {
        const source = args[1] === undefined ? undefined : unwrap(args[1]);
        if (source !== undefined && ts.isObjectLiteralExpression(source)) {
          for (const property of source.properties) record(args[0], 'write', 'api', ts.isSpreadAssignment(property) ? undefined : apiPropertyKey(property.name));
        } else record(args[0], 'write', 'api');
      } else if (api.method === 'defineProperties') {
        const descriptors = args[1] === undefined ? undefined : unwrap(args[1]);
        if (descriptors !== undefined && ts.isObjectLiteralExpression(descriptors)) {
          for (const property of descriptors.properties) record(args[0], 'write', 'api', ts.isSpreadAssignment(property) ? undefined : apiPropertyKey(property.name));
        } else record(args[0], 'write', 'api');
      } else if (api.method === 'defineProperty' || (api.receiver === 'Reflect' && api.method === 'set')) record(args[0], 'write', 'api', key);
      else if (api.receiver === 'Reflect' && api.method === 'deleteProperty') record(args[0], 'delete', 'api', key);
    }
  }, true, undefined, [modelParameter, cleanedBinding!]);
  const cleanedMutations = mutations.filter(mutation => mutation.root === 'cleaned');
  const modelMutations = mutations.filter(mutation => mutation.root === 'model');
  const deleteEffects = cleanedMutations.filter(mutation => mutation.execution === 'known' && mutation.operation === 'delete' && mutation.syntax === 'direct');
  const deleteByPath = new Map(deleteEffects.map(effect => [effect.path, effect.node]));
  if (modelMutations.length !== 0 || cleanedMutations.length !== expected.size || deleteEffects.length !== expected.size || deleteByPath.size !== expected.size) fail(helper, 'Anima path behavior has unsupported reachable model mutation inventory');
  const identityReturns = helper.body.statements.filter(statement => {
    if (!ts.isIfStatement(statement) || statement.elseStatement !== undefined) return false;
    const returned = ts.isBlock(statement.thenStatement) && statement.thenStatement.statements.length === 1
      ? statement.thenStatement.statements[0]
      : statement.thenStatement;
    if (!ts.isReturnStatement(returned) || returned.expression === undefined) return false;
    const value = unwrap(returned.expression);
    if (!ts.isIdentifier(value) || !bindings.isBinding(value, modelParameter)) return false;
    const guards = flattenAnd(statement.expression);
    if (guards.length !== 2 || guards.some(guard => !ts.isIdentifier(unwrap(guard)))) return false;
    return new Set(guards.map(guard => {
      const identifier = unwrap(guard) as ts.Identifier;
      return [...supportByBinding].find(([binding]) => bindings.isBinding(identifier, binding))?.[1];
    })).size === 2
      && guards.every(guard => [...supportByBinding].some(([binding]) => bindings.isBinding(unwrap(guard) as ts.Identifier, binding)));
  });
  if (identityReturns.length !== 1 || identityReturns[0].getStart() >= cleanedBinding.parent.getStart()) fail(helper, 'Anima path behavior requires an identity-preserving supported-sections early return');
  const identityGuard = identityReturns[0] as ts.IfStatement;
  const identityReturn = ts.isBlock(identityGuard.thenStatement)
    ? identityGuard.thenStatement.statements[0]
    : identityGuard.thenStatement;
  const finalReturn = helper.body.statements[helper.body.statements.length - 1];
  const finalValue = ts.isReturnStatement(finalReturn) && finalReturn.expression !== undefined
    ? unwrap(finalReturn.expression)
    : undefined;
  if (liveReturns.length !== 2 || !liveReturns.includes(identityReturn as ts.ReturnStatement) || finalValue === undefined || !ts.isIdentifier(finalValue) || !bindings.isBinding(finalValue, cleanedBinding) || liveReturns[1] !== finalReturn) fail(helper, 'Anima path behavior requires exhaustive identity-or-cleaned live returns');
  for (const [path, section] of expected) {
    const deletion = deleteByPath.get(path);
    if (deletion === undefined) fail(helper, `Anima path behavior requires ${path} deletion`);
    const runtimeWrappers: ts.Node[] = [];
    let ancestor: ts.Node | undefined = deletion.parent;
    while (ancestor !== undefined && ancestor !== helper) {
      if (ts.isIfStatement(ancestor) || ts.isConditionalExpression(ancestor) || ts.isForStatement(ancestor) || ts.isForOfStatement(ancestor) || ts.isForInStatement(ancestor) || ts.isWhileStatement(ancestor) || ts.isDoStatement(ancestor) || ts.isTryStatement(ancestor) || ts.isSwitchStatement(ancestor)) runtimeWrappers.push(ancestor);
      else if (ts.isBinaryExpression(ancestor) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(ancestor.operatorToken.kind)) runtimeWrappers.push(ancestor);
      ancestor = ancestor.parent;
    }
    const guard = runtimeWrappers.length === 1 && ts.isIfStatement(runtimeWrappers[0]) ? runtimeWrappers[0] : undefined;
    const operand = guard === undefined ? undefined : unwrap(guard.expression);
    if (operand === undefined || !ts.isPrefixUnaryExpression(operand) || operand.operator !== ts.SyntaxKind.ExclamationToken || !ts.isIdentifier(unwrap(operand.operand))) fail(deletion, `Anima path behavior requires ${path} unsupported-section guard`);
    const support = [...supportByBinding].find(([binding]) => bindings.isBinding(unwrap(operand.operand) as ts.Identifier, binding));
    if (support?.[1] !== section) fail(deletion, `Anima path behavior requires ${section} guard`);
  }
}

type HandlerSetterCall = {
  node: ts.CallExpression;
  arguments: readonly ts.Expression[];
  path?: string;
  value: ts.Expression;
  execution: 'known' | 'unmodeled-callback';
  conditions: readonly ConditionalExecutionContext[];
};

export function collectHandleModelArchChangeBehaviorClaimsFromSource(
  sourceText: string,
  animaPathSourceText: string,
  sourceName = 'ui/src/app/jobs/new/utils.ts',
  animaPathSourceName = 'ui/src/helpers/animaModelPaths.ts',
): UiSourceClaim[] {
  const source = ts.createSourceFile(sourceName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const owner = exportedArrowFunction(source, 'handleModelArchChange');
  if (owner === undefined) return [];
  if (owner.parameters.length !== 4 || owner.parameters.some(parameter => exactCallbackIdentifier(parameter) === undefined)) fail(owner, 'handleModelArchChange behavior requires four exact parameters');
  const ownerBody = owner.body;
  if (!ts.isBlock(ownerBody)) fail(owner, 'handleModelArchChange behavior requires a block body');
  const [currentName, nextName, configParameter, setterParameter] = owner.parameters.map(parameter => exactCallbackIdentifier(parameter)!);
  const bindings = new LexicalBindings(source);
  const expandDatasetDefaultsDeclarations = source.statements.flatMap(statement => ts.isVariableStatement(statement)
    ? [...statement.declarationList.declarations].filter(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'expandDatasetDefaults')
    : []);
  if (expandDatasetDefaultsDeclarations.length !== 1 || !ts.isIdentifier(expandDatasetDefaultsDeclarations[0].name) || expandDatasetDefaultsDeclarations[0].initializer === undefined || !ts.isArrowFunction(unwrap(expandDatasetDefaultsDeclarations[0].initializer))) fail(owner, 'handleModelArchChange behavior requires one exact expandDatasetDefaults helper binding');
  const expandDatasetDefaultsBinding = expandDatasetDefaultsDeclarations[0].name;
  const expandDatasetDefaults = unwrap(expandDatasetDefaultsDeclarations[0].initializer!);
  const expandFailure = (node: ts.Node): never => fail(node, 'handleModelArchChange behavior requires exact expandDatasetDefaults helper semantics');
  if (
    !ts.isArrowFunction(expandDatasetDefaults)
    || !ts.isBlock(expandDatasetDefaults.body)
    || (ts.getCombinedModifierFlags(expandDatasetDefaults) & ts.ModifierFlags.Async) !== 0
    || expandDatasetDefaults.parameters.length !== 2
  ) expandFailure(expandDatasetDefaults);
  const expandHelper = expandDatasetDefaults as ts.ArrowFunction;
  const expandHelperBody = expandHelper.body as ts.Block;
  const defaultsParameter = exactCallbackIdentifier(expandHelper.parameters[0]);
  const datasetCountParameter = exactCallbackIdentifier(expandHelper.parameters[1]);
  if (defaultsParameter === undefined || datasetCountParameter === undefined) expandFailure(expandDatasetDefaults);
  const defaultsBinding = defaultsParameter as ts.Identifier;
  const datasetCountBinding = datasetCountParameter as ts.Identifier;
  const helperStatements = expandHelperBody.statements;
  const resultStatement = helperStatements[0];
  const projectionLoop = helperStatements[1];
  const resultStatementReturn = helperStatements[2];
  if (
    helperStatements.length !== 3
    || resultStatement === undefined
    || !ts.isVariableStatement(resultStatement)
    || (resultStatement.declarationList.flags & ts.NodeFlags.Const) === 0
    || resultStatement.declarationList.declarations.length !== 1
  ) expandFailure(expandHelperBody);
  const exactResultStatement = resultStatement as ts.VariableStatement;
  const resultDeclaration = exactResultStatement.declarationList.declarations[0];
  const resultBinding = ts.isIdentifier(resultDeclaration.name) ? resultDeclaration.name : undefined;
  const resultInitializer = resultDeclaration.initializer === undefined ? undefined : unwrap(resultDeclaration.initializer);
  if (
    resultBinding === undefined
    || resultInitializer === undefined
    || !ts.isObjectLiteralExpression(resultInitializer)
    || resultInitializer.properties.length !== 1
    || !ts.isSpreadAssignment(resultInitializer.properties[0])
  ) expandFailure(resultDeclaration);
  const expandedResultBinding = resultBinding as ts.Identifier;
  const expandedResultInitializer = resultInitializer as ts.ObjectLiteralExpression;
  const initialSpread = expandedResultInitializer.properties[0] as ts.SpreadAssignment;
  const initialSpreadValue = unwrap(initialSpread.expression);
  if (!ts.isIdentifier(initialSpreadValue) || !bindings.isBinding(initialSpreadValue, defaultsBinding)) expandFailure(initialSpread);
  if (
    projectionLoop === undefined
    || !ts.isForInStatement(projectionLoop)
    || !ts.isVariableDeclarationList(projectionLoop.initializer)
    || (projectionLoop.initializer.flags & ts.NodeFlags.Const) === 0
    || projectionLoop.initializer.declarations.length !== 1
    || !ts.isIdentifier(projectionLoop.initializer.declarations[0].name)
  ) expandFailure(projectionLoop ?? expandHelperBody);
  const exactProjectionLoop = projectionLoop as ts.ForInStatement;
  const keyBinding = (exactProjectionLoop.initializer as ts.VariableDeclarationList).declarations[0].name as ts.Identifier;
  const projectionSource = unwrap(exactProjectionLoop.expression);
  if (!ts.isIdentifier(projectionSource) || !bindings.isBinding(projectionSource, defaultsBinding) || !ts.isBlock(exactProjectionLoop.statement) || exactProjectionLoop.statement.statements.length !== 1) expandFailure(exactProjectionLoop);
  const projectionBody = exactProjectionLoop.statement as ts.Block;
  const placeholderIf = projectionBody.statements[0];
  if (!ts.isIfStatement(placeholderIf) || placeholderIf.elseStatement !== undefined || !ts.isBlock(placeholderIf.thenStatement) || placeholderIf.thenStatement.statements.length !== 2) expandFailure(placeholderIf);
  const exactPlaceholderIf = placeholderIf as ts.IfStatement;
  const placeholderBody = exactPlaceholderIf.thenStatement as ts.Block;
  const placeholderCall = unwrap(exactPlaceholderIf.expression);
  const placeholderMember = ts.isCallExpression(placeholderCall) ? staticMember(placeholderCall.expression) : undefined;
  const placeholderBase = placeholderMember === undefined ? undefined : unwrap(placeholderMember.base);
  if (
    !ts.isCallExpression(placeholderCall)
    || placeholderMember?.key !== 'includes'
    || placeholderBase === undefined
    || !ts.isIdentifier(placeholderBase)
    || !bindings.isBinding(placeholderBase, keyBinding)
    || placeholderCall.arguments.length !== 1
    || !exactString(placeholderCall.arguments[0], 'datasets[x].')
  ) expandFailure(exactPlaceholderIf.expression);
  const expansionLoop = placeholderBody.statements[0];
  const sourceDeleteStatement = placeholderBody.statements[1];
  if (
    !ts.isForStatement(expansionLoop)
    || expansionLoop.initializer === undefined
    || !ts.isVariableDeclarationList(expansionLoop.initializer)
    || expansionLoop.initializer.declarations.length !== 1
    || !ts.isIdentifier(expansionLoop.initializer.declarations[0].name)
  ) expandFailure(expansionLoop);
  const exactExpansionLoop = expansionLoop as ts.ForStatement;
  const expansionInitializer = exactExpansionLoop.initializer as ts.VariableDeclarationList;
  const indexDeclaration = expansionInitializer.declarations[0];
  const indexBinding = indexDeclaration.name as ts.Identifier;
  if (indexDeclaration.initializer === undefined || !exactNumber(indexDeclaration.initializer, 0)) expandFailure(indexDeclaration);
  const expansionCondition = exactExpansionLoop.condition === undefined ? undefined : unwrap(exactExpansionLoop.condition);
  const expansionIncrement = exactExpansionLoop.incrementor === undefined ? undefined : unwrap(exactExpansionLoop.incrementor);
  if (
    expansionCondition === undefined
    || !ts.isBinaryExpression(expansionCondition)
    || expansionCondition.operatorToken.kind !== ts.SyntaxKind.LessThanToken
    || !ts.isIdentifier(unwrap(expansionCondition.left))
    || !bindings.isBinding(unwrap(expansionCondition.left) as ts.Identifier, indexBinding)
    || !ts.isIdentifier(unwrap(expansionCondition.right))
    || !bindings.isBinding(unwrap(expansionCondition.right) as ts.Identifier, datasetCountBinding)
    || expansionIncrement === undefined
    || !ts.isPostfixUnaryExpression(expansionIncrement)
    || expansionIncrement.operator !== ts.SyntaxKind.PlusPlusToken
    || !ts.isIdentifier(unwrap(expansionIncrement.operand))
    || !bindings.isBinding(unwrap(expansionIncrement.operand) as ts.Identifier, indexBinding)
    || !ts.isBlock(exactExpansionLoop.statement)
    || exactExpansionLoop.statement.statements.length !== 3
  ) expandFailure(exactExpansionLoop);
  const expansionBody = exactExpansionLoop.statement as ts.Block;
  const [projectedKeyStatement, valueStatement, projectedWriteStatement] = expansionBody.statements;
  const oneIdentifierDeclaration = (statement: ts.Statement): { binding: ts.Identifier; initializer: ts.Expression } | undefined => {
    if (!ts.isVariableStatement(statement) || statement.declarationList.declarations.length !== 1) return undefined;
    const declaration = statement.declarationList.declarations[0];
    return ts.isIdentifier(declaration.name) && declaration.initializer !== undefined
      ? { binding: declaration.name, initializer: unwrap(declaration.initializer) }
      : undefined;
  };
  const projectedKey = oneIdentifierDeclaration(projectedKeyStatement);
  const projectedKeyCall = projectedKey === undefined ? undefined : unwrap(projectedKey.initializer);
  const projectedKeyMember = projectedKeyCall !== undefined && ts.isCallExpression(projectedKeyCall) ? staticMember(projectedKeyCall.expression) : undefined;
  const projectedKeyBase = projectedKeyMember === undefined ? undefined : unwrap(projectedKeyMember.base);
  const projectedTemplate = projectedKeyCall !== undefined && ts.isCallExpression(projectedKeyCall) ? unwrap(projectedKeyCall.arguments[1]) : undefined;
  if (
    projectedKey === undefined
    || projectedKeyCall === undefined
    || !ts.isCallExpression(projectedKeyCall)
    || projectedKeyMember?.key !== 'replace'
    || projectedKeyBase === undefined
    || !ts.isIdentifier(projectedKeyBase)
    || projectedKeyCall.arguments.length !== 2
    || !exactString(projectedKeyCall.arguments[0], 'datasets[x].')
    || projectedTemplate === undefined
    || !ts.isTemplateExpression(projectedTemplate)
    || projectedTemplate.head.text !== 'datasets['
    || projectedTemplate.templateSpans.length !== 1
    || !ts.isIdentifier(unwrap(projectedTemplate.templateSpans[0].expression))
    || projectedTemplate.templateSpans[0].literal.text !== '].'
  ) expandFailure(projectedKeyStatement);
  const exactProjectedKeyBase = projectedKeyBase as ts.Identifier;
  const exactProjectedTemplate = projectedTemplate as ts.TemplateExpression;
  const projectedIndex = unwrap(exactProjectedTemplate.templateSpans[0].expression) as ts.Identifier;
  if (!bindings.isBinding(exactProjectedKeyBase, keyBinding) || projectedIndex.text !== indexBinding.text) expandFailure(projectedKeyStatement);
  const exactProjectedKey = projectedKey as { binding: ts.Identifier; initializer: ts.Expression };
  const projectedValue = oneIdentifierDeclaration(valueStatement);
  const projectedValueAccess = projectedValue === undefined ? undefined : unwrap(projectedValue.initializer);
  const projectedValueBase = projectedValueAccess !== undefined && ts.isElementAccessExpression(projectedValueAccess) ? unwrap(projectedValueAccess.expression) : undefined;
  const projectedValueKey = projectedValueAccess !== undefined && ts.isElementAccessExpression(projectedValueAccess) && projectedValueAccess.argumentExpression !== undefined ? unwrap(projectedValueAccess.argumentExpression) : undefined;
  if (
    projectedValue === undefined
    || projectedValueAccess === undefined
    || !ts.isElementAccessExpression(projectedValueAccess)
    || projectedValueBase === undefined
    || !ts.isIdentifier(projectedValueBase)
    || !bindings.isBinding(projectedValueBase, defaultsBinding)
    || projectedValueKey === undefined
    || !ts.isIdentifier(projectedValueKey)
    || !bindings.isBinding(projectedValueKey, keyBinding)
  ) expandFailure(valueStatement);
  const exactProjectedValue = projectedValue as { binding: ts.Identifier; initializer: ts.Expression };
  const projectedWrite = ts.isExpressionStatement(projectedWriteStatement) ? unwrap(projectedWriteStatement.expression) : undefined;
  const projectedTarget = projectedWrite !== undefined && ts.isBinaryExpression(projectedWrite) ? unwrap(projectedWrite.left) : undefined;
  const projectedTargetBase = projectedTarget !== undefined && ts.isElementAccessExpression(projectedTarget) ? unwrap(projectedTarget.expression) : undefined;
  const projectedTargetKey = projectedTarget !== undefined && ts.isElementAccessExpression(projectedTarget) && projectedTarget.argumentExpression !== undefined ? unwrap(projectedTarget.argumentExpression) : undefined;
  const projectedChoice = projectedWrite !== undefined && ts.isBinaryExpression(projectedWrite) ? unwrap(projectedWrite.right) : undefined;
  if (
    projectedWrite === undefined
    || !ts.isBinaryExpression(projectedWrite)
    || projectedWrite.operatorToken.kind !== ts.SyntaxKind.EqualsToken
    || projectedTargetBase === undefined
    || !ts.isIdentifier(projectedTargetBase)
    || !bindings.isBinding(projectedTargetBase, expandedResultBinding)
    || projectedTargetKey === undefined
    || !ts.isIdentifier(projectedTargetKey)
    || !bindings.isBinding(projectedTargetKey, exactProjectedKey.binding)
    || projectedChoice === undefined
    || !ts.isConditionalExpression(projectedChoice)
  ) expandFailure(projectedWriteStatement);
  const exactProjectedChoice = projectedChoice as ts.ConditionalExpression;
  const arrayCheck = unwrap(exactProjectedChoice.condition);
  const arrayCheckMember = ts.isCallExpression(arrayCheck) ? staticMember(arrayCheck.expression) : undefined;
  const arrayCheckBase = arrayCheckMember === undefined ? undefined : unwrap(arrayCheckMember.base);
  const arrayValue = unwrap(exactProjectedChoice.whenTrue);
  const copiedValue = unwrap(exactProjectedChoice.whenFalse);
  const copiedInvocation = ts.isCallExpression(copiedValue) ? normalizeInvocation(copiedValue, bindings) : undefined;
  const copiedTarget = copiedInvocation === undefined ? undefined : unwrap(copiedInvocation.target);
  if (
    !ts.isCallExpression(arrayCheck)
    || arrayCheckMember?.key !== 'isArray'
    || arrayCheckBase === undefined
    || !ts.isIdentifier(arrayCheckBase)
    || arrayCheckBase.text !== 'Array'
    || bindings.lookup(arrayCheckBase).found
    || arrayCheck.arguments.length !== 1
    || !ts.isIdentifier(unwrap(arrayCheck.arguments[0]))
    || !bindings.isBinding(unwrap(arrayCheck.arguments[0]) as ts.Identifier, exactProjectedValue.binding)
    || !ts.isArrayLiteralExpression(arrayValue)
    || arrayValue.elements.length !== 1
    || !ts.isSpreadElement(arrayValue.elements[0])
    || !ts.isIdentifier(unwrap(arrayValue.elements[0].expression))
    || !bindings.isBinding(unwrap(arrayValue.elements[0].expression) as ts.Identifier, exactProjectedValue.binding)
    || copiedInvocation === undefined
    || copiedInvocation.unsupported !== undefined
    || copiedInvocation.arguments?.length !== 1
    || copiedTarget === undefined
    || !ts.isIdentifier(copiedTarget)
    || !identifierResolvesToExactImport(copiedTarget, 'objectCopy', '@/utils/basic', bindings)
    || !ts.isIdentifier(unwrap(copiedInvocation.arguments[0]))
    || !bindings.isBinding(unwrap(copiedInvocation.arguments[0]) as ts.Identifier, exactProjectedValue.binding)
  ) expandFailure(exactProjectedChoice);
  const sourceDelete = ts.isExpressionStatement(sourceDeleteStatement) ? unwrap(sourceDeleteStatement.expression) : undefined;
  const sourceDeleteTarget = sourceDelete !== undefined && ts.isDeleteExpression(sourceDelete) ? unwrap(sourceDelete.expression) : undefined;
  const sourceDeleteBase = sourceDeleteTarget !== undefined && ts.isElementAccessExpression(sourceDeleteTarget) ? unwrap(sourceDeleteTarget.expression) : undefined;
  const sourceDeleteKey = sourceDeleteTarget !== undefined && ts.isElementAccessExpression(sourceDeleteTarget) && sourceDeleteTarget.argumentExpression !== undefined ? unwrap(sourceDeleteTarget.argumentExpression) : undefined;
  if (
    sourceDelete === undefined
    || !ts.isDeleteExpression(sourceDelete)
    || sourceDeleteBase === undefined
    || !ts.isIdentifier(sourceDeleteBase)
    || !bindings.isBinding(sourceDeleteBase, expandedResultBinding)
    || sourceDeleteKey === undefined
    || !ts.isIdentifier(sourceDeleteKey)
    || !bindings.isBinding(sourceDeleteKey, keyBinding)
  ) expandFailure(sourceDeleteStatement);
  const returnedResult = resultStatementReturn !== undefined && ts.isReturnStatement(resultStatementReturn) && resultStatementReturn.expression !== undefined ? unwrap(resultStatementReturn.expression) : undefined;
  if (returnedResult === undefined || !ts.isIdentifier(returnedResult) || !bindings.isBinding(returnedResult, expandedResultBinding)) expandFailure(resultStatementReturn ?? expandHelperBody);
  const architectureFinds: Array<{ declaration: ts.Identifier; compared: ts.Identifier }> = [];
  const findVisit = (node: ts.Node): void => {
    if (node !== owner && ts.isFunctionLike(node)) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      const initializer = unwrap(node.initializer);
      if (ts.isCallExpression(initializer) && ts.isPropertyAccessExpression(initializer.expression) && initializer.expression.name.text === 'find' && ts.isIdentifier(unwrap(initializer.expression.expression)) && bindings.isExactNamedImport(unwrap(initializer.expression.expression) as ts.Identifier, 'modelArchs', './options') && initializer.arguments.length === 1) {
        const callback = unwrap(initializer.arguments[0]);
        if (!ts.isArrowFunction(callback) || callback.parameters.length !== 1 || !ts.isIdentifier(callback.parameters[0].name)) fail(callback, 'handleModelArchChange behavior requires an exact architecture find callback');
        const comparison = unwrap(callback.body as ts.Expression);
        if (!ts.isBinaryExpression(comparison) || comparison.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) fail(comparison, 'handleModelArchChange behavior requires architecture name comparison');
        const comparisonLeft = unwrap(comparison.left);
        if (!ts.isPropertyAccessExpression(comparisonLeft) || comparisonLeft.name.text !== 'name') fail(comparison, 'handleModelArchChange behavior requires architecture name comparison');
        const row = unwrap(comparisonLeft.expression);
        const compared = unwrap(comparison.right);
        if (!ts.isIdentifier(row) || !bindings.isBinding(row, callback.parameters[0].name) || !ts.isIdentifier(compared)) fail(comparison, 'handleModelArchChange behavior requires bound architecture comparison');
        architectureFinds.push({ declaration: node.name, compared });
      }
    }
    ts.forEachChild(node, findVisit);
  };
  findVisit(ownerBody);
  const currentArchitecture = architectureFinds.find(item => bindings.isBinding(item.compared, currentName))?.declaration;
  const nextArchitecture = architectureFinds.find(item => bindings.isBinding(item.compared, nextName))?.declaration;
  if (architectureFinds.length !== 2 || currentArchitecture === undefined || nextArchitecture === undefined) fail(owner, 'handleModelArchChange behavior requires exact current and selected architecture bindings');
  const noOpGuards = ownerBody.statements.filter(ts.isIfStatement).filter(statement => ts.isReturnStatement(ts.isBlock(statement.thenStatement) && statement.thenStatement.statements.length === 1 ? statement.thenStatement.statements[0] : statement.thenStatement));
  if (noOpGuards.length !== 1) fail(owner, 'handleModelArchChange behavior requires one no-op guard');
  const noOp = flattenAnd(noOpGuards[0].expression);
  const noOpExpression = unwrap(noOpGuards[0].expression);
  if (!ts.isBinaryExpression(noOpExpression) || noOpExpression.operatorToken.kind !== ts.SyntaxKind.BarBarToken) fail(noOpExpression, 'handleModelArchChange behavior requires missing-or-unchanged no-op guard');
  const missingCurrent = unwrap(noOpExpression.left);
  const sameArchitecture = unwrap(noOpExpression.right);
  const missingCurrentOperand = ts.isPrefixUnaryExpression(missingCurrent) ? unwrap(missingCurrent.operand) : undefined;
  const sameArchitectureLeft = ts.isBinaryExpression(sameArchitecture) ? unwrap(sameArchitecture.left) : undefined;
  const sameArchitectureBase = sameArchitectureLeft !== undefined && ts.isPropertyAccessExpression(sameArchitectureLeft) ? unwrap(sameArchitectureLeft.expression) : undefined;
  const sameArchitectureRight = ts.isBinaryExpression(sameArchitecture) ? unwrap(sameArchitecture.right) : undefined;
  if (!ts.isPrefixUnaryExpression(missingCurrent) || missingCurrent.operator !== ts.SyntaxKind.ExclamationToken || missingCurrentOperand === undefined || !ts.isIdentifier(missingCurrentOperand) || !bindings.isBinding(missingCurrentOperand, currentArchitecture) || !ts.isBinaryExpression(sameArchitecture) || sameArchitecture.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken || sameArchitectureLeft === undefined || !ts.isPropertyAccessExpression(sameArchitectureLeft) || sameArchitectureLeft.name.text !== 'name' || sameArchitectureBase === undefined || !ts.isIdentifier(sameArchitectureBase) || !bindings.isBinding(sameArchitectureBase, currentArchitecture) || sameArchitectureRight === undefined || !ts.isIdentifier(sameArchitectureRight) || !bindings.isBinding(sameArchitectureRight, nextName)) fail(noOpExpression, 'handleModelArchChange behavior has unsupported no-op semantics');

  validateAnimaPathBehavior(animaPathSourceText, animaPathSourceName);
  const cleanupCalls: ts.CallExpression[] = [];
  const cleanupConditions = new Map<ts.CallExpression, readonly ConditionalExecutionContext[]>();
  const directMutations: ConfigMutation[] = [];
  const mutationConditions = new Map<ConfigMutation, readonly ConditionalExecutionContext[]>();
  const setterCalls: HandlerSetterCall[] = [];
  visitExecutableFunctionNodes(owner, bindings, (node, substitutions, execution, _sequence, _current, executionConditions) => {
    if (ts.isCallExpression(node)) {
      const invocation = normalizeInvocation(node, bindings, substitutions);
      const target = unwrap(invocation.target);
      const rawTarget = unwrap(node.expression);
      let modeledRelevantCall = false;
      const objectCopyCall = (ts.isIdentifier(rawTarget) && rawTarget.text === 'objectCopy')
        || (ts.isIdentifier(target) && identifierResolvesToExactImport(target, 'objectCopy', '@/utils/basic', bindings));
      if (objectCopyCall && (!ts.isIdentifier(target) || !identifierResolvesToExactImport(target, 'objectCopy', '@/utils/basic', bindings))) {
        fail(node, 'handleModelArchChange behavior requires exact objectCopy import provenance');
      }
      if (objectCopyCall) modeledRelevantCall = true;
      if (ts.isIdentifier(target) && invocationIdentifierResolvesTo(target, setterParameter, bindings, substitutions)) {
        modeledRelevantCall = true;
        if (invocation.unsupported !== undefined || invocation.arguments?.length !== 2) fail(node, `handleModelArchChange behavior setter requires finite two-argument invocation${invocation.unsupported === undefined ? '' : `: ${invocation.unsupported}`}`);
        const setterArguments = invocation.arguments.map(argument => {
          const value = unwrap(argument);
          if (!ts.isIdentifier(value)) return argument;
          const declaration = bindings.bindingDeclaration(value);
          const substitution = declaration !== undefined ? substitutions.get(declaration) : undefined;
          if (typeof substitution === 'string') fail(argument, 'handleModelArchChange behavior has tainted setter-argument provenance');
          return substitution ?? argument;
        });
        const pathExpression = unwrap(setterArguments[1]);
        setterCalls.push({ node, arguments: setterArguments, path: ts.isStringLiteral(pathExpression) || ts.isNoSubstitutionTemplateLiteral(pathExpression) ? normalizePath(pathExpression.text, {}) : undefined, value: setterArguments[0], execution, conditions: executionConditions });
      } else if (ts.isIdentifier(target) && identifierResolvesToExactImport(target, 'clearUnsupportedAnimaPaths', '@/helpers/animaModelPaths', bindings)) {
        modeledRelevantCall = true;
        if (invocation.unsupported !== undefined || invocation.arguments === undefined) fail(node, `handleModelArchChange behavior cleanup invocation is unsupported: ${invocation.unsupported ?? 'unknown arguments'}`);
        cleanupCalls.push(node);
        cleanupConditions.set(node, executionConditions);
      }
      if (
        !modeledRelevantCall
        && unmodeledCallConsumesRelevantIdentity(node, [configParameter, setterParameter], bindings, substitutions)
      ) fail(node, `handleModelArchChange behavior has an unsupported unmodeled call consuming configuration or setter identity: ${node.getText()}`);
    }
    const found = configMutationsAtNode(node, configParameter, bindings, substitutions, execution);
    for (const mutation of found) mutationConditions.set(mutation, executionConditions);
    directMutations.push(...found);
  }, true, undefined, [configParameter, setterParameter]);
  if (cleanupCalls.length !== 1) fail(owner, 'handleModelArchChange behavior requires one Anima cleanup call');
  const cleanupCall = cleanupCalls[0];
  const cleanupInvocation = normalizeInvocation(cleanupCall, bindings);
  const cleanupTarget = unwrap(cleanupInvocation.target);
  const cleanupArguments = cleanupInvocation.arguments;
  if (!ts.isIdentifier(cleanupTarget) || !identifierResolvesToExactImport(cleanupTarget, 'clearUnsupportedAnimaPaths', '@/helpers/animaModelPaths', bindings)) fail(cleanupCall, 'handleModelArchChange behavior requires exact Anima cleanup import');
  if (cleanupInvocation.unsupported !== undefined || cleanupArguments?.length !== 2) fail(cleanupCall, 'handleModelArchChange behavior requires exact Anima cleanup arguments');
  const cleanupModelSource = scopedFunctionConfigPath(cleanupArguments[0], configParameter, bindings);
  if (cleanupModelSource !== 'config.process[*].model') fail(cleanupCall, `handleModelArchChange behavior requires exact Anima model source, received ${cleanupModelSource ?? '<unresolved>'}`);
  const cleanupModelArgument = unwrap(cleanupArguments[0]);
  if (!ts.isIdentifier(cleanupModelArgument)) fail(cleanupCall, 'handleModelArchChange behavior requires a bound current model cleanup argument');
  const cleanupModelBinding = bindings.bindingDeclaration(cleanupModelArgument);
  if (cleanupModelBinding === undefined) fail(cleanupCall, 'handleModelArchChange behavior requires a bound current model cleanup argument');
  const cleanupSections = unwrap(cleanupArguments[1]);
  const cleanupSectionsBase = ts.isPropertyAccessExpression(cleanupSections) ? unwrap(cleanupSections.expression) : undefined;
  if (!ts.isPropertyAccessExpression(cleanupSections) || cleanupSections.name.text !== 'additionalSections' || cleanupSectionsBase === undefined || !ts.isIdentifier(cleanupSectionsBase) || !bindings.isBinding(cleanupSectionsBase, nextArchitecture)) fail(cleanupCall, 'handleModelArchChange behavior requires selected architecture cleanup sections');
  if ((cleanupConditions.get(cleanupCall) ?? []).length !== 0) fail(cleanupCall, 'handleModelArchChange cleanup behavior has an unsupported enclosing runtime guard');

  const consumedMutations = new Set<ConfigMutation>();
  const consumedSetters = new Set<HandlerSetterCall>();
  const takeSetter = (path: string, predicate: (call: HandlerSetterCall) => boolean = () => true): HandlerSetterCall => {
    const matches = setterCalls.filter(call => call.execution === 'known' && call.path === path && predicate(call));
    if (matches.length !== 1) {
      const candidates = setterCalls.map(call => `${call.path ?? '<dynamic>'}:${call.execution}:${call.value.getText(source)}`).join(', ');
      fail(owner, `handleModelArchChange behavior requires one setter for ${path}, found ${matches.length}; all candidates ${candidates || '<none>'}`);
    }
    consumedSetters.add(matches[0]);
    return matches[0];
  };
  const takeMutation = (operation: ConfigMutation['operation'], path: string, predicate: (mutation: ConfigMutation) => boolean): ConfigMutation => {
    const expectedSyntax = operation === 'write' ? 'assign' : 'delete';
    const matches = directMutations.filter(mutation => mutation.execution === 'known' && mutation.operation === operation && mutation.path === path && mutation.syntax === expectedSyntax && predicate(mutation));
    if (matches.length !== 1) {
      const candidates = directMutations.map(mutation => `${mutation.operation}:${mutation.path}:${mutation.syntax}:${mutation.execution}`).join(', ');
      fail(owner, `handleModelArchChange behavior requires one ${operation} for ${path}, found ${matches.length}; all candidates ${candidates || '<none>'}`);
    }
    consumedMutations.add(matches[0]);
    return matches[0];
  };
  const conditionsMatch = (
    actual: readonly ConditionalExecutionContext[],
    expected: readonly { owner: ts.Node; arm: string }[],
  ): boolean => actual.length === expected.length
    && expected.every(item => actual.some(condition => condition.owner === item.owner && condition.arm === item.arm));
  const requireSetterConditions = (
    call: HandlerSetterCall,
    expected: readonly { owner: ts.Node; arm: string }[],
    label: string,
  ): void => {
    if (!conditionsMatch(call.conditions, expected)) fail(call.node, `handleModelArchChange ${label} behavior has an unsupported enclosing runtime guard`);
  };
  const requireMutationConditions = (
    mutation: ConfigMutation,
    expected: readonly { owner: ts.Node; arm: string }[],
    label: string,
  ): void => {
    if (!conditionsMatch(mutationConditions.get(mutation) ?? [], expected)) fail(mutation.node, `handleModelArchChange ${label} behavior has an unsupported enclosing runtime guard`);
  };
  const valuePath = (
    expression: ts.Expression,
    substitutions: InvocationSubstitutions = new Map(),
  ): string | undefined => scopedFunctionConfigPath(expression, configParameter, bindings, new Set(), substitutions);
  const isNextArchitectureAccess = (expression: ts.Expression, field: string): boolean => {
    expression = unwrap(expression);
    if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== field) return false;
    const base = unwrap(expression.expression);
    return ts.isIdentifier(base) && bindings.isBinding(base, nextArchitecture);
  };
  const setterValueBinding = (call: HandlerSetterCall, declaration: ts.Identifier): boolean => {
    const value = unwrap(call.value);
    return ts.isIdentifier(value) && bindings.isBinding(value, declaration);
  };
  const requireExactObjectCopy = (
    copied: ts.Identifier,
    sourceBinding: ts.Identifier,
    label: string,
  ): ts.CallExpression => {
    const initializer = ts.isVariableDeclaration(copied.parent) && copied.parent.name === copied
      ? copied.parent.initializer
      : bindings.declarationInitializer(copied);
    const call = initializer === undefined ? undefined : unwrap(initializer);
    if (call === undefined || !ts.isCallExpression(call)) fail(copied, `handleModelArchChange ${label} requires objectCopy of the exact source identity`);
    const invocation = normalizeInvocation(call, bindings);
    const target = unwrap(invocation.target);
    if (
      invocation.unsupported !== undefined
      || invocation.arguments?.length !== 1
      || !ts.isIdentifier(target)
      || !identifierResolvesToExactImport(target, 'objectCopy', '@/utils/basic', bindings)
      || !aliasOriginReachesBinding(invocation.arguments[0], sourceBinding, bindings, new Map())
    ) fail(call, `handleModelArchChange ${label} requires objectCopy of the exact source identity`);
    return call;
  };
  const mutationReceiver = (mutation: ConfigMutation): ts.Expression | undefined => {
    const target = ts.isDeleteExpression(mutation.node)
      ? mutation.node.expression
      : ts.isBinaryExpression(mutation.node)
        ? assignmentTargetExpressions(mutation.node.left)[0]
        : undefined;
    if (target === undefined) return undefined;
    let current = unwrap(target);
    let member = staticMember(current);
    while (member !== undefined) {
      current = unwrap(member.base);
      member = staticMember(current);
    }
    return current;
  };
  const mutationUsesCopiedAggregate = (mutation: ConfigMutation, copied: ts.Identifier): boolean => {
    const receiver = mutationReceiver(mutation);
    return receiver !== undefined && aliasOriginReachesBinding(receiver, copied, bindings, mutation.substitutions);
  };
  const requireExactMapperReturn = (
    callback: ts.ArrowFunction,
    copied: ts.Identifier,
    label: string,
  ): ts.ReturnStatement => {
    if (!ts.isBlock(callback.body)) fail(callback, `handleModelArchChange ${label} requires a block mapper`);
    const callbackBody = callback.body as ts.Block;
    const returns: ts.ReturnStatement[] = [];
    const inspect = (node: ts.Node): void => {
      if (isStaticallyDead(node, bindings) || (node !== callback && ts.isFunctionLike(node))) return;
      if (ts.isReturnStatement(node)) returns.push(node);
      ts.forEachChild(node, inspect);
    };
    inspect(callbackBody);
    const returned = returns.length === 1 ? returns[0] : undefined;
    const value = returned?.expression === undefined ? undefined : unwrap(returned.expression);
    if (
      returned === undefined
      || callbackBody.statements[callbackBody.statements.length - 1] !== returned
      || value === undefined
      || !ts.isIdentifier(value)
      || !aliasOriginReachesBinding(value, copied, bindings, new Map())
    ) fail(callback, `handleModelArchChange ${label} requires one final return of the defensively copied aggregate`);
    return returned;
  };

  const cleanedDeclaration = cleanupCalls[0].parent;
  if (!ts.isVariableDeclaration(cleanedDeclaration) || !ts.isIdentifier(cleanedDeclaration.name)) fail(cleanupCalls[0], 'handleModelArchChange behavior requires cleaned model binding');
  const cleanedModel = cleanedDeclaration.name;
  const cleanupCommit = takeSetter('config.process[*].model', call => setterValueBinding(call, cleanedModel));
  const cleanupGuard = enclosingIfWithin(cleanupCommit.node, owner);
  const cleanupCondition = cleanupGuard === undefined ? undefined : unwrap(cleanupGuard.expression);
  const cleanupGuardLeft = cleanupCondition !== undefined && ts.isBinaryExpression(cleanupCondition) ? unwrap(cleanupCondition.left) : undefined;
  const cleanupGuardRight = cleanupCondition !== undefined && ts.isBinaryExpression(cleanupCondition) ? unwrap(cleanupCondition.right) : undefined;
  if (cleanupCondition === undefined || !ts.isBinaryExpression(cleanupCondition) || cleanupCondition.operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsEqualsToken || cleanupGuardLeft === undefined || !ts.isIdentifier(cleanupGuardLeft) || !bindings.isBinding(cleanupGuardLeft, cleanedModel) || cleanupGuardRight === undefined || !ts.isIdentifier(cleanupGuardRight) || !bindings.isBinding(cleanupGuardRight, cleanupModelBinding)) fail(cleanupCommit.node, 'handleModelArchChange behavior requires exact changed-model cleanup guard');
  requireSetterConditions(cleanupCommit, [{ owner: cleanupGuard!, arm: 'then' }], 'cleaned-model commit');

  const lowVram = takeSetter('config.process[*].model.low_vram');
  const lowGuard = enclosingIfWithin(lowVram.node, owner);
  if (lowGuard === undefined || !negatedSection(lowGuard.expression, nextArchitecture, 'model.low_vram', bindings) || !exactBoolean(lowVram.value, false)) fail(lowVram.node, 'handleModelArchChange low_vram behavior is unsupported');
  requireSetterConditions(lowVram, [{ owner: lowGuard!, arm: 'then' }], 'low_vram');

  const layerOuter = ownerBody.statements.find(statement => ts.isIfStatement(statement) && negatedSection(statement.expression, nextArchitecture, 'model.layer_offloading', bindings));
  if (layerOuter === undefined || !ts.isIfStatement(layerOuter) || layerOuter.elseStatement === undefined) fail(owner, 'handleModelArchChange behavior requires layer-offloading support branches');
  const inUnsupportedLayer = (node: ts.Node): boolean => branchContains(layerOuter.thenStatement, node);
  const inSupportedLayer = (node: ts.Node): boolean => branchContains(layerOuter.elseStatement!, node);
  const layerDeletePaths = ['layer_offloading', 'layer_offloading_text_encoder_percent', 'layer_offloading_transformer_percent'] as const;
  const layerDeletes = layerDeletePaths.map(path => takeMutation('delete', `config.process[*].model.${path}`, mutation => inUnsupportedLayer(mutation.node)));
  const modelCommit = takeSetter('config.process[*].model', call => call !== cleanupCommit && inUnsupportedLayer(call.node));
  const modelValue = unwrap(modelCommit.value);
  if (!ts.isIdentifier(modelValue) || valuePath(modelValue) !== 'config.process[*].model') fail(modelCommit.node, 'handleModelArchChange behavior requires deleted model aggregate commit');
  const copiedModel = bindings.bindingDeclaration(modelValue);
  if (copiedModel === undefined) fail(modelValue, 'handleModelArchChange layer aggregate requires a bound copied-model identity');
  const modelCopyCall = requireExactObjectCopy(copiedModel, cleanedModel, 'layer aggregate');
  if (
    layerDeletes.some(deletion => !mutationUsesCopiedAggregate(deletion, copiedModel))
    || layerDeletes.some(deletion => modelCopyCall.getStart() >= deletion.node.getStart())
    || layerDeletes.some(deletion => deletion.node.getStart() >= modelCommit.node.getStart())
  ) fail(modelCommit.node, 'handleModelArchChange layer aggregate requires copy, deletions, then copied-model commit order');
  const layerPresenceIf = ts.isBlock(layerOuter.thenStatement) ? layerOuter.thenStatement.statements.find(ts.isIfStatement) : undefined;
  if (layerPresenceIf === undefined || !exactMembershipGuard(layerPresenceIf.expression, 'layer_offloading', 'config.process[*].model', configParameter, bindings)) fail(layerOuter, 'handleModelArchChange behavior requires unsupported layer presence guard');
  if (!layerDeletes.every(mutation => branchContains(layerPresenceIf.thenStatement, mutation.node)) || !branchContains(layerPresenceIf.thenStatement, modelCommit.node)) fail(layerPresenceIf, 'handleModelArchChange behavior requires layer mutations and aggregate commit inside the exact presence guard');
  for (const deletion of layerDeletes) requireMutationConditions(deletion, [{ owner: layerOuter, arm: 'then' }, { owner: layerPresenceIf, arm: 'then' }], 'layer deletion');
  requireSetterConditions(modelCommit, [{ owner: layerOuter, arm: 'then' }, { owner: layerPresenceIf, arm: 'then' }], 'layer aggregate commit');
  const supportedIf = (() => {
    const result: ts.IfStatement[] = [];
    const walk = (node: ts.Node): void => { if (ts.isIfStatement(node) && inSupportedLayer(node)) result.push(node); ts.forEachChild(node, walk); };
    walk(layerOuter.elseStatement!);
    return result.find(item => exactMembershipGuard(item.expression, 'layer_offloading', 'config.process[*].model', configParameter, bindings, true));
  })();
  if (supportedIf === undefined) fail(layerOuter.elseStatement, 'handleModelArchChange behavior requires supported layer absence guard');
  const layerInit = takeSetter('config.process[*].model.layer_offloading', call => inSupportedLayer(call.node));
  const textInit = takeSetter('config.process[*].model.layer_offloading_text_encoder_percent', call => inSupportedLayer(call.node));
  const transformerInit = takeSetter('config.process[*].model.layer_offloading_transformer_percent', call => inSupportedLayer(call.node));
  if (![layerInit, textInit, transformerInit].every(call => branchContains(supportedIf.thenStatement, call.node)) || !exactBoolean(layerInit.value, false) || !exactNumber(textInit.value, 1) || !exactNumber(transformerInit.value, 1)) fail(supportedIf, 'handleModelArchChange behavior requires exact layer initialization values');
  for (const initialization of [layerInit, textInit, transformerInit]) requireSetterConditions(initialization, [{ owner: layerOuter, arm: 'else' }, { owner: supportedIf, arm: 'then' }], 'layer initialization');

  const architectureSetter = takeSetter('config.process[*].model.arch');
  const architectureValue = unwrap(architectureSetter.value);
  if (!ts.isIdentifier(architectureValue) || !bindings.isBinding(architectureValue, nextName)) fail(architectureSetter.node, 'handleModelArchChange behavior architecture-name requires exact selected architecture binding');
  requireSetterConditions(architectureSetter, [], 'architecture-name commit');

  const topLevelMapDeclaration = (path: string): ts.VariableDeclaration | undefined => ownerBody.statements
    .flatMap(statement => ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [])
    .find(declaration => {
      if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) return false;
      const initializer = unwrap(declaration.initializer);
      if (!ts.isCallExpression(initializer)) return false;
      const callee = unwrap(initializer.expression);
      return ts.isPropertyAccessExpression(callee)
        && callee.name.text === 'map'
        && scopedFunctionConfigPath(callee.expression, configParameter, bindings) === path;
    });
  const datasetsDeclaration = topLevelMapDeclaration('config.process[*].datasets');
  if (datasetsDeclaration === undefined || !ts.isIdentifier(datasetsDeclaration.name)) fail(owner, 'handleModelArchChange behavior requires exact dataset map binding');
  const datasetsCommit = takeSetter('config.process[*].datasets', call => setterValueBinding(call, datasetsDeclaration.name as ts.Identifier));
  requireSetterConditions(datasetsCommit, [], 'dataset aggregate commit');
  const controlsMutation = takeMutation('write', 'config.process[*].datasets[*].controls', () => true);
  requireMutationConditions(controlsMutation, [], 'dataset controls');
  const controlsValue = unwrap((controlsMutation.node as ts.BinaryExpression).right);
  if (!ts.isIdentifier(controlsValue)) fail(controlsMutation.node, 'handleModelArchChange behavior requires controls binding');
  const controlsInitializer = bindings.declarationInitializer(controlsValue);
  const controlsFallback = controlsInitializer === undefined ? undefined : unwrap(controlsInitializer);
  const controlsFallbackRight = controlsFallback !== undefined && ts.isBinaryExpression(controlsFallback) ? unwrap(controlsFallback.right) : undefined;
  if (controlsFallback === undefined || !ts.isBinaryExpression(controlsFallback) || controlsFallback.operatorToken.kind !== ts.SyntaxKind.QuestionQuestionToken || !isNextArchitectureAccess(controlsFallback.left, 'controls') || controlsFallbackRight === undefined || !ts.isArrayLiteralExpression(controlsFallbackRight) || controlsFallbackRight.elements.length !== 0) fail(controlsMutation.node, 'handleModelArchChange behavior requires selected architecture controls fallback');

  const datasetMapCall = unwrap(datasetsDeclaration.initializer!);
  const datasetCallback = ts.isCallExpression(datasetMapCall) ? unwrap(datasetMapCall.arguments[0]) : undefined;
  if (datasetCallback === undefined || !ts.isArrowFunction(datasetCallback) || !ts.isBlock(datasetCallback.body)) fail(datasetsDeclaration, 'handleModelArchChange behavior requires block dataset mapper');
  const exactDatasetCallback = datasetCallback as ts.ArrowFunction;
  const datasetCallbackBody = exactDatasetCallback.body as ts.Block;
  if ((ts.getCombinedModifierFlags(exactDatasetCallback) & ts.ModifierFlags.Async) !== 0) fail(exactDatasetCallback, 'handleModelArchChange behavior requires a synchronous non-generator dataset mapper');
  const datasetParameter = exactDatasetCallback.parameters.length === 1 ? exactCallbackIdentifier(exactDatasetCallback.parameters[0]) : undefined;
  const datasetReceiver = mutationReceiver(controlsMutation);
  const copiedDataset = datasetReceiver !== undefined && ts.isIdentifier(datasetReceiver) ? bindings.bindingDeclaration(datasetReceiver) : undefined;
  if (datasetParameter === undefined || copiedDataset === undefined) fail(exactDatasetCallback, 'handleModelArchChange behavior requires exact dataset mapper input and copied aggregate bindings');
  const exactDatasetParameter = datasetParameter as ts.Identifier;
  const exactCopiedDataset = copiedDataset as ts.Identifier;
  const datasetCopyCall = requireExactObjectCopy(exactCopiedDataset, exactDatasetParameter, 'dataset mapper');
  const datasetReturn = requireExactMapperReturn(exactDatasetCallback, exactCopiedDataset, 'dataset mapper');
  const datasetMutations = directMutations.filter(mutation => branchContains(datasetCallbackBody, mutation.node) && mutation.path.startsWith('config.process[*].datasets[*].'));
  if (
    datasetMutations.some(mutation => !mutationUsesCopiedAggregate(mutation, exactCopiedDataset))
    || datasetMutations.some(mutation => datasetCopyCall.getStart() >= mutation.node.getStart())
    || datasetMutations.some(mutation => mutation.node.getStart() >= datasetReturn.getStart())
    || datasetMapCall.getStart() >= datasetsCommit.node.getStart()
  ) fail(exactDatasetCallback, 'handleModelArchChange dataset mapper requires copy, mutations, return, then aggregate commit order');
  const multiStatement = datasetCallbackBody.statements.find(statement => ts.isIfStatement(statement) && sectionFlag(statement.expression, nextArchitecture, bindings) === 'datasets.multi_control_paths');
  if (multiStatement === undefined || !ts.isIfStatement(multiStatement)) fail(exactDatasetCallback, 'handleModelArchChange behavior requires exact multi/single/no-control branches');
  const multiIf = multiStatement;
  const singleStatement = multiIf.elseStatement;
  if (singleStatement === undefined || !ts.isIfStatement(singleStatement) || sectionFlag(singleStatement.expression, nextArchitecture, bindings) !== 'datasets.control_path' || singleStatement.elseStatement === undefined) fail(exactDatasetCallback, 'handleModelArchChange behavior requires exact multi/single/no-control branches');
  const singleIf = singleStatement;
  const noControlBranch = singleIf.elseStatement;
  if (noControlBranch === undefined) fail(exactDatasetCallback, 'handleModelArchChange behavior requires exact multi/single/no-control branches');
  const branchRole = (node: ts.Node): 'multi' | 'single' | 'none' | undefined => branchContains(multiIf.thenStatement, node) ? 'multi' : branchContains(singleIf.thenStatement, node) ? 'single' : branchContains(noControlBranch, node) ? 'none' : undefined;
  const copyOrNull = (mutation: ConfigMutation, sourcePath: string): boolean => {
    const right = unwrap((mutation.node as ts.BinaryExpression).right);
    return ts.isBinaryExpression(right) && right.operatorToken.kind === ts.SyntaxKind.BarBarToken && valuePath(right.left, mutation.substitutions) === sourcePath && unwrap(right.right).kind === ts.SyntaxKind.NullKeyword;
  };
  for (const suffix of ['control_path_1', 'control_path_2', 'control_path_3'] as const) {
    const path = `config.process[*].datasets[*].${suffix}`;
    const init = takeMutation('write', path, mutation => branchRole(mutation.node) === 'multi' && copyOrNull(mutation, path));
    if (init === undefined) fail(multiIf, `handleModelArchChange behavior requires ${suffix} initialization`);
    requireMutationConditions(init, [{ owner: multiIf, arm: 'then' }], `${suffix} multi-control initialization`);
  }
  const multiCopy = takeMutation('write', 'config.process[*].datasets[*].control_path_1', mutation => branchRole(mutation.node) === 'multi' && valuePath((mutation.node as ts.BinaryExpression).right, mutation.substitutions) === 'config.process[*].datasets[*].control_path');
  const multiCopyGuards: ts.IfStatement[] = [];
  let multiAncestor: ts.Node | undefined = multiCopy.node.parent;
  while (multiAncestor !== undefined && multiAncestor !== multiIf) { if (ts.isIfStatement(multiAncestor)) multiCopyGuards.push(multiAncestor); multiAncestor = multiAncestor.parent; }
  const multiGuardPaths = multiCopyGuards.map(item => item.expression);
  const hasMultiSourceGuard = multiGuardPaths.some(expression => flattenAnd(expression).some(part => {
    const condition = unwrap(part);
    return valuePath(ts.isBinaryExpression(condition) ? condition.left : condition, multiCopy.substitutions) === 'config.process[*].datasets[*].control_path';
  }));
  const hasMultiTargetGuard = multiGuardPaths.some(expression => {
    const condition = unwrap(expression);
    return ts.isPrefixUnaryExpression(condition) && valuePath(condition.operand, multiCopy.substitutions) === 'config.process[*].datasets[*].control_path_1';
  });
  if (!hasMultiSourceGuard || !hasMultiTargetGuard) fail(multiCopy.node, 'handleModelArchChange behavior requires source-nonempty target-empty multi copy guards');
  requireMutationConditions(
    multiCopy,
    [{ owner: multiIf, arm: 'then' }, ...multiCopyGuards.map(owner => ({ owner, arm: 'then' }))],
    'multi-control source copy',
  );
  const multiSourceDelete = takeMutation('delete', 'config.process[*].datasets[*].control_path', mutation => branchRole(mutation.node) === 'multi');
  requireMutationConditions(multiSourceDelete, [{ owner: multiIf, arm: 'then' }], 'multi-control source deletion');
  if (multiCopy.node.getStart() >= multiSourceDelete.node.getStart()) fail(multiSourceDelete.node, 'handleModelArchChange behavior requires multi-control copy before source deletion');

  const singleInit = takeMutation('write', 'config.process[*].datasets[*].control_path', mutation => branchRole(mutation.node) === 'single' && copyOrNull(mutation, 'config.process[*].datasets[*].control_path'));
  if (singleInit === undefined) fail(multiIf, 'handleModelArchChange behavior requires single control initialization');
  requireMutationConditions(singleInit, [{ owner: multiIf, arm: 'else' }, { owner: singleIf, arm: 'then' }], 'single-control initialization');
  const singleCopy = takeMutation('write', 'config.process[*].datasets[*].control_path', mutation => branchRole(mutation.node) === 'single' && valuePath((mutation.node as ts.BinaryExpression).right, mutation.substitutions) === 'config.process[*].datasets[*].control_path_1');
  const singleCopyIf = enclosingIfWithin(singleCopy.node, owner);
  if (singleCopyIf === undefined || !flattenAnd(singleCopyIf.expression).every(part => {
    const value = unwrap(part);
    if (valuePath(value, singleCopy.substitutions) === 'config.process[*].datasets[*].control_path_1') return true;
    return ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken && valuePath(value.left, singleCopy.substitutions) === 'config.process[*].datasets[*].control_path_1' && exactString(value.right, '');
  })) fail(singleCopy.node, 'handleModelArchChange behavior requires nonempty single-control copy guard');
  requireMutationConditions(singleCopy, [{ owner: multiIf, arm: 'else' }, { owner: singleIf, arm: 'then' }, { owner: singleCopyIf, arm: 'then' }], 'single-control source copy');
  const singleDeletions: ConfigMutation[] = [];
  for (const suffix of ['control_path_1', 'control_path_2', 'control_path_3'] as const) {
    const path = `config.process[*].datasets[*].${suffix}`;
    const deletion = takeMutation('delete', path, mutation => branchRole(mutation.node) === 'single');
    singleDeletions.push(deletion);
    const guard = enclosingIfWithin(deletion.node, owner);
    if (guard === undefined || !exactMembershipGuard(guard.expression, suffix, 'config.process[*].datasets[*]', configParameter, bindings, false, deletion.substitutions)) fail(deletion.node, `handleModelArchChange behavior requires ${suffix} single-control membership guard`);
    requireMutationConditions(deletion, [{ owner: multiIf, arm: 'else' }, { owner: singleIf, arm: 'then' }, { owner: guard, arm: 'then' }], `${suffix} single-control deletion`);
  }
  if (singleDeletions.some(deletion => singleCopy.node.getStart() >= deletion.node.getStart())) fail(singleCopy.node, 'handleModelArchChange behavior requires single-control copy before source deletions');
  for (const suffix of ['control_path', 'control_path_1', 'control_path_2', 'control_path_3'] as const) {
    const path = `config.process[*].datasets[*].${suffix}`;
    const deletion = takeMutation('delete', path, mutation => branchRole(mutation.node) === 'none');
    const guard = enclosingIfWithin(deletion.node, owner);
    if (guard === undefined || !exactMembershipGuard(guard.expression, suffix, 'config.process[*].datasets[*]', configParameter, bindings, false, deletion.substitutions)) fail(deletion.node, `handleModelArchChange behavior requires ${suffix} no-control membership guard`);
    requireMutationConditions(deletion, [{ owner: multiIf, arm: 'else' }, { owner: singleIf, arm: 'else' }, { owner: guard, arm: 'then' }], `${suffix} no-control deletion`);
  }
  const numFrames = takeMutation('write', 'config.process[*].datasets[*].num_frames', () => true);
  const numFramesIf = enclosingIfWithin(numFrames.node, owner);
  const numFramesCondition = numFramesIf === undefined ? undefined : unwrap(numFramesIf.expression);
  if (numFramesCondition === undefined || !ts.isPrefixUnaryExpression(numFramesCondition) || sectionFlag(numFramesCondition.operand, nextArchitecture, bindings) !== 'datasets.num_frames' || !exactNumber((numFrames.node as ts.BinaryExpression).right, 1)) fail(numFrames.node, 'handleModelArchChange behavior requires unsupported num_frames reset');
  requireMutationConditions(numFrames, [{ owner: numFramesIf!, arm: 'then' }], 'num_frames reset');
  const autoFrames = takeMutation('delete', 'config.process[*].datasets[*].auto_frame_count', () => true);
  const autoFramesIf = enclosingIfWithin(autoFrames.node, owner);
  const autoFramesCondition = autoFramesIf === undefined ? undefined : unwrap(autoFramesIf.expression);
  if (autoFramesCondition === undefined || !ts.isPrefixUnaryExpression(autoFramesCondition) || sectionFlag(autoFramesCondition.operand, nextArchitecture, bindings) !== 'datasets.auto_frame_count') fail(autoFrames.node, 'handleModelArchChange behavior requires unsupported auto_frame_count deletion');
  requireMutationConditions(autoFrames, [{ owner: autoFramesIf!, arm: 'then' }], 'auto_frame_count deletion');

  const samplesDeclaration = topLevelMapDeclaration('config.process[*].sample.samples');
  if (samplesDeclaration === undefined || !ts.isIdentifier(samplesDeclaration.name)) fail(owner, 'handleModelArchChange behavior requires exact sample map binding');
  const samplesCommit = takeSetter('config.process[*].sample.samples', call => setterValueBinding(call, samplesDeclaration.name as ts.Identifier));
  requireSetterConditions(samplesCommit, [], 'sample aggregate commit');
  const sampleMapCall = unwrap(samplesDeclaration.initializer!);
  const sampleCallback = ts.isCallExpression(sampleMapCall) ? unwrap(sampleMapCall.arguments[0]) : undefined;
  if (
    sampleCallback === undefined
    || !ts.isArrowFunction(sampleCallback)
    || !ts.isBlock(sampleCallback.body)
    || (ts.getCombinedModifierFlags(sampleCallback) & ts.ModifierFlags.Async) !== 0
  ) fail(samplesDeclaration, 'handleModelArchChange behavior requires a synchronous non-generator block sample mapper');
  const exactSampleCallback = sampleCallback as ts.ArrowFunction;
  const sampleCallbackBody = exactSampleCallback.body as ts.Block;
  const ctrlImg = takeMutation('delete', 'config.process[*].sample.samples[*].ctrl_img', () => true);
  const ctrlIf = enclosingIfWithin(ctrlImg.node, owner);
  const ctrlCondition = ctrlIf === undefined ? undefined : unwrap(ctrlIf.expression);
  if (ctrlCondition === undefined || !ts.isPrefixUnaryExpression(ctrlCondition) || sectionFlag(ctrlCondition.operand, nextArchitecture, bindings) !== 'sample.ctrl_img') fail(ctrlImg.node, 'handleModelArchChange behavior requires unsupported sample ctrl_img deletion');
  requireMutationConditions(ctrlImg, [{ owner: ctrlIf!, arm: 'then' }], 'sample ctrl_img deletion');
  const sampleParameter = exactSampleCallback.parameters.length === 1 ? exactCallbackIdentifier(exactSampleCallback.parameters[0]) : undefined;
  const sampleReceiver = mutationReceiver(ctrlImg);
  const copiedSample = sampleReceiver !== undefined && ts.isIdentifier(sampleReceiver) ? bindings.bindingDeclaration(sampleReceiver) : undefined;
  if (sampleParameter === undefined || copiedSample === undefined) fail(exactSampleCallback, 'handleModelArchChange behavior requires exact sample mapper input and copied aggregate bindings');
  const exactSampleParameter = sampleParameter as ts.Identifier;
  const exactCopiedSample = copiedSample as ts.Identifier;
  const sampleCopyCall = requireExactObjectCopy(exactCopiedSample, exactSampleParameter, 'sample mapper');
  const sampleReturn = requireExactMapperReturn(exactSampleCallback, exactCopiedSample, 'sample mapper');
  const sampleMutations = directMutations.filter(mutation => branchContains(sampleCallbackBody, mutation.node) && mutation.path.startsWith('config.process[*].sample.samples[*].'));
  if (
    sampleMutations.some(mutation => !mutationUsesCopiedAggregate(mutation, exactCopiedSample))
    || sampleMutations.some(mutation => sampleCopyCall.getStart() >= mutation.node.getStart())
    || sampleMutations.some(mutation => mutation.node.getStart() >= sampleReturn.getStart())
    || sampleMapCall.getStart() >= samplesCommit.node.getStart()
  ) fail(exactSampleCallback, 'handleModelArchChange sample mapper requires copy, mutations, return, then aggregate commit order');

  const dynamicSetters = setterCalls.filter(call => call.path === undefined);
  if (dynamicSetters.length !== 2) fail(owner, 'handleModelArchChange behavior requires exact current/new default setters');
  const defaultInfo = dynamicSetters.map(call => {
    const value = unwrap(call.value);
    const pathArgument = unwrap(call.arguments[1]);
    if (!ts.isElementAccessExpression(value) || value.argumentExpression === undefined) fail(call.node, 'handleModelArchChange behavior requires bound dynamic default key/index');
    const valueIndex = unwrap(value.argumentExpression);
    const keyedDefaults = unwrap(value.expression);
    if (!ts.isNumericLiteral(valueIndex) || !ts.isElementAccessExpression(keyedDefaults) || keyedDefaults.argumentExpression === undefined) fail(call.node, 'handleModelArchChange behavior requires bound dynamic default key/index');
    const keyedDefaultsKey = unwrap(keyedDefaults.argumentExpression);
    const container = unwrap(keyedDefaults.expression);
    if (!ts.isIdentifier(container) || !ts.isIdentifier(pathArgument) || !ts.isIdentifier(keyedDefaultsKey) || !bindings.sameBinding(keyedDefaultsKey, pathArgument)) fail(call.node, 'handleModelArchChange behavior requires bound dynamic default key/index');
    const index = Number(valueIndex.text);
    consumedSetters.add(call);
    return { call, container, pathArgument, index };
  });
  const currentDefaults = defaultInfo.find(item => item.index === 1);
  const newDefaults = defaultInfo.find(item => item.index === 0);
  if (currentDefaults === undefined || newDefaults === undefined || currentDefaults.call.node.getStart() >= newDefaults.call.node.getStart()) fail(owner, 'handleModelArchChange behavior requires current-default revert before next-default apply');
  const requireExactDefaultLoop = (item: typeof currentDefaults, label: string): void => {
    if (item === undefined || item.call.conditions.length !== 1) fail(owner, `handleModelArchChange ${label} behavior has an unsupported enclosing runtime guard`);
    const condition = item.call.conditions[0];
    if (!ts.isForInStatement(condition.owner) || condition.arm !== 'body') fail(item.call.node, `handleModelArchChange ${label} behavior requires the exact defaults iteration guard`);
  };
  requireExactDefaultLoop(currentDefaults, 'current-default commit');
  requireExactDefaultLoop(newDefaults, 'next-default commit');
  const currentDefaultsInitializer = bindings.declarationInitializer(currentDefaults.container);
  const newDefaultsInitializer = bindings.declarationInitializer(newDefaults.container);
  const validateExpandedDefaults = (initializer: ts.Expression | undefined, architecture: ts.Identifier): boolean => {
    const call = initializer === undefined ? undefined : unwrap(initializer);
    if (call === undefined || !ts.isCallExpression(call) || !ts.isIdentifier(call.expression) || !invocationIdentifierResolvesTo(call.expression, expandDatasetDefaultsBinding, bindings, new Map()) || call.arguments.length !== 2) return false;
    if (normalizeInvocation(call, bindings).unsupported !== undefined) return false;
    const defaults = unwrap(call.arguments[0]);
    if (!ts.isBinaryExpression(defaults) || defaults.operatorToken.kind !== ts.SyntaxKind.BarBarToken) return false;
    const fallback = unwrap(defaults.right);
    const architectureDefaults = unwrap(defaults.left);
    if (!ts.isObjectLiteralExpression(fallback) || fallback.properties.length !== 0 || !ts.isPropertyAccessExpression(architectureDefaults) || architectureDefaults.name.text !== 'defaults') return false;
    const base = unwrap(architectureDefaults.expression);
    return ts.isIdentifier(base) && bindings.isBinding(base, architecture);
  };
  if (!validateExpandedDefaults(currentDefaultsInitializer, currentArchitecture) || !validateExpandedDefaults(newDefaultsInitializer, nextArchitecture)) fail(owner, 'handleModelArchChange behavior requires expanded current/new architecture defaults');

  const unsupportedMutation = directMutations.find(mutation => !consumedMutations.has(mutation));
  if (unsupportedMutation !== undefined) fail(unsupportedMutation.node, `handleModelArchChange unsupported reachable mutation ${unsupportedMutation.syntax} ${unsupportedMutation.path}`);
  const unsupportedSetter = setterCalls.find(call => !consumedSetters.has(call));
  if (unsupportedSetter !== undefined) fail(unsupportedSetter.node, `handleModelArchChange unsupported reachable mutation setter ${unsupportedSetter.path ?? '<dynamic>'}`);

  const claims: UiSourceClaim[] = [];
  const add = (symbol: string, path: string, type: UiSourceClaim['value_contract']['ui_type'], behavior: UiBehaviorContract): void => { claims.push(behaviorSettingClaim(sourceName, symbol, path, type, behavior)); };
  for (const suffix of ['te_name_or_path', 'vae_path'] as const) add(`handleModelArchChange::anima-paths::${suffix}::delete`, `config.process[*].model.${suffix}`, 'path', { guard: 'cleaned-model-changed', operation: 'delete', sources: [`config.process[*].model.${suffix}`], payload: { kind: 'undefined' } });
  add('handleModelArchChange::low_vram::section-unsupported::write', 'config.process[*].model.low_vram', 'boolean', { guard: 'section-unsupported', operation: 'write', sources: [], payload: { kind: 'literal', value: { kind: 'boolean', value: false } } });
  for (const suffix of layerDeletePaths) add(`handleModelArchChange::layer-offloading::section-unsupported::${suffix}::delete`, `config.process[*].model.${suffix}`, suffix === 'layer_offloading' ? 'boolean' : 'number', { guard: 'section-unsupported', operation: 'delete', sources: ['config.process[*].model.layer_offloading'], payload: { kind: 'undefined' } });
  add('handleModelArchChange::layer-offloading::supported-absent::layer_offloading::write', 'config.process[*].model.layer_offloading', 'boolean', { guard: 'section-supported-property-absent', operation: 'write', sources: ['config.process[*].model.layer_offloading'], payload: { kind: 'literal', value: { kind: 'boolean', value: false } } });
  for (const suffix of ['layer_offloading_text_encoder_percent', 'layer_offloading_transformer_percent'] as const) add(`handleModelArchChange::layer-offloading::supported-absent::${suffix}::write`, `config.process[*].model.${suffix}`, 'number', { guard: 'section-supported-property-absent', operation: 'write', sources: ['config.process[*].model.layer_offloading'], payload: { kind: 'literal', value: { kind: 'number', value: 1 } } });
  add('handleModelArchChange::architecture::change::write', 'config.process[*].model.arch', 'string', { guard: 'architecture-change', operation: 'write', sources: [], payload: { kind: 'architecture-name' } });
  add('handleModelArchChange::datasets::controls::write', 'config.process[*].datasets[*].controls', 'string-list', { guard: 'architecture-change', operation: 'write', sources: [], payload: { kind: 'architecture-field', field: 'controls' } });
  for (const suffix of ['control_path_1', 'control_path_2', 'control_path_3'] as const) add(`handleModelArchChange::datasets::multi-control::${suffix}::initialize`, `config.process[*].datasets[*].${suffix}`, 'path', { guard: 'multi-control', operation: 'write', sources: [`config.process[*].datasets[*].${suffix}`], payload: { kind: 'copy', source_path: `config.process[*].datasets[*].${suffix}`, fallback: { kind: 'null' } } });
  add('handleModelArchChange::datasets::multi-control::control_path-to-control_path_1::copy', 'config.process[*].datasets[*].control_path_1', 'path', { guard: 'source-nonempty-target-empty', operation: 'write', sources: ['config.process[*].datasets[*].control_path', 'config.process[*].datasets[*].control_path_1'], payload: { kind: 'copy', source_path: 'config.process[*].datasets[*].control_path' } });
  add('handleModelArchChange::datasets::multi-control::control_path::delete', 'config.process[*].datasets[*].control_path', 'path', { guard: 'multi-control', operation: 'delete', sources: ['config.process[*].datasets[*].control_path'], payload: { kind: 'undefined' } });
  add('handleModelArchChange::datasets::single-control::control_path::initialize', 'config.process[*].datasets[*].control_path', 'path', { guard: 'single-control', operation: 'write', sources: ['config.process[*].datasets[*].control_path'], payload: { kind: 'copy', source_path: 'config.process[*].datasets[*].control_path', fallback: { kind: 'null' } } });
  add('handleModelArchChange::datasets::single-control::control_path_1-to-control_path::copy', 'config.process[*].datasets[*].control_path', 'path', { guard: 'source-nonempty', operation: 'write', sources: ['config.process[*].datasets[*].control_path_1'], payload: { kind: 'copy', source_path: 'config.process[*].datasets[*].control_path_1' } });
  for (const suffix of ['control_path_1', 'control_path_2', 'control_path_3'] as const) add(`handleModelArchChange::datasets::single-control::${suffix}::delete`, `config.process[*].datasets[*].${suffix}`, 'path', { guard: 'single-control', operation: 'delete', sources: [`config.process[*].datasets[*].${suffix}`], payload: { kind: 'undefined' } });
  for (const suffix of ['control_path', 'control_path_1', 'control_path_2', 'control_path_3'] as const) add(`handleModelArchChange::datasets::no-control::${suffix}::delete`, `config.process[*].datasets[*].${suffix}`, 'path', { guard: 'no-control', operation: 'delete', sources: [`config.process[*].datasets[*].${suffix}`], payload: { kind: 'undefined' } });
  add('handleModelArchChange::datasets::num_frames::section-unsupported::write', 'config.process[*].datasets[*].num_frames', 'integer', { guard: 'frame-count-unsupported', operation: 'write', sources: [], payload: { kind: 'literal', value: { kind: 'number', value: 1 } } });
  add('handleModelArchChange::datasets::auto_frame_count::section-unsupported::delete', 'config.process[*].datasets[*].auto_frame_count', 'boolean', { guard: 'auto-frame-count-unsupported', operation: 'delete', sources: [], payload: { kind: 'undefined' } });
  add('handleModelArchChange::samples::ctrl_img::section-unsupported::delete', 'config.process[*].sample.samples[*].ctrl_img', 'path', { guard: 'sample-control-unsupported', operation: 'delete', sources: [], payload: { kind: 'undefined' } });
  add('handleModelArchChange::defaults::current::revert', 'config.process[*].model.arch', 'string', { guard: 'revert-current-defaults', operation: 'write', sources: ['config.process[*].model.arch'], payload: { kind: 'architecture-default', phase: 'revert', value_index: 1 } });
  add('handleModelArchChange::defaults::next::apply', 'config.process[*].model.arch', 'string', { guard: 'apply-next-defaults', operation: 'write', sources: ['config.process[*].model.arch'], payload: { kind: 'architecture-default', phase: 'apply', value_index: 0 } });
  if (claims.length !== 30) fail(owner, `handleModelArchChange behavior expected 30 facts, found ${claims.length}`);
  return claims.sort((left, right) => compareCodePoint(left.symbol, right.symbol));
}

function isProcessEnvironment(expression: ts.Expression): boolean {
  expression = unwrap(expression);
  return ts.isPropertyAccessExpression(expression)
    && ts.isIdentifier(expression.expression)
    && expression.expression.text === 'process'
    && expression.name.text === 'env';
}

function environmentKey(node: ts.Expression, bindings: LexicalBindings): string | undefined {
  node = unwrap(node);
  if (ts.isPropertyAccessExpression(node)) {
    const env = unwrap(node.expression);
    return isProcessEnvironment(env) ? node.name.text : undefined;
  }
  if (ts.isElementAccessExpression(node) && node.argumentExpression !== undefined) {
    const env = unwrap(node.expression);
    if (!isProcessEnvironment(env)) return undefined;
    const keys = [...new Set(staticStringValues(node.argumentExpression, bindings))];
    if (keys.length !== 1) throw new FactsError('dynamic environment key cannot be resolved to one finite string');
    return keys[0];
  }
  return undefined;
}

function storageCall(
  node: ts.CallExpression,
  bindings: LexicalBindings,
  allowSpecializedDynamicKey = false,
): { storage: 'localStorage' | 'sessionStorage'; method: 'getItem' | 'setItem' | 'removeItem'; key: string } | undefined {
  const expression = unwrap(node.expression);
  if (!ts.isPropertyAccessExpression(expression) || !ts.isIdentifier(expression.expression)) return undefined;
  const storage = expression.expression.text;
  const method = expression.name.text;
  if ((storage !== 'localStorage' && storage !== 'sessionStorage') || (method !== 'getItem' && method !== 'setItem' && method !== 'removeItem')) return undefined;
  const keyExpression = node.arguments[0];
  const keys = keyExpression === undefined ? [] : [...new Set(staticStringValues(keyExpression, bindings))];
  if (keys.length !== 1) {
    if (allowSpecializedDynamicKey) return undefined;
    throw new FactsError(`dynamic storage key cannot be resolved to one finite string at ${node.getSourceFile().fileName}`);
  }
  return { storage, method, key: keys[0] };
}

function authorizationBoundary(node: ts.Node): boolean {
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'get') {
    const key = node.arguments[0] === undefined ? undefined : unwrap(node.arguments[0]);
    return key !== undefined && ts.isStringLiteral(key) && key.text.toLowerCase() === 'authorization';
  }
  let key: string | undefined;
  let value: ts.Expression | undefined;
  if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
    const left = unwrap(node.left);
    if (ts.isElementAccessExpression(left) && left.argumentExpression !== undefined) {
      const argument = unwrap(left.argumentExpression);
      if (ts.isStringLiteral(argument)) key = argument.text;
    } else if (ts.isPropertyAccessExpression(left)) key = left.name.text;
    value = node.right;
  } else if (ts.isPropertyAssignment(node)) {
    if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) || ts.isNumericLiteral(node.name)) key = node.name.text;
    value = node.initializer;
  }
  return key?.toLowerCase() === 'authorization'
    && value !== undefined
    && /\bBearer\b/.test(value.getText(value.getSourceFile()));
}

function isUnauthorizedStatusCheck(node: ts.Node): boolean {
  if (!ts.isBinaryExpression(node) || ![
    ts.SyntaxKind.EqualsEqualsToken,
    ts.SyntaxKind.EqualsEqualsEqualsToken,
  ].includes(node.operatorToken.kind)) return false;
  const left = unwrap(node.left);
  const right = unwrap(node.right);
  const status = (expression: ts.Expression): boolean => ts.isPropertyAccessExpression(expression) && expression.name.text === 'status';
  return (status(left) && ts.isNumericLiteral(right) && right.text === '401')
    || (status(right) && ts.isNumericLiteral(left) && left.text === '401');
}

function settingValueType(key: string): UiSourceClaim['value_contract']['ui_type'] {
  return /(?:PATH|FOLDER|ROOT)$/.test(key) ? 'path' : 'string';
}

function staticStringValues(expression: ts.Expression, bindings: LexicalBindings): string[] {
  expression = unwrap(expression);
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return [expression.text];
  if (ts.isIdentifier(expression)) {
    const initializer = bindings.declarationInitializer(expression);
    return initializer === undefined ? [] : staticStringValues(initializer, bindings);
  }
  if (ts.isArrayLiteralExpression(expression)) return expression.elements.flatMap(element => staticStringValues(element as ts.Expression, bindings));
  if (ts.isObjectLiteralExpression(expression)) {
    const inside = objectProperties(expression).get('in');
    return inside === undefined ? [] : staticStringValues(inside, bindings);
  }
  return [];
}

function settingsDatabaseKeys(node: ts.CallExpression, bindings: LexicalBindings): string[] {
  const call = unwrap(node.expression);
  if (!ts.isPropertyAccessExpression(call)) return [];
  const receiver = unwrap(call.expression);
  if (!ts.isPropertyAccessExpression(receiver) || receiver.name.text !== 'settings') return [];
  const keys: string[] = [];
  const visit = (child: ts.Node): void => {
    if (ts.isPropertyAssignment(child) && propertyName(child.name) === 'key') {
      keys.push(...staticStringValues(child.initializer, bindings));
    } else if (ts.isShorthandPropertyAssignment(child) && child.name.text === 'key') {
      keys.push(...staticStringValues(child.name, bindings));
    }
    ts.forEachChild(child, visit);
  };
  for (const argument of node.arguments) visit(argument);
  return [...new Set(keys.filter(key => /^[A-Z][A-Z0-9_]+$/.test(key)))];
}

const SERVER_STATE_TYPES: Readonly<Record<string, NonNullable<UiSourceClaim['value_contract']['ui_type']>>> = {
  gpu_ids: 'string',
  info: 'string',
  is_running: 'boolean',
  pid: 'integer',
  queue_position: 'integer',
  return_to_queue: 'boolean',
  sample_now: 'boolean',
  save_now: 'boolean',
  status: 'string',
  stop: 'boolean',
};

function literalAcceptedValue(expression: ts.Expression): TrainingBookValueFact | undefined {
  expression = unwrap(expression);
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return { kind: 'string', value: expression.text };
  if (ts.isNumericLiteral(expression)) return { kind: 'number', value: Number(expression.text) };
  if (expression.kind === ts.SyntaxKind.TrueKeyword || expression.kind === ts.SyntaxKind.FalseKeyword) return { kind: 'boolean', value: expression.kind === ts.SyntaxKind.TrueKeyword };
  return undefined;
}

function stateWrites(node: ts.CallExpression): Array<{ entity: 'job' | 'queue'; method: string; key: string; value?: TrainingBookValueFact }> {
  const call = unwrap(node.expression);
  if (!ts.isPropertyAccessExpression(call) || !['create', 'update', 'updateMany', 'upsert'].includes(call.name.text)) return [];
  const receiver = unwrap(call.expression);
  if (!ts.isPropertyAccessExpression(receiver) || (receiver.name.text !== 'job' && receiver.name.text !== 'queue')) return [];
  const argument = node.arguments[0] === undefined ? undefined : unwrap(node.arguments[0]);
  if (argument === undefined || !ts.isObjectLiteralExpression(argument)) return [];
  const data = objectProperties(argument).get('data');
  const dataObject = data === undefined ? undefined : unwrap(data);
  if (dataObject === undefined || !ts.isObjectLiteralExpression(dataObject)) return [];
  const writes: Array<{ entity: 'job' | 'queue'; method: string; key: string; value?: TrainingBookValueFact }> = [];
  for (const property of dataObject.properties) {
    let key: string | undefined;
    let value: ts.Expression | undefined;
    if (ts.isPropertyAssignment(property)) {
      key = propertyName(property.name);
      value = property.initializer;
    } else if (ts.isShorthandPropertyAssignment(property)) {
      key = property.name.text;
    }
    if (key !== undefined && SERVER_STATE_TYPES[key] !== undefined) writes.push({ entity: receiver.name.text, method: call.name.text, key, value: value === undefined ? undefined : literalAcceptedValue(value) });
  }
  return writes;
}

function settingsPropertyKey(node: ts.Expression): string | undefined {
  node = unwrap(node);
  if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'settings' && /^[A-Z][A-Z0-9_]+$/.test(node.name.text)) return node.name.text;
  if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'settings' && node.argumentExpression !== undefined) {
    const key = unwrap(node.argumentExpression);
    if (ts.isStringLiteral(key) && /^[A-Z][A-Z0-9_]+$/.test(key.text)) return key.text;
  }
  return undefined;
}

function parsedConfigAssignmentPath(node: ts.BinaryExpression): string | undefined {
  if (node.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return undefined;
  const parts = accessParts(node.left);
  if (parts === undefined || parts[0] !== 'parsed' || parts[1] !== 'config') return undefined;
  return normalizePath(parts.slice(1).join('.'), {});
}

function settingsMediatedSetterPath(node: ts.CallExpression): string | undefined {
  if (!ts.isIdentifier(node.expression) || node.expression.text !== 'setJobConfig' || node.arguments.length < 2) return undefined;
  let readsSettings = false;
  const find = (child: ts.Node): void => {
    if (ts.isExpression(child) && settingsPropertyKey(child) !== undefined) readsSettings = true;
    ts.forEachChild(child, find);
  };
  find(node.arguments[0]);
  if (!readsSettings) return undefined;
  const path = unwrap(node.arguments[1]);
  return ts.isStringLiteral(path) || ts.isNoSubstitutionTemplateLiteral(path) ? normalizePath(path.text, {}) : undefined;
}

function interfacePropertyTypes(source: ts.SourceFile, name: string): Map<string, NonNullable<UiSourceClaim['value_contract']['ui_type']>> {
  const result = new Map<string, NonNullable<UiSourceClaim['value_contract']['ui_type']>>();
  for (const statement of source.statements) {
    if (!ts.isInterfaceDeclaration(statement) || statement.name.text !== name) continue;
    for (const member of statement.members) {
      if (!ts.isPropertySignature(member) || member.type === undefined || member.name === undefined) continue;
      const key = propertyName(member.name);
      const kind = member.type.kind === ts.SyntaxKind.BooleanKeyword
        ? 'boolean'
        : member.type.kind === ts.SyntaxKind.NumberKeyword
          ? 'number'
          : member.type.kind === ts.SyntaxKind.StringKeyword
            ? 'string'
            : 'object';
      result.set(key, kind);
    }
  }
  return result;
}

function exactSsrWindowGuard(expression: ts.Expression): boolean {
  expression = unwrap(expression);
  if (!ts.isBinaryExpression(expression) || ![
    ts.SyntaxKind.EqualsEqualsToken,
    ts.SyntaxKind.EqualsEqualsEqualsToken,
  ].includes(expression.operatorToken.kind)) return false;
  const isWindowTypeof = (candidate: ts.Expression): boolean => {
    candidate = unwrap(candidate);
    return ts.isTypeOfExpression(candidate)
      && ts.isIdentifier(unwrap(candidate.expression))
      && (unwrap(candidate.expression) as ts.Identifier).text === 'window';
  };
  const isUndefinedString = (candidate: ts.Expression): boolean => {
    candidate = unwrap(candidate);
    return (ts.isStringLiteral(candidate) || ts.isNoSubstitutionTemplateLiteral(candidate)) && candidate.text === 'undefined';
  };
  return (isWindowTypeof(expression.left) && isUndefinedString(expression.right))
    || (isWindowTypeof(expression.right) && isUndefinedString(expression.left));
}

function exactGuardedNullReturn(node: ts.ReturnStatement, helper: ts.FunctionDeclaration): boolean {
  if (node.expression === undefined || unwrap(node.expression).kind !== ts.SyntaxKind.NullKeyword) return false;
  let current: ts.Node = node;
  while (current.parent !== helper) {
    const parent = current.parent;
    if (parent === undefined) return false;
    if (ts.isIfStatement(parent) && current === parent.thenStatement && exactSsrWindowGuard(parent.expression)) return true;
    current = parent;
  }
  return false;
}

function exactJobLossUrlReturn(node: ts.ReturnStatement): boolean {
  if (node.expression === undefined) return false;
  const expression = unwrap(node.expression);
  if (!ts.isTemplateExpression(expression) || expression.head.text !== 'jobLossGraph:' || expression.templateSpans.length !== 2) return false;
  const [pathname, search] = expression.templateSpans;
  return accessParts(pathname.expression)?.join('.') === 'window.location.pathname'
    && pathname.literal.text === ''
    && accessParts(search.expression)?.join('.') === 'window.location.search'
    && search.literal.text === '';
}

function exhaustivelyReturns(block: ts.Block): boolean {
  const staticTruth = (expression: ts.Expression): boolean | undefined => {
    expression = unwrap(expression);
    if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
    return ts.isNumericLiteral(expression) ? Number(expression.text) !== 0 : undefined;
  };
  const statementReturns = (statement: ts.Statement): boolean => {
    if (ts.isReturnStatement(statement)) return true;
    if (ts.isBlock(statement)) return exhaustivelyReturns(statement);
    if (ts.isIfStatement(statement)) {
      const truth = staticTruth(statement.expression);
      if (truth === true) return statementReturns(statement.thenStatement);
      if (truth === false) return statement.elseStatement !== undefined && statementReturns(statement.elseStatement);
      return statement.elseStatement !== undefined
        && statementReturns(statement.thenStatement)
        && statementReturns(statement.elseStatement);
    }
    return false;
  };
  for (const statement of block.statements) {
    if (isStaticallyDead(statement)) continue;
    if (statementReturns(statement)) return true;
  }
  return false;
}

function isJobLossStorageKey(expression: ts.Expression, bindings: LexicalBindings, source: ts.SourceFile): boolean {
  expression = unwrap(expression);
  if (ts.isIdentifier(expression)) {
    const initializer = bindings.declarationInitializer(expression);
    return initializer !== undefined && isJobLossStorageKey(initializer, bindings, source);
  }
  if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression) || expression.arguments.length !== 0) return false;
  const call = expression.expression;
  const functions: ts.FunctionDeclaration[] = [];
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined && bindings.isBinding(call, statement.name)) functions.push(statement);
  }
  if (functions.length !== 1) return false;
  const helper = functions[0];
  let sawGuardedNull = false;
  let sawExactUrl = false;
  let invalidReturn = false;
  const visit = (node: ts.Node): void => {
    if (isStaticallyDead(node)) return;
    if (node !== helper && (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node))) return;
    if (ts.isReturnStatement(node)) {
      if (exactGuardedNullReturn(node, helper)) sawGuardedNull = true;
      else if (exactJobLossUrlReturn(node)) sawExactUrl = true;
      else invalidReturn = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(helper);
  return sawGuardedNull && sawExactUrl && !invalidReturn && helper.body !== undefined && exhaustivelyReturns(helper.body);
}

function partialPersistedSettingsType(type: ts.TypeNode): boolean {
  return ts.isTypeReferenceNode(type)
    && ts.isIdentifier(type.typeName)
    && type.typeName.text === 'Partial'
    && type.typeArguments?.length === 1
    && ts.isTypeReferenceNode(type.typeArguments[0])
    && ts.isIdentifier(type.typeArguments[0].typeName)
    && type.typeArguments[0].typeName.text === 'PersistedSettings';
}

function persistedObjectWrites(node: ts.CallExpression, bindings: LexicalBindings, source: ts.SourceFile): Array<{ key: string; uiType: NonNullable<UiSourceClaim['value_contract']['ui_type']> }> {
  const storage = storageCall(node, bindings, true);
  if (storage !== undefined || !ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== 'setItem') return [];
  const receiver = unwrap(node.expression.expression);
  if (
    !ts.isIdentifier(receiver)
    || receiver.text !== 'localStorage'
    || node.arguments.length !== 2
    || !isJobLossStorageKey(node.arguments[0], bindings, source)
  ) return [];
  const encoded = unwrap(node.arguments[1]);
  if (!ts.isCallExpression(encoded) || !ts.isPropertyAccessExpression(encoded.expression) || !ts.isIdentifier(encoded.expression.expression) || encoded.expression.expression.text !== 'JSON' || encoded.expression.name.text !== 'stringify' || encoded.arguments.length !== 1) return [];
  const payloadName = unwrap(encoded.arguments[0]);
  if (!ts.isIdentifier(payloadName)) return [];
  const initializer = bindings.declarationInitializer(payloadName);
  const payload = initializer === undefined ? undefined : unwrap(initializer);
  if (payload === undefined || !ts.isObjectLiteralExpression(payload)) return [];
  let typeName: string | undefined;
  const findDeclaration = (child: ts.Node): void => {
    if (
      ts.isVariableDeclaration(child)
      && ts.isIdentifier(child.name)
      && child.name.text === payloadName.text
      && child.initializer === initializer
      && child.type !== undefined
      && ts.isTypeReferenceNode(child.type)
      && ts.isIdentifier(child.type.typeName)
    ) typeName = child.type.typeName.text;
    ts.forEachChild(child, findDeclaration);
  };
  findDeclaration(source);
  const types = typeName === undefined ? new Map<string, NonNullable<UiSourceClaim['value_contract']['ui_type']>>() : interfacePropertyTypes(source, typeName);
  return [...objectProperties(payload).keys()].map(key => ({ key, uiType: types.get(key) ?? 'object' }));
}

function spawnEnvironmentWrites(node: ts.Node): Array<{ key: string; value?: TrainingBookValueFact }> {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'additionalEnv' && node.initializer !== undefined) {
    const initializer = unwrap(node.initializer);
    if (!ts.isObjectLiteralExpression(initializer)) return [];
    return initializer.properties.flatMap(property => {
      if (!ts.isPropertyAssignment(property)) return [];
      const key = propertyName(property.name);
      return /^[A-Z][A-Z0-9_]+$/.test(key) ? [{ key, value: literalAcceptedValue(property.initializer) }] : [];
    });
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    const left = unwrap(node.left);
    if (ts.isPropertyAccessExpression(left) && ts.isIdentifier(left.expression) && left.expression.text === 'additionalEnv' && /^[A-Z][A-Z0-9_]+$/.test(left.name.text)) {
      return [{ key: left.name.text, value: literalAcceptedValue(node.right) }];
    }
  }
  return [];
}

function settingsHydrationKeys(node: ts.CallExpression): string[] {
  if (!ts.isIdentifier(node.expression) || node.expression.text !== 'setSettings' || node.arguments.length !== 1) return [];
  const value = unwrap(node.arguments[0]);
  if (!ts.isObjectLiteralExpression(value)) return [];
  return value.properties.flatMap(property => {
    if (!ts.isPropertyAssignment(property)) return [];
    const key = propertyName(property.name);
    if (!/^[A-Z][A-Z0-9_]+$/.test(key)) return [];
    let matchingResponseRead = false;
    const visit = (child: ts.Node): void => {
      const expression = ts.isExpression(child) ? unwrap(child) : undefined;
      if (
        expression !== undefined
        && ts.isPropertyAccessExpression(expression)
        && ts.isIdentifier(expression.expression)
        && expression.expression.text === 'data'
        && expression.name.text === key
      ) matchingResponseRead = true;
      ts.forEachChild(child, visit);
    };
    visit(property.initializer);
    return matchingResponseRead ? [key] : [];
  });
}

function importedSettingGetterKeys(source: ts.SourceFile): Map<string, string> {
  const known = new Map<string, string>([
    ['getDataRoot', 'DATA_ROOT'],
    ['getDatasetsRoot', 'DATASETS_FOLDER'],
    ['getHFToken', 'HF_TOKEN'],
    ['getModelsPath', 'MODELS_PATH'],
    ['getTrainingFolder', 'TRAINING_FOLDER'],
  ]);
  const result = new Map<string, string>();
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement)
      || !ts.isStringLiteral(statement.moduleSpecifier)
      || !/(?:^|\/)(?:paths|settings)$/u.test(statement.moduleSpecifier.text)
      || statement.importClause?.namedBindings === undefined
      || !ts.isNamedImports(statement.importClause.namedBindings)
    ) continue;
    for (const element of statement.importClause.namedBindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text;
      const key = known.get(imported);
      if (key !== undefined) result.set(element.name.text, key);
    }
  }
  return result;
}

function importedSettingGetterKey(node: ts.CallExpression, getters: ReadonlyMap<string, string>): string | undefined {
  return ts.isIdentifier(node.expression) ? getters.get(node.expression.text) : undefined;
}

function resolvedGpuSelection(node: ts.VariableDeclaration): boolean {
  if (!ts.isIdentifier(node.name) || node.name.text !== 'gpu_ids' || node.initializer === undefined) return false;
  const initializer = unwrap(node.initializer);
  return ts.isCallExpression(initializer)
    && ts.isIdentifier(initializer.expression)
    && initializer.expression.text === 'resolveGpuIds';
}

function osPlatformCall(node: ts.CallExpression): boolean {
  const expression = unwrap(node.expression);
  return ts.isPropertyAccessExpression(expression)
    && ts.isIdentifier(expression.expression)
    && expression.expression.text === 'os'
    && expression.name.text === 'platform'
    && node.arguments.length === 0;
}

function cliPortDeclaration(node: ts.VariableDeclaration): boolean {
  if (!ts.isIdentifier(node.name) || node.initializer === undefined) return false;
  const initializer = unwrap(node.initializer);
  if (!ts.isCallExpression(initializer) || !ts.isIdentifier(initializer.expression) || initializer.expression.text !== 'argValue') return false;
  const key = initializer.arguments[0] === undefined ? undefined : unwrap(initializer.arguments[0]);
  return key !== undefined && (ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key)) && key.text === '--port';
}

function inheritedProcessEnvironment(node: ts.SpreadAssignment): boolean {
  return isProcessEnvironment(node.expression)
    && ts.isObjectLiteralExpression(node.parent)
    && ts.isPropertyAssignment(node.parent.parent)
    && propertyName(node.parent.parent.name) === 'env';
}

function clusterWorkerEnvironmentWrites(node: ts.VariableDeclaration, source: ts.SourceFile): Array<{ key: string; value?: TrainingBookValueFact }> {
  if (!ts.isIdentifier(node.name) || node.initializer === undefined) return [];
  const initializer = unwrap(node.initializer);
  if (!ts.isObjectLiteralExpression(initializer)) return [];
  let passedToClusterFork = false;
  const visit = (child: ts.Node): void => {
    if (ts.isCallExpression(child)) {
      const parts = accessParts(child.expression);
      if (
        parts?.join('.') === 'cluster.fork'
        && child.arguments.some(argument => ts.isIdentifier(unwrap(argument)) && (unwrap(argument) as ts.Identifier).text === node.name.getText(source))
      ) passedToClusterFork = true;
    }
    ts.forEachChild(child, visit);
  };
  visit(source);
  if (!passedToClusterFork) return [];
  return initializer.properties.flatMap(property => {
    if (!ts.isPropertyAssignment(property)) return [];
    const key = propertyName(property.name);
    return /^[A-Z][A-Z0-9_]+$/.test(key) ? [{ key, value: literalAcceptedValue(property.initializer) }] : [];
  });
}

function persistedObjectReads(node: ts.CallExpression, bindings: LexicalBindings, source: ts.SourceFile): Array<{ key: string; uiType: NonNullable<UiSourceClaim['value_contract']['ui_type']> }> {
  const expression = unwrap(node.expression);
  if (
    !ts.isPropertyAccessExpression(expression)
    || !ts.isIdentifier(expression.expression)
    || expression.expression.text !== 'localStorage'
    || expression.name.text !== 'getItem'
    || node.arguments[0] === undefined
    || !isJobLossStorageKey(node.arguments[0], bindings, source)
  ) return [];
  if (!ts.isVariableDeclaration(node.parent) || node.parent.initializer !== node || !ts.isIdentifier(node.parent.name)) return [];
  const rawBinding = node.parent.name;
  const types = interfacePropertyTypes(source, 'PersistedSettings');
  const reads = new Map<string, NonNullable<UiSourceClaim['value_contract']['ui_type']>>();
  const visit = (child: ts.Node): void => {
    if (
      ts.isVariableDeclaration(child)
      && ts.isIdentifier(child.name)
      && child.initializer !== undefined
      && ts.isAsExpression(child.initializer)
      && partialPersistedSettingsType(child.initializer.type)
    ) {
      const parsed = unwrap(child.initializer.expression);
      if (
        ts.isCallExpression(parsed)
        && ts.isPropertyAccessExpression(parsed.expression)
        && ts.isIdentifier(parsed.expression.expression)
        && parsed.expression.expression.text === 'JSON'
        && parsed.expression.name.text === 'parse'
        && parsed.arguments.length === 1
      ) {
        const argument = unwrap(parsed.arguments[0]);
        if (ts.isIdentifier(argument) && bindings.isBinding(argument, rawBinding)) {
          const parsedBinding = child.name;
          const findReads = (candidate: ts.Node): void => {
            if (
              ts.isPropertyAccessExpression(candidate)
              && ts.isIdentifier(candidate.expression)
              && bindings.isBinding(candidate.expression, parsedBinding)
            ) {
              const uiType = types.get(candidate.name.text);
              if (uiType !== undefined) reads.set(candidate.name.text, uiType);
            }
            ts.forEachChild(candidate, findReads);
          };
          findReads(source);
        }
      }
    }
    ts.forEachChild(child, visit);
  };
  visit(source);
  return [...reads].map(([key, uiType]) => ({ key, uiType }));
}

function injectedScriptStorageClaims(node: ts.JsxAttribute, sourcePath: string): UiSourceClaim[] {
  if (!ts.isIdentifier(node.name) || node.name.text !== 'dangerouslySetInnerHTML' || node.initializer === undefined || !ts.isJsxExpression(node.initializer)) return [];
  const container = node.initializer.expression === undefined ? undefined : unwrap(node.initializer.expression);
  if (container === undefined || !ts.isObjectLiteralExpression(container)) return [];
  const html = objectProperties(container).get('__html');
  const literal = html === undefined ? undefined : unwrap(html);
  if (literal === undefined || (!ts.isStringLiteral(literal) && !ts.isNoSubstitutionTemplateLiteral(literal) && !ts.isTemplateExpression(literal))) return [];
  const scriptText = ts.isTemplateExpression(literal)
    ? literal.head.text + literal.templateSpans.map(span => `undefined${span.literal.text}`).join('')
    : literal.text;
  const injected = ts.createSourceFile(`${sourcePath}.injected.js`, scriptText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const bindings = new LexicalBindings(injected);
  const claims: UiSourceClaim[] = [];
  const owner = factSymbol(node, sourcePath);
  const visit = (child: ts.Node): void => {
    if (isStaticallyDead(child)) return;
    if (ts.isCallExpression(child)) {
      const storage = storageCall(child, bindings);
      if (storage !== undefined) claims.push(serverStateClaim(
        sourcePath,
        `${owner}::${storage.storage}.${storage.method}(${storage.key})`,
        `browser.${storage.storage}.${storage.key}`,
        'string',
      ));
    }
    ts.forEachChild(child, visit);
  };
  visit(injected);
  return claims;
}

function occurrenceRole(node: ts.Node, detector: string): string {
  const roles = [detector];
  let current: ts.Node | undefined = node;
  while (current?.parent !== undefined) {
    const parent: ts.Node = current.parent;
    if (ts.isCallExpression(parent)) {
      const argumentIndex = parent.arguments.indexOf(current as ts.Expression);
      if (argumentIndex >= 0) {
        const callee = accessParts(parent.expression)?.join('.')
          ?? (ts.isIdentifier(parent.expression) ? parent.expression.text : 'call');
        const event = parent.arguments[0] === undefined ? undefined : unwrap(parent.arguments[0]);
        const eventName = event !== undefined && (ts.isStringLiteral(event) || ts.isNoSubstitutionTemplateLiteral(event)) ? `:${event.text}` : '';
        roles.push(`arg:${callee}${eventName}[${argumentIndex}]`);
      }
    } else if (ts.isBinaryExpression(parent) && (current === parent.left || current === parent.right)) {
      const side = current === parent.left ? 'lhs' : 'rhs';
      const target = current === parent.right ? accessParts(parent.left)?.join('.') : undefined;
      roles.push(`${side}:${target === undefined ? ts.tokenToString(parent.operatorToken.kind) ?? 'binary' : target.replace(/\[\d+\]/gu, '[*]')}`);
    } else if (ts.isVariableDeclaration(parent) && current === parent.initializer) {
      roles.push(`initializer:${parent.name.getText(parent.getSourceFile())}`);
    } else if (ts.isPropertyAssignment(parent) && current === parent.initializer) {
      roles.push(`property:${propertyName(parent.name)}`);
    } else if (ts.isIfStatement(parent)) {
      const condition = parent.expression.getText(parent.getSourceFile()).replace(/\s+/gu, '');
      if (current === parent.thenStatement) roles.push(`guard:if-then:${condition}`);
      else if (current === parent.elseStatement) roles.push(`guard:if-else:${condition}`);
      else if (current === parent.expression) roles.push('guard:if-condition');
    } else if (ts.isConditionalExpression(parent)) {
      const condition = parent.condition.getText(parent.getSourceFile()).replace(/\s+/gu, '');
      if (current === parent.whenTrue) roles.push(`guard:conditional-true:${condition}`);
      else if (current === parent.whenFalse) roles.push(`guard:conditional-false:${condition}`);
      else if (current === parent.condition) roles.push('guard:conditional-condition');
    } else if (ts.isCatchClause(parent)) {
      roles.push('guard:catch');
    }
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) && ts.isCallExpression(parent)) {
      const callee = accessParts(parent.expression)?.join('.')
        ?? (ts.isIdentifier(parent.expression) ? parent.expression.text : 'callback');
      const event = parent.arguments[0] === undefined ? undefined : unwrap(parent.arguments[0]);
      const eventName = event !== undefined && (ts.isStringLiteral(event) || ts.isNoSubstitutionTemplateLiteral(event)) ? `:${event.text}` : '';
      roles.push(`callback:${callee}${eventName}[${parent.arguments.indexOf(current as ts.Expression)}]`);
    }
    if (
      (ts.isFunctionDeclaration(parent) || ts.isMethodDeclaration(parent))
      || ((ts.isArrowFunction(parent) || ts.isFunctionExpression(parent))
        && (ts.isVariableDeclaration(parent.parent) || ts.isPropertyAssignment(parent.parent)))
    ) break;
    current = parent;
  }
  return roles.join('/');
}

function defaultExportedFunctionName(source: ts.SourceFile): string | undefined {
  for (const statement of source.statements) {
    if (
      ts.isFunctionDeclaration(statement)
      && statement.name !== undefined
      && statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword)
    ) return statement.name.text;
  }
  return undefined;
}

function exportedFunctionAncestor(node: ts.Node): string | undefined {
  let current: ts.Node | undefined = node;
  let exported: string | undefined;
  while (current !== undefined) {
    if (
      ts.isFunctionDeclaration(current)
      && current.name !== undefined
      && current.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) exported = current.name.text;
    current = current.parent;
  }
  return exported;
}

function summaryOwners(node: ts.Node, sourcePath: string, source: ts.SourceFile, owner: string): string[] {
  const owners = new Set<string>();
  const exported = exportedFunctionAncestor(node);
  if (exported !== undefined && owner.startsWith(`${exported}::`)) owners.add(exported);
  const defaultOwner = defaultExportedFunctionName(source);
  if (
    defaultOwner !== undefined
    && defaultOwner !== owner
    && (owner === '<module>' || sourcePath.startsWith('ui/cron/actions/'))
  ) owners.add(defaultOwner);
  const outermost = owner.split('::')[0];
  if (outermost.endsWith('Provider') && outermost !== owner) owners.add(outermost);
  owners.delete(owner);
  return [...owners];
}

function gpuSelectionTransition(node: ts.CallExpression): 'hydrate' | 'default' | undefined {
  if (!ts.isIdentifier(node.expression) || node.expression.text !== 'setGpuIDs' || node.arguments.length !== 1) return undefined;
  let readsHydratedGpu = false;
  let readsDefaultGpu = false;
  const visit = (child: ts.Node): void => {
    const parts = ts.isExpression(child) ? accessParts(child) : undefined;
    if (parts?.join('.') === 'data.gpu_ids') readsHydratedGpu = true;
    if (parts?.join('.') === 'gpuList[0].index') readsDefaultGpu = true;
    ts.forEachChild(child, visit);
  };
  visit(node.arguments[0]);
  return readsHydratedGpu ? 'hydrate' : readsDefaultGpu ? 'default' : undefined;
}

function structurallyDeclaredServerGlobalClaims(sourcePath: string, sourceText: string): UiSourceClaim[] {
  const source = ts.createSourceFile(
    sourcePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    sourcePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const bindings = new LexicalBindings(source);
  const settingGetters = importedSettingGetterKeys(source);
  const events: Array<{ claim: UiSourceClaim; role: string }> = [];
  const summaries = new Map<string, { claim: UiSourceClaim; occurrences: number }>();
  const add = (claim: UiSourceClaim, node: ts.Node, detector: string): void => {
    events.push({ claim, role: occurrenceRole(node, detector) });
  };
  const addOwned = (claim: UiSourceClaim, node: ts.Node, detector: string, owner: string): void => {
    add(claim, node, detector);
    for (const summaryOwner of summaryOwners(node, sourcePath, source, owner)) {
      const prefix = `${owner}::`;
      if (!claim.symbol.startsWith(prefix)) continue;
      const summary = { ...claim, symbol: `${summaryOwner}::${claim.symbol.slice(prefix.length)}`, value_contract: { ...claim.value_contract } };
      const identity = `${summary.source_path}\0${summary.symbol}\0${summary.path}\0${summary.kind}`;
      const existing = summaries.get(identity);
      if (existing === undefined) summaries.set(identity, { claim: summary, occurrences: 1 });
      else {
        existing.occurrences += 1;
        const acceptedValues = uniqueValues([
          ...(existing.claim.value_contract.accepted_values ?? []),
          ...(summary.value_contract.accepted_values ?? []),
        ]);
        if (acceptedValues.length > 0) existing.claim.value_contract.accepted_values = acceptedValues;
      }
    }
  };
  const visit = (node: ts.Node): void => {
    if (isStaticallyDead(node)) return;
    if (ts.isExpression(node) && unwrap(node) === node) {
      const key = environmentKey(node, bindings);
      if (key !== undefined) {
        const owner = factSymbol(node, sourcePath);
        addOwned(serverStateClaim(sourcePath, `${owner}::process.env.${key}`, key, /(?:PORT|WORKERS)$/.test(key) ? 'integer' : key === 'LD_LIBRARY_PATH' ? 'string' : /(?:PATH|FOLDER|ROOT)$/.test(key) ? 'path' : 'string'), node, 'environment-read', owner);
      }
    }
    if (ts.isCallExpression(node)) {
      const persistedReads = persistedObjectReads(node, bindings, source);
      const persistedWrites = persistedObjectWrites(node, bindings, source);
      const storage = storageCall(node, bindings, persistedReads.length > 0 || persistedWrites.length > 0);
      if (storage !== undefined) {
        const owner = factSymbol(node, sourcePath);
        addOwned(serverStateClaim(sourcePath, `${owner}::${storage.storage}.${storage.method}(${storage.key})`, `browser.${storage.storage}.${storage.key}`, 'string'), node, `storage-${storage.method}`, owner);
      }
      for (const persisted of persistedReads) {
        const owner = factSymbol(node, sourcePath);
        addOwned(serverStateClaim(sourcePath, `${owner}::hydrate::${persisted.key}`, `browser.localStorage.jobLossGraph.${persisted.key}`, persisted.uiType), node, `persisted-hydrate-${persisted.key}`, owner);
      }
      for (const persisted of persistedWrites) {
        const owner = factSymbol(node, sourcePath);
        addOwned(serverStateClaim(sourcePath, `${owner}::persist::${persisted.key}`, `browser.localStorage.jobLossGraph.${persisted.key}`, persisted.uiType), node, `persisted-write-${persisted.key}`, owner);
      }
      const owner = factSymbol(node, sourcePath);
      const getterKey = importedSettingGetterKey(node, settingGetters);
      if (getterKey !== undefined) {
        const operationOwner = sourcePath.startsWith('ui/cron/actions/')
          ? defaultExportedFunctionName(source) ?? owner
          : owner;
        addOwned(
          serverStateClaim(sourcePath, `${operationOwner}::settings.${getterKey}`, `settings.${getterKey}`, settingValueType(getterKey)),
          node,
          `settings-getter-${getterKey}-${lexicalFactSymbol(node)}`,
          operationOwner,
        );
      }
      for (const key of settingsDatabaseKeys(node, bindings)) {
        addOwned(serverStateClaim(sourcePath, `${owner}::settings.${key}`, `settings.${key}`, settingValueType(key)), node, `settings-${accessParts(node.expression)?.at(-1) ?? 'call'}`, owner);
      }
      for (const key of settingsHydrationKeys(node)) {
        addOwned(serverStateClaim(sourcePath, `${owner}::hydrate::settings.${key}`, `settings.${key}`, settingValueType(key)), node, `settings-hydrate-${key}`, owner);
      }
      for (const write of stateWrites(node)) {
        addOwned(serverStateClaim(
          sourcePath,
          `${owner}::${write.entity}.${write.key}`,
          `${write.entity}.${write.key}`,
          SERVER_STATE_TYPES[write.key],
          write.value === undefined ? undefined : [write.value],
        ), node, `${write.entity}-${write.method}-${write.key}-${write.value === undefined ? 'derived' : JSON.stringify(write.value)}`, owner);
      }
      const mediatedPath = settingsMediatedSetterPath(node);
      if (mediatedPath !== undefined) addOwned(serverStateClaim(sourcePath, `${owner}::settings::${mediatedPath}`, mediatedPath, /(?:path|folder)$/.test(mediatedPath) ? 'path' : 'string'), node, 'settings-mediated-setter', owner);
      const gpuTransition = gpuSelectionTransition(node);
      if (gpuTransition !== undefined) {
        const outerOwner = owner.split('::')[0];
        addOwned(serverStateClaim(sourcePath, `${outerOwner}::${gpuTransition}::gpuids`, 'gpuids', 'string'), node, `gpu-selection-${gpuTransition}`, outerOwner);
      }
    }
    if (ts.isExpression(node)) {
      const settingKey = settingsPropertyKey(node);
      if (settingKey !== undefined) {
        const owner = factSymbol(node, sourcePath);
        addOwned(serverStateClaim(sourcePath, `${owner}::settings.${settingKey}`, `settings.${settingKey}`, settingValueType(settingKey)), node, 'settings-property-read', owner);
      }
    }
    if (ts.isBinaryExpression(node)) {
      const configPath = parsedConfigAssignmentPath(node);
      if (configPath !== undefined) {
        const owner = factSymbol(node, sourcePath);
        addOwned(serverStateClaim(sourcePath, `${owner}::import::${configPath}`, configPath, /(?:path|folder)$/.test(configPath) ? 'path' : literalAcceptedValue(node.right)?.kind === 'number' ? 'number' : 'string', literalAcceptedValue(node.right) === undefined ? undefined : [literalAcceptedValue(node.right)!]), node, 'config-import-assignment', owner);
      }
    }
    if (ts.isVariableDeclaration(node)) {
      if (resolvedGpuSelection(node)) {
        const owner = factSymbol(node, sourcePath);
        addOwned(serverStateClaim(sourcePath, `${owner}::gpuids`, 'gpuids', 'string'), node, 'resolved-gpu-selection', owner);
      }
      if (cliPortDeclaration(node)) {
        const owner = factSymbol(node, sourcePath);
        addOwned(serverStateClaim(sourcePath, `${owner}::cli.port`, 'ui.file_server.port', 'integer'), node, 'cli-port', owner);
      }
      for (const environment of clusterWorkerEnvironmentWrites(node, source)) {
        add(serverStateClaim(sourcePath, `cluster.worker::process.env.${environment.key}`, environment.key, /PORT$/.test(environment.key) ? 'integer' : 'string', environment.value === undefined ? undefined : [environment.value]), node, `cluster-worker-environment-${environment.key}`);
      }
    }
    if (ts.isCallExpression(node) && osPlatformCall(node)) {
      const owner = factSymbol(node, sourcePath);
      addOwned(serverStateClaim(sourcePath, `${owner}::os.platform`, 'server.platform', 'string'), node, 'server-platform', owner);
    }
    if (ts.isSpreadAssignment(node) && isProcessEnvironment(node.expression)) {
      const owner = factSymbol(node, sourcePath);
      if (inheritedProcessEnvironment(node)) {
        addOwned(serverStateClaim(sourcePath, `${owner}::spawn.env.inherited`, 'spawn.env.inherited', 'object'), node, 'spawn-inherited-environment', owner);
      } else {
        addOwned(serverStateClaim(sourcePath, `${owner}::process.env.pass-through`, 'process.env.inherited', 'object'), node, 'process-environment-pass-through', owner);
      }
    }
    if (ts.isJsxAttribute(node)) {
      for (const injected of injectedScriptStorageClaims(node, sourcePath)) add(injected, node, 'injected-executable-script');
    }
    for (const environment of spawnEnvironmentWrites(node)) {
      const owner = sourcePath === 'ui/cron/actions/startJob.ts' ? 'startJob' : lexicalFactSymbol(node);
      addOwned(serverStateClaim(sourcePath, `${owner}::spawn.env.${environment.key}`, `spawn.env.${environment.key}`, 'string', environment.value === undefined ? undefined : [environment.value]), node, `spawn-environment-${environment.key}`, owner);
    }
    if (authorizationBoundary(node)) {
      const owner = factSymbol(node, sourcePath);
      addOwned(serverStateClaim(sourcePath, `${owner}::Authorization.bearer`, 'http.Authorization', 'string'), node, 'authorization-bearer', owner);
    }
    if (isUnauthorizedStatusCheck(node)) {
      const owner = factSymbol(node, sourcePath);
      addOwned(serverStateClaim(sourcePath, `${owner}::status=401`, 'auth.is_authorized', 'boolean'), node, 'authorization-401', owner);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const grouped = new Map<string, Array<{ claim: UiSourceClaim; role: string }>>();
  for (const event of events) {
    const identity = `${event.claim.source_path}\0${event.claim.symbol}\0${event.claim.path}\0${event.claim.kind}`;
    const group = grouped.get(identity) ?? [];
    group.push(event);
    grouped.set(identity, group);
  }
  const preciseClaims = [...grouped.values()].flatMap(group => {
    if (group.length === 1) return [group[0].claim];
    const roles = new Set(group.map(event => event.role));
    if (roles.size !== group.length) {
      const claim = group[0].claim;
      throw new FactsError(`indistinguishable duplicate structural fact: ${sourcePath} ${claim.symbol} ${claim.path}`);
    }
    const aggregateValues = uniqueValues(group.flatMap(event => event.claim.value_contract.accepted_values ?? []));
    const aggregate: UiSourceClaim = {
      ...group[0].claim,
      value_contract: {
        ...group[0].claim.value_contract,
        ...(aggregateValues.length === 0 ? {} : { accepted_values: aggregateValues }),
      },
    };
    return [
      aggregate,
      ...group.map(event => ({ ...event.claim, symbol: `${event.claim.symbol}::role=${event.role}` })),
    ];
  });
  const claims = new Map<string, UiSourceClaim>();
  const aggregateSummaries = [...summaries.values()]
    .filter(summary => summary.occurrences > 1)
    .map(summary => summary.claim);
  for (const claim of [...aggregateSummaries, ...preciseClaims]) {
    const identity = `${claim.source_path}\0${claim.symbol}\0${claim.path}\0${claim.kind}`;
    const existing = claims.get(identity);
    if (existing === undefined) claims.set(identity, claim);
    else {
      const acceptedValues = uniqueValues([
        ...(existing.value_contract.accepted_values ?? []),
        ...(claim.value_contract.accepted_values ?? []),
      ]);
      if (acceptedValues.length > 0) existing.value_contract.accepted_values = acceptedValues;
    }
  }
  return [...claims.values()].sort((left, right) => compareCodePoint(
    `${left.source_path}\0${left.symbol}\0${left.path}\0${left.kind}`,
    `${right.source_path}\0${right.symbol}\0${right.path}\0${right.kind}`,
  ));
}

function matchesDeclaredTypeScriptGlob(sourcePath: string, pattern: string): boolean {
  if (pattern.endsWith('/**/*.ts')) {
    const prefix = pattern.slice(0, -'/**/*.ts'.length);
    return sourcePath.startsWith(`${prefix}/`) && sourcePath.endsWith('.ts');
  }
  if (pattern.endsWith('/**/*')) {
    const prefix = pattern.slice(0, -'/**/*'.length);
    return sourcePath.startsWith(`${prefix}/`);
  }
  return sourcePath === pattern;
}

export function collectDeclaredTypeScriptSourcePaths(repositoryRoot: string): string[] {
  const root = resolve(repositoryRoot);
  const sourceCatalog = JSON.parse(readFileSync(join(root, 'docs/book/reference/settings-sources.json'), 'utf8')) as {
    source_groups?: Array<{ owner?: string; globs?: string[] }>;
  };
  const patterns = (sourceCatalog.source_groups ?? [])
    .filter(group => group.owner === 'typescript-test')
    .flatMap(group => group.globs ?? []);
  if (patterns.length === 0) throw new FactsError('settings sources declares no typescript-test globs');
  const files: string[] = [];
  const walk = (relativeDirectory: string): void => {
    const absoluteDirectory = join(root, relativeDirectory);
    for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) walk(relativePath);
      else if ((relativePath.endsWith('.ts') || relativePath.endsWith('.tsx')) && patterns.some(pattern => matchesDeclaredTypeScriptGlob(relativePath, pattern))) files.push(relativePath);
    }
  };
  walk('ui');
  return files.sort(compareCodePoint);
}

function jsxTagName(node: ts.JsxOpeningLikeElement): string | undefined {
  return ts.isIdentifier(node.tagName) ? node.tagName.text : undefined;
}

function primaryLabelText(element: ts.JsxElement): string | undefined {
  for (const child of element.children) {
    if (ts.isJsxText(child)) {
      const text = child.text.replace(/\s+/gu, ' ').trim();
      if (text !== '') return text;
    }
    if (ts.isJsxExpression(child) && child.expression !== undefined) {
      const expression = unwrap(child.expression);
      if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
        const text = expression.text.replace(/\s+/gu, ' ').trim();
        if (text !== '') return text;
      }
    }
  }
  return undefined;
}

function stateBindingPair(
  value: ts.Identifier,
  source: ts.SourceFile,
  bindings: LexicalBindings,
): { value: ts.Identifier; setter: ts.Identifier } | undefined {
  let pair: { value: ts.Identifier; setter: ts.Identifier } | undefined;
  const visit = (node: ts.Node): void => {
    if (
      pair === undefined
      && ts.isVariableDeclaration(node)
      && ts.isArrayBindingPattern(node.name)
      && node.name.elements.length >= 2
      && node.initializer !== undefined
    ) {
      const initializer = unwrap(node.initializer);
      const valueElement = node.name.elements[0];
      const setterElement = node.name.elements[1];
      if (
        ts.isCallExpression(initializer)
        && ts.isIdentifier(initializer.expression)
        && bindings.isExactNamedImport(initializer.expression, 'useState', 'react')
        && ts.isBindingElement(valueElement)
        && ts.isIdentifier(valueElement.name)
        && ts.isBindingElement(setterElement)
        && ts.isIdentifier(setterElement.name)
        && bindings.isBinding(value, valueElement.name)
      ) pair = { value: valueElement.name, setter: setterElement.name };
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return pair;
}

function settingsStateSetter(
  value: ts.Expression,
  source: ts.SourceFile,
  bindings: LexicalBindings,
): ts.Identifier | undefined {
  const root = rootIdentifier(value);
  if (root === undefined) return undefined;
  let setter: ts.Identifier | undefined;
  const visit = (node: ts.Node): void => {
    if (
      setter === undefined
      && ts.isVariableDeclaration(node)
      && ts.isObjectBindingPattern(node.name)
      && node.initializer !== undefined
    ) {
      const initializer = unwrap(node.initializer);
      if (
        ts.isCallExpression(initializer)
        && ts.isIdentifier(initializer.expression)
        && bindings.isExactDefaultImport(initializer.expression, '@/hooks/useSettings')
      ) {
        let settingsDeclaration: ts.Identifier | undefined;
        let setterDeclaration: ts.Identifier | undefined;
        for (const element of node.name.elements) {
          const key = element.propertyName === undefined ? element.name.getText(element.getSourceFile()) : propertyName(element.propertyName);
          if (key === 'settings' && ts.isIdentifier(element.name)) settingsDeclaration = element.name;
          if (key === 'setSettings' && ts.isIdentifier(element.name)) setterDeclaration = element.name;
        }
        if (
          settingsDeclaration !== undefined
          && setterDeclaration !== undefined
          && bindings.isBinding(root, settingsDeclaration)
        ) setter = setterDeclaration;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return setter;
}

function rootIdentifier(expression: ts.Expression): ts.Identifier | undefined {
  expression = unwrap(expression);
  while (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) expression = unwrap(expression.expression);
  return ts.isIdentifier(expression) ? expression : undefined;
}

function changesBoundState(
  expression: ts.Expression | undefined,
  setter: ts.Identifier,
  bindings: LexicalBindings,
): boolean {
  expression = expression === undefined ? undefined : unwrap(expression);
  if (expression === undefined || (!ts.isArrowFunction(expression) && !ts.isFunctionExpression(expression))) return false;
  const parameter = expression.parameters[0]?.name;
  if (parameter === undefined || !ts.isIdentifier(parameter)) return false;
  let matches = false;
  const visit = (node: ts.Node): void => {
    if (isStaticallyDead(node)) return;
    if (isLexicalFunction(node) || ts.isClassLike(node)) return;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && bindings.isBinding(node.expression, setter)) {
      const argument = node.arguments[0];
      const parts = argument === undefined ? undefined : accessParts(argument);
      const root = argument === undefined ? undefined : rootIdentifier(argument);
      if (parts?.slice(-2).join('.') === 'target.value' && root !== undefined && bindings.isBinding(root, parameter)) matches = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(expression.body);
  return matches;
}

function changesSettingsFromInput(
  expression: ts.Expression | undefined,
  setter: ts.Identifier,
  bindings: LexicalBindings,
): boolean {
  expression = expression === undefined ? undefined : unwrap(expression);
  if (expression === undefined || !ts.isIdentifier(expression)) return false;
  const handler = bindings.declarationInitializer(expression);
  const functionNode = handler === undefined ? undefined : unwrap(handler);
  if (functionNode === undefined || (!ts.isArrowFunction(functionNode) && !ts.isFunctionExpression(functionNode))) return false;
  const parameter = functionNode.parameters[0]?.name;
  if (parameter === undefined || !ts.isIdentifier(parameter)) return false;
  let nameBinding: ts.Identifier | undefined;
  let valueBinding: ts.Identifier | undefined;
  const findBindings = (node: ts.Node): void => {
    if (isStaticallyDead(node)) return;
    if (isLexicalFunction(node) || ts.isClassLike(node)) return;
    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer !== undefined) {
      const parts = accessParts(node.initializer);
      const root = rootIdentifier(node.initializer);
      if (parts?.slice(-1)[0] === 'target' && root !== undefined && bindings.isBinding(root, parameter)) {
        for (const element of node.name.elements) {
          const key = element.propertyName === undefined ? element.name.getText(element.getSourceFile()) : propertyName(element.propertyName);
          if (key === 'name' && ts.isIdentifier(element.name)) nameBinding = element.name;
          if (key === 'value' && ts.isIdentifier(element.name)) valueBinding = element.name;
        }
      }
    }
    ts.forEachChild(node, findBindings);
  };
  findBindings(functionNode.body);
  if (nameBinding === undefined || valueBinding === undefined) return false;
  let matches = false;
  const findUpdate = (node: ts.Node): void => {
    if (isStaticallyDead(node)) return;
    if (isLexicalFunction(node) || ts.isClassLike(node)) return;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && bindings.isBinding(node.expression, setter)) {
      const visitArgument = (child: ts.Node, root: ts.Node): void => {
        if (isStaticallyDead(child)) return;
        if (child !== root && (isLexicalFunction(child) || ts.isClassLike(child))) return;
        if (
          ts.isPropertyAssignment(child)
          && ts.isComputedPropertyName(child.name)
          && ts.isIdentifier(unwrap(child.name.expression))
          && bindings.isBinding(unwrap(child.name.expression) as ts.Identifier, nameBinding!)
          && ts.isIdentifier(unwrap(child.initializer))
          && bindings.isBinding(unwrap(child.initializer) as ts.Identifier, valueBinding!)
        ) matches = true;
        ts.forEachChild(child, descendant => visitArgument(descendant, root));
      };
      for (const argument of node.arguments) visitArgument(argument, argument);
    }
    ts.forEachChild(node, findUpdate);
  };
  findUpdate(functionNode.body);
  return matches;
}

function structurallyBoundInputClaims(sourcePath: string, sourceText: string): UiSourceClaim[] {
  const source = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true, sourcePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const bindings = new LexicalBindings(source);
  const labels = new Map<string, string>();
  const inputs: ts.JsxOpeningLikeElement[] = [];
  const visitControls = (node: ts.Node): void => {
    if (isStaticallyDead(node)) return;
    if (ts.isJsxElement(node) && jsxTagName(node.openingElement) === 'label') {
      const target = staticControlLabel(jsxAttributeNode(node.openingElement, 'htmlFor'));
      const label = primaryLabelText(node);
      if (target !== undefined && label !== undefined) labels.set(target, label);
    }
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && jsxTagName(node) === 'input') inputs.push(node);
    ts.forEachChild(node, visitControls);
  };
  visitControls(source);

  const claims: UiSourceClaim[] = [];
  for (const input of inputs) {
    const value = jsxAttributeExpression(jsxAttributeNode(input, 'value'));
    const settingKey = value === undefined ? undefined : settingsPropertyKey(value);
    if (settingKey !== undefined) {
      const setter = settingsStateSetter(value!, source, bindings);
      const id = jsxAttribute(input, 'id');
      const name = jsxAttribute(input, 'name');
      const type = jsxAttribute(input, 'type');
      if (name !== settingKey) throw new FactsError(`${settingKey} control: settings input name must match its bound key`);
      if (id !== settingKey) throw new FactsError(`${settingKey} control: settings input id must match its bound key`);
      if (type !== 'text' && type !== 'password') throw new FactsError(`${settingKey} control: settings input type must be text or password`);
      const change = jsxAttributeExpression(jsxAttributeNode(input, 'onChange'));
      if (setter === undefined || !changesSettingsFromInput(change, setter, bindings)) {
        throw new FactsError(`${settingKey} control: settings input onChange must update settings from the bound input`);
      }
      const label = labels.get(id);
      if (label === undefined) throw new FactsError(`${settingKey} control: settings input must have an associated static label`);
      const owner = factSymbol(input, sourcePath);
      claims.push({
        source_path: sourcePath,
        symbol: `${owner}::input::settings.${settingKey}::${label}`,
        path: `settings.${settingKey}`,
        kind: 'setting',
        ui_label: presence({ kind: 'string', value: label }),
        value_contract: {
          ui_type: settingValueType(settingKey),
          widget_kind: 'text',
          optional: true,
          nullable: false,
        },
      });
      continue;
    }
    const boundValue = value === undefined ? undefined : unwrap(value);
    if (boundValue === undefined || !ts.isIdentifier(boundValue)) continue;
    const state = stateBindingPair(boundValue, source, bindings);
    if (state === undefined) continue;
    const persistedKeys = new Set<string>();
    const visitPersistence = (node: ts.Node): void => {
      if (isStaticallyDead(node)) return;
      if (ts.isCallExpression(node)) {
        const expression = unwrap(node.expression);
        if (
          ts.isPropertyAccessExpression(expression)
          && ts.isIdentifier(expression.expression)
          && expression.expression.text === 'localStorage'
          && expression.name.text === 'setItem'
          && node.arguments[1] !== undefined
        ) {
          const persistedValue = unwrap(node.arguments[1]);
          const keys = node.arguments[0] === undefined ? [] : [...new Set(staticStringValues(node.arguments[0], bindings))];
          if (ts.isIdentifier(persistedValue) && bindings.isBinding(persistedValue, state.value) && keys.length === 1) persistedKeys.add(keys[0]);
        }
      }
      ts.forEachChild(node, visitPersistence);
    };
    visitPersistence(source);
    if (persistedKeys.size === 0) continue;
    if (persistedKeys.size !== 1) throw new FactsError('persisted input binding maps to multiple storage keys');
    const id = jsxAttribute(input, 'id');
    const name = jsxAttribute(input, 'name');
    const type = jsxAttribute(input, 'type');
    if (id === undefined || name !== id) throw new FactsError('persisted input name must match its id');
    if (type !== 'password' && type !== 'text') throw new FactsError('persisted input type must be text or password');
    if (!changesBoundState(jsxAttributeExpression(jsxAttributeNode(input, 'onChange')), state.setter, bindings)) {
      throw new FactsError('persisted input onChange must update its exact state binding');
    }
    const label = labels.get(id);
    if (label === undefined) throw new FactsError('persisted input must have an associated static label');
    const key = [...persistedKeys][0];
    const owner = factSymbol(input, sourcePath);
    claims.push({
      source_path: sourcePath,
      symbol: `${owner}::input::browser.localStorage.${key}::${label}`,
      path: `browser.localStorage.${key}`,
      kind: 'setting',
      ui_label: presence({ kind: 'string', value: label }),
      value_contract: {
        ui_type: 'string',
        widget_kind: 'text',
        optional: jsxAttributeNode(input, 'required') === undefined,
        nullable: false,
      },
    });
  }
  return claims;
}

export function collectDeclaredServerGlobalClaimsFromSource(
  sourcePath: string,
  source: string,
): UiSourceClaim[] {
  const claims = [
    ...structurallyDeclaredServerGlobalClaims(sourcePath, source),
    ...structurallyBoundInputClaims(sourcePath, source),
  ];
  return claims.sort((left, right) => compareCodePoint(
    `${left.source_path}\0${left.symbol}\0${left.path}\0${left.kind}`,
    `${right.source_path}\0${right.symbol}\0${right.path}\0${right.kind}`,
  ));
}

function declaredServerGlobalClaims(root: string): UiSourceClaim[] {
  return collectDeclaredTypeScriptSourcePaths(root)
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

function configBehaviorClaims(root: string, required: boolean): UiSourceClaim[] {
  if (!required) return [];
  const migrationSourcePath = 'ui/src/app/jobs/new/jobConfig.ts';
  const transitionSourcePath = 'ui/src/app/jobs/new/utils.ts';
  const animaPathSourcePath = 'ui/src/helpers/animaModelPaths.ts';
  const migrationClaims = collectMigrateJobConfigBehaviorClaimsFromSource(
    readFileSync(join(root, migrationSourcePath), 'utf8'),
    migrationSourcePath,
  );
  const transitionClaims = collectHandleModelArchChangeBehaviorClaimsFromSource(
    readFileSync(join(root, transitionSourcePath), 'utf8'),
    readFileSync(join(root, animaPathSourcePath), 'utf8'),
    transitionSourcePath,
    animaPathSourcePath,
  );
  if (migrationClaims.length !== 7 || transitionClaims.length !== 30) {
    fail(undefined, `production config behavior inventory requires 7 migration and 30 transition facts, received ${migrationClaims.length} and ${transitionClaims.length}`);
  }
  return [...migrationClaims, ...transitionClaims];
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
  const requiredProductionFacts = model_architectures.length === 51;
  const config_claims = [
    ...defaultClaims(defaults),
    ...docClaims(root, repo),
    ...setterClaims(root),
    ...visibleSettingClaims(root, model_architectures, repo),
    ...configBehaviorClaims(root, requiredProductionFacts),
  ];
  config_claims.sort((left, right) => compareCodePoint(`${left.source_path}\0${left.symbol}\0${left.path}\0${left.kind}`, `${right.source_path}\0${right.symbol}\0${right.path}\0${right.kind}`));
  const facts: TrainingBookUiFacts = {
    schema_version: 1,
    model_architectures,
    defaults,
    config_claims,
    global_settings: globalSettingClaims(root, requiredProductionFacts),
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

function validateBehaviorPayload(value: unknown, label: string): void {
  requireKeys(value, ['kind'], label, ['value', 'source_path', 'fallback', 'item_key', 'field', 'phase', 'value_index']);
  if (value.kind === 'literal') {
    requireKeys(value, ['kind', 'value'], label);
    validateValue(value.value, `${label}.value`);
  } else if (value.kind === 'undefined') {
    requireKeys(value, ['kind'], label);
  } else if (value.kind === 'copy') {
    requireKeys(value, ['kind', 'source_path'], label, ['fallback']);
    if (typeof value.source_path !== 'string' || normalizeTrainingBookPath(value.source_path) !== value.source_path) throw new FactsError(`${label} copy source_path must be canonical`);
    if (Object.prototype.hasOwnProperty.call(value, 'fallback')) validateValue(value.fallback, `${label}.fallback`);
  } else if (value.kind === 'map-prompt-objects') {
    requireKeys(value, ['kind', 'source_path', 'item_key'], label);
    if (typeof value.source_path !== 'string' || normalizeTrainingBookPath(value.source_path) !== value.source_path) throw new FactsError(`${label} map-prompt-objects source_path must be canonical`);
    if (value.item_key !== 'prompt') throw new FactsError(`${label}.item_key must equal prompt`);
  } else if (value.kind === 'architecture-name') {
    requireKeys(value, ['kind'], label);
  } else if (value.kind === 'architecture-field') {
    requireKeys(value, ['kind', 'field'], label);
    if (value.field !== 'controls') throw new FactsError(`${label}.field must equal controls`);
  } else if (value.kind === 'architecture-default') {
    requireKeys(value, ['kind', 'phase', 'value_index'], label);
    if (!['revert', 'apply'].includes(String(value.phase))) throw new FactsError(`${label}.phase is unsupported`);
    if ((value.phase === 'revert' && value.value_index !== 1) || (value.phase === 'apply' && value.value_index !== 0)) throw new FactsError(`${label} architecture-default phase/value_index mismatch`);
  } else throw new FactsError(`${label}.kind is unsupported`);
}

function validateBehaviorContract(value: unknown, label: string): void {
  requireKeys(value, ['guard', 'operation', 'sources', 'payload'], label);
  const guards: UiBehaviorGuard[] = [
    'prompts-nonempty-array', 'after-prompts-write', 'type-is-ui-trainer',
    'property-present', 'property-absent', 'platform-mac', 'cleaned-model-changed',
    'section-unsupported', 'section-supported-property-absent',
    'architecture-change', 'multi-control', 'single-control', 'no-control',
    'source-nonempty-target-empty', 'source-nonempty',
    'frame-count-unsupported', 'auto-frame-count-unsupported',
    'sample-control-unsupported', 'revert-current-defaults', 'apply-next-defaults',
  ];
  if (!guards.includes(value.guard as UiBehaviorGuard)) throw new FactsError(`${label}.guard is unsupported`);
  if (!['write', 'delete'].includes(String(value.operation))) throw new FactsError(`${label}.operation is unsupported`);
  validateStringArray(value.sources, `${label}.sources`);
  let previous: string | undefined;
  for (const source of value.sources as string[]) {
    if (normalizeTrainingBookPath(source) !== source) throw new FactsError(`${label}.sources must be canonical`);
    if (previous !== undefined && compareCodePoint(previous, source) >= 0) throw new FactsError(`${label}.sources must be unique and code-point sorted`);
    previous = source;
  }
  validateBehaviorPayload(value.payload, `${label}.payload`);
  const payload = value.payload as Record<string, unknown>;
  if (value.operation === 'delete' && payload.kind !== 'undefined') throw new FactsError(`${label} delete requires undefined payload`);
  if (value.operation === 'write' && payload.kind === 'undefined') throw new FactsError(`${label} write forbids undefined payload`);
  if (payload.kind === 'architecture-name' && (value.operation !== 'write' || (value.sources as string[]).length !== 0)) throw new FactsError(`${label} architecture-name requires a source-free write`);
  if ((payload.kind === 'copy' || payload.kind === 'map-prompt-objects') && !(value.sources as string[]).includes(String(payload.source_path))) throw new FactsError(`${label} payload source_path must be listed in sources`);
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
      requireKeys(item, ['source_path', 'symbol', 'path', 'kind', 'ui_label', 'value_contract'], label, ['behavior_contract']);
      if (typeof item.source_path !== 'string' || typeof item.symbol !== 'string' || typeof item.path !== 'string' || !['setter', 'default', 'doc', 'setting', 'server-state'].includes(String(item.kind))) throw new FactsError(`${label} identity is invalid`);
      if (normalizeTrainingBookPath(item.path) !== item.path) throw new FactsError(`${label}.path is not canonical`);
      const identity = `${item.source_path}\0${item.symbol}\0${item.path}\0${item.kind}`;
      if (claimIdentities.has(identity)) throw new FactsError(`duplicate UI source claim ${identity}`);
      claimIdentities.add(identity);
      validatePresence(item.ui_label, `${label}.ui_label`);
      validateValueContract(item.value_contract, `${label}.value_contract`);
      if (item.behavior_contract !== undefined) validateBehaviorContract(item.behavior_contract, `${label}.behavior_contract`);
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
