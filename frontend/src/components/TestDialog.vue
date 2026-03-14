<template>
  <div class="dialog-backdrop" @click.self="$emit('close')">
    <div class="dialog test-dialog" :style="mainPaneWidth != null ? { width: mainPaneWidth + 'px' } : undefined">
      <div class="dialog-header">
        <h3>テスト</h3>
        <button class="dialog-close" @click="$emit('close')">×</button>
      </div>
      <div class="dialog-body">
        <div class="test-content content-rendered" v-html="testHtml"></div>
        <div class="test-actions">
          <button class="btn-submit" @click="submit">提出</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getRedactionKeys, renderContentToHtml } from '../contentParser.js'

const props = defineProps({
  pageId: { type: String, required: true },
  content: { type: String, default: '' },
  parserOptions: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close', 'submit'])

const mainPaneWidth = ref(null)
onMounted(() => {
  const el = document.querySelector('.main-pane')
  if (el) mainPaneWidth.value = el.offsetWidth
})

const keys = computed(() => getRedactionKeys(props.content))

/** テスト時・採点時は @xxx を丸ごと削除 */
const testParserOptions = computed(() => ({ ...props.parserOptions, validHeadingIds: new Set(), stripAtLinks: true }))

const testHtml = computed(() => {
  const html = renderContentToHtml(props.content, testParserOptions.value)
  const keysList = keys.value
  let idx = 0
  return html.replace(/<span class="redaction" [^>]*>[\s\S]*?<\/span>/g, () => {
    const key = keysList[idx++] || ''
    const size = Math.max(2, key.length + 2)
    return `<input type="text" class="test-input" size="${size}" />`
  })
})

function submit() {
  const correctKeys = keys.value
  const inputsEl = document.querySelectorAll('.test-content .test-input')
  const answers = Array.from(inputsEl).map((el) => (el.value || '').trim())
  let correctCount = 0
  const results = []
  for (let i = 0; i < correctKeys.length; i++) {
    const ok = answers[i] === correctKeys[i]
    if (ok) correctCount++
    results.push({ isCorrect: ok })
  }
  const total = correctKeys.length
  const score = total ? Math.round((correctCount / total) * 100) : 0

  const viewHtml = renderContentToHtml(props.content, { ...props.parserOptions, validHeadingIds: new Set(), stripAtLinks: true })
  let ri = 0
  const resultHtml = viewHtml.replace(/<span class="redaction" [^>]*>([\s\S]*?)<\/span>/g, (_, inner) => {
    const r = results[ri++]
    const cls = r.isCorrect ? 'result-correct' : 'result-wrong'
    return `<span class="${cls}">${inner}</span>`
  })

  emit('submit', {
    score,
    correct: correctCount,
    total,
    resultHtml,
  })
}
</script>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.dialog {
  background: var(--nav-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  min-width: 400px;
  max-width: 90vw;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.dialog[style*="width"] {
  min-width: 0;
  max-width: none;
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}
.dialog-header h3 { margin: 0; font-size: 1.1rem; }
.dialog-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}
.dialog-body {
  padding: 1.25rem;
  overflow-y: auto;
}
.test-content {
  margin-bottom: 1rem;
  line-height: 1.6;
}
.test-content.content-rendered :deep(.book-table),
.test-content.content-rendered :deep(.book-split) {
  margin: 0.5rem 0;
}
.test-content.content-rendered :deep(.book-table td) {
  border: 1px solid var(--border);
  padding: 0.35rem 0.5rem;
}
.test-content.content-rendered :deep(.book-split-cell) {
  padding: 0.35rem 0.5rem;
}
.test-content :deep(.test-input) {
  border: 1px solid var(--accent);
  background: var(--code-bg);
  color: var(--text);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  box-sizing: border-box;
}
.test-actions { margin-top: 1rem; }
.btn-submit {
  padding: 0.5rem 1rem;
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
