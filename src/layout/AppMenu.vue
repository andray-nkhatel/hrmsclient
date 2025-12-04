<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import AppMenuItem from './AppMenuItem.vue';
import { leaveService } from '@/service/api.service';

const store = useStore();
const router = useRouter();
const pendingCount = ref(0);

// Logout function
const logout = async () => {
  try {
    await store.dispatch('auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    router.push('/auth/login');
  }
};

// Define menu items with their role requirements
const allMenuItems = [
    {
        label: 'Main',
        items: [
            { 
                label: 'Dashboard', 
                icon: 'pi pi-fw pi-home', 
                to: '/app/dashboard',
                roles: ['admin', 'manager', 'employee']
            }
        ]
    },
    {
        label: 'Leave Management',
        items: [
            { 
                label: 'My Leaves', 
                icon: 'pi pi-fw pi-calendar', 
                to: '/app/leaves',
                roles: ['admin', 'manager', 'employee']
            },
            { 
                label: 'Apply for Leave', 
                icon: 'pi pi-fw pi-plus-circle', 
                to: '/app/leaves/apply',
                roles: ['admin', 'manager', 'employee']
            },
            { 
                label: 'Leave Balance', 
                icon: 'pi pi-fw pi-chart-bar', 
                to: '/app/leaves/balance',
                roles: ['admin', 'manager', 'employee']
            },
            { 
                label: 'Pending Approvals', 
                icon: 'pi pi-fw pi-clock', 
                to: '/app/leaves/pending',
                roles: ['admin', 'manager'],
                badge: () => pendingCount.value > 0 ? pendingCount.value : null,
                badgeClass: 'p-badge-danger'
            }
        ]
    },
    {
        label: 'HR - Leave Management',
        items: [
            { 
                label: 'All Leave Balances', 
                icon: 'pi pi-fw pi-chart-line', 
                to: '/app/hr/leaves/balances',
                roles: ['manager', 'admin']
            },
            { 
                label: 'Leave Calendar', 
                icon: 'pi pi-fw pi-calendar', 
                to: '/app/hr/leaves/calendar',
                roles: ['manager', 'admin']
            },
            { 
                label: 'Department Report', 
                icon: 'pi pi-fw pi-building', 
                to: '/app/hr/leaves/department-report',
                roles: ['manager', 'admin']
            },
            { 
                label: 'Upcoming Leaves', 
                icon: 'pi pi-fw pi-clock', 
                to: '/app/hr/leaves/upcoming',
                roles: ['manager', 'admin']
            },
            { 
                label: 'Process Accruals', 
                icon: 'pi pi-fw pi-cog', 
                to: '/app/hr/leaves/process-accruals',
                roles: ['admin']
            }
        ]
    },
    {
        label: 'Administration',
        items: [
            { 
                label: 'Leave Types', 
                icon: 'pi pi-fw pi-list', 
                to: '/app/admin/leave-types',
                roles: ['admin']
            },
            { 
                label: 'Employees', 
                icon: 'pi pi-fw pi-users', 
                to: '/app/admin/employees',
                roles: ['admin']
            }
        ]
    }
];

// Check if user is authenticated
const isAuthenticated = computed(() => store.getters['auth/isAuthenticated']);

// Get current user info
const currentUser = computed(() => store.getters['auth/user']);
const userRoles = computed(() => store.getters['auth/userRoles']);

// Helper function to check if user has any of the required roles
const hasAnyRole = (requiredRoles) => {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return store.getters['auth/hasAnyRole'](requiredRoles);
};

// Create a computed property that filters menu items based on user's roles
const model = computed(() => {
  if (!isAuthenticated.value) {
    return [
      {
        label: 'Menu',
        items: [
          { label: 'Login', icon: 'pi pi-fw pi-sign-in', to: '/auth/login' }
        ]
      }
    ];
  }

  // Filter menu sections and items based on user role
  const filteredMenuItems = allMenuItems
    .map(section => {
      if (section.roles && !hasAnyRole(section.roles)) {
        return null;
      }

      const filteredItems = section.items.filter(item => {
        return hasAnyRole(item.roles);
      });

      if (filteredItems.length > 0) {
        return {
          ...section,
          items: filteredItems
        };
      }

      return null;
    })
    .filter(section => section !== null);

  // Add logout item for all authenticated users
  filteredMenuItems.push({
    items: [{ 
      label: 'Logout', 
      icon: 'pi pi-fw pi-sign-out', 
      command: logout
    }]
  });

  return filteredMenuItems;
});

// Get current user info for display
const userDisplayInfo = computed(() => {
  if (!currentUser.value) return null;
  
  const roles = userRoles.value;
  const displayRole = Array.isArray(roles) && roles.length > 0 
    ? roles[0] 
    : currentUser.value.role || 'User';
  
  // Build display name from firstname/lastname or fallback to username
  let displayName = '';
  if (currentUser.value.firstname && currentUser.value.lastname) {
    displayName = `${currentUser.value.firstname} ${currentUser.value.lastname}`;
  } else {
    displayName = currentUser.value.username || currentUser.value.nrc || 'User';
  }
  
  return {
    name: displayName,
    role: displayRole,
    email: currentUser.value.email
  };
});

const loadPendingCount = async () => {
  try {
    const userRole = currentUser.value?.role;
    if (userRole === 'admin' || userRole === 'manager') {
      const pending = await leaveService.getPending();
      pendingCount.value = pending?.length || 0;
    }
  } catch (error) {
    // Silently fail - user may not have permission
  }
};

onMounted(() => {
  if (isAuthenticated.value) {
    loadPendingCount();
    // Refresh every 60 seconds
    setInterval(loadPendingCount, 60000);
  }
});
</script>

<template>
  <div>
    <!-- User info display -->
    <div v-if="isAuthenticated && userDisplayInfo" class="user-info-card">
      <div class="user-avatar">
        <i class="pi pi-user"></i>
      </div>
      <div class="user-details">
        <div class="user-name">{{ userDisplayInfo.name }}</div>
        <div class="user-role">{{ userDisplayInfo.role }}</div>
      </div>
    </div>
    
    <!-- Role-based menu -->
    <ul class="layout-menu">
      <template v-for="(item, i) in model" :key="i">
        <template v-if="!item.separator">
          <app-menu-item :item="item" :index="i" />
        </template>
        <li v-if="item.separator" class="menu-separator"></li>
      </template>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.user-info-card {
  display: flex;
  align-items: center;
  padding: 12px;
  margin: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);

  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    
    i {
      font-size: 18px;
    }
  }

  .user-details {
    flex: 1;
    
    .user-name {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 2px;
    }
    
    .user-role {
      font-size: 12px;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
}

.layout-menu {
  margin-top: 8px;
}
</style>
