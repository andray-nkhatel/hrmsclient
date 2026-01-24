<template>
  <div class="card">
    <h2 class="text-2xl font-semibold mb-4">Process Monthly Accruals</h2>

    <Card class="mb-4">
      <template #title>Accrual Processing</template>
      <template #content>
        <div class="field mb-4">
          <label for="month" class="block mb-2">Month to Process</label>
          <Calendar 
            id="month"
            v-model="selectedMonth" 
            view="month" 
            dateFormat="yy-mm"
            placeholder="Select month (YYYY-MM)"
            class="w-full"
          />
          <small class="text-surface-500">Leave empty to process current month</small>
        </div>

        <div class="field mb-4">
          <label class="block mb-2">Employee Selection</label>
          <div class="flex align-items-center gap-2 mb-2">
            <RadioButton 
              v-model="processMode" 
              inputId="all" 
              value="all" 
            />
            <label for="all" class="ml-2 cursor-pointer">Process All Employees</label>
          </div>
          <div class="flex align-items-center gap-2">
            <RadioButton 
              v-model="processMode" 
              inputId="selected" 
              value="selected" 
            />
            <label for="selected" class="ml-2 cursor-pointer">Process Selected Employees Only</label>
          </div>
        </div>

        <div v-if="processMode === 'selected'" class="field mb-4">
          <label for="employees" class="block mb-2">Select Employees</label>
          <MultiSelect
            id="employees"
            v-model="selectedEmployees"
            :options="employees"
            optionLabel="label"
            optionValue="id"
            placeholder="Select employees"
            :filter="true"
            filterPlaceholder="Search employees"
            :loading="loadingEmployees"
            class="w-full"
            display="chip"
          >
            <template #option="slotProps">
              <div class="flex align-items-center">
                <div>
                  <div class="font-medium">{{ slotProps.option.label }}</div>
                  <div class="text-sm text-surface-500">{{ slotProps.option.department }}</div>
                </div>
              </div>
            </template>
          </MultiSelect>
          <small class="text-surface-500">
            {{ selectedEmployees.length }} employee(s) selected
          </small>
        </div>

        <Button 
          label="Process Accruals" 
          icon="pi pi-cog" 
          @click="processAccruals" 
          :loading="processing"
          :disabled="processing || (processMode === 'selected' && selectedEmployees.length === 0)"
        />
      </template>
    </Card>

    <Card v-if="result">
      <template #title>Processing Result</template>
      <template #content>
        <div class="grid">
          <div class="col-12 md:col-3">
            <div class="text-center p-3 bg-surface-100 rounded">
              <div class="text-2xl font-bold text-primary">{{ result.processed }}</div>
              <div class="text-sm text-surface-500">Processed</div>
            </div>
          </div>
          <div class="col-12 md:col-3">
            <div class="text-center p-3 bg-surface-100 rounded">
              <div class="text-2xl font-bold text-orange-500">{{ result.errors }}</div>
              <div class="text-sm text-surface-500">Errors</div>
            </div>
          </div>
          <div class="col-12 md:col-3">
            <div class="text-center p-3 bg-surface-100 rounded">
              <div class="text-2xl font-bold text-surface-700">{{ result.total || 0 }}</div>
              <div class="text-sm text-surface-500">Total</div>
            </div>
          </div>
          <div class="col-12 md:col-3">
            <div class="text-center p-3 bg-surface-100 rounded">
              <div class="text-2xl font-bold text-blue-500">{{ result.month }}</div>
              <div class="text-sm text-surface-500">Month</div>
            </div>
          </div>
        </div>

        <div v-if="result.error_details && result.error_details.length > 0" class="mt-4">
          <h4 class="font-semibold mb-2 text-orange-500">Error Details:</h4>
          <ul class="list-none p-0 m-0">
            <li v-for="(error, index) in result.error_details" :key="index" class="mb-2 p-2 bg-red-50 border-left-3 border-red-500">
              <span class="text-sm">{{ error }}</span>
            </li>
          </ul>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { hrLeaveService, employeeService } from '@/service/api.service';

const toast = useToast();
const processing = ref(false);
const loadingEmployees = ref(false);
const selectedMonth = ref(null);
const processMode = ref('all');
const selectedEmployees = ref([]);
const employees = ref([]);
const result = ref(null);

const loadEmployees = async () => {
  loadingEmployees.value = true;
  try {
    const employeeList = await employeeService.getAll();
    employees.value = employeeList.map(emp => ({
      id: emp.id,
      label: `${emp.firstname} ${emp.lastname}`,
      department: emp.department || 'N/A'
    }));
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to load employees',
      life: 3000
    });
  } finally {
    loadingEmployees.value = false;
  }
};

const processAccruals = async () => {
  processing.value = true;
  try {
    const month = selectedMonth.value 
      ? `${selectedMonth.value.getFullYear()}-${String(selectedMonth.value.getMonth() + 1).padStart(2, '0')}`
      : null;
    
    const employeeIds = processMode.value === 'selected' && selectedEmployees.value.length > 0
      ? selectedEmployees.value
      : null;
    
    result.value = await hrLeaveService.processAccruals(month, employeeIds);
    
    const modeText = processMode.value === 'all' ? 'all employees' : `${selectedEmployees.value.length} selected employee(s)`;
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Processed ${result.value.processed} of ${result.value.total || result.value.processed} ${modeText} for ${result.value.month}`,
      life: 5000
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || 'Failed to process accruals',
      life: 3000
    });
  } finally {
    processing.value = false;
  }
};

onMounted(() => {
  loadEmployees();
});
</script>
