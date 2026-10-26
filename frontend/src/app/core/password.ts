/** Mesmas regras de backend/.../auth/PasswordPolicy.java — manter as duas em sincronia. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 100;

export interface PasswordRule {
  label: string;
  ok: boolean;
}

export function passwordRules(password: string, username = ''): PasswordRule[] {
  const pwd = password ?? '';
  const user = username.trim().toLowerCase();
  return [
    { label: `Entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres`, ok: pwd.length >= PASSWORD_MIN && pwd.length <= PASSWORD_MAX },
    { label: 'Letra maiúscula', ok: /\p{Lu}/u.test(pwd) },
    { label: 'Letra minúscula', ok: /\p{Ll}/u.test(pwd) },
    { label: 'Número', ok: /\p{Nd}/u.test(pwd) },
    { label: 'Caractere especial (ex.: ! @ # $ %)', ok: /[^\p{L}\p{Nd}\s]/u.test(pwd) },
    { label: 'Sem espaços', ok: !/\s/u.test(pwd) },
    { label: 'Não contém o nome de usuário', ok: user.length < 3 || !pwd.toLowerCase().includes(user) },
  ];
}

export function passwordValid(password: string, username = ''): boolean {
  return passwordRules(password, username).every(r => r.ok);
}
