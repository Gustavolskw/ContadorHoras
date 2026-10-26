import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      // Sessão expirada: volta para o login (exceto na própria tela de login).
      if (err.status === 401 && token && !req.url.startsWith('/api/auth/')) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};

/** Extrai a mensagem de erro amigável enviada pelo backend. */
export function errorMessage(err: unknown, fallback = 'Não foi possível concluir a operação.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Servidor indisponível.';
    return err.error?.message ?? fallback;
  }
  return fallback;
}
