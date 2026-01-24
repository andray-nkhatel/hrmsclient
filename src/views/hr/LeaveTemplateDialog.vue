<template>
  <Dialog 
    v-model:visible="visible" 
    header="Create Annual Leave from Template" 
    modal 
    :style="{ width: '700px' }"
    @hide="resetForm"
  >
    <div class="grid gap-4 mt-3">
      <div class="col-12">
        <div class="p-3 bg-blue-50 border-round mb-3">
          <div class="font-bold mb-2">Template Usage:</div>
          <div class="text-sm">
            Create the same annual leave for multiple employees (e.g., public holidays, company events). All leaves will be Annual leave type.
          </div>
        </div>
      </div>

      <div class="col-12 md:col-6">
        <label class="block font-medium mb-2">Start Date *</label>
        <Calendar
          v-model="form.startDate"
          dateFormat="yy-mm-dd"
          placeholder="Start date"
          class="w-full"
          showIcon
        />
      </div>

      <div class="col-12 md:col-6">
        <label class="block font-medium mb-2">End Date *</label>
        <Calendar
          v-model="form.endDate"
          dateFormat="yy-mm-dd"
          placeholder="End date"
          class="w-full"
          showIcon
          :minDate="form.startDate || new Date()"
        />
      </div>

      <div class="col-12" v-if="calculatedDuration > 0">
        <div class="p-3 bg-blue-50 border-round">
          <div class="flex justify-content-between align-items-center">
            <span class="font-medium">Duration:</span>
            <span class="text-lg font-bold">{{ calculatedDuration }} day{{ calculatedDuration !== 1 ? 's' : '' }}</span>
          </div>
        </div>
      </div>

      <div class="col-12">
        <label class="block font-medium mb-2">Reason (Optional)</label>
        <Textarea
          v-model="form.reason"
          rows="3"
          placeholder="Enter reason for leave"
          class="w-full"
        />
      </div>

      <div class="col-12">
        <label class="block font-medium mb-2">Select Employees *</label>
        <MultiSelect
          v-model="form.employeeIds"
          :options="employees"
          optionLabel="name"
          optionValue="id"
          placeholder="Select employees"
          class="w-full"
          :filter="true"
          :loading="loadingEmployees"
        >
          <template #option="slotProps">
            <div class="flex align-items-center">
              <div>
                <div>{{ slotProps.option.name }}</div>
                <small class="text-surface-500">{{ slotProps.option.department || 'No department' }}</small>
              </div>
            </div>
          </template>
        </MultiSelect>
        <small class="text-surface-500">{{ form.employeeIds?.length || 0 }} employee(s) selected</small>
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" @click="close" :disabled="submitting" />
      <Button 
        label="Create Leaves" 
        @click="createFromTemplate" 
        :loading="submitting"
        :disabled="!isFormValid || submitting"
        icon="pi pi-check"
        severity="success"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import Calendar from 'primevue/calendar';
import Dropdown from 'primevue/dropdown';
import MultiSelect from 'primevue/multiselect';
import Textarea from 'primevue/textarea';
import { hrLeaveService, employeeService, leaveService } from '@/service/api.service';
import { formatDateForAPI } from '@/service/dateUtils';

const props = defineProps({
  modelValue: Boolean
});

const emit = defineEmits(['update:modelValue', 'created']);

const toast = useToast();
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const form = ref({
  leaveTypeId: null,
  startDate: null,
  endDate: null,
  reason: '',
  employeeIds: []
});

const leaveTypes = ref([]);
const annualLeaveType = ref(null);
const employees = ref([]);
const loadingEmployees = ref(false);
const submitting = ref(false);

const calculatedDuration = computed(() => {
  if (!form.value.startDate || !form.value.endDate) return 0;
  const start = new Date(form.value.startDate);
  const end = new Date(form.value.endDate);
  if (end < start) return 0;
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
});

const isFormValid = computed(() => {
  return form.value.leaveTypeId && 
         form.value.startDate && 
         form.value.endDate &&
         form.value.employeeIds &&
         form.value.employeeIds.length > 0;
});

const loadLeaveTypes = async () => {
  try {
    const types = await leaveService.getLeaveTypes();
    leaveTypes.value = types;
    // Find and set Annual leave type automatically
    annualLeaveType.value = types.find(lt => lt.name === 'Annual' || lt.max_days === 24);
    if (annualLeaveType.value) {
      form.value.leaveTypeId = annualLeaveType.value.id;
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load leave types',
      life: 3000
    });
  }
};

const loadEmployees = async () => {
  loadingEmployees.value = true;
  try {
    const emps = await employeeService.getAll();
    employees.value = emps.map(emp => ({
      id: emp.id,
      name: `${emp.firstname} ${emp.lastname}`,
      department: emp.department?.name || emp.department_name || 'No department'
    }));
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load employees',
      life: 3000
    });
  } finally {
    loadingEmployees.value = false;
  }
};

const createFromTemplate = async () => {
  if (!isFormValid.value) return;

  submitting.value = true;
  try {
    const startDateStr = formatDateForAPI(form.value.startDate);
    const endDateStr = formatDateForAPI(form.value.endDate);

    const result = await hrLeaveService.bulkCreateLeavesFromTemplate({
      employee_ids: form.value.employeeIds,
      leave_type_id: form.value.leaveTypeId,
      start_date: startDateStr,
      end_date: endDateStr,
      reason: form.value.reason
    });

    if (result.failed === 0) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: `Successfully created ${result.success} leave records`,
        life: 5000
      });
    } else if (result.success > 0) {
      toast.add({
        severity: 'warn',
        summary: 'Partial Success',
        detail: `Created ${result.success} of ${result.total} leaves. ${result.failed} failed.`,
        life: 7000
      });
    } else {
      toast.add({
        severity: 'error',
        summary: 'Failed',
        detail: `Failed to create all ${result.failed} leaves. See details in console.`,
        life: 7000
      });
    }

    emit('created');
    close();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || error.response?.data?.error || 'Failed to create leaves',
      life: 3000
    });
  } finally {
    submitting.value = false;
  }
};

const resetForm = () => {
  form.value = {
    leaveTypeId: annualLeaveType.value?.id || null,
    startDate: null,
    endDate: null,
    reason: '',
    employeeIds: []
  };
};

const close = () => {
  visible.value = false;
  resetForm();
};

onMounted(() => {
  loadLeaveTypes();
  loadEmployees();
});
</script>
