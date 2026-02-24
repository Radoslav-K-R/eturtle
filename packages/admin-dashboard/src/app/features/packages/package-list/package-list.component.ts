import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { PackageService } from '../services/package.service';
import { Package } from '../../../models/package.model';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-package-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './package-list.component.html',
  styleUrl: './package-list.component.scss',
})
export class PackageListComponent implements OnInit, OnDestroy {
  packages: Package[] = [];
  totalCount = 0;
  currentPage = 1;
  pageSize = PAGE_SIZE;
  sortBy = 'createdAt';
  sortOrder = 'desc';
  statusFilter = '';
  isLoading = false;
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly packageService: PackageService) {}

  ngOnInit(): void {
    this.loadPackages();
  }

  loadPackages(): void {
    this.isLoading = true;
    this.packageService
      .getAll(this.currentPage, this.pageSize, this.sortBy, this.sortOrder, this.statusFilter || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.packages = response.data.items;
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
    this.loadPackages();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadPackages();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadPackages();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
