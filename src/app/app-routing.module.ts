import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { LayoutComponent } from './layout/layout.component';
import { AuthGuard } from './auth.guard';
import { SignupComponent } from './signup/signup.component';
import { DeviceListComponent } from './devices/device-list/device-list.component';
import { MyBorrowsComponent } from './my-borrows/my-borrows.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminGuard } from './admin.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'devices', component: DeviceListComponent },
      { path: 'my-borrows', component: MyBorrowsComponent },
      {
        path: 'admin',
        component: AdminDashboardComponent,
        canActivate: [AdminGuard],
      },
      // We can add a default child route later, e.g., a dashboard
      { path: '', redirectTo: 'devices', pathMatch: 'full' },
    ],
  },
  // Redirect any other path to the login page
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
