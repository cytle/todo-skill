import { describe, expect, it } from 'vitest';
import { emptyDocument, parseMarkdown, renderMarkdown } from '../src/markdown.js';
import { addTask } from '../src/model.js';

describe('Markdown persistence', () => {
  it('round-trips Unicode, optional fields, and user text outside the managed block', () => {
    const document = emptyDocument();
    document.before = '# 我的清单\n\n自由笔记：今天不用着急。\n\n';
    document.after = '\n\n## 灵感\n保留这些内容。\n';
    addTask(document.tasks, { title: '读《书》 & 检查 `code`', tags: ['生活', '带 空格'], priority: 'high', due: '2026-10-20' });
    expect(parseMarkdown(renderMarkdown(document))).toEqual(document);
  });

  it('accepts manual checkbox, title, and field edits', () => {
    const document = emptyDocument();
    addTask(document.tasks, { title: '原始标题', due: '2026-10-20' });
    const edited = renderMarkdown(document).replace('[ ] 原始标题', '[X] 新标题').replace('2026-10-20', '2026-10-21');
    expect(parseMarkdown(edited).tasks[0]).toMatchObject({ title: '新标题', done: true, due: '2026-10-21' });
  });

  it('refuses incompatible content, unknown fields and duplicate IDs', () => {
    expect(() => parseMarkdown('# My existing notes\n- [ ] keep this')).toThrow(/Not a todo-skill file/);
    const document = emptyDocument();
    const task = addTask(document.tasks, { title: 'one' });
    const source = renderMarkdown(document);
    expect(() => parseMarkdown(source.replace('  - id:', '  - mystery:'))).toThrow();
    expect(() => parseMarkdown(source.replace('<!-- todo-skill:end -->', 'A manual note\n<!-- todo-skill:end -->'))).toThrow(/Unrecognized/);
    document.tasks.push({ ...task });
    expect(() => parseMarkdown(renderMarkdown(document))).toThrow(/Duplicate task/);
  });
});
