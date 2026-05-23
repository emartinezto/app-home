import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { householdGuard } from './core/guards/household.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const appRoutes: Routes = [
  // Auth
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'signup',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./features/auth/signup.component').then(m => m.SignupComponent)
  },
  {
    path: 'join',
    loadComponent: () => import('./features/auth/join.component').then(m => m.JoinComponent)
  },

  // Onboarding (requiere auth pero NO household)
  {
    path: 'onboarding',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () => import('./features/onboarding/home.component').then(m => m.OnboardingHomeComponent)
      },
      {
        path: 'invite',
        loadComponent: () => import('./features/onboarding/invite.component').then(m => m.OnboardingInviteComponent)
      },
      {
        path: 'schedule',
        loadComponent: () => import('./features/onboarding/schedule.component').then(m => m.OnboardingScheduleComponent)
      },
      {
        path: 'tasks',
        loadComponent: () => import('./features/onboarding/tasks.component').then(m => m.OnboardingTasksComponent)
      },
      {
        path: 'weights',
        loadComponent: () => import('./features/onboarding/weights.component').then(m => m.OnboardingWeightsComponent)
      }
    ]
  },

  // App principal (requiere auth + household)
  {
    path: '',
    canActivate: [authGuard, householdGuard],
    loadComponent: () => import('./layouts/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'week', loadComponent: () => import('./features/week/week.component').then(m => m.WeekComponent) },
      { path: 'availability', loadComponent: () => import('./features/availability/availability.component').then(m => m.AvailabilityComponent) },
      { path: 'proposal', loadComponent: () => import('./features/proposal/proposal.component').then(m => m.ProposalComponent) },
      { path: 'reassign/:assignmentId', loadComponent: () => import('./features/reassignment/reassign-outgoing.component').then(m => m.ReassignOutgoingComponent) },
      { path: 'reassign/incoming/:requestId', loadComponent: () => import('./features/reassignment/reassign-incoming.component').then(m => m.ReassignIncomingComponent) },
      { path: 'notifications', loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent) },
      { path: 'load', loadComponent: () => import('./features/stats/load.component').then(m => m.LoadComponent) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) }
    ]
  },

  { path: '**', redirectTo: '' }
];
