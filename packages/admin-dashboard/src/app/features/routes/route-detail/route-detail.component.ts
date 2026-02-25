import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RouteService } from '../services/route.service';
import { RouteWithDetails } from '../../../models/route.model';
import { RouteMapComponent } from './route-map/route-map.component';

@Component({
  selector: 'app-route-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, RouteMapComponent],
  templateUrl: './route-detail.component.html',
  styleUrl: './route-detail.component.scss',
})
export class RouteDetailComponent implements OnInit, OnDestroy {
  routeData: RouteWithDetails | null = null;
  isLoading = true;
  actionMessage = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly routeService: RouteService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.activatedRoute.snapshot.paramMap.get('id')!;
    this.loadRoute(id);
  }

  loadRoute(id: string): void {
    this.routeService
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.routeData = response.data;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  approveRoute(): void {
    if (!this.routeData || !confirm('Are you sure you want to approve this route?')) {
      return;
    }
    this.routeService
      .approve(this.routeData.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.routeData = response.data;
          this.actionMessage = 'Route approved successfully';
        },
        error: (error) => {
          this.actionMessage = error.error?.error || 'Failed to approve route';
        },
      });
  }

  rejectRoute(): void {
    if (!this.routeData) {
      return;
    }
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) {
      return;
    }
    this.routeService
      .reject(this.routeData.id, reason || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.routeData = response.data;
          this.actionMessage = 'Route rejected';
        },
        error: (error) => {
          this.actionMessage = error.error?.error || 'Failed to reject route';
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
