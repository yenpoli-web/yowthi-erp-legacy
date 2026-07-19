<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const isOffline = ref(!navigator.onLine)

function handleOffline() { isOffline.value = true }
function handleOnline()  { isOffline.value = false }

onMounted(() => {
  window.addEventListener('offline', handleOffline)
  window.addEventListener('online',  handleOnline)
})

onUnmounted(() => {
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('online',  handleOnline)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOffline && authStore.user?.role !== 'GUIDED'"
      class="offline-overlay"
    >
      <div class="offline-content">
        <p class="line-alert">⚠️ เครือข่ายขัดข้อง!</p>
        <p class="line-main">พนักงานทุกคนหยุดปฏิบัติงาน</p>
        <p class="line-main">กรุณาบันทึกด้วยกระดาษและปากกาก่อน</p>
        <p class="line-sub">เมื่อเครือข่ายกลับมาใช้งานได้ ค่อยบันทึกข้อมูลในระบบ</p>
        <p class="line-contact">กรุณาติดต่อ Poli หรือ Jeab</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.offline-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.offline-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  color: #fff;
}

.line-alert {
  font-size: 32px;
  font-weight: 800;
  color: #f87171;
  margin: 0;
}

.line-main {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

.line-sub {
  font-size: 18px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.75);
  margin: 0;
}

.line-contact {
  font-size: 20px;
  font-weight: 600;
  color: #fbbf24;
  margin: 0;
}
</style>
