--!strict
-- Read only the selected card's notes. Commands written in notes are never run.
local M = {}

export type Binding = { session: string, cwd: string }
type Card = { lane: string, title: string, notes: { string } }

local function trim(text: string): string
	return string.match(text, "^%s*(.-)%s*$") or text
end

local function value(line: string, label: string): string?
	local text = trim(line)
	local result = string.match(text, "^" .. label .. "：%s*(.-)%s*$")
		or string.match(text, "^" .. label .. ":%s*(.-)%s*$")
	if result then
		return string.match(result, "^`([^`]+)`$") or result
	end
	return nil
end

function M.parse(markdown: string, lane: string, title: string): (Binding?, string?)
	local cards: { Card } = {}
	local current: Card? = nil
	local heading = ""
	local fence: string? = nil
	for line in string.gmatch(markdown .. "\n", "([^\n]*)\n") do
		line = string.gsub(line, "\r$", "")
		local delimiter = string.match(line, "^%s*(```+)") or string.match(line, "^%s*(~~~+)")
		if delimiter then
			if not fence then
				fence = delimiter
			elseif string.sub(delimiter, 1, 1) == string.sub(fence, 1, 1) and #delimiter >= #fence then
				fence = nil
			end
		elseif not fence then
			local nextHeading = string.match(line, "^#+%s+(.+)$")
			local nextTitle = string.match(line, "^[-*+]%s+%[[ xX]%]%s+(.+)$")
			if nextHeading then
				heading = trim(nextHeading)
				current = nil
			elseif nextTitle then
				local card: Card = { lane = heading, title = trim(nextTitle), notes = {} }
				current = card
				table.insert(cards, card)
			elseif current and string.match(line, "^%s+") then
				table.insert(current.notes, line)
			end
		end
	end
	local selected: Card? = nil
	for _, card in cards do
		if card.lane == lane and card.title == title then
			if selected then
				return nil, "同一栏目有多个同名任务，请先给任务使用不同标题。"
			end
			selected = card
		end
	end
	if not selected then
		return nil, "文件中没有唯一匹配的任务；请先保存编辑并重新选择卡片。"
	end
	local session: string? = nil
	local cwd: string? = nil
	for _, line in selected.notes do
		local nextSession = value(line, "Codex 会话 ID")
		local nextCwd = value(line, "会话工作目录")
		if nextSession then
			if session then return nil, "任务包含多个 Codex 会话 ID，请先保留一个。" end
			session = nextSession
		end
		if nextCwd then
			if cwd then return nil, "任务包含多个会话工作目录，请先保留一个。" end
			cwd = nextCwd
		end
	end
	if not session or not cwd then
		return nil, "此任务尚未关联 Codex：备注需要 Codex 会话 ID 和会话工作目录。"
	end
	if not string.match(session, "^%x%x%x%x%x%x%x%x%-%x%x%x%x%-%x%x%x%x%-%x%x%x%x%-%x%x%x%x%x%x%x%x%x%x%x%x$") then
		return nil, "Codex 会话 ID 必须是完整 UUID。"
	end
	if string.sub(cwd, 1, 1) ~= "/" or string.find(cwd, "[%c`]") then
		return nil, "会话工作目录必须是绝对路径，且不能包含控制字符或反引号。"
	end
	return { session = string.lower(session), cwd = cwd }, nil
end

function M.command(binding: Binding): string
	-- session is accepted only after UUID validation; cwd is a separate Launch field.
	return "exec codex resume " .. binding.session
end

return M
