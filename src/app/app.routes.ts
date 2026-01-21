import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // 登入頁面（公開）
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  // 設備詳情頁（需登入）
  {
    path: 'device/:id',
    loadComponent: () => import('./features/devices/device-page/device-page.component').then(m => m.DevicePageComponent),
    canActivate: [authGuard]
  },
  // 設備列表首頁（需登入）
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/devices/device-list/device-list.component').then(m => m.DeviceListComponent)
      }
    ]
  },
  // 管理員頁面（需登入 + 管理員權限）
  {
    path: 'admin',
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard, adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'devices',
        pathMatch: 'full'
      },
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
  },
  // 預設導向首頁
  {
    path: '**',
    redirectTo: ''
  }
];
