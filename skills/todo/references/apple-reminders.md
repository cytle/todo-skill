# Apple Reminders via remindctl

Use this mode only when the user chooses Apple Reminders. Invoke `remindctl` directly on macOS; do not call the Markdown CLI or write a mirror file. Data belongs to the selected system reminder list and may sync through its account. Do not promise that an iCloud list stays only on this Mac.

## Connect and choose a list

1. Check `remindctl --help` and `remindctl status --json`. Read subcommand help before using flags that have not been checked in this session. The installed version, not upstream main, determines the available interface.
2. If status is `not-determined`, `remindctl authorize` can request the system permission needed for the user's requested integration. The user must answer the macOS dialog. If denied or restricted, explain the status and stop dependent operations. A sandbox IPC failure such as Mach error 4099 is not proof the user denied access; retry a read through the host's supported sandbox permission mechanism when available. Do not bypass a system denial.
3. Run `remindctl list --json --no-input` to discover lists. Keep the user's existing choice. A sole list can be used for an otherwise unqualified request; with multiple lists and no choice, ask which to use before writing. Do not create a list just because the user changed projects.

List names are not unique across accounts. In 0.1.1, list operations target names; do not write when multiple lists have the same name. Use a newer version's exact list-ID option only after checking its help and resolving the intended list. Newer commands must not be assumed available on an older installation.

## Read and mutate

The following baseline commands are advertised by 0.1.1. Replace placeholders with returned values, pass titles and notes as safely quoted arguments, and keep the selected list explicit:

```sh
remindctl list "<list-name>" --json --no-input
remindctl add "<title>" --list "<list-name>" --json --no-input
remindctl edit <full-id> --title "<title>" --json --no-input
remindctl edit <full-id> --notes "<notes>" --priority high --json --no-input
remindctl complete <full-id> --json --no-input
remindctl edit <full-id> --incomplete --json --no-input
```

- List contents can include both completed and incomplete records. For ordinary todos and recommendations, select `isCompleted: false`. Include completed records only when relevant to the request.
- Returned fields include `id`, `listID`, `listName`, `title`, `notes`, `isCompleted`, `completionDate`, `dueDate`, and `priority`. Optional fields can be absent. Priority `none` is unset, not medium.
- Resolve a description against freshly read records, then use the full returned ID. Avoid display indexes or guessed prefixes. If an ID is no longer found, reread and resolve the item; do not recreate it. Ask when multiple records fit.
- An explicit add, edit, or completion instruction authorizes that operation. Preserve the shared capture rules: inferred tasks remain candidates until confirmed, and vague explicit tasks may be saved with only a title.
- Read back the affected record after a mutation to verify the requested fields. If a mutation fails or times out after it may have saved, inspect the target list before retrying; do not create duplicates by retrying blindly. Report local readback separately from cross-device sync or notification delivery.

## Dates and feature boundaries

Interpret timestamps in the user's timezone; a returned UTC date must not be truncated to its first ten characters to determine the local day. Apple supports date-only reminders and timed reminders, but 0.1.1's JSON model does not expose that distinction and its writes always include hour/minute components. Do not silently turn a date-only request into midnight. For that request, pause creation and explain the limitation; do not save an undated substitute unless the user chooses it. Resolve the tool version or have the user set the date in Reminders.app before claiming it is saved as all-day. Do not install or upgrade merely to inspect tasks.

For an explicitly timed request, use the installed command's documented format with an explicit offset (for example `--due "2026-10-23T09:00:00+08:00"`) and verify the returned instant. With no date requested, omit it. `--clear-due` clears the due field. A due field is not evidence of a notification alarm. 0.1.1 has no alarm or repeat flags; do not invent them or promise notification delivery.

Native tags, subtasks, attachments, recurrence edits and archive are outside this baseline integration. Do not convert Markdown tags into native tags, flatten a hierarchy, or emulate archive by deleting or moving a reminder. Do not use `delete` or list deletion as part of this Skill. Explain an unsupported operation without silently changing the storage mode.

Sources: [remindctl](https://github.com/openclaw/remindctl), [0.1.1 data and date conversion](https://github.com/openclaw/remindctl/blob/v0.1.1/Sources/RemindCore/EventKitStore.swift), [Apple due date components](https://developer.apple.com/documentation/eventkit/ekreminder/duedatecomponents), [Apple alarms](https://developer.apple.com/documentation/eventkit/ekcalendaritem/alarms).
