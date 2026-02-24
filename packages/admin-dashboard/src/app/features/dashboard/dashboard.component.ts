import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, interval, switchMap, startWith } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccessResponse } from '../../models/api-response.model';
import { DashboardStats } from '../../models/dashboard.model';

const REFRESH_INTERVAL_MS = 30000;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: DashboardStats | null = null;
  isLoading = true;
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly httpClient: HttpClient) {}

  ngOnInit(): void {
    interval(REFRESH_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.httpClient.get<ApiSuccessResponse<DashboardStats>>(
            `${environment.apiUrl}/dashboard/stats`,
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.stats = response.data;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
