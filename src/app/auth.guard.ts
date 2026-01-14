import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    
    // Use the new session$ observable which waits for the auth state to be known
    return this.authService.session$.pipe(
      take(1), // Take the first confirmed value
      map(session => {
        const isAuthenticated = !!session;
        if (isAuthenticated) {
          return true;
        } else {
          // If not authenticated, redirect to the login page
          return this.router.createUrlTree(['/login']);
        }
      })
    );
  }
}
