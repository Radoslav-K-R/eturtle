import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccessResponse } from '../../models/api-response.model';
import { LoginRequest, LoginResponse } from '../../models/user.model';

const TOKEN_STORAGE_KEY = 'eturtle_token';
const USER_STORAGE_KEY = 'eturtle_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private readonly httpClient: HttpClient,
    private readonly router: Router,
  ) {}

  login(request: LoginRequest): Observable<ApiSuccessResponse<LoginResponse>> {
    return this.httpClient
      .post<ApiSuccessResponse<LoginResponse>>(
        `${environment.apiUrl}/auth/login`,
        request,
      )
      .pipe(
        tap((response) => {
          localStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.user));
          this.isAuthenticatedSubject.next(true);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  getCurrentUser(): LoginResponse['user'] | null {
    const userJson = localStorage.getItem(USER_STORAGE_KEY);
    if (!userJson) {
      return null;
    }
    return JSON.parse(userJson) as LoginResponse['user'];
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(TOKEN_STORAGE_KEY);
  }
}
