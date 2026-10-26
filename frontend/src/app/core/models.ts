export type CalcMode = 'SEMANAL' | 'MENSAL';
export type DayOfWeekKey = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export const WEEK_DAYS: { key: DayOfWeekKey; label: string; short: string }[] = [
  { key: 'MONDAY', label: 'Segunda', short: 'Seg' },
  { key: 'TUESDAY', label: 'Terça', short: 'Ter' },
  { key: 'WEDNESDAY', label: 'Quarta', short: 'Qua' },
  { key: 'THURSDAY', label: 'Quinta', short: 'Qui' },
  { key: 'FRIDAY', label: 'Sexta', short: 'Sex' },
  { key: 'SATURDAY', label: 'Sábado', short: 'Sáb' },
  { key: 'SUNDAY', label: 'Domingo', short: 'Dom' },
];

export const SUGGESTED_QUESTIONS = [
  'Qual o nome do seu primeiro animal de estimação?',
  'Em que cidade você nasceu?',
  'Qual o nome da sua primeira escola?',
  'Qual o nome de solteira da sua mãe?',
  'Qual era o seu apelido de infância?',
  'Qual o modelo do seu primeiro carro?',
  'Qual o nome do seu melhor amigo de infância?',
];

export interface Ticket {
  number: string;
  name: string | null;
  hours: number;
}

export interface Entry {
  date: string;
  workedHours: number;
  plannedHours: number;
  /** Reunião/treinamento: entra no valor (R$), não no saldo de horas. */
  meetingHours: number;
  note: string | null;
  tickets: Ticket[];
}

export type ExtraDistribution = 'NONE' | 'WORKDAYS' | 'PLAN';
export type ExtraScope = 'MONTH' | 'WEEK';

/** Horas avulsas do mês: entram nas feitas, nas pretendidas, no saldo e no valor. */
export interface ExtraHours {
  id: string;
  month: string;
  description: string;
  hours: number;
  distribution: ExtraDistribution;
  scope: ExtraScope | null;
  week: number | null;
  /** Rateio por dia (AAAA-MM-DD -> horas); vazio sem rateio. */
  allocation: Record<string, number>;
}

export interface ExtraRequest {
  month: string;
  description: string;
  hours: number;
  distribution: ExtraDistribution;
  scope: ExtraScope | null;
  week: number | null;
}

export interface WeekSummary {
  number: number;
  start: string;
  end: string;
  /** Inclui a parte rateada das horas avulsas. */
  workedHours: number;
  plannedHours: number;
  meetingHours: number;
  extraHours: number;
  workedValue: number;
  plannedValue: number;
}

export interface MonthSummary {
  month: string;
  hourlyRate: number;
  calcMode: CalcMode;
  weeks: WeekSummary[];
  workedHours: number;
  plannedHours: number;
  meetingHours: number;
  /** Horas avulsas do mês (já incluídas em workedHours e plannedHours). */
  extraHours: number;
  remainingHours: number;
  workedValue: number;
  plannedValue: number;
  previousTotal: number;
  currentBalance: number;
  overallTotal: number;
  /** Parte rateada das horas avulsas por dia. */
  extraByDate: Record<string, number>;
}

export interface Settings {
  hourlyRate: number;
  calcMode: CalcMode;
  initialBalance: number;
  counterStep: number;
  defaultPlanned: Record<DayOfWeekKey, number>;
}

export interface QuestionAnswer {
  question: string;
  answer: string;
}
