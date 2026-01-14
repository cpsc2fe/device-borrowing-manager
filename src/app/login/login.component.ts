import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {}

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    const { email, password } = this.loginForm.value;

    try {
      const { error } = await this.authService.signIn(email, password);
      if (error) {
        this.errorMessage = '登入失敗，請檢查您的 Email 或密碼。';
        console.error(error);
      } else {
        // 登入成功後，AuthService 的 onAuthStateChange 會觸發
        // 我們可以透過路由守衛或 App 元件來處理導航
        this.router.navigate(['/']);
      }
    } catch (error) {
      this.errorMessage = '發生未知錯誤，請稍後再試。';
      console.error(error);
    } finally {
      this.loading = false;
    }
  }
}