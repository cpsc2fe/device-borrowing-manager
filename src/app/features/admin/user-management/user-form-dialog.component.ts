import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormsModule, NgModel } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

export interface UserFormDialogData {
  mode: 'add';
}

export interface UserFormDialogResult {
  email: string;
  password: string;
  role: 'admin' | 'user';
}

class ImmediateEmailErrorStateMatcher implements ErrorStateMatcher {
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  isErrorState(control: AbstractControl | null): boolean {
    const value = (control?.value ?? '').toString().trim();
    const interacted = !!(control?.dirty || control?.touched);
    if (!interacted) {
      return false;
    }
    return value.length === 0 || !this.emailRegex.test(value);
  }
}

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>新增用戶</h2>

    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Email</mat-label>
        <input matInput
               type="email"
               name="email"
               [(ngModel)]="email"
               #emailModel="ngModel"
               placeholder="user@example.com"
               [errorStateMatcher]="emailErrorMatcher"
               [pattern]="emailPattern"
               required>
        <mat-error *ngIf="showEmailRequired(emailModel)">Email 必填</mat-error>
        <mat-error *ngIf="showEmailInvalid(emailModel)">Email 格式不正確</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>密碼</mat-label>
        <input matInput
               type="password"
               [(ngModel)]="password"
               placeholder="至少 6 個字元"
               minlength="6"
               required>
        <mat-error *ngIf="showPasswordTooShort">密碼至少 6 個字元</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>確認密碼</mat-label>
        <input matInput
               type="password"
               [(ngModel)]="confirmPassword"
               placeholder="再次輸入密碼"
               required>
        <mat-error *ngIf="showPasswordMismatch">密碼不一致</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>角色</mat-label>
        <mat-select [(ngModel)]="role" required>
          <mat-option value="user">一般用戶</mat-option>
          <mat-option value="admin">管理員</mat-option>
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>取消</button>
      <button mat-raised-button
              color="primary"
              [disabled]="!isValid"
              (click)="onConfirm()">
        建立用戶
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: min(350px, 80vw);
      overflow: visible;
    }

    .full-width {
      width: 100%;
    }

    mat-form-field {
      margin: 4px 0 8px 0;
    }
  `]
})
export class UserFormDialogComponent {
  email = '';
  password = '';
  confirmPassword = '';
  role: 'admin' | 'user' = 'user';
  emailPattern = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  emailErrorMatcher = new ImmediateEmailErrorStateMatcher();

  constructor(
    public dialogRef: MatDialogRef<UserFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserFormDialogData
  ) {}

  get isValid(): boolean {
    return this.email.trim().length > 0 &&
           this.emailRegex.test(this.email.trim()) &&
           this.password.length >= 6 &&
           this.password === this.confirmPassword;
  }

  get showPasswordMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  get showPasswordTooShort(): boolean {
    return this.password.length > 0 && this.password.length < 6;
  }

  showEmailRequired(emailModel: NgModel | null): boolean {
    const interacted = !!(emailModel?.dirty || emailModel?.touched);
    return interacted && this.email.trim().length === 0;
  }

  showEmailInvalid(emailModel: NgModel | null): boolean {
    const value = this.email.trim();
    const interacted = !!(emailModel?.dirty || emailModel?.touched);
    return interacted && value.length > 0 && !this.emailRegex.test(value);
  }

  onConfirm() {
    if (this.isValid) {
      const result: UserFormDialogResult = {
        email: this.email.trim(),
        password: this.password,
        role: this.role
      };
      this.dialogRef.close(result);
    }
  }
}
