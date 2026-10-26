import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Entry, MonthSummary, QuestionAnswer, Settings } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  monthEntries(month: string): Observable<Entry[]> {
    return this.http.get<Entry[]>('/api/entries', { params: { month } });
  }

  day(date: string): Observable<Entry> {
    return this.http.get<Entry>(`/api/entries/${date}`);
  }

  saveDay(date: string, data: Omit<Entry, 'date'>): Observable<Entry> {
    return this.http.put<Entry>(`/api/entries/${date}`, data);
  }

  applyPlan(month: string, overwrite: boolean): Observable<Entry[]> {
    return this.http.post<Entry[]>('/api/entries/plan', null, { params: { month, overwrite } });
  }

  summary(month: string): Observable<MonthSummary> {
    return this.http.get<MonthSummary>('/api/summary', { params: { month } });
  }

  settings(): Observable<Settings> {
    return this.http.get<Settings>('/api/settings');
  }

  saveSettings(s: Settings): Observable<Settings> {
    return this.http.put<Settings>('/api/settings', s);
  }

  account(): Observable<{ username: string; securityQuestions: string[] }> {
    return this.http.get<{ username: string; securityQuestions: string[] }>('/api/account');
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>('/api/account/password', { currentPassword, newPassword });
  }

  changeQuestions(currentPassword: string, securityQuestions: QuestionAnswer[]): Observable<void> {
    return this.http.put<void>('/api/account/security-questions', { currentPassword, securityQuestions });
  }
}
