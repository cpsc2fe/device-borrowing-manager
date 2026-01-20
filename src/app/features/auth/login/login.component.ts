import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>
            <span class="logo">📱</span>
            管理員登入
          </mat-card-title>
          <p class="subtitle">測試機借用系統</p>
        </mat-card-header>

        <mat-card-content>
          <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput
                     type="email"
                     [(ngModel)]="email"
                     name="email"
                     required
                     email
                     [disabled]="loading">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>密碼</mat-label>
              <input matInput
                     type="password"
                     [(ngModel)]="password"
                     name="password"
                     required
                     minlength="6"
                     [disabled]="loading">
            </mat-form-field>

            <button mat-raised-button
                    color="primary"
                    type="submit"
                    class="full-width login-btn"
                    [disabled]="loading || !loginForm.valid">
              <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
              <span *ngIf="!loading">登入</span>
            </button>
          </form>

          <div class="back-link">
            <a routerLink="/">
              <mat-icon>arrow_back</mat-icon>
              返回設備列表
            </a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 16px;
    }

    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 24px;
    }

    mat-card-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 24px;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 24px;
    }

    .logo {
      font-size: 32px;
    }

    .subtitle {
      margin: 8px 0 0;
      font-size: 14px;
      color: rgba(0,0,0,0.54);
    }

    .full-width {
      width: 100%;
    }

    mat-form-field {
      margin-bottom: 8px;
    }

    .login-btn {
      height: 48px;
      font-size: 16px;
      margin-bottom: 16px;
    }

    .login-btn mat-spinner {
      display: inline-block;
    }

    .back-link {
      text-align: center;
    }

    .back-link a {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #3f51b5;
      text-decoration: none;
    }

    .back-link a:hover {
      text-decoration: underline;
    }

    .back-link mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  async onSubmit() {
    if (!this.email || !this.password) return;

    this.loading = true;
    try {
      await this.supabase.signIn(this.email, this.password);

      // Check if admin
      const isAdmin = await this.supabase.isAdmin();
      if (!isAdmin) {
        await this.supabase.signOut();
        this.snackBar.open('此帳號沒有管理員權限', '關閉', { duration: 5000 });
        return;
      }

      this.snackBar.open('登入成功！', '關閉', { duration: 3000 });
      this.router.navigate(['/admin/devices']);
    } catch (error: any) {
      console.error('Login error:', error);
      this.snackBar.open(error.message || '登入失敗，請檢查帳號密碼', '關閉', {
        duration: 5000
      });
    } finally {
      this.loading = false;
    }
  }
}
