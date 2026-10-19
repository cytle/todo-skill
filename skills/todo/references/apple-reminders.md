# remindctl operations

Run on macOS. Check installed `remindctl --help` and subcommand help before using unfamiliar flags; upstream documentation may describe features absent locally.

## Access and list targeting

For an operation that needs reminder data, check `remindctl status --json`. If access is `not-determined`, `remindctl authorize` can request permission; the user answers the system dialog. If denied or restricted, report the status and stop dependent operations. A sandbox IPC error such as Mach 4099 is not proof of denied access; retry through the host's supported sandbox permission mechanism when available. Do not bypass a system denial.

Discover lists with `remindctl list --json --no-input`. Match an explicit or rule-selected list against the current inventory. Use the sole list for an otherwise unqualified add. With multiple lists and no resolved write target, ask which to use; do not create a list or choose the first one silently. Reading unscoped todos can include all lists, grouped by list. `setup` and `help` do not need this access check unless actual list information is needed to answer a user choice.

Names can repeat across accounts. In 0.1.1, list selection uses names: retain records matching the intended `listID` after a read, and do not write to ambiguous same-name lists. Use a newer version's list-ID targeting only if its help confirms support. If an item ID disappears, reread and resolve it; do not recreate the item.

## Baseline commands

These commands are advertised by 0.1.1. Substitute real returned values, quote user-supplied arguments safely, and use full item IDs rather than indexes or guessed prefixes.

```sh
remindctl list "<list-name>" --json --no-input
remindctl show all --json --no-input
remindctl add "<title>" --list "<list-name>" --json --no-input
remindctl edit <full-id> --title "<title>" --json --no-input
remindctl edit <full-id> --notes "<notes>" --priority high --json --no-input
remindctl complete <full-id> --json --no-input
remindctl edit <full-id> --incomplete --json --no-input
```

Returned fields include `id`, `listID`, `listName`, `title`, `notes`, `isCompleted`, `completionDate`, `dueDate` and `priority`; optional fields may be absent. A list read can include completed items: filter explicitly. Priority `none` means unset, not medium.

After a mutation, reread the affected item and verify requested fields. A failed or timed-out mutation may already have saved: inspect before retrying, especially after add. Report local readback separately from cross-device sync and notifications.

## Dates and limits

Apple supports date-only and timed reminders, but 0.1.1 loses that distinction in JSON and always writes hour/minute components. For a date-only request, pause creation and explain the limitation; do not substitute midnight or an undated task unless the user chooses it. Resolve the version capability or let the user set the date in Reminders.app. Do not install or upgrade merely to inspect tasks.

For an explicitly timed request, use the documented format with an explicit offset, for example `--due "2026-10-23T09:00:00+08:00"`, and verify the returned instant. With no requested date, omit it. `--clear-due` clears the due field. Due dates are not evidence of notification alarms; 0.1.1 has no alarm or repeat flags.

Native tags, subtasks, attachments, archive and recurrence edits are outside this baseline. Agreed title prefixes are ordinary title text. Do not emulate unsupported operations by deleting or moving records. Do not use reminder or list deletion as part of this Skill.

Sources: [remindctl](https://github.com/openclaw/remindctl), [0.1.1 data and date conversion](https://github.com/openclaw/remindctl/blob/v0.1.1/Sources/RemindCore/EventKitStore.swift), [Apple dates](https://developer.apple.com/documentation/eventkit/ekreminder/duedatecomponents), [Apple alarms](https://developer.apple.com/documentation/eventkit/ekcalendaritem/alarms).
