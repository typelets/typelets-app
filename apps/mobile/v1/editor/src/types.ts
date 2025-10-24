export interface EditorState {
  content: string;
  selection: {
    start: number;
    end: number;
  };
  history: {
    past: string[];
    future: string[];
  };
}

export interface EditorConfig {
  placeholder?: string;
  autoFocus?: boolean;
  maxLength?: number;
  multiline?: boolean;
  syntax?: 'markdown' | 'code' | 'plain';
  theme?: 'light' | 'dark';
}

export interface FormatAction {
  type: 'bold' | 'italic' | 'code' | 'heading' | 'list' | 'link';
  payload?: unknown;
}
