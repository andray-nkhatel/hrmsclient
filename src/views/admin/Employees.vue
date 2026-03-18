<script setup>
import { employeeService } from '@/service/api.service';
import { formatDate } from '@/service/dateUtils';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import ContextMenu from 'primevue/contextmenu';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import FileUpload from 'primevue/fileupload';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';

const router = useRouter();

const toast = useToast();
const employees = ref([]);
const filteredEmployees = ref([]);
const loading = ref(true);
const dialogVisible = ref(false);
const uploadDialogVisible = ref(false);
const viewDialogVisible = ref(false);
const editMode = ref(false);
const submitting = ref(false);
const uploading = ref(false);
const isAdmin = ref(false);
const uploadResult = ref(null);
const fileInput = ref(null);
const searchTerm = ref('');
const viewingEmployee = ref(null);
const contextMenu = ref(null);
const contextMenuEmployee = ref(null);

const contextMenuItems = ref([
    {
        label: 'Export to PDF',
        icon: 'pi pi-file-pdf',
        command: () => exportEmployee(contextMenuEmployee.value?.id)
    },
    {
        label: 'View Annual Leave Balance',
        icon: 'pi pi-chart-line',
        command: () => {
            const id = contextMenuEmployee.value?.id;
            if (id) router.push(`/app/hr/employees/${id}/annual-leave-balance`);
        }
    },
    { separator: true },
    {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => contextMenuEmployee.value && openEdit(contextMenuEmployee.value)
    },
    {
        label: 'Delete',
        icon: 'pi pi-trash',
        command: () => contextMenuEmployee.value?.id && deleteEmployee(contextMenuEmployee.value.id)
    }
]);

const roles = [
    { label: 'Employee', value: 'employee' },
    { label: 'Manager', value: 'manager' }
];

const departments = [
    'Accounts',
    'Administration',
    'Admissions',
    'Canteen',
    'Cleaning Services',
    'Finance',
    'Health & Safety',
    'Human Resources',
    'I.T.',
    'Library',
    'Maintenance',
    'Marketing',
    'Procurement',
    'Registrar',
    'Security',
    'Student Services',
    'Transport'
];

const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];

const employmentStatuses = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'On Leave', value: 'on_leave' },
    { label: 'Terminated', value: 'terminated' },
    { label: 'Resigned', value: 'resigned' }
];

const emergencyContactRelationships = [
    'Spouse',
    'Parent',
    'Sibling',
    'Child',
    'Relative',
    'Friend',
    'Other'
];

// Default password for new employees (no password fields on form); user can change via Profile.
const defaultNewEmployeePassword = 'Welcome123!';

const form = ref({
    id: null,
    nrc: '',
    username: '',
    firstname: '',
    lastname: '',
    email: '',
    department: '',
    role: 'employee',
    hire_date: null,
    // Additional employee fields
    phone: '',
    mobile: '',
    address: '',
    city: '',
    postal_code: '',
    date_of_birth: null,
    gender: '',
    position: '',
    employment_status: 'active',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    bank_name: '',
    bank_account_number: '',
    tax_id: '',
    notes: ''
});

const loadEmployees = async () => {
    loading.value = true;
    try {
        employees.value = await employeeService.getAll();
        filterEmployees();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load employees', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const filterEmployees = () => {
    // First filter out admin users
    const nonAdminEmployees = employees.value.filter(emp => emp.role !== 'admin');
    
    if (!searchTerm.value.trim()) {
        filteredEmployees.value = nonAdminEmployees;
        return;
    }
    
    const search = searchTerm.value.toLowerCase().trim();
    filteredEmployees.value = nonAdminEmployees.filter(emp => {
        const fullName = `${emp.firstname} ${emp.lastname}`.toLowerCase();
        const email = (emp.email || '').toLowerCase();
        const department = (emp.department || '').toLowerCase();
        const nrc = (emp.nrc || '').toLowerCase();
        const username = (emp.username || '').toLowerCase();
        
        return fullName.includes(search) || 
               email.includes(search) || 
               department.includes(search) || 
               nrc.includes(search) || 
               username.includes(search);
    });
};

const openNew = (admin = false) => {
    isAdmin.value = admin;
    form.value = { 
        id: null, 
        nrc: '', 
        username: '', 
        firstname: '', 
        lastname: '', 
        email: '', 
        department: '', 
        role: 'employee', 
        hire_date: null,
        phone: '',
        mobile: '',
        address: '',
        city: '',
        postal_code: '',
        date_of_birth: null,
        gender: '',
        position: '',
        employment_status: 'active',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',
        bank_name: '',
        bank_account_number: '',
        tax_id: '',
        notes: ''
    };
    editMode.value = false;
    dialogVisible.value = true;
};

const openView = (item) => {
    viewingEmployee.value = item;
    viewDialogVisible.value = true;
};

const onRowContextMenu = (event) => {
    contextMenuEmployee.value = event.data;
    contextMenu.value?.show(event.originalEvent);
};

const openEdit = (item) => {
    isAdmin.value = item.role === 'admin';
    // Parse hire_date if it exists (could be from employment object or direct field)
    let hireDate = null;
    if (item.employment?.start_date) {
        hireDate = new Date(item.employment.start_date);
    } else if (item.employment?.hire_date) {
        hireDate = new Date(item.employment.hire_date);
    } else if (item.hire_date) {
        hireDate = new Date(item.hire_date);
    }
    
    form.value = { 
        ...item, 
        hire_date: hireDate,
        // Ensure all fields are present, use empty string if not provided
        phone: item.phone || '',
        mobile: item.mobile || '',
        address: item.address || '',
        city: item.city || '',
        postal_code: item.postal_code || '',
        date_of_birth: item.date_of_birth ? new Date(item.date_of_birth) : null,
        gender: item.gender || '',
        position: item.position || '',
        employment_status: item.employment_status || 'active',
        emergency_contact_name: item.emergency_contact_name || '',
        emergency_contact_phone: item.emergency_contact_phone || '',
        emergency_contact_relationship: item.emergency_contact_relationship || '',
        bank_name: item.bank_name || '',
        bank_account_number: item.bank_account_number || '',
        tax_id: item.tax_id || '',
        notes: item.notes || ''
    };
    editMode.value = true;
    dialogVisible.value = true;
};

const saveEmployee = async () => {
    if (!form.value.firstname || !form.value.lastname) {
        toast.add({ severity: 'error', summary: 'Validation Error', detail: 'Please fill required fields', life: 3000 });
        return;
    }

    submitting.value = true;
    try {
        if (editMode.value) {
            const updateData = {
                firstname: form.value.firstname,
                lastname: form.value.lastname,
                department: form.value.department
            };
            // Add optional fields if provided
            if (form.value.email) updateData.email = form.value.email;
            if (form.value.nrc) updateData.nrc = form.value.nrc;
            if (form.value.phone) updateData.phone = form.value.phone;
            if (form.value.mobile) updateData.mobile = form.value.mobile;
            if (form.value.address) updateData.address = form.value.address;
            if (form.value.city) updateData.city = form.value.city;
            if (form.value.postal_code) updateData.postal_code = form.value.postal_code;
            if (form.value.date_of_birth) {
                const date = new Date(form.value.date_of_birth);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                updateData.date_of_birth = `${year}-${month}-${day}`;
            }
            if (form.value.gender) updateData.gender = form.value.gender;
            if (form.value.position) {
                updateData.job_title = form.value.position;
                // Also send as position for backward compatibility
                updateData.position = form.value.position;
            }
            if (form.value.employment_status) updateData.employment_status = form.value.employment_status;
            if (form.value.emergency_contact_name) updateData.emergency_contact_name = form.value.emergency_contact_name;
            if (form.value.emergency_contact_phone) updateData.emergency_contact_phone = form.value.emergency_contact_phone;
            if (form.value.emergency_contact_relationship) updateData.emergency_contact_relationship = form.value.emergency_contact_relationship;
            if (form.value.bank_name) updateData.bank_name = form.value.bank_name;
            if (form.value.bank_account_number) updateData.bank_account_number = form.value.bank_account_number;
            if (form.value.tax_id) updateData.tax_id = form.value.tax_id;
            if (form.value.notes) updateData.notes = form.value.notes;
            if (form.value.hire_date) {
                const date = new Date(form.value.hire_date);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                updateData.hire_date = `${year}-${month}-${day}`;
            }
            if (!isAdmin.value) updateData.role = form.value.role;
            await employeeService.update(form.value.id, updateData);
            toast.add({ severity: 'success', summary: 'Success', detail: 'Employee updated', life: 3000 });
        } else {
            if (isAdmin.value) {
                if (!form.value.username?.trim()) {
                    toast.add({ severity: 'error', summary: 'Validation Error', detail: 'Username is required', life: 3000 });
                    submitting.value = false;
                    return;
                }
                const adminData = {
                    username: form.value.username.trim(),
                    firstname: form.value.firstname,
                    lastname: form.value.lastname,
                    password: defaultNewEmployeePassword,
                    department: form.value.department
                };
                // Add email only if provided
                if (form.value.email) {
                    adminData.email = form.value.email;
                }
                await employeeService.createAdmin(adminData);
            } else {
                if (!form.value.nrc?.trim()) {
                    toast.add({ severity: 'error', summary: 'Validation Error', detail: 'NRC is required', life: 3000 });
                    submitting.value = false;
                    return;
                }
                const createData = {
                    nrc: form.value.nrc.trim(),
                    firstname: form.value.firstname,
                    lastname: form.value.lastname,
                    password: defaultNewEmployeePassword,
                    department: form.value.department,
                    role: form.value.role
                };
                // Add email only if provided
                if (form.value.email) {
                    createData.email = form.value.email;
                }
                // Add hire_date if provided
                if (form.value.hire_date) {
                    // Format date as YYYY-MM-DD
                    const date = new Date(form.value.hire_date);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    createData.hire_date = `${year}-${month}-${day}`;
                }
                await employeeService.create(createData);
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

const getYearsServed = (employee) => {
    const startDate = employee.employment?.start_date || employee.employment?.hire_date;
    if (!startDate) return '-';
    
    const start = new Date(startDate);
    const today = new Date();
    
    if (isNaN(start.getTime())) return '-';
    
    // Calculate difference in months
    const yearsDiff = today.getFullYear() - start.getFullYear();
    const monthsDiff = today.getMonth() - start.getMonth();
    const daysDiff = today.getDate() - start.getDate();
    
    // Calculate total months
    let totalMonths = yearsDiff * 12 + monthsDiff;
    if (daysDiff < 0) {
        totalMonths -= 1;
    }
    
    // If less than 12 months, show months
    if (totalMonths < 12) {
        return totalMonths === 0 ? '< 1 month' : `${totalMonths} ${totalMonths === 1 ? 'month' : 'months'}`;
    }
    
    // Calculate years and remaining months
    const years = Math.floor(totalMonths / 12);
    const remainingMonths = totalMonths % 12;
    
    if (remainingMonths === 0) {
        return `${years} ${years === 1 ? 'year' : 'years'}`;
    } else {
        return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
    }
};

const downloadTemplate = async () => {
    try {
        await employeeService.downloadTemplate();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to download template', life: 3000 });
    }
};

const exportAllEmployees = async () => {
    try {
        await employeeService.exportAll();
        toast.add({ severity: 'success', summary: 'Success', detail: 'Employees exported successfully', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.userMessage || 'Failed to export employees', life: 3000 });
    }
};

const exportEmployee = async (id) => {
    try {
        await employeeService.exportEmployee(id);
        toast.add({ severity: 'success', summary: 'Success', detail: 'Employee exported successfully', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.userMessage || 'Failed to export employee', life: 3000 });
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

<style scoped>
:deep(.p-datatable-tbody > tr) {
    transition: background-color 0.2s ease;
}

:deep(.p-datatable-tbody > tr:hover) {
    background-color: var(--surface-100) !important;
    cursor: pointer;
}
</style>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-semibold m-0">Employees</h2>
            <div class="flex items-center justify-end gap-2 flex-wrap">
                <span class="p-input-icon-left">
                    <!-- <i class="pi pi-search" /> -->
                    <InputText 
                        v-model="searchTerm" 
                        placeholder="Search employees..." 
                        class="w-64"
                        @input="filterEmployees"
                    />
                </span>
                <Button
                    icon="pi pi-file-pdf"
                    severity="danger"
                    outlined
                    rounded
                    aria-label="Export all employees"
                    v-tooltip.top="'Export all employees (PDF)'"
                    @click="exportAllEmployees"
                />
                <Button
                    icon="pi pi-download"
                    severity="secondary"
                    outlined
                    rounded
                    aria-label="Download template"
                    v-tooltip.top="'Download template'"
                    @click="downloadTemplate"
                />
                <Button
                    icon="pi pi-upload"
                    severity="secondary"
                    rounded
                    aria-label="Bulk upload employees"
                    v-tooltip.top="'Bulk upload employees'"
                    @click="openUploadDialog"
                />
                <Button
                    icon="pi pi-plus"
                    rounded
                    aria-label="Add employee"
                    v-tooltip.top="'Add employee'"
                    @click="openNew(false)"
                />
                <Button
                    icon="pi pi-user-plus"
                    severity="secondary"
                    rounded
                    aria-label="Add admin"
                    v-tooltip.top="'Add admin'"
                    @click="openNew(true)"
                />
            </div>
        </div>
        
        <ContextMenu ref="contextMenu" :model="contextMenuItems" />

        <DataTable
            :value="filteredEmployees"
            :loading="loading"
            stripedRows
            paginator
            :rows="10"
            @row-click="(e) => { if (!e.originalEvent.target.closest('button')) openView(e.data); }"
            @row-contextmenu="onRowContextMenu"
            class="cursor-pointer"
        >
            <Column header="Name">
                <template #body="{ data }">
                    {{ data.firstname }} {{ data.lastname }}
                </template>
            </Column>
            <Column header="NRC">
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
            <Column header="Start Date">
                <template #body="{ data }">
                    {{ data.employment?.start_date ? formatDate(data.employment.start_date) : (data.employment?.hire_date ? formatDate(data.employment.hire_date) : '-') }}
                </template>
            </Column>
            <Column header="Tenure">
                <template #body="{ data }">
                    {{ getYearsServed(data) }}
                </template>
            </Column>
        </DataTable>
        
        <Dialog v-model:visible="dialogVisible" :header="editMode ? 'Edit Employee' : (isAdmin ? 'New Admin' : 'New Employee')" modal :style="{ width: editMode ? '800px' : '500px' }">
            <div class="grid grid-cols-2 gap-4">
                <!-- Basic Information -->
                <div v-if="!editMode && isAdmin">
                    <label class="block font-medium mb-2">Username *</label>
                    <InputText v-model="form.username" class="w-full" />
                </div>
                <div>
                    <label class="block font-medium mb-2">First Name *</label>
                    <InputText v-model="form.firstname" class="w-full" />
                </div>
                <div>
                    <label class="block font-medium mb-2">Last Name *</label>
                    <InputText v-model="form.lastname" class="w-full" />
                </div>
                <div v-if="!isAdmin">
                    <label class="block font-medium mb-2">NRC</label>
                    <InputText v-model="form.nrc" class="w-full" placeholder="123456/78/9" />
                </div>
                <div v-if="!isAdmin">
                    <label class="block font-medium mb-2">Start Date / Hire Date</label>
                    <Calendar v-model="form.hire_date" dateFormat="yy-mm-dd" showIcon class="w-full" placeholder="Select start date" />
                </div>
                <div v-if="!editMode && !isAdmin">
                    <label class="block font-medium mb-2">Email</label>
                    <InputText v-model="form.email" type="email" class="w-full" />
                </div>
                <div v-if="editMode || isAdmin" class="col-span-2">
                    <label class="block font-medium mb-2">Email</label>
                    <InputText v-model="form.email" type="email" class="w-full" />
                </div>
                <div>
                    <label class="block font-medium mb-2">Department</label>
                    <Select v-model="form.department" :options="departments" placeholder="Select Department" class="w-full" />
                </div>
                <div v-if="!isAdmin">
                    <label class="block font-medium mb-2">Role</label>
                    <Select v-model="form.role" :options="roles" optionLabel="label" optionValue="value" class="w-full" />
                </div>
                <div v-if="editMode">
                    <label class="block font-medium mb-2">Position</label>
                    <InputText v-model="form.position" class="w-full" placeholder="e.g., Senior Lecturer, IT Support" />
                </div>
                <div v-if="editMode">
                    <label class="block font-medium mb-2">Employment Status</label>
                    <Select v-model="form.employment_status" :options="employmentStatuses" optionLabel="label" optionValue="value" class="w-full" />
                </div>
                
                <!-- Additional fields for edit mode -->
                <template v-if="editMode">
                    <div class="col-span-2">
                        <h3 class="text-lg font-semibold mt-4 mb-2">Personal Information</h3>
                    </div>
                    <div>
                        <label class="block font-medium mb-2">Date of Birth</label>
                        <Calendar v-model="form.date_of_birth" dateFormat="yy-mm-dd" showIcon class="w-full" placeholder="Select date of birth" />
                    </div>
                    <div>
                        <label class="block font-medium mb-2">Gender</label>
                        <Select v-model="form.gender" :options="genders" placeholder="Select Gender" class="w-full" />
                    </div>
                    <div class="col-span-2">
                        <label class="block font-medium mb-2">Address</label>
                        <InputText v-model="form.address" class="w-full" placeholder="Street address" />
                    </div>
                    <div>
                        <label class="block font-medium mb-2">City</label>
                        <InputText v-model="form.city" class="w-full" />
                    </div>
                    <div>
                        <label class="block font-medium mb-2">Postal Code</label>
                        <InputText v-model="form.postal_code" class="w-full" />
                    </div>
                    <div>
                        <label class="block font-medium mb-2">Phone</label>
                        <InputText v-model="form.phone" class="w-full" placeholder="Landline" />
                    </div>
                    <div>
                        <label class="block font-medium mb-2">Mobile</label>
                        <InputText v-model="form.mobile" class="w-full" placeholder="Mobile number" />
                    </div>
                    
                    <div class="col-span-2">
                        <h3 class="text-lg font-semibold mt-4 mb-2">Emergency Contact</h3>
                    </div>
                    <div>
                        <label class="block font-medium mb-2">Contact Name</label>
                        <InputText v-model="form.emergency_contact_name" class="w-full" />
                    </div>
                    <div>
                        <label class="block font-medium mb-2">Contact Phone</label>
                        <InputText v-model="form.emergency_contact_phone" class="w-full" />
                    </div>
                    <div class="col-span-2">
                        <label class="block font-medium mb-2">Relationship</label>
                        <Select v-model="form.emergency_contact_relationship" :options="emergencyContactRelationships" placeholder="Select Relationship" class="w-full" />
                    </div>
                    
                    <div class="col-span-2">
                        <h3 class="text-lg font-semibold mt-4 mb-2">Financial Information</h3>
                    </div>
                    <div>
                        <label class="block font-medium mb-2">Bank Name</label>
                        <InputText v-model="form.bank_name" class="w-full" />
                    </div>
                    <div>
                        <label class="block font-medium mb-2">Bank Account Number</label>
                        <InputText v-model="form.bank_account_number" class="w-full" />
                    </div>
                    <div>
                        <label class="block font-medium mb-2">Tax ID</label>
                        <InputText v-model="form.tax_id" class="w-full" />
                    </div>
                    
                    <div class="col-span-2">
                        <h3 class="text-lg font-semibold mt-4 mb-2">Additional Notes</h3>
                    </div>
                    <div class="col-span-2">
                        <label class="block font-medium mb-2">Notes</label>
                        <Textarea v-model="form.notes" class="w-full" rows="4" placeholder="Additional notes or comments" />
                    </div>
                </template>
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

        <!-- View Employee Dialog -->
        <Dialog v-model:visible="viewDialogVisible" header="Employee Details" modal :style="{ width: '800px' }">
            <div v-if="viewingEmployee" class="grid grid-cols-2 gap-4">
                <!-- Basic Information -->
                <div class="col-span-2">
                    <h3 class="text-lg font-semibold mb-3 pb-2 border-b">Basic Information</h3>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">First Name</label>
                    <p class="text-900">{{ viewingEmployee.firstname || '-' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Last Name</label>
                    <p class="text-900">{{ viewingEmployee.lastname || '-' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">NRC / Username</label>
                    <p class="text-900">{{ viewingEmployee.nrc || viewingEmployee.username || '-' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Email</label>
                    <p class="text-900">{{ viewingEmployee.email || '-' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Department</label>
                    <p class="text-900">{{ viewingEmployee.department || '-' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Role</label>
                    <p class="text-900">{{ viewingEmployee.role || '-' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Position</label>
                    <p class="text-900">{{ viewingEmployee.job_title || viewingEmployee.position || '-' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Employment Status</label>
                    <p class="text-900">{{ viewingEmployee.employment_status || 'active' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Start Date / Hire Date</label>
                    <p class="text-900">{{ viewingEmployee.employment?.start_date ? formatDate(viewingEmployee.employment.start_date) : (viewingEmployee.employment?.hire_date ? formatDate(viewingEmployee.employment.hire_date) : (viewingEmployee.hire_date ? formatDate(viewingEmployee.hire_date) : '-')) }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Tenure</label>
                    <p class="text-900">{{ getYearsServed(viewingEmployee) }}</p>
                </div>

                <!-- Personal Information -->
                <div class="col-span-2 mt-4">
                    <h3 class="text-lg font-semibold mb-3 pb-2 border-b">Personal Information</h3>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Date of Birth</label>
                    <p class="text-900">{{ viewingEmployee.date_of_birth ? formatDate(viewingEmployee.date_of_birth) : '-' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Gender</label>
                    <p class="text-900">{{ viewingEmployee.gender || '-' }}</p>
                </div>
                <div class="col-span-2">
                    <label class="block font-medium mb-1 text-600">Address</label>
                    <p class="text-900">{{ viewingEmployee.address || '-' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">City</label>
                    <p class="text-900">{{ viewingEmployee.city || '-' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Postal Code</label>
                    <p class="text-900">{{ viewingEmployee.postal_code || '-' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Phone</label>
                    <p class="text-900">{{ viewingEmployee.phone || '-' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Mobile</label>
                    <p class="text-900">{{ viewingEmployee.mobile || '-' }}</p>
                </div>

                <!-- Emergency Contact -->
                <div class="col-span-2 mt-4">
                    <h3 class="text-lg font-semibold mb-3 pb-2 border-b">Emergency Contact</h3>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Contact Name</label>
                    <p class="text-900">{{ viewingEmployee.emergency_contact_name || '-' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Contact Phone</label>
                    <p class="text-900">{{ viewingEmployee.emergency_contact_phone || '-' }}</p>
                </div>
                <div class="col-span-2">
                    <label class="block font-medium mb-1 text-600">Relationship</label>
                    <p class="text-900">{{ viewingEmployee.emergency_contact_relationship || '-' }}</p>
                </div>

                <!-- Financial Information -->
                <div class="col-span-2 mt-4">
                    <h3 class="text-lg font-semibold mb-3 pb-2 border-b">Financial Information</h3>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Bank Name</label>
                    <p class="text-900">{{ viewingEmployee.bank_name || '-' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Bank Account Number</label>
                    <p class="text-900">{{ viewingEmployee.bank_account_number || '-' }}</p>
                </div>
                <div>
                    <label class="block font-medium mb-1 text-600">Tax ID</label>
                    <p class="text-900">{{ viewingEmployee.tax_id || '-' }}</p>
                </div>

                <!-- Additional Notes -->
                <div class="col-span-2 mt-4">
                    <h3 class="text-lg font-semibold mb-3 pb-2 border-b">Additional Notes</h3>
                </div>
                <div class="col-span-2">
                    <label class="block font-medium mb-1 text-600">Notes</label>
                    <p class="text-900 whitespace-pre-wrap">{{ viewingEmployee.notes || '-' }}</p>
                </div>
            </div>
            <template #footer>
                <Button label="Edit" icon="pi pi-pencil" @click="viewDialogVisible = false; openEdit(viewingEmployee)" />
                <Button label="Close" severity="secondary" @click="viewDialogVisible = false" />
            </template>
        </Dialog>
    </div>
</template>

