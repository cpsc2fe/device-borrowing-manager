import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DeviceService, Device } from '../../../core/services/device.service';

@Component({
  selector: 'app-device-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'add' ? '新增設備' : '編輯設備' }}</h2>

    <mat-dialog-content>
      <form #deviceForm="ngForm">
        <!-- 設備圖片 -->
        <div class="image-upload">
          <div class="image-preview" (click)="fileInput.click()">
            <img *ngIf="imagePreview" [src]="imagePreview" alt="設備圖片">
            <div class="upload-placeholder" *ngIf="!imagePreview">
              <mat-icon>add_photo_alternate</mat-icon>
              <span>點擊上傳圖片</span>
            </div>
          </div>
          <input #fileInput
                 type="file"
                 accept="image/*"
                 hidden
                 (change)="onFileSelected($event)">
        </div>

        <!-- 基本資訊 -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>設備名稱</mat-label>
          <input matInput
                 [(ngModel)]="formData.name"
                 name="name"
                 required
                 placeholder="例：iPhone 15 Pro">
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>品牌</mat-label>
            <input matInput
                   [(ngModel)]="formData.brand"
                   name="brand"
                   required
                   placeholder="例：Apple">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>型號</mat-label>
            <input matInput
                   [(ngModel)]="formData.model"
                   name="model"
                   placeholder="例：A2848">
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>作業系統</mat-label>
            <mat-select [(ngModel)]="formData.os" name="os">
              <mat-option value="iOS">iOS</mat-option>
              <mat-option value="Android">Android</mat-option>
              <mat-option value="iPadOS">iPadOS</mat-option>
              <mat-option value="Windows">Windows</mat-option>
              <mat-option value="macOS">macOS</mat-option>
              <mat-option value="Other">其他</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>系統版本</mat-label>
            <input matInput
                   [(ngModel)]="formData.os_version"
                   name="os_version"
                   placeholder="例：17.2">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>狀態</mat-label>
          <mat-select [(ngModel)]="formData.status" name="status" required>
            <mat-option value="available">🟢 可借用</mat-option>
            <mat-option value="borrowed">🔴 已借出</mat-option>
            <mat-option value="maintenance">🟡 維修中</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>備註</mat-label>
          <textarea matInput
                    [(ngModel)]="formData.notes"
                    name="notes"
                    rows="2"
                    placeholder="例：256GB 太空黑"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" [disabled]="saving">取消</button>
      <button mat-raised-button
              color="primary"
              (click)="onSave()"
              [disabled]="!deviceForm.valid || saving">
        <mat-spinner diameter="18" *ngIf="saving"></mat-spinner>
        <span *ngIf="!saving">{{ data.mode === 'add' ? '新增' : '儲存' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 400px;
    }

    .image-upload {
      margin-bottom: 16px;
    }

    .image-preview {
      width: 100%;
      height: 150px;
      border: 2px dashed #ccc;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.2s;
    }

    .image-preview:hover {
      border-color: #3f51b5;
    }

    .image-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .upload-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: rgba(0,0,0,0.38);
    }

    .upload-placeholder mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .full-width {
      width: 100%;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }

    .form-row mat-form-field {
      flex: 1;
    }

    mat-dialog-actions button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    @media (max-width: 500px) {
      mat-dialog-content {
        min-width: auto;
      }

      .form-row {
        flex-direction: column;
        gap: 0;
      }
    }
  `]
})
export class DeviceFormDialogComponent {
  formData: Partial<Device> = {
    name: '',
    brand: '',
    model: '',
    os: '',
    os_version: '',
    status: 'available',
    notes: '',
    image_url: null
  };
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  saving = false;

  constructor(
    public dialogRef: MatDialogRef<DeviceFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'add' | 'edit'; device?: Device },
    private deviceService: DeviceService,
    private snackBar: MatSnackBar
  ) {
    if (data.mode === 'edit' && data.device) {
      this.formData = { ...data.device };
      this.imagePreview = data.device.image_url;
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  async onSave() {
    this.saving = true;
    try {
      // 上傳圖片（如果有選擇新圖片）
      if (this.selectedFile) {
        const imageUrl = await this.deviceService.uploadImage(this.selectedFile);
        this.formData.image_url = imageUrl;
      }

      if (this.data.mode === 'add') {
        await this.deviceService.createDevice(this.formData);
        this.snackBar.open('新增成功', '關閉', { duration: 3000 });
      } else if (this.data.device) {
        await this.deviceService.updateDevice(this.data.device.id, this.formData);
        this.snackBar.open('儲存成功', '關閉', { duration: 3000 });
      }

      this.dialogRef.close(true);
    } catch (error: any) {
      console.error('Save error:', error);
      this.snackBar.open(error.message || '儲存失敗', '關閉', { duration: 5000 });
    } finally {
      this.saving = false;
    }
  }
}
