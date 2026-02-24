import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { VehicleService } from '../services/vehicle.service';
import { Vehicle } from '../../../models/vehicle.model';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './vehicle-list.component.html',
  styleUrl: './vehicle-list.component.scss',
})
export class VehicleListComponent implements OnInit, OnDestroy {
  vehicles: Vehicle[] = [];
  totalCount = 0;
  currentPage = 1;
  pageSize = PAGE_SIZE;
  sortBy = 'licensePlate';
  sortOrder = 'asc';
  typeFilter = '';
  isLoading = false;
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly vehicleService: VehicleService) {}

  ngOnInit(): void {
    this.loadVehicles();
  }

  loadVehicles(): void {
    this.isLoading = true;
    this.vehicleService
      .getAll(this.currentPage, this.pageSize, this.sortBy, this.sortOrder, this.typeFilter || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.vehicles = response.data.items;
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
    this.loadVehicles();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadVehicles();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
