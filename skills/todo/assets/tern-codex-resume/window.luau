--!strict
local binding = require("./binding")
local ACTION = "plugin.tern-codex-resume.resume"
local opened: { [string]: number } = {}

local function resume(cx: WindowCx)
	local focused = cx.session:focused()
	local board = if focused then cx.session:read(focused, { rows = 500, max_chars = 64000 }) else nil
	if type(board) ~= "table" or board.kind ~= "board" or not board.path or not board.lanes then
		cx:toast("info", "请先在待办看板中选择一个任务。")
		return
	end
	local title: string? = nil
	local laneTitle: string? = nil
	for _, lane in board.lanes do
		for _, card in lane.cards do
			if card.cursor then
				if title or card.text_clipped then
					cx:toast("error", "无法唯一读取选中的完整任务，请重新选择。")
					return
				end
				title = card.text
				laneTitle = lane.title
			end
		end
	end
	if not title or not laneTitle then
		cx:toast("info", "请先点击要继续的任务卡片。")
		return
	end
	local readOk, markdown = pcall(tern.fs.read, board.path, 1024 * 1024)
	if not readOk then
		cx:toast("error", "无法读取待办文件。", tostring(markdown))
		return
	end
	local target, reason = binding.parse(markdown, laneTitle, title)
	if not target then
		cx:toast("info", "无法继续 Codex", reason)
		return
	end
	local command = binding.command(target)
	for _, pane in cx.session:panes() do
		-- exec replaces the launch shell; this pane cannot fall back to an unrelated
		-- interactive shell after Codex exits. Never reuse a closed/parked/error pane.
		if (pane.kind == "terminal" or pane.kind == "agent") and not pane.parked and pane.exited == nil and not pane.error then
			if opened[target.session] == pane.pane or (pane.running and pane.running.line == command) then
				cx.layout:focus(pane.pane)
				return
			end
		end
	end
	local ok, pane = pcall(function()
		return cx.layout:new_tab({ cwd = target.cwd, command = command })
	end)
	if not ok or not pane then
		cx:toast("error", "无法打开 Codex 会话。", if ok then "Tern 未创建终端标签页。" else tostring(pane))
		return
	end
	opened[target.session] = pane
end

tern.command({
	id = "resume",
	title = "继续 Codex：选中的待办",
	keys = { "cmd+alt+r" },
	run = resume,
})

tern.chrome.status(function(pane: StatusPaneInfo): { StatusSegment }?
	if pane.kind == "board" then
		return { { text = "继续 Codex", command = ACTION } }
	end
	return nil
end)
