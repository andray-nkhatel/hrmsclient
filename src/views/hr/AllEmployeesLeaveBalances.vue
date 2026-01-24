<template>
  <div class="card">
    <div class="flex justify-content-between align-items-center mb-4 w-full">
      <h2 class="text-2xl font-semibold m-0">All Employees - Annual Leave Balances</h2>
      <div class="flex">
        <span class="flex p-input-icon-left">
        <!-- <i class="pi pi-search mr-3" /> -->
        <InputText 
          v-model="filters.global.value" 
          placeholder="Search by name..." 
          class="w-full"
        />
      </span>

      </div>
      
    </div>
    <div class="flex gap-2 align-items-center flex-wrap mb-4">
      <Button 
        label="Quick Entry" 
        icon="pi pi-plus" 
        @click="showQuickEntry = true"
        severity="success"
      />
      <Button 
        label="Bulk Import" 
        icon="pi pi-upload" 
        @click="showBulkImport = true"
        severity="info"
        outlined
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
        editMode="cell"
        @cell-edit-complete="onCellEditComplete"
        @row-click="onRowClick"
        dataKey="employee_id"
        :pt="{
          table: { style: 'min-width: 50rem' },
          tbody: { style: 'cursor: pointer' },
          column: {
            bodycell: ({ state }) => ({
              class: [{ '!py-0': state['d_editing'] }]
            })
          }
        }"
      >

        <Column field="employee_name" sortable>
          <template #header>
            <div style="text-align: left; width: 100%;">Employee</div>
          </template>
        </Column>
        <Column field="total_accrued" sortable align="center">
          <template #header>
            <div style="text-align: center; width: 100%;">Total Accrued</div>
          </template>
          <template #body="{ data }">
            <div class="text-center">{{ data.total_accrued.toFixed(1) }}</div>
          </template>
        </Column>
        <Column field="total_used" sortable align="center">
          <template #header>
            <div style="text-align: center; width: 100%;">Total Used</div>
          </template>
          <template #body="{ data }">
            <div class="text-center">{{ data.total_used.toFixed(1) }}</div>
          </template>
        </Column>
        <Column field="all_time_net_balance" sortable align="center">
          <template #header>
            <div style="text-align: center; width: 100%;">All-Time Net Balance</div>
          </template>
          <template #body="{ data }">
            <div class="text-center">{{ (data.all_time_net_balance || 0).toFixed(1) }}</div>
          </template>
        </Column>
        <Column field="current_balance" sortable align="center">
          <template #header>
            <div style="text-align: center; width: 100%;">Current Balance</div>
          </template>
          <template #body="{ data }">
            <span 
              :class="`balance-value balance-${getBalanceSeverity(data.current_balance)}`" 
              @click.stop
              @mousedown.stop
            >
              {{ data.current_balance.toFixed(1) }}
              <span v-if="data.current_balance < 0" class="text-xs ml-1">(Overdrawn)</span>
            </span>
          </template>
          <template #editor="{ data, field }">
            <InputNumber 
              v-model="data[field]" 
              :min="-1000" 
              :max="1000" 
              :step="0.5"
              autofocus 
              fluid
              class="w-full"
              @click.stop
              @mousedown.stop
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Quick Leave Entry Dialog -->
    <QuickLeaveEntry 
      v-model="showQuickEntry" 
      @created="loadBalances"
    />

    <!-- Bulk Import Dialog -->
    <BulkLeaveImport 
      v-model="showBulkImport" 
      @imported="loadBalances"
    />
  </div>
</template>

<script setup>
import { hrLeaveService } from '@/service/api.service';
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import BulkLeaveImport from './BulkLeaveImport.vue';
import QuickLeaveEntry from './QuickLeaveEntry.vue';

const router = useRouter();
const toast = useToast();
const loading = ref(false);
const balances = ref([]);
const submitting = ref(false);
const exporting = ref(false);
const showQuickEntry = ref(false);
const showBulkImport = ref(false);

const filters = ref({
  global: { value: null, matchMode: 'contains' }
});

const loadBalances = async () => {
  loading.value = true;
  try {
    balances.value = await hrLeaveService.getAllEmployeesBalances({});
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
  if (balance < 0) return 'danger'; // Overdrawn (negative)
  if (balance > 10) return 'success';
  if (balance > 5) return 'warning';
  return 'danger'; // Low balance (0-5)
};

const onRowClick = (event) => {
  // Get the click target
  const target = event.originalEvent?.target;
  if (!target || !event.data) return;
  
  // Don't navigate if clicking on an input field or any PrimeVue input component (editing in progress)
  if (target.tagName === 'INPUT' || 
      target.closest('input') || 
      target.closest('.p-inputnumber') ||
      target.closest('.p-inputwrapper') ||
      target.closest('[data-pc-section="input"]') ||
      target.closest('[data-pc-name="inputnumber"]')) {
    return;
  }
  
  // Don't navigate if clicking on the balance-value span (current_balance column)
  if (target.classList.contains('balance-value') || target.closest('.balance-value')) {
    // This is the current_balance column, don't navigate - let cell editing handle it
    return;
  }
  
  // Don't navigate if clicking on the current_balance column cell
  const clickedCell = target.closest('td');
  if (clickedCell) {
    // Check if this cell contains the balance-value (current_balance column)
    const hasBalanceValue = clickedCell.querySelector('.balance-value');
    if (hasBalanceValue) {
      // This is the current_balance column, don't navigate - let cell editing handle it
      return;
    }
    
    // Also check by column index as fallback
    const row = clickedCell.parentElement;
    if (row) {
      const cells = Array.from(row.querySelectorAll('td'));
      const cellIndex = cells.indexOf(clickedCell);
      // Column 0: employee_name, Column 1: total_accrued, Column 2: total_used, 
      // Column 3: all_time_net_balance, Column 4: current_balance (editable)
      if (cellIndex === 4) {
        // This is the current_balance column, allow cell editing to work
        return;
      }
    }
  }
  
  // Navigate to employee details
  const employeeId = event.data.employee_id;
  if (employeeId) {
    router.push(`/app/hr/employees/${employeeId}/annual-leave-balance`);
  }
};

// Handle cell edit completion
const onCellEditComplete = async (event) => {
  const { data, newValue, field } = event;
  
  // Only handle current_balance field edits
  if (field !== 'current_balance') {
    return;
  }
  
  const newBalance = parseFloat(newValue);
  const oldBalance = data.current_balance;
  
  // Validate the new value
  if (isNaN(newBalance)) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Value',
      detail: 'Please enter a valid number',
      life: 3000
    });
    // Prevent the change
    event.preventDefault();
    return;
  }
  
  // Calculate the adjustment (difference)
  const adjustment = newBalance - oldBalance;
  
  // If no change, do nothing
  if (Math.abs(adjustment) < 0.01) {
    return;
  }
  
  // Show confirmation dialog
  const confirmed = confirm(
    `Adjust current balance for ${data.employee_name}?\n` +
    `Current Balance: ${oldBalance.toFixed(1)} days\n` +
    `New Balance: ${newBalance.toFixed(1)} days\n` +
    `Adjustment: ${adjustment > 0 ? '+' : ''}${adjustment.toFixed(1)} days\n\n` +
    `Reason: Manual adjustment via cell edit`
  );
  
  if (!confirmed) {
    // Prevent the change
    event.preventDefault();
    return;
  }
  
  // Save the adjustment using adjustBalance endpoint
  submitting.value = true;
  try {
    await hrLeaveService.adjustBalance(data.employee_id, {
      days: adjustment,
      reason: 'Manual balance adjustment via cell edit'
    });
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Balance adjusted by ${adjustment > 0 ? '+' : ''}${adjustment.toFixed(1)} days`,
      life: 3000
    });
    
    // Reload balances to get updated values
    await loadBalances();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to adjust balance',
      life: 3000
    });
    // Prevent the change on error
    event.preventDefault();
  } finally {
    submitting.value = false;
  }
};

const exportToExcel = async () => {
  exporting.value = true;
  try {
    await hrLeaveService.exportBalances('excel', {});
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
    await hrLeaveService.exportBalances('pdf', {});
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

<style scoped>
:deep(.p-datatable thead th) {
  text-align: center !important;
}
:deep(.p-datatable thead th:first-child) {
  text-align: left !important;
}
:deep(.p-datatable thead th > div) {
  display: flex;
  justify-content: center;
  width: 100%;
}
:deep(.p-datatable thead th:first-child > div) {
  justify-content: flex-start;
}
:deep(.p-datatable td:not(:first-child)) {
  text-align: center;
}

:deep(.p-datatable-tbody > tr) {
  cursor: pointer;
}

:deep(.p-datatable-tbody > tr:hover) {
  background-color: var(--surface-hover);
}

:deep(.p-datatable-tbody td[data-p-editable-column="true"]) {
  cursor: pointer;
}

.balance-value {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  display: inline-block;
  cursor: pointer;
  user-select: none;
}

.balance-success {
  background-color: #c8e6c9;
  color: #2e7d32;
}

.balance-warning {
  background-color: #fff3cd;
  color: #856404;
}

.balance-danger {
  background-color: #f8d7da;
  color: #721c24;
}

.flex.justify-content-between {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

