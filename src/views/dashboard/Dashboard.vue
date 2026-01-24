<template>
  <div class="grid grid-cols-1 gap-6">
    <!-- Welcome Panel -->
    <Panel>
      <template #header>
        <h2 class="text-xl font-semibold">Welcome, {{ user?.firstname || 'User' }}!</h2>
      </template>
      <div class="text-center py-4">
        <i class="pi pi-calendar text-6xl text-primary mb-4"></i>
        <p class="text-lg text-surface-600 dark:text-surface-300">
          Leave Management Dashboard
        </p>
        <p class="text-sm text-surface-500 mt-2">Role: {{ userRole }}</p>
      </div>
    </Panel>

    <!-- Admin/Manager Dashboard -->
    <template v-if="isAdminOrManager">
      <!-- System Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Panel>
          <template #header>
            <span class="font-semibold flex items-center gap-2">
              <i class="pi pi-users text-primary"></i>
              Total Employees
            </span>
          </template>
          <div class="text-center">
            <p class="text-3xl font-bold text-primary">{{ totalEmployees }}</p>
            <p class="text-surface-500 text-sm">Active Employees</p>
          </div>
        </Panel>

        <Panel>
          <template #header>
            <span class="font-semibold flex items-center gap-2">
              <i class="pi pi-chart-line text-green-500"></i>
              Total Accrued
            </span>
          </template>
          <div class="text-center">
            <p class="text-3xl font-bold text-green-500">{{ totalAccrued.toFixed(1) }}</p>
            <p class="text-surface-500 text-sm">Days Accrued</p>
          </div>
        </Panel>

        <Panel>
          <template #header>
            <span class="font-semibold flex items-center gap-2">
              <i class="pi pi-calendar-times text-orange-500"></i>
              Total Used
            </span>
          </template>
          <div class="text-center">
            <p class="text-3xl font-bold text-orange-500">{{ totalUsed.toFixed(1) }}</p>
            <p class="text-surface-500 text-sm">Days Used</p>
          </div>
        </Panel>

        <Panel>
          <template #header>
            <span class="font-semibold flex items-center gap-2">
              <i class="pi pi-wallet text-blue-500"></i>
              Total Balance
            </span>
          </template>
          <div class="text-center">
            <p class="text-3xl font-bold text-blue-500">{{ totalBalance.toFixed(1) }}</p>
            <p class="text-surface-500 text-sm">Days Available</p>
          </div>
        </Panel>
      </div>

      <!-- Department Statistics -->
      <Panel v-if="departmentStats.length > 0">
        <template #header>
          <span class="font-semibold">Department Statistics</span>
        </template>
        <DataTable :value="departmentStats" :rows="10" stripedRows paginator>
          <Column field="department" header="Department" sortable></Column>
          <Column field="total_employees" header="Employees" sortable></Column>
          <Column field="total_accrued" header="Total Accrued" sortable>
            <template #body="{ data }">
              {{ data.total_accrued.toFixed(1) }}
            </template>
          </Column>
          <Column field="total_used" header="Total Used" sortable>
            <template #body="{ data }">
              {{ data.total_used.toFixed(1) }}
            </template>
          </Column>
          <Column field="total_balance" header="Balance" sortable>
            <template #body="{ data }">
              <Tag 
                :value="data.total_balance.toFixed(1)" 
                :severity="data.total_balance > 0 ? 'success' : 'danger'"
              />
            </template>
          </Column>
        </DataTable>
      </Panel>
    </template>

    <!-- Employee Dashboard -->
    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Panel>
          <template #header>
            <span class="font-semibold flex items-center gap-2">
              <i class="pi pi-wallet text-primary"></i>
              Leave Balance
            </span>
          </template>
          <div class="text-center">
            <p class="text-3xl font-bold text-primary">{{ employeeBalance.toFixed(1) }}</p>
            <p class="text-surface-500">Days Available</p>
          </div>
        </Panel>

        <Panel>
          <template #header>
            <span class="font-semibold flex items-center gap-2">
              <i class="pi pi-calendar-times text-orange-500"></i>
              Used This Year
            </span>
          </template>
          <div class="text-center">
            <p class="text-3xl font-bold text-orange-500">{{ employeeUsed.toFixed(1) }}</p>
            <p class="text-surface-500">Days Taken</p>
          </div>
        </Panel>

        <Panel>
          <template #header>
            <span class="font-semibold flex items-center gap-2">
              <i class="pi pi-chart-line text-green-500"></i>
              Total Accrued
            </span>
          </template>
          <div class="text-center">
            <p class="text-3xl font-bold text-green-500">{{ employeeAccrued.toFixed(1) }}</p>
            <p class="text-surface-500">Days Earned</p>
          </div>
        </Panel>
      </div>

      <!-- Employee Leave History -->
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
    </template>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center p-8">
      <ProgressSpinner />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import { leaveService, hrLeaveService, employeeService, getCurrentUser } from '@/service/api.service';
import { useToast } from 'primevue/usetoast';
import { formatDate } from '@/service/dateUtils';
import Panel from 'primevue/panel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';

const store = useStore();
const toast = useToast();

const user = ref(getCurrentUser());
const loading = ref(true);

// Employee data
const employeeBalanceData = ref(null);
const employeeLeaves = ref([]);

// Admin/Manager data
const allEmployeesBalances = ref([]);
const departmentStats = ref([]);
const employees = ref([]);

// Computed properties for role
const userRole = computed(() => {
  return user.value?.role || 'employee';
});

const isAdminOrManager = computed(() => {
  return userRole.value === 'admin' || userRole.value === 'manager';
});

// Employee dashboard stats
const employeeBalance = computed(() => {
  if (!employeeBalanceData.value) return 0;
  return employeeBalanceData.value.current_balance || 0;
});

const employeeUsed = computed(() => {
  if (!employeeBalanceData.value) return 0;
  return employeeBalanceData.value.total_used || 0;
});

const employeeAccrued = computed(() => {
  if (!employeeBalanceData.value) return 0;
  return employeeBalanceData.value.total_accrued || 0;
});

const recentLeaves = computed(() => {
  return employeeLeaves.value.slice(0, 5).sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at);
  });
});

// Admin/Manager dashboard stats
const totalEmployees = computed(() => {
  return employees.value.length;
});

const totalAccrued = computed(() => {
  return allEmployeesBalances.value.reduce((sum, emp) => sum + (emp.total_accrued || 0), 0);
});

const totalUsed = computed(() => {
  return allEmployeesBalances.value.reduce((sum, emp) => sum + (emp.total_used || 0), 0);
});

const totalBalance = computed(() => {
  return allEmployeesBalances.value.reduce((sum, emp) => sum + (emp.current_balance || 0), 0);
});

const getStatusSeverity = (status) => {
  const map = {
    'Pending': 'warn',
    'Approved': 'success',
    'Rejected': 'danger',
    'Cancelled': 'secondary'
  };
  return map[status] || 'info';
};

const loadEmployeeDashboard = async () => {
  try {
    const userId = user.value?.id;
    if (!userId) return;

    const [balanceData, leavesData] = await Promise.all([
      hrLeaveService.getEmployeeBalance(userId).catch(() => null),
      leaveService.getMyLeaves().catch(() => [])
    ]);
    
    employeeBalanceData.value = balanceData;
    employeeLeaves.value = leavesData || [];
  } catch (error) {
    console.error('Failed to load employee dashboard:', error);
  }
};

const loadAdminDashboard = async () => {
  try {
    const [balancesData, deptData, employeesData] = await Promise.all([
      hrLeaveService.getAllEmployeesBalances().catch(() => []),
      hrLeaveService.getDepartmentReport().catch(() => []),
      employeeService.getAll().catch(() => [])
    ]);
    
    allEmployeesBalances.value = balancesData || [];
    departmentStats.value = deptData || [];
    employees.value = employeesData || [];
  } catch (error) {
    console.error('Failed to load admin dashboard:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load dashboard data',
      life: 3000
    });
  }
};

onMounted(async () => {
  loading.value = true;
  try {
    if (isAdminOrManager.value) {
      await loadAdminDashboard();
    } else {
      await loadEmployeeDashboard();
    }
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  } finally {
    loading.value = false;
  }
});
</script>
