<template>
  <div class="sort-page">
    <h1>ソートアルゴリズム</h1>
    <p class="intro">
      データを一定の順序に並べるアルゴリズムです。ここでは代表的な3つを紹介します。
    </p>

    <section class="lesson" v-for="section in sections" :key="section.id">
      <h2>{{ section.title }}</h2>
      <div class="content" v-html="section.content"></div>
      <div class="code-block" v-if="section.code">
        <pre><code>{{ section.code }}</code></pre>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const sections = computed(() => [
  {
    id: 'bubble',
    title: 'バブルソート',
    content: `
      <p>隣り合う要素を比較して、大小関係が逆なら入れ替える操作を、配列の末尾まで繰り返します。
      1回の走査で最も大きい要素が末尾に来るため、次は末尾を除いた範囲で同様に繰り返します。</p>
      <p><strong>計算量:</strong> 時間 O(n²)、空間 O(1)。安定なソートです。</p>
    `,
    code: `function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}`,
  },
  {
    id: 'quick',
    title: 'クイックソート',
    content: `
      <p>ピボット（基準値）を1つ選び、それより小さい要素と大きい要素に分割し、
      それぞれに対して再帰的に同じ操作を行います。多くの場合ピボットは中央付近の値やランダムに選びます。</p>
      <p><strong>計算量:</strong> 平均・期待値で時間 O(n log n)、最悪 O(n²)。空間は O(log n)～O(n)。一般的には不安定です。</p>
    `,
    code: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const mid = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), ...mid, ...quickSort(right)];
}`,
  },
  {
    id: 'merge',
    title: 'マージソート',
    content: `
      <p>配列を半分ずつに分割し、それぞれを再帰的にソートしてから、2つのソート済み列を先頭から比較しながら1つにマージします。分割統治法の代表例です。</p>
      <p><strong>計算量:</strong> 時間 O(n log n)、空間 O(n)。安定なソートです。</p>
    `,
    code: `function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  const merged = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    merged.push(left[i] <= right[j] ? left[i++] : right[j++]);
  }
  return merged.concat(left.slice(i), right.slice(j));
}`,
  },
])
</script>

<style scoped>
.sort-page {
  padding: 2rem;
  text-align: left;
  max-width: 56rem;
  margin: 0 auto;
}
.sort-page h1 {
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
}
.sort-page .intro {
  color: var(--text-muted);
  margin-bottom: 2rem;
  line-height: 1.6;
}
.lesson {
  margin-bottom: 2.5rem;
}
.lesson h2 {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  color: var(--accent);
}
.lesson .content {
  line-height: 1.7;
  margin-bottom: 1rem;
}
.lesson .content :deep(p) {
  margin-bottom: 0.5rem;
}
.code-block {
  background: var(--code-bg);
  border-radius: 6px;
  padding: 1rem;
  overflow-x: auto;
}
.code-block pre {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}
.code-block code {
  font-family: 'Consolas', 'Monaco', monospace;
  color: var(--code-fg);
}
</style>
