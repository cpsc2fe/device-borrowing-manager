import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { UserFormDialogComponent, UserFormDialogData, UserFormDialogResult } from './user-form-dialog.component';

interface UserRecord {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <div class="user-management-container">
      <div class="header">
        <h1>用戶管理</h1>
        <button mat-raised-button color="primary" (click)="openAddDialog()">
          <mat-icon>person_add</mat-icon>
          新增用戶
        </button>
      </div>

      <!-- 載入中 -->
      <div class="loading" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- 用戶列表 -->
      <mat-card *ngIf="!loading">
        <table mat-table [dataSource]="users" class="user-table">
          <!-- Email -->
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let user">
              <strong>{{ user.email }}</strong>
            </td>
          </ng-container>

          <!-- 角色 -->
          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>角色</th>
            <td mat-cell *matCellDef="let user">
              <span class="role-chip" [ngClass]="user.role">
                {{ user.role === 'admin' ? '管理員' : '一般用戶' }}
              </span>
            </td>
          </ng-container>

          <!-- 建立時間 -->
          <ng-container matColumnDef="created_at">
            <th mat-header-cell *matHeaderCellDef>建立時間</th>
            <td mat-cell *matCellDef="let user">
              {{ formatDate(user.created_at) }}
            </td>
          </ng-container>

          <!-- 操作 -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>操作</th>
            <td mat-cell *matCellDef="let user">
              <button mat-icon-button
                      color="warn"
                      (click)="deleteUser(user)"
                      [disabled]="user.id === currentUserId">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div class="empty-state" *ngIf="users.length === 0">
          <mat-icon>people_outline</mat-icon>
          <p>尚無用戶資料</p>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .user-management-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header h1 {
      margin: 0;
      font-size: 24px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    mat-card {
      overflow: hidden;
    }

    .user-table {
      width: 100%;
    }

    .role-chip {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
    }

    .role-chip.admin {
      background: rgba(156, 39, 176, 0.2);
      color: #ce93d8;
    }

    .role-chip.user {
      background: rgba(33, 150, 243, 0.2);
      color: #90caf9;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: var(--app-text-muted);
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }
  `]
})
export class UserManagementComponent implements OnInit {
  users: UserRecord[] = [];
  loading = true;
  displayedColumns = ['email', 'role', 'created_at', 'actions'];
  currentUserId = '';

  constructor(
    private supabase: SupabaseService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    this.currentUserId = this.supabase.currentUserValue?.id || '';
    await this.loadUsers();
  }

  async loadUsers() {
    this.loading = true;
    try {
      const { data, error } = await this.supabase.client
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.users = data || [];
    } catch (error: any) {
      console.error('Load users error:', error);
      this.snackBar.open('載入用戶列表失敗', '關閉', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '400px',
      data: { mode: 'add' } as UserFormDialogData
    });

    dialogRef.afterClosed().subscribe(async (result: UserFormDialogResult | undefined) => {
      if (result) {
        await this.createUser(result);
      }
    });
  }

  async createUser(data: UserFormDialogResult) {
    try {
      // 使用 Supabase Admin API 建立用戶（需透過 RPC function）
      const { data: result, error } = await this.supabase.client
        .rpc('create_user', {
          p_email: data.email,
          p_password: data.password,
          p_role: data.role
        });

      if (error) throw error;

      this.snackBar.open('用戶建立成功', '關閉', { duration: 3000 });
      await this.loadUsers();
    } catch (error: any) {
      console.error('Create user error:', error);
      this.snackBar.open(error.message || '建立用戶失敗', '關閉', { duration: 5000 });
    }
  }

  deleteUser(user: UserRecord) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '320px',
      data: {
        title: '確認刪除',
        message: `確定要刪除用戶「${user.email}」嗎？此操作無法復原。`,
        confirmText: '刪除',
        cancelText: '取消',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          const { error } = await this.supabase.client
            .rpc('delete_user', { p_user_id: user.id });

          if (error) throw error;

          this.snackBar.open('用戶已刪除', '關閉', { duration: 3000 });
          await this.loadUsers();
        } catch (error: any) {
          console.error('Delete user error:', error);
          this.snackBar.open(error.message || '刪除用戶失敗', '關閉', { duration: 5000 });
        }
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
