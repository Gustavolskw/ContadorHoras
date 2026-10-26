import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { HoursPipe } from '../core/format';
import { passwordValid } from '../core/password';
import { PasswordInputComponent } from '../shared/password-input.component';
import { PasswordRulesComponent } from '../shared/password-rules.component';
import { Settings, WEEK_DAYS } from '../core/models';
import { SecurityQuestionsComponent, emptyQuestions, questionsValid } from './security-questions.component';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, HoursPipe, SecurityQuestionsComponent, PasswordInputComponent, PasswordRulesComponent],
  template: `
    <h1 class="title">Configurações</h1>
    @if (isNew) {
      <div class="success">Conta criada! Confira o valor da hora e o planejamento padrão antes de começar.</div>
    }

    <div class="grid">
      @if (settings(); as s) {
        <section class="card">
          <h2>Cálculo de horas</h2>
          @if (settingsMsg()) { <div [class]="settingsOk() ? 'success' : 'error'">{{ settingsMsg() }}</div> }
          <form (ngSubmit)="saveSettings(s)">
            <div class="field">
              <label for="rate">Valor da hora (R$)</label>
              <input id="rate" name="rate" type="number" min="0" step="0.01" [(ngModel)]="s.hourlyRate">
              <p class="hint">Usado no Saldo de cada semana e no Resultado do Mês (horas × valor).</p>
            </div>
            <div class="field">
              <label for="mode">Visualização do cálculo</label>
              <select id="mode" name="mode" [(ngModel)]="s.calcMode">
                <option value="SEMANAL">Por semana e mês (Totais/Saldo em cada semana)</option>
                <option value="MENSAL">Somente por mês</option>
              </select>
              <p class="hint">Semanas que cruzam a virada do mês contam apenas os dias do mês.</p>
            </div>
            <div class="field">
              <label for="initial">Saldo inicial de horas</label>
              <input id="initial" name="initial" type="number" step="0.25" [(ngModel)]="s.initialBalance">
              <p class="hint">Horas já lançadas no sistema de chamados antes de começar a usar este sistema.
                Entra no "Total Horas" / "Saldo Atual".</p>
            </div>
            <div class="field">
              <label for="step">Incremento do contador do dia (horas)</label>
              <input id="step" name="step" type="number" min="0.25" step="0.25" [(ngModel)]="s.counterStep">
              <p class="hint">Quanto cada clique em + / − soma ou subtrai.</p>
            </div>

            <h3>Planejamento padrão (horas pretendidas)</h3>
            <p class="hint">Usado pelo botão "Planejar mês" no calendário.</p>
            <div class="week">
              @for (d of weekDays; track d.key) {
                <div>
                  <label [for]="'d-' + d.key">{{ d.short }}</label>
                  <input [id]="'d-' + d.key" [name]="'d-' + d.key" type="number" min="0" max="24" step="0.5"
                         [(ngModel)]="s.defaultPlanned[d.key]">
                </div>
              }
            </div>
            <p class="hint">Total na semana: {{ weekTotal(s) | hours }}</p>
            <button class="btn" type="submit" [disabled]="saving()">Salvar configurações</button>
          </form>
        </section>
      }

      <div class="col">
        <section class="card">
          <h2>Alterar senha</h2>
          @if (pwdMsg()) { <div [class]="pwdOk() ? 'success' : 'error'">{{ pwdMsg() }}</div> }
          <form (ngSubmit)="changePassword()">
            <div class="field">
              <label for="cur">Senha atual</label>
              <app-password-input inputId="cur" name="cur" [(ngModel)]="pwd.current" autocomplete="current-password" />
            </div>
            <div class="field">
              <label for="new">Nova senha</label>
              <app-password-input inputId="new" name="new" [(ngModel)]="pwd.next" autocomplete="new-password"
                                  [invalid]="!!pwd.next && !passwordValid(pwd.next, username())" />
              <app-password-rules [password]="pwd.next" [username]="username()" />
            </div>
            <div class="field">
              <label for="conf">Confirmar nova senha</label>
              <app-password-input inputId="conf" name="conf" [(ngModel)]="pwd.confirm" autocomplete="new-password"
                                  [invalid]="!!pwd.confirm && pwd.confirm !== pwd.next" />
            </div>
            <button class="btn" type="submit">Alterar senha</button>
          </form>
        </section>

        <section class="card">
          <h2>Perguntas de segurança</h2>
          @if (currentQuestions().length) {
            <p class="hint">Atuais: {{ currentQuestions().join(' · ') }}</p>
          }
          @if (qMsg()) { <div [class]="qOk() ? 'success' : 'error'">{{ qMsg() }}</div> }
          <form (ngSubmit)="changeQuestions()">
            <app-security-questions [items]="questions" />
            <div class="field">
              <label for="qpwd">Senha atual (confirmação)</label>
              <app-password-input inputId="qpwd" name="qpwd" [(ngModel)]="questionsPassword" autocomplete="current-password" />
            </div>
            <button class="btn" type="submit">Salvar perguntas</button>
          </form>
        </section>
      </div>
    </div>
  `,
  styles: `
    .title { margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
    .col { display: grid; gap: 16px; }
    h2 { font-size: 16px; margin-bottom: 14px; }
    h3 { font-size: 14px; margin: 18px 0 2px; }
    .week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-top: 8px; }
    .week input { padding: 6px 4px; text-align: center; }
    .week label { text-align: center; font-weight: 500; color: var(--muted); }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);

  isNew = !!inject(ActivatedRoute).snapshot.queryParamMap.get('novo');
  weekDays = WEEK_DAYS;
  settings = signal<Settings | null>(null);
  readonly passwordValid = passwordValid;
  username = signal('');
  currentQuestions = signal<string[]>([]);
  saving = signal(false);
  settingsMsg = signal('');
  settingsOk = signal(true);

  pwd = { current: '', next: '', confirm: '' };
  pwdMsg = signal('');
  pwdOk = signal(true);

  questions = emptyQuestions();
  questionsPassword = '';
  qMsg = signal('');
  qOk = signal(true);

  ngOnInit(): void {
    this.api.settings().subscribe(s => this.settings.set(s));
    this.api.account().subscribe(a => {
      this.username.set(a.username);
      this.currentQuestions.set(a.securityQuestions);
    });
  }

  weekTotal(s: Settings): number {
    return WEEK_DAYS.reduce((sum, d) => sum + (Number(s.defaultPlanned[d.key]) || 0), 0);
  }

  saveSettings(s: Settings): void {
    this.saving.set(true);
    this.api.saveSettings(s).subscribe({
      next: saved => {
        this.settings.set(saved);
        this.settingsOk.set(true);
        this.settingsMsg.set('Configurações salvas.');
        this.saving.set(false);
      },
      error: err => {
        this.settingsOk.set(false);
        this.settingsMsg.set(errorMessage(err));
        this.saving.set(false);
      },
    });
  }

  changePassword(): void {
    const fail = (m: string) => { this.pwdOk.set(false); this.pwdMsg.set(m); };
    if (!passwordValid(this.pwd.next, this.username())) return fail('A nova senha não atende a todas as regras.');
    if (this.pwd.next !== this.pwd.confirm) return fail('As senhas não conferem.');
    this.api.changePassword(this.pwd.current, this.pwd.next).subscribe({
      next: () => {
        this.pwd = { current: '', next: '', confirm: '' };
        this.pwdOk.set(true);
        this.pwdMsg.set('Senha alterada.');
      },
      error: err => fail(errorMessage(err)),
    });
  }

  changeQuestions(): void {
    const fail = (m: string) => { this.qOk.set(false); this.qMsg.set(m); };
    if (!questionsValid(this.questions)) {
      return fail('Preencha 3 perguntas diferentes, cada uma com resposta de pelo menos 2 caracteres.');
    }
    this.api.changeQuestions(this.questionsPassword, this.questions).subscribe({
      next: () => {
        this.currentQuestions.set(this.questions.map(q => q.question.trim()));
        this.questions = emptyQuestions();
        this.questionsPassword = '';
        this.qOk.set(true);
        this.qMsg.set('Perguntas de segurança atualizadas.');
      },
      error: err => fail(errorMessage(err)),
    });
  }
}
