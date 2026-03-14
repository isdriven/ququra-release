<template>
  <div class="top-page">
    <h1>学習ブック</h1>
    <p class="lead">
      左のナビからページを選んでください。各ページはコンポーネントで構成され、
      学習内容と実行可能なプログラムを組み合わせて学べます。
    </p>
  </div>
</template>

<script setup>
</script>

<style scoped>
.top-page {
  padding: 2rem;
  text-align: left;
  max-width: 48rem;
  margin: 0 auto;
}
.top-page h1 {
  font-size: 1.75rem;
  margin-bottom: 1rem;
}
.top-page .lead {
  color: var(--text-muted);
  line-height: 1.7;
}
</style>
