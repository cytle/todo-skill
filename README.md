# todo-skill

一个通用的个人 TODO Skill。用自然语言记录工作、开发、生活待办，数据保存在本地 Markdown，跨项目使用。

```text
你：记一下买牛奶
Agent：已记录：买牛奶。

你：整理一下我的学习计划
Agent：你最想先学会什么？

你：看看今天先做什么
Agent：从现有待办中推荐最多三项，并说明依据。
```

## 使用方式

需要 Node.js **22.12 或更新版本**。仓库已经包含构建好的 CLI，使用 Skill 无需安装 npm 依赖。

```sh
git clone https://github.com/cytle/todo-skill.git
mkdir -p ~/.agents/skills
ln -s "$(pwd)/todo-skill/skills/todo" ~/.agents/skills/todo
```

这是共享 `.agents/skills` 目录的安装示例。也可以将 `skills/todo` 整个目录复制到你的 Agent 支持的 Skill 目录；以所在客户端的 Skill 加载方式为准。已有同名 Skill 时，先检查内容再选择目录，避免覆盖。

加载后可以说“使用 todo，记一下买牛奶”，或用支持该语法的客户端显式调用 `$todo`。引导和语言理解由宿主 Agent 提供。

## 数据放在哪里

默认是 `~/.local/share/todo-skill/TODO.md`。只有第一次新增时才创建；查看空清单不会写文件。

从仓库根目录运行以下命令，可指定你自己的本地位置：

```sh
node skills/todo/scripts/todo.mjs config "$HOME/Documents/todos/TODO.md"
node skills/todo/scripts/todo.mjs path
```

配置持久化到 `~/.config/todo-skill/config.json`，切换项目目录仍使用同一清单。优先级为 `--file` > `TODO_FILE` > 配置文件 > 默认位置。改配置不会移动旧数据。

记录保存在用户选择的本地路径；Skill 的程序文件和用户记录分开存放。本项目没有数据同步服务。宿主 Agent 仍会读取你要求它处理的记录，其模型和数据策略取决于你使用的客户端。

## 能做什么

- 新增、查看、筛选、修改、完成、恢复和归档；只需要标题，日期、优先级、分类可选。
- 明确交代的待办直接记录；从笔记或讨论中推断的事项先作为候选，确认后保存。
- 按需一次问一个问题，帮助澄清模糊事项；说“先记着”即可结束引导。
- 按优先级和日期展示清单、标记逾期；“今天做什么”只给建议，不自动改动记录。
- 手动编辑 Markdown 的标题、勾选状态和可选字段；CLI 更新保留管理区之外的笔记。

首版管理清单；任务执行、定时提醒、永久删除及外部平台同步未包含在内。归档只隐藏已完成任务，不删除历史。

## CLI 示例

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
| CLI | TypeScript + Node.js + Commander | 子命令、参数、帮助信息 |
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
