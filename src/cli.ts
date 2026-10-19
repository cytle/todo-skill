import { Command, CommanderError, Option } from 'commander';
import { z } from 'zod';
import { AddSchema, addTask, FilterSchema, listTasks, localToday, updateTask } from './model.js';
import { changeTasks, configureFile, readTasks, resolveFile } from './store.js';

const program = new Command()
  .name('todo').description('Local Markdown todos for people and AI agents. Every result is JSON.')
  .version('0.1.0').option('--file <path>', 'Override the personal todo file for this invocation')
  .exitOverride().configureOutput({ writeErr: () => {} });
const output = (value: unknown): void => { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); };
const file = async () => {
  const options = z.object({ file: z.string().optional() }).parse(program.opts());
  return resolveFile(options.file);
};

program.command('path').description('Show the resolved file without creating anything')
  .action(async () => output({ file: await file() }));
program.command('config <path>').description('Persist an absolute personal file path; leaves task data untouched')
  .action(async (path: string) => output(await configureFile(path)));

program.command('add <title>').description('Add one task; only the title is required')
  .option('--due <date>', 'Due calendar date (YYYY-MM-DD)')
  .addOption(new Option('--priority <level>', 'Priority').choices(['low', 'medium', 'high']))
  .option('--tag <tag...>', 'Tags (each is one argument)')
  .action(async (title: string, raw: unknown) => {
    const options = z.object({ due: z.string().optional(), priority: z.string().optional(), tag: z.array(z.string()).optional() }).parse(raw);
    const input = AddSchema.parse({ title, due: options.due, priority: options.priority, tags: options.tag });
    const path = await file();
    output({ file: path, task: await changeTasks(path, (tasks) => addTask(tasks, input)) });
  });

program.command('list').description('List open, unarchived tasks; --all includes completed and archived tasks')
  .option('--all', 'Include completed and archived tasks')
  .addOption(new Option('--status <status>', 'Filter status').choices(['open', 'done', 'all']))
  .option('--tag <tag>', 'Filter by an exact tag')
  .addOption(new Option('--priority <level>', 'Filter priority').choices(['low', 'medium', 'high']))
  .option('--query <text>', 'Case-insensitive title search')
  .option('--due-before <date>', 'Due on or before this date (inclusive)')
  .option('--overdue', 'Only overdue open tasks')
  .option('--today <date>', 'Calendar date used for overdue checks; defaults to the local date')
  .action(async (raw: unknown) => {
    const options = FilterSchema.parse(raw);
    const filters = { ...options, today: options.today ?? localToday() };
    const path = await file();
    output({ file: path, today: filters.today, tasks: listTasks(await readTasks(path), filters) });
  });

program.command('edit <id>').description('Edit by exact ID; omit fields to preserve them')
  .option('--title <title>', 'Replace title')
  .option('--due <date>', 'Replace due date')
  .addOption(new Option('--priority <level>', 'Replace priority').choices(['low', 'medium', 'high']))
  .option('--tag <tag...>', 'Replace tags')
  .addOption(new Option('--clear <field...>', 'Remove optional fields').choices(['due', 'priority', 'tags']))
  .action(async (id: string, raw: unknown) => {
    const options = z.object({
      title: z.string().optional(), due: z.string().optional(), priority: z.string().optional(),
      tag: z.array(z.string()).optional(), clear: z.array(z.string()).optional(),
    }).parse(raw);
    const patch = AddSchema.partial().parse(Object.fromEntries(Object.entries({
      title: options.title, due: options.due, priority: options.priority, tags: options.tag,
    }).filter(([, value]) => value !== undefined)));
    const clear = options.clear ?? [];
    if (Object.keys(patch).length === 0 && clear.length === 0) throw new Error('Supply an edit field or --clear.');
    if (clear.some((key) => Object.hasOwn(patch, key))) throw new Error('Cannot set and clear the same field.');
    const path = await file();
    output({ file: path, task: await changeTasks(path, (tasks) => updateTask(tasks, id, patch, clear)) });
  });

program.command('done <id>').description('Mark a task completed')
  .action(async (id: string) => {
    const path = await file();
    output({ file: path, task: await changeTasks(path, (tasks) => updateTask(tasks, id, { done: true })) });
  });
program.command('reopen <id>').description('Reopen a task, including an archived one')
  .action(async (id: string) => {
    const path = await file();
    output({ file: path, task: await changeTasks(path, (tasks) => updateTask(tasks, id, { done: false, archived: false })) });
  });
program.command('archive <id>').description('Hide a completed task from normal lists while retaining its history')
  .action(async (id: string) => {
    const path = await file();
    output({ file: path, task: await changeTasks(path, (tasks) => updateTask(tasks, id, { archived: true })) });
  });

try { await program.parseAsync(process.argv); }
catch (error) {
  if (!(error instanceof CommanderError && error.exitCode === 0)) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    process.stderr.write(`${JSON.stringify({ error: message })}\n`);
    process.exitCode = error instanceof CommanderError ? error.exitCode : 1;
  }
}
