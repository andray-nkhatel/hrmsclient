<script setup>
import { leaveService } from '@/service/api.service';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const toast = useToast();
const leaves = ref([]);
const loading = ref(true);
const processing = ref(null);

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString();
};

const getEmployeeName = (employee) => {
    if (!employee) return 'Unknown';
    return `${employee.firstname} ${employee.lastname}`;
};

const loadPendingLeaves = async () => {
    loading.value = true;
    try {
        leaves.value = await leaveService.getPending();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.userMessage || 'Failed to load pending leaves',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

const approveLeave = async (id) => {
    processing.value = id;
    try {
        await leaveService.approve(id);
        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Leave approved successfully',
            life: 3000
        });
        await loadPendingLeaves();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.response?.data?.error || 'Failed to approve leave',
            life: 3000
        });
    } finally {
        processing.value = null;
    }
};

const rejectLeave = async (id) => {
    processing.value = id;
    try {
        await leaveService.reject(id);
        toast.add({
            severity: 'warn',
            summary: 'Rejected',
            detail: 'Leave request rejected',
            life: 3000
        });
        await loadPendingLeaves();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.response?.data?.error || 'Failed to reject leave',
            life: 3000
        });
    } finally {
        processing.value = null;
    }
};

onMounted(() => {
    loadPendingLeaves();
});
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-semibold m-0">Pending Leave Requests</h2>
            <Button icon="pi pi-refresh" outlined @click="loadPendingLeaves" :loading="loading" />
        </div>
        
        <DataTable :value="leaves" :loading="loading" stripedRows paginator :rows="10"
                   emptyMessage="No pending leave requests">
            <Column header="Employee">
                <template #body="{ data }">
                    <div>
                        <div class="font-semibold">{{ getEmployeeName(data.employee) }}</div>
                        <div class="text-sm text-surface-500">{{ data.employee?.department }}</div>
                    </div>
                </template>
            </Column>
            <Column field="leave_type.name" header="Leave Type" sortable />
            <Column header="Duration">
                <template #body="{ data }">
                    {{ formatDate(data.start_date) }} - {{ formatDate(data.end_date) }}
                </template>
            </Column>
            <Column field="reason" header="Reason">
                <template #body="{ data }">
                    {{ data.reason || '-' }}
                </template>
            </Column>
            <Column field="created_at" header="Applied On" sortable>
                <template #body="{ data }">
                    {{ formatDate(data.created_at) }}
                </template>
            </Column>
            <Column header="Actions" style="width: 200px">
                <template #body="{ data }">
                    <div class="flex gap-2">
                        <Button icon="pi pi-check" severity="success" size="small" 
                                @click="approveLeave(data.id)" 
                                :loading="processing === data.id"
                                v-tooltip="'Approve'" />
                        <Button icon="pi pi-times" severity="danger" size="small" 
                                @click="rejectLeave(data.id)"
                                :loading="processing === data.id"
                                v-tooltip="'Reject'" />
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
</template>

