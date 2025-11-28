<script setup>
import { leaveService } from '@/service/api.service';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const toast = useToast();
const leaves = ref([]);
const loading = ref(true);
const processing = ref(null);
const rejectDialogVisible = ref(false);
const selectedLeaveId = ref(null);
const rejectionReason = ref('');

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

const openRejectDialog = (id) => {
    selectedLeaveId.value = id;
    rejectionReason.value = '';
    rejectDialogVisible.value = true;
};

const rejectLeave = async () => {
    if (!rejectionReason.value.trim()) {
        toast.add({
            severity: 'error',
            summary: 'Validation Error',
            detail: 'Please provide a reason for rejection',
            life: 3000
        });
        return;
    }

    processing.value = selectedLeaveId.value;
    try {
        await leaveService.reject(selectedLeaveId.value, rejectionReason.value);
        toast.add({
            severity: 'warn',
            summary: 'Rejected',
            detail: 'Leave request rejected',
            life: 3000
        });
        rejectDialogVisible.value = false;
        rejectionReason.value = '';
        selectedLeaveId.value = null;
        await loadPendingLeaves();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.userMessage || error.response?.data?.error || 'Failed to reject leave',
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
            <Column header="Actions" style="width: 250px">
                <template #body="{ data }">
                    <div class="flex gap-2">
                        <Button icon="pi pi-check" severity="success" size="small" 
                                @click="approveLeave(data.id)" 
                                :loading="processing === data.id"
                                v-tooltip="'Approve'" />
                        <Button icon="pi pi-times" severity="danger" size="small" 
                                @click="openRejectDialog(data.id)"
                                :loading="processing === data.id"
                                v-tooltip="'Reject'" />
                        <Button icon="pi pi-history" severity="info" size="small" 
                                @click="$router.push(`/app/leaves/${data.id}/audit`)"
                                v-tooltip="'View Audit Trail'" />
                    </div>
                </template>
            </Column>
        </DataTable>

        <!-- Reject Leave Dialog -->
        <Dialog v-model:visible="rejectDialogVisible" modal header="Reject Leave Request" 
                :style="{ width: '500px' }" :closable="true">
            <div class="mb-4">
                <label class="block text-surface-900 dark:text-surface-0 font-medium mb-2">
                    Rejection Reason <span class="text-red-500">*</span>
                </label>
                <Textarea v-model="rejectionReason" rows="4" class="w-full" 
                          placeholder="Please provide a reason for rejecting this leave request..."
                          :autoFocus="true" />
            </div>
            <template #footer>
                <Button label="Cancel" severity="secondary" outlined @click="rejectDialogVisible = false" />
                <Button label="Reject Leave" severity="danger" @click="rejectLeave" 
                        :loading="processing === selectedLeaveId" />
            </template>
        </Dialog>
    </div>
</template>

