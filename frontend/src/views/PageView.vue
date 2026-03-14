<template>
  <div class="page-view">
    <template v-if="page">
      <div class="page-toolbar">
        <label class="toggle-label">
          <span class="toggle-text">編集</span>
          <input type="checkbox" v-model="editMode" class="toggle-check" />
          <span class="toggle-slider"></span>
          <span class="toggle-text">閲覧</span>
        </label>
        <template v-if="!editMode">
          <button class="btn-test" @click="openTestDialog">テスト作成</button>
          <button
            class="btn-toc"
            :class="{ 'btn-toc--on': showToc }"
            @click="showToc = !showToc"
          >目次表示</button>
          <span v-if="recentAchievement.count > 0" class="recent-achievement">
            {{ recentAchievement.earned }}/{{ recentAchievement.total }}
            <span class="recent-achievement-label">直近達成率: {{ recentAchievement.percentage }}%</span>
          </span>
        </template>
      </div>

      <div v-if="editMode" class="page-edit">
        <textarea
          v-model="localContent"
          class="page-textarea"
          placeholder="# 見出しや - リスト、```コード```、{伏字} が使えます"
          @blur="saveContent"
        />
      </div>
      <div v-else class="page-read">
        <nav v-if="showToc && tocHeadings.length > 0" class="page-toc">
          <h4 class="toc-title">目次</h4>
          <ul class="toc-list">
            <li
              v-for="(h, i) in tocHeadings"
              :key="i"
              class="toc-item"
              :class="'toc-item--h' + h.level"
            >
              <a href="#" class="toc-link" @click.prevent="scrollToHeading(h.id)">{{ h.text }}</a>
            </li>
          </ul>
        </nav>
        <ContentRenderer
          :content="displayContent"
          :parser-options="settings.parserOptions"
          @hover="onRedactionHover"
        />
      </div>

      <footer v-if="!editMode && (hasHoverCounts || hasTestResults)" class="page-footer">
        <section v-if="hasHoverCounts" class="footer-section tag-cloud">
          <h4>ホバー履歴</h4>
          <div class="tags">
            <span
              v-for="(count, key) in hoverCounts"
              :key="key"
              class="tag"
            >{{ key }} {{ count }}times</span>
          </div>
        </section>
        <section v-if="hasTestResults" class="footer-section test-results">
          <h4>テスト結果</h4>
          <ul>
            <li v-for="(r, i) in testResults" :key="i">
              {{ formatDate(r.date) }} — {{ r.score }}点
            </li>
          </ul>
        </section>
      </footer>

      <TestDialog
        v-if="showTestDialog"
        :page-id="pageId"
        :content="displayContent"
        :parser-options="settings.parserOptions"
        @close="showTestDialog = false"
        @submit="onTestSubmit"
      />
      <TestResultModal
        v-if="showResultModal"
        :result-html="resultModalData.resultHtml"
        :correct="resultModalData.correct"
        :total="resultModalData.total"
        :score="resultModalData.score"
        @close="showResultModal = false"
      />
    </template>
    <div v-else class="page-not-found">
      <p>ページが見つかりません</p>
      <p>グループを作成して、ページを作成してください</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { settings } from '../settings.js'
import { store } from '../store.js'
import ContentRenderer from '../components/ContentRenderer.vue'
import TestDialog from '../components/TestDialog.vue'
import TestResultModal from '../components/TestResultModal.vue'
import { getHeadings } from '../contentParser.js'

const route = useRoute()

const pageId = computed(() => {
  const p = route.params.id
  return p === undefined || p === '' ? 'top' : p
})

const page = computed(() => store.getPageById(pageId.value))

const editMode = ref(false)
const localContent = ref('')

const displayContent = computed(() => store.getContent(pageId.value))

watch(displayContent, (v) => { localContent.value = v }, { immediate: true })

function saveContent() {
  store.setContent(pageId.value, localContent.value)
}

const hoverCounts = computed(() => store.getHoverCounts(pageId.value))
const testResults = computed(() => store.getTestResults(pageId.value))
const recentAchievement = computed(() => store.getRecentAchievement(pageId.value))
const tocHeadings = computed(() => getHeadings(displayContent.value))
const showToc = ref(false)
const hasHoverCounts = computed(() => Object.keys(hoverCounts.value).length > 0)
const hasTestResults = computed(() => testResults.value.length > 0)

function onRedactionHover(key) {
  store.recordHover(pageId.value, key)
}

const showTestDialog = ref(false)
const showResultModal = ref(false)
const resultModalData = ref({
  resultHtml: '',
  correct: 0,
  total: 0,
  score: 0,
})
function openTestDialog() {
  showTestDialog.value = true
}
function onTestSubmit(payload) {
  store.addTestResult(pageId.value, payload.score, new Date().toISOString())
  showTestDialog.value = false
  resultModalData.value = {
    resultHtml: payload.resultHtml,
    correct: payload.correct,
    total: payload.total,
    score: payload.score,
  }
  showResultModal.value = true
}

function formatDate(iso) {
  try {
    const d = new Date(iso)
    return isNaN(d.getTime()) ? iso : d.toLocaleString('ja-JP')
  } catch (_) {
    return iso
  }
}

function scrollToHeading(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  el.classList.add('toc-flash')
  setTimeout(() => el.classList.remove('toc-flash'), 800)
}
</script>

<style scoped>
.page-view {
  padding: 1rem 2rem 2rem;
  margin: 0 auto;
  min-height: 100%;
}
.page-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-muted);
}
.toggle-check {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-slider {
  position: relative;
  width: 2.5rem;
  height: 1.25rem;
  background: var(--border);
  border-radius: 1.25rem;
  transition: background 0.2s;
}
.toggle-slider::after {
  content: '';
  position: absolute;
  width: 1rem;
  height: 1rem;
  left: 2px;
  top: 2px;
  background: var(--text);
  border-radius: 50%;
  transition: transform 0.2s;
}
.toggle-check:checked + .toggle-slider {
  background: var(--accent);
}
.toggle-check:checked + .toggle-slider::after {
  transform: translateX(1.25rem);
}
.page-textarea {
  width: 100%;
  min-height: 400px;
  padding: 1rem;
  font-size: 0.9375rem;
  font-family: inherit;
  background: var(--code-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  resize: vertical;
}
.page-read {
  margin-bottom: 2rem;
}
.page-footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  font-size: 0.875rem;
  color: var(--text-muted);
}
.footer-section h4 {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}
.tag-cloud .tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.tag {
  background: var(--nav-hover);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
.test-results ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.test-results li {
  margin: 0.25rem 0;
}
.btn-test {
  padding: 0.4rem 0.75rem;
  font-size: 0.875rem;
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-test:hover {
  opacity: 0.9;
}
.btn-toc {
  padding: 0.4rem 0.75rem;
  font-size: 0.875rem;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
}
.btn-toc:hover {
  color: var(--text);
}
.btn-toc--on {
  background: var(--accent);
  color: var(--bg);
  border-color: var(--accent);
}
.page-toc {
  margin-bottom: 1.25rem;
  padding: 1rem 1.25rem;
  background: var(--nav-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.toc-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin: 0 0 0.5rem;
}
.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.toc-item { margin: 0.2rem 0; }
.toc-item--h1 { padding-left: 0; }
.toc-item--h2 { padding-left: 1rem; }
.toc-item--h3 { padding-left: 2rem; }
.toc-item--h4 { padding-left: 3rem; }
.toc-link {
  color: var(--accent);
  text-decoration: none;
  font-size: 0.9375rem;
}
.toc-link:hover { text-decoration: underline; }
.recent-achievement {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-left: 0.5rem;
}
.recent-achievement-label {
  margin-left: 0.35rem;
}
.page-not-found {
  padding: 2rem;
  color: var(--text-muted);
}
</style>
