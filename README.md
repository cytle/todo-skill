# todo-skill

用自然语言管理工作、开发和生活待办。所有任务保存在本地 `~/TODO.md`，可在 Tern 原生 Markdown 看板中查看和编辑。Skill 负责轻量引导、管理规则，以及保存任务进度和 Codex 会话关联。

## 安装

```sh
npx skills add cytle/todo-skill --skill todo --agent codex --global -y
```

安装后直接对 Agent 使用 `$todo`。普通待办操作只需读写本地 Markdown 文件，无需 Tern 正在运行。在已安装 Tern 的机器上打开看板：

```sh
tern open ~/TODO.md
```

尚无文件时，第一次新增任务会建立 Todo / Doing / Done 三栏。

## 用法

这些是给 Agent 的请求，不是 shell 子命令。自然语言同样有效。

| 请求 | 功能 |
| --- | --- |
| `$todo setup` | 约定分类、打标、日期和优先级等管理规则 |
| `$todo list` | 查看未完成；支持 `today`、`overdue`、`done`、`all` |
| `$todo add …` / `$todo edit …` | 新增、修改；“先记着”表示只记录、不追问 |
| `$todo done …` / `$todo reopen …` | 完成并移入 Done，或恢复到 Todo；保留备注 |
| `$todo save` | 保存当前任务进度、Codex 会话 ID 和工作目录；未关联时先询问绑定或创建 |
| `$todo help` | 查看用法和能力限制 |

例如：“记一下整理照片，先记着”“看看今天先做什么”。`list` 展示完整匹配结果；“今天先做什么”从已有未完成事项中推荐最多三项。

## setup：约定怎么管理

`setup` 一次只问一个必要问题，沿用已有选择。例如是否按项目分类、何时使用标题前缀、什么情况需要日期或优先级。标题前缀是普通文本，不是原生标签；没有明确规则时只记录用户交代的内容。

规则保存在 `~/.local/share/todo-skill/rules.md`，任务保存在 `~/TODO.md`。不需要选择后端或添加技术配置。再次 `setup` 只调整需要改变的规则；应用新规则到旧任务需要明确要求。

## save 与继续 Codex

`$todo save` 优先匹配当前 Codex 会话关联的任务，更新已确认进度、下一步和保存时间。没有关联时先询问绑定现有任务或创建新任务；保存不会自动完成任务或执行下一步。

可选的 [Tern 会话恢复插件](skills/todo/assets/tern-codex-resume/README.md) 提供 **继续 Codex** 按钮和 **⌘⌥R** 快捷键。在 macOS 本地安装路径下注册：

```sh
tern plugin link ~/.agents/skills/todo/assets/tern-codex-resume --json
```

若 Skill 安装到其他目录，使用该目录下的 `assets/tern-codex-resume`。恢复需要 Tern 和本机可运行的 Codex CLI。选中已关联卡片后，插件在记录的工作目录运行 `codex resume <会话 ID>`，不向会话发送新提示词。

## 数据与边界

`~/TODO.md` 是唯一任务来源。标题、备注、子任务、完成状态和会话关联保留在同一任务块中；直接修改前会重新读取文件并合并并发变化。完成状态以复选框为准，默认列表包含所有未完成任务。

日期和优先级可保存在备注中，供 Skill 筛选；不提供定时通知、自动重复任务或跨设备同步。`today` / `overdue` 按用户时区的自然日比较，未设日期的任务不进入这两个视图。

## 开发验证

恢复插件的验证使用官方 Luau CLI 和 luau-lsp，覆盖实际解析器与按钮处理函数，不启动真实 Codex：

```sh
LUAU=/path/to/luau python3 skills/todo/assets/tern-codex-resume/verify.py
luau-lsp analyze --definitions=@tern=/path/to/tern.d.luau \
  skills/todo/assets/tern-codex-resume/window.luau \
  skills/todo/assets/tern-codex-resume/binding.luau
```

MIT License。
