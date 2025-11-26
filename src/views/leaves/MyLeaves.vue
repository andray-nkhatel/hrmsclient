<script setup>
import { leaveService } from '@/service/api.service';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const toast = useToast();
const leaves = ref([]);
const loading = ref(true);

const statusSeverity = (status) => {
    switch (status) {
        case 'Approved': return 'success';
        case 'Rejected': return 'danger';
        case 'Pending': return 'warn';
        default: return 'info';
    }
};

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString();
};

const loadLeaves = async () => {
    loading.value = true;
    try {
        leaves.value = await leaveService.getMyLeaves();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.userMessage || 'Failed to load leaves',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadLeaves();
});
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-semibold m-0">My Leave History</h2>
            <router-link to="/app/leaves/apply">
                <Button label="Apply for Leave" icon="pi pi-plus" />
            </router-link>
        </div>
        
        <DataTable :value="leaves" :loading="loading" stripedRows paginator :rows="10" 
                   emptyMessage="No leave requests found">
            <Column field="leave_type.name" header="Leave Type" sortable />
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
            <Column field="reason" header="Reason">
                <template #body="{ data }">
                    {{ data.reason || '-' }}
                </template>
            </Column>
            <Column field="status" header="Status" sortable>
                <template #body="{ data }">
                    <Tag :value="data.status" :severity="statusSeverity(data.status)" />
                </template>
            </Column>
            <Column field="created_at" header="Applied On" sortable>
                <template #body="{ data }">
                    {{ formatDate(data.created_at) }}
                </template>
            </Column>
        </DataTable>
    </div>
</template>

