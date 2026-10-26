import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/auth.interceptor';
import { AuthService } from '../core/auth.service';
import { PasswordInputComponent } from '../shared/password-input.component';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, PasswordInputComponent],
  template: `
    <div class="auth-page card">
      <h1>Entrar</h1>
      <p class="sub">Controle das suas horas de trabalho.</p>
      @if (error()) { <div class="error">{{ error() }}</div> }
      <form (ngSubmit)="submit()">
        <div class="field">
          <label for="u">Usuário</label>
          <input id="u" name="u" [(ngModel)]="username" autocomplete="username" required>
        </div>
        <div class="field">
          <label for="p">Senha</label>
          <app-password-input inputId="p" name="p" [(ngModel)]="password" autocomplete="current-password" />
        </div>
        <button class="btn" type="submit" [disabled]="loading() || !username || !password">Entrar</button>
      </form>
      <div class="links">
        <a routerLink="/cadastro">Criar conta</a>
        <a routerLink="/recuperar-senha">Esqueci minha senha</a>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  submit(): void {
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
