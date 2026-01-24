<template>
  <div class="card">
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="text-2xl font-semibold m-0">Department Leave Report</h2>
      <div class="flex ml-auto gap-2">
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
          @click="loadReport" 
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
        :value="reports" 
        stripedRows
        sortMode="multiple"
      >
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
        <Column field="total_balance" header="Total Balance" sortable>
          <template #body="{ data }">
            <Tag 
              :value="data.total_balance.toFixed(1)" 
              :severity="data.total_balance > 0 ? 'success' : 'danger'"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { hrLeaveService } from '@/service/api.service';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const toast = useToast();
const loading = ref(false);
const exporting = ref(false);
const reports = ref([]);

const loadReport = async () => {
  loading.value = true;
  try {
    reports.value = await hrLeaveService.getDepartmentReport();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to load department report',
      life: 3000
    });
  } finally {
    loading.value = false;
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
  loadReport();
});
</script>

