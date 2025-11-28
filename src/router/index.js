import AppLayout from '@/layout/AppLayout.vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import { authGuard } from './guard/auth.guard';

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        // Redirect root to login
        {
            path: '/',
            redirect: '/auth/login'
        },
        {
            path: '/auth/login',
            name: 'login',
            component: () => import('@/views/pages/auth/Login.vue')
        },
        {
            path: '/auth/register',
            name: 'register',
            component: () => import('@/views/pages/auth/Register.vue')
        },
        // All authenticated routes under /app
        {
            path: '/app',
            component: AppLayout,
            redirect: '/app/dashboard',
            children: [
                {
                    path: 'dashboard',
                    name: 'dashboard',
                    meta: { requiresAuth: true },
                    component: () => import('@/views/dashboard/Dashboard.vue')
                },
                {   
                    path: 'profile',
                    name: 'profile',
                    meta: { requiresAuth: true },
                    component: () => import('@/views/users/Profile.vue')
                },
                // Leave Management - All authenticated users
                {
                    path: 'leaves',
                    name: 'my-leaves',
                    meta: { requiresAuth: true },
                    component: () => import('@/views/leaves/MyLeaves.vue')
                },
                {
                    path: 'leaves/apply',
                    name: 'apply-leave',
                    meta: { requiresAuth: true },
                    component: () => import('@/views/leaves/ApplyLeave.vue')
                },
                {
                    path: 'leaves/balance',
                    name: 'leave-balance',
                    meta: { requiresAuth: true },
                    component: () => import('@/views/leaves/LeaveBalance.vue')
                },
                // Manager Routes
                {
                    path: 'leaves/pending',
                    name: 'pending-leaves',
                    meta: { requiresAuth: true, roles: ['manager', 'admin'] },
                    component: () => import('@/views/leaves/PendingLeaves.vue')
                },
                {
                    path: 'leaves/:id/audit',
                    name: 'leave-audit',
                    meta: { requiresAuth: true, roles: ['manager', 'admin'] },
                    component: () => import('@/views/leaves/LeaveAudit.vue')
                },
                // Admin Routes
                {
                    path: 'admin/leave-types',
                    name: 'leave-types',
                    meta: { requiresAuth: true, roles: ['admin'] },
                    component: () => import('@/views/admin/LeaveTypes.vue')
                },
                {
                    path: 'admin/employees',
                    name: 'employees',
                    meta: { requiresAuth: true, roles: ['admin'] },
                    component: () => import('@/views/admin/Employees.vue')
                }
            ]
        }
    ]
});

router.beforeEach(authGuard);
export default router;
