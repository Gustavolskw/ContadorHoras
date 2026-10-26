import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.isLoggedIn()) {
      <header class="topbar">
        <span class="brand"><img src="favicon.svg" alt="" width="24" height="24">Contador de Horas</span>
        <nav>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Calendário</a>
          <a routerLink="/configuracoes" routerLinkActive="active">Configurações</a>
        </nav>
        <span class="user">
          {{ auth.username() }}
          <button class="btn ghost small" (click)="auth.logout()">Sair</button>
        </span>
      </header>
    }
    <main><router-outlet /></main>
  `,
  styles: `
    .topbar {
      display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
      padding: 12px 24px; background: var(--surface); border-bottom: 1px solid var(--border);
    }
    .brand { font-weight: 700; display: flex; align-items: center; gap: 8px; }
    nav { display: flex; gap: 4px; flex: 1; }
    nav a { padding: 6px 12px; border-radius: 6px; color: var(--muted); text-decoration: none; }
    nav a.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
    .user { display: flex; align-items: center; gap: 10px; color: var(--muted); }
    main { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
  `,
})
export class AppComponent {
  auth = inject(AuthService);
}
