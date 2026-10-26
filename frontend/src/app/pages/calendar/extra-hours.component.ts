import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { HoursPipe } from '../../core/format';
import { ExtraDistribution, ExtraHours, ExtraRequest, ExtraScope, WeekSummary } from '../../core/models';

interface ExtraForm {
  id: string | null;
  description: string;
  hours: number | null;
  distribution: ExtraDistribution;
  scope: ExtraScope;
  week: number;
}

const DISTRIBUTION_LABELS: Record<ExtraDistribution, string> = {
  NONE: 'Não ratear (só no total do mês)',
  WORKDAYS: 'Dias úteis (seg–sex), partes iguais',
  PLAN: 'Conforme o planejamento padrão',
};

/** Horas avulsas do mês: entram nas feitas, nas pretendidas, no saldo e no valor; podem ser rateadas. */
@Component({
  selector: 'app-extra-hours',
  imports: [FormsModule, HoursPipe],
  template: `
    <section class="card extras">
      <div class="head">
        <h2>Horas avulsas <span class="muted">· {{ monthLabel() }}</span></h2>
        @if (!form()) {
          <button type="button" class="btn small" (click)="startNew()">+ Adicionar horas avulsas</button>
        }
      </div>
      <p class="hint">Somam nas horas feitas <b>e</b> nas pretendidas do mês, no saldo e no valor.
        Opcionalmente, rateie entre os dias de uma semana ou do mês inteiro.</p>
      @if (error()) { <div class="error">{{ error() }}</div> }

      @if (form(); as f) {
        <form class="extra-form" (ngSubmit)="save(f)">
          <div class="row">
            <div class="grow">
              <label for="x-desc">Descrição</label>
              <input id="x-desc" name="desc" [(ngModel)]="f.description" maxlength="200" placeholder="Ex.: ajuste do sistema de chamados">
            </div>
            <div class="hours-field">
              <label for="x-hours">Horas</label>
              <input id="x-hours" name="hours" type="number" min="0.25" max="500" step="0.25" [(ngModel)]="f.hours" required>
            </div>
          </div>
          <div class="row">
            <div class="grow">
              <label for="x-dist">Ratear</label>
              <select id="x-dist" name="dist" [(ngModel)]="f.distribution">
                @for (d of distributions; track d) { <option [value]="d">{{ distributionLabel(d) }}</option> }
              </select>
            </div>
            @if (f.distribution !== 'NONE') {
              <div class="grow">
                <label for="x-scope">Período</label>
                <select id="x-scope" name="scope" [ngModel]="scopeValue(f)" (ngModelChange)="setScope(f, $event)">
                  <option value="MONTH">Mês inteiro</option>
                  @for (w of weeks(); track w.number) {
                    <option [value]="'W' + w.number">Semana {{ w.number }} ({{ shortDate(w.start) }} a {{ shortDate(w.end) }})</option>
                  }
                </select>
              </div>
            }
          </div>
          <div class="actions">
            <button type="button" class="btn ghost small" (click)="form.set(null)">Cancelar</button>
            <button type="submit" class="btn small" [disabled]="saving()">{{ f.id ? 'Salvar alterações' : 'Adicionar' }}</button>
          </div>
        </form>
      }

      @if (items().length) {
        <ul class="list">
          @for (x of items(); track x.id) {
            <li>
              <div class="info">
                <span class="desc">{{ x.description }}</span>
                <span class="hint">{{ rateioLabel(x) }}</span>
              </div>
              <b class="extra">{{ x.hours | hours }}</b>
              <button type="button" class="btn ghost small" (click)="startEdit(x)">Editar</button>
              <button type="button" class="btn danger small" (click)="remove(x)">Excluir</button>
            </li>
          }
        </ul>
        <p class="total">Total avulso no mês: <b class="extra">{{ total() | hours }}</b></p>
      } @else if (!form()) {
        <p class="empty">Nenhuma hora avulsa neste mês.</p>
      }
    </section>
  `,
  styles: `
    .extras { margin-top: 16px; }
    .head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    h2 { font-size: 15px; margin: 0; }
    .muted { color: var(--muted); font-weight: 400; }
    .hint { color: var(--muted); font-size: 12px; }
    .extra { color: var(--extra); font-variant-numeric: tabular-nums; }
    .extra-form { border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin: 10px 0; }
    .row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
    .grow { flex: 1 1 220px; }
    .hours-field { flex: 0 0 110px; }
    label { font-weight: 500; color: var(--muted); font-size: 12px; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; }
    .list { list-style: none; padding: 0; margin: 10px 0 0; }
    .list li { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px dashed var(--border); }
    .info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .desc { overflow-wrap: anywhere; }
    .total { text-align: right; margin: 10px 0 0; }
    .empty { color: var(--muted); margin: 10px 0 0; }
    @media (max-width: 520px) {
      .list li { flex-wrap: wrap; }
      .info { flex-basis: 100%; }
    }
  `,
})
export class ExtraHoursComponent {
  private api = inject(ApiService);

  month = input.required<string>();
  monthLabel = input('');
  weeks = input<WeekSummary[]>([]);
  /** Avisa o calendário para recarregar o resumo após qualquer alteração. */
  changed = output<void>();

  readonly distributions: ExtraDistribution[] = ['NONE', 'WORKDAYS', 'PLAN'];
  items = signal<ExtraHours[]>([]);
  form = signal<ExtraForm | null>(null);
  saving = signal(false);
  error = signal('');

  constructor() {
    effect(() => {
      const month = this.month();
      this.form.set(null);
      this.error.set('');
      this.api.extras(month).subscribe({
        next: items => this.items.set(items),
        error: err => this.error.set(errorMessage(err)),
      });
    });
  }

  total(): number {
    return Math.round(this.items().reduce((s, x) => s + x.hours, 0) * 100) / 100;
  }

  distributionLabel(d: ExtraDistribution): string {
    return DISTRIBUTION_LABELS[d];
  }

  rateioLabel(x: ExtraHours): string {
    if (x.distribution === 'NONE') return 'Sem rateio (só no total do mês)';
    const period = x.scope === 'WEEK' ? `semana ${x.week}` : 'mês inteiro';
    const how = x.distribution === 'PLAN' ? 'conforme planejamento' : 'dias úteis';
    return `Rateado: ${period}, ${how} (${Object.keys(x.allocation).length} dias)`;
  }

  shortDate(iso: string): string {
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  }

  scopeValue(f: ExtraForm): string {
    return f.scope === 'WEEK' ? 'W' + f.week : 'MONTH';
  }

  setScope(f: ExtraForm, value: string): void {
    if (value === 'MONTH') {
      f.scope = 'MONTH';
    } else {
      f.scope = 'WEEK';
      f.week = Number(value.slice(1));
    }
  }

  startNew(): void {
    this.error.set('');
    this.form.set({ id: null, description: '', hours: null, distribution: 'NONE', scope: 'MONTH', week: 1 });
  }

  startEdit(x: ExtraHours): void {
    this.error.set('');
    this.form.set({
      id: x.id, description: x.description, hours: x.hours, distribution: x.distribution,
      scope: x.scope ?? 'MONTH', week: x.week ?? 1,
    });
  }

  save(f: ExtraForm): void {
    const hours = Number(f.hours);
    if (!Number.isFinite(hours) || hours <= 0) {
      this.error.set('Informe uma quantidade de horas maior que zero.');
      return;
    }
    const req: ExtraRequest = {
      month: this.month(), description: f.description.trim(), hours,
      distribution: f.distribution,
      scope: f.distribution === 'NONE' ? null : f.scope,
      week: f.distribution !== 'NONE' && f.scope === 'WEEK' ? f.week : null,
    };
    this.saving.set(true);
    const call = f.id ? this.api.updateExtra(f.id, req) : this.api.createExtra(req);
    call.subscribe({
      next: () => {
        this.saving.set(false);
        this.form.set(null);
        this.error.set('');
        this.reload();
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }

  remove(x: ExtraHours): void {
    if (!confirm(`Excluir "${x.description}" (${x.hours}h)?`)) return;
    this.api.deleteExtra(x.id).subscribe({
      next: () => this.reload(),
      error: err => this.error.set(errorMessage(err)),
    });
  }

  private reload(): void {
    this.api.extras(this.month()).subscribe(items => this.items.set(items));
    this.changed.emit();
  }
}
