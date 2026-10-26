import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { LoginComponent } from './pages/login.component';
import { RecoverComponent } from './pages/recover.component';
import { RegisterComponent } from './pages/register.component';
import { SettingsComponent } from './pages/settings.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'cadastro', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'recuperar-senha', component: RecoverComponent, canActivate: [guestGuard] },
  { path: '', component: CalendarComponent, canActivate: [authGuard] },
  { path: 'configuracoes', component: SettingsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
