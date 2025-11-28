<script setup>
import { leaveService, leaveTypeService } from '@/service/api.service';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const toast = useToast();
const router = useRouter();

const leaveTypes = ref([]);
const loading = ref(false);
const submitting = ref(false);

const form = ref({
    leave_type_id: null,
    start_date: null,
    end_date: null,
    reason: ''
});

const minDate = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
});

const loadLeaveTypes = async () => {
    loading.value = true;
    try {
        leaveTypes.value = await leaveTypeService.getAll();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load leave types',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

const formatDateForApi = (date) => {
    if (!date) return null;
    const d = new Date(date);
    // API expects date format: 2006-01-02 (YYYY-MM-DD)
    return d.toISOString().split('T')[0];
};

const submitLeave = async () => {
    if (!form.value.leave_type_id || !form.value.start_date || !form.value.end_date) {
        toast.add({
            severity: 'error',
            summary: 'Validation Error',
            detail: 'Please fill in all required fields',
            life: 3000
        });
        return;
    }

    if (form.value.start_date > form.value.end_date) {
        toast.add({
            severity: 'error',
            summary: 'Validation Error',
            detail: 'End date must be after start date',
            life: 3000
        });
        return;
    }

    submitting.value = true;
    try {
        await leaveService.apply({
            leave_type_id: form.value.leave_type_id,
            start_date: formatDateForApi(form.value.start_date),
            end_date: formatDateForApi(form.value.end_date),
            reason: form.value.reason
        });

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Leave request submitted successfully',
            life: 3000
        });

        router.push('/app/leaves');
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.response?.data?.error || error.userMessage || 'Failed to submit leave request',
            life: 3000
        });
    } finally {
        submitting.value = false;
    }
};

onMounted(() => {
    loadLeaveTypes();
});
</script>

<template>
    <div class="card">
        <h2 class="text-2xl font-semibold mb-6">Apply for Leave</h2>
        
        <form @submit.prevent="submitLeave" class="max-w-2xl">
            <div class="mb-4">
                <label for="leaveType" class="block text-surface-900 dark:text-surface-0 font-medium mb-2">
                    Leave Type <span class="text-red-500">*</span>
                </label>
                <Select id="leaveType" v-model="form.leave_type_id" :options="leaveTypes" 
                        optionLabel="name" optionValue="id" placeholder="Select leave type" 
                        class="w-full" :loading="loading" />
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label for="startDate" class="block text-surface-900 dark:text-surface-0 font-medium mb-2">
                        Start Date <span class="text-red-500">*</span>
                    </label>
                    <DatePicker id="startDate" v-model="form.start_date" :minDate="minDate" 
                                dateFormat="yy-mm-dd" class="w-full" showIcon />
                </div>
                <div>
                    <label for="endDate" class="block text-surface-900 dark:text-surface-0 font-medium mb-2">
                        End Date <span class="text-red-500">*</span>
                    </label>
                    <DatePicker id="endDate" v-model="form.end_date" :minDate="form.start_date || minDate" 
                                dateFormat="yy-mm-dd" class="w-full" showIcon />
                </div>
            </div>
            
            <div class="mb-6">
                <label for="reason" class="block text-surface-900 dark:text-surface-0 font-medium mb-2">
                    Reason (Optional)
                </label>
                <Textarea id="reason" v-model="form.reason" rows="4" class="w-full" 
                          placeholder="Enter reason for leave..." />
            </div>
            
            <div class="flex gap-2">
                <Button type="submit" label="Submit Request" icon="pi pi-check" :loading="submitting" />
                <router-link to="/app/leaves">
                    <Button type="button" label="Cancel" severity="secondary" outlined />
                </router-link>
            </div>
        </form>
    </div>
</template>

