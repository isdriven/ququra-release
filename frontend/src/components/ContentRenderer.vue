<template>
  <div
    ref="contentRef"
    class="content-renderer"
    @mouseover="onMouseover"
    @mouseout="onMouseout"
    @click="onContentClick"
  >
    <template v-for="(seg, i) in segments" :key="i">
      <div v-if="seg.type === 'html'" class="segment-html" v-html="seg.html"></div>
      <div v-else-if="seg.type === 'code'" class="segment-code">
        <pre><code :class="'language-' + seg.lang" ref="codeEl">{{ seg.raw }}</code></pre>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onUpdated, ref } from 'vue'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.min.css'
import { getHeadings, parseContentToSegments, segmentsToHtml } from '../contentParser.js'

const props = defineProps({
  content: { type: String, default: '' },
  parserOptions: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['hover'])

const segments = computed(() => {
  const { parts, keys } = parseContentToSegments(props.content)
  const headings = getHeadings(props.content)
  const opts = { ...props.parserOptions, validHeadingIds: new Set(headings.map((h) => h.id)) }
  return segmentsToHtml(parts, keys, opts)
})

const contentRef = ref(null)

function onMouseover(e) {
  const el = e.target
  if (!el.classList || !el.classList.contains('redaction')) return
  el.classList.add('revealed')
  const key = el.getAttribute('data-redact-key')
  if (key != null) emit('hover', key)
}

function onMouseout(e) {
  const el = e.target
  if (!el.classList || !el.classList.contains('redaction')) return
  el.classList.remove('revealed')
}

/** 同一ページ内アンカー（#id）クリックで Vue Router に奪われないよう prevent してスクロール */
function onContentClick(e) {
  const el = e.target?.closest?.('a[href^="#"]')
  if (!el) return
  const href = el.getAttribute('href')
  if (!href || href === '#' || href.startsWith('#/')) return
  const id = decodeURIComponent(href.slice(1))
  if (!id) return
  e.preventDefault()
  const target = document.getElementById(id)
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function highlightCode() {
  const wrapper = contentRef.value
  if (!wrapper) return
  wrapper.querySelectorAll('pre code').forEach((el) => {
    if (el.classList.contains('hljs')) return
    hljs.highlightElement(el)
  })
}

onMounted(highlightCode)
onUpdated(highlightCode)
</script>

<style scoped>
.content-renderer {
  line-height: 1.7;
}
.segment-html :deep(h1) {
  font-size: 1.5rem;
  margin: 1rem 0 0.5rem;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 0.4rem 0;
}
.segment-html :deep(h2) { font-size: 1.25rem; margin: 1rem 0 0.5rem; color: var(--accent); }
.segment-html :deep(.book-h3) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  margin: 0.75rem 0 0.5rem;
}
.segment-html :deep(.book-h3-text) {
  flex-shrink: 0;
}
.segment-html :deep(.book-h3-line) {
  flex: 1;
  min-width: 0.5rem;
  border-bottom: 1px solid var(--border);
}
.segment-html :deep(h4) {
  font-size: 1.1rem;
  margin: 0.75rem 0 0.5rem;
  border-left: 20px solid var(--border);
  padding-left: 0.5rem;
}
.segment-html :deep(.toc-flash) {
  animation: toc-flash 0.8s ease;
}
@keyframes toc-flash {
  0% { background: rgba(56, 189, 248, 0.35); border-radius: 4px; }
  100% { background: transparent; }
}
.segment-html :deep(ul) { margin: 0.5rem 0; padding-left: 1.5rem; }
.segment-html :deep(li) { margin: 0.25rem 0; }
.segment-html :deep(hr) { border: none; border-top: 1px solid var(--border); margin: 1rem 0; }
.segment-html :deep(a) { color: var(--accent); text-decoration: none; }
.segment-html :deep(a:hover) { text-decoration: underline; }
.segment-html :deep(.book-table) {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 0.75rem 0;
  font-size: 0.9375rem;
}
.segment-html :deep(.book-table td) {
  border: 1px solid var(--border);
  padding: 0.35rem 0.6rem;
}
.segment-html :deep(.book-split) {
  margin: 0.75rem 0;
}
.segment-html :deep(.book-split-cell) {
  min-width: 0;
  line-height: 1.6;
  padding: 0.5rem 0.75rem;
  border-right: 1px solid var(--border);
}
.segment-html :deep(.book-split-cols-2 .book-split-cell:nth-child(2n)),
.segment-html :deep(.book-split-cols-3 .book-split-cell:nth-child(3n)),
.segment-html :deep(.book-split-cols-4 .book-split-cell:nth-child(4n)),
.segment-html :deep(.book-split-cols-5 .book-split-cell:nth-child(5n)) {
  border-right: none;
}
.segment-html :deep(.redaction) {
  color: var(--main-bg);
  background-color: var(--main-bg);
  border: 1px dashed var(--text-muted);
  border-radius: 3px;
  padding: 0 2px;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s, border-color 0.15s;
}
.segment-html :deep(.redaction.revealed) {
  color: inherit;
  background-color: transparent;
  border-color: transparent;
}
.segment-code {
  margin: 0.75rem 0;
  background: var(--code-bg);
  border-radius: 6px;
  overflow-x: auto;
}
.segment-code pre { margin: 0; padding: 1rem; font-size: 0.875rem; }
.segment-code code { font-family: 'Consolas', 'Monaco', monospace; }
</style>
