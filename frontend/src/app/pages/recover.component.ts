import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/auth.interceptor';
import { AuthService } from '../core/auth.service';
import { passwordValid } from '../core/password';
import { PasswordInputComponent } from '../shared/password-input.component';
import { PasswordRulesComponent } from '../shared/password-rules.component';

@Component({
  selector: 'app-recover',
  imports: [FormsModule, RouterLink, PasswordInputComponent, PasswordRulesComponent],
  template: `
    <div class="auth-page card">
      <h1>Recuperar senha</h1>
      <p class="sub">Responda às suas perguntas de segurança para definir uma nova senha.</p>
      @if (error()) { <div class="error">{{ error() }}</div> }

      @if (questions().length === 0) {
        <form (ngSubmit)="loadQuestions()">
          <div class="field">
            <label for="u">Usuário</label>
            <input id="u" name="u" [(ngModel)]="username" autocomplete="username" required>
          </div>
          <button class="btn" type="submit" [disabled]="loading() || !username">Continuar</button>
        </form>
      } @else {
        <form (ngSubmit)="reset()">
          @for (q of questions(); track $index; let i = $index) {
            <div class="field">
              <label [for]="'a' + i">{{ q }}</label>
              <input [id]="'a' + i" [name]="'a' + i" [(ngModel)]="answers[i]" required>
            </div>
          }
          <div class="field">
            <label for="p">Nova senha</label>
            <app-password-input inputId="p" name="p" [(ngModel)]="password" autocomplete="new-password"
                                [invalid]="!!password && !passwordValid(password, username)" />
            <app-password-rules [password]="password" [username]="username" />
          </div>
          <div class="field">
            <label for="c">Confirmar nova senha</label>
            <app-password-input inputId="c" name="c" [(ngModel)]="confirm" autocomplete="new-password"
                                [invalid]="!!confirm && confirm !== password" />
          </div>
          <button class="btn" type="submit" [disabled]="loading()">Redefinir senha</button>
        </form>
      }
      <div class="links"><a routerLink="/login">Voltar para o login</a></div>
    </div>
  `,
})
export class RecoverComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly passwordValid = passwordValid;
  username = '';
  answers: string[] = [];
  password = '';
  confirm = '';
  questions = signal<string[]>([]);
  loading = signal(false);
  error = signal('');

  loadQuestions(): void {
    this.loading.set(true);
    this.error.set('');
    this.auth.recoveryQuestions(this.username).subscribe({
      next: r => {
        this.answers = r.questions.map(() => '');
        this.questions.set(r.questions);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  reset(): void {
    if (!passwordValid(this.password, this.username)) return this.error.set('A senha não atende a todas as regras.');
    if (this.password !== this.confirm) return this.error.set('As senhas não conferem.');
    this.loading.set(true);
    this.error.set('');
    this.auth.resetPassword(this.username, this.answers, this.password).subscribe({
      next: () => this.auth.login(this.username, this.password).subscribe(() => this.router.navigate(['/'])),
      error: err => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
