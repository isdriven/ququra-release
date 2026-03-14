/**
 * 編集モードで許可: # ## ###, -, **, ``` と HTML。
 * {xxx} は伏字用に抽出し、プレースホルダーに置換してから HTML 化する。
 */

const REDACT_PLACEHOLDER = '___REDACT___'

function escapeHtml(s) {
  const div = { innerHTML: '' }
  const el = document.createElement('div')
  el.textContent = s
  return el.innerHTML
}

/** プレースホルダー文字列を改行に置換し、改行を <br> に。placeholder が空の場合は \n → <br> のみ */
function applyNewlinePlaceholder(text, placeholder) {
  if (text == null) return ''
  let t = String(text)
  if (placeholder != null && placeholder !== '') {
    t = t.split(placeholder).join('\n')
  }
  return t.replace(/\n/g, '<br>')
}

export function extractRedactions(text) {
  const keys = []
  const replaced = text.replace(/\{([^{}]*)\}/g, (_, key) => {
    const i = keys.length
    keys.push(key)
    return REDACT_PLACEHOLDER + i + REDACT_PLACEHOLDER
  })
  return { text: replaced, keys }
}

function parseTableRow(line) {
  if (!/^\|.+\|$/.test(line)) return null
  const cells = line.split('|').map((s) => s.trim())
  if (cells[0] === '') cells.shift()
  if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop()
  return cells
}

/** 先頭行が列幅指定なら true。数値のみ＝%、数値+px＝ピクセル、空＝auto */
function isWidthRow(cells) {
  return cells.every((c) => {
    if (c === '') return true
    if (/^\d+%?$/.test(c)) return true
    if (/^\d+px$/i.test(c)) return true
    return false
  })
}

function normalizeColWidth(c) {
  if (c === '') return 'auto'
  if (/^\d+px$/i.test(c)) return c
  if (c.endsWith('%')) return c
  return c + '%'
}

function tableToHtml(rows, options) {
  const parsed = rows.map(parseTableRow).filter(Boolean)
  if (parsed.length === 0) return ''
  const placeholder = options && options.newlinePlaceholder
  const first = parsed[0]
  let dataRows = parsed
  let colWidths = null
  if (isWidthRow(first)) {
    colWidths = first.map((c) => normalizeColWidth(c))
    dataRows = parsed.slice(1)
  }
  let tableStyle = ''
  if (colWidths && colWidths.length > 0) {
    const percentValues = colWidths.map((w) => (w.endsWith('%') ? parseInt(w, 10) : NaN)).filter((n) => !Number.isNaN(n))
    if (percentValues.length === colWidths.length && percentValues.every((n) => n > 0)) {
      const sum = percentValues.reduce((a, b) => a + b, 0)
      if (sum <= 100) tableStyle = ' style="width:' + sum + '%"'
    }
  }
  let buf = '<table class="book-table"' + tableStyle + '>'
  if (colWidths && colWidths.length > 0) {
    buf += '<colgroup>'
    for (const w of colWidths) {
      if (w === 'auto') buf += '<col style="width:auto">'
      else buf += '<col style="width:' + w + '">'
    }
    buf += '</colgroup>'
  }
  buf += '<tbody>'
  dataRows.forEach((cells, rowIndex) => {
    buf += '<tr>'
    const isFirstDataRow = rowIndex === 0 && colWidths != null
    for (let ci = 0; ci < cells.length; ci++) {
      const w = isFirstDataRow && colWidths && colWidths[ci] ? ' style="width:' + colWidths[ci] + '"' : ''
      const c = cells[ci] != null ? cells[ci] : ''
      const cellHtml = escapeHtml(c).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      buf += '<td' + w + '>' + applyNewlinePlaceholder(cellHtml, placeholder) + '</td>'
    }
    buf += '</tr>'
  })
  buf += '</tbody></table>'
  return buf
}

/** <...> の内側が数字と|だけなら比率行。空は「残り」。例: <80|> → [80,20], <|20> → [80,20], <20|20|> → [20,20,60] */
function parseRatioLine(line) {
  const t = line.trim()
  if (!t.startsWith('<') || !t.endsWith('>')) return null
  const inner = t.slice(1, -1)
  if (!/^[\d|]*$/.test(inner)) return null
  const parts = inner.split('|').map((s) => (s.trim() === '' ? null : parseInt(s, 10)))
  if (parts.length === 0 || parts.every((p) => p === null)) return null
  const sum = parts.reduce((a, p) => a + (p != null ? p : 0), 0)
  const restCount = parts.filter((p) => p == null).length
  const rest = restCount > 0 ? (100 - sum) / restCount : 0
  return parts.map((p) => (p != null ? p : rest))
}

/** 開始行か: <|> または <80|20> / <80|> / <|20> / <20|20|> など */
function isSplitOpener(line) {
  const t = line.trim()
  if (t === '<|>') return true
  return t.startsWith('<') && t.endsWith('>') && /^[\d|]*$/.test(t.slice(1, -1)) && t.length > 3
}

/** 終了行は <|> のみ */
function isSplitCloser(line) {
  return line.trim() === '<|>'
}

/** 開始行＋ブロック行から比率と内容を取得。開始行が比率ならそれを使い、でなければ blockLines[0] を比率に */
function getSplitRatioAndContent(openerLine, blockLines) {
  let ratios = parseRatioLine(openerLine)
  let contentLines = blockLines
  if (ratios == null && blockLines.length > 0) {
    ratios = parseRatioLine(blockLines[0])
    if (ratios != null) contentLines = blockLines.slice(1)
  }
  if (ratios == null) ratios = [50, 50]
  return { ratios, contentLines }
}

/** | を含まない行を、次の行の先頭セルに改行で結合した行リストに変換 */
function mergeNoPipeLinesIntoNext(contentLines) {
  const rows = []
  let pending = ''
  for (const ln of contentLines) {
    if (!ln.includes('|')) {
      pending = pending ? pending + '\n' + ln : ln
      continue
    }
    const cells = ln.split('|').map((s) => s.trim())
    const first = pending ? pending + '\n' + (cells[0] || '') : (cells[0] || '')
    pending = ''
    rows.push([first, ...cells.slice(1)])
  }
  if (pending) rows.push([pending])
  return rows
}

/** split ブロックを HTML に。列間に線を入れる。行の区切りは実際の改行のみ。セル内のプレースホルダーは改行表示に */
function parseSplitBlock(openerLine, blockLines, options) {
  const { ratios, contentLines } = getSplitRatioAndContent(openerLine, blockLines)
  const placeholder = options && options.newlinePlaceholder
  let contentStr = contentLines.join('\n')
  if (placeholder != null && placeholder !== '') {
    contentStr = contentStr.split(placeholder).join('\n')
  }
  const expanded = contentStr.split('\n')
  const rows = mergeNoPipeLinesIntoNext(expanded)
  const columns = ratios.map(() => [])
  for (const cells of rows) {
    for (let c = 0; c < ratios.length; c++) {
      const text = cells[c] != null ? cells[c] : ''
      const cellHtml = escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      columns[c].push(applyNewlinePlaceholder(cellHtml, placeholder))
    }
  }
  const template = ratios.map((p) => Math.max(0, p).toFixed(2) + '%').join(' ')
  const colCount = ratios.length
  const ratioSum = ratios.reduce((a, b) => a + b, 0)
  const widthStyle = ratioSum > 0 && ratioSum < 100 ? 'width:' + ratioSum.toFixed(2) + '%;' : ''
  let buf = '<div class="book-split book-split-cols-' + colCount + '" style="' + widthStyle + 'display:grid;grid-template-columns:' + template + ';gap:0 0;">'
  const rowCount = Math.max(...columns.map((col) => col.length), 1)
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < columns.length; c++) {
      buf += '<div class="book-split-cell">' + (columns[c][r] || '') + '</div>'
    }
  }
  buf += '</div>'
  return buf
}

/** 見出しやアンカー用の id を生成（同一ページ内リンク用） */
function toSlug(text) {
  return String(text).trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_\-.\u3040-\u9FFF]/g, '')
}

function parseSegmentToHtml(segment, keys, options) {
  const lines = segment.split(/\n/)
  const out = []
  let inList = false
  const placeholder = options && options.newlinePlaceholder

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const h1 = line.match(/^#\s+(.+)$/)
    const h2 = line.match(/^##\s+(.+)$/)
    const h3 = line.match(/^###\s+(.+)$/)
    const h4 = line.match(/^####\s+(.+)$/)
    const ul = line.match(/^-\s+(.*)$/)
    const hr = line.trim() === '---'

    if (h1) {
      if (inList) { out.push('</ul>'); inList = false }
      const id = toSlug(h1[1])
      const idAttr = id ? ' id="' + escapeHtml(id).replace(/"/g, '&quot;') + '"' : ''
      out.push('<h1' + idAttr + '>', h1[1], '</h1>')
      continue
    }
    if (h2) {
      if (inList) { out.push('</ul>'); inList = false }
      const id = toSlug(h2[1])
      const idAttr = id ? ' id="' + escapeHtml(id).replace(/"/g, '&quot;') + '"' : ''
      out.push('<h2' + idAttr + '>', h2[1], '</h2>')
      continue
    }
    if (h3) {
      if (inList) { out.push('</ul>'); inList = false }
      const id = toSlug(h3[1])
      const idAttr = id ? ' id="' + escapeHtml(id).replace(/"/g, '&quot;') + '"' : ''
      const text = escapeHtml(h3[1])
      out.push('<div class="book-h3"' + idAttr + '><span class="book-h3-text">', text, '</span><span class="book-h3-line" aria-hidden="true"></span></div>')
      continue
    }
    if (h4) {
      if (inList) { out.push('</ul>'); inList = false }
      const id = toSlug(h4[1])
      const idAttr = id ? ' id="' + escapeHtml(id).replace(/"/g, '&quot;') + '"' : ''
      out.push('<h4' + idAttr + '>', h4[1], '</h4>')
      continue
    }
    if (hr) {
      if (inList) { out.push('</ul>'); inList = false }
      out.push('<hr>')
      continue
    }
    if (ul) {
      if (!inList) { out.push('<ul>'); inList = true }
      out.push('<li>', ul[1], '</li>')
      continue
    }
    if (isSplitOpener(line)) {
      if (inList) { out.push('</ul>'); inList = false }
      const blockLines = []
      let j = i + 1
      while (j < lines.length && !isSplitCloser(lines[j])) {
        blockLines.push(lines[j])
        j++
      }
      out.push(parseSplitBlock(line, blockLines, options))
      i = j
      continue
    }
    if (/^\|.+\|$/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false }
      const tableRows = []
      let j = i
      while (j < lines.length && /^\|.+\|$/.test(lines[j])) {
        tableRows.push(lines[j])
        j++
      }
      out.push(tableToHtml(tableRows, options))
      i = j - 1
      continue
    }
    if (inList) { out.push('</ul>'); inList = false }
    // **bold**、@見出し（同一ページ内の #〜#### のテキストと一致するときだけリンク。別fileにはリンクしない）
    let boldReplaced = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    const stripAtLinks = options && options.stripAtLinks
    const validIds = options && options.validHeadingIds
    boldReplaced = boldReplaced.replace(/@([a-zA-Z0-9_\-\u3040-\u9FFF]+)/g, (_, cell) => {
      if (stripAtLinks) return '' // テスト時・採点時は @xxx ごと削除
      const slug = toSlug(cell)
      if (validIds && slug && validIds.has(slug)) {
        const safe = escapeHtml(slug).replace(/"/g, '&quot;')
        return '<a href="#' + safe + '">' + escapeHtml(cell) + '</a>'
      }
      return escapeHtml(cell)
    })
    out.push(applyNewlinePlaceholder(boldReplaced, placeholder), '\n')
  }
  if (inList) out.push('</ul>')

  let html = out.join('')
  html = html.replace(/\n/g, '<br>')
  // プレースホルダーを伏字 span に戻す
  const placeholderRe = new RegExp(REDACT_PLACEHOLDER + '(\\d+)' + REDACT_PLACEHOLDER, 'g')
  html = html.replace(placeholderRe, (_, i) => {
    const key = keys[parseInt(i, 10)]
    if (key == null) return ''
    const escaped = escapeHtml(key)
    const attrKey = escaped.replace(/"/g, '&quot;')
    return `<span class="redaction" data-redact-key="${attrKey}" data-redact-index="${i}">${escaped}</span>`
  })
  return html
}

export function parseContentToSegments(content) {
  const { text, keys } = extractRedactions(content)
  const parts = []
  const re = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'html', raw: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'code', lang: match[1] || 'text', raw: match[2] })
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'html', raw: text.slice(lastIndex) })
  }
  return { parts, keys }
}

export function segmentsToHtml(parts, keys, options) {
  return parts.map((p) => {
    if (p.type === 'code') return { type: 'code', lang: p.lang, raw: p.raw }
    return { type: 'html', html: parseSegmentToHtml(p.raw, keys, options) }
  })
}

/** コンテンツを閲覧時と同じように1つのHTML文字列にレンダリング（テスト用など）。options: { newlinePlaceholder, validHeadingIds } */
export function renderContentToHtml(content, options) {
  const { parts, keys } = parseContentToSegments(content)
  const headings = getHeadings(content)
  const opts = { ...options, validHeadingIds: options?.validHeadingIds ?? new Set(headings.map((h) => h.id)) }
  const segments = segmentsToHtml(parts, keys, opts)
  let out = ''
  for (const seg of segments) {
    if (seg.type === 'code') {
      const escaped = escapeHtml(seg.raw)
      out += '<pre class="segment-code"><code class="language-' + escapeHtml(seg.lang) + '">' + escaped + '</code></pre>'
    } else {
      out += seg.html
    }
  }
  return out
}

/** 伏字の正解一覧（表示順）を取得 */
export function getRedactionKeys(content) {
  const keys = []
  content.replace(/\{([^{}]*)\}/g, (_, key) => keys.push(key))
  return keys
}

/** 目次用：見出し一覧を取得（コードブロック外のみ）。{ level: 1|2|3|4, text, id } */
export function getHeadings(content) {
  const text = content.replace(/```[\s\S]*?```/g, '') // コードブロックを除去
  const headings = []
  const re = /^(#{1,4})\s+(.+)$/gm
  let m
  while ((m = re.exec(text)) !== null) {
    const level = m[1].length
    const textContent = m[2].trim()
    const id = toSlug(textContent)
    if (id) headings.push({ level, text: textContent, id })
  }
  return headings
}
