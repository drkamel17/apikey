import { ChatMessage } from '../types'
import { workspace } from './workspace'

export const MAX_FILE_CHARS = 20000

export type AgentStepType = 'tool' | 'result' | 'message' | 'error'

export interface AgentStep {
  type: AgentStepType
  tool?: string
  args?: Record<string, any>
  content?: string
}

export interface AgentOptions {
  onStep?: (step: AgentStep) => void
  maxSteps?: number
}

export interface AgentAction {
  tool: string
  args: Record<string, any>
}

const SYSTEM_PROMPT = `You are a coding agent that works inside a single folder on the user's computer.
You can inspect and modify files in that folder using tools.

Respond with EXACTLY ONE fenced JSON block and nothing else. Do not add prose outside the block.

Available tools:
- list_files: { "path": string, "recursive": boolean }  // path "" = root
- read_file: { "path": string }                          // returns text content
- write_file: { "path": string, "content": string }      // creates or overwrites a file, creates parent folders
- create_folder: { "path": string }
- finish: { "message": string }                          // when the task is done

Rules:
- Always read a file before editing it.
- Use relative paths from the workspace root (e.g. "src/App.tsx").
- One action per reply. After each action you will receive an OBSERVATION with the result.
- When the task is complete, call finish with a short summary.

Example reply:
\`\`\`json
{ "tool": "read_file", "args": { "path": "package.json" } }
\`\`\``

const extractJson = (text: string): any | null => {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fence ? fence[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return null
  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    return null
  }
}

export const parseAction = (text: string): AgentAction | null => {
  const parsed = extractJson(text)
  if (!parsed || typeof parsed.tool !== 'string') return null
  return { tool: parsed.tool, args: parsed.args && typeof parsed.args === 'object' ? parsed.args : {} }
}

const truncate = (text: string) =>
  text.length > MAX_FILE_CHARS ? `${text.slice(0, MAX_FILE_CHARS)}\n…[truncated]` : text

export const executeTool = async (tool: string, args: Record<string, any>): Promise<string> => {
  switch (tool) {
    case 'list_files': {
      const files = await workspace.list(args.path || '', Boolean(args.recursive))
      return files.length ? files.join('\n') : '(empty folder)'
    }
    case 'read_file': {
      if (!args.path) return 'ERROR: "path" is required'
      return truncate(await workspace.read(args.path))
    }
    case 'write_file': {
      if (!args.path) return 'ERROR: "path" is required'
      await workspace.write(args.path, String(args.content ?? ''))
      return `Wrote ${String(args.content ?? '').length} characters to ${args.path}`
    }
    case 'create_folder': {
      if (!args.path) return 'ERROR: "path" is required'
      await workspace.mkdir(args.path)
      return `Created folder ${args.path}`
    }
    default:
      return `ERROR: unknown tool "${tool}"`
  }
}

export const runAgent = async (
  callModel: (messages: ChatMessage[]) => Promise<string>,
  task: string,
  options: AgentOptions = {}
): Promise<string> => {
  const maxSteps = options.maxSteps ?? 12
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `TASK: ${task}` },
  ]

  for (let step = 0; step < maxSteps; step++) {
    const raw = await callModel(messages)

    const action = parseAction(raw)
    if (!action) {
      options.onStep?.({ type: 'message', content: raw })
      return raw
    }

    if (action.tool === 'finish') {
      const message = String(action.args.message || 'Done.')
      options.onStep?.({ type: 'message', content: message })
      return message
    }

    options.onStep?.({ type: 'tool', tool: action.tool, args: action.args })

    let observation = ''
    try {
      observation = await executeTool(action.tool, action.args)
    } catch (err: any) {
      observation = `ERROR: ${err?.message || String(err)}`
      options.onStep?.({ type: 'error', content: observation })
    }
    options.onStep?.({ type: 'result', tool: action.tool, content: observation })

    messages.push({ role: 'assistant', content: raw })
    messages.push({ role: 'user', content: `OBSERVATION (${action.tool}):\n${observation}` })
  }

  const message = 'Agent stopped: maximum steps reached.'
  options.onStep?.({ type: 'message', content: message })
  return message
}
