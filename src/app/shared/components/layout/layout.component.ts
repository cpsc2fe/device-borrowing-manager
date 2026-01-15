import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { SupabaseService } from '../../../core/services/supabase.service';

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
    MatMenuModule
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <!-- 側邊欄（桌面版） -->
      <mat-sidenav #sidenav
                   [mode]="isMobile ? 'over' : 'side'"
                   [opened]="!isMobile"
                   class="sidenav">
        <div class="sidenav-header">
          <span class="logo">📱</span>
          <span class="title">測試機借用系統</span>
        </div>

        <mat-nav-list>
          <a mat-list-item routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
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
          <a mat-list-item routerLink="/admin/devices" routerLinkActive="active">
            <mat-icon matListItemIcon>phone_android</mat-icon>
            <span matListItemTitle>設備管理</span>
          </a>
          <a mat-list-item routerLink="/admin/users" routerLinkActive="active">
            <mat-icon matListItemIcon>people</mat-icon>
            <span matListItemTitle>使用者管理</span>
          </a>
          <a mat-list-item routerLink="/admin/settings" routerLinkActive="active">
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
          <button mat-icon-button (click)="sidenav.toggle()" *ngIf="isMobile">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="toolbar-title">{{ pageTitle }}</span>
          <span class="spacer"></span>
          <button mat-icon-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <div class="menu-email">{{ userEmail }}</div>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>登出</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <!-- 頁面內容 -->
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>

        <!-- 底部導航（手機版） -->
        <nav class="bottom-nav" *ngIf="isMobile">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
            <mat-icon>devices</mat-icon>
            <span>設備</span>
          </a>
          <a routerLink="/my-borrows" routerLinkActive="active">
            <mat-icon>assignment</mat-icon>
            <span>我的借用</span>
          </a>
          <a routerLink="/admin/devices" routerLinkActive="active" *ngIf="isAdmin">
            <mat-icon>settings</mat-icon>
            <span>管理</span>
          </a>
          <a [matMenuTriggerFor]="mobileUserMenu">
            <mat-icon>person</mat-icon>
            <span>我</span>
          </a>
          <mat-menu #mobileUserMenu="matMenu">
            <div class="menu-email">{{ userEmail }}</div>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>登出</span>
            </button>
          </mat-menu>
        </nav>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container {
      height: 100vh;
    }

    .sidenav {
      width: 240px;
      display: flex;
      flex-direction: column;
    }

    .sidenav-header {
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid rgba(0,0,0,0.12);
    }

    .logo {
      font-size: 24px;
    }

    .title {
      font-size: 16px;
      font-weight: 500;
    }

    .nav-divider {
      height: 1px;
      background: rgba(0,0,0,0.12);
      margin: 8px 16px;
    }

    .nav-section-title {
      padding: 8px 16px;
      font-size: 12px;
      color: rgba(0,0,0,0.54);
      text-transform: uppercase;
    }

    .sidenav-footer {
      margin-top: auto;
      padding: 16px;
      border-top: 1px solid rgba(0,0,0,0.12);
      text-align: center;
    }

    .user-email {
      font-size: 12px;
      color: rgba(0,0,0,0.54);
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
    }

    .toolbar-title {
      margin-left: 8px;
    }

    .spacer {
      flex: 1;
    }

    .main-content {
      flex: 1;
      padding: 16px;
      background: #fafafa;
      padding-bottom: 80px;
    }

    .menu-email {
      padding: 8px 16px;
      font-size: 12px;
      color: rgba(0,0,0,0.54);
      border-bottom: 1px solid rgba(0,0,0,0.12);
    }

    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 64px;
      background: white;
      display: flex;
      justify-content: space-around;
      align-items: center;
      box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
      z-index: 100;
    }

    .bottom-nav a {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-decoration: none;
      color: rgba(0,0,0,0.54);
      font-size: 12px;
      padding: 8px;
    }

    .bottom-nav a.active {
      color: #3f51b5;
    }

    .bottom-nav mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    mat-nav-list a.active {
      background: rgba(63, 81, 181, 0.1);
      color: #3f51b5;
    }

    @media (min-width: 768px) {
      .main-content {
        padding-bottom: 16px;
      }

      .bottom-nav {
        display: none;
      }
    }
  `]
})
export class LayoutComponent implements OnInit {
  isMobile = false;
  isAdmin = false;
  userEmail = '';
  pageTitle = '設備列表';

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  async ngOnInit() {
    this.supabase.user$.subscribe(user => {
      this.userEmail = user?.email || '';
    });

    this.isAdmin = await this.supabase.isAdmin();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
