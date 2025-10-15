import { NodeViewWrapper } from '@tiptap/react';
import { useState, useRef, useEffect } from 'react';
import { Play, Square, RotateCcw, ChevronDown, ChevronRight, Sun, Moon } from 'lucide-react';
import { codeExecutionService, type ExecutionResult, type SupportedLanguage } from '@/services/codeExecutionService';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import type { Editor as TiptapEditor } from '@tiptap/react';

// CSS styles for theme overrides
const monacoThemeStyles = `
  .monaco-light-override .monaco-editor,
  .monaco-light-override .monaco-editor .margin,
  .monaco-light-override .monaco-editor .monaco-editor-background {
    background-color: #ffffff !important;
    color: #000000 !important;
  }

  .monaco-light-override .monaco-editor .view-lines .view-line {
    color: #000000 !important;
  }

  .monaco-light-override .monaco-editor .line-numbers {
    color: #237893 !important;
  }

  .monaco-light-override .monaco-editor .current-line {
    background-color: #f0f0f0 !important;
  }

  .monaco-light-override .monaco-editor .selected-text {
    background-color: #316ac5 !important;
  }

  .monaco-dark-override .monaco-editor,
  .monaco-dark-override .monaco-editor .margin,
  .monaco-dark-override .monaco-editor .monaco-editor-background {
    background-color: #1e1e1e !important;
    color: #d4d4d4 !important;
  }

  .monaco-dark-override .monaco-editor .view-lines .view-line {
    color: #d4d4d4 !important;
  }

  .monaco-dark-override .monaco-editor .line-numbers {
    color: #858585 !important;
  }

  .monaco-dark-override .monaco-editor .current-line {
    background-color: #2a2a2a !important;
  }

  .monaco-dark-override .monaco-editor .selected-text {
    background-color: #316ac5 !important;
  }
`;

interface ExecutableCodeBlockNodeViewProps {
  node: {
    attrs: {
      language?: string;
      executable?: boolean;
      output?: ExecutionResult | null;
    };
    textContent: string;
    nodeSize: number;
  };
  updateAttributes: (attributes: Record<string, unknown>) => void;
  selected: boolean;
  getPos: () => number | undefined;
  editor: TiptapEditor;
}

export function ExecutableCodeBlockNodeView({ node, updateAttributes, selected: _selected, getPos, editor }: ExecutableCodeBlockNodeViewProps) {
  // Inject custom CSS styles for theme overrides
  useEffect(() => {
    const styleId = 'monaco-theme-override-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = monacoThemeStyles;
      document.head.appendChild(styleElement);
    }

    return () => {
      // Clean up when the last component unmounts
      // Note: This is a simple approach. In production, you might want to reference count
    };
  }, []);
  const [output, setOutput] = useState<ExecutionResult | null>(node.attrs.output || null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<{ id: number; description: string } | null>(null);
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(false);
  const [code, setCode] = useState(node.textContent);
  const [editorHeight, setEditorHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [monacoThemeOverride, setMonacoThemeOverride] = useState<'light' | 'dark'>('dark');
  const nodeRef = useRef<HTMLDivElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(300);
  const isUpdatingFromMonaco = useRef(false);

  const language = node.attrs.language || 'javascript';
  const isExecutable = codeExecutionService.isLanguageSupported(language as SupportedLanguage);



  // DISABLED: This effect was causing Monaco editor blinking
  // External sync will be handled differently if needed
  // useEffect(() => {
  //   const nodeText = node.textContent;
  //   if (nodeText !== code && !isUpdatingFromMonaco.current) {
  //     setCode(nodeText);
  //     if (monacoRef.current?.getValue() !== nodeText) {
  //       monacoRef.current?.setValue(nodeText);
  //     }
  //   }
  // }, [node.textContent, code]);


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault();
      const deltaY = e.clientY - resizeStartY.current;
      const newHeight = Math.max(150, Math.min(800, resizeStartHeight.current + deltaY));
      setEditorHeight(newHeight);

      // Trigger Monaco layout when height changes (throttled)
      if (monacoRef.current && !isUpdatingFromMonaco.current) {
        monacoRef.current.layout();
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      // Reset the Monaco update flag on cleanup
      isUpdatingFromMonaco.current = false;
    };
  }, [isResizing]);

  // Handle container and window resize with ResizeObserver
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    let resizeObserver: ResizeObserver | null = null;

    const triggerLayout = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Don't trigger layout if we're updating from Monaco to prevent blinking
        if (monacoRef.current && !isUpdatingFromMonaco.current) {
          monacoRef.current.layout();
        }
      }, 100); // Reduced debounce for better responsiveness
    };

    // Watch for container size changes (panels collapse/expand)
    if (nodeRef.current) {
      resizeObserver = new ResizeObserver(triggerLayout);
      resizeObserver.observe(nodeRef.current);
    }

    // Also handle window resize
    window.addEventListener('resize', triggerLayout);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', triggerLayout);
      clearTimeout(resizeTimeout);
    };
  }, []);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = editorHeight;
  };

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        updateNodeContent(value);
      }, 300);
    }
  };

  const updateNodeContent = (newCode: string) => {
    try {
      const pos = getPos();
      if (pos !== undefined && pos >= 0) {
        const transaction = editor.view.state.tr.replaceWith(
          pos + 1,
          pos + node.nodeSize - 1,
          editor.view.state.schema.text(newCode)
        );
        editor.view.dispatch(transaction);
      }
    } catch (error) {
      console.warn('Failed to update node content:', error);
    }
  };

  const executeCode = async () => {
    if (isExecuting || !code.trim()) return;

    setIsExecuting(true);
    setCurrentStatus({ id: 1, description: "In Queue" });
    setOutput(null); // Clear previous output
    setIsOutputCollapsed(false);

    try {
      const result = await codeExecutionService.executeCode(
        code,
        language as SupportedLanguage,
        (status) => {
          // Real-time status updates
          setCurrentStatus(status);
        }
      );
      setOutput(result);
      setCurrentStatus(null); // Clear status when complete
      // Persist the output in node attributes
      updateAttributes({ output: result });
    } catch (error) {
      const errorResult = {
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: 0,
        language: language as SupportedLanguage
      };
      setOutput(errorResult);
      setCurrentStatus(null);
      // Persist the error in node attributes
      updateAttributes({ output: errorResult });
    } finally {
      setIsExecuting(false);
    }
  };

  const clearOutput = () => {
    setOutput(null);
    // Remove output from node attributes
    updateAttributes({ output: null });
  };



  return (
    <NodeViewWrapper
      ref={nodeRef}
      className="executable-code-block-wrapper relative group"
      spellCheck={false}
      data-testid="executable-code-block"
      style={{ userSelect: 'none' }}
    >
      <div className="executable-code-block border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm mb-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600" spellCheck={false}>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={language}
                onChange={(e) => updateAttributes({ language: e.target.value })}
                className="text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded px-2 py-1 pr-7 appearance-none cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                spellCheck={false}
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
                <option value="csharp">C#</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="php">PHP</option>
                <option value="ruby">Ruby</option>
                <option value="kotlin">Kotlin</option>
                <option value="swift">Swift</option>
                <option value="bash">Bash</option>
                <option value="sql">SQL</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-500 dark:text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-1">
<button
              onClick={() => {
                setMonacoThemeOverride(monacoThemeOverride === 'light' ? 'dark' : 'light');
              }}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
              title={`Monaco theme: ${monacoThemeOverride} (click to toggle)`}
            >
              {monacoThemeOverride === 'light' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {output && (
              <button
                onClick={clearOutput}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
                title="Clear output"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {isExecutable && (
              <div className="flex items-center gap-2">
                {isExecuting && currentStatus && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium animate-pulse ${
                    currentStatus.id === 1
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : currentStatus.id === 2
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                  }`}>
                    {currentStatus.description}
                  </span>
                )}
                <button
                  onClick={executeCode}
                  disabled={isExecuting || !code.trim()}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title="Execute code"
                >
                  {isExecuting ? (
                    <Square className="w-3 h-3" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  {isExecuting ? 'Running...' : 'Run'}
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Code Content */}
        <div className={`relative w-full ${monacoThemeOverride === 'light' ? 'monaco-light-override' : 'monaco-dark-override'}`}>
          <Editor
            key={`monaco-${node.attrs.language}-${getPos()}`}
            height={`${editorHeight}px`}
            width="100%"
            language={language}
            defaultValue={code}
            onChange={handleCodeChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              lineNumbers: 'on',
              glyphMargin: true,
              folding: true,
              lineDecorationsWidth: 10,
              lineNumbersMinChars: 3,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontSize: 14,
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              wordWrap: 'on',
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
              contextmenu: true,
              renderLineHighlight: 'gutter',
              renderWhitespace: 'selection',
              cursorBlinking: 'smooth',
              bracketPairColorization: { enabled: true },
              guides: {
                indentation: true,
                bracketPairs: true,
              },
              stickyScroll: { enabled: false },
            }}
            onMount={(monacoEditor) => {
              monacoRef.current = monacoEditor;

              // Initial layout to ensure proper sizing
              setTimeout(() => {
                monacoEditor.layout();
              }, 0);

              // Add Ctrl+Enter shortcut to execute code
              monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                executeCode();
              });

              // Fix for collapse/expand with IntersectionObserver
              const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                  // Small delay to ensure DOM is ready
                  setTimeout(() => {
                    // Don't layout if updating from Monaco to prevent blinking
                    if (!isUpdatingFromMonaco.current) {
                      monacoEditor.layout();
                    }
                  }, 50);
                }
              });

              if (nodeRef.current) {
                observer.observe(nodeRef.current);
              }
            }}
          />
          {/* Resize Handle */}
          <div
            className={`w-full h-3 cursor-row-resize bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${isResizing ? 'bg-blue-200 dark:bg-blue-700' : ''}`}
            onMouseDown={handleResizeStart}
            title="Drag to resize editor"
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-6 h-0.5 bg-gray-400 dark:bg-gray-400 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Output Section */}
        {output && (
          <div className="border-t border-gray-200 dark:border-gray-600">
            <div
              className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700 cursor-pointer"
              onClick={() => setIsOutputCollapsed(!isOutputCollapsed)}
            >
              <div className="flex items-center gap-2">
                {isOutputCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Output
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({output.executionTime}ms)
                </span>
                {output.status && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    output.status.id === 3
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : output.status.id === 6
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                      : output.status.id === 5
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {output.status.description}
                  </span>
                )}
              </div>
            </div>

            {!isOutputCollapsed && (
              <div
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono p-4 select-text border-t border-gray-200 dark:border-gray-600"
                style={{
                  fontSize: '14px',
                  fontFamily: 'Menlo, Monaco, "Courier New", monospace'
                }}
              >
                {output.error ? (
                  <div className="text-red-600 dark:text-red-400 whitespace-pre-wrap select-text">
                    <span className="text-red-700 dark:text-red-500 font-semibold">ERROR:</span> {output.error}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap select-text">
                    {output.output ? (
                      <>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">›</span> <span className="text-gray-600 dark:text-gray-400">output:</span>
                        {'\n'}
                        <span className="text-green-600 dark:text-green-400">
                          {output.output}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 italic">(no output)</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
