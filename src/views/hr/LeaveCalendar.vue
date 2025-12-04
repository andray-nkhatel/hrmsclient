<template>
  <div class="card">
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="text-2xl font-semibold m-0">Leave Calendar</h2>
      <div class="flex gap-2">
        <Calendar 
          v-model="dateRange" 
          selectionMode="range" 
          :manualInput="false"
          dateFormat="yy-mm-dd"
          @date-select="onDateSelect"
          placeholder="Select date range"
          class="w-auto"
        />
        <InputText 
          v-model="departmentFilter" 
          placeholder="Filter by department" 
          class="w-12"
          @input="loadCalendar"
        />
        <Button 
          label="Refresh" 
          icon="pi pi-refresh" 
          @click="loadCalendar" 
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
        :value="calendar" 
        :paginator="true" 
        :rows="50" 
        stripedRows
        sortMode="multiple"
        :globalFilterFields="['employee_name', 'department', 'leave_type']"
      >
        <template #header>
          <div class="flex justify-content-between">
            <span class="p-input-icon-left w-full">
              <i class="pi pi-search" />
              <InputText v-model="filters.global.value" placeholder="Search..." class="w-full" />
            </span>
          </div>
        </template>

        <Column field="date" header="Date" sortable>
          <template #body="{ data }">
            {{ formatDate(data.date) }}
          </template>
        </Column>
        <Column field="employee_name" header="Employee" sortable></Column>
        <Column field="department" header="Department" sortable></Column>
        <Column field="leave_type" header="Leave Type" sortable></Column>
        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag 
              :value="data.status" 
              :severity="data.status === 'Approved' ? 'success' : 'warning'"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
// FilterMatchMode is auto-imported by PrimeVue
import { hrLeaveService } from '@/service/api.service';
import { formatDate, formatDateForAPI } from '@/service/dateUtils';

const toast = useToast();
const loading = ref(false);
const calendar = ref([]);
const dateRange = ref(null);

const departmentFilter = ref(null);
const filters = ref({
  global: { value: null, matchMode: 'contains' }
});

const onDateSelect = () => {
  if (dateRange.value && Array.isArray(dateRange.value) && dateRange.value.length === 2) {
    loadCalendar();
  }
};

const loadCalendar = async () => {
  loading.value = true;
  try {
    const filterParams = {};
    
    if (dateRange.value && Array.isArray(dateRange.value) && dateRange.value.length === 2) {
      filterParams.start_date = formatDateForAPI(dateRange.value[0]);
      filterParams.end_date = formatDateForAPI(dateRange.value[1]);
    } else {
      // Default to current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      filterParams.start_date = formatDateForAPI(startOfMonth);
      filterParams.end_date = formatDateForAPI(endOfMonth);
    }
    
    if (departmentFilter.value) {
      filterParams.department = departmentFilter.value;
    }
    
    calendar.value = await hrLeaveService.getCalendar(filterParams);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to load calendar',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadCalendar();
});
</script>

