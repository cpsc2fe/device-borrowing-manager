import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const user = supabase.currentUserValue;

  if (user) {
    return true;
  }

  // 等待一下看看是否有 session
  const { data: { session } } = await supabase.client.auth.getSession();

  if (session) {
    return true;
  }

  // 保存原始 URL，登入後可以返回
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};
