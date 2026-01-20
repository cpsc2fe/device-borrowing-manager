import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { QRCodeModule } from 'angularx-qrcode';

export interface QrDialogData {
  deviceId: string;
  deviceName: string;
}

@Component({
  selector: 'app-qr-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    QRCodeModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.deviceName }}</h2>

    <mat-dialog-content>
      <div class="qr-container">
        <qrcode
          [qrdata]="qrUrl"
          [width]="256"
          [errorCorrectionLevel]="'M'"
          [margin]="2">
        </qrcode>
      </div>
      <p class="hint">掃描此 QR Code 即可借用或歸還設備</p>
      <p class="url">{{ qrUrl }}</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="copyUrl()">
        <mat-icon>content_copy</mat-icon>
        複製連結
      </button>
      <button mat-button mat-dialog-close>關閉</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .qr-container {
      display: flex;
      justify-content: center;
      padding: 16px;
      background: var(--app-surface-elev);
      border-radius: 3px;
    }

    .hint {
      text-align: center;
      color: var(--app-text-muted);
      font-size: 14px;
      margin: 16px 0 8px;
    }

    .url {
      text-align: center;
      font-size: 12px;
      color: var(--app-text-muted);
      word-break: break-all;
      margin: 0;
    }

    mat-dialog-actions button mat-icon {
      margin-right: 4px;
    }
  `]
})
export class QrDialogComponent {
  qrUrl: string;

  constructor(
    public dialogRef: MatDialogRef<QrDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: QrDialogData
  ) {
    // Generate URL based on current origin
    const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
    this.qrUrl = new URL(`device/${data.deviceId}`, window.location.origin + baseHref).toString();
  }

  copyUrl() {
    navigator.clipboard.writeText(this.qrUrl).then(() => {
      alert('連結已複製！');
    });
  }
}
