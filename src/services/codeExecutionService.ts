import { SecureError } from '@/lib/errors/SecureError';

export interface ExecutionResult {
  output: string;
  error?: string;
  executionTime: number;
  language: string;
  status?: {
    id: number;
    description: string;
  };
}

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  output?: ExecutionResult;
}

export type SupportedLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'c'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'kotlin'
  | 'swift'
  | 'bash'
  | 'sql';

class CodeExecutionService {
  private readonly API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
  private getToken: (() => Promise<string | null>) | null = null;

  setTokenProvider(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.getToken) {
      throw new SecureError(
        'Code execution service not properly configured',
        'Authentication setup error. Please try logging in again.',
        'AUTH_001',
        'high'
      );
    }

    const token = await this.getToken();
    if (!token) {
      throw new SecureError(
        'No authentication token available from provider',
        'Please log in to execute code.',
        'AUTH_002',
        'high'
      );
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }
  private readonly JUDGE0_STATUS_CODES: Record<number, string> = {
    1: "In Queue",
    2: "Processing",
    3: "Accepted",
    4: "Wrong Answer",
    5: "Time Limit Exceeded",
    6: "Compilation Error",
    7: "Runtime Error (SIGSEGV)",
    8: "Runtime Error (SIGXFSZ)",
    9: "Runtime Error (SIGFPE)",
    10: "Runtime Error (SIGABRT)",
    11: "Runtime Error (NZEC)",
    12: "Runtime Error (Other)",
    13: "Internal Error",
    14: "Exec Format Error"
  };

  private readonly JUDGE0_LANGUAGE_IDS: Record<SupportedLanguage, number> = {
    javascript: 63,
    typescript: 74,
    python: 71,
    java: 62,
    cpp: 54,
    c: 50,
    csharp: 51,
    go: 60,
    rust: 73,
    php: 68,
    ruby: 72,
    kotlin: 78,
    swift: 83,
    bash: 46,
    sql: 82,
  };


  async executeCode(
    code: string,
    language: SupportedLanguage,
    onStatusUpdate?: (status: { id: number; description: string }) => void
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      return await this.executeRemote(code, language, startTime, onStatusUpdate);
    } catch (error) {
      return {
        output: '',
        error: error instanceof Error ? error.message : 'Unknown execution error',
        executionTime: Date.now() - startTime,
        language
      };
    }
  }

  private async executeRemote(
    code: string,
    language: SupportedLanguage,
    startTime: number,
    onStatusUpdate?: (status: { id: number; description: string }) => void
  ): Promise<ExecutionResult> {
    try {
      const languageId = this.JUDGE0_LANGUAGE_IDS[language];
      if (!languageId) {
        return {
          output: '',
          error: `Language ${language} not supported for remote execution.`,
          executionTime: Date.now() - startTime,
          language
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.API_BASE_URL}/code/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          language_id: languageId,
          source_code: code,
          stdin: '',
          cpu_time_limit: 5,
          memory_limit: 128000,
          wall_time_limit: 10,
        })
      });

      if (!response.ok) {
        throw new SecureError(
          `Backend API error: ${response.status} ${response.statusText}`,
          'Code execution service is temporarily unavailable. Please try again later.',
          'NETWORK_001',
          'medium'
        );
      }

      const submissionResult = await response.json();
      const submissionToken = submissionResult.token;

      if (!submissionToken) {
        throw new Error('No submission token returned from Judge0');
      }

      return await this.pollForResult(submissionToken, startTime, language, onStatusUpdate);

    } catch (error) {
      return {
        output: '',
        error: `Remote execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime,
        language
      };
    }
  }

  private async pollForResult(
    token: string,
    startTime: number,
    language: SupportedLanguage,
    onStatusUpdate?: (status: { id: number; description: string }) => void
  ): Promise<ExecutionResult> {
    const maxPolls = 30;
    let pollCount = 0;

    while (pollCount < maxPolls) {
      try {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${this.API_BASE_URL}/code/status/${token}`, {
          headers
        });

        if (!response.ok) {
          throw new SecureError(
            `Backend polling error: ${response.status} ${response.statusText}`,
            'Unable to get code execution results. Please try again.',
            'NETWORK_002',
            'medium'
          );
        }

        const result = await response.json();
        const statusId = result.status?.id;
        const statusDescription = statusId ? this.JUDGE0_STATUS_CODES[statusId] || result.status?.description || 'Unknown status' : 'Unknown status';

        if (onStatusUpdate && statusId) {
          onStatusUpdate({ id: statusId, description: statusDescription });
        }

        if (statusId && statusId !== 1 && statusId !== 2) {
          if (statusId === 3) {
            return {
              output: result.stdout || '',
              error: undefined,
              executionTime: parseFloat(result.time) * 1000 || (Date.now() - startTime),
              language,
              status: {
                id: statusId,
                description: statusDescription
              }
            };
          } else {
            let errorMessage = statusDescription;

            if (result.stderr) {
              const stderrContent = result.stderr.trim();
              if (stderrContent) {
                errorMessage += `\n\nDetails:\n${stderrContent}`;
              }
            } else if (result.compile_output) {
              const compileOutput = result.compile_output.trim();
              if (compileOutput) {
                errorMessage += `\n\nCompilation details:\n${compileOutput}`;
              }
            }

            return {
              output: result.stdout || '',
              error: errorMessage,
              executionTime: parseFloat(result.time) * 1000 || (Date.now() - startTime),
              language,
              status: {
                id: statusId,
                description: statusDescription
              }
            };
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        pollCount++;

      } catch (error) {
        // Re-throw SecureErrors as-is, wrap other errors
        if (error instanceof SecureError) {
          throw error;
        }
        throw new SecureError(
          `Polling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'Failed to get code execution results. Please try again.',
          'NETWORK_003',
          'medium'
        );
      }
    }

    return {
      output: '',
      error: 'Execution timeout - Judge0 took too long to process',
      executionTime: Date.now() - startTime,
      language,
      status: {
        id: 5,
        description: 'Time Limit Exceeded'
      }
    };
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return Object.keys(this.JUDGE0_LANGUAGE_IDS) as SupportedLanguage[];
  }
  isLanguageSupported(language: string): language is SupportedLanguage {
    return this.getSupportedLanguages().includes(language as SupportedLanguage);
  }
}

export const codeExecutionService = new CodeExecutionService();