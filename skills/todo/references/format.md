# Local Markdown format

All tasks, including completed and archived ones, live in one UTF-8 file. Content outside the managed markers is preserved verbatim by CLI updates. The CLI rewrites the managed block in the following canonical format:

```markdown
# My todos

Personal notes may go here.

<!-- todo-skill:start -->
- [ ] 买牛奶
  - id: t_000000000001
  - due: 2026-10-23
  - priority: high
  - tags: ["生活"]

- [x] 看完一本书
  - id: t_000000000002
  - archived: true
<!-- todo-skill:end -->

Other notes may go here too.
```

- A task has one checkbox title and exactly one stable ID: `t_` plus 12 lowercase hex characters. Let `add` allocate IDs. Renaming or reordering a task must preserve its ID.
- Title: nonempty, single line. `[ ]` is open, `[x]` or `[X]` is completed. Title text cannot contain the reserved `<!-- todo-skill:` marker prefix.
- `due`: optional calendar date, `YYYY-MM-DD`; it is not a UTC timestamp. Overdue checks use the machine's local date by default, or an explicit `list --today YYYY-MM-DD` supplied by the agent for the user's timezone.
- `priority`: optional `low`, `medium`, or `high`. An omitted value sorts as `medium` without being written into the file.
- `tags`: optional JSON array of unique nonempty single-line strings. Spaces and Unicode are supported.
- `archived`: optional JSON boolean. Only completed tasks can be archived. Archiving hides them from normal CLI lists, while the file retains the full record. Reopening clears the archived flag.

You can edit titles, checkbox states and optional fields by hand, following this format. Removing an optional metadata line clears that value. Metadata lines use exactly two leading spaces. Keep marker lines and IDs intact. Put free-form notes outside the managed block; unknown lines, fields, duplicate IDs and invalid values are rejected without rewriting the file. An arbitrary existing checklist is not automatically imported.

Before every changed write, `<file>.bak` receives the previous contents. This is one recovery copy, not a full version history. Reads never initialize files. CLI writers use a shared filesystem lock (up to about four seconds of contention retries) and atomic replacement; do not edit the file in an editor while another writer is saving. Existing symlink paths are resolved so updates retain their target. New data files and backups use mode `0600` where supported.

Configuration is `~/.config/todo-skill/config.json`, containing `{ "file": "/absolute/path/to/TODO.md" }`. Set it with `config <path>`; it does not move data. `--file` and `TODO_FILE` temporarily override it. This makes the personal list independent of the agent's current project.
