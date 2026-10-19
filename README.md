# todo-skill

一个通用的个人 TODO Skill。用自然语言记录工作、开发、生活待办，支持本地 Markdown，也支持在 Mac 上直接通过 `remindctl` 管理 Apple 提醒事项，跨项目使用。

```text
你：记一下买牛奶
Agent：已记录：买牛奶。

你：整理一下我的学习计划
Agent：你最想先学会什么？

你：看看今天先做什么
Agent：从现有待办中推荐最多三项，并说明依据。
```

## 使用方式

Markdown 模式需要 Node.js **22.12 或更新版本**，仓库已包含独立 CLI，无需安装 npm 依赖。Apple 提醒事项模式需要 macOS、`remindctl` 和系统提醒事项访问权限，不依赖本项目的 Node.js CLI。

```sh
git clone https://github.com/cytle/todo-skill.git
mkdir -p ~/.agents/skills
ln -s "$(pwd)/todo-skill/skills/todo" ~/.agents/skills/todo
```

这是共享 `.agents/skills` 目录的安装示例。也可以将 `skills/todo` 整个目录复制到你的 Agent 支持的 Skill 目录；以所在客户端的 Skill 加载方式为准。已有同名 Skill 时，先检查内容再选择目录，避免覆盖。

加载后可以说“使用 todo，记一下买牛奶”，或用支持该语法的客户端显式调用 `$todo`。引导和语言理解由宿主 Agent 提供。

## 操作入口

在对话中说 `todo list`、`todo setup`，或用客户端支持的 `$todo list` 语法。以下是 Skill 接收的指令，不是新增的终端命令；自然语言同样有效。

| 指令 | 功能 | 示例 |
| --- | --- | --- |
| `setup` | 检查依赖和权限，选择并记住默认数据源与清单 | `todo setup` |
| `list` | 默认列出未完成；可筛选今天、逾期、已完成或全部 | `todo list today`、`todo list done` |
| `add` / `edit` | 记录待办、修改内容，按需轻量澄清 | `todo add 整理照片，先记着` |
| `done` / `reopen` | 标记完成或恢复未完成 | `todo done 整理照片` |
| `help` | 查看操作说明和当前数据源的能力限制 | `todo help` |

`list` 会列出完整匹配结果，长清单分批展示，不只推荐三项；“今天先做什么”才会推荐最多三项。`list today` 表示用户时区中今天到期的未完成事项，`list overdue` 表示在今天之前到期的未完成事项。对于提醒事项，CLI 日期数据若无法区分全天和定时，列表不把当天较早的时间直接判成逾期。`list done` 查看已完成，`list all` 包含全部状态，其他筛选可用自然语言补充。

`setup` 保存选择到 `~/.config/todo-skill/preferences.json`，以后换项目或新会话会继续使用；显式指定另一数据源只影响该次请求，除非要求记为默认。设置、查询和查看帮助不会创建待办，不会迁移或复制旧记录。没有设置时沿用 Markdown 默认位置。详细行为见 [操作说明](skills/todo/references/commands.md)。

## 在 Mac 上使用提醒事项

对 Agent 说“使用 todo，查看我的苹果提醒事项”即可选择此数据源。Skill 直接调用 [remindctl](https://github.com/openclaw/remindctl)，不增加 TS 封装。用 `todo setup` 保存默认清单后，新会话也会沿用；也可仅在当前请求明确“苹果提醒事项”。

已安装 `remindctl` 时，可先核对权限和清单：

```sh
remindctl status --json
remindctl authorize
remindctl list --json --no-input
```

`authorize` 在需要时触发 macOS 授权弹窗；是否允许由你决定。没有安装时，按 remindctl 的上游安装说明安装。后续新增、编辑、完成与恢复由 Skill 调用现有命令，操作前匹配实际清单和待办 ID。

以本机 `remindctl <command> --help` 为能力依据。已核对的 0.1.1 支持基础清单操作，但日期处理不能保留“全天／指定时间”的区别；只有日期的请求应先解决版本能力或在提醒事项 App 设置日期。日期写入不等于通知已设置，不能直接照搬上游新版文档中的通知、重复规则等参数。原生标签、子任务及归档不纳入本次接入。

命令、选单、日期和错误处理见 [Apple 提醒事项说明](skills/todo/references/apple-reminders.md)。

## 数据放在哪里

选择 Apple 提醒事项时，记录保存在系统管理的数据仓库；属于 iCloud 等同步账户的清单会按该账户的系统设置同步。本项目不会额外写一份 Markdown，也不会自动迁移旧记录。

没有保存或指定数据源时，Markdown 默认是 `~/.local/share/todo-skill/TODO.md`。只有第一次新增时才创建；查看空清单不会写文件。

从仓库根目录运行以下命令，可指定你自己的本地位置：

```sh
node skills/todo/scripts/todo.mjs config "$HOME/Documents/todos/TODO.md"
node skills/todo/scripts/todo.mjs path
```

配置持久化到 `~/.config/todo-skill/config.json`，切换项目目录仍使用同一清单。优先级为 `--file` > `TODO_FILE` > 配置文件 > 默认位置。改配置不会移动旧数据。

Markdown 记录保存在用户选择的本地路径；Skill 的程序文件和用户记录分开存放。本项目没有两种数据源之间的同步服务。宿主 Agent 仍会读取你要求它处理的记录，其模型和数据策略取决于你使用的客户端。

## 能做什么

- 新增、查看、筛选、修改、完成和恢复；只需要标题，其他字段按需填写。Markdown 另支持分类和归档。
- 明确交代的待办直接记录；从笔记或讨论中推断的事项先作为候选，确认后保存。
- 按需一次问一个问题，帮助澄清模糊事项；说“先记着”即可结束引导。
- 按优先级和日期展示清单、标记逾期；“今天做什么”只给建议，不自动改动记录。
- 手动编辑 Markdown 的标题、勾选状态和可选字段；CLI 更新保留管理区之外的笔记。

Skill 不执行待办本身，不提供后台定时任务或永久删除流程。Markdown 归档只隐藏已完成任务，保留历史；Apple 提醒事项的通知和同步由系统管理，具体能力取决于所用工具版本。

## Markdown CLI 示例

所有结果输出 JSON，适合 Agent 调用。下面的 `<id>` 替换为 `add` 或 `list` 返回的 ID。

```sh
node skills/todo/scripts/todo.mjs add "买牛奶" --tag "生活"
node skills/todo/scripts/todo.mjs list
node skills/todo/scripts/todo.mjs list --all
node skills/todo/scripts/todo.mjs list --overdue --today 2026-10-23
node skills/todo/scripts/todo.mjs edit <id> --due 2026-10-24 --priority high
node skills/todo/scripts/todo.mjs edit <id> --clear due
node skills/todo/scripts/todo.mjs done <id>
node skills/todo/scripts/todo.mjs archive <id>
node skills/todo/scripts/todo.mjs reopen <id>
```

`--tag <tag...>` 可设置多个分类；`edit --tag` 替换整个分类列表。`list --due-before` 包含指定日期当天，`--overdue` 仅匹配该日之前的未完成任务。默认列表按优先级、日期、ID 排序；`--all` 包含已完成和已归档记录，`--status` 可以进一步筛选。

日期是用户日历中的 `YYYY-MM-DD`，不是时间戳；相对日期由 Agent 按用户时区解释。默认逾期检查使用机器本地日期，跨时区时通过 `--today` 指定用户当天日期。

文件格式、备份和恢复说明见 [format.md](skills/todo/references/format.md)。写入使用文件锁和原子替换，并保留上一版 `.bak`。示例数据见 [examples/TODO.md](examples/TODO.md)。

## 技术方案

| 层 | 技术 | 用途 |
| --- | --- | --- |
| Skill | `SKILL.md` | 意图、记录边界、轻量引导 |
| Apple 提醒事项 | remindctl + Apple EventKit | Skill 直接调用现有 CLI |
| Markdown CLI | TypeScript + Node.js + Commander | 子命令、参数、帮助信息 |
| 数据 | Zod + 本地 Markdown | 同一份 schema 同时提供运行时校验和类型 |
| 文件安全 | proper-lockfile + Node.js fs | 并发写入、备份和原子替换 |
| 工程 | esbuild + Vitest | 打包为独立脚本、验证行为 |

Vite 用于 Web 项目开发；当前入口是 CLI，因此使用 esbuild 打包，测试采用 Vitest。未来增加网页界面时可以接入 Vite。

## 开发

```sh
npm ci
npm run check
```

`check` 依次运行类型检查、构建和测试。CLI 产物 `skills/todo/scripts/todo.mjs` 随源码提交，确保只复制 Skill 目录也能使用；改源码后需要重新构建。CI 同时检查构建产物与源码一致。测试覆盖任务状态、日期筛选、Markdown 往返、个人配置、备份、拒绝无效写入和并发新增。

```text
src/                 # TypeScript 模型、Markdown、存储、CLI
tests/               # Vitest 单元与 CLI 集成测试
skills/todo/         # 可独立安装的完整 Skill
examples/            # 公开的虚构示例数据
```

MIT License。打包依赖的许可证见 [THIRD_PARTY_NOTICES.md](skills/todo/THIRD_PARTY_NOTICES.md)。
