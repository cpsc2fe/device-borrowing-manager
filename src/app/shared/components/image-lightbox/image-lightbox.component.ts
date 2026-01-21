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
    <button mat-icon-button class="close-btn" (click)="close()">
      <mat-icon>close</mat-icon>
    </button>
    <div class="lightbox">
      <img [src]="data.imageUrl" [alt]="data.title || 'image'">
      <div class="caption" *ngIf="data.title">{{ data.title }}</div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      overflow: hidden;
    }

    .close-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
      min-width: 32px;
      border-radius: 3px;
      background: var(--app-surface);
      color: var(--app-text);
      border: 1px solid var(--app-border);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      z-index: 1;
    }

    .close-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
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

    .lightbox {
      padding: 16px;
      padding-top: 48px;
      text-align: center;
    }

    img {
      max-width: 100%;
      max-height: 75vh;
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

    @media (max-width: 600px) {
      .lightbox {
        padding: 12px;
        padding-top: 44px;
      }

      .close-btn {
        top: 6px;
        right: 6px;
      }
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
