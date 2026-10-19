import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const singleLine = z.string().trim().min(1)
  .refine((text) => !/[\r\n]/.test(text), 'Use a single line')
  .refine((text) => !text.includes('<!-- todo-skill:'), 'Reserved document marker');
export const PrioritySchema = z.enum(['low', 'medium', 'high']);
export const TaskSchema = z.strictObject({
  id: z.string().regex(/^t_[a-f0-9]{12}$/),
  title: singleLine,
  done: z.boolean(),
  due: z.iso.date().optional(),
  priority: PrioritySchema.optional(),
  tags: z.array(singleLine).refine((tags) => new Set(tags).size === tags.length, 'Tags must be unique').optional(),
  archived: z.boolean().optional(),
});
export const AddSchema = TaskSchema.omit({ id: true, done: true, archived: true });
export const PatchSchema = TaskSchema.omit({ id: true }).partial();
export type Task = z.output<typeof TaskSchema>;
export type AddTask = z.input<typeof AddSchema>;
export type TaskPatch = z.input<typeof PatchSchema>;

export function addTask(tasks: Task[], input: AddTask): Task {
  let id: string;
  do { id = `t_${randomUUID().replaceAll('-', '').slice(0, 12)}`; }
  while (tasks.some((task) => task.id === id));
  const task = TaskSchema.parse({ ...AddSchema.parse(input), id, done: false });
  tasks.push(task);
  return task;
}

export function updateTask(tasks: Task[], id: string, patch: TaskPatch, clear: string[] = []): Task {
  const index = tasks.findIndex((task) => task.id === id);
  const current = tasks[index];
  if (!current) throw new Error(`Unknown task ID: ${id}. Run list --all first.`);
  const changes = PatchSchema.parse(patch);
  const next = TaskSchema.parse({ ...current, ...changes });
  for (const key of clear) {
    if (key !== 'due' && key !== 'priority' && key !== 'tags') throw new Error(`Cannot clear: ${key}`);
    delete next[key];
  }
  if (next.archived && !next.done) throw new Error('Only completed tasks can be archived.');
  tasks[index] = next;
  return next;
}

export function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const FilterSchema = z.strictObject({
  all: z.boolean().optional(),
  status: z.enum(['open', 'done', 'all']).optional(),
  tag: z.string().optional(),
  priority: PrioritySchema.optional(),
  query: z.string().optional(),
  dueBefore: z.iso.date().optional(),
  overdue: z.boolean().optional(),
  today: z.iso.date().optional(),
});

export function listTasks(tasks: Task[], input: z.input<typeof FilterSchema>) {
  const filter = FilterSchema.parse(input);
  const today = filter.today ?? localToday();
  const status = filter.status ?? (filter.all ? 'all' : 'open');
  const weight = { high: 0, medium: 1, low: 2 };
  return tasks.filter((task) => {
    if (task.archived && !filter.all) return false;
    if (status !== 'all' && task.done !== (status === 'done')) return false;
    if (filter.tag && !task.tags?.includes(filter.tag)) return false;
    if (filter.priority && (task.priority ?? 'medium') !== filter.priority) return false;
    if (filter.query && !task.title.toLocaleLowerCase().includes(filter.query.toLocaleLowerCase())) return false;
    if (filter.dueBefore && (!task.due || task.due > filter.dueBefore)) return false;
    if (filter.overdue && (task.done || !task.due || task.due >= today)) return false;
    return true;
  }).sort((a, b) => Number(a.done) - Number(b.done)
    || weight[a.priority ?? 'medium'] - weight[b.priority ?? 'medium']
    || (a.due ?? '9999-12-31').localeCompare(b.due ?? '9999-12-31')
    || a.id.localeCompare(b.id))
    .map((task) => ({ ...task, overdue: !task.done && Boolean(task.due && task.due < today) }));
}
