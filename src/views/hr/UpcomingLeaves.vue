<template>
  <div class="card">
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="text-2xl font-semibold m-0">Upcoming Leaves</h2>
      <div class="flex gap-2">
        <InputNumber 
          v-model="days" 
          :min="1" 
          :max="365" 
          placeholder="Days ahead"
          class="w-8"
          @input="loadUpcoming"
        />
        <Button 
          label="Refresh" 
          icon="pi pi-refresh" 
          @click="loadUpcoming" 
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
        :value="leaves" 
        :paginator="true" 
        :rows="20" 
        stripedRows
        sortMode="multiple"
        :globalFilterFields="['employee.firstname', 'employee.lastname', 'employee.department']"
      >
        <template #header>
          <div class="flex justify-content-between">
            <span class="p-input-icon-left w-full">
              <i class="pi pi-search" />
              <InputText v-model="filters.global.value" placeholder="Search..." class="w-full" />
            </span>
          </div>
        </template>

        <Column field="employee.firstname" header="Employee" sortable>
          <template #body="{ data }">
            {{ data.employee?.firstname }} {{ data.employee?.lastname }}
          </template>
        </Column>
        <Column field="employee.department" header="Department" sortable></Column>
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
        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag 
              :value="data.status" 
              severity="success"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
// FilterMatchMode is auto-imported by PrimeVue
import { hrLeaveService } from '@/service/api.service';
import { formatDate, formatDateForAPI } from '@/service/dateUtils';

const toast = useToast();
const loading = ref(false);
const leaves = ref([]);
const days = ref(30);

const filters = ref({
  global: { value: null, matchMode: 'contains' }
});

const loadUpcoming = async () => {
  loading.value = true;
  try {
    leaves.value = await hrLeaveService.getUpcoming(days.value);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to load upcoming leaves',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadUpcoming();
});
</script>

