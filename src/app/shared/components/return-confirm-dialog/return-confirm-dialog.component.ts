import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';

export interface ReturnConfirmDialogData {
  deviceName: string;
}

@Component({
  selector: 'app-return-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>確認歸還</h2>
    <mat-dialog-content>
      <p class="confirm-message">確定要歸還「{{ data.deviceName }}」嗎？</p>

      <div class="reminders">
        <p class="reminder-title">歸還前請確認：</p>
        <mat-checkbox [(ngModel)]="vpnChecked" color="primary">
          如果過程中有使用 VPN，歸還前都請記得關閉
        </mat-checkbox>
        <mat-checkbox [(ngModel)]="incognitoChecked" color="primary">
          如果有需要使用測試機瀏覽交付網址，都請記得使用無痕，並於瀏覽後確實關閉該分頁
        </mat-checkbox>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">取消</button>
      <button mat-raised-button
              color="warn"
              [disabled]="!allChecked"
              (click)="onConfirm()">
        確認歸還
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .confirm-message {
      margin: 0 0 16px 0;
      color: var(--app-text-muted);
    }

    .reminders {
      background: var(--app-surface-hover);
      border-radius: 8px;
      padding: 12px 16px;
    }

    .reminder-title {
      margin: 0 0 12px 0;
      font-weight: 500;
      color: var(--app-text-primary);
    }

    mat-checkbox {
      display: block;
      margin-bottom: 8px;
    }

    mat-checkbox:last-child {
      margin-bottom: 0;
    }

    ::ng-deep .reminders .mdc-form-field label {
      white-space: normal;
      line-height: 1.4;
    }
  `]
})
export class ReturnConfirmDialogComponent {
  vpnChecked = false;
  incognitoChecked = false;

  constructor(
    public dialogRef: MatDialogRef<ReturnConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReturnConfirmDialogData
  ) {}

  get allChecked(): boolean {
    return this.vpnChecked && this.incognitoChecked;
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  onConfirm() {
    this.dialogRef.close(true);
  }
}
