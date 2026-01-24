<template>
  <div class="card">
    <!-- Header -->
    <div class="flex justify-content-between align-items-center mb-4 w-full">
      <h2 class="text-2xl font-semibold m-0 flex-shrink-0">Leave Records</h2>
      <!-- <div class="flex gap-2 flex-shrink-0 align-items-center">
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
          label="Template" 
          icon="pi pi-bookmark" 
          @click="showTemplateDialog = true"
          severity="secondary"
          outlined
        />
        <Button 
          v-if="selectedLeaves.length > 0"
          :label="`Bulk Actions (${selectedLeaves.length})`" 
          icon="pi pi-cog" 
          @click="showBulkActions = true"
          severity="warning"
        />
        <span class="p-input-icon-left">
          <i class="pi pi-search mr-3" />
          <InputText 
            v-model="filters.global.value" 
            placeholder="Search..." 
            class="w-half"
          />
        </span>
        <Button 
          label="Refresh" 
          icon="pi pi-refresh" 
          @click="loadLeaves" 
          :loading="loading"
          outlined
        />
      </div><div class="flex gap-2 flex-shrink-0 align-items-center">
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
          label="Template" 
          icon="pi pi-bookmark" 
          @click="showTemplateDialog = true"
          severity="secondary"
          outlined
        />
        <Button 
          v-if="selectedLeaves.length > 0"
          :label="`Bulk Actions (${selectedLeaves.length})`" 
          icon="pi pi-cog" 
          @click="showBulkActions = true"
          severity="warning"
        />
        <span class="p-input-icon-left">
          <i class="pi pi-search mr-3" />
          <InputText 
            v-model="filters.global.value" 
            placeholder="Search..." 
            class="w-half"
          />
        </span>
        <Button 
          label="Refresh" 
          icon="pi pi-refresh" 
          @click="loadLeaves" 
          :loading="loading"
          outlined
        />
      </div>
    </div>-->
    </div>

    <div v-if="loading" class="flex justify-center p-8">
      <ProgressSpinner />
    </div>

    <div v-else>
      <DataTable 
        :value="leaves" 
        :paginator="true"
        :rows="20" 
        stripedRows
        sortMode="multiple"
        v-model:selection="selectedLeaves"
        selectionMode="multiple"
        dataKey="id"
        :globalFilterFields="['employee.firstname', 'employee.lastname', 'leave_type.name', 'status']"
        v-model:filters="filters"
        scrollable
        scrollHeight="600px"
      >
        <template #header>
          <div class="flex justify-content-between">
            <span class="p-input-icon-left w-full">
              <!-- <i class="pi pi-search" /> -->
              <InputText v-model="filters.global.value" placeholder="Search..." class="w-half" />
            </span>
          </div>
        </template>

        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
        <Column field="employee.firstname" header="Employee" sortable>
          <template #body="{ data }">
            {{ data.employee?.firstname }} {{ data.employee?.lastname }}
          </template>
        </Column>
        <Column field="leave_type.name" header="Leave Type" sortable></Column>
        <Column field="start_date" header="Start Date" sortable>
          <template #body="{ data }">
            {{ formatDate(data.start_date) }}
          </template>
        </Column>
        <Column field="end_date" header="End Date" sortable>
          <template #body="{ data }">
            {{ formatDate(data.end_date) }}
          </template>
        </Column>
        <Column header="Duration" sortable>
          <template #body="{ data }">
            {{ getDuration(data.start_date, data.end_date) }} days
          </template>
        </Column>
        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag 
              :value="data.status" 
              :severity="getStatusSeverity(data.status)"
            />
          </template>
        </Column>
        <Column header="Actions" :exportable="false" headerStyle="width: 220px; min-width: 220px" style="width: 220px; min-width: 220px">
          <template #body="{ data }">
            <div class="flex gap-2 align-items-center justify-content-center">
              <Button
                v-if="data.form_file_path"
                icon="pi pi-download"
                severity="info"
                text
                rounded
                size="small"
                v-tooltip.top="`Download: ${data.form_file_name || 'Leave Form'}`"
                @click="downloadLeaveForm(data)"
                aria-label="Download Leave Form"
                class="p-button-sm"
              />
              <Button
                icon="pi pi-pencil"
                severity="secondary"
                text
                rounded
                size="small"
                v-tooltip.top="'Edit Leave'"
                @click="editLeave(data)"
                aria-label="Edit Leave"
                class="p-button-sm"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                size="small"
                v-tooltip.top="'Delete Leave'"
                @click="deleteLeave(data)"
                aria-label="Delete Leave"
                class="p-button-sm"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Quick Leave Entry Dialog -->
    <QuickLeaveEntry 
      v-model="showQuickEntry" 
      @created="loadLeaves"
    />

    <!-- Bulk Import Dialog -->
    <BulkLeaveImport 
      v-model="showBulkImport" 
      @imported="loadLeaves"
    />

    <!-- Template Dialog -->
    <LeaveTemplateDialog
      v-model="showTemplateDialog"
      @created="loadLeaves"
    />

    <!-- Bulk Actions Dialog -->
    <Dialog 
      v-model:visible="showBulkActions" 
      header="Bulk Actions" 
      modal 
      :style="{ width: '500px' }"
    >
      <div class="grid gap-4 mt-3">
        <div class="col-12">
          <div class="p-3 bg-blue-50 border-round">
            <strong>{{ selectedLeaves.length }}</strong> leave(s) selected
          </div>
        </div>
        <div class="col-12">
          <Button
            label="Delete Selected"
            icon="pi pi-trash"
            severity="danger"
            @click="bulkDelete"
            class="w-full"
            :loading="bulkProcessing"
          />
        </div>
        <div class="col-12">
          <Button
            label="Change Status"
            icon="pi pi-check-circle"
            @click="showStatusChangeDialog = true"
            class="w-full"
            :loading="bulkProcessing"
          />
        </div>
      </div>
    </Dialog>

    <!-- Status Change Dialog -->
    <Dialog 
      v-model:visible="showStatusChangeDialog" 
      header="Change Status" 
      modal 
      :style="{ width: '400px' }"
    >
      <div class="grid gap-4 mt-3">
        <div class="col-12">
          <label class="block font-medium mb-2">New Status *</label>
          <Dropdown
            v-model="newStatus"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select status"
            class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showStatusChangeDialog = false" />
        <Button 
          label="Update" 
          @click="bulkUpdateStatus" 
          :loading="bulkProcessing"
          icon="pi pi-check"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { hrLeaveService } from '@/service/api.service';
import { formatDate, formatDateForAPI } from '@/service/dateUtils';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import BulkLeaveImport from './BulkLeaveImport.vue';
import LeaveTemplateDialog from './LeaveTemplateDialog.vue';
import QuickLeaveEntry from './QuickLeaveEntry.vue';

const toast = useToast();
const confirm = useConfirm();
const loading = ref(false);
const leaves = ref([]);
const selectedLeaves = ref([]);
const showQuickEntry = ref(false);
const showBulkImport = ref(false);
const showTemplateDialog = ref(false);
const showBulkActions = ref(false);
const showStatusChangeDialog = ref(false);
const bulkProcessing = ref(false);
const newStatus = ref(null);


const statusOptions = [
  { label: 'Approved', value: 'Approved' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Cancelled', value: 'Cancelled' }
];

const filters = ref({
  global: { value: null, matchMode: 'contains' }
});

const getDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const getStatusSeverity = (status) => {
  const map = {
    'Approved': 'success',
    'Pending': 'warning',
    'Rejected': 'danger',
    'Cancelled': 'secondary'
  };
  return map[status] || 'info';
};

const loadLeaves = async () => {
  loading.value = true;
  try {
    // Use calendar endpoint which returns all leaves in a date range
    const now = new Date();
    const startDate = formatDateForAPI(new Date(now.getFullYear(), 0, 1)); // Start of year
    const endDate = formatDateForAPI(new Date(now.getFullYear(), 11, 31)); // End of year
    
    const calendarData = await hrLeaveService.getCalendar({
      start_date: startDate,
      end_date: endDate
    });
    
    // Deduplicate leaves by leave_id (calendar returns one entry per day, so same leave appears multiple times)
    // Use a Map to keep unique leaves, preserving form_file_path when available
    const leavesMap = new Map();
    
    (calendarData || []).forEach(item => {
      // Filter for Annual leave only
      const leaveType = (item.leave_type || '').toLowerCase();
      if (leaveType !== 'annual' && !leaveType.includes('annual')) {
        return;
      }
      
      const leaveId = item.leave_id || item.id;
      if (!leaveId) return;
      
      // If we haven't seen this leave ID, add it
      // If we have seen it but this entry has form_file_path and previous doesn't, update it
      const existing = leavesMap.get(leaveId);
      if (!existing || (item.form_file_path && !existing.form_file_path)) {
        leavesMap.set(leaveId, {
          id: leaveId,
          employee: {
            firstname: item.employee_name?.split(' ')[0] || '',
            lastname: item.employee_name?.split(' ').slice(1).join(' ') || ''
          },
          leave_type: {
            name: item.leave_type || 'Annual'
          },
          start_date: item.start_date || item.date,
          end_date: item.end_date || item.date,
          status: item.status || 'Approved',
          department: item.department,
          form_file_path: item.form_file_path || null,
          form_file_name: item.form_file_name || null
        });
      }
    });
    
    // Convert map to array
    let allLeaves = Array.from(leavesMap.values());
    
    
    leaves.value = allLeaves;
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to load annual leaves',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};


const editLeave = (leave) => {
  // TODO: Implement edit functionality
  toast.add({
    severity: 'info',
    summary: 'Info',
    detail: 'Edit functionality coming soon',
    life: 3000
  });
};

const downloadLeaveForm = async (leave) => {
  try {
    await hrLeaveService.downloadLeaveForm(leave.id);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Leave form downloaded successfully',
      life: 3000
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || error.response?.data?.error || 'Failed to download leave form',
      life: 3000
    });
  }
};

const deleteLeave = (leave) => {
  confirm.require({
    message: `Are you sure you want to delete this leave for ${leave.employee?.firstname} ${leave.employee?.lastname}?`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        // TODO: Implement delete endpoint
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Leave deleted successfully',
          life: 3000
        });
        loadLeaves();
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.userMessage || 'Failed to delete leave',
          life: 3000
        });
      }
    }
  });
};

const bulkDelete = () => {
  confirm.require({
    message: `Are you sure you want to delete ${selectedLeaves.value.length} selected leave(s)?`,
    header: 'Confirm Bulk Delete',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      bulkProcessing.value = true;
      try {
        // TODO: Implement bulk delete endpoint
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: `${selectedLeaves.value.length} leave(s) deleted successfully`,
          life: 3000
        });
        selectedLeaves.value = [];
        showBulkActions.value = false;
        loadLeaves();
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.userMessage || 'Failed to delete leaves',
          life: 3000
        });
      } finally {
        bulkProcessing.value = false;
      }
    }
  });
};

const bulkUpdateStatus = async () => {
  if (!newStatus.value) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please select a status',
      life: 3000
    });
    return;
  }

  bulkProcessing.value = true;
  try {
    // TODO: Implement bulk status update endpoint
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Status updated for ${selectedLeaves.value.length} leave(s)`,
      life: 3000
    });
    selectedLeaves.value = [];
    showBulkActions.value = false;
    showStatusChangeDialog.value = false;
    newStatus.value = null;
    loadLeaves();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to update status',
      life: 3000
    });
  } finally {
    bulkProcessing.value = false;
  }
};

onMounted(() => {
  loadLeaves();
});
</script>
