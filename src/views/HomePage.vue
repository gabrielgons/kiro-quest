<script setup lang="ts">
</script>

<template>
  <main :class="$style.home">
    <h1>Kiro Quiz Game</h1>
    <p>Teste seus conhecimentos sobre Kiro!</p>
  </main>
</template>

<style module>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--spacing-lg);
}
</style>
