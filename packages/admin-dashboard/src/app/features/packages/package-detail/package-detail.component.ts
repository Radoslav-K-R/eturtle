import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PackageService } from '../services/package.service';
import { PackageWithHistory } from '../../../models/package.model';

@Component({
  selector: 'app-package-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './package-detail.component.html',
  styleUrl: './package-detail.component.scss',
})
export class PackageDetailComponent implements OnInit, OnDestroy {
  packageData: PackageWithHistory | null = null;
  isLoading = true;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly packageService: PackageService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.packageService
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.packageData = response.data;
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
