<script setup>
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { authService, employeeService } from '@/service/api.service';
import { formatDate as formatDateUtil } from '@/service/dateUtils';

const toast = useToast();
const store = useStore();

const loading = ref(false);
const saving = ref(false);
const showPasswordDialog = ref(false);
const editMode = ref(false);

const profileData = ref({
  id: null,
  username: null,
  nrc: null,
  firstname: '',
  lastname: '',
  email: '',
  department: '',
  role: '',
  created_at: null
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const originalData = ref({});

const fullName = computed(() => {
  return `${profileData.value.firstname} ${profileData.value.lastname}`.trim() || 'User';
});

const formattedCreatedAt = computed(() => {
  if (!profileData.value.created_at) return 'N/A';
  return formatDateUtil(profileData.value.created_at);
});

const loadProfile = async () => {
  loading.value = true;
  try {
    const data = await authService.getProfile();
    profileData.value = {
      id: data.id,
      username: data.username,
      nrc: data.nrc,
      firstname: data.firstname || '',
      lastname: data.lastname || '',
      email: data.email || '',
      department: data.department || '',
      role: data.role || '',
      created_at: data.created_at
    };
    originalData.value = { ...profileData.value };
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to load profile data',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const enableEdit = () => {
  editMode.value = true;
};

const cancelEdit = () => {
  profileData.value = { ...originalData.value };
  editMode.value = false;
};

const saveProfile = async () => {
  if (!profileData.value.firstname || !profileData.value.lastname || !profileData.value.email) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill in all required fields',
      life: 3000
    });
    return;
  }

  saving.value = true;
  try {
    const updateData = {
      firstname: profileData.value.firstname,
      lastname: profileData.value.lastname,
      email: profileData.value.email,
      department: profileData.value.department
    };
    
    await employeeService.update(profileData.value.id, updateData);
    
    // Update store with new data
    const currentUser = store.getters['auth/user'];
    if (currentUser) {
      store.commit('auth/SET_USER', {
        ...currentUser,
        firstname: profileData.value.firstname,
        lastname: profileData.value.lastname,
        email: profileData.value.email,
        department: profileData.value.department
      });
    }
    
    originalData.value = { ...profileData.value };
    editMode.value = false;
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Profile updated successfully',
      life: 3000
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to update profile',
      life: 3000
    });
  } finally {
    saving.value = false;
  }
};

const openPasswordDialog = () => {
  passwordForm.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  showPasswordDialog.value = true;
};

const changePassword = async () => {
  if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword || !passwordForm.value.confirmPassword) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill in all password fields',
      life: 3000
    });
    return;
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'New password and confirm password do not match',
      life: 3000
    });
    return;
  }

  if (passwordForm.value.newPassword.length < 6) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Password must be at least 6 characters long',
      life: 3000
    });
    return;
  }

  saving.value = true;
  try {
    // Note: This assumes there's a password change endpoint
    // If not, we'll need to create one in the backend
    await authService.changePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    });
    
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    showPasswordDialog.value = false;
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Password changed successfully',
      life: 3000
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to change password',
      life: 3000
    });
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadProfile();
});
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-semibold m-0">Profile</h2>
      <div class="flex gap-2" v-if="!editMode">
        <Button 
          icon="pi pi-pencil" 
          rounded
          aria-label="Edit profile"
          v-tooltip.top="'Edit profile'"
          @click="enableEdit"
          :disabled="loading"
        />
        <Button 
          icon="pi pi-key" 
          severity="secondary"
          outlined
          rounded
          aria-label="Change password"
          v-tooltip.top="'Change password'"
          @click="openPasswordDialog"
          :disabled="loading"
        />
      </div>
      <div class="flex gap-2" v-else>
        <Button 
          icon="pi pi-times" 
          severity="secondary"
          outlined
          rounded
          aria-label="Cancel"
          v-tooltip.top="'Cancel'"
          @click="cancelEdit"
          :disabled="saving"
        />
        <Button 
          icon="pi pi-check" 
          rounded
          aria-label="Save"
          v-tooltip.top="'Save'"
          @click="saveProfile"
          :loading="saving"
        />
      </div>
    </div>

    <div v-if="loading && !profileData.id" class="flex justify-center p-8">
      <ProgressSpinner />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Profile Information -->
      <Panel header="Personal Information">
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label class="block font-medium mb-2">First Name *</label>
            <InputText 
              v-model="profileData.firstname" 
              class="w-full"
              :disabled="!editMode"
            />
          </div>
          <div>
            <label class="block font-medium mb-2">Last Name *</label>
            <InputText 
              v-model="profileData.lastname" 
              class="w-full"
              :disabled="!editMode"
            />
          </div>
          <div>
            <label class="block font-medium mb-2">Email *</label>
            <InputText 
              v-model="profileData.email" 
              type="email"
              class="w-full"
              :disabled="!editMode"
            />
          </div>
          <div>
            <label class="block font-medium mb-2">Department</label>
            <InputText 
              v-model="profileData.department" 
              class="w-full"
              :disabled="!editMode"
            />
          </div>
        </div>
      </Panel>

      <!-- Account Information -->
      <Panel header="Account Information">
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label class="block font-medium mb-2">Username / NRC</label>
            <InputText 
              :value="profileData.username || profileData.nrc || '-'" 
              class="w-full"
              disabled
            />
          </div>
          <div>
            <label class="block font-medium mb-2">Role</label>
            <InputText 
              :value="profileData.role" 
              class="w-full"
              disabled
            />
          </div>
          <div>
            <label class="block font-medium mb-2">Account Created</label>
            <InputText 
              :value="formattedCreatedAt" 
              class="w-full"
              disabled
            />
          </div>
        </div>
      </Panel>
    </div>

    <!-- Change Password Dialog -->
    <Dialog 
      v-model:visible="showPasswordDialog" 
      header="Change Password" 
      modal 
      style="width: 450px"
    >
      <div class="grid grid-cols-1 gap-4">
        <div>
          <label class="block font-medium mb-2">Current Password *</label>
          <Password 
            v-model="passwordForm.currentPassword" 
            class="w-full"
            :feedback="false"
            toggleMask
            placeholder="Enter current password"
          />
        </div>
        <div>
          <label class="block font-medium mb-2">New Password *</label>
          <Password 
            v-model="passwordForm.newPassword" 
            class="w-full"
            :feedback="true"
            toggleMask
            placeholder="Enter new password"
          />
        </div>
        <div>
          <label class="block font-medium mb-2">Confirm New Password *</label>
          <Password 
            v-model="passwordForm.confirmPassword" 
            class="w-full"
            :feedback="false"
            toggleMask
            placeholder="Confirm new password"
          />
        </div>
      </div>
      <template #footer>
        <Button 
          label="Cancel" 
          severity="secondary" 
          outlined 
          @click="showPasswordDialog = false"
          :disabled="saving"
        />
        <Button 
          label="Change Password" 
          @click="changePassword"
          :loading="saving"
        />
      </template>
    </Dialog>
  </div>
</template>
