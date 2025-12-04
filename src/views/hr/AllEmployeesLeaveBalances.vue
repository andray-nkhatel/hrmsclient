<template>
  <div class="card">
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="text-2xl font-semibold m-0">All Employees - Annual Leave Balances</h2>
      <div class="flex gap-2">
        <InputText 
          v-model="departmentFilter" 
          placeholder="Filter by department" 
          class="w-12"
          @input="loadBalances"
        />
        <Button 
          label="Export Excel" 
          icon="pi pi-file-excel" 
          @click="exportToExcel" 
          :loading="exporting"
          severity="success"
          outlined
        />
        <Button 
          label="Export PDF" 
          icon="pi pi-file-pdf" 
          @click="exportToPDF" 
          :loading="exporting"
          severity="danger"
          outlined
        />
        <Button 
          label="Refresh" 
          icon="pi pi-refresh" 
          @click="loadBalances" 
          :loading="loading"
          outlined
        />
      </div>
    </div>

    <div v-if="loading" class="flex justify-center p-8">
      <ProgressSpinner />
    </div>

    <div v-else>
      <DataTable 
        :value="balances" 
        :paginator="true" 
        :rows="20" 
        stripedRows
        sortMode="multiple"
        :globalFilterFields="['employee_name']"
        v-model:filters="filters"
      >
        <template #header>
          <div class="flex justify-content-between">
            <span class="p-input-icon-left w-full">
              <i class="pi pi-search" />
              <InputText v-model="filters.global.value" placeholder="Search by name..." class="w-full" />
            </span>
          </div>
        </template>

        <Column field="employee_name" header="Employee" sortable></Column>
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
        <Column field="current_balance" header="Current Balance" sortable>
          <template #body="{ data }">
            <Tag 
              :value="data.current_balance.toFixed(1)" 
              :severity="getBalanceSeverity(data.current_balance)"
            />
          </template>
        </Column>
        <Column field="pending_leaves" header="Pending" sortable>
          <template #body="{ data }">
            <Badge v-if="data.pending_leaves > 0" :value="data.pending_leaves" severity="warning" />
            <span v-else>0</span>
          </template>
        </Column>
        <Column field="upcoming_leaves" header="Upcoming" sortable>
          <template #body="{ data }">
            <Badge v-if="data.upcoming_leaves > 0" :value="data.upcoming_leaves" severity="info" />
            <span v-else>0</span>
          </template>
        </Column>
        <Column header="Actions">
          <template #body="{ data }">
            <Button 
              icon="pi pi-eye" 
              @click="viewDetails(data.employee_id)"
              v-tooltip.top="'View Details'"
              text
              rounded
            />
            <Button 
              icon="pi pi-pencil" 
              @click="adjustBalance(data.employee_id)"
              v-tooltip.top="'Adjust Balance'"
              text
              rounded
              severity="warning"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Adjust Balance Dialog -->
    <Dialog 
      v-model:visible="adjustDialogVisible" 
      header="Adjust Leave Balance" 
      :modal="true"
      :style="{ width: '500px' }"
    >
      <div class="field mb-4">
        <label for="days" class="block mb-2">Days to Adjust</label>
        <InputNumber 
          id="days"
          v-model="adjustment.days" 
          :min="-100" 
          :max="100" 
          :step="0.5"
          :useGrouping="false"
          class="w-full"
          :class="{ 'p-invalid': !adjustment.days }"
        />
        <small class="p-error" v-if="!adjustment.days">Days is required</small>
        <small class="text-surface-500">Use negative values to subtract, positive to add</small>
      </div>
      <div class="field mb-4">
        <label for="reason" class="block mb-2">Reason *</label>
        <Textarea 
          id="reason"
          v-model="adjustment.reason" 
          rows="3" 
          class="w-full"
          :class="{ 'p-invalid': !adjustment.reason }"
        />
        <small class="p-error" v-if="!adjustment.reason">Reason is required</small>
      </div>
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" @click="adjustDialogVisible = false" text />
        <Button label="Adjust" icon="pi pi-check" @click="saveAdjustment" :loading="submitting" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
// FilterMatchMode is auto-imported by PrimeVue
import { hrLeaveService } from '@/service/api.service';

const router = useRouter();
const toast = useToast();
const loading = ref(false);
const balances = ref([]);
const adjustDialogVisible = ref(false);
const submitting = ref(false);
const exporting = ref(false);
const selectedEmployeeId = ref(null);

const departmentFilter = ref(null);
const filters = ref({
  global: { value: null, matchMode: 'contains' }
});

const adjustment = ref({
  days: null,
  reason: ''
});

const loadBalances = async () => {
  loading.value = true;
  try {
    const filterParams = {};
    if (departmentFilter.value) {
      filterParams.department = departmentFilter.value;
    }
    balances.value = await hrLeaveService.getAllEmployeesBalances(filterParams);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to load leave balances',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const getBalanceSeverity = (balance) => {
  if (balance > 10) return 'success';
  if (balance > 5) return 'warning';
  return 'danger';
};

const viewDetails = (employeeId) => {
  router.push(`/app/hr/employees/${employeeId}/annual-leave-balance`);
};

const adjustBalance = (employeeId) => {
  selectedEmployeeId.value = employeeId;
  adjustment.value = { days: null, reason: '' };
  adjustDialogVisible.value = true;
};

const saveAdjustment = async () => {
  if (!adjustment.value.days || !adjustment.value.reason) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill all required fields',
      life: 3000
    });
    return;
  }

  submitting.value = true;
  try {
    await hrLeaveService.adjustBalance(selectedEmployeeId.value, adjustment.value);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Leave balance adjusted successfully',
      life: 3000
    });
    adjustDialogVisible.value = false;
    loadBalances();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to adjust balance',
      life: 3000
    });
  } finally {
    submitting.value = false;
  }
};

const exportToExcel = async () => {
  exporting.value = true;
  try {
    const filters = {};
    if (departmentFilter.value) {
      filters.department = departmentFilter.value;
    }
    await hrLeaveService.exportBalances('excel', filters);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Excel file downloaded successfully',
      life: 3000
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to export to Excel',
      life: 3000
    });
  } finally {
    exporting.value = false;
  }
};

const exportToPDF = async () => {
  exporting.value = true;
  try {
    const filters = {};
    if (departmentFilter.value) {
      filters.department = departmentFilter.value;
    }
    await hrLeaveService.exportBalances('pdf', filters);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'PDF file downloaded successfully',
      life: 3000
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to export to PDF',
      life: 3000
    });
  } finally {
    exporting.value = false;
  }
};

onMounted(() => {
  loadBalances();
});
</script>

