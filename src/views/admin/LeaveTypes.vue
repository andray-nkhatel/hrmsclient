<script setup>
import { leaveTypeService } from '@/service/api.service';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const toast = useToast();
const leaveTypes = ref([]);
const loading = ref(true);
const dialogVisible = ref(false);
const editMode = ref(false);
const submitting = ref(false);

const form = ref({
    id: null,
    name: '',
    max_days: 1
});

const loadLeaveTypes = async () => {
    loading.value = true;
    try {
        leaveTypes.value = await leaveTypeService.getAll();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load leave types', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const openNew = () => {
    form.value = { id: null, name: '', max_days: 1 };
    editMode.value = false;
    dialogVisible.value = true;
};

const openEdit = (item) => {
    form.value = { ...item };
    editMode.value = true;
    dialogVisible.value = true;
};

const saveLeaveType = async () => {
    if (!form.value.name || form.value.max_days < 1) {
        toast.add({ severity: 'error', summary: 'Validation Error', detail: 'Please fill all fields correctly', life: 3000 });
        return;
    }

    submitting.value = true;
    try {
        if (editMode.value) {
            await leaveTypeService.update(form.value.id, { name: form.value.name, max_days: form.value.max_days });
            toast.add({ severity: 'success', summary: 'Success', detail: 'Leave type updated', life: 3000 });
        } else {
            await leaveTypeService.create({ name: form.value.name, max_days: form.value.max_days });
            toast.add({ severity: 'success', summary: 'Success', detail: 'Leave type created', life: 3000 });
        }
        dialogVisible.value = false;
        await loadLeaveTypes();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.userMessage || error.response?.data?.error || 'Operation failed', life: 3000 });
    } finally {
        submitting.value = false;
    }
};

const deleteLeaveType = async (id) => {
    try {
        await leaveTypeService.delete(id);
        toast.add({ severity: 'success', summary: 'Success', detail: 'Leave type deleted', life: 3000 });
        await loadLeaveTypes();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete leave type', life: 3000 });
    }
};

onMounted(() => loadLeaveTypes());
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-semibold m-0">Leave Types</h2>
            <Button label="Add Leave Type" icon="pi pi-plus" @click="openNew" />
        </div>
        
        <DataTable :value="leaveTypes" :loading="loading" stripedRows>
            <Column field="id" header="ID" sortable style="width: 80px" />
            <Column field="name" header="Name" sortable />
            <Column field="max_days" header="Max Days" sortable style="width: 120px" />
            <Column header="Actions" style="width: 150px">
                <template #body="{ data }">
                    <div class="flex gap-2">
                        <Button icon="pi pi-pencil" size="small" outlined @click="openEdit(data)" />
                        <Button icon="pi pi-trash" size="small" severity="danger" outlined @click="deleteLeaveType(data.id)" />
                    </div>
                </template>
            </Column>
        </DataTable>
        
        <Dialog v-model:visible="dialogVisible" :header="editMode ? 'Edit Leave Type' : 'New Leave Type'" modal style="width: 400px">
            <div class="mb-4">
                <label class="block font-medium mb-2">Name</label>
                <InputText v-model="form.name" class="w-full" />
            </div>
            <div class="mb-4">
                <label class="block font-medium mb-2">Max Days</label>
                <InputNumber v-model="form.max_days" :min="1" class="w-full" />
            </div>
            <template #footer>
                <Button label="Cancel" severity="secondary" @click="dialogVisible = false" />
                <Button label="Save" @click="saveLeaveType" :loading="submitting" />
            </template>
        </Dialog>
    </div>
</template>

