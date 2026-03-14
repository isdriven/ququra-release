<template>
  <div class="result-backdrop" @click.self="$emit('close')">
    <div class="result-dialog" :style="mainPaneWidth != null ? { width: mainPaneWidth + 'px' } : undefined">
      <div class="dialog-header">
        <h3>採点結果</h3>
        <div class="score-display">
          <span class="score-fraction">{{ correct }}/{{ total }}</span>
          <span class="score-percent">{{ score }}点</span>
        </div>
        <button class="dialog-close" aria-label="閉じる" @click="$emit('close')">×</button>
      </div>
      <div class="dialog-body">
        <div class="result-content content-rendered" v-html="resultHtml"></div>
        <div class="result-actions">
          <button type="button" class="btn-close" @click="$emit('close')">閉じる</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

defineProps({
  resultHtml: { type: String, default: '' },
  correct: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
})
defineEmits(['close'])

const mainPaneWidth = ref(null)
onMounted(() => {
  const el = document.querySelector('.main-pane')
  if (el) mainPaneWidth.value = el.offsetWidth
})
</script>

<style scoped>
.result-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}
.result-dialog {
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
.result-dialog[style*="width"] {
  min-width: 0;
  max-width: none;
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  gap: 1rem;
}
.dialog-header h3 { margin: 0; font-size: 1.1rem; }
.score-display {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}
.score-fraction {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.02em;
}
.score-percent {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.02em;
}
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
.result-actions { margin-top: 1rem; }
.btn-close {
  padding: 0.5rem 1rem;
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9375rem;
}
.btn-close:hover { opacity: 0.95; }
.result-content {
  line-height: 1.6;
}
.result-content.content-rendered :deep(.book-table),
.result-content.content-rendered :deep(.book-split) {
  margin: 0.5rem 0;
}
.result-content.content-rendered :deep(.book-table td) {
  border: 1px solid var(--border);
  padding: 0.35rem 0.5rem;
}
.result-content.content-rendered :deep(.book-split-cell) {
  padding: 0.35rem 0.5rem;
}
.result-content :deep(.result-correct) {
  border: 2px solid #2563eb;
  border-radius: 4px;
  padding: 0.1rem 0.25rem;
  background: rgba(37, 99, 235, 0.08);
}
.result-content :deep(.result-wrong) {
  border: 2px solid #dc2626;
  border-radius: 4px;
  padding: 0.1rem 0.25rem;
  background: rgba(220, 38, 38, 0.08);
}
</style>
