import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

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
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>你的名字</mat-label>
        <input matInput
               [(ngModel)]="borrowerName"
               placeholder="請輸入你的名字"
               required>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Email（選填）</mat-label>
        <input matInput
               type="email"
               [(ngModel)]="borrowerEmail"
               placeholder="your@email.com">
      </mat-form-field>

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
              [disabled]="!borrowerName.trim()"
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

    .full-width {
      width: 100%;
    }

    mat-form-field {
      margin-top: 4px;
    }
  `]
})
export class BorrowDialogComponent {
  borrowerName = '';
  borrowerEmail = '';
  purpose = '';

  private readonly STORAGE_KEY_NAME = 'borrower_name';
  private readonly STORAGE_KEY_EMAIL = 'borrower_email';

  constructor(
    public dialogRef: MatDialogRef<BorrowDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BorrowDialogData
  ) {
    this.borrowerName = localStorage.getItem(this.STORAGE_KEY_NAME) || '';
    this.borrowerEmail = localStorage.getItem(this.STORAGE_KEY_EMAIL) || '';
  }

  onConfirm() {
    if (this.borrowerName.trim()) {
      const name = this.borrowerName.trim();
      const email = this.borrowerEmail.trim() || undefined;

      // 儲存到 localStorage
      localStorage.setItem(this.STORAGE_KEY_NAME, name);
      if (email) {
        localStorage.setItem(this.STORAGE_KEY_EMAIL, email);
      }

      const result: BorrowDialogResult = {
        borrowerName: name,
        borrowerEmail: email,
        purpose: this.purpose.trim() || undefined
      };
      this.dialogRef.close(result);
    }
  }
}
