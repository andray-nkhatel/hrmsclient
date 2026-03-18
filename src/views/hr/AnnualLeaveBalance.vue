<template>
  <div class="card">
    <div class="mb-4 w-full">
      <h2 class="text-2xl font-semibold m-0">
        Annual Leave Balance
        <span v-if="balance" class="text-primary ml-2">{{ balance.employee_name }}</span>
      </h2>
      <div class="flex items-center justify-end gap-2 flex-wrap mt-3">
        <Button 
          icon="pi pi-file-excel" 
          @click="exportToExcel" 
          :loading="exporting"
          severity="success"
          outlined
          rounded
          aria-label="Export Excel"
          v-tooltip.top="'Export Excel'"
        />
        <Button 
          icon="pi pi-file-pdf" 
          @click="exportToPDF" 
          :loading="exporting"
          severity="danger"
          outlined
          rounded
          aria-label="Export PDF"
          v-tooltip.top="'Export PDF'"
        />
        <Button 
          icon="pi pi-upload" 
          @click="openImportDialog" 
          severity="info"
          outlined
          rounded
          aria-label="Import CSV"
          v-tooltip.top="'Import CSV'"
        />
        <Button 
          icon="pi pi-plus" 
          @click="openAccrualDialog" 
          severity="success"
          outlined
          rounded
          aria-label="Add accruals"
          v-tooltip.top="'Add accruals'"
        />
        <Button 
          icon="pi pi-refresh" 
          @click="loadBalance" 
          :loading="loading"
          outlined
          rounded
          aria-label="Refresh"
          v-tooltip.top="'Refresh'"
        />
      </div>
    </div>

    <div v-if="loading" class="flex justify-center p-8">
      <ProgressSpinner />
    </div>

    <div v-else-if="balance">
      <!-- Key Stats - Horizontal Layout -->
      <div class="flex align-items-center gap-1 mb-4 flex-wrap">
        <div class="stat-item">
          <div :class="['stat-value', balance.current_balance < 0 ? 'text-red-500' : 'text-primary']">
            {{ balance.current_balance.toFixed(1) }}
            <span v-if="balance.current_balance < 0" class="text-xs ml-1">(Overdrawn)</span>
          </div>
          <div class="stat-label">Current Balance</div>
        </div>
        <div class="stat-item">
          <div class="stat-value text-green-500">{{ balance.total_accrued.toFixed(1) }}</div>
          <div class="stat-label">Total Accrued</div>
        </div>
        <div class="stat-item">
          <div class="stat-value text-orange-500">{{ balance.total_used.toFixed(1) }}</div>
          <div class="stat-label">Total Used</div>
        </div>
        <div class="stat-item">
          <div :class="['stat-value', (balance.all_time_net_balance || 0) < 0 ? 'text-red-500' : 'text-blue-500']">
            {{ (balance.all_time_net_balance || 0).toFixed(1) }}
            <span v-if="(balance.all_time_net_balance || 0) < 0" class="text-xs ml-1">(Overdrawn)</span>
          </div>
          <div class="stat-label">All-Time Net Balance</div>
        </div>
        <div class="stat-item" v-if="balance.carry_over_balance !== undefined && balance.carry_over_balance > 0">
          <div class="stat-value text-purple-500">{{ (balance.carry_over_balance || 0).toFixed(1) }}</div>
          <div class="stat-label">Carry-Over Balance</div>
        </div>
      </div>

      <!-- Pending and Upcoming - Horizontal Layout -->
      <div class="flex align-items-center gap-1 mb-4 flex-wrap">
        <div class="stat-item">
          <div class="stat-value text-yellow-500">{{ balance.pending_leaves }}</div>
          <div class="stat-label">Pending Requests</div>
        </div>
        <div class="stat-item">
          <div class="stat-value text-blue-500">{{ balance.upcoming_leaves }}</div>
          <div class="stat-label">Upcoming Leaves</div>
        </div>
      </div>

      <!-- Monthly Accruals Table -->
      <div class="grid">
      <div class="col-12">
        <Card>
          <template #title>Monthly Accrual History</template>
          <template #content>
            <DataTable :value="balance.accruals" :paginator="true" :rows="10" stripedRows>
              <Column field="month" header="Month" sortable></Column>
              <Column field="days_accrued" header="Days Accrued" sortable>
                <template #body="{ data }">
                  {{ data.days_accrued.toFixed(1) }}
                </template>
              </Column>
              <Column field="days_used" header="Days Used" sortable>
                <template #body="{ data }">
                  {{ data.days_used.toFixed(1) }}
                </template>
              </Column>
              <Column field="days_balance" header="Balance" sortable>
                <template #body="{ data }">
                  <Tag 
                    :value="`${data.days_balance.toFixed(1)}${data.days_balance < 0 ? ' (Overdrawn)' : ''}`" 
                    :severity="data.days_balance > 0 ? 'success' : data.days_balance < 0 ? 'danger' : 'warning'"
                  />
                </template>
              </Column>
              <Column field="is_processed" header="Status">
                <template #body="{ data }">
                  <Tag 
                    :value="data.is_processed ? 'Processed' : 'Pending'" 
                    :severity="data.is_processed ? 'success' : 'warning'"
                  />
                </template>
              </Column>
              <Column field="processed_at" header="Processed At" sortable>
                <template #body="{ data }">
                  <span v-if="data.processed_at">
                    {{ formatDate(data.processed_at) }}
                  </span>
                  <span v-else class="text-surface-500">-</span>
                </template>
              </Column>
            </DataTable>
          </template>
        </Card>
      </div>
      </div>
    </div>

    <div v-else class="text-center p-8 text-surface-500">
      No balance information available
    </div>

    <!-- Manual Accrual Dialog -->
    <Dialog v-model:visible="accrualDialogVisible" header="Add Manual Accruals" modal :style="{ width: '600px' }">
      <TabView v-model:activeIndex="activeTab">
        <TabPanel header="Set Initial Balance (Onboarding)">
          <div class="grid gap-4 mt-3">
            <div class="col-12">
              <div class="text-sm text-surface-500 mb-3 p-3 bg-blue-50 border-round">
                <strong>Use this for onboarding employees from an old system.</strong> This sets the current balance directly without recalculating accruals. Perfect when employees already have balances and used days.
              </div>
            </div>
            <div class="col-12">
              <label class="block font-medium mb-2">Current Balance *</label>
              <InputNumber 
                v-model="initialBalance.balance" 
                :min="-1000" 
                :max="1000" 
                :step="0.5"
                class="w-full"
                placeholder="Enter current balance from old system (can be negative if overdrawn)"
              />
              <small class="text-surface-500">The actual current balance the employee has (negative values indicate overdrawn balance)</small>
            </div>
            <div class="col-12">
              <label class="block font-medium mb-2">Total Days Accrued (Optional)</label>
              <InputNumber 
                v-model="initialBalance.daysAccrued" 
                :min="0" 
                :max="1000" 
                :step="0.5"
                class="w-full"
                placeholder="Enter total days accrued (optional)"
              />
              <small class="text-surface-500">For historical tracking. Leave empty if unknown.</small>
            </div>
            <div class="col-12">
              <label class="block font-medium mb-2">Total Days Used (Optional)</label>
              <InputNumber 
                v-model="initialBalance.daysUsed" 
                :min="0" 
                :max="1000" 
                :step="0.5"
                class="w-full"
                placeholder="Enter total days used (optional)"
              />
              <small class="text-surface-500">For historical tracking. Leave empty if unknown.</small>
            </div>
            <div class="col-12">
              <label class="block font-medium mb-2">As Of Month (Optional)</label>
              <Calendar 
                v-model="initialBalance.asOfMonth" 
                view="month" 
                dateFormat="yy-mm" 
                placeholder="Select month (defaults to current month)"
                class="w-full"
                showIcon
              />
              <small class="text-surface-500">The month this balance is effective as of</small>
            </div>
            <div class="col-12">
              <label class="block font-medium mb-2">Reason *</label>
              <Textarea 
                v-model="initialBalance.reason" 
                rows="3" 
                class="w-full"
                placeholder="Enter reason (e.g., 'Initial balance from old system')"
              />
            </div>
            <div class="col-12">
              <div class="flex align-items-center gap-2">
                <Checkbox 
                  v-model="initialBalance.resetAll" 
                  inputId="resetAll" 
                  :binary="true"
                />
                <label for="resetAll" class="cursor-pointer">
                  Reset all historical accruals (delete all old records and start fresh)
                </label>
              </div>
              <small class="text-surface-500 block mt-1">
                Check this if you want to delete all existing accrual records and start with only this initial balance. 
                This will update the "Total Accrued" to match your initial balance.
              </small>
            </div>
          </div>
        </TabPanel>
        <TabPanel header="Single Accrual">
          <div class="grid gap-4 mt-3">
            <div class="col-12">
              <label class="block font-medium mb-2">Month *</label>
              <Calendar 
                v-model="singleAccrual.month" 
                view="month" 
                dateFormat="yy-mm" 
                placeholder="Select month (YYYY-MM)"
                class="w-full"
                showIcon
              />
            </div>
            <div class="col-12">
              <label class="block font-medium mb-2">Days Accrued *</label>
              <InputNumber 
                v-model="singleAccrual.days" 
                :min="0" 
                :max="100" 
                :step="0.5"
                class="w-full"
                placeholder="Enter days"
              />
            </div>
            <div class="col-12">
              <label class="block font-medium mb-2">Reason *</label>
              <Textarea 
                v-model="singleAccrual.reason" 
                rows="3" 
                class="w-full"
                placeholder="Enter reason for this accrual"
              />
            </div>
          </div>
        </TabPanel>
        
        <TabPanel header="Bulk Accrual (Onboarding)">
          <div class="grid gap-4 mt-3">
            <div class="col-12">
              <label class="block font-medium mb-2">Start Month *</label>
              <Calendar 
                v-model="bulkAccrual.startMonth" 
                view="month" 
                dateFormat="yy-mm" 
                placeholder="Select start month"
                class="w-full"
                showIcon
              />
            </div>
            <div class="col-12">
              <label class="block font-medium mb-2">End Month *</label>
              <Calendar 
                v-model="bulkAccrual.endMonth" 
                view="month" 
                dateFormat="yy-mm" 
                placeholder="Select end month"
                class="w-full"
                showIcon
              />
            </div>
            <div class="col-12">
              <label class="block font-medium mb-2">Days Per Month *</label>
              <InputNumber 
                v-model="bulkAccrual.daysPerMonth" 
                :min="0" 
                :max="100" 
                :step="0.5"
                class="w-full"
                placeholder="Enter days per month (e.g., 2.0)"
              />
            </div>
            <div class="col-12">
              <label class="block font-medium mb-2">Reason *</label>
              <Textarea 
                v-model="bulkAccrual.reason" 
                rows="3" 
                class="w-full"
                placeholder="Enter reason (e.g., 'Historical accrual from old system')"
              />
            </div>
            <div class="col-12">
              <label class="block font-medium mb-2">
                Preview 
                <span v-if="bulkAccrual.preview.length > 0">({{ bulkAccrual.preview.length }} months)</span>
              </label>
              <div v-if="bulkAccrual.preview.length > 0" class="border-round border-1 surface-border p-3" style="max-height: 200px; overflow-y: auto;">
                <div v-for="(item, idx) in bulkAccrual.preview" :key="idx" class="text-sm mb-1">
                  {{ item.month }}: {{ item.days }} days
                </div>
              </div>
              <div v-else class="border-round border-1 surface-border p-3 text-surface-500 text-sm">
                <span v-if="!bulkAccrual.startMonth || !bulkAccrual.endMonth || !bulkAccrual.daysPerMonth">
                  Please fill all fields above to generate preview.
                </span>
                <span v-else class="text-orange-500">
                  No months found. Please check that start month is before or equal to end month.
                </span>
              </div>
            </div>
          </div>
        </TabPanel>
      </TabView>
      
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="closeAccrualDialog" :disabled="submittingAccrual" />
        <Button 
          v-if="activeTab === 0"
          label="Set Initial Balance" 
          @click="setInitialBalance" 
          :loading="submittingAccrual"
          :disabled="!initialBalance.balance || !initialBalance.reason || submittingAccrual"
          icon="pi pi-check"
          severity="success"
        />
        <Button 
          v-else-if="activeTab === 1"
          label="Add Accrual" 
          @click="addSingleAccrual" 
          :loading="submittingAccrual"
          :disabled="!singleAccrual.month || !singleAccrual.days || !singleAccrual.reason"
          icon="pi pi-check"
        />
        <Button 
          v-else
          label="Add All Accruals" 
          @click="addBulkAccruals" 
          :loading="submittingAccrual"
          :disabled="submittingAccrual"
          icon="pi pi-check"
          severity="success"
        />
      </template>
    </Dialog>

    <!-- Confirm Dialog for bulk operations -->
    <ConfirmDialog />

    <!-- CSV Import Dialog -->
    <Dialog v-model:visible="importDialogVisible" header="Import Leave Balances from CSV" modal :style="{ width: '700px' }">
      <div class="grid gap-4 mt-3">
        <div class="col-12">
          <div class="text-sm text-surface-500 mb-3 p-3 bg-blue-50 border-round">
            <strong>Import leave balances from CSV file.</strong> The CSV should match the legacy system format with columns: NAME, POSITION, OPENING, DAYS EARNED, TOTAL, DAYS TAKEN, NET. The month will be automatically detected from the CSV, or you can override it below.
          </div>
        </div>
        <div class="col-12">
          <label class="block font-medium mb-2">CSV File *</label>
          <FileUpload 
            mode="basic" 
            accept=".csv" 
            :maxFileSize="10000000"
            chooseLabel="Choose CSV File"
            @select="onFileSelect"
            :auto="true"
            class="w-full"
          />
          <small class="text-surface-500" v-if="selectedFile">
            Selected: {{ selectedFile.name }} ({{ (selectedFile.size / 1024).toFixed(2) }} KB)
          </small>
        </div>
        <div class="col-12">
          <label class="block font-medium mb-2">Month (Optional)</label>
          <Calendar 
            v-model="importMonth" 
            view="month" 
            dateFormat="yy-mm" 
            placeholder="Override month from CSV (YYYY-MM)"
            class="w-full"
            showIcon
          />
          <small class="text-surface-500">Leave empty to auto-detect from CSV</small>
        </div>
        <div class="col-12">
          <div class="flex align-items-center gap-2">
            <Checkbox 
              v-model="importResetAll" 
              inputId="importResetAll" 
              :binary="true"
            />
            <label for="importResetAll" class="cursor-pointer">
              Reset all existing accruals before import
            </label>
          </div>
          <small class="text-surface-500 block mt-1">
            Check this to delete all existing accrual records before importing. This will ensure the imported data is the only data in the system.
          </small>
        </div>
        <div v-if="importResults" class="col-12">
          <div class="border-round border-1 surface-border p-3">
            <div class="flex align-items-center gap-2 mb-2">
              <Tag :value="`Total: ${importResults.total}`" severity="info" />
              <Tag :value="`Success: ${importResults.success}`" severity="success" />
              <Tag :value="`Failed: ${importResults.failed}`" severity="danger" />
            </div>
            <div v-if="importResults.month" class="text-sm text-surface-500 mb-2">
              Imported for month: <strong>{{ importResults.month }}</strong>
            </div>
            <div v-if="importResults.results && importResults.results.length > 0" class="mt-3" style="max-height: 300px; overflow-y: auto;">
              <DataTable :value="importResults.results" :paginator="true" :rows="10" stripedRows>
                <Column field="employee_name" header="Employee" sortable></Column>
                <Column field="balance" header="Balance">
                  <template #body="{ data }">
                    <span v-if="data.success">{{ data.balance.toFixed(1) }}</span>
                    <span v-else class="text-red-500">-</span>
                  </template>
                </Column>
                <Column field="success" header="Status">
                  <template #body="{ data }">
                    <Tag 
                      :value="data.success ? 'Success' : 'Failed'" 
                      :severity="data.success ? 'success' : 'danger'"
                    />
                  </template>
                </Column>
                <Column field="error" header="Error">
                  <template #body="{ data }">
                    <span v-if="data.error" class="text-red-500 text-sm">{{ data.error }}</span>
                    <span v-else>-</span>
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="closeImportDialog" :disabled="importing" />
        <Button 
          label="Import CSV" 
          @click="importCSV" 
          :loading="importing"
          :disabled="!selectedFile || importing"
          icon="pi pi-upload"
          severity="success"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import ConfirmDialog from 'primevue/confirmdialog';
import { hrLeaveService } from '@/service/api.service';
import { formatDate } from '@/service/dateUtils';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Checkbox from 'primevue/checkbox';
import FileUpload from 'primevue/fileupload';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';

const route = useRoute();
const toast = useToast();
const confirm = useConfirm();
const loading = ref(false);
const balance = ref(null);
const accrualDialogVisible = ref(false);
const submittingAccrual = ref(false);
const activeTab = ref(0);
const importDialogVisible = ref(false);
const importing = ref(false);
const selectedFile = ref(null);
const importMonth = ref(null);
const importResetAll = ref(false);
const importResults = ref(null);
const exporting = ref(false);

const initialBalance = ref({
  balance: null,
  daysAccrued: null,
  daysUsed: null,
  asOfMonth: null,
  reason: '',
  resetAll: false
});

const singleAccrual = ref({
  month: null,
  days: 2.0,
  reason: ''
});

const bulkAccrual = ref({
  startMonth: null,
  endMonth: null,
  daysPerMonth: 2.0,
  reason: '',
  preview: []
});

// Generate preview for bulk accrual
watch([() => bulkAccrual.value.startMonth, () => bulkAccrual.value.endMonth, () => bulkAccrual.value.daysPerMonth], () => {
  generateBulkPreview();
}, { immediate: false, deep: true });

const generateBulkPreview = () => {
  const preview = [];
  
  if (!bulkAccrual.value.startMonth || !bulkAccrual.value.endMonth || !bulkAccrual.value.daysPerMonth) {
    bulkAccrual.value.preview = [];
    return;
  }
  
  // Handle both Date objects and string dates
  let start = bulkAccrual.value.startMonth;
  let end = bulkAccrual.value.endMonth;
  
  if (!(start instanceof Date)) {
    start = new Date(start);
  }
  if (!(end instanceof Date)) {
    end = new Date(end);
  }
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    bulkAccrual.value.preview = [];
    return;
  }
  
  // Set to first day of month for accurate comparison
  start = new Date(start.getFullYear(), start.getMonth(), 1);
  end = new Date(end.getFullYear(), end.getMonth(), 1);
  
  if (start > end) {
    bulkAccrual.value.preview = [];
    return;
  }
  
  let current = new Date(start);
  const endDate = new Date(end);
  
  while (current <= endDate) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    preview.push({
      month: `${year}-${month}`,
      days: bulkAccrual.value.daysPerMonth
    });
    // Move to next month
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }
  
  bulkAccrual.value.preview = preview;
};

const loadBalance = async () => {
  const employeeId = route.params.id;
  if (!employeeId) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Employee ID is required',
      life: 3000
    });
    return;
  }

  loading.value = true;
  try {
    balance.value = await hrLeaveService.getEmployeeBalance(employeeId);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to load annual leave balance',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const openAccrualDialog = () => {
  accrualDialogVisible.value = true;
  activeTab.value = 0;
  resetAccrualForms();
};

const closeAccrualDialog = () => {
  accrualDialogVisible.value = false;
  resetAccrualForms();
};

const openImportDialog = () => {
  importDialogVisible.value = true;
  selectedFile.value = null;
  importMonth.value = null;
  importResetAll.value = false;
  importResults.value = null;
};

const closeImportDialog = () => {
  importDialogVisible.value = false;
  selectedFile.value = null;
  importMonth.value = null;
  importResetAll.value = false;
  importResults.value = null;
};

const onFileSelect = (event) => {
  if (event.files && event.files.length > 0) {
    selectedFile.value = event.files[0];
  }
};

const importCSV = async () => {
  if (!selectedFile.value) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please select a CSV file',
      life: 3000
    });
    return;
  }

  importing.value = true;
  importResults.value = null;
  
  try {
    const monthStr = importMonth.value ? formatMonthForAPI(importMonth.value) : null;
    const result = await hrLeaveService.bulkImportLeaveBalances(selectedFile.value, monthStr, importResetAll.value);
    
    importResults.value = result;
    
    if (result.failed === 0) {
      toast.add({
        severity: 'success',
        summary: 'Import Successful',
        detail: `Successfully imported ${result.success} employee balances for ${result.month}`,
        life: 5000
      });
    } else if (result.success > 0) {
      toast.add({
        severity: 'warn',
        summary: 'Partial Import Success',
        detail: `Imported ${result.success} of ${result.total} employees. ${result.failed} failed. See details below.`,
        life: 7000
      });
    } else {
      toast.add({
        severity: 'error',
        summary: 'Import Failed',
        detail: `Failed to import all ${result.failed} employees. See details below.`,
        life: 7000
      });
    }
    
    // Reload balance if viewing a specific employee
    if (route.params.id) {
      await loadBalance();
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Import Error',
      detail: error.userMessage || error.response?.data?.error || 'Failed to import CSV file',
      life: 5000
    });
  } finally {
    importing.value = false;
  }
};

const resetAccrualForms = () => {
  initialBalance.value = {
    balance: null,
    daysAccrued: null,
    daysUsed: null,
    asOfMonth: null,
    reason: '',
    resetAll: false
  };
  singleAccrual.value = {
    month: null,
    days: 2.0,
    reason: ''
  };
  bulkAccrual.value = {
    startMonth: null,
    endMonth: null,
    daysPerMonth: 2.0,
    reason: '',
    preview: []
  };
};

const formatMonthForAPI = (date) => {
  if (!date) return null;
  // Handle both Date objects and string dates
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const setInitialBalance = async () => {
  if (!initialBalance.value.balance || !initialBalance.value.reason) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill all required fields (Current Balance and Reason)',
      life: 3000
    });
    return;
  }

  submittingAccrual.value = true;
  try {
    const employeeId = route.params.id;
    const data = {
      balance: initialBalance.value.balance,
      reason: initialBalance.value.reason
    };

    // Add optional fields if provided
    if (initialBalance.value.daysAccrued !== null && initialBalance.value.daysAccrued > 0) {
      data.days_accrued = initialBalance.value.daysAccrued;
    }
    if (initialBalance.value.daysUsed !== null && initialBalance.value.daysUsed >= 0) {
      data.days_used = initialBalance.value.daysUsed;
    }
    if (initialBalance.value.asOfMonth) {
      const monthStr = formatMonthForAPI(initialBalance.value.asOfMonth);
      if (monthStr) {
        data.as_of_month = monthStr;
      }
    }
    if (initialBalance.value.resetAll) {
      data.reset_all = true;
    }

    await hrLeaveService.setInitialBalance(employeeId, data);

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Initial balance set to ${initialBalance.value.balance} days`,
      life: 3000
    });

    closeAccrualDialog();
    await loadBalance();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || error.response?.data?.error || 'Failed to set initial balance',
      life: 3000
    });
  } finally {
    submittingAccrual.value = false;
  }
};

const addSingleAccrual = async () => {
  if (!singleAccrual.value.month || !singleAccrual.value.days || !singleAccrual.value.reason) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill all required fields',
      life: 3000
    });
    return;
  }

  submittingAccrual.value = true;
  try {
    const employeeId = route.params.id;
    const monthStr = formatMonthForAPI(singleAccrual.value.month);
    
    await hrLeaveService.addManualAccrual(employeeId, {
      month: monthStr,
      days: singleAccrual.value.days,
      reason: singleAccrual.value.reason
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Accrual added for ${monthStr}`,
      life: 3000
    });

    closeAccrualDialog();
    await loadBalance();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || error.response?.data?.error || 'Failed to add accrual',
      life: 3000
    });
  } finally {
    submittingAccrual.value = false;
  }
};

const exportToExcel = async () => {
  const employeeId = route.params.id;
  if (!employeeId) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Employee ID is required',
      life: 3000
    });
    return;
  }

  exporting.value = true;
  try {
    await hrLeaveService.exportEmployeeBalance(employeeId, 'excel');
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
  const employeeId = route.params.id;
  if (!employeeId) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Employee ID is required',
      life: 3000
    });
    return;
  }

  exporting.value = true;
  try {
    await hrLeaveService.exportEmployeeBalance(employeeId, 'pdf');
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

const addBulkAccruals = async () => {
  console.log('addBulkAccruals called', {
    startMonth: bulkAccrual.value.startMonth,
    endMonth: bulkAccrual.value.endMonth,
    daysPerMonth: bulkAccrual.value.daysPerMonth,
    reason: bulkAccrual.value.reason,
    preview: bulkAccrual.value.preview
  });

  // Validate required fields first
  if (!bulkAccrual.value.startMonth || !bulkAccrual.value.endMonth || !bulkAccrual.value.daysPerMonth || !bulkAccrual.value.reason) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill all required fields (Start Month, End Month, Days Per Month, and Reason)',
      life: 3000
    });
    return;
  }

  // Re-generate preview to ensure it's up to date
  generateBulkPreview();
  console.log('Preview after generation:', bulkAccrual.value.preview);

  if (bulkAccrual.value.preview.length === 0) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'No months to process. Please check your date range. Start month must be before or equal to end month. Try clicking "Refresh Preview" button.',
      life: 4000
    });
    return;
  }

  let startDate = bulkAccrual.value.startMonth;
  let endDate = bulkAccrual.value.endMonth;
  
  if (!(startDate instanceof Date)) {
    startDate = new Date(startDate);
  }
  if (!(endDate instanceof Date)) {
    endDate = new Date(endDate);
  }

  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Invalid date format. Please reselect the months.',
      life: 3000
    });
    return;
  }
  
  confirm.require({
    message: `This will add accruals for ${bulkAccrual.value.preview.length} months (${startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })} to ${endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}). Continue?`,
    header: 'Confirm Bulk Accrual',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      submittingAccrual.value = true;
      try {
        const employeeId = route.params.id;
        const accruals = bulkAccrual.value.preview.map(item => ({
          month: item.month,
          days: item.days,
          reason: bulkAccrual.value.reason
        }));

        console.log('Sending bulk accruals:', { employeeId, accruals });
        const result = await hrLeaveService.bulkAddManualAccruals(employeeId, accruals);
        console.log('Bulk accrual result:', result);

        toast.add({
          severity: result.error_count > 0 ? 'warn' : 'success',
          summary: result.error_count > 0 ? 'Partial Success' : 'Success',
          detail: `${result.success_count} of ${result.total_requested} accruals added successfully${result.error_count > 0 ? `. ${result.error_count} failed.` : ''}`,
          life: 5000
        });

        closeAccrualDialog();
        await loadBalance();
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.userMessage || error.response?.data?.error || 'Failed to add bulk accruals',
          life: 3000
        });
      } finally {
        submittingAccrual.value = false;
      }
    }
  });
};

onMounted(() => {
  loadBalance();
});
</script>

<style scoped>
.stat-item {
  flex: 1;
  min-width: 120px;
  text-align: center;
  padding: 0.5rem 0.75rem;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 4px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

:deep(.card) {
  width: 100%;
}

.flex.justify-content-between.w-full {
  width: 100%;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center;
  gap: 1rem;
}
</style>

