import OpenAI from 'openai';

export interface ExecutorConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  max_iterations: number;
  command_timeout: number;
  task_timeout: number;
  blacklist: string[];
  working_dir: string;
}

export function createGroqClient(config: { model: string; temperature: number; apiKey: string; baseUrl: string }) {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });

  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'read_file',
        description: 'Read file contents',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to file' },
            offset: { type: 'number', description: 'Line number to start from' },
            limit: { type: 'number', description: 'Number of lines to read' },
          },
          required: ['path'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'write_file',
        description: 'Create or overwrite a file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to file' },
            content: { type: 'string', description: 'File content' },
          },
          required: ['path', 'content'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'edit_file',
        description: 'Find and replace string in file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to file' },
            old_string: { type: 'string', description: 'Text to replace' },
            new_string: { type: 'string', description: 'Replacement text' },
          },
          required: ['path', 'old_string', 'new_string'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'run_command',
        description: 'Execute a shell command',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Shell command to execute' },
            workdir: { type: 'string', description: 'Working directory' },
            timeout: { type: 'number', description: 'Timeout in milliseconds' },
          },
          required: ['command'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'search_files',
        description: 'Search files by glob pattern',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Glob pattern (e.g. **/*.js)' },
            path: { type: 'string', description: 'Directory to search in' },
          },
          required: ['pattern'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'search_content',
        description: 'Search file contents by regex',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Regex pattern' },
            include: { type: 'string', description: 'File pattern filter (e.g. *.js)' },
            path: { type: 'string', description: 'Directory to search in' },
          },
          required: ['pattern'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'list_dir',
        description: 'List directory contents',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path' },
          },
          required: ['path'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'create_dir',
        description: 'Create a directory',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path' },
          },
          required: ['path'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'delete_file',
        description: 'Delete a file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
          },
          required: ['path'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'get_file_info',
        description: 'Get file information (size, modified date)',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
          },
          required: ['path'],
        },
      },
    },
  ];

  async function send(messages: any[]) {
    const response = await client.chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      messages,
      tools,
      tool_choice: 'auto' as const,
    });

    return response.choices[0].message;
  }

  return { send };
}
