import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface BorrowDialogData {
  deviceName: string;
}

export interface BorrowDialogResult {
  borrowerName: string;
  borrowerEmail?: string;
  purpose?: string;
}

@Component({
  selector: 'app-borrow-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>借用 {{ data.deviceName }}</h2>

    <mat-dialog-content>
      <p class="borrower-info">
        借用者：<strong>{{ userEmail }}</strong>
      </p>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>借用用途（選填）</mat-label>
        <input matInput
               [(ngModel)]="purpose"
               placeholder="例：iOS App 測試">
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>取消</button>
      <button mat-raised-button
              color="primary"
              (click)="onConfirm()">
        確認借用
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
      overflow: hidden;
    }

    mat-dialog-content {
      min-width: min(300px, 80vw);
      overflow: visible;
    }

    .borrower-info {
      margin: 0 0 16px 0;
      padding: 12px;
      background: var(--app-surface-hover);
      border-radius: 8px;
      color: var(--app-text-muted);
    }

    .borrower-info strong {
      color: var(--app-text-primary);
    }

    .full-width {
      width: 100%;
    }

    mat-form-field {
      margin-top: 4px;
    }
  `]
})
export class BorrowDialogComponent {
  purpose = '';
  userEmail = '';

  constructor(
    public dialogRef: MatDialogRef<BorrowDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BorrowDialogData,
    private supabase: SupabaseService
  ) {
    this.userEmail = this.supabase.currentUserValue?.email || '';
  }

  onConfirm() {
    const result: BorrowDialogResult = {
      borrowerName: this.userEmail,
      borrowerEmail: this.userEmail,
      purpose: this.purpose.trim() || undefined
    };
    this.dialogRef.close(result);
  }
}
