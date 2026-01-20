import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // 公開頁面：設備借用頁（QR Code 連結目標）
  {
    path: 'device/:id',
    loadComponent: () => import('./features/devices/device-page/device-page.component').then(m => m.DevicePageComponent)
  },
  // 公開頁面：設備列表（首頁）
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/devices/device-list/device-list.component').then(m => m.DeviceListComponent)
      }
    ]
  },
  // 管理員登入
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  // 管理員頁面（需要登入）
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
