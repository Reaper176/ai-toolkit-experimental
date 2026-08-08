'use client';
import { useEffect, useState, useRef } from 'react';
import YAML from 'yaml';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from '@/components/ThemeProvider';

type Props<T> = {
  config: T;
  setConfig: (value: any, key?: string) => void;
  transformOnParse?: (parsed: any) => any;
};

export interface SerializedConfigRef {
  current: string;
}

export interface AdvancedEditorLike {
  getValue(): string;
  getModel(): { setValue(value: string): void } | null;
  getPosition(): any;
  getSelection(): any;
  getScrollTop(): number;
  setPosition(position: any): void;
  setSelection(selection: any): void;
  setScrollTop(scrollTop: number): void;
}

const yamlConfig: YAML.DocumentOptions &
  YAML.SchemaOptions &
  YAML.ParseOptions &
  YAML.CreateNodeOptions &
  YAML.ToStringOptions = {
  indent: 2,
  lineWidth: 999999999999,
  defaultStringType: 'QUOTE_DOUBLE',
  defaultKeyType: 'PLAIN',
  directives: true,
};

function toYaml(obj: any): string {
  const doc = new YAML.Document(obj, yamlConfig);
  YAML.visit(doc, {
    Scalar(_key, node) {
      if (typeof node.value === 'string' && node.value.includes('\n')) {
        node.type = YAML.Scalar.BLOCK_LITERAL;
      }
    },
  });
  return doc.toString(yamlConfig);
}

export function applyAdvancedEditorChange(
  value: string,
  lastConfigUpdate: SerializedConfigRef,
  setConfig: (value: any) => void,
  transformOnParse?: (parsed: any) => any,
): boolean {
  let parsed = YAML.parse(value);
  if (JSON.stringify(parsed) === lastConfigUpdate.current) return false;
  if (transformOnParse) parsed = transformOnParse(parsed);
  lastConfigUpdate.current = JSON.stringify(parsed);
  setConfig(parsed);
  return true;
}

export function syncAdvancedEditorConfig(
  config: unknown,
  editor: AdvancedEditorLike,
  lastConfigUpdate: SerializedConfigRef,
): void {
  const currentUpdate = JSON.stringify(config);
  if (lastConfigUpdate.current === currentUpdate) return;

  const position = editor.getPosition();
  const selection = editor.getSelection();
  const scrollTop = editor.getScrollTop();
  const yamlContent = toYaml(config);

  // Monaco invokes onChange synchronously from setValue, so arm the guard first.
  lastConfigUpdate.current = currentUpdate;
  if (yamlContent === editor.getValue()) return;
  editor.getModel()?.setValue(yamlContent);
  if (position) editor.setPosition(position);
  if (selection) editor.setSelection(selection);
  editor.setScrollTop(scrollTop);
}

export default function AdvancedConfigEditor<T>({ config, setConfig, transformOnParse }: Props<T>) {
  const { theme } = useTheme();
  const [editorValue, setEditorValue] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const lastConfigUpdateStringRef = useRef('');
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);

  // Track if the editor has been mounted
  const isEditorMounted = useRef(false);

  // Handler for editor mounting
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    isEditorMounted.current = true;

    // Initial content setup
    try {
      const yamlContent = toYaml(config);
      setEditorValue(yamlContent);
      lastConfigUpdateStringRef.current = JSON.stringify(config);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    const currentUpdate = JSON.stringify(config);

    // Skip if no changes or editor not yet mounted
    if (lastConfigUpdateStringRef.current === currentUpdate || !isEditorMounted.current) {
      return;
    }

    try {
      // Preserve cursor position and selection
      const editor = editorRef.current;
      if (editor) {
        syncAdvancedEditorConfig(config, editor, lastConfigUpdateStringRef);
      }
    } catch (e) {
      console.warn(e);
    }
  }, [config]);

  const setMarkers = (errors: { message: string; line: number }[]) => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!monaco || !model) return;
    const markers = errors.map(err => ({
      severity: monaco.MarkerSeverity.Error,
      message: err.message,
      startLineNumber: err.line,
      startColumn: 1,
      endLineNumber: err.line,
      endColumn: model.getLineMaxColumn(err.line),
    }));
    monaco.editor.setModelMarkers(model, 'yaml', markers);
  };

  const handleChange = (value: string | undefined) => {
    if (value === undefined) return;

    try {
      setHasError(false);
      setMarkers([]);
      applyAdvancedEditorChange(value, lastConfigUpdateStringRef, setConfig, transformOnParse);
    } catch (e: any) {
      setHasError(true);
      const line = e?.linePos?.[0]?.line ?? e?.linePos?.line ?? 1;
      setMarkers([{ message: e?.message ?? 'Invalid YAML', line }]);
    }
  };

  return (
    <div className="relative h-full w-full">
      {hasError && (
        <div
          className="absolute inset-0 z-10 pointer-events-none rounded-sm"
          style={{ boxShadow: 'inset 0 0 12px 2px rgba(239, 68, 68, 0.5)' }}
        />
      )}
      <Editor
        height="100%"
        width="100%"
        defaultLanguage="yaml"
        value={editorValue}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        className="z-0"
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
