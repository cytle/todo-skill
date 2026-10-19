local parser = require("./binding")
local uuid = "11111111-2222-4333-8444-555555555555"
local notes = "  Codex 会话 ID：`" .. uuid .. "`\n  会话工作目录：`/Users/test/project`\n"
local markdown = "## Todo\n\n- [ ] 123\n\n## Doing\n\n- [ ] 创建待办管理\n" .. notes
local target, reason = parser.parse(markdown, "Doing", "创建待办管理")
assert(target and target.session == uuid and target.cwd == "/Users/test/project", reason)
assert(parser.command(target) == "exec codex resume " .. uuid)
assert(not parser.parse(markdown, "Todo", "123"), "Must not borrow another card's binding")
assert(not parser.parse(markdown, "Doing", "Missing"), "Must require an exact card")
assert(not parser.parse(markdown .. "- [ ] 创建待办管理\n" .. notes, "Doing", "创建待办管理"), "Duplicate card must fail")
assert(not parser.parse(markdown .. notes, "Doing", "创建待办管理"), "Duplicate metadata must fail")
assert(not parser.parse(string.gsub(markdown, "Codex 会话 ID：`[^`]+`", "Codex 会话 ID：`" .. uuid .. ";touch /tmp/no`"), "Doing", "创建待办管理"), "Reject command injection in UUID")
assert(not parser.parse(string.gsub(markdown, "/Users/test/project", "relative/path"), "Doing", "创建待办管理"), "Reject relative cwd")
local quoted = parser.parse(string.gsub(markdown, "/Users/test/project", "/tmp/project ' $(touch nope)"), "Doing", "创建待办管理")
assert(quoted and quoted.cwd == "/tmp/project ' $(touch nope)", "cwd stays data, never shell code")
local fenced = "```md\n## Doing\n- [ ] 创建待办管理\n" .. notes .. "```\n" .. markdown
assert(parser.parse(fenced, "Doing", "创建待办管理"), "Ignore fake cards inside fences")
assert(parser.parse(string.gsub(markdown, "\n", "\r\n"), "Doing", "创建待办管理"), "Support CRLF")
print("PASS: exact card, missing/duplicate binding, UUID safety, cwd handling, fenced code, CRLF")

local commandDefinition
local statusFormatter
local toasts = {}
local launches = {}
local focused = 1
local live = {}
local selected = { text = "创建待办管理", cursor = true }
local board = { kind = "board", path = "/tmp/TODO.md", lanes = { { title = "Doing", cards = { selected } } } }
local tern = {
    fs = { read = function(path, limit)
        assert(path == "/tmp/TODO.md" and limit == 1024 * 1024)
        return markdown
    end },
    command = function(definition) commandDefinition = definition end,
    chrome = { status = function(formatter) statusFormatter = formatter end },
}
local cx = {
    session = {
        focused = function() return focused end,
        read = function(_, pane) assert(pane == 1); return board end,
        panes = function() return live end,
    },
    layout = {
        new_tab = function(_, launch)
            table.insert(launches, launch)
            local pane = 100 + #launches
            table.insert(live, { pane = pane, kind = "terminal" })
            focused = pane
            return pane
        end,
        focus = function(_, pane) focused = pane end,
    },
    toast = function(_, level, text, sub) table.insert(toasts, { level, text, sub }) end,
}

--[[WINDOW_SOURCE]]

assert(commandDefinition and statusFormatter)
local segments = statusFormatter({ kind = "board" })
assert(segments[1].command == "plugin.tern-codex-resume.resume")
assert(not statusFormatter({ kind = "terminal" }), "Show button only on boards")
commandDefinition.run(cx)
assert(#launches == 1 and focused == 101)
assert(launches[1].cwd == target.cwd and launches[1].command == "exec codex resume " .. uuid)
focused = 1
live[1].kind = "agent" -- Tern promotes the real Codex terminal to an agent block.
commandDefinition.run(cx)
assert(#launches == 1 and focused == 101, "Second click must focus the first session after agent promotion")
live[1].exited = 0
focused = 1
commandDefinition.run(cx)
assert(#launches == 2 and focused == 102, "Exited panes must not be reused")
focused = 1
selected.cursor = false
commandDefinition.run(cx)
assert(#launches == 2 and #toasts == 1, "No selection must not launch")
selected.cursor = true
selected.text = "123"
board.lanes[1].title = "Todo"
commandDefinition.run(cx)
assert(#launches == 2 and #toasts == 2, "Unlinked task must not launch")
selected.text = "创建待办管理"
board.lanes[1].title = "Doing"
markdown ..= "- [ ] 创建待办管理\n" .. notes
commandDefinition.run(cx)
assert(#launches == 2 and #toasts == 3, "Ambiguous task must not launch")
print("PASS: actual click handler, fixed command, agent promotion, repeated click focus, exited pane, no selection, unlinked/ambiguous card")
