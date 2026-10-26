import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/auth.interceptor';
import { AuthService } from '../core/auth.service';
import { passwordValid } from '../core/password';
import { PasswordInputComponent } from '../shared/password-input.component';
import { PasswordRulesComponent } from '../shared/password-rules.component';
import { SecurityQuestionsComponent, emptyQuestions, questionsValid } from './security-questions.component';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,40}$/;

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, SecurityQuestionsComponent, PasswordInputComponent, PasswordRulesComponent],
  template: `
    <div class="auth-page card">
      <h1>Criar conta</h1>
      <p class="sub">As perguntas de segurança são a única forma de recuperar a senha.</p>
      @if (error()) { <div class="error">{{ error() }}</div> }
      <form (ngSubmit)="submit()">
        <div class="field">
          <label for="u">Usuário</label>
          <input id="u" name="u" [(ngModel)]="username" autocomplete="username" required
                 autocapitalize="off" spellcheck="false" aria-describedby="u-hint"
                 [attr.aria-invalid]="usernameProblem() ? true : null">
          @if (usernameProblem(); as problem) {
            <p id="u-hint" class="hint mismatch">
              {{ problem }}
              @if (usernameSuggestion(); as sug) {
                Que tal <button type="button" class="link" (click)="username = sug">{{ sug }}</button>?
              }
            </p>
          } @else {
            <p id="u-hint" class="hint">Nome para entrar no sistema: letras, números, ponto, hífen ou sublinhado (3 a 40), sem espaços.</p>
          }
        </div>
        <div class="field">
          <label for="p">Senha</label>
          <app-password-input inputId="p" name="p" [(ngModel)]="password" autocomplete="new-password"
                              [invalid]="!!password && !passwordOk()" />
          <app-password-rules [password]="password" [username]="username" />
        </div>
        <div class="field">
          <label for="c">Confirmar senha</label>
          <app-password-input inputId="c" name="c" [(ngModel)]="confirm" autocomplete="new-password"
                              [invalid]="!!confirm && confirm !== password" />
          @if (confirm && confirm !== password) { <p class="hint mismatch">As senhas não conferem.</p> }
        </div>
        <app-security-questions [items]="questions" />
        <button class="btn" type="submit" [disabled]="loading()">Criar conta</button>
      </form>
      <div class="links"><a routerLink="/login">Já tenho conta</a></div>
    </div>
  `,
  styles: `
    .mismatch { color: var(--danger); }
    .link { background: none; border: 0; padding: 0; font: inherit; color: var(--accent); text-decoration: underline; cursor: pointer; }
  `,
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  confirm = '';
  questions = emptyQuestions();
  loading = signal(false);
  error = signal('');

  usernameOk(): boolean {
    return USERNAME_PATTERN.test(this.username.trim());
  }

  /** Motivo específico de o usuário ser inválido (null quando vazio ou válido). */
  usernameProblem(): string | null {
    const u = this.username.trim();
    if (!u || this.usernameOk()) return null;
    if (/\s/.test(u)) return 'O usuário não pode ter espaços.';
    if (/[^a-zA-Z0-9._-]/.test(u)) return 'O usuário não pode ter acentos nem símbolos (use letras, números, ponto, hífen ou sublinhado).';
    if (u.length < 3) return 'O usuário precisa ter pelo menos 3 caracteres.';
    return 'O usuário pode ter no máximo 40 caracteres.';
  }

  /** Ex.: "Gustavo Luís" -> "gustavo.luis". */
  usernameSuggestion(): string | null {
    const sug = this.username.trim().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
      .replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '').slice(0, 40);
    return USERNAME_PATTERN.test(sug) && sug !== this.username.trim() ? sug : null;
  }

  passwordOk(): boolean {
    return passwordValid(this.password, this.username);
  }

  submit(): void {
    if (!this.usernameOk()) return this.error.set(this.usernameProblem() ?? 'Informe o nome de usuário.');
    if (!this.passwordOk()) return this.error.set('A senha não atende a todas as regras.');
    if (this.password !== this.confirm) return this.error.set('As senhas não conferem.');
    if (!questionsValid(this.questions)) {
      return this.error.set('Preencha 3 perguntas diferentes, cada uma com resposta de pelo menos 2 caracteres.');
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.register(this.username.trim(), this.password, this.questions).subscribe({
      next: () => this.router.navigate(['/configuracoes'], { queryParams: { novo: 1 } }),
      error: err => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
