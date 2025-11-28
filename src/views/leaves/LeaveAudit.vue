<script setup>
import { leaveService } from '@/service/api.service';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const toast = useToast();
const route = useRoute();
const audits = ref([]);
const loading = ref(true);
const leaveId = ref(null);

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
};

const getActionSeverity = (action) => {
    switch (action) {
        case 'create': return 'info';
        case 'approve': return 'success';
        case 'reject': return 'danger';
        case 'cancel': return 'secondary';
        default: return 'info';
    }
};

const formatAction = (action) => {
    return action.charAt(0).toUpperCase() + action.slice(1);
};

const loadAuditTrail = async () => {
    if (!leaveId.value) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Leave ID is required',
            life: 3000
        });
        return;
    }

    loading.value = true;
    try {
        audits.value = await leaveService.getAudit(leaveId.value);
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.userMessage || 'Failed to load audit trail',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    leaveId.value = parseInt(route.params.id);
    if (leaveId.value) {
        loadAuditTrail();
    }
});
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-semibold m-0">Leave Audit Trail</h2>
            <div class="flex gap-2">
                <Button icon="pi pi-refresh" outlined @click="loadAuditTrail" :loading="loading" />
                <Button label="Back" severity="secondary" outlined @click="$router.back()" />
            </div>
        </div>

        <DataTable :value="audits" :loading="loading" stripedRows 
                   emptyMessage="No audit records found">
            <Column header="Timestamp" sortable>
                <template #body="{ data }">
                    {{ formatDate(data.created_at) }}
                </template>
            </Column>
            <Column header="Action" sortable>
                <template #body="{ data }">
                    <Tag :value="formatAction(data.action)" :severity="getActionSeverity(data.action)" />
                </template>
            </Column>
            <Column header="Performed By">
                <template #body="{ data }">
                    <div v-if="data.performer">
                        <div class="font-semibold">{{ data.performer.firstname }} {{ data.performer.lastname }}</div>
                        <div class="text-sm text-surface-500">{{ data.performer.role }}</div>
                    </div>
                    <span v-else>-</span>
                </template>
            </Column>
            <Column header="Status Change">
                <template #body="{ data }">
                    <div v-if="data.old_status && data.new_status">
                        <Tag :value="data.old_status" severity="secondary" class="mr-2" />
                        <i class="pi pi-arrow-right mx-2"></i>
                        <Tag :value="data.new_status" :severity="data.new_status === 'Approved' ? 'success' : data.new_status === 'Rejected' ? 'danger' : 'info'" />
                    </div>
                    <span v-else>-</span>
                </template>
            </Column>
            <Column field="comment" header="Comment">
                <template #body="{ data }">
                    {{ data.comment || '-' }}
                </template>
            </Column>
            <Column field="ip_address" header="IP Address">
                <template #body="{ data }">
                    <span class="text-sm text-surface-500">{{ data.ip_address || '-' }}</span>
                </template>
            </Column>
        </DataTable>
    </div>
</template>

