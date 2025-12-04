<template>
  <div class="card">
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="text-2xl font-semibold m-0">Annual Leave Balance</h2>
      <Button 
        label="Refresh" 
        icon="pi pi-refresh" 
        @click="loadBalance" 
        :loading="loading"
        outlined
      />
    </div>

    <div v-if="loading" class="flex justify-center p-8">
      <ProgressSpinner />
    </div>

    <div v-else-if="balance" class="grid">
      <!-- Summary Cards -->
      <div class="col-12 lg:col-4">
        <Card>
          <template #content>
            <div class="text-center">
              <div class="text-4xl font-bold text-primary mb-2">{{ balance.current_balance.toFixed(1) }}</div>
              <div class="text-sm text-surface-500">Current Balance</div>
            </div>
          </template>
        </Card>
      </div>
      <div class="col-12 lg:col-4">
        <Card>
          <template #content>
            <div class="text-center">
              <div class="text-4xl font-bold text-green-500 mb-2">{{ balance.total_accrued.toFixed(1) }}</div>
              <div class="text-sm text-surface-500">Total Accrued</div>
            </div>
          </template>
        </Card>
      </div>
      <div class="col-12 lg:col-4">
        <Card>
          <template #content>
            <div class="text-center">
              <div class="text-4xl font-bold text-orange-500 mb-2">{{ balance.total_used.toFixed(1) }}</div>
              <div class="text-sm text-surface-500">Total Used</div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Pending and Upcoming -->
      <div class="col-12 lg:col-6">
        <Card>
          <template #content>
            <div class="flex align-items-center justify-content-between">
              <div>
                <div class="text-2xl font-bold mb-1">{{ balance.pending_leaves }}</div>
                <div class="text-sm text-surface-500">Pending Requests</div>
              </div>
              <i class="pi pi-clock text-3xl text-yellow-500"></i>
            </div>
          </template>
        </Card>
      </div>
      <div class="col-12 lg:col-6">
        <Card>
          <template #content>
            <div class="flex align-items-center justify-content-between">
              <div>
                <div class="text-2xl font-bold mb-1">{{ balance.upcoming_leaves }}</div>
                <div class="text-sm text-surface-500">Upcoming Leaves</div>
              </div>
              <i class="pi pi-calendar text-3xl text-blue-500"></i>
            </div>
          </template>
        </Card>
      </div>

      <!-- Monthly Accruals Table -->
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
                    :value="data.days_balance.toFixed(1)" 
                    :severity="data.days_balance > 0 ? 'success' : 'danger'"
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
            </DataTable>
          </template>
        </Card>
      </div>
    </div>

    <div v-else class="text-center p-8 text-surface-500">
      No balance information available
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { hrLeaveService } from '@/service/api.service';

const route = useRoute();
const toast = useToast();
const loading = ref(false);
const balance = ref(null);

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

onMounted(() => {
  loadBalance();
});
</script>

