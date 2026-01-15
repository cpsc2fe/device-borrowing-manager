import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>
            <span class="logo">📱</span>
            測試機借用系統
          </mat-card-title>
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
                     [type]="showPassword ? 'text' : 'password'"
                     [(ngModel)]="password"
                     name="password"
                     required
                     minlength="6"
                     [disabled]="loading">
            </mat-form-field>

            <div class="options">
              <mat-checkbox [(ngModel)]="rememberMe" name="rememberMe">
                記住我的登入狀態
              </mat-checkbox>
            </div>

            <button mat-raised-button
                    color="primary"
                    type="submit"
                    class="full-width login-btn"
                    [disabled]="loading || !loginForm.valid">
              <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
              <span *ngIf="!loading">登入</span>
            </button>
          </form>

          <div class="links">
            <a (click)="forgotPassword()" class="link">忘記密碼？</a>
            <span class="divider">|</span>
            <a routerLink="/signup" class="link">註冊帳號</a>
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
      justify-content: center;
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

    .full-width {
      width: 100%;
    }

    mat-form-field {
      margin-bottom: 8px;
    }

    .options {
      margin-bottom: 16px;
    }

    .login-btn {
      height: 48px;
      font-size: 16px;
      margin-bottom: 16px;
    }

    .login-btn mat-spinner {
      display: inline-block;
    }

    .links {
      text-align: center;
    }

    .link {
      color: #3f51b5;
      cursor: pointer;
      text-decoration: none;
    }

    .link:hover {
      text-decoration: underline;
    }

    .divider {
      margin: 0 8px;
      color: rgba(0,0,0,0.26);
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  rememberMe = false;
  showPassword = false;
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
      this.snackBar.open('登入成功！', '關閉', { duration: 3000 });
      this.router.navigate(['/']);
    } catch (error: any) {
      console.error('Login error:', error);
      this.snackBar.open(error.message || '登入失敗，請檢查帳號密碼', '關閉', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.loading = false;
    }
  }

  async forgotPassword() {
    if (!this.email) {
      this.snackBar.open('請先輸入 Email', '關閉', { duration: 3000 });
      return;
    }

    try {
      await this.supabase.resetPassword(this.email);
      this.snackBar.open('重設密碼信件已寄出，請查收', '關閉', { duration: 5000 });
    } catch (error: any) {
      this.snackBar.open(error.message || '寄送失敗', '關閉', { duration: 5000 });
    }
  }
}
