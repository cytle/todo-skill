# Tern 中继续 Codex

在 Tern 原生 Markdown 看板选中任务，按 **⌘⌥R（Command + Option + R）** 或点击状态栏的 **继续 Codex**，即可在新终端标签页恢复关联会话。命令面板也提供 **继续 Codex：选中的待办**。若底部没有状态栏，在命令面板中运行 **Show status line** 打开。

从常见的用户 Skill 安装目录注册；若路径不同，替换为实际目录：

```sh
tern plugin link ~/.agents/skills/todo/assets/tern-codex-resume --json
```

卡片备注使用以下格式（兼容已有中文备注）：

```md
## Doing

- [ ] 创建一个好用的待办管理
  Codex 会话 ID：`完整的 Codex 会话 UUID`
  会话工作目录：`/项目的绝对路径`
```

插件只读取看板文件，不更改任务；不执行备注里的命令，也不向会话发送提示词。固定启动 `codex resume <UUID>`，工作目录独立传给 Tern。需要本机终端能运行 `codex`。

重复点击会优先聚焦当前窗口由本插件打开且仍在运行的会话。重载插件或跨窗口后不保证复用已有标签页。关闭的会话可再次恢复。

当前按栏目和完整标题匹配顶层 Markdown 任务；同栏目同名任务、未保存或被截断的标题、缺失或重复的会话字段都会提示错误。标题含被看板去掉的标签/日期等标记时，应先使用纯文本标题。读取上限为 1 MiB，不支持符号链接待办文件。

在插件目录中验证（使用官方 Luau CLI，不启动真实 Codex）：

```sh
LUAU=/path/to/luau python3 verify.py
luau-lsp analyze --definitions=@tern=/path/to/tern.d.luau \
  window.luau binding.luau
```

安装后的实际验收：选中已关联卡片，点击可见的 **继续 Codex**；确认新标签显示相同历史会话。返回看板再次点击，确认聚焦原标签且没有多开。再选择未关联卡片，确认只出现提示。
