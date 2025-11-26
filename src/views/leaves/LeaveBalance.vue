<script setup>
import { leaveService } from '@/service/api.service';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const toast = useToast();
const balances = ref([]);
const loading = ref(true);

const loadBalance = async () => {
    loading.value = true;
    try {
        balances.value = await leaveService.getBalance();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.userMessage || 'Failed to load leave balance',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

const getProgressColor = (balance, maxDays) => {
    const percentage = (balance / maxDays) * 100;
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
};

onMounted(() => {
    loadBalance();
});
</script>

<template>
    <div class="card">
        <h2 class="text-2xl font-semibold mb-6">Leave Balance</h2>
        
        <div v-if="loading" class="flex justify-center p-8">
            <ProgressSpinner />
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="item in balances" :key="item.leave_type_id" 
                 class="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0">
                        {{ item.leave_type_name }}
                    </h3>
                    <Tag :value="`${item.balance} days left`" 
                         :severity="item.balance > 5 ? 'success' : item.balance > 0 ? 'warn' : 'danger'" />
                </div>
                
                <div class="mb-2">
                    <div class="flex justify-between text-sm text-surface-600 dark:text-surface-400 mb-1">
                        <span>Used: {{ item.used_days }} days</span>
                        <span>Max: {{ item.max_days }} days</span>
                    </div>
                    <div class="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
                        <div :class="getProgressColor(item.balance, item.max_days)"
                             class="h-2 rounded-full transition-all"
                             :style="{ width: `${(item.balance / item.max_days) * 100}%` }">
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div v-if="!loading && balances.length === 0" class="text-center p-8 text-surface-500">
            No leave types available
        </div>
    </div>
</template>

