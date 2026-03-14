<template>
  <Teleport to="body">
    <div
      class="tutorial-overlay"
      role="dialog"
      aria-modal="true"
      @click="onOverlayClick"
    >
      <div class="tutorial-window" @click.stop>
        <div class="dialog-header">
          <h2 class="tutorial-title">Flash Cards? no, this is Flash Notes!</h2>
          <button type="button" class="dialog-close" aria-label="閉じる" @click="$emit('close')">×</button>
        </div>
        <div class="dialog-body" @mouseover="onRedactionOver" @mouseout="onRedactionOut">
          <template v-for="(section, sIdx) in sections" :key="sIdx">
            <section class="tutorial-block">
              <h3 class="tutorial-block-title">{{ section.title }}</h3>
              <p v-if="section.intro" class="tutorial-intro">{{ section.intro }}</p>
              <template v-if="section.examples">
                <div v-for="(item, idx) in section.examples" :key="idx" class="tutorial-section">
                  <h4 class="section-label">{{ item.label }}</h4>
                  <pre class="tutorial-pre">{{ item.raw }}</pre>
                  <div class="tutorial-rendered segment-html" v-html="item.rendered"></div>
                </div>
              </template>
              <template v-else-if="section.items">
                <div v-for="(item, idx) in section.items" :key="idx" class="tutorial-text-item">
                  <h4 class="section-label">{{ item.title }}</h4>
                  <p class="tutorial-text-body">{{ item.body }}</p>
                </div>
              </template>
            </section>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { renderContentToHtml } from '../contentParser.js'
import { settings } from '../settings.js'

const emit = defineEmits(['close'])

const parserOptions = computed(() => settings.parserOptions)

const markdownExamples = [
  {
    label: '見出し',
    raw: `# 見出し1（上下線）
## 見出し2
### 見出し3（右に罫線）
#### 見出し4（左に太線）`,
  },
  {
    label: 'リスト',
    raw: `- 項目A
- 項目B
- 項目C`,
  },
  {
    label: '太字',
    raw: `**太字**にできます。`,
  },
  {
    label: 'コードブロック',
    raw: `\`\`\`javascript
const x = 1;
\`\`\``,
  },
  {
    label: '伏字（閲覧時に隠れ、ホバーで表示）',
    raw: `答えは {42} です。{キーワード} を覚えましょう。`,
  },
  {
    label: 'テーブル（先頭行を数値にすると列幅％）。合計100％未満ならテーブル幅もその割合に。セル内改行は \\n または Option の「改行として表示する文字列」。',
    raw: `| 50 | 50 |
| 左 | 右 |`,
  },
  {
    label: 'テーブル（列幅のみ指定）',
    raw: `| A | B |
| 1 | 2 |
| 3 | 4 |`,
  },
  {
    label: '@見出し で同一ページ内リンク。#〜#### の見出しテキストと一致するときだけリンクになり、別ファイルにはリンクしません。',
    raw: `# セクションA
ここから @セクションA へ戻れます。`,
  },
  {
    label: '--- で水平線',
    raw: `上
---
下`,
  },
  {
    label: 'Split（縦割り）。<|> で等分。<70|30> で左70％・右30％。空は残り。',
    raw: `<70|30>
左の列| 右の列
<|>`,
  },
  {
    label: 'Split（三分割以上）',
    raw: `<80|10|10>
左 80%| 中央 10%| 右 10%
<|>`,
  },
]

const bookItems = [
  {
    title: 'FILE メニュー',
    body: '画面上部の FILE をクリックすると、NEW BOOK・EXPORT・現在利用可能なブック一覧が表示されます。',
  },
  {
    title: 'NEW BOOK',
    body: '現在のブックを別名でコピーして新規ブックを作成します（例: ququra-book-〇〇）。新規bookを開いた形になります。',
  },
  {
    title: 'EXPORT',
    body: '現在のブックを別名でコピーして保存します。バックアップや別用途用のコピーに使えます。',
  },
  {
    title: 'ブックの切り替え',
    body: '一覧に表示されたブック名をクリックすると、そのブックに切り替わります。編集内容は各ブックごとに保存されます。',
  },
  {
    title: 'フォント（Option）',
    body: 'フォントの選択はブックごとに保存されます。ブック読み込み時に、選択されていたフォントがこの環境にない場合（別のPCで使っていたブックや、フォントが削除された場合など）は、未選択に戻ります。',
  },
]

const sections = computed(() => {
  const opts = parserOptions.value
  return [
    {
      title: 'マークダウン',
      intro: '編集モードで入力すると、閲覧時にそのまま反映されます。',
      examples: markdownExamples.map((item) => ({
        ...item,
        rendered: renderContentToHtml(item.raw, opts),
      })),
    },
    {
      title: 'ブックの取り扱い',
      intro: 'ブックは exe と同じフォルダに置かれたものを読み込みます。友達や誰かから受け取ったブックも利用できます。複数のブックを切り替えて使えます。',
      items: bookItems,
    },
  ]
})

function onOverlayClick(e) {
  if (e.target === e.currentTarget) emit('close')
}

function onRedactionOver(e) {
  const el = e.target
  if (el && el.classList && el.classList.contains('redaction')) el.classList.add('revealed')
}

function onRedactionOut(e) {
  const el = e.target
  if (el && el.classList && el.classList.contains('redaction')) el.classList.remove('revealed')
}
</script>

<style scoped>
.tutorial-overlay {
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
  cursor: pointer;
}
.tutorial-window { cursor: default; }
.tutorial-window {
  background: var(--nav-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  min-width: 420px;
  max-width: 560px;
  max-height: calc(100vh - 4rem);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}
.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.tutorial-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
}
.dialog-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
  padding: 0 0.25rem;
  flex-shrink: 0;
  margin-left: 0.5rem;
}
.dialog-close:hover { color: var(--text); }
.dialog-body {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
}
.tutorial-intro {
  font-size: 0.9375rem;
  color: var(--text-muted);
  margin: 0 0 0.75rem;
  line-height: 1.5;
}
.tutorial-section {
  margin-bottom: 1.5rem;
}
.section-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
  margin: 0 0 0.5rem;
}
.tutorial-pre {
  font-size: 0.8125rem;
  background: var(--code-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin: 0 0 0.5rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
/* 本番のコンテンツ表示と同じフォント・色・背景 */
.tutorial-rendered {
  font-family: var(--content-font-family);
  font-size: var(--content-font-size);
  color: var(--text);
  line-height: 1.7;
  padding: 0.75rem 1rem;
  background: var(--main-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
}
.tutorial-block {
  margin-bottom: 2rem;
}
.tutorial-block:last-child { margin-bottom: 0; }
.tutorial-block-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.75rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--border);
}
.tutorial-text-item {
  margin-bottom: 1.25rem;
}
.tutorial-text-item:last-child { margin-bottom: 0; }
.tutorial-text-body {
  font-size: 0.9375rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}
.tutorial-rendered :deep(h1) {
  font-size: 1.5rem;
  margin: 1rem 0 0.5rem;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 0.4rem 0;
}
.tutorial-rendered :deep(h2) { font-size: 1.25rem; margin: 1rem 0 0.5rem; color: var(--accent); }
.tutorial-rendered :deep(.book-h3) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  margin: 0.75rem 0 0.5rem;
}
.tutorial-rendered :deep(.book-h3-text) { flex-shrink: 0; }
.tutorial-rendered :deep(.book-h3-line) {
  flex: 1;
  min-width: 0.5rem;
  border-bottom: 1px solid var(--border);
}
.tutorial-rendered :deep(h4) {
  font-size: 1.1rem;
  margin: 0.75rem 0 0.5rem;
  border-left: 20px solid var(--border);
  padding-left: 0.5rem;
}
.tutorial-rendered :deep(ul) { margin: 0.5rem 0; padding-left: 1.5rem; }
.tutorial-rendered :deep(li) { margin: 0.25rem 0; }
.tutorial-rendered :deep(hr) { border: none; border-top: 1px solid var(--border); margin: 1rem 0; }
.tutorial-rendered :deep(a) { color: var(--accent); text-decoration: none; }
.tutorial-rendered :deep(a:hover) { text-decoration: underline; }
.tutorial-rendered :deep(.book-table) {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 0.75rem 0;
  font-size: 0.9375rem;
}
.tutorial-rendered :deep(.book-table td) {
  border: 1px solid var(--border);
  padding: 0.35rem 0.6rem;
}
.tutorial-rendered :deep(.book-split) { margin: 0.75rem 0; }
.tutorial-rendered :deep(.book-split-cell) {
  min-width: 0;
  line-height: 1.6;
  padding: 0.5rem 0.75rem;
  border-right: 1px solid var(--border);
}
.tutorial-rendered :deep(.book-split-cols-2 .book-split-cell:nth-child(2n)),
.tutorial-rendered :deep(.book-split-cols-3 .book-split-cell:nth-child(3n)),
.tutorial-rendered :deep(.book-split-cols-4 .book-split-cell:nth-child(4n)),
.tutorial-rendered :deep(.book-split-cols-5 .book-split-cell:nth-child(5n)) {
  border-right: none;
}
.tutorial-rendered :deep(.redaction) {
  color: var(--main-bg);
  background-color: var(--main-bg);
  border: 1px dashed var(--text-muted);
  border-radius: 3px;
  padding: 0 2px;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s, border-color 0.15s;
}
.tutorial-rendered :deep(.redaction.revealed) {
  color: inherit;
  background-color: transparent;
  border-color: transparent;
}
.tutorial-rendered :deep(.segment-code),
.tutorial-rendered :deep(pre) {
  margin: 0.75rem 0;
  background: var(--code-bg);
  border-radius: 6px;
  padding: 1rem;
  font-size: 0.875rem;
}
.tutorial-rendered :deep(.segment-code code),
.tutorial-rendered :deep(pre code) {
  font-family: 'Consolas', 'Monaco', monospace;
  color: var(--code-fg);
}
</style>
