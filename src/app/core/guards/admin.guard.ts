import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const adminGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const isAdmin = await supabase.isAdmin();

  if (isAdmin) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
