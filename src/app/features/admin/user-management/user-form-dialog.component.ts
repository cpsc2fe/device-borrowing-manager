import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
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
               [(ngModel)]="email"
               placeholder="user@example.com"
               required>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>密碼</mat-label>
        <input matInput
               type="password"
               [(ngModel)]="password"
               placeholder="至少 6 個字元"
               minlength="6"
               required>
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
    }

    .full-width {
      width: 100%;
    }

    mat-form-field {
      margin-bottom: 8px;
    }
  `]
})
export class UserFormDialogComponent {
  email = '';
  password = '';
  role: 'admin' | 'user' = 'user';

  constructor(
    public dialogRef: MatDialogRef<UserFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserFormDialogData
  ) {}

  get isValid(): boolean {
    return this.email.trim().length > 0 &&
           this.email.includes('@') &&
           this.password.length >= 6;
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
