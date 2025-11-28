<script setup>
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';

const store = useStore();
const router = useRouter();
const toast = useToast();

const loginType = ref('employee'); // 'employee' or 'admin'
const nrc = ref('');
const username = ref('');
const password = ref('');
const loading = ref(false);

const login = async () => {
    const isAdmin = loginType.value === 'admin';
    const identifier = isAdmin ? username.value : nrc.value;
    
    if (!identifier || !password.value) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: isAdmin ? 'Please enter username and password' : 'Please enter NRC and password',
            closable: true,
            sticky: false
        });
        return;
    }

    loading.value = true;

    try {
        // Trim whitespace from inputs
        const trimmedUsername = username.value?.trim() || '';
        const trimmedNrc = nrc.value?.trim() || '';
        const trimmedPassword = password.value?.trim() || '';
        
        const credentials = isAdmin 
            ? { username: trimmedUsername, password: trimmedPassword }
            : { nrc: trimmedNrc, password: trimmedPassword };
        
        if (import.meta.env.DEV) {
            console.log('🔐 Attempting login:', { isAdmin, credentials: { ...credentials, password: '***' } });
        }
            
        await store.dispatch('auth/login', credentials);

        const queryRedirect = router.currentRoute.value.query.redirect;
        const redirectPath = queryRedirect || '/app/dashboard';

        toast.add({
            severity: 'success',
            summary: 'Login Successful',
            detail: 'You have been logged in successfully.',
            life: 1500,
            closable: true,
            sticky: false
        });

        router.push(redirectPath);
        password.value = '';
    } catch (error) {
        console.error('Login error:', error);

        if (error.isCorsError) {
            toast.add({
                severity: 'error',
                summary: 'Connection Error',
                detail: 'Cannot connect to the server. Please contact your administrator.',
                life: 5000,
                closable: true,
                sticky: true
            });
        } else if (error.response && error.response.status === 401) {
            // 401 on login means invalid credentials
            const errorMessage = error.response?.data?.error || 'Invalid credentials. Please check your username/NRC and password.';
            toast.add({
                severity: 'error',
                summary: 'Login Failed',
                detail: errorMessage,
                life: 3000,
                closable: true,
                sticky: false
            });
        } else {
            // Other errors
            let errorMessage = 'Invalid credentials';
            if (error.userMessage) {
                errorMessage = error.userMessage;
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            toast.add({
                severity: 'error',
                summary: 'Login Failed',
                detail: errorMessage,
                life: 3000,
                closable: true,
                sticky: false
            });
        }
        password.value = '';
    } finally {
        setTimeout(() => {
            loading.value = false;
        }, 300);
    }
};
</script>

<template>
    <Toast position="top-center" />
    <FloatingConfigurator />
    <div class="bg-surface-200 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
        <div class="flex flex-col items-center justify-center w-full">
            <div class="w-full max-w-lg py-20 px-4 sm:px-8" style="border-radius: 53px">
                <div class="text-center mb-8">
                    <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">HRMS Login</div>
                    <span class="text-muted-color font-medium">Sign in to continue</span>
                </div>
                
                <!-- Login Type Toggle -->
                <div class="flex justify-center mb-6">
                    <SelectButton v-model="loginType" :options="[
                        { label: 'Employee/Manager', value: 'employee' },
                        { label: 'Admin', value: 'admin' }
                    ]" optionLabel="label" optionValue="value" />
                </div>
                
                <form @submit.prevent="login">
                    <div>
                        <!-- NRC field for employees/managers -->
                        <template v-if="loginType === 'employee'">
                            <label for="nrc" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">NRC</label>
                            <InputText id="nrc" type="text" placeholder="e.g. 123456/78/9" class="w-full mb-6" v-model="nrc" />
                        </template>
                        
                        <!-- Username field for admins -->
                        <template v-else>
                            <label for="username" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Username</label>
                            <InputText id="username" type="text" placeholder="Username" class="w-full mb-6" v-model="username" />
                        </template>
                        
                        <label for="password" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Password</label>
                        <Password id="password" v-model="password" placeholder="Password" :toggleMask="true" class="w-full mb-8" fluid :feedback="false" @keyup.enter="login"></Password>
                        
                        <Button type="submit" label="Sign In" class="w-full" :loading="loading"></Button>
                        
                        <!-- Test credentials hint -->
                        <div class="mt-6 p-4 bg-surface-100 dark:bg-surface-800 rounded-lg text-sm">
                            <div class="font-semibold mb-2 text-surface-700 dark:text-surface-300">Test Credentials:</div>
                            <div class="text-surface-600 dark:text-surface-400">
                                <div><strong>Employee:</strong> NRC: 123456/78/9</div>
                                <div><strong>Manager:</strong> NRC: 987654/32/1</div>
                                <div><strong>Admin:</strong> Username: admin</div>
                                <div class="mt-1"><strong>Password:</strong> password123</div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>
