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
      <button mat-button (click)="print()">
        <mat-icon>print</mat-icon>
        列印
      </button>
      <button mat-button mat-dialog-close>關閉</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .qr-container {
      display: flex;
      justify-content: center;
      padding: 16px;
      background: white;
      border-radius: 8px;
    }

    .hint {
      text-align: center;
      color: rgba(0,0,0,0.54);
      font-size: 14px;
      margin: 16px 0 8px;
    }

    .url {
      text-align: center;
      font-size: 12px;
      color: rgba(0,0,0,0.38);
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
    const origin = window.location.origin;
    this.qrUrl = `${origin}/device/${data.deviceId}`;
  }

  copyUrl() {
    navigator.clipboard.writeText(this.qrUrl).then(() => {
      // Could show a snackbar here, but keeping it simple
      alert('連結已複製！');
    });
  }

  print() {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${this.data.deviceName} - QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .container {
              text-align: center;
              padding: 20px;
            }
            h1 {
              font-size: 24px;
              margin: 0 0 20px;
            }
            .qr-wrapper {
              padding: 20px;
              border: 2px dashed #ccc;
              display: inline-block;
              margin-bottom: 16px;
            }
            p {
              color: #666;
              font-size: 14px;
              margin: 8px 0;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${this.data.deviceName}</h1>
            <div class="qr-wrapper">
              <img src="${this.getQrImageUrl()}" width="200" height="200" />
            </div>
            <p>掃描借用 / 歸還</p>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  private getQrImageUrl(): string {
    // Use Google Charts API for print (simple approach)
    const encoded = encodeURIComponent(this.qrUrl);
    return `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encoded}`;
  }
}
