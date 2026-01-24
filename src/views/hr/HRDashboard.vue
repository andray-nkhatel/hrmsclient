<template>
  <div class="grid grid-cols-1 gap-6">
    <div class="mb-2">
      <h2 class="text-2xl font-semibold m-0">Annual Leave Management Dashboard</h2>
      <p class="text-surface-500 mt-1">Overview of annual leave balances, absences, and upcoming leaves</p>
    </div>

    <!-- Key Metrics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <template #content>
          <div class="flex align-items-center justify-content-between">
            <div>
              <div class="text-sm text-surface-500 mb-1">Today's Annual Leave</div>
              <div class="text-3xl font-bold text-primary">{{ todayAbsences }}</div>
              <div class="text-xs text-surface-400 mt-1">Employees on annual leave today</div>
            </div>
            <i class="pi pi-calendar-times text-4xl text-primary opacity-50"></i>
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="flex align-items-center justify-content-between">
            <div>
              <div class="text-sm text-surface-500 mb-1">Upcoming (7 days)</div>
              <div class="text-3xl font-bold text-orange-500">{{ upcoming7Days }}</div>
              <div class="text-xs text-surface-400 mt-1">Annual leaves starting soon</div>
            </div>
            <i class="pi pi-calendar-clock text-4xl text-orange-500 opacity-50"></i>
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="flex align-items-center justify-content-between">
            <div>
              <div class="text-sm text-surface-500 mb-1">Low/Overdrawn</div>
              <div class="text-3xl font-bold text-red-500">{{ lowBalances }}</div>
              <div class="text-xs text-surface-400 mt-1">Balance &lt; 5 days or negative</div>
            </div>
            <i class="pi pi-exclamation-triangle text-4xl text-red-500 opacity-50"></i>
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="flex align-items-center justify-content-between">
            <div>
              <div class="text-sm text-surface-500 mb-1">Total Employees</div>
              <div class="text-3xl font-bold text-blue-500">{{ totalEmployees }}</div>
              <div class="text-xs text-surface-400 mt-1">With annual leave tracking</div>
            </div>
            <i class="pi pi-users text-4xl text-blue-500 opacity-50"></i>
          </div>
        </template>
      </Card>
    </div>

    <!-- Quick Actions -->
    <Card>
      <template #header>
        <div class="flex align-items-center justify-content-between">
          <span class="font-semibold text-xl">Quick Actions</span>
        </div>
      </template>
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button 
            label="Quick Leave Entry" 
            icon="pi pi-plus" 
            @click="showQuickEntry = true"
            severity="success"
            class="w-full"
          />
          <Button 
            label="Bulk Import" 
            icon="pi pi-upload" 
            @click="showBulkImport = true"
            severity="info"
            outlined
            class="w-full"
          />
          <Button 
            label="View Calendar" 
            icon="pi pi-calendar" 
            @click="$router.push('/app/hr/leaves/calendar')"
            severity="secondary"
            outlined
            class="w-full"
          />
        </div>
      </template>
    </Card>

    <!-- Today's Annual Leave Absences -->
    <Card v-if="todayLeaves.length > 0">
      <template #header>
        <span class="font-semibold text-xl">Today's Annual Leave Absences</span>
      </template>
      <template #content>
        <DataTable :value="todayLeaves" :rows="10" responsiveLayout="scroll">
          <Column field="employee_name" header="Employee" sortable></Column>
          <Column field="department" header="Department" sortable></Column>
          <Column header="Duration">
            <template #body="{ data }">
              {{ formatDate(data.start_date) }} - {{ formatDate(data.end_date) }}
              ({{ getDuration(data.start_date, data.end_date) }} days)
            </template>
          </Column>
          <Column field="status" header="Status">
            <template #body="{ data }">
              <Tag :severity="data.status === 'Approved' ? 'success' : 'warning'" :value="data.status" />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Upcoming Annual Leaves (Next 7 Days) -->
    <Card v-if="upcomingLeaves.length > 0">
      <template #header>
        <span class="font-semibold text-xl">Upcoming Annual Leaves (Next 7 Days)</span>
      </template>
      <template #content>
        <DataTable :value="upcomingLeaves" :rows="10" responsiveLayout="scroll">
          <Column field="employee_name" header="Employee" sortable></Column>
          <Column field="department" header="Department" sortable></Column>
          <Column header="Start Date" sortable>
            <template #body="{ data }">
              {{ formatDate(data.start_date) }}
            </template>
          </Column>
          <Column header="Duration">
            <template #body="{ data }">
              {{ getDuration(data.start_date, data.end_date) }} days
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Low Annual Leave Balance Alerts -->
    <Card v-if="lowBalanceEmployees.length > 0">
      <template #header>
        <span class="font-semibold text-xl">Low Annual Leave Balance Alerts</span>
      </template>
      <template #content>
        <DataTable :value="lowBalanceEmployees" :rows="10" responsiveLayout="scroll">
          <Column field="employee_name" header="Employee" sortable></Column>
          <Column field="current_balance" header="Current Balance" sortable>
            <template #body="{ data }">
              <span :class="data.current_balance < 0 ? 'text-red-500 font-bold' : 'text-orange-500 font-bold'">
                {{ data.current_balance.toFixed(1) }} days
                <span v-if="data.current_balance < 0" class="text-xs">(Overdrawn)</span>
              </span>
            </template>
          </Column>
          <Column field="total_accrued" header="Total Accrued" sortable>
            <template #body="{ data }">
              {{ data.total_accrued.toFixed(1) }} days
            </template>
          </Column>
          <Column field="total_used" header="Total Used" sortable>
            <template #body="{ data }">
              {{ data.total_used.toFixed(1) }} days
            </template>
          </Column>
          <Column header="Actions">
            <template #body="{ data }">
              <Button
                label="View Details"
                icon="pi pi-eye"
                severity="secondary"
                text
                rounded
                @click="$router.push(`/app/hr/employees/${data.employee_id}/annual-leave-balance`)"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Quick Leave Entry Dialog -->
    <QuickLeaveEntry 
      v-model="showQuickEntry" 
      @created="loadDashboard"
    />

    <!-- Bulk Import Dialog -->
    <BulkLeaveImport 
      v-model="showBulkImport" 
      @imported="loadDashboard"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { hrLeaveService, employeeService } from '@/service/api.service';
import QuickLeaveEntry from './QuickLeaveEntry.vue';
import BulkLeaveImport from './BulkLeaveImport.vue';
import { formatDate, formatDateForAPI } from '@/service/dateUtils';

const router = useRouter();
const toast = useToast();
const loading = ref(true);
const showQuickEntry = ref(false);
const showBulkImport = ref(false);

const todayAbsences = ref(0);
const upcoming7Days = ref(0);
const lowBalances = ref(0);
const totalEmployees = ref(0);
const todayLeaves = ref([]);
const upcomingLeaves = ref([]);
const lowBalanceEmployees = ref([]);

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString();
};

const getDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const loadDashboard = async () => {
  loading.value = true;
  try {
    const today = new Date();
    const todayStr = formatDateForAPI(today);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = formatDateForAPI(nextWeek);

    // Load today's calendar - filter for Annual leave only
    const todayCalendar = await hrLeaveService.getCalendar({
      start_date: todayStr,
      end_date: todayStr
    });
    const todayAnnual = (todayCalendar || []).filter(item => {
      const leaveType = (item.leave_type || '').toLowerCase();
      return leaveType === 'annual' || leaveType.includes('annual');
    });
    todayLeaves.value = todayAnnual;
    todayAbsences.value = todayAnnual.length;

    // Load upcoming leaves - filter for Annual leave only
    const upcomingCalendar = await hrLeaveService.getCalendar({
      start_date: todayStr,
      end_date: nextWeekStr
    });
    const upcoming = (upcomingCalendar || []).filter(leave => {
      const leaveType = (leave.leave_type || '').toLowerCase();
      const isAnnual = leaveType === 'annual' || leaveType.includes('annual');
      if (!isAnnual) return false;
      const start = new Date(leave.start_date || leave.date);
      return start > today && start <= nextWeek;
    });
    upcomingLeaves.value = upcoming;
    upcoming7Days.value = upcoming.length;

    // Load all balances to find low balances
    const balances = await hrLeaveService.getAllEmployeesBalances({});
    lowBalanceEmployees.value = balances.filter(b => b.current_balance < 5 || b.current_balance < 0);
    lowBalances.value = lowBalanceEmployees.value.length;
    
    // Get total employees count
    try {
      const employees = await employeeService.getAll();
      totalEmployees.value = employees.length;
    } catch (error) {
      // Use balances count as fallback
      totalEmployees.value = balances.length;
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to load dashboard data',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadDashboard();
});
</script>
