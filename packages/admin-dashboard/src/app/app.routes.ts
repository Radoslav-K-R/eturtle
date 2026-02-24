import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'packages',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/packages/package-list/package-list.component').then(
            (m) => m.PackageListComponent,
          ),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/packages/package-form/package-form.component').then(
            (m) => m.PackageFormComponent,
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import(
            './features/packages/package-detail/package-detail.component'
          ).then((m) => m.PackageDetailComponent),
      },
    ],
  },
  {
    path: 'routes',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/routes/route-list/route-list.component').then(
            (m) => m.RouteListComponent,
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/routes/route-detail/route-detail.component').then(
            (m) => m.RouteDetailComponent,
          ),
      },
    ],
  },
  {
    path: 'vehicles',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import(
            './features/vehicles/vehicle-list/vehicle-list.component'
          ).then((m) => m.VehicleListComponent),
      },
      {
        path: 'new',
        loadComponent: () =>
          import(
            './features/vehicles/vehicle-form/vehicle-form.component'
          ).then((m) => m.VehicleFormComponent),
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import(
            './features/vehicles/vehicle-form/vehicle-form.component'
          ).then((m) => m.VehicleFormComponent),
      },
    ],
  },
  {
    path: 'depots',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/depots/depot-list/depot-list.component').then(
            (m) => m.DepotListComponent,
          ),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/depots/depot-form/depot-form.component').then(
            (m) => m.DepotFormComponent,
          ),
      },
    ],
  },
  {
    path: 'users',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/users/user-list/user-list.component').then(
            (m) => m.UserListComponent,
          ),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/users/user-form/user-form.component').then(
            (m) => m.UserFormComponent,
          ),
      },
    ],
  },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' },
];
