# Setup, list and help

These operations are instructions to the Agent, not added subcommands of `todo.mjs` or `remindctl`. Use the existing tools for the chosen storage. Capability questions and examples never authorize executing the examples.

## Personal preferences

Read `~/.config/todo-skill/preferences.json` when resolving a saved default. This file contains only settings, not tasks. It is separate from the Markdown CLI's `config.json`; adding backend fields to that file would break its strict schema.

Accepted forms:

```json
{"version":1,"backend":"apple-reminders","list":{"id":"<returned-list-id>","name":"<returned-list-name>"}}
```

```json
{"version":1,"backend":"markdown"}
```

Parse JSON as data. Require an object with `version` equal to 1 and exactly one of those backend values. For Apple Reminders require a list object with nonempty string `id` and `name`. Reject unknown fields or unsupported versions rather than silently ignoring or overwriting them. A missing file means no saved choice; unreadable or invalid preferences require explaining the problem, not silently switching storage. An explicit source can still be used without changing an invalid preferences file.

Resolve the saved reminder list by its ID against the live list inventory, and use the current returned name. Do not silently select another list if the ID is missing. On 0.1.1, same-name lists cannot be safely targeted for writes; explain the ambiguity before saving a setup as ready. For reads that return multiple lists, retain only records whose `listID` matches the selected ID. Renames discovered during `list` need no settings write; a later `setup` can refresh the saved display name.

Markdown paths remain in the existing CLI configuration and obey `--file` > `TODO_FILE` > `config.json` > default path. Preferences do not duplicate or override the file path. The bundled Markdown CLI itself does not read preferences; the Skill selects the tool.

## setup

1. Read existing preferences and the user's current choice. Reuse an already chosen backend and list rather than asking again. For a fresh `setup` with no choice on macOS, ask one question: Apple Reminders or local Markdown? On other systems use Markdown unless the user chose otherwise. Do not infer a switch from a failed connection.
2. Check the selected backend. For Apple Reminders, follow [apple-reminders.md](apple-reminders.md): check installed help, permission and actual list inventory. Reuse an exact match or the sole list; ask which list only when unresolved. For Markdown, check Node.js 22.12+, run the bundled `path`, and read `list` to verify the resolved file is readable and valid. Missing Markdown data is an empty list, not an error. Run `config <absolute-path>` only when the user asks to persist a different path; mention a conflicting `TODO_FILE` override rather than reporting the new path as effective.
3. Once the requested source is accessible and selected, create the personal config directory if needed and save the matching preferences form above. Use native file tools, private file permissions where supported, and an atomic replacement; reread and validate it before reporting success. Preserve the existing preferences if setup is blocked. Do not copy tasks, create a reminder list, initialize a TODO file, or install/upgrade tools merely to complete setup. If a dependency is absent, report the missing dependency and the next action.
4. Report the chosen backend, exact list or effective Markdown path, and the preferences location. State verified readiness and any current limitations. Setup authorizes saving that chosen configuration; no additional approval is needed for an already resolved choice. New default requests outside `setup` use this same flow.

## list

`list` is a complete read view of the selected source. It does not trigger setup, rewrite preferences, create tasks, or fall back to another store. Use the user's current date and timezone. Default to incomplete records; show completed records only for `done` or `all` (or an explicit equivalent request).

| View | Markdown CLI | Apple Reminders |
| --- | --- | --- |
| default | `list` | Read selected list; keep `isCompleted: false`. |
| `today` | `list --due-before <today> --today <today>`, then retain `due == today` | Keep incomplete items whose `dueDate` falls on today in the user's timezone. |
| `overdue` | `list --overdue --today <today>` | Keep incomplete items whose local due date is before today. |
| `done` | `list --all --status done` | Keep `isCompleted: true`. |
| `all` | `list --all` | Keep all records in the selected list. |

Apple date values in old `remindctl` output do not preserve all-day versus timed metadata. These views deliberately use local calendar days for due grouping; do not call an earlier time today overdue without reliable timed/all-day metadata. Missing dates are excluded from `today` and `overdue`, but remain in the default view. Markdown `all` and `done` include archived tasks. A user can additionally filter by title or priority; native tags are not part of the Apple baseline.

For reminders, read with `remindctl list "<current-list-name>" --json --no-input`, then match `listID` and apply these filters. With multiple lists and no selected scope, an unqualified read may show all accessible lists grouped by list, clearly stating that scope; do not persist a selection. With a selected list missing or inaccessible, explain the failure rather than substituting another list.

Present the source/list, total matching count, and each task's title plus relevant date/status/priority. Show IDs only when useful for disambiguation. Do not silently limit the result to three tasks: paginate or group a long list, state any shown range, and make the remaining records available. An empty view is a valid result, not a reason to create tasks. “今天先做什么” is a separate recommendation request and suggests at most three existing tasks without changing them.

## help

Show the five operation groups from SKILL.md and examples appropriate to the user's selected source. Explain optional views of `list`, title-only capture, and “先记着”. Use known preferences/context without a live task scan or permission prompt merely for help. Do not change preferences or run examples. Mention Markdown-only archive and current reminder date/notification limits when relevant. Unknown operation names should receive help rather than being treated as new task titles.
