import { execFile } from 'node:child_process';
import { access, copyFile, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseMarkdown } from '../src/markdown.js';
import { TaskSchema } from '../src/model.js';

const execute = promisify(execFile);
const cli = resolve('skills/todo/scripts/todo.mjs');
const ResultSchema = z.object({ file: z.string(), task: TaskSchema.optional(), tasks: z.array(TaskSchema.extend({ overdue: z.boolean() })).optional() });
let root: string;
let file: string;

async function run(args: string[], cwd = root) {
  const { TODO_FILE: _ignored, ...environment } = process.env;
  const result = await execute(process.execPath, [cli, ...args], {
    cwd, env: { ...environment, HOME: root, USERPROFILE: root },
  });
  const data: unknown = JSON.parse(result.stdout);
  return data;
}
async function command(args: string[]) { return ResultSchema.parse(await run(['--file', file, ...args])); }

beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'todo-skill-test-')); file = join(root, 'tasks', 'TODO.md'); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('bundled CLI', () => {
  it('runs as a standalone copied script without a local node_modules directory', async () => {
    const standalone = join(root, 'todo.mjs');
    await copyFile(cli, standalone);
    const result = await execute(process.execPath, [standalone, '--file', file, 'add', 'standalone']);
    const data: unknown = JSON.parse(result.stdout);
    expect(ResultSchema.parse(data).task).toMatchObject({ title: 'standalone' });
  });

  it('returns machine-readable argument errors and standard help', async () => {
    try {
      await execute(process.execPath, [cli, 'list', '--unknown']);
      throw new Error('Expected argument rejection');
    } catch (error: unknown) {
      if (!(error instanceof Error && 'stderr' in error && typeof error.stderr === 'string')) throw error;
      const data: unknown = JSON.parse(error.stderr);
      expect(z.object({ error: z.string() }).parse(data).error).toContain('--unknown');
    }
    const help = await execute(process.execPath, [cli, '--help']);
    expect(help.stdout).toContain('Usage:');
    expect(await readdir(root)).toEqual([]);
  });

  it('lists a nonexistent file without creating files or directories', async () => {
    expect((await command(['list'])).tasks).toEqual([]);
    expect(await readdir(root)).toEqual([]);
  });

  it('runs the full lifecycle and keeps a backup of the previous Markdown', async () => {
    const added = await command(['add', '买牛奶', '--priority', 'high', '--tag', '生活']);
    const task = TaskSchema.parse(added.task);
    const original = await readFile(file, 'utf8');
    await command(['edit', task.id, '--due', '2026-10-20']);
    expect(await readFile(`${file}.bak`, 'utf8')).toBe(original);
    await command(['done', task.id]);
    await command(['archive', task.id]);
    expect((await command(['list'])).tasks).toEqual([]);
    expect((await command(['list', '--all'])).tasks).toMatchObject([{ id: task.id, archived: true }]);
    await command(['reopen', task.id]);
    await command(['edit', task.id, '--clear', 'due', 'priority']);
    expect((await command(['list'])).tasks).toMatchObject([{ id: task.id, done: false, tags: ['生活'] }]);
    expect(parseMarkdown(await readFile(file, 'utf8')).tasks[0]).not.toHaveProperty('due');
    await expect(access(`${file}.lock`)).rejects.toThrow();
  });

  it('serializes concurrent writers without losing tasks', async () => {
    await Promise.all(Array.from({ length: 12 }, (_, index) => command(['add', `task ${index}`])));
    const tasks = parseMarkdown(await readFile(file, 'utf8')).tasks;
    expect(tasks).toHaveLength(12);
    expect(new Set(tasks.map((task) => task.id)).size).toBe(12);
    expect(new Set(tasks.map((task) => task.title)).size).toBe(12);
  }, 15000);

  it('rejects invalid input and leaves the file byte-for-byte intact', async () => {
    const added = await command(['add', 'one']);
    const task = TaskSchema.parse(added.task);
    const original = await readFile(file, 'utf8');
    await expect(command(['edit', task.id, '--due', '2026-02-30'])).rejects.toThrow();
    await expect(command(['edit', task.id, '--due', '2026-10-20', '--clear', 'due'])).rejects.toThrow();
    await expect(command(['archive', task.id])).rejects.toThrow();
    expect(await readFile(file, 'utf8')).toBe(original);
  });

  it('refuses to replace existing unrelated Markdown', async () => {
    file = join(root, 'notes.md');
    const original = '# Notes\n- [ ] keep this\n';
    await writeFile(file, original);
    await expect(command(['add', 'new'])).rejects.toThrow();
    expect(await readFile(file, 'utf8')).toBe(original);
    await expect(access(`${file}.bak`)).rejects.toThrow();
  });

  it('uses the configured personal file across working directories', async () => {
    await run(['config', file]);
    await run(['add', 'global task'], tmpdir());
    const listed = ResultSchema.parse(await run(['list'], root));
    expect(listed.file).toBe(file);
    expect(listed.tasks).toMatchObject([{ title: 'global task' }]);
  });

  it.skipIf(process.platform === 'win32')('preserves symlink targets when updating', async () => {
    await command(['add', 'one']);
    const alias = join(root, 'alias.md');
    await symlink(file, alias);
    await run(['--file', alias, 'add', 'two']);
    expect(parseMarkdown(await readFile(file, 'utf8')).tasks).toHaveLength(2);
    expect(await readFile(alias, 'utf8')).toBe(await readFile(file, 'utf8'));
  });
});
