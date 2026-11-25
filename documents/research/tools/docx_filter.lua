-- Pandoc filter for the research Word builds.
-- * The first level-1 heading becomes the document title; the paragraph right after it becomes the subtitle.
-- * A page break follows the title block, and "<!-- pagebreak -->" markers become Word page breaks.
-- * Links to repository files (not http/https/mailto) keep their text but lose the link, because a Word
--   reader cannot open repository-relative paths.

local pagebreak = pandoc.RawBlock('openxml', '<w:p><w:r><w:br w:type="page"/></w:r></w:p>')

local function is_external(target)
  return target:match('^https?://') or target:match('^mailto:')
end

function Link(el)
  if is_external(el.target) then
    return el
  end
  return el.content
end

-- Inline math in these documents is simple notation (ΔD, D_{gap}, CI brackets). Render it as plain text
-- with sub/superscripts so it displays in any Word-compatible viewer, not only in equation-aware ones.
local symbols = { Delta = 'Δ', lambda = 'λ', eta = 'η', times = '×', le = '≤', ge = '≥', cdot = '·' }

local function parse_tex(s, i, stop)
  local out = pandoc.List()
  local buf = ''
  local function flush()
    if buf ~= '' then out:insert(pandoc.Str(buf)); buf = '' end
  end
  while i <= #s do
    local ch = s:sub(i, i)
    if stop and ch == stop then
      flush(); return out, i + 1
    elseif ch == '\\' then
      local name = s:match('^%a+', i + 1)
      if name == 'text' or name == 'mathrm' then
        flush()
        local inner, j = parse_tex(s, i + #name + 2, '}')
        out:extend(inner); i = j
      elseif name and symbols[name] then
        buf = buf .. symbols[name]; i = i + #name + 1
        if s:sub(i, i) == ' ' then i = i + 1 end
      else
        buf = buf .. (name or ''); i = i + 1 + #(name or '')
      end
    elseif ch == '_' or ch == '^' then
      flush()
      local inner, j
      if s:sub(i + 1, i + 1) == '{' then
        inner, j = parse_tex(s, i + 2, '}')
      else
        inner, j = pandoc.List({ pandoc.Str(s:sub(i + 1, i + 1)) }), i + 2
      end
      out:insert(ch == '_' and pandoc.Subscript(inner) or pandoc.Superscript(inner)); i = j
    elseif ch == '{' or ch == '}' then
      i = i + 1
    elseif ch == ' ' then
      flush(); out:insert(pandoc.Space()); i = i + 1
    elseif ch == '-' then
      buf = buf .. '−'; i = i + 1
    else
      buf = buf .. ch; i = i + 1
    end
  end
  flush()
  return out, i
end

function Math(el)
  if el.mathtype == 'InlineMath' then
    return (parse_tex(el.text, 1, nil))
  end
end

-- Pipe tables with short separator rows get equal column widths. Size columns by their longest cell
-- instead (capped, so one long cell cannot squeeze the rest), which keeps labels and numbers readable.
function Table(el)
  local n = #el.colspecs
  local width = {}
  local word = {}
  for c = 1, n do width[c] = 4; word[c] = 4 end
  local function longest_word(text)
    local best = 0
    for w in text:gmatch('%S+') do
      local len = utf8.len(w) or #w
      if len > best then best = len end
    end
    return best
  end
  -- Header cells may wrap, so only their longest word counts; body cells count in full (capped).
  local function measure(rows, is_header)
    for _, row in ipairs(rows) do
      for c, cell in ipairs(row.cells) do
        if c <= n then
          local text = pandoc.utils.stringify(cell.contents)
          local w = longest_word(text)
          if w > word[c] then word[c] = w end
          local len = is_header and w or math.min(utf8.len(text) or #text, 14)
          if len > width[c] then width[c] = len end
        end
      end
    end
  end
  measure(el.head.rows, true)
  for _, body in ipairs(el.bodies) do measure(body.body, false) end
  local total = 0
  for c = 1, n do
    -- +3 covers the cell's left/right margins, so the longest word never breaks.
    width[c] = math.max(width[c], word[c]) + 3
    total = total + width[c]
  end
  for c = 1, n do
    el.colspecs[c] = { el.colspecs[c][1], width[c] / total }
  end
  return el
end

function RawBlock(el)
  if el.format == 'html' and el.text:match('^<!%-%-%s*pagebreak%s*%-%->$') then
    return pagebreak
  end
end

function Pandoc(doc)
  local blocks = doc.blocks
  local out = pandoc.List()
  local i = 1
  if blocks[1] and blocks[1].t == 'Header' and blocks[1].level == 1 then
    doc.meta.title = pandoc.MetaInlines(blocks[1].content)
    i = 2
    if blocks[2] and blocks[2].t == 'Para' then
      doc.meta.subtitle = pandoc.MetaInlines(blocks[2].content)
      i = 3
    end
    -- Keep short status/notice paragraphs (before the first heading) on the title page.
    while blocks[i] and blocks[i].t ~= 'Header' do
      out:insert(blocks[i])
      i = i + 1
    end
    out:insert(pagebreak)
  end
  for j = i, #blocks do
    out:insert(blocks[j])
  end
  doc.blocks = out
  return doc
end
