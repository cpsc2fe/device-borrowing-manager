import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // 登入頁面
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  // 需要登入的頁面
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      // 首頁（設備列表）
      {
        path: '',
        loadComponent: () => import('./features/devices/device-list/device-list.component').then(m => m.DeviceListComponent)
      },
      // 我的借用
      {
        path: 'my-borrows',
        loadComponent: () => import('./features/borrows/my-borrows/my-borrows.component').then(m => m.MyBorrowsComponent)
      },
      // 管理員頁面
      {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          {
            path: 'devices',
            loadComponent: () => import('./features/admin/device-management/device-management.component').then(m => m.DeviceManagementComponent)
          },
          {
            path: 'users',
            loadComponent: () => import('./features/admin/user-management/user-management.component').then(m => m.UserManagementComponent)
          },
          {
            path: 'settings',
            loadComponent: () => import('./features/admin/settings/settings.component').then(m => m.SettingsComponent)
          }
        ]
      }
    ]
  },
  // 預設導向首頁
  {
    path: '**',
    redirectTo: ''
  }
];
