import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ChangePasswordDialogComponent } from '../change-password-dialog/change-password-dialog.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDialogModule,
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <!-- 側邊欄（桌面版） -->
      <mat-sidenav
        #sidenav
        [mode]="isMobile ? 'over' : 'side'"
        [opened]="!isMobile"
        class="sidenav"
      >
        <div class="sidenav-header">
          <img class="logo" src="assets/images/favicon.png" alt="借機機" />
          <div class="title-stack">
            <span class="title">借機機</span>
            <span class="subtitle">輕鬆管理團隊的測試設備</span>
          </div>
        </div>

        <mat-nav-list>
          <a
            mat-list-item
            routerLink="/"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            <mat-icon matListItemIcon>devices</mat-icon>
            <span matListItemTitle>設備列表</span>
          </a>
          <a mat-list-item routerLink="/my-borrows" routerLinkActive="active">
            <mat-icon matListItemIcon>assignment</mat-icon>
            <span matListItemTitle>我的借用</span>
          </a>
        </mat-nav-list>

        <mat-nav-list *ngIf="isAdmin">
          <div class="nav-divider"></div>
          <div class="nav-section-title">管理功能</div>
          <a
            mat-list-item
            routerLink="/admin/devices"
            routerLinkActive="active"
          >
            <mat-icon matListItemIcon>phone_android</mat-icon>
            <span matListItemTitle>設備管理</span>
          </a>
          <a mat-list-item routerLink="/admin/users" routerLinkActive="active">
            <mat-icon matListItemIcon>people</mat-icon>
            <span matListItemTitle>用戶管理</span>
          </a>
          <a
            mat-list-item
            routerLink="/admin/settings"
            routerLinkActive="active"
          >
            <mat-icon matListItemIcon>settings</mat-icon>
            <span matListItemTitle>系統設定</span>
          </a>
        </mat-nav-list>

        <div class="sidenav-footer">
          <div class="user-email">{{ userEmail }}</div>
          <button mat-button color="warn" (click)="logout()">
            <mat-icon>logout</mat-icon>
            登出
          </button>
        </div>
      </mat-sidenav>

      <!-- 主內容區 -->
      <mat-sidenav-content class="content">
        <!-- 頂部工具列 -->
        <mat-toolbar color="primary" class="toolbar">
          <button
            mat-icon-button
            (click)="toggleSidenav()"
            *ngIf="isMobile && isAdmin"
          >
            <mat-icon>menu</mat-icon>
          </button>
          <img
            class="logo-small"
            *ngIf="!isAdmin"
            src="assets/images/favicon.png"
            alt="借機機"
          />
          <span class="toolbar-title">{{
            isAdmin ? pageTitle : '借機機'
          }}</span>
          <span class="spacer"></span>

          <!-- 用戶選單 -->
          <button mat-icon-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <div class="menu-email">{{ userEmail }}</div>
            <button mat-menu-item (click)="openChangePasswordDialog()">
              <mat-icon>lock</mat-icon>
              <span>更改密碼</span>
            </button>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>登出</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <!-- 頁面內容 -->
        <main class="main-content" [class.with-bottom-nav]="isMobile">
          <router-outlet></router-outlet>
        </main>

        <!-- 底部導航（手機版） -->
        <nav class="bottom-nav" *ngIf="isMobile">
          <a
            routerLink="/"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            <mat-icon>devices</mat-icon>
            <span>設備</span>
          </a>
          <a routerLink="/my-borrows" routerLinkActive="active">
            <mat-icon>assignment</mat-icon>
            <span>我的借用</span>
          </a>
          <a
            routerLink="/admin/devices"
            routerLinkActive="active"
            *ngIf="isAdmin"
          >
            <mat-icon>phone_android</mat-icon>
            <span>管理</span>
          </a>
          <a
            routerLink="/admin/settings"
            routerLinkActive="active"
            *ngIf="isAdmin"
          >
            <mat-icon>settings</mat-icon>
            <span>設定</span>
          </a>
        </nav>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .sidenav-container {
        height: 100vh;
      }

      .sidenav {
        width: 240px;
        display: flex;
        flex-direction: column;
        background: var(--app-surface-elev);
      }

      .sidenav-header {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        border-bottom: 1px solid var(--app-border);
      }

      .logo {
        width: 32px;
        height: 32px;
      }

      .logo-small {
        width: 24px;
        height: 24px;
        margin-right: 8px;
      }

    .title {
      font-size: 16px;
      font-weight: 500;
    }

    .title-stack {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .subtitle {
      font-size: 12px;
      color: var(--app-text-muted);
      margin-top: 2px;
    }

      .nav-divider {
        height: 1px;
        background: var(--app-border);
        margin: 8px 16px;
      }

      .nav-section-title {
        padding: 8px 16px;
        font-size: 12px;
        color: var(--app-text-muted);
        text-transform: uppercase;
      }

      .sidenav-footer {
        margin-top: auto;
        padding: 16px;
        border-top: 1px solid var(--app-border);
        text-align: center;
      }

      .user-email {
        font-size: 12px;
        color: var(--app-text-muted);
        margin-bottom: 8px;
        word-break: break-all;
      }

      .content {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }

      .toolbar {
        position: sticky;
        top: 0;
        z-index: 100;
        height: 64px;
        padding: 8px 16px;
        background: var(--app-surface-elev) !important;
      }

      .toolbar-title {
        margin-left: 8px;
        font-size: 18px;
      }

      .spacer {
        flex: 1;
      }

      .admin-login-btn {
        color: var(--app-text-muted);
      }

      .admin-login-btn:hover {
        color: var(--app-text);
      }

      .main-content {
        flex: 1;
        padding: 16px;
        background: var(--app-bg);
      }

      .main-content.with-bottom-nav {
        padding-bottom: 80px;
      }

      .menu-email {
        padding: 8px 16px;
        font-size: 12px;
        color: var(--app-text-muted);
        border-bottom: 1px solid var(--app-border);
      }

      .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 64px;
        background: var(--app-surface);
        display: flex;
        justify-content: space-around;
        align-items: center;
        box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.4);
        z-index: 100;
      }

      .bottom-nav a {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-decoration: none;
        color: var(--app-text-muted);
        font-size: 12px;
        padding: 8px;
      }

      .bottom-nav a.active {
        color: var(--app-accent);
      }

      .bottom-nav mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      mat-nav-list a.active {
        background: var(--app-accent-soft);
        color: var(--app-accent);
      }

      @media (max-width: 600px) {
        .toolbar {
          height: 56px;
          padding: 6px 12px;
        }

        .toolbar-title {
          font-size: 16px;
        }

        .logo-small {
          width: 20px;
          height: 20px;
        }
      }

      @media (min-width: 768px) {
        .bottom-nav {
          display: none;
        }
      }
    `,
  ],
})
export class LayoutComponent implements OnInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  isMobile = false;
  isAdmin = false;
  userEmail = '';
  pageTitle = '設備列表';

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private dialog: MatDialog,
  ) {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  async ngOnInit() {
    this.supabase.user$.subscribe(async (user) => {
      this.userEmail = user?.email || '';
      // Update admin status when auth state changes
      if (user) {
        this.isAdmin = await this.supabase.isAdmin();
      } else {
        this.isAdmin = false;
      }
    });
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  toggleSidenav() {
    if (this.sidenav) {
      this.sidenav.toggle();
    }
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }

  openChangePasswordDialog() {
    this.dialog.open(ChangePasswordDialogComponent);
  }
}
