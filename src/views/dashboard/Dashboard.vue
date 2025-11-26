<template>
  <div class="grid grid-cols-1 gap-6">
    <Panel>
      <template #header>
        <h2 class="text-xl font-semibold">Welcome, {{ user?.firstname || 'User' }}!</h2>
      </template>
      <div class="text-center py-8">
        <i class="pi pi-calendar text-6xl text-primary mb-4"></i>
        <p class="text-lg text-surface-600 dark:text-surface-300">
          Leave Management Dashboard
        </p>
      </div>
    </Panel>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Panel>
        <template #header>
          <span class="font-semibold">Leave Balance</span>
        </template>
        <div class="text-center">
          <p class="text-3xl font-bold text-primary">{{ totalBalance }}</p>
          <p class="text-surface-500">Days Available</p>
        </div>
      </Panel>

      <Panel>
        <template #header>
          <span class="font-semibold">Pending Requests</span>
        </template>
        <div class="text-center">
          <p class="text-3xl font-bold text-orange-500">{{ pendingCount }}</p>
          <p class="text-surface-500">Awaiting Approval</p>
        </div>
      </Panel>

      <Panel>
        <template #header>
          <span class="font-semibold">Used This Year</span>
        </template>
        <div class="text-center">
          <p class="text-3xl font-bold text-green-500">{{ usedDays }}</p>
          <p class="text-surface-500">Days Taken</p>
        </div>
      </Panel>
    </div>

    <!-- Recent Leaves -->
    <Panel v-if="recentLeaves.length > 0">
      <template #header>
        <span class="font-semibold">Recent Leave Requests</span>
      </template>
      <DataTable :value="recentLeaves" :rows="5" responsiveLayout="scroll">
        <Column field="leave_type.name" header="Type"></Column>
        <Column header="Duration">
          <template #body="{ data }">
            {{ formatDate(data.start_date) }} - {{ formatDate(data.end_date) }}
          </template>
        </Column>
        <Column field="status" header="Status">
          <template #body="{ data }">
            <Tag :severity="getStatusSeverity(data.status)" :value="data.status" />
          </template>
        </Column>
      </DataTable>
    </Panel>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { leaveService, getCurrentUser } from '@/service/api.service';

const user = ref(getCurrentUser());
const balance = ref([]);
const leaves = ref([]);
const loading = ref(true);

const totalBalance = computed(() => {
  return balance.value.reduce((sum, b) => sum + b.balance, 0);
});

const usedDays = computed(() => {
  return balance.value.reduce((sum, b) => sum + b.used_days, 0);
});

const pendingCount = computed(() => {
  return leaves.value.filter(l => l.status === 'Pending').length;
});

const recentLeaves = computed(() => {
  return leaves.value.slice(0, 5);
});

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString();
};

const getStatusSeverity = (status) => {
  const map = {
    'Pending': 'warn',
    'Approved': 'success',
    'Rejected': 'danger',
    'Cancelled': 'secondary'
  };
  return map[status] || 'info';
};

onMounted(async () => {
  try {
    const [balanceData, leavesData] = await Promise.all([
      leaveService.getBalance(),
      leaveService.getMyLeaves()
    ]);
    balance.value = balanceData || [];
    leaves.value = leavesData || [];
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  } finally {
    loading.value = false;
  }
});
</script>
