import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, realpath, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import lockfile from 'proper-lockfile';
import { z } from 'zod';
import { emptyDocument, parseMarkdown, renderMarkdown } from './markdown.js';
import type { Task } from './model.js';

const ConfigSchema = z.strictObject({ file: z.string().refine(isAbsolute, 'Config path must be absolute') });
const configFile = () => join(homedir(), '.config', 'todo-skill', 'config.json');

export async function readOptional(file: string): Promise<string | undefined> {
  try { return await readFile(file, 'utf8'); }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }
}

function absolutePath(file: string): string {
  if (!file.trim()) throw new Error('File path must not be empty.');
  return resolve(file.startsWith('~/') ? join(homedir(), file.slice(2)) : file);
}

export async function resolveFile(override?: string): Promise<string> {
  if (override !== undefined) return absolutePath(override);
  if (process.env.TODO_FILE !== undefined) return absolutePath(process.env.TODO_FILE);
  const config = await readOptional(configFile());
  if (config !== undefined) {
    const data: unknown = JSON.parse(config);
    return ConfigSchema.parse(data).file;
  }
  return join(homedir(), '.local', 'share', 'todo-skill', 'TODO.md');
}

async function atomicWrite(file: string, content: string): Promise<void> {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    const handle = await open(temporary, 'wx', 0o600);
    try { await handle.writeFile(content, 'utf8'); await handle.sync(); }
    finally { await handle.close(); }
    await rename(temporary, file);
  } finally { await rm(temporary, { force: true }); }
}

export async function configureFile(file: string) {
  const target = absolutePath(file);
  await mkdir(dirname(configFile()), { recursive: true, mode: 0o700 });
  await atomicWrite(configFile(), `${JSON.stringify({ file: target }, null, 2)}\n`);
  return { file: target, config: configFile() };
}

export async function readTasks(file: string): Promise<Task[]> {
  const source = await readOptional(file);
  return source === undefined ? [] : parseMarkdown(source).tasks;
}

export async function changeTasks<T>(file: string, change: (tasks: Task[]) => T): Promise<T> {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  let canonical: string;
  try { canonical = await realpath(file); }
  catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    canonical = join(await realpath(dirname(file)), basename(file));
  }
  const release = await lockfile.lock(canonical, {
    realpath: false,
    retries: { retries: 20, minTimeout: 50, maxTimeout: 200 },
  });
  try {
    const original = await readOptional(canonical);
    const document = original === undefined ? emptyDocument() : parseMarkdown(original);
    const result = change(document.tasks);
    const next = renderMarkdown(document);
    if (next !== original) {
      if (await readOptional(canonical) !== original) throw new Error('File changed outside the CLI. Retry after checking it.');
      if (original !== undefined) await atomicWrite(`${canonical}.bak`, original);
      await atomicWrite(canonical, next);
    }
    return result;
  } finally { await release(); }
}
