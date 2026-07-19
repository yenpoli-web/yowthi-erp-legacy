<script setup lang="ts">
import './assets/styles/global.css'
import ToastNotification from './components/common/ToastNotification.vue'
</script>

<template>
  <RouterView />
  <ToastNotification />
</template>
