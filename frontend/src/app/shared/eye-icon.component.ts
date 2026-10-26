import { Component, input } from '@angular/core';

/** Ícone de olho aberto (conteúdo visível) ou riscado (conteúdo oculto). */
@Component({
  selector: 'app-eye-icon',
  template: `
    @if (open()) {
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.8 9.8 0 0112 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.6 6.6C4.4 8 2.8 10.2 2 12c1 2.5 5 7 10 7 1.8 0 3.4-.6 4.8-1.4"/>
      </svg>
    } @else {
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    }
  `,
  styles: `
    :host { display: inline-flex; }
    svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  `,
})
export class EyeIconComponent {
  /** true = conteúdo está visível (mostra o ícone de "ocultar"). */
  open = input(false);
}
