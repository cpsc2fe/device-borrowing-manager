import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

interface UserInfo {
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
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatMenuModule
  ],
  template: `
    <div class="user-management-container">
      <div class="header">
        <h1>使用者管理</h1>
      </div>

      <mat-card class="info-card">
        <mat-icon>info</mat-icon>
        <p>
          新增使用者請前往 Supabase Dashboard → Authentication → Users → Add user
        </p>
      </mat-card>

      <!-- 載入中 -->
      <div class="loading" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- 使用者列表 -->
      <mat-card *ngIf="!loading">
        <table mat-table [dataSource]="users" class="user-table">
          <!-- Email -->
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let user">{{ user.email }}</td>
          </ng-container>

          <!-- 角色 -->
          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>角色</th>
            <td mat-cell *matCellDef="let user">
              <span class="role-chip" [ngClass]="user.role">
                {{ user.role === 'admin' ? '管理員' : '一般使用者' }}
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
              <button mat-icon-button [matMenuTriggerFor]="menu" *ngIf="user.id !== currentUserId">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="toggleRole(user)">
                  <mat-icon>swap_horiz</mat-icon>
                  <span>{{ user.role === 'admin' ? '降為一般使用者' : '升為管理員' }}</span>
                </button>
              </mat-menu>
              <span class="current-user" *ngIf="user.id === currentUserId">（你）</span>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </mat-card>
    </div>
  `,
  styles: [`
    .user-management-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 24px;
    }

    .header h1 {
      margin: 0;
      font-size: 24px;
    }

    .info-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      margin-bottom: 24px;
      background: #e3f2fd;
    }

    .info-card mat-icon {
      color: #1976d2;
    }

    .info-card p {
      margin: 0;
      font-size: 14px;
      color: rgba(0,0,0,0.7);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .user-table {
      width: 100%;
    }

    .role-chip {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
    }

    .role-chip.admin {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .role-chip.user {
      background: #f5f5f5;
      color: rgba(0,0,0,0.6);
    }

    .current-user {
      font-size: 12px;
      color: rgba(0,0,0,0.38);
    }
  `]
})
export class UserManagementComponent implements OnInit {
  users: UserInfo[] = [];
  displayedColumns = ['email', 'role', 'created_at', 'actions'];
  loading = true;
  currentUserId: string | null = null;

  constructor(
    private supabase: SupabaseService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    this.currentUserId = this.supabase.currentUserValue?.id || null;
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
      this.users = data as UserInfo[];
    } catch (error) {
      console.error('Error loading users:', error);
      this.snackBar.open('載入使用者失敗', '關閉', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  async toggleRole(user: UserInfo) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const action = newRole === 'admin' ? '升為管理員' : '降為一般使用者';

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '320px',
      data: {
        title: '確認變更',
        message: `確定要將「${user.email}」${action}嗎？`,
        confirmText: '確認'
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          const { error } = await this.supabase.client
            .from('users')
            .update({ role: newRole })
            .eq('id', user.id);

          if (error) throw error;

          this.snackBar.open('變更成功', '關閉', { duration: 3000 });
          await this.loadUsers();
        } catch (error: any) {
          console.error('Update error:', error);
          this.snackBar.open(error.message || '變更失敗', '關閉', { duration: 5000 });
        }
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW');
  }
}
