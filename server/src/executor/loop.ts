import { createGroqClient, ExecutorConfig } from './groq';
import { createTools } from './tools';
import { createGuardrails } from './security';

export function buildSystemMessage(workingDir: string) {
  return {
    role: 'system' as const,
    content: `You are an AI assistant that helps with software engineering tasks.
You have access to tools for reading/writing files, running commands, and searching code.
Think step by step. Use the appropriate tools to accomplish the user's task.
Always respond with the result or next step after using tools.
Working directory: ${workingDir}`,
  };
}

export async function runLoop(
  prompt: string,
  config: ExecutorConfig,
  existingMessages: any[] | null
): Promise<any[]> {
  const guardrails = createGuardrails(config.working_dir);
  const tools = createTools(guardrails, config.command_timeout);
  const groq = createGroqClient(config);

  const toolMap: Record<string, Function> = {};
  const toolDefs = [
    'read_file', 'write_file', 'edit_file', 'run_command',
    'search_files', 'search_content', 'list_dir', 'create_dir',
    'delete_file', 'get_file_info',
  ];
  for (const name of toolDefs) {
    toolMap[name] = (tools as any)[name];
  }

  const messages = existingMessages || [buildSystemMessage(config.working_dir)];
  messages.push({ role: 'user', content: prompt });

  for (let i = 0; i < config.max_iterations; i++) {
    const msg = await groq.send(messages);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      if (msg.content) {
        console.log(`[Executor] ${msg.content}`);
      }
      messages.push(msg);
      break;
    }

    messages.push(msg);

    for (const call of msg.tool_calls) {
      const name = call.function.name;
      let args: any;
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        args = {};
      }

      console.log(`[Executor] 🔧 ${name} ${JSON.stringify(args)}`);

      const fn = toolMap[name];
      if (!fn) {
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: `Error: Unknown tool "${name}"`,
        });
        continue;
      }

      try {
        const result = await fn(args);
        const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: resultStr,
        });
      } catch (e: any) {
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: `Error: ${e.message}`,
        });
      }
    }
  }

  return messages;
}
