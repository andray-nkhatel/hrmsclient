<script setup>
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';

const store = useStore();
const router = useRouter();
const toast = useToast();

const username = ref('');
const password = ref('');
const loading = ref(false);

const login = async () => {
    if (!username.value || !password.value) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Please enter username and password',
            closable: true,
            sticky: false
        });
        return;
    }

    loading.value = true;

    try {
        // Trim whitespace from inputs
        const trimmedUsername = username.value?.trim() || '';
        const trimmedPassword = password.value?.trim() || '';
        
        const credentials = { username: trimmedUsername, password: trimmedPassword };
        
        if (import.meta.env.DEV) {
            console.log('🔐 Attempting login:', { credentials: { ...credentials, password: '***' } });
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
            const errorMessage = error.response?.data?.error || 'Invalid credentials. Please check your username and password.';
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

<style scoped>
.login-container {
    min-height: 100vh;
    width: 100vw;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
    overflow: hidden;
}

.login-wrapper {
    display: grid;
    grid-template-columns: 1fr 1fr;
    max-width: 1200px;
    width: 100%;
    background: white;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    min-height: 600px;
}

/* Left Side - Branding */
.login-branding {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 4rem 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
}

.login-branding::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    animation: pulse 15s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.1); opacity: 0.8; }
}

.branding-content {
    position: relative;
    z-index: 1;
    text-align: center;
}

.brand-icon {
    margin-bottom: 2rem;
    opacity: 0.95;
}

.brand-title {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 1.5rem;
    letter-spacing: -0.5px;
}

.brand-subtitle {
    font-size: 1.1rem;
    opacity: 0.9;
    margin-bottom: 3rem;
    line-height: 1.6;
}

.brand-features {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    text-align: left;
}

.feature-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1rem;
}

.feature-item i {
    font-size: 1.25rem;
    color: #a8e6cf;
}

/* Right Side - Login Form */
.login-form-section {
    padding: 4rem 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8f9fa;
}

.login-card {
    width: 100%;
    max-width: 420px;
}

.login-header {
    text-align: center;
    margin-bottom: 2.5rem;
}

.login-title {
    font-size: 2rem;
    font-weight: 700;
    color: #2d3748;
    margin-bottom: 0.5rem;
}

.login-subtitle {
    color: #718096;
    font-size: 0.95rem;
}

.login-form {
    width: 100%;
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
}

.form-icon {
    color: #667eea;
    font-size: 1rem;
}

.form-input {
    width: 100%;
}

.form-input :deep(.p-inputtext),
.form-input :deep(.p-password) {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.3s ease;
}

.form-input :deep(.p-inputtext:focus),
.form-input :deep(.p-password input:focus) {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    outline: none;
}

.form-input :deep(.p-password) {
    width: 100%;
}

.form-input :deep(.p-password-input) {
    width: 100%;
}

.login-button {
    width: 100%;
    padding: 0.875rem;
    font-size: 1rem;
    font-weight: 600;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 8px;
    margin-top: 1rem;
    transition: all 0.3s ease;
}

.login-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.login-button:active:not(:disabled) {
    transform: translateY(0);
}

.login-footer {
    margin-top: 2rem;
    text-align: center;
}

.footer-text {
    color: #a0aec0;
    font-size: 0.85rem;
}

/* Dark Mode Support */
:deep(.dark) .login-wrapper {
    background: #1a202c;
}

:deep(.dark) .login-form-section {
    background: #2d3748;
}

:deep(.dark) .login-title {
    color: #f7fafc;
}

:deep(.dark) .login-subtitle {
    color: #cbd5e0;
}

:deep(.dark) .form-label {
    color: #e2e8f0;
}

:deep(.dark) .form-input :deep(.p-inputtext),
:deep(.dark) .form-input :deep(.p-password input) {
    background: #4a5568;
    border-color: #4a5568;
    color: #f7fafc;
}

:deep(.dark) .form-input :deep(.p-inputtext:focus),
:deep(.dark) .form-input :deep(.p-password input:focus) {
    border-color: #667eea;
    background: #4a5568;
}

/* Responsive Design */
@media (max-width: 968px) {
    .login-wrapper {
        grid-template-columns: 1fr;
        min-height: auto;
    }

    .login-branding {
        padding: 3rem 2rem;
        min-height: 300px;
    }

    .brand-title {
        font-size: 2rem;
    }

    .login-form-section {
        padding: 3rem 2rem;
    }
}

@media (max-width: 640px) {
    .login-container {
        padding: 0;
    }

    .login-wrapper {
        border-radius: 0;
        min-height: 100vh;
    }

    .login-branding {
        padding: 2rem 1.5rem;
    }

    .brand-title {
        font-size: 1.75rem;
    }

    .login-form-section {
        padding: 2rem 1.5rem;
    }
}
</style>

<template>
    <Toast position="top-center" />
    <FloatingConfigurator />
    <div class="login-container">
        <div class="login-wrapper">
            <!-- Left Side - Branding Section -->
            <div class="login-branding">
                <div class="branding-content">
                    <div class="brand-icon">
                        <i class="pi pi-users text-6xl"></i>
                    </div>
                    <h1 class="brand-title">Human Resources<br/>Management System</h1>
                    <p class="brand-subtitle">Streamline your workforce management with our comprehensive HRMS platform</p>
                    <div class="brand-features">
                        <div class="feature-item">
                            <i class="pi pi-check-circle"></i>
                            <span>Leave Management</span>
                        </div>
                        <div class="feature-item">
                            <i class="pi pi-check-circle"></i>
                            <span>Employee Records</span>
                        </div>
                        <div class="feature-item">
                            <i class="pi pi-check-circle"></i>
                            <span>Real-time Analytics</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Side - Login Form -->
            <div class="login-form-section">
                <div class="login-card">
                    <div class="login-header">
                        <h2 class="login-title">Welcome Back</h2>
                        <p class="login-subtitle">Please sign in to access your account</p>
                    </div>

                    <form @submit.prevent="login" class="login-form">
                        <div class="form-group">
                            <label for="username" class="form-label">
                                <i class="pi pi-user form-icon"></i>
                                Username
                            </label>
                            <InputText 
                                id="username" 
                                type="text" 
                                placeholder="Enter your username" 
                                class="form-input" 
                                v-model="username"
                                :class="{ 'p-invalid': !username && loading }"
                            />
                        </div>

                        <div class="form-group">
                            <label for="password" class="form-label">
                                <i class="pi pi-lock form-icon"></i>
                                Password
                            </label>
                            <Password 
                                id="password" 
                                v-model="password" 
                                placeholder="Enter your password" 
                                class="form-input"
                                :toggleMask="true" 
                                :feedback="false" 
                                @keyup.enter="login"
                                :class="{ 'p-invalid': !password && loading }"
                            />
                        </div>

                        <Button 
                            type="submit" 
                            label="Sign In" 
                            class="login-button" 
                            :loading="loading"
                            icon="pi pi-sign-in"
                            iconPos="right"
                        />

                        <div class="login-footer">
                            <p class="footer-text">Secure access to your HRMS dashboard</p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>
