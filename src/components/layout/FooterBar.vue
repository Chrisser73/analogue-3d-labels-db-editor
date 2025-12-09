<template>
  <footer id="copyright">
    <div>&copy; {{ currentYear }} by Christopher Matthes</div>
    <div>
      Visit me on:
      <a href="https://github.com/Chrisser73" target="_blank">Github</a> |
      <a href="https://christopher-matthes.de" target="_blank">Homepage</a>
    </div>
    <div>
      <a href="/imprint.html" target="_blank" rel="noreferrer"
        >Imprint / Privacy Policy</a
      >
    </div>
  </footer>
</template>

<script setup>
const currentYear = new Date().getFullYear();
</script>
