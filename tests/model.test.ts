import { describe, expect, it } from 'vitest';
import { addTask, listTasks, TaskSchema, type Task, updateTask } from '../src/model.js';

describe('task behavior', () => {
  it('adds title-only tasks and preserves identity through updates and restoration', () => {
    const tasks: Task[] = [];
    const created = addTask(tasks, { title: ' 买牛奶 ' });
    expect(created.title).toBe('买牛奶');
    expect(listTasks(tasks, {})).toHaveLength(1);
    updateTask(tasks, created.id, { due: '2026-10-20', tags: ['生活'] });
    updateTask(tasks, created.id, { done: true });
    updateTask(tasks, created.id, { archived: true });
    expect(listTasks(tasks, {})).toEqual([]);
    expect(listTasks(tasks, { all: true })).toHaveLength(1);
    const reopened = updateTask(tasks, created.id, { done: false, archived: false }, ['due']);
    expect(reopened).toMatchObject({ id: created.id, title: '买牛奶', tags: ['生活'] });
    expect(reopened).not.toHaveProperty('due');
  });

  it('uses calendar dates for overdue and combines filters', () => {
    const tasks: Task[] = [];
    const yesterday = addTask(tasks, { title: '发布 Demo', due: '2026-10-18', tags: ['开发'], priority: 'high' });
    addTask(tasks, { title: '买菜', due: '2026-10-19', tags: ['生活'] });
    addTask(tasks, { title: '读书' });
    expect(listTasks(tasks, { today: '2026-10-19', overdue: true, query: 'demo', tag: '开发' })).toMatchObject([{ id: yesterday.id }]);
    expect(listTasks(tasks, { today: '2026-10-19', dueBefore: '2026-10-19' })).toHaveLength(2);
    updateTask(tasks, yesterday.id, { done: true });
    expect(listTasks(tasks, { today: '2026-10-19', all: true, overdue: true })).toEqual([]);
  });

  it('sorts by priority then due date without mutating source order', () => {
    const tasks: Task[] = [];
    const low = addTask(tasks, { title: 'later', priority: 'low' });
    const high = addTask(tasks, { title: 'urgent', priority: 'high' });
    expect(listTasks(tasks, {}).map((task) => task.id)).toEqual([high.id, low.id]);
    expect(tasks.map((task) => task.id)).toEqual([low.id, high.id]);
  });

  it('rejects invalid changes without mutating a task', () => {
    const tasks: Task[] = [];
    const task = addTask(tasks, { title: 'example' });
    const before = structuredClone(tasks);
    expect(() => updateTask(tasks, task.id, { due: '2026-02-30' })).toThrow();
    expect(() => updateTask(tasks, task.id, { archived: true })).toThrow(/completed/);
    expect(() => updateTask(tasks, 't_000000000000', { done: true })).toThrow(/Unknown task/);
    expect(tasks).toEqual(before);
    expect(() => TaskSchema.parse({ ...task, title: 'a\nb' })).toThrow();
    expect(() => addTask(tasks, { title: '<!-- todo-skill:end -->' })).toThrow();
  });
});
