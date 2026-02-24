import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { RouteService } from '../services/route.service';
import { Route } from '../../../models/route.model';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-route-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './route-list.component.html',
  styleUrl: './route-list.component.scss',
})
export class RouteListComponent implements OnInit, OnDestroy {
  routes: Route[] = [];
  totalCount = 0;
  currentPage = 1;
  pageSize = PAGE_SIZE;
  sortBy = 'routeDate';
  sortOrder = 'desc';
  statusFilter = '';
  isLoading = false;
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly routeService: RouteService) {}

  ngOnInit(): void {
    this.loadRoutes();
  }

  loadRoutes(): void {
    this.isLoading = true;
    this.routeService
      .getAll(this.currentPage, this.pageSize, this.sortBy, this.sortOrder, this.statusFilter || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.routes = response.data.items;
          this.totalCount = response.data.total;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  onSort(column: string): void {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'asc';
    }
    this.loadRoutes();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadRoutes();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadRoutes();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
