<template>
  <div class="users-view">
    <div class="list-header">
      <span class="list-count">{{ users.length }} {{ t('records') }}</span>
      <button class="btn-primary" @click="openCreate">+ {{ t('userNew') }}</button>
    </div>

    <div v-if="loading" class="loading-state"><div class="spinner"></div></div>

    <div v-else class="user-grid">
      <div v-for="u in users" :key="u.id" class="user-card" :class="{ inactive: !u.isActive }" @click="openEdit(u)">
        <div class="uc-top">
          <span class="uc-username">{{ u.username }}</span>
          <span class="role-badge" :class="'role-' + u.role">{{ u.role }}</span>
        </div>
        <div class="uc-status" :class="{ off: !u.isActive }">
          {{ u.isActive ? t('userActive') : t('userInactive') }}
        </div>
      </div>
    </div>

    <!-- 新增/編輯 Modal -->
    <div v-if="formOpen" class="modal-overlay" @click.self="formOpen = false">
      <div class="modal-box">
        <div class="modal-header">
          <span>{{ editingUser ? t('userEdit') : t('userNew') }}</span>
          <button class="btn-close-modal" @click="formOpen = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label class="field-label">{{ t('userUsername') }}</label>
            <input v-model="form.username" class="text-input" :placeholder="t('userUsername')" />
          </div>

          <div class="field" v-if="!editingUser">
            <label class="field-label">{{ t('userPassword') }}</label>
            <input v-model="form.password" type="text" class="text-input" :placeholder="t('userPasswordHint')" />
          </div>

          <div class="field">
            <label class="field-label">{{ t('userRole') }}</label>
            <div class="role-pick">
              <button v-for="r in roles" :key="r" class="role-btn" :class="{ active: form.role === r }"
                :disabled="isSelf && !!editingUser" @click="form.role = r">
                {{ r }}
              </button>
            </div>
          </div>

          <div class="field" v-if="editingUser">
            <label class="field-label">{{ t('userStatus') }}</label>
            <div class="role-pick">
              <button class="role-btn" :class="{ active: form.isActive }" :disabled="isSelf" @click="form.isActive = true">{{ t('userActive') }}</button>
              <button class="role-btn" :class="{ active: !form.isActive }" :disabled="isSelf" @click="form.isActive = false">{{ t('userInactive') }}</button>
            </div>
          </div>

          <div v-if="isSelf && editingUser" class="self-note">{{ t('userSelfNote') }}</div>

          <div v-if="editingUser" class="field">
            <button class="btn-secondary full" @click="resetPwOpen = true">🔑 {{ t('userResetPassword') }}</button>
          </div>
        </div>
        <div class="modal-footer">
          <button v-if="editingUser" class="btn-danger" :disabled="isSelf" @click="confirmDeleteOpen = true">{{ t('delete') }}</button>
          <div class="footer-spacer"></div>
          <button class="btn-secondary" @click="formOpen = false">{{ t('cancel') }}</button>
          <button class="btn-primary" :disabled="!canSubmit || saving" @click="submitForm">{{ saving ? t('saving') : t('save') }}</button>
        </div>
      </div>
    </div>

    <!-- 重設密碼 Modal -->
    <div v-if="resetPwOpen" class="modal-overlay" @click.self="resetPwOpen = false">
      <div class="modal-box small">
        <div class="modal-header">
          <span>{{ t('userResetPassword') }}</span>
          <button class="btn-close-modal" @click="resetPwOpen = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label class="field-label">{{ t('userNewPassword') }}</label>
            <input v-model="newPassword" type="text" class="text-input" :placeholder="t('userPasswordHint')" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="resetPwOpen = false">{{ t('cancel') }}</button>
          <button class="btn-primary" :disabled="newPassword.length < 4 || saving" @click="submitResetPassword">{{ t('confirm') }}</button>
        </div>
      </div>
    </div>

    <ConfirmDialog v-if="confirmDeleteOpen" :show="confirmDeleteOpen"
      :title="t('confirmAction')" :message="t('userConfirmDelete')"
      @confirm="submitDelete" @cancel="confirmDeleteOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import { getUsers, createUser, updateUser, resetUserPassword, deleteUser } from '../../api/users'
import type { User, Role } from '../../api/users'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToastStore()

const users = ref<User[]>([])
const loading = ref(false)
const saving = ref(false)
const formOpen = ref(false)
const resetPwOpen = ref(false)
const confirmDeleteOpen = ref(false)
const newPassword = ref('')
const editingUser = ref<User | null>(null)
const roles: Role[] = ['ADMIN', 'OFFICE', 'FACTORY', 'GUIDED']

const form = ref<{ username: string; password: string; role: Role; isActive: boolean }>({
  username: '', password: '', role: 'GUIDED', isActive: true,
})

const isSelf = computed(() => !!editingUser.value && editingUser.value.id === auth.user?.id)
const canSubmit = computed(() => {
  if (!form.value.username) return false
  if (!editingUser.value && form.value.password.length < 4) return false
  return true
})

async function load() {
  loading.value = true
  try {
    users.value = (await getUsers()).data
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || t('loadFailed'), 'error')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingUser.value = null
  form.value = { username: '', password: '', role: 'GUIDED', isActive: true }
  formOpen.value = true
}

function openEdit(u: User) {
  editingUser.value = u
  form.value = { username: u.username, password: '', role: u.role, isActive: u.isActive }
  formOpen.value = true
}

async function submitForm() {
  saving.value = true
  try {
    if (editingUser.value) {
      await updateUser(editingUser.value.id, {
        username: form.value.username,
        role: form.value.role,
        isActive: form.value.isActive,
      })
      toast.showToast(t('saved'), 'success')
    } else {
      await createUser({
        username: form.value.username,
        password: form.value.password,
        role: form.value.role,
        isActive: form.value.isActive,
      })
      toast.showToast(t('userCreated'), 'success')
    }
    formOpen.value = false
    await load()
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error')
  } finally {
    saving.value = false
  }
}

async function submitResetPassword() {
  if (!editingUser.value) return
  saving.value = true
  try {
    await resetUserPassword(editingUser.value.id, newPassword.value)
    toast.showToast(t('userPasswordReset'), 'success')
    resetPwOpen.value = false
    newPassword.value = ''
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error')
  } finally {
    saving.value = false
  }
}

async function submitDelete() {
  if (!editingUser.value) return
  try {
    await deleteUser(editingUser.value.id)
    toast.showToast(t('deleted'), 'success')
    confirmDeleteOpen.value = false
    formOpen.value = false
    await load()
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error')
    confirmDeleteOpen.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.users-view { padding: 16px; display: flex; flex-direction: column; gap: 16px; }

.list-header { display: flex; justify-content: space-between; align-items: center; }
.list-count { color: var(--color-text-muted); font-size: 13px; }
.btn-primary { background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; }
.btn-secondary { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 10px; padding: 10px 20px; font-size: 14px; cursor: pointer; }
.btn-secondary.full { width: 100%; }
.btn-danger { background: none; border: 1px solid var(--color-danger); color: var(--color-danger); border-radius: 10px; padding: 10px 20px; font-size: 14px; cursor: pointer; }
.btn-danger:disabled { opacity: 0.4; cursor: not-allowed; }

.user-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.user-card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px; cursor: pointer; transition: all 0.18s; }
.user-card:hover { border-color: var(--color-accent); background: var(--color-card-hover); }
.user-card.inactive { opacity: 0.55; }
.uc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.uc-username { font-size: 15px; font-weight: 700; color: var(--color-text); }
.role-badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px; letter-spacing: 0.03em; }
.role-ADMIN { background: rgba(248,113,113,0.15); color: var(--color-danger); }
.role-OFFICE { background: rgba(96,165,250,0.15); color: #60a5fa; }
.role-FACTORY { background: rgba(45,212,191,0.15); color: var(--color-success); }
.role-GUIDED { background: rgba(232,130,12,0.15); color: var(--color-accent); }
.uc-status { font-size: 12px; color: var(--color-success); }
.uc-status.off { color: var(--color-text-muted); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.72); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal-box { width: 100%; max-width: 420px; max-height: 88vh; background: var(--color-drawer); border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; margin: 16px; }
.modal-box.small { max-width: 360px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid var(--color-border); font-size: 15px; font-weight: 700; color: var(--color-text); }
.btn-close-modal { background: none; border: none; color: var(--color-text-muted); font-size: 18px; cursor: pointer; }
.modal-body { padding: 16px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
.modal-footer { display: flex; gap: 10px; padding: 14px 16px; border-top: 1px solid var(--color-border); align-items: center; }
.footer-spacer { flex: 1; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.text-input { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 11px 14px; font-size: 14px; color: var(--color-text); }
.role-pick { display: flex; gap: 8px; flex-wrap: wrap; }
.role-btn { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 9px 14px; font-size: 13px; font-weight: 600; color: var(--color-text-muted); cursor: pointer; }
.role-btn.active { border-color: var(--color-accent); color: var(--color-accent); background: rgba(232,130,12,0.1); }
.role-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.self-note { font-size: 12px; color: var(--color-warning-bg); background: rgba(245,158,11,0.1); border: 1px solid var(--color-warning-bg); border-radius: 8px; padding: 8px 12px; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
