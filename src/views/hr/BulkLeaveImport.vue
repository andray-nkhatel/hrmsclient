<template>
  <Dialog 
    v-model:visible="visible" 
    header="Bulk Import Annual Leaves from CSV" 
    modal 
    :style="{ width: '800px' }"
    @hide="resetForm"
  >
    <div class="grid gap-4 mt-3">
      <div class="col-12">
        <div class="p-3 bg-blue-50 border-round mb-3">
          <div class="font-bold mb-2">CSV Format for Annual Leave:</div>
          <div class="text-sm">
            <div>Required columns: <strong>Employee Name, Start Date, End Date, Reason (optional)</strong></div>
            <div class="mt-2"><strong>Note:</strong> All imported leaves will be Annual leave type</div>
            <div class="mt-2">Date format: <strong>YYYY-MM-DD</strong> (e.g., 2024-01-15)</div>
            <div class="mt-2">Example row: <code>John Doe, 2024-01-15, 2024-01-17, Vacation</code></div>
            <div class="mt-2 text-orange-600"><strong>⚠️ Leave Type column is optional - all will be treated as Annual leave</strong></div>
          </div>
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
        <div class="flex align-items-center gap-2">
          <Checkbox 
            v-model="skipInvalidRows" 
            inputId="skipInvalid" 
            :binary="true"
          />
          <label for="skipInvalid" class="cursor-pointer">
            Skip invalid rows (continue processing even if some rows fail)
          </label>
        </div>
      </div>

      <div v-if="importResults" class="col-12">
        <div class="border-round border-1 surface-border p-3">
          <div class="flex align-items-center gap-2 mb-2">
            <Tag :value="`Total: ${importResults.total}`" severity="info" />
            <Tag :value="`Success: ${importResults.success}`" severity="success" />
            <Tag :value="`Failed: ${importResults.failed}`" severity="danger" />
          </div>
          <div v-if="importResults.results && importResults.results.length > 0" class="mt-3" style="max-height: 400px; overflow-y: auto;">
            <DataTable :value="importResults.results" :paginator="true" :rows="10" stripedRows>
              <Column field="row_number" header="Row" sortable></Column>
              <Column field="employee_name" header="Employee" sortable></Column>
              <Column field="start_date" header="Start Date"></Column>
              <Column field="end_date" header="End Date"></Column>
              <Column field="leave_type_name" header="Leave Type"></Column>
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
      <Button label="Cancel" severity="secondary" @click="close" :disabled="importing" />
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
</template>

<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import FileUpload from 'primevue/fileupload';
import Checkbox from 'primevue/checkbox';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { hrLeaveService } from '@/service/api.service';

const props = defineProps({
  modelValue: Boolean
});

const emit = defineEmits(['update:modelValue', 'imported']);

const toast = useToast();
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const selectedFile = ref(null);
const skipInvalidRows = ref(false);
const importing = ref(false);
const importResults = ref(null);

const onFileSelect = (event) => {
  if (event.files && event.files.length > 0) {
    selectedFile.value = event.files[0];
    importResults.value = null;
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
    const result = await hrLeaveService.bulkCreateLeaves(selectedFile.value, skipInvalidRows.value);
    importResults.value = result;

    if (result.failed === 0) {
      toast.add({
        severity: 'success',
        summary: 'Import Successful',
        detail: `Successfully imported ${result.success} leave records`,
        life: 5000
      });
      emit('imported');
      setTimeout(() => close(), 2000);
    } else if (result.success > 0) {
      toast.add({
        severity: 'warn',
        summary: 'Partial Import Success',
        detail: `Imported ${result.success} of ${result.total} records. ${result.failed} failed.`,
        life: 7000
      });
      emit('imported');
    } else {
      toast.add({
        severity: 'error',
        summary: 'Import Failed',
        detail: `Failed to import all ${result.failed} records. See details below.`,
        life: 7000
      });
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

const resetForm = () => {
  selectedFile.value = null;
  skipInvalidRows.value = false;
  importResults.value = null;
};

const close = () => {
  visible.value = false;
  resetForm();
};
</script>
