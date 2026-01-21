import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgModel } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>更改密碼</h2>

    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>原本密碼</mat-label>
        <input matInput
               type="password"
               name="currentPassword"
               [(ngModel)]="currentPassword"
               #currentPasswordModel="ngModel"
               required>
        <mat-error *ngIf="showRequired(currentPasswordModel)">請輸入原本密碼</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>新密碼</mat-label>
        <input matInput
               type="password"
               name="newPassword"
               [(ngModel)]="newPassword"
               #newPasswordModel="ngModel"
               minlength="6"
               required>
        <mat-error *ngIf="showRequired(newPasswordModel)">請輸入新密碼</mat-error>
        <mat-error *ngIf="showPasswordTooShort">密碼至少 6 個字元</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>確認新密碼</mat-label>
        <input matInput
               type="password"
               name="confirmPassword"
               [(ngModel)]="confirmPassword"
               #confirmPasswordModel="ngModel"
               required>
        <mat-error *ngIf="showRequired(confirmPasswordModel)">請再次輸入新密碼</mat-error>
        <mat-error *ngIf="showPasswordMismatch">新密碼不一致</mat-error>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="saving">取消</button>
      <button mat-raised-button
              color="primary"
              [disabled]="!isValid || saving"
              (click)="onConfirm()">
        變更密碼
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: min(360px, 80vw);
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
export class ChangePasswordDialogComponent {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  saving = false;

  constructor(
    private dialogRef: MatDialogRef<ChangePasswordDialogComponent>,
    private supabase: SupabaseService,
    private snackBar: MatSnackBar
  ) {}

  get isValid(): boolean {
    return this.currentPassword.length > 0 &&
      this.newPassword.length >= 6 &&
      this.newPassword === this.confirmPassword;
  }

  get showPasswordMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.newPassword !== this.confirmPassword;
  }

  get showPasswordTooShort(): boolean {
    return this.newPassword.length > 0 && this.newPassword.length < 6;
  }

  showRequired(model: NgModel | null): boolean {
    const interacted = !!(model?.dirty || model?.touched);
    return interacted && !model?.value;
  }

  async onConfirm() {
    if (!this.isValid || this.saving) {
      return;
    }

    this.saving = true;
    try {
      await this.supabase.changePassword(this.currentPassword, this.newPassword);
      this.snackBar.open('密碼已更新', '關閉', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : '密碼更新失敗';
      this.snackBar.open(message, '關閉', { duration: 5000 });
    } finally {
      this.saving = false;
    }
  }
}
