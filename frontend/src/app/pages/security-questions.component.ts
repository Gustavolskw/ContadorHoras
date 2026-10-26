import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuestionAnswer, SUGGESTED_QUESTIONS } from '../core/models';

/** Bloco reutilizado no cadastro e nas configurações para definir as 3 perguntas de segurança. */
@Component({
  selector: 'app-security-questions',
  imports: [FormsModule],
  template: `
    <datalist id="suggested-questions">
      @for (q of suggestions; track q) { <option [value]="q"></option> }
    </datalist>
    @for (item of items(); track $index; let i = $index) {
      <div class="field">
        <label [for]="'q' + i">Pergunta {{ i + 1 }}</label>
        <input [id]="'q' + i" [name]="'q' + i" list="suggested-questions" [(ngModel)]="item.question"
               placeholder="Escolha uma sugestão ou escreva a sua" required>
        <input [name]="'a' + i" [(ngModel)]="item.answer" placeholder="Resposta" required
               style="margin-top: 6px" [attr.aria-label]="'Resposta da pergunta ' + (i + 1)">
      </div>
    }
    <p class="hint">As respostas não diferenciam maiúsculas, acentos ou espaços extras.</p>
  `,
})
export class SecurityQuestionsComponent {
  items = input.required<QuestionAnswer[]>();
  suggestions = SUGGESTED_QUESTIONS;
}

export function emptyQuestions(): QuestionAnswer[] {
  return [0, 1, 2].map(() => ({ question: '', answer: '' }));
}

export function questionsValid(items: QuestionAnswer[]): boolean {
  const filled = items.every(i => i.question.trim() && i.answer.trim().length >= 2);
  const distinct = new Set(items.map(i => i.question.trim().toLowerCase())).size === items.length;
  return filled && distinct;
}
