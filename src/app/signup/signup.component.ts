import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AuthService } from '../auth.service';

// Custom validator to check that two fields match
export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (
    password &&
    confirmPassword &&
    password.value !== confirmPassword.value &&
    confirmPassword.value !== ''
  ) {
    // 只有當確認密碼不為空且不匹配時才返回錯誤
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }

  // 如果密碼匹配，清除確認密碼欄位的 passwordMismatch 錯誤
  if (
    password &&
    confirmPassword &&
    password.value === confirmPassword.value &&
    confirmPassword.hasError('passwordMismatch')
  ) {
    const errors = confirmPassword.errors;
    delete errors?.['passwordMismatch'];
    confirmPassword.setErrors(
      Object.keys(errors || {}).length > 0 ? errors : null
    );
  }

  return null;
};

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})
export class SignupComponent implements OnInit {
  signupForm: FormGroup;
  loading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.signupForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    // 監聽密碼欄位變化，即時觸發確認密碼驗證
    this.signupForm.get('password')?.valueChanges.subscribe(() => {
      this.signupForm
        .get('confirmPassword')
        ?.updateValueAndValidity({ emitEvent: false });
    });

    // 監聽確認密碼欄位變化，即時觸發驗證
    this.signupForm.get('confirmPassword')?.valueChanges.subscribe(() => {
      this.signupForm.updateValueAndValidity({ emitEvent: false });
    });
  }

  // 檢查密碼是否匹配（用於模板中的條件顯示）
  get passwordsMatch(): boolean {
    const password = this.signupForm.get('password')?.value;
    const confirmPassword = this.signupForm.get('confirmPassword')?.value;
    return password === confirmPassword;
  }

  // 檢查確認密碼欄位是否有錯誤
  get confirmPasswordHasError(): boolean {
    const confirmPasswordControl = this.signupForm.get('confirmPassword');
    return !!(
      confirmPasswordControl?.hasError('passwordMismatch') &&
      confirmPasswordControl?.touched
    );
  }

  async onSubmit(): Promise<void> {
    if (this.signupForm.invalid) {
      // 標記所有欄位為已觸碰，顯示驗證錯誤
      Object.keys(this.signupForm.controls).forEach((key) => {
        this.signupForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const { email, password } = this.signupForm.value;

    try {
      const result = await this.authService.signUp(email, password);

      if (result.error) {
        // 根據不同錯誤類型顯示相應的中文訊息
        this.errorMessage = this.getErrorMessage(result.error);
      } else {
        this.successMessage =
          '註冊成功！請檢查您的 Email 並點擊確認信中的連結來啟用帳號。';
        this.signupForm.reset();
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  private getErrorMessage(error: any): string {
    const errorMessage = error?.message || error || '';
    const errorCode = error?.code || '';

    console.log('註冊錯誤詳情:', error); // 除錯用

    // 處理我們自定義的錯誤代碼
    if (errorCode === 'user_already_exists') {
      return '此 Email 已經註冊過，請使用其他 Email 或嘗試登入。';
    }

    if (errorCode === 'unexpected_error') {
      return '註冊過程中發生錯誤，請稍後再試。';
    }

    // 處理 RLS 策略錯誤（通常表示重複註冊）
    if (
      errorCode === '42501' ||
      errorMessage.includes('row-level security policy')
    ) {
      return '此 Email 已經註冊過，請使用其他 Email 或嘗試登入。';
    }

    // 常見的 Supabase 錯誤訊息對應
    if (errorMessage.includes('User already registered')) {
      return '此 Email 已經註冊過，請使用其他 Email 或嘗試登入。';
    }

    if (errorMessage.includes('Email address is already registered')) {
      return '此 Email 已經註冊過，請使用其他 Email 或嘗試登入。';
    }

    if (errorMessage.includes('email') && errorMessage.includes('already')) {
      return '此 Email 已經註冊過，請使用其他 Email 或嘗試登入。';
    }

    if (errorMessage.includes('Invalid email')) {
      return 'Email 格式不正確，請檢查後重新輸入。';
    }

    if (errorMessage.includes('Password should be at least')) {
      return '密碼長度至少需要 6 個字元。';
    }

    if (errorMessage.includes('weak')) {
      return '密碼強度不足，請使用更複雜的密碼。';
    }

    if (errorMessage.includes('Network request failed')) {
      return '網路連線錯誤，請檢查網路連線後再試。';
    }

    // 處理其他權限相關錯誤
    if (errorCode === '23505' || errorMessage.includes('duplicate key')) {
      return '此 Email 已經註冊過，請使用其他 Email 或嘗試登入。';
    }

    // 如果是已知的錯誤但沒有匹配到上面的條件，顯示原始訊息
    if (errorMessage) {
      return `註冊失敗：${errorMessage}`;
    }

    return '發生未知錯誤，請稍後再試。';
  }
}
