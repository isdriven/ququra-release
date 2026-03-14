import { reactive } from 'vue'
import { LoadSettings, SaveSettings, GetSystemFonts } from '../wailsjs/go/main/App.js'

const defaults = {
  newlinePlaceholder: '\\n',
  fontFamily: '',
  fontSize: '16',
  fontFamilyHistory: [],
}

const data = reactive({ ...defaults })

function addFontToHistory(font) {
  const f = (font || '').trim()
  if (!f) return
  const i = data.fontFamilyHistory.indexOf(f)
  if (i >= 0) data.fontFamilyHistory.splice(i, 1)
  data.fontFamilyHistory.unshift(f)
  data.fontFamilyHistory.splice(20)
}

function applyCssVars() {
  const root = document.documentElement
  root.style.setProperty('--content-font-family', data.fontFamily || 'inherit')
  const px = parseInt(data.fontSize, 10)
  root.style.setProperty('--content-font-size', (Number.isFinite(px) && px >= 8 ? px : 16) + 'px')
}

/** 起動時・ブック切り替え時に bbolt から設定を読み込む。選択フォントが利用不可の場合は未選択に戻す */
export async function loadSettingsFromBackend() {
  try {
    const loaded = await LoadSettings()
    if (loaded) {
      // 旧 newlineChar から移行: backslash_n → \n, actual → 空
      const fromOld = loaded.newlinePlaceholder == null && loaded.newlineChar != null
        ? (loaded.newlineChar === 'backslash_n' ? '\\n' : '')
        : loaded.newlinePlaceholder
      data.newlinePlaceholder = fromOld ?? defaults.newlinePlaceholder
      data.fontFamily = loaded.fontFamily ?? defaults.fontFamily
      const fs = loaded.fontSize ?? defaults.fontSize
      const px = typeof fs === 'string' ? parseInt(fs, 10) : fs
      data.fontSize = Number.isFinite(px) && px >= 8 ? String(px) : defaults.fontSize
      data.fontFamilyHistory = Array.isArray(loaded.fontFamilyHistory) ? loaded.fontFamilyHistory : defaults.fontFamilyHistory
      // 選択されていたフォントがこの環境にない場合は未選択に戻す（別PCで開いた・フォント削除など）
      const current = (data.fontFamily || '').trim()
      if (current) {
        let systemFonts = []
        try {
          const list = await GetSystemFonts()
          if (Array.isArray(list)) systemFonts = list
        } catch (_) {}
        const history = data.fontFamilyHistory || []
        const valid = new Set([...systemFonts, ...history])
        if (!valid.has(current)) data.fontFamily = ''
      }
      applyCssVars()
    }
  } catch (_) {}
}

/** Option で「反映」したときに bbolt に保存 */
export async function saveSettingsToBackend() {
  try {
    await SaveSettings({
      newlinePlaceholder: data.newlinePlaceholder,
      fontFamily: data.fontFamily,
      fontSize: data.fontSize,
      fontFamilyHistory: data.fontFamilyHistory || [],
    })
  } catch (_) {}
}

export const settings = {
  get newlinePlaceholder() { return data.newlinePlaceholder },
  set newlinePlaceholder(v) { data.newlinePlaceholder = v },
  get fontFamily() { return data.fontFamily },
  set fontFamily(v) { data.fontFamily = v; addFontToHistory(v) },
  get fontSize() { return data.fontSize },
  set fontSize(v) { data.fontSize = v },
  get fontFamilyHistory() { return data.fontFamilyHistory },
  get parserOptions() {
    return { newlinePlaceholder: data.newlinePlaceholder }
  },
  applyCssVars,
  saveToBackend: saveSettingsToBackend,
}
