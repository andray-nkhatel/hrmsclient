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

        <Button 
          label="Process Accruals" 
          icon="pi pi-cog" 
          @click="processAccruals" 
          :loading="processing"
          :disabled="processing"
        />
      </template>
    </Card>

    <Card v-if="result">
      <template #title>Processing Result</template>
      <template #content>
        <div class="grid">
          <div class="col-12 md:col-4">
            <div class="text-center p-3 bg-surface-100 rounded">
              <div class="text-2xl font-bold text-primary">{{ result.processed }}</div>
              <div class="text-sm text-surface-500">Processed</div>
            </div>
          </div>
          <div class="col-12 md:col-4">
            <div class="text-center p-3 bg-surface-100 rounded">
              <div class="text-2xl font-bold text-orange-500">{{ result.errors }}</div>
              <div class="text-sm text-surface-500">Errors</div>
            </div>
          </div>
          <div class="col-12 md:col-4">
            <div class="text-center p-3 bg-surface-100 rounded">
              <div class="text-2xl font-bold text-surface-700">{{ result.month }}</div>
              <div class="text-sm text-surface-500">Month</div>
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { hrLeaveService } from '@/service/api.service';

const toast = useToast();
const processing = ref(false);
const selectedMonth = ref(null);
const result = ref(null);

const processAccruals = async () => {
  processing.value = true;
  try {
    const month = selectedMonth.value 
      ? `${selectedMonth.value.getFullYear()}-${String(selectedMonth.value.getMonth() + 1).padStart(2, '0')}`
      : null;
    
    result.value = await hrLeaveService.processAccruals(month);
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Processed ${result.value.processed} employees for ${result.value.month}`,
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
</script>

