import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async () => {
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

  router.navigate(['/login']);
  return false;
};
