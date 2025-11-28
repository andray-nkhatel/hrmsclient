<script setup>
import { employeeService } from '@/service/api.service';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const toast = useToast();
const employees = ref([]);
const loading = ref(true);
const dialogVisible = ref(false);
const uploadDialogVisible = ref(false);
const editMode = ref(false);
const submitting = ref(false);
const uploading = ref(false);
const isAdmin = ref(false);
const uploadResult = ref(null);
const fileInput = ref(null);

const roles = [
    { label: 'Employee', value: 'employee' },
    { label: 'Manager', value: 'manager' }
];

const form = ref({
    id: null,
    nrc: '',
    username: '',
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    department: '',
    role: 'employee'
});

const loadEmployees = async () => {
    loading.value = true;
    try {
        employees.value = await employeeService.getAll();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load employees', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const openNew = (admin = false) => {
    isAdmin.value = admin;
    form.value = { id: null, nrc: '', username: '', firstname: '', lastname: '', email: '', password: '', department: '', role: 'employee' };
    editMode.value = false;
    dialogVisible.value = true;
};

const openEdit = (item) => {
    isAdmin.value = item.role === 'admin';
    form.value = { ...item, password: '' };
    editMode.value = true;
    dialogVisible.value = true;
};

const saveEmployee = async () => {
    if (!form.value.firstname || !form.value.lastname || !form.value.email) {
        toast.add({ severity: 'error', summary: 'Validation Error', detail: 'Please fill required fields', life: 3000 });
        return;
    }

    if (!editMode.value && !form.value.password) {
        toast.add({ severity: 'error', summary: 'Validation Error', detail: 'Password is required', life: 3000 });
        return;
    }

    submitting.value = true;
    try {
        if (editMode.value) {
            const updateData = {
                firstname: form.value.firstname,
                lastname: form.value.lastname,
                email: form.value.email,
                department: form.value.department
            };
            if (!isAdmin.value) updateData.role = form.value.role;
            await employeeService.update(form.value.id, updateData);
            toast.add({ severity: 'success', summary: 'Success', detail: 'Employee updated', life: 3000 });
        } else {
            if (isAdmin.value) {
                await employeeService.createAdmin({
                    username: form.value.username,
                    firstname: form.value.firstname,
                    lastname: form.value.lastname,
                    email: form.value.email,
                    password: form.value.password,
                    department: form.value.department
                });
            } else {
                await employeeService.create({
                    nrc: form.value.nrc,
                    firstname: form.value.firstname,
                    lastname: form.value.lastname,
                    email: form.value.email,
                    password: form.value.password,
                    department: form.value.department,
                    role: form.value.role
                });
            }
            toast.add({ severity: 'success', summary: 'Success', detail: 'Employee created', life: 3000 });
        }
        dialogVisible.value = false;
        await loadEmployees();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.userMessage || error.response?.data?.error || 'Operation failed', life: 3000 });
    } finally {
        submitting.value = false;
    }
};

const deleteEmployee = async (id) => {
    try {
        await employeeService.delete(id);
        toast.add({ severity: 'success', summary: 'Success', detail: 'Employee deleted', life: 3000 });
        await loadEmployees();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete employee', life: 3000 });
    }
};

const getRoleSeverity = (role) => {
    switch (role) {
        case 'admin': return 'danger';
        case 'manager': return 'warn';
        default: return 'info';
    }
};

const downloadTemplate = async () => {
    try {
        await employeeService.downloadTemplate();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to download template', life: 3000 });
    }
};

const openUploadDialog = () => {
    uploadResult.value = null;
    uploadDialogVisible.value = true;
};

const handleFileUpload = async (event) => {
    const file = event.files[0];
    if (!file) return;

    uploading.value = true;
    uploadResult.value = null;
    try {
        uploadResult.value = await employeeService.bulkUpload(file);
        toast.add({ 
            severity: uploadResult.value.failed > 0 ? 'warn' : 'success', 
            summary: 'Upload Complete', 
            detail: `${uploadResult.value.success} of ${uploadResult.value.total} employees created`, 
            life: 5000 
        });
        await loadEmployees();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.error || 'Upload failed', life: 3000 });
    } finally {
        uploading.value = false;
    }
};

onMounted(() => loadEmployees());
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-semibold m-0">Employees</h2>
            <div class="flex gap-2">
                <Button label="Download Template" icon="pi pi-download" severity="secondary" outlined @click="downloadTemplate" />
                <Button label="Bulk Upload" icon="pi pi-upload" severity="secondary" @click="openUploadDialog" />
                <Button label="Add Employee" icon="pi pi-plus" @click="openNew(false)" />
                <Button label="Add Admin" icon="pi pi-user-plus" severity="secondary" @click="openNew(true)" />
            </div>
        </div>
        
        <DataTable :value="employees" :loading="loading" stripedRows paginator :rows="10">
            <Column field="id" header="ID" sortable style="width: 60px" />
            <Column header="Name">
                <template #body="{ data }">
                    {{ data.firstname }} {{ data.lastname }}
                </template>
            </Column>
            <Column header="NRC/Username">
                <template #body="{ data }">
                    {{ data.nrc || data.username || '-' }}
                </template>
            </Column>
            <Column field="email" header="Email" sortable />
            <Column field="department" header="Department" sortable />
            <Column field="role" header="Role" sortable>
                <template #body="{ data }">
                    <Tag :value="data.role" :severity="getRoleSeverity(data.role)" />
                </template>
            </Column>
            <Column header="Actions" style="width: 150px">
                <template #body="{ data }">
                    <div class="flex gap-2">
                        <Button icon="pi pi-pencil" size="small" outlined @click="openEdit(data)" />
                        <Button icon="pi pi-trash" size="small" severity="danger" outlined @click="deleteEmployee(data.id)" />
                    </div>
                </template>
            </Column>
        </DataTable>
        
        <Dialog v-model:visible="dialogVisible" :header="editMode ? 'Edit Employee' : (isAdmin ? 'New Admin' : 'New Employee')" modal style="width: 500px">
            <div class="grid grid-cols-2 gap-4">
                <div v-if="!editMode && isAdmin">
                    <label class="block font-medium mb-2">Username *</label>
                    <InputText v-model="form.username" class="w-full" />
                </div>
                <div v-if="!editMode && !isAdmin">
                    <label class="block font-medium mb-2">NRC *</label>
                    <InputText v-model="form.nrc" class="w-full" placeholder="123456/78/9" />
                </div>
                <div>
                    <label class="block font-medium mb-2">First Name *</label>
                    <InputText v-model="form.firstname" class="w-full" />
                </div>
                <div>
                    <label class="block font-medium mb-2">Last Name *</label>
                    <InputText v-model="form.lastname" class="w-full" />
                </div>
                <div class="col-span-2">
                    <label class="block font-medium mb-2">Email *</label>
                    <InputText v-model="form.email" type="email" class="w-full" />
                </div>
                <div v-if="!editMode" class="col-span-2">
                    <label class="block font-medium mb-2">Password *</label>
                    <Password v-model="form.password" class="w-full" :feedback="false" toggleMask />
                </div>
                <div>
                    <label class="block font-medium mb-2">Department</label>
                    <InputText v-model="form.department" class="w-full" />
                </div>
                <div v-if="!isAdmin">
                    <label class="block font-medium mb-2">Role</label>
                    <Select v-model="form.role" :options="roles" optionLabel="label" optionValue="value" class="w-full" />
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" severity="secondary" @click="dialogVisible = false" />
                <Button label="Save" @click="saveEmployee" :loading="submitting" />
            </template>
        </Dialog>

        <!-- Bulk Upload Dialog -->
        <Dialog v-model:visible="uploadDialogVisible" header="Bulk Upload Employees" modal style="width: 550px">
            <div class="mb-4">
                <p class="text-surface-600 dark:text-surface-300 mb-4">
                    Upload a CSV file with employee data. 
                    <a href="#" @click.prevent="downloadTemplate" class="text-primary underline">Download template</a> for the correct format.
                </p>
                <FileUpload 
                    mode="basic" 
                    accept=".csv" 
                    :maxFileSize="1000000" 
                    @select="handleFileUpload"
                    :disabled="uploading"
                    chooseLabel="Select CSV File"
                />
            </div>
            
            <div v-if="uploading" class="text-center py-4">
                <ProgressSpinner style="width: 50px; height: 50px" />
                <p class="mt-2">Uploading...</p>
            </div>
            
            <div v-if="uploadResult" class="mt-4 p-4 rounded-lg" :class="uploadResult.failed > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-green-50 dark:bg-green-900/20'">
                <h4 class="font-semibold mb-2">Upload Results</h4>
                <p><strong>Total:</strong> {{ uploadResult.total }}</p>
                <p class="text-green-600"><strong>Success:</strong> {{ uploadResult.success }}</p>
                <p v-if="uploadResult.failed > 0" class="text-red-600"><strong>Failed:</strong> {{ uploadResult.failed }}</p>
                <div v-if="uploadResult.errors && uploadResult.errors.length > 0" class="mt-2">
                    <p class="font-medium text-red-600">Errors:</p>
                    <ul class="list-disc list-inside text-sm text-red-500">
                        <li v-for="(error, idx) in uploadResult.errors" :key="idx">{{ error }}</li>
                    </ul>
                </div>
            </div>
            
            <template #footer>
                <Button label="Close" @click="uploadDialogVisible = false" />
            </template>
        </Dialog>
    </div>
</template>

