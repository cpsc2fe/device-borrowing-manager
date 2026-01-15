import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-signup',
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
    MatSnackBarModule
  ],
  template: `
    <div class="signup-container">
      <mat-card class="signup-card">
        <mat-card-header>
          <mat-card-title>
            <span class="logo">📱</span>
            註冊帳號
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <form (ngSubmit)="onSubmit()" #signupForm="ngForm">
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
              <mat-hint>至少 6 個字元</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width"
                            [class.password-mismatch]="confirmPassword && password !== confirmPassword">
              <mat-label>確認密碼</mat-label>
              <input matInput
                     type="password"
                     [(ngModel)]="confirmPassword"
                     name="confirmPassword"
                     required
                     [disabled]="loading">
            </mat-form-field>
            <div class="error-hint" *ngIf="confirmPassword && password !== confirmPassword">
              密碼不一致
            </div>

            <button mat-raised-button
                    color="primary"
                    type="submit"
                    class="full-width signup-btn"
                    [disabled]="loading || !signupForm.valid || password !== confirmPassword">
              <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
              <span *ngIf="!loading">註冊</span>
            </button>
          </form>

          <div class="login-link">
            已有帳號？<a routerLink="/login">登入</a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .signup-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 16px;
    }

    .signup-card {
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

    mat-form-field.password-mismatch {
      --mdc-outlined-text-field-outline-color: #f44336;
      --mdc-outlined-text-field-focus-outline-color: #f44336;
      --mdc-outlined-text-field-label-text-color: #f44336;
      --mdc-outlined-text-field-focus-label-text-color: #f44336;
    }

    .error-hint {
      color: #f44336;
      font-size: 12px;
      margin-top: -6px;
      margin-bottom: 8px;
      padding-left: 16px;
    }

    .signup-btn {
      height: 48px;
      font-size: 16px;
      margin-top: 8px;
      margin-bottom: 16px;
    }

    .signup-btn mat-spinner {
      display: inline-block;
    }

    .login-link {
      text-align: center;
      color: rgba(0,0,0,0.6);
    }

    .login-link a {
      color: #3f51b5;
      text-decoration: none;
    }

    .login-link a:hover {
      text-decoration: underline;
    }
  `]
})
export class SignupComponent {
  email = '';
  password = '';
  confirmPassword = '';
  loading = false;

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  async onSubmit() {
    if (!this.email || !this.password) return;
    if (this.password !== this.confirmPassword) return;

    this.loading = true;
    try {
      const data = await this.supabase.signUp(this.email, this.password);

      // 檢查是否需要 email 驗證
      if (data.user && !data.session) {
        this.snackBar.open('註冊成功！請查收驗證信件', '關閉', { duration: 5000 });
        this.router.navigate(['/login']);
      } else {
        this.snackBar.open('註冊成功！', '關閉', { duration: 3000 });
        this.router.navigate(['/']);
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      let message = '註冊失敗';
      if (error.message?.includes('already registered')) {
        message = '此 Email 已被註冊';
      }
      this.snackBar.open(message, '關閉', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }
}
