<template>
  <Dialog 
    v-model:visible="visible" 
    header="Quick Annual Leave Entry" 
    modal 
    :style="{ width: '600px' }"
    @hide="resetForm"
  >
    <div class="grid gap-4 mt-3">
      <div class="col-12">
        <div class="p-3 bg-blue-50 border-round mb-3">
          <div class="text-sm">
            <strong>Annual Leave Entry:</strong> Create annual leave records for employees. Balance is automatically checked and updated.
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="flex gap-4">
          <div class="flex-1">
            <label class="block font-medium mb-2">Employee *</label>
            <AutoComplete
              v-model="selectedEmployee"
              :suggestions="employeeSuggestions"
              @complete="searchEmployees"
              optionLabel="name"
              placeholder="Search employee by name..."
              class="w-full"
              :loading="searchingEmployees"
              :minLength="1"
              :completeOnFocus="false"
              :dropdown="false"
            >
            <template #option="slotProps">
              <div class="flex align-items-center justify-content-between w-full">
                <div class="flex-1">
                  <div class="font-medium">{{ slotProps.option.name }}</div>
                  <small class="text-surface-500">{{ slotProps.option.department || 'No department' }}</small>
                </div>
              </div>
            </template>
            </AutoComplete>
          </div>

          <div class="flex-1">
            <label class="block font-medium mb-2">Start Date *</label>
            <DatePicker
              v-model="form.startDate"
              dateFormat="yy-mm-dd"
              placeholder="Start date"
              class="w-full"
              showIcon
              :minDate="new Date()"
            />
          </div>

          <div class="flex-1">
            <label class="block font-medium mb-2">End Date *</label>
            <DatePicker
              v-model="form.endDate"
              dateFormat="yy-mm-dd"
              placeholder="End date"
              class="w-full"
              showIcon
              :minDate="form.startDate || new Date()"
            />
          </div>
        </div>
      </div>

      <div class="col-12" v-if="calculatedDuration > 0">
        <div class="p-3 bg-blue-50 border-round">
          <div class="flex justify-content-between align-items-center">
            <span class="font-medium">Duration:</span>
            <span class="text-lg font-bold">{{ calculatedDuration }} day{{ calculatedDuration !== 1 ? 's' : '' }}</span>
          </div>
          <div v-if="balanceInfo" class="mt-2">
            <div class="flex justify-content-between align-items-center mb-1">
              <span>Available Balance:</span>
              <span :class="balanceInfo.available >= calculatedDuration ? 'text-green-600 font-bold' : 'text-red-600 font-bold'">
                {{ balanceInfo.available.toFixed(1) }} days
              </span>
            </div>
            <div class="flex justify-content-between align-items-center text-sm text-surface-500 mb-1">
              <span>Total Accrued:</span>
              <span>{{ balanceInfo.total.toFixed(1) }} days</span>
            </div>
            <div class="flex justify-content-between align-items-center text-sm text-surface-500 mb-1">
              <span>Total Used:</span>
              <span>{{ balanceInfo.used.toFixed(1) }} days</span>
            </div>
            <div v-if="balanceInfo.carryOver > 0" class="flex justify-content-between align-items-center text-sm text-purple-500 mb-1">
              <span>Carry-Over:</span>
              <span>{{ balanceInfo.carryOver.toFixed(1) }} days</span>
            </div>
            <div v-if="balanceInfo.available < calculatedDuration" class="mt-2 p-2 bg-red-50 border-round text-red-600 text-sm">
              ⚠️ Insufficient annual leave balance. Available: {{ balanceInfo.available.toFixed(1) }} days, Required: {{ calculatedDuration }} days
            </div>
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
        <label class="block font-medium mb-2">
          Leave Form Attachment *
          <span class="text-sm text-surface-500 font-normal ml-2">PNG or PDF only</span>
        </label>
        <FileUpload
          mode="basic"
          :auto="true"
          :maxFileSize="5242880"
          accept=".png,.pdf"
          chooseLabel="Choose Leave Form"
          @select="onFileSelect"
          @remove="onFileRemove"
          :showUploadButton="false"
          :showCancelButton="false"
          class="w-full"
          :class="{ 'p-invalid': !selectedFile && formSubmitted }"
        />
        <small v-if="selectedFile" class="text-surface-500 mt-1 block">
          Selected: {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
        </small>
        <small v-if="!selectedFile && formSubmitted" class="text-red-500 mt-1 block">
          Leave form attachment is required
        </small>
        <small v-if="!selectedFile && !formSubmitted" class="text-surface-500 mt-1 block">
          Upload a scanned or digital copy of the approved leave form (PNG or PDF) - Required
        </small>
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" @click="close" :disabled="submitting" />
      <Button 
        label="Create Leave" 
        @click="createLeave" 
        :loading="submitting"
        :disabled="!isFormValid || submitting"
        icon="pi pi-check"
        severity="success"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { employeeService, hrLeaveService, leaveService } from '@/service/api.service';
import { formatDateForAPI } from '@/service/dateUtils';
import AutoComplete from 'primevue/autocomplete';
import DatePicker from 'primevue/datepicker';
import FileUpload from 'primevue/fileupload';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { computed, ref, watch } from 'vue';

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
  employeeId: null,
  leaveTypeId: null,
  startDate: null,
  endDate: null,
  reason: ''
});

const selectedEmployee = ref(null);
const employeeSuggestions = ref([]);
const searchingEmployees = ref(false);
const leaveTypes = ref([]);
const annualLeaveType = ref(null);
const submitting = ref(false);
const balanceInfo = ref(null);
const selectedFile = ref(null);
const formSubmitted = ref(false);

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
  return form.value.employeeId && 
         form.value.leaveTypeId && 
         form.value.startDate && 
         form.value.endDate &&
         balanceInfo.value &&
         balanceInfo.value.available >= calculatedDuration.value;
});

// Watch for employee and date changes to check balance
watch([() => form.value.employeeId, () => form.value.leaveTypeId, () => form.value.startDate, () => form.value.endDate], 
  async ([employeeId, leaveTypeId]) => {
    if (employeeId && leaveTypeId) {
      await checkBalance();
    } else {
      balanceInfo.value = null;
    }
  }
);

// Debounce search to avoid too many API calls
let searchTimeout = null;

const searchEmployees = async (event) => {
  const query = event.query || '';
  const trimmedQuery = query.trim();
  
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }
  
  // If query is empty or too short, clear suggestions and return immediately
  if (!trimmedQuery || trimmedQuery.length < 1) {
    employeeSuggestions.value = [];
    searchingEmployees.value = false;
    return;
  }
  
  // Debounce the search - wait 300ms after user stops typing
  // This prevents API calls on every keystroke
  searchTimeout = setTimeout(async () => {
    // Double-check query is still valid (user might have cleared it during timeout)
    const currentQuery = (event.query || '').trim();
    if (!currentQuery || currentQuery.length < 1) {
      employeeSuggestions.value = [];
      searchingEmployees.value = false;
      return;
    }
    
    searchingEmployees.value = true;
    try {
      // Make API call with search parameter
      const employees = await employeeService.getAll({ search: currentQuery });
      
      // Map employees to suggestion format
      employeeSuggestions.value = employees.map(emp => ({
        name: `${emp.firstname} ${emp.lastname}`,
        id: emp.id,
        department: emp.department || 'No department'
      }));
    } catch (error) {
      console.error('Error searching employees:', error);
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to search employees',
        life: 3000
      });
      employeeSuggestions.value = [];
    } finally {
      searchingEmployees.value = false;
    }
  }, 300);
};

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

const checkBalance = async () => {
  if (!form.value.employeeId || !form.value.leaveTypeId) return;
  
  try {
    // Always use annual leave balance endpoint
    const balance = await hrLeaveService.getEmployeeBalance(form.value.employeeId);
    balanceInfo.value = {
      available: balance.current_balance || 0,
      total: balance.total_accrued || 0,
      used: balance.total_used || 0,
      carryOver: balance.carry_over_balance || 0
    };
  } catch (error) {
    balanceInfo.value = null;
  }
};

const createLeave = async () => {
  formSubmitted.value = true;
  
  if (!isFormValid.value) {
    if (!selectedFile.value) {
      toast.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please upload a leave form attachment (PNG or PDF)',
        life: 3000
      });
    }
    return;
  }

  submitting.value = true;
  try {
    const startDateStr = formatDateForAPI(form.value.startDate);
    const endDateStr = formatDateForAPI(form.value.endDate);
    const duration = calculatedDuration.value;

    console.log('Creating leave:', {
      employeeId: form.value.employeeId,
      startDate: startDateStr,
      endDate: endDateStr,
      duration: duration
    });

    // Get balance BEFORE creating the leave so we know the starting point
    const balanceBefore = await hrLeaveService.getEmployeeBalance(form.value.employeeId);
    console.log('Balance before leave creation:', balanceBefore);
    const balanceBeforeValue = balanceBefore.current_balance || 0;

    const leaveResult = await hrLeaveService.createLeave({
      employee_id: form.value.employeeId,
      leave_type_id: form.value.leaveTypeId,
      start_date: startDateStr,
      end_date: endDateStr,
      reason: form.value.reason,
      status: 'Approved' // Default to approved for admin-created leaves
    }, selectedFile.value);

    console.log('Leave created, result:', leaveResult);

    // Wait for backend to process the leave
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update current_balance by subtracting the leave duration
    // The backend updates total_used but not current_balance, so we need to adjust it
    try {
      // Get the updated balance after leave creation
      const updatedBalance = await hrLeaveService.getEmployeeBalance(form.value.employeeId);
      console.log('Balance after leave creation:', updatedBalance);
      
      const totalAccrued = updatedBalance.total_accrued || 0;
      const carryOverBalance = updatedBalance.carry_over_balance || 0;
      const totalUsed = updatedBalance.total_used || 0;
      const actualCurrentBalance = updatedBalance.current_balance || 0;
      
      // Calculate expected balance: (total_accrued + carry_over_balance) - total_used
      let expectedCurrentBalance = (totalAccrued + carryOverBalance) - totalUsed;
      
      // If the formula gives an incorrect result (negative when it should be positive, or doesn't match),
      // and we had a positive balance before with no accruals/carry-over set,
      // it means carry_over wasn't set. In this case, subtract duration from previous balance.
      // This handles cases like: balance=2, use 2 days, should become 0
      const formulaResult = expectedCurrentBalance;
      const shouldBe = balanceBeforeValue - duration;
      
      if ((formulaResult < 0 || Math.abs(formulaResult - shouldBe) > 0.01) && 
          balanceBeforeValue > 0 && 
          totalAccrued === 0 && 
          carryOverBalance === 0) {
        expectedCurrentBalance = shouldBe;
        console.log('Using simplified calculation (carry_over not set):', {
          balance_before: balanceBeforeValue,
          leave_duration: duration,
          formula_result: formulaResult,
          calculated_expected: shouldBe,
          final_expected: expectedCurrentBalance
        });
      }
      
      const currentBalanceDiff = expectedCurrentBalance - actualCurrentBalance;
      
      console.log('Balance calculation:', {
        balance_before: balanceBeforeValue,
        total_accrued: totalAccrued,
        carry_over_balance: carryOverBalance,
        total_used: totalUsed,
        leave_duration: duration,
        calculation: `(${totalAccrued} + ${carryOverBalance}) - ${totalUsed} = ${expectedCurrentBalance}`,
        expected_current_balance: expectedCurrentBalance,
        actual_current_balance: actualCurrentBalance,
        difference: currentBalanceDiff
      });

      // Adjust balance if there's a difference
      if (Math.abs(currentBalanceDiff) > 0.01) {
        console.log('Adjusting balance:', {
          employeeId: form.value.employeeId,
          adjustment_days: currentBalanceDiff,
          from: actualCurrentBalance,
          to: expectedCurrentBalance
        });

        const adjustmentResult = await hrLeaveService.adjustBalance(form.value.employeeId, {
          days: currentBalanceDiff,
          reason: `Balance update after leave creation: ${duration.toFixed(1)} days used. New balance: ${expectedCurrentBalance.toFixed(1)}`
        });
        console.log('Balance adjustment result:', adjustmentResult);
        
        // Verify the balance was updated
        await new Promise(resolve => setTimeout(resolve, 200));
        const finalBalance = await hrLeaveService.getEmployeeBalance(form.value.employeeId);
        console.log('Final balance after adjustment:', {
          current_balance: finalBalance.current_balance,
          total_accrued: finalBalance.total_accrued,
          total_used: finalBalance.total_used,
          carry_over: finalBalance.carry_over_balance
        });
      } else {
        console.log('Current balance is already correct, no adjustment needed');
      }
    } catch (balanceError) {
      console.error('Failed to update current balance:', balanceError);
      console.error('Error details:', {
        message: balanceError.message,
        response: balanceError.response?.data,
        status: balanceError.response?.status
      });
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: `Leave created but balance update failed: ${balanceError.userMessage || balanceError.response?.data?.error || balanceError.message || 'Unknown error'}. Please manually adjust the balance.`,
        life: 5000
      });
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Leave created successfully',
      life: 3000
    });

    emit('created');
    close();
  } catch (error) {
    console.error('Error creating leave:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.userMessage || error.response?.data?.error || 'Failed to create leave',
      life: 3000
    });
  } finally {
    submitting.value = false;
  }
};


const onFileSelect = (event) => {
  const file = event.files[0];
  if (file) {
    // Validate file type
    const allowedTypes = ['image/png', 'application/pdf'];
    const allowedExtensions = ['.png', '.pdf'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast.add({
        severity: 'error',
        summary: 'Invalid File Type',
        detail: 'Only PNG and PDF files are allowed for leave forms',
        life: 3000
      });
      return;
    }
    
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.add({
        severity: 'error',
        summary: 'File Too Large',
        detail: 'File size must be less than 5MB',
        life: 3000
      });
      return;
    }
    
    selectedFile.value = file;
  }
};

const onFileRemove = () => {
  selectedFile.value = null;
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const resetForm = () => {
  form.value = {
    employeeId: null,
    leaveTypeId: annualLeaveType.value?.id || null,
    startDate: null,
    endDate: null,
    reason: ''
  };
  selectedEmployee.value = null;
  employeeSuggestions.value = [];
  balanceInfo.value = null;
  selectedFile.value = null;
  formSubmitted.value = false;
  
  // Clear any pending search timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }
  searchingEmployees.value = false;
};

const close = () => {
  visible.value = false;
  resetForm();
};

// Watch for employee selection
watch(selectedEmployee, (newVal) => {
  if (newVal) {
    form.value.employeeId = newVal.id;
  }
});

// Load leave types on mount
import { onMounted } from 'vue';
onMounted(() => {
  loadLeaveTypes();
});
</script>
