import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ImageLightboxData {
  imageUrl: string;
  title?: string;
}

@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="lightbox">
      <button mat-icon-button class="close-btn" (click)="close()">
        <mat-icon>close</mat-icon>
      </button>
      <img [src]="data.imageUrl" [alt]="data.title || 'image'">
      <div class="caption" *ngIf="data.title">{{ data.title }}</div>
    </div>
  `,
  styles: [`
    .lightbox {
      position: relative;
      padding: 16px;
      text-align: center;
    }

    .close-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 36px;
      height: 36px;
      border-radius: 0;
      background: var(--app-surface);
      color: var(--app-text);
      border: 1px solid var(--app-border);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .close-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .close-btn:hover {
      background: var(--app-surface-elev);
    }

    :host ::ng-deep .close-btn .mat-mdc-button-persistent-ripple,
    :host ::ng-deep .close-btn .mdc-icon-button__ripple,
    :host ::ng-deep .close-btn .mat-mdc-focus-indicator {
      opacity: 0 !important;
      background: transparent !important;
    }

    img {
      max-width: min(90vw, 960px);
      max-height: 80vh;
      width: auto;
      height: auto;
      border-radius: 3px;
      background: var(--app-surface-elev);
      display: block;
      margin: 0 auto;
    }

    .caption {
      margin-top: 12px;
      color: var(--app-text-muted);
      font-size: 14px;
    }
  `]
})
export class ImageLightboxComponent {
  constructor(
    public dialogRef: MatDialogRef<ImageLightboxComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ImageLightboxData
  ) {}

  close() {
    this.dialogRef.close();
  }
}
