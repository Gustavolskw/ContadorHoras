import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, forkJoin, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { BrlPipe, HoursPipe, isoDate, isoMonth, round2 } from '../../core/format';
import { Entry, MonthSummary, Settings, Ticket, WEEK_DAYS, WeekSummary } from '../../core/models';
import { EyeIconComponent } from '../../shared/eye-icon.component';
import { ExtraHoursComponent } from './extra-hours.component';

interface Cell {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  entry?: Entry;
}

interface WeekRow {
  cells: Cell[];
  summary?: WeekSummary;
}

interface EditState {
  date: string;
  workedHours: number;
  plannedHours: number;
  meetingHours: number;
  note: string;
  tickets: TicketRow[];
}

interface TicketRow {
  number: string;
  name: string;
  hours: number;
}

const SHOW_MONEY_KEY = 'ch.showMoney';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho',
  'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

@Component({
  selector: 'app-calendar',
  imports: [FormsModule, RouterLink, HoursPipe, BrlPipe, EyeIconComponent, ExtraHoursComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css',
})
export class CalendarComponent implements OnInit {
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);

  readonly weekDays = WEEK_DAYS;
  readonly today = isoDate(new Date());

  month = signal(isoMonth(new Date()));
  entries = signal(new Map<string, Entry>());
  summary = signal<MonthSummary | null>(null);
  settings = signal<Settings | null>(null);
  todayEntry = signal<Entry>({ date: this.today, workedHours: 0, plannedHours: 0, meetingHours: 0, note: null, tickets: [] });
  error = signal('');

  /** Valores em R$ começam ocultos; a escolha fica salva neste navegador. */
  showMoney = signal(readFlag(SHOW_MONEY_KEY));

  editing = signal<EditState | null>(null);
  editError = signal('');
  saving = signal(false);
  planOpen = signal(false);

  /** Salvamento do contador do dia com debounce, para não gravar a cada clique. */
  private todaySave$ = new Subject<Entry>();

  step = computed(() => this.settings()?.counterStep ?? 1);
  weeklyMode = computed(() => this.summary()?.calcMode !== 'MENSAL');
  isCurrentMonth = computed(() => this.month() === isoMonth(new Date()));

  monthLabel = computed(() => {
    const [y, m] = this.month().split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  });

  todayRemaining = computed(() => {
    const e = this.todayEntry();
    return round2(e.plannedHours - e.workedHours - e.meetingHours);
  });

  todayLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });

  /** Linhas de segunda a domingo, como na planilha. */
  rows = computed<WeekRow[]>(() => {
    const [y, m] = this.month().split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const weeks = this.summary()?.weeks ?? [];
    const entries = this.entries();

    const rows: WeekRow[] = [];
    for (const d = new Date(start); d <= last; ) {
      const cells: Cell[] = [];
      for (let i = 0; i < 7; i++) {
        const date = isoDate(d);
        const inMonth = d.getMonth() === m - 1;
        cells.push({ date, day: d.getDate(), inMonth, isToday: date === this.today,
          entry: inMonth ? entries.get(date) : undefined });
        d.setDate(d.getDate() + 1);
      }
      rows.push({ cells, summary: weeks[rows.length] });
    }
    return rows;
  });

  ngOnInit(): void {
    this.api.settings().subscribe(s => this.settings.set(s));
    this.api.day(this.today).subscribe(e => this.todayEntry.set(e));
    this.load();

    this.todaySave$.pipe(
      debounceTime(400),
      switchMap(e => this.api.saveDay(e.date, e).pipe(catchError(err => {
        this.error.set(errorMessage(err));
        return EMPTY;
      }))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(saved => this.afterSave(saved));
  }

  load(): void {
    const month = this.month();
    forkJoin([this.api.monthEntries(month), this.api.summary(month)]).subscribe({
      next: ([entries, summary]) => {
        this.entries.set(new Map(entries.map(e => [e.date, e])));
        this.summary.set(summary);
        this.error.set('');
      },
      error: err => this.error.set(errorMessage(err)),
    });
  }

  changeMonth(delta: number): void {
    const [y, m] = this.month().split('-').map(Number);
    this.month.set(isoMonth(new Date(y, m - 1 + delta, 1)));
    this.load();
  }

  goToCurrentMonth(): void {
    this.month.set(isoMonth(new Date()));
    this.load();
  }

  toggleMoney(): void {
    this.showMoney.set(!this.showMoney());
    try {
      localStorage.setItem(SHOW_MONEY_KEY, String(this.showMoney()));
    } catch { /* preferência só nesta sessão */ }
  }

  // ----- Contador do dia -----

  stepToday(direction: 1 | -1): void {
    this.setTodayWorked(this.todayEntry().workedHours + direction * this.step());
  }

  setTodayWorked(value: number | string): void {
    const hours = clampHours(Number(value));
    const entry = { ...this.todayEntry(), workedHours: hours };
    this.todayEntry.set(entry);
    this.todaySave$.next(entry);
  }

  // ----- Modal de edição do dia -----

  open(cell: Cell): void {
    if (!cell.inMonth) return;
    const e = cell.date === this.today ? this.todayEntry() : cell.entry;
    this.editing.set({
      date: cell.date,
      workedHours: e?.workedHours ?? 0,
      plannedHours: e?.plannedHours ?? 0,
      meetingHours: e?.meetingHours ?? 0,
      note: e?.note ?? '',
      tickets: (e?.tickets ?? []).map(t => ({ number: t.number, name: t.name ?? '', hours: t.hours })),
    });
    this.editError.set('');
  }

  // ----- Chamados do dia -----

  addTicket(): void {
    this.editing()?.tickets.push({ number: '', name: '', hours: 0 });
  }

  /** As horas do chamado entram (ou saem) das horas trabalhadas do dia pela diferença. */
  setTicketHours(t: TicketRow, value: number | string): void {
    const e = this.editing();
    if (!e) return;
    const hours = clampHours(Number(value));
    e.workedHours = clampHours(e.workedHours + hours - t.hours);
    t.hours = hours;
  }

  removeTicket(index: number): void {
    const e = this.editing();
    if (!e) return;
    const [removed] = e.tickets.splice(index, 1);
    e.workedHours = clampHours(e.workedHours - removed.hours);
  }

  ticketsTotal(e: EditState): number {
    return round2(e.tickets.reduce((sum, t) => sum + t.hours, 0));
  }

  // ----- Abertura: duplo clique no mouse, toque longo no celular -----

  private pressTimer?: ReturnType<typeof setTimeout>;
  private pressOrigin = { x: 0, y: 0 };
  private lastPointerType = 'mouse';

  onDblClick(cell: Cell): void {
    // No toque, o duplo toque não abre o modal; quem abre é o toque longo.
    if (this.lastPointerType !== 'touch') this.open(cell);
  }

  onPointerDown(event: PointerEvent, cell: Cell): void {
    this.lastPointerType = event.pointerType;
    if (event.pointerType !== 'touch' || !cell.inMonth) return;
    this.pressOrigin = { x: event.clientX, y: event.clientY };
    this.cancelPress();
    this.pressTimer = setTimeout(() => {
      this.pressTimer = undefined;
      navigator.vibrate?.(15);
      this.open(cell);
    }, LONG_PRESS_MS);
  }

  onPointerMove(event: PointerEvent): void {
    // Arrastar (rolar a página) cancela o toque longo.
    if (this.pressTimer && Math.hypot(event.clientX - this.pressOrigin.x, event.clientY - this.pressOrigin.y) > 10) {
      this.cancelPress();
    }
  }

  cancelPress(): void {
    clearTimeout(this.pressTimer);
    this.pressTimer = undefined;
  }

  stepEdit(field: 'workedHours' | 'plannedHours' | 'meetingHours', direction: 1 | -1): void {
    const e = this.editing();
    if (e) e[field] = clampHours(e[field] + direction * this.step());
  }

  save(clear = false): void {
    const e = this.editing();
    if (!e) return;
    // Linhas totalmente vazias são ignoradas; com nome ou horas, o número é obrigatório.
    const rows = e.tickets.filter(t => t.number.trim() || t.name.trim() || t.hours > 0);
    if (!clear && rows.some(t => !t.number.trim())) {
      this.editError.set('Informe o número de todos os chamados (ou remova a linha).');
      return;
    }
    const tickets: Ticket[] = rows.map(t => ({ number: t.number.trim(), name: t.name.trim() || null, hours: t.hours }));
    if (!clear && clampHours(e.workedHours) + clampHours(e.meetingHours) > 24) {
      this.editError.set('Horas trabalhadas + reunião/treinamento não podem passar de 24h no dia.');
      return;
    }
    const data = clear
      ? { workedHours: 0, plannedHours: 0, meetingHours: 0, note: null, tickets: [] }
      : { workedHours: clampHours(e.workedHours), plannedHours: clampHours(e.plannedHours),
          meetingHours: clampHours(e.meetingHours), note: e.note || null, tickets };
    this.editError.set('');
    this.saving.set(true);
    this.api.saveDay(e.date, data).subscribe({
      next: saved => {
        this.saving.set(false);
        this.editing.set(null);
        if (saved.date === this.today) this.todayEntry.set(saved);
        this.afterSave(saved);
      },
      error: err => {
        this.saving.set(false);
        this.editError.set(errorMessage(err));
      },
    });
  }

  editTitle(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR',
      { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  // ----- Planejamento do mês -----

  applyPlan(overwrite: boolean): void {
    this.api.applyPlan(this.month(), overwrite).subscribe({
      next: () => {
        this.planOpen.set(false);
        this.api.day(this.today).subscribe(e => this.todayEntry.set(e));
        this.load();
      },
      error: err => this.error.set(errorMessage(err)),
    });
  }

  @HostListener('document:keydown.escape')
  closeModals(): void {
    this.editing.set(null);
    this.planOpen.set(false);
  }

  /** Parte rateada das horas avulsas no dia (soma nas feitas e nas pretendidas do dia). */
  extraOf(date: string): number {
    return this.summary()?.extraByDate?.[date] ?? 0;
  }

  /** Progresso do dia contra o pretendido (chamados + reuniões + avulsas rateadas). */
  progress(e: Entry | undefined, date: string): number {
    const extra = this.extraOf(date);
    const done = (e ? e.workedHours + e.meetingHours : 0) + extra;
    const planned = (e?.plannedHours ?? 0) + extra;
    if (planned <= 0) return done > 0 ? 100 : 0;
    return Math.min(100, (done / planned) * 100);
  }

  dayDone(e: Entry | undefined, date: string): boolean {
    const extra = this.extraOf(date);
    const planned = (e?.plannedHours ?? 0) + extra;
    return planned > 0 && (e ? e.workedHours + e.meetingHours : 0) + extra >= planned;
  }

  /** Recarrega só o resumo (ex.: após alterar horas avulsas). */
  reloadSummary(): void {
    this.api.summary(this.month()).subscribe(s => this.summary.set(s));
  }

  ticketTitle(e?: Entry): string {
    return (e?.tickets ?? [])
      .map(t => `#${t.number}${t.name ? ' ' + t.name : ''} (${String(t.hours).replace('.', ',')}h)`)
      .join('\n');
  }

  private afterSave(saved: Entry): void {
    if (saved.date.startsWith(this.month())) {
      const map = new Map(this.entries());
      map.set(saved.date, saved);
      this.entries.set(map);
    }
    this.api.summary(this.month()).subscribe(s => this.summary.set(s));
  }
}

const LONG_PRESS_MS = 500;

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function clampHours(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return round2(Math.min(24, Math.max(0, value)));
}
