<template>
  <Teleport to="body">
    <div
      class="option-overlay"
      role="dialog"
      aria-modal="true"
      @click="onOverlayClick"
    >
      <div class="option-window" @click.stop>
        <div class="dialog-header">
          <h3>Option</h3>
          <button type="button" class="dialog-close" aria-label="閉じる" @click="$emit('close')">×</button>
        </div>
        <div class="dialog-body">
          <section class="option-section">
            <h4>改行として表示する文字列</h4>
            <p class="option-hint">コンテンツ内のこの文字列を改行として表示します。空欄の場合は置換しません。例: \n, __n__</p>
            <input v-model="local.newlinePlaceholder" class="option-input" placeholder="例: \\n または __n__" />
          </section>
          <section class="option-section">
            <h4>フォント (font-family)</h4>
            <p class="option-hint">システムフォントまたは自分で追加したフォントから選択</p>
            <div class="font-select-row">
              <select v-model="local.fontFamily" class="font-select">
                <option value="">未選択</option>
                <optgroup label="システムフォント">
                  <option v-for="f in systemFonts" :key="'sys-'+f" :value="f">{{ f }}</option>
                </optgroup>
                <optgroup v-if="addedFontsList.length" label="自分で追加したフォント">
                  <option v-for="f in addedFontsList" :key="'usr-'+f" :value="f">{{ f }}</option>
                </optgroup>
              </select>
            </div>
          </section>
          <section class="option-section">
            <h4>フォントサイズ (px)</h4>
            <input v-model.number="local.fontSize" type="number" min="8" max="72" step="1" class="option-input option-input-number" placeholder="例: 16" />
          </section>
          <div class="option-actions">
            <button type="button" class="btn-apply" @click="apply">適用</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'
import { settings } from '../settings.js'
import { GetSystemFonts } from '../../wailsjs/go/main/App.js'

const emit = defineEmits(['close'])

const local = reactive({
  newlinePlaceholder: settings.newlinePlaceholder,
  fontFamily: settings.fontFamily,
  fontSize: settings.fontSize,
})
const systemFonts = ref([])
/** 設定に保存されている「自分で追加したフォント」一覧（bbolt から取得） */
const addedFontsList = computed(() => (settings.fontFamilyHistory || []).filter((f) => f))

watch(() => settings.newlinePlaceholder, (v) => { local.newlinePlaceholder = v }, { immediate: true })
watch(() => settings.fontFamily, (v) => { local.fontFamily = v }, { immediate: true })
watch(() => settings.fontSize, (v) => { local.fontSize = v }, { immediate: true })

onMounted(async () => {
  try {
    const list = await GetSystemFonts()
    if (Array.isArray(list)) systemFonts.value = list
  } catch (_) {}
})

function onOverlayClick(e) {
  if (e.target === e.currentTarget) emit('close')
}

function apply() {
  settings.newlinePlaceholder = local.newlinePlaceholder
  settings.fontFamily = local.fontFamily
  const px = Number(local.fontSize)
  settings.fontSize = Number.isFinite(px) && px >= 8 && px <= 72 ? String(px) : '16'
  settings.applyCssVars()
  settings.saveToBackend()
  emit('close')
}

</script>

<style scoped>
.option-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 2147483647;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  box-sizing: border-box;
}
.option-window {
  background: var(--nav-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  min-width: 380px;
  max-width: 480px;
  max-height: calc(100vh - 4rem);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.dialog-header h3 { margin: 0; font-size: 1.1rem; }
.dialog-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
  padding: 0 0.25rem;
}
.dialog-close:hover { color: var(--text); }
.dialog-body {
  padding: 1.25rem;
  overflow-y: auto;
}
.option-section { margin-bottom: 1.25rem; }
.option-section h4 { font-size: 0.8125rem; margin: 0 0 0.5rem; color: var(--text-muted); }
.option-radio { display: block; margin: 0.35rem 0; font-size: 0.9375rem; cursor: pointer; }
.option-radio input { margin-right: 0.5rem; }
.option-hint { font-size: 0.75rem; color: var(--text-muted); margin: 0.35rem 0 0.5rem; }
.option-input {
  width: 100%;
  padding: 0.4rem 0.5rem;
  font-size: 0.9375rem;
  background: var(--code-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-sizing: border-box;
}
.font-select-row { margin: 0.5rem 0; }
.font-select {
  width: 100%;
  padding: 0.5rem;
  font-size: 0.9375rem;
  background: var(--code-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-sizing: border-box;
}
.option-input-number { width: 6em; }
.option-actions { margin-top: 1rem; }
.btn-apply {
  padding: 0.5rem 1.25rem;
  font-size: 0.9375rem;
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-apply:hover { opacity: 0.95; }
.btn-reset {
  padding: 0.4rem 0.75rem;
  font-size: 0.875rem;
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.5);
  border-radius: 6px;
  cursor: pointer;
}
.btn-reset:hover { background: rgba(248, 113, 113, 0.3); }
</style>
