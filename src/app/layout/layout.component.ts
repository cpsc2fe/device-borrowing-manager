import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
})
export class LayoutComponent {
  isAdmin$: Observable<boolean>;

  constructor(private authService: AuthService, private router: Router) {
    // 檢查用戶是否為管理員
    this.isAdmin$ = this.authService.userProfile$.pipe(
      map((userProfile) => userProfile?.role === 'admin')
    );
  }

  async logout(): Promise<void> {
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }
}
