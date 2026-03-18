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
    background: #f3f4f6;
    padding: 2.5rem 1rem;
    overflow: hidden;
}

.login-wrapper {
    width: 100%;
    max-width: 420px;
    background: #ffffff;
    border-radius: 6px;
    border: 1px solid #d1d5db;
    box-shadow: none;
    overflow: hidden;
}

/* (Zabbix-like) Intentionally minimal: no branding panel */

/* Right Side - Login Form */
.login-form-section {
    padding: 1.25rem 1.25rem 1.5rem;
    display: block;
    background: transparent;
}

.login-card {
    width: 100%;
    max-width: 100%;
}

.login-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
}

.login-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
}

.login-subtitle {
    color: #6b7280;
    font-size: 0.9rem;
    margin: 0;
}

.login-form {
    width: 100%;
    padding: 1rem;
}

.form-group {
    margin-bottom: 0.9rem;
}

.form-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 0.35rem;
    font-size: 0.9rem;
}

.form-icon {
    color: #6b7280;
    font-size: 1rem;
}

.form-input {
    width: 100%;
}

.form-input :deep(.p-inputtext),
.form-input :deep(.p-password) {
    width: 100%;
    padding: 0.5rem 0.6rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 0.95rem;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    background: #ffffff;
}

.form-input :deep(.p-inputtext:focus),
.form-input :deep(.p-password input:focus) {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
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
    padding: 0.55rem 0.75rem;
    font-size: 0.95rem;
    font-weight: 600;
    background: #2563eb;
    border: 1px solid #1d4ed8;
    border-radius: 4px;
    margin-top: 0.75rem;
    transition: filter 0.15s ease;
}

.login-button:hover:not(:disabled) {
    filter: brightness(0.95);
}

.login-button:active:not(:disabled) {
    filter: brightness(0.9);
}

.login-footer {
    margin-top: 0.9rem;
    text-align: center;
}

.footer-text {
    color: #6b7280;
    font-size: 0.85rem;
}

/* Dark Mode Support */
:global(html.app-dark) .login-container {
    background: #0b1220;
}

:global(html.app-dark) .login-wrapper {
    background: #0b1220;
    border-color: rgba(255, 255, 255, 0.12);
}

:global(html.app-dark) .login-header {
    background: rgba(255, 255, 255, 0.03);
    border-bottom-color: rgba(255, 255, 255, 0.12);
}

:global(html.app-dark) .login-form-section {
    background: transparent;
}

:global(html.app-dark) .login-title {
    color: #f7fafc;
}

:global(html.app-dark) .login-subtitle {
    color: #cbd5e0;
}

:global(html.app-dark) .form-label {
    color: #e2e8f0;
}

:global(html.app-dark) .form-input :deep(.p-inputtext),
:global(html.app-dark) .form-input :deep(.p-password input),
:global(html.app-dark) .form-input :deep(.p-password-input) {
    background: #0f172a;
    border-color: rgba(255, 255, 255, 0.12);
    color: #f9fafb;
}

:global(html.app-dark) .form-input :deep(.p-inputtext:focus),
:global(html.app-dark) .form-input :deep(.p-password input:focus),
:global(html.app-dark) .form-input :deep(.p-password-input:focus) {
    border-color: #60a5fa;
    background: #0f172a;
}

:global(html.app-dark) .login-button {
    background: #2563eb;
    border-color: rgba(255, 255, 255, 0.12);
}

:global(html.app-dark) .footer-text {
    color: #9ca3af;
}

/* Responsive Design */
@media (max-width: 968px) {
    .login-form-section {
        padding: 1.25rem 1.25rem 1.5rem;
    }
}

@media (max-width: 640px) {
    .login-container {
        padding: 1.5rem 0.75rem;
    }

    .login-wrapper {
        border-radius: 6px;
    }
}
</style>

<template>
    <Toast position="top-center" />
    <FloatingConfigurator />
    <div class="login-container">
        <div class="login-wrapper">
            <div class="login-form-section">
                <div class="login-card">
                    <div class="login-header">
                        <h2 class="login-title">HRMS</h2>
                        <p class="login-subtitle">Sign in</p>
                    </div>

                    <form @submit.prevent="login" class="login-form">
                        <div class="form-group">
                            <label for="username" class="form-label">
                                Username
                            </label>
                            <InputText 
                                id="username" 
                                type="text" 
                                placeholder="Username" 
                                class="form-input" 
                                v-model="username"
                                :class="{ 'p-invalid': !username && loading }"
                            />
                        </div>

                        <div class="form-group">
                            <label for="password" class="form-label">
                                Password
                            </label>
                            <Password 
                                id="password" 
                                v-model="password" 
                                placeholder="Password" 
                                class="form-input"
                                :toggleMask="false" 
                                :feedback="false" 
                                @keyup.enter="login"
                                :class="{ 'p-invalid': !password && loading }"
                            />
                        </div>

                        <Button 
                            type="submit" 
                            label="Sign in" 
                            class="login-button" 
                            :loading="loading"
                        />

                        <div class="login-footer">
                            <p class="footer-text">Copyright © {{ new Date().getFullYear() }}</p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>
