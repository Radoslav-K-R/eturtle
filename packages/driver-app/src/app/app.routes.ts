import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/tabs/home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'tabs',
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'packages',
        loadComponent: () =>
          import('./pages/packages/package-list.page').then((m) => m.PackageListPage),
      },
      {
        path: 'packages/:id',
        loadComponent: () =>
          import('./pages/package-detail/package-detail.page').then((m) => m.PackageDetailPage),
      },
      {
        path: 'history',
        loadComponent: () => import('./pages/history/history.page').then((m) => m.HistoryPage),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
];
