import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DepotService } from '../services/depot.service';
import { Depot } from '../../../models/depot.model';

@Component({
  selector: 'app-depot-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './depot-list.component.html',
  styleUrl: './depot-list.component.scss',
})
export class DepotListComponent implements OnInit, OnDestroy {
  depots: Depot[] = [];
  totalCount = 0;
  isLoading = false;
  sortBy = 'name';
  sortOrder = 'asc';
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly depotService: DepotService) {}

  ngOnInit(): void { this.loadDepots(); }

  loadDepots(): void {
    this.isLoading = true;
    this.depotService
      .getAll(1, 100, this.sortBy, this.sortOrder)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.depots = response.data.items;
          this.totalCount = response.data.total;
          this.isLoading = false;
        },
        error: () => { this.isLoading = false; },
      });
  }

  onSort(column: string): void {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'asc';
    }
    this.loadDepots();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
