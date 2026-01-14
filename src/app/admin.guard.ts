import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    
    return this.authService.userProfile$.pipe(
      take(1),
      map(userProfile => {
        if (userProfile && userProfile.role === 'admin') {
          return true;
        } else {
          // Redirect to devices page or an unauthorized page
          return this.router.createUrlTree(['/devices']);
        }
      })
    );
  }
}