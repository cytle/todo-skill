import { TaskSchema, type Task } from './model.js';

const START = '<!-- todo-skill:start -->';
const END = '<!-- todo-skill:end -->';
export type TodoDocument = { before: string; after: string; tasks: Task[] };

export function emptyDocument(): TodoDocument {
  return { before: '# TODO\n\n', after: '\n', tasks: [] };
}

export function parseMarkdown(text: string): TodoDocument {
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if (start < 0 || end < start || text.indexOf(START, start + START.length) !== -1
      || text.indexOf(END, end + END.length) !== -1) {
    throw new Error('Not a todo-skill file: expected one start/end marker pair. Use a new file or follow references/format.md; existing content was not changed.');
  }
  const tasks: Task[] = [];
  let raw: Record<string, unknown> | undefined;
  const finish = () => {
    if (raw) tasks.push(TaskSchema.parse(raw));
    raw = undefined;
  };
  for (const line of text.slice(start + START.length, end).split(/\r?\n/)) {
    if (!line.trim()) continue;
    const item = /^- \[([ xX])\] (.+)$/.exec(line);
    if (item) {
      finish();
      raw = { title: item[2], done: item[1] !== ' ' };
      continue;
    }
    const property = /^  - ([a-z]+): (.+)$/.exec(line);
    const key = property?.[1];
    const value = property?.[2];
    if (!raw || !key || value === undefined) throw new Error(`Unrecognized task line: ${line}. File was not changed.`);
    if (Object.hasOwn(raw, key)) throw new Error(`Duplicate field: ${key}`);
    raw[key] = key === 'tags' || key === 'archived' ? JSON.parse(value) : value;
  }
  finish();
  if (new Set(tasks.map((task) => task.id)).size !== tasks.length) throw new Error('Duplicate task IDs. File was not changed.');
  if (tasks.some((task) => task.archived && !task.done)) throw new Error('An archived task must be completed.');
  return { before: text.slice(0, start), after: text.slice(end + END.length), tasks };
}

export function renderMarkdown(document: TodoDocument): string {
  const body = document.tasks.map((item) => {
    const task = TaskSchema.parse(item);
    const lines = [`- [${task.done ? 'x' : ' '}] ${task.title}`, `  - id: ${task.id}`];
    if (task.due !== undefined) lines.push(`  - due: ${task.due}`);
    if (task.priority !== undefined) lines.push(`  - priority: ${task.priority}`);
    if (task.tags !== undefined) lines.push(`  - tags: ${JSON.stringify(task.tags)}`);
    if (task.archived !== undefined) lines.push(`  - archived: ${task.archived}`);
    return lines.join('\n');
  }).join('\n\n');
  return `${document.before}${START}\n${body ? `${body}\n` : ''}${END}${document.after}`;
}
