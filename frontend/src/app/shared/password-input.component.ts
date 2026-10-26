import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { EyeIconComponent } from './eye-icon.component';

/** Campo de senha com botão de mostrar/ocultar. Funciona com [(ngModel)]. */
@Component({
  selector: 'app-password-input',
  imports: [EyeIconComponent],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PasswordInputComponent), multi: true }],
  template: `
    <div class="pwd">
      <input [id]="inputId()" [type]="visible() ? 'text' : 'password'" [value]="value()"
             [attr.autocomplete]="autocomplete()" [attr.aria-invalid]="invalid() || null"
             [disabled]="disabled()" spellcheck="false" autocapitalize="off"
             (input)="onInput($event)" (blur)="onTouched()">
      <button type="button" class="eye" (click)="visible.set(!visible())"
              [attr.aria-label]="visible() ? 'Ocultar senha' : 'Mostrar senha'"
              [attr.aria-pressed]="visible()" [title]="visible() ? 'Ocultar senha' : 'Mostrar senha'">
        <app-eye-icon [open]="visible()" />
      </button>
    </div>
  `,
  styles: `
    .pwd { position: relative; }
    .pwd input { padding-right: 42px; }
    .pwd input[aria-invalid] { border-color: var(--danger); }
    .eye {
      position: absolute; top: 0; right: 0; height: 100%; width: 40px;
      display: flex; align-items: center; justify-content: center;
      background: none; border: 0; color: var(--muted); cursor: pointer; border-radius: 0 8px 8px 0;
    }
    .eye:hover { color: var(--text); }
    .eye:focus-visible { outline: 2px solid var(--accent); }
  `,
})
export class PasswordInputComponent implements ControlValueAccessor {
  inputId = input<string>('');
  autocomplete = input<string>('current-password');
  invalid = input(false);

  value = signal('');
  visible = signal(false);
  disabled = signal(false);

  private onChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};

  onInput(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.value.set(v);
    this.onChange(v);
  }

  writeValue(v: string | null): void {
    this.value.set(v ?? '');
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }
}
