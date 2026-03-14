<template>
  <Teleport to="body">
    <div
      class="ai-tutorial-overlay"
      role="dialog"
      aria-modal="true"
      @click="$emit('close')"
    >
      <div class="ai-tutorial-window" @click.stop>
        <div class="ai-tutorial-header">
          <h2 class="ai-tutorial-title">AI Tutorial</h2>
          <button type="button" class="dialog-close" aria-label="閉じる" @click="$emit('close')">×</button>
        </div>
        <p class="ai-tutorial-intro">AI にテキスト内容を作ってもらうときのコピペ用プロンプト例です。下の文例をコピーして AI に貼り付け、必要に応じて編集してください。</p>
        <div class="ai-tutorial-body">
          <section v-for="(item, idx) in examples" :key="idx" class="ai-tutorial-section">
            <h4 class="ai-tutorial-section-label">{{ item.title }}</h4>
            <p v-if="item.note" class="ai-tutorial-note">{{ item.note }}</p>
            <div class="ai-tutorial-block-wrap">
              <pre class="ai-tutorial-pre">{{ item.prompt }}</pre>
              <button type="button" class="ai-tutorial-copy" @click="copy(idx)">{{ copiedIdx === idx ? 'コピーしました' : 'コピー' }}</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

defineEmits(['close'])

const copiedIdx = ref(null)

const examples = [
  {
    title: '例1: 歴史年表',
    note: '左に説明、右に年号。重要語は { } で囲むと閲覧時に伏字になりホバーで表示。',
    prompt: `以下のスタイルで出力してください。
重要な単語は、{ } で囲み、説明の中で改行するときは、\\nを入れてください。
<70|30>
説明|{年号}年
<|>

例: 江戸幕府が開かれた。\\n武家諸法度で大名を統制。|{1603}年`,
  },
  {
    title: '例2: 用語集・語彙',
    note: '用語を伏字にし、ホバーで定義を表示。',
    prompt: `以下のスタイルで出力してください。
用語は { } で囲み、閲覧時にホバーで説明が表示されるようにしてください。説明内の改行は \\n を使ってください。
<60|40>
説明（定義）|{用語}
<|>

例: 光合成により二酸化炭素と水からグルコースを合成する。\\n葉緑体で行われる。|{光合成}`,
  },
  {
    title: '例3: 一問一答',
    note: '左に問題、右に答え（伏字）。',
    prompt: `以下のスタイルで出力してください。
答えは { } で囲んで伏字にし、閲覧時にホバーで表示されるようにしてください。
<70|30>
問題文|{答え}
<|>

例: 日本の首都は？|{東京}`,
  },
  {
    title: '例4: 年代順イベント',
    note: '時系列の出来事を年と説明の2列で。',
    prompt: `以下のスタイルで出力してください。
重要な語句は { } で囲んでください。改行は \\n です。
<25|75>
年|出来事・説明
<|>

例: 1868年|{明治維新}。\\n{戊辰戦争}が起こる。`,
  },
  {
    title: '例5: 英単語・意味',
    note: '英単語を伏字にして、ホバーで意味を表示。',
    prompt: `以下のスタイルで出力してください。
英単語を { } で囲み、閲覧時にホバーで意味が表示されるようにしてください。
<50|50>
意味・例文|{英単語}
<|>

例: 〜を実現する、達成する|{achieve}`,
  },
]

function copy(idx) {
  const text = examples[idx].prompt
  navigator.clipboard.writeText(text).then(() => {
    copiedIdx.value = idx
    setTimeout(() => { copiedIdx.value = null }, 1500)
  })
}
</script>

<style scoped>
.ai-tutorial-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  box-sizing: border-box;
  cursor: pointer;
}
.ai-tutorial-window {
  cursor: default;
  background: var(--nav-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  min-width: 480px;
  max-width: 640px;
  max-height: calc(100vh - 4rem);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}
.ai-tutorial-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.ai-tutorial-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text);
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
.ai-tutorial-intro {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  line-height: 1.5;
}
.ai-tutorial-body {
  padding: 1rem 1.25rem;
  overflow-y: auto;
}
.ai-tutorial-section {
  margin-bottom: 1.5rem;
}
.ai-tutorial-section:last-child { margin-bottom: 0; }
.ai-tutorial-section-label {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.35rem;
}
.ai-tutorial-note {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin: 0 0 0.5rem;
  line-height: 1.4;
}
.ai-tutorial-block-wrap {
  position: relative;
}
.ai-tutorial-pre {
  font-size: 0.8125rem;
  background: var(--code-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin: 0;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  padding-right: 4.5rem;
}
.ai-tutorial-copy {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: var(--nav-hover);
  color: var(--text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.ai-tutorial-copy:hover {
  background: var(--border);
}
</style>
