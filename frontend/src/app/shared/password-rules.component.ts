import { Component, computed, input } from '@angular/core';
import { passwordRules } from '../core/password';

/** Checklist ao vivo das regras de senha. */
@Component({
  selector: 'app-password-rules',
  template: `
    <ul class="rules" aria-live="polite">
      @for (r of rules(); track r.label) {
        <li [class.ok]="r.ok">
          <span aria-hidden="true">{{ r.ok ? '✓' : '•' }}</span> {{ r.label }}
          <span class="sr-only">{{ r.ok ? '(atendido)' : '(pendente)' }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    .rules { list-style: none; padding: 0; margin: 6px 0 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px; font-size: 12px; color: var(--muted); }
    .rules li.ok { color: var(--worked); }
    .rules span[aria-hidden] { display: inline-block; width: 12px; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    @media (max-width: 420px) { .rules { grid-template-columns: 1fr; } }
  `,
})
export class PasswordRulesComponent {
  password = input('');
  username = input('');
  rules = computed(() => passwordRules(this.password(), this.username()));
}
