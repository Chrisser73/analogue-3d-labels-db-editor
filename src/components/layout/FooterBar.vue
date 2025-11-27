<template>
  <footer id="copyright">
    <div>&copy; {{ currentYear }} by Christopher Matthes</div>
    <div>
      Visit me on:
      <a href="https://github.com/Chrisser73" target="_blank">Github</a> |
      <a href="https://christopher-matthes.de" target="_blank">Homepage</a> |
      <a href="https://www.instagram.com/crysercore/" target="_blank">Instagram</a>
    </div>
  </footer>
</template>

<script setup>
const currentYear = new Date().getFullYear();
</script>
