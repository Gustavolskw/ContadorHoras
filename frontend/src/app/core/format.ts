import { Pipe, PipeTransform } from '@angular/core';

const hoursFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const moneyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

@Pipe({ name: 'hours' })
export class HoursPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return `${hoursFmt.format(value ?? 0)}h`;
  }
}

@Pipe({ name: 'brl' })
export class BrlPipe implements PipeTransform {
  transform(value: number | null | undefined, hidden = false): string {
    return hidden ? 'R$ ••••' : moneyFmt.format(value ?? 0);
  }
}

/** Data local no formato AAAA-MM-DD (sem conversão para UTC). */
export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function isoMonth(d: Date): string {
  return isoDate(d).slice(0, 7);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
