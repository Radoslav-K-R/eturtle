import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { VehicleService } from '../services/vehicle.service';
import { DepotService } from '../../depots/services/depot.service';
import { Depot } from '../../../models/depot.model';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './vehicle-form.component.html',
  styleUrl: './vehicle-form.component.scss',
})
export class VehicleFormComponent implements OnInit, OnDestroy {
  vehicleForm: FormGroup;
  depots: Depot[] = [];
  isSubmitting = false;
  isEditMode = false;
  vehicleId = '';
  errorMessage = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly vehicleService: VehicleService,
    private readonly depotService: DepotService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    this.vehicleForm = this.formBuilder.group({
      licensePlate: ['', [Validators.required, Validators.maxLength(20)]],
      type: ['van', [Validators.required]],
      weightCapacityKg: [null, [Validators.required, Validators.min(0.01)]],
      volumeCapacityCbm: [null, [Validators.required, Validators.min(0.01)]],
      currentDepotId: [''],
    });
  }

  ngOnInit(): void {
    this.depotService.getAll(1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => { this.depots = response.data.items; },
      });

    this.vehicleId = this.route.snapshot.paramMap.get('id') || '';
    if (this.vehicleId) {
      this.isEditMode = true;
      this.vehicleService.getById(this.vehicleId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.vehicleForm.patchValue(response.data);
          },
        });
    }
  }

  onSubmit(): void {
    if (this.vehicleForm.invalid) { return; }
    this.isSubmitting = true;

    const data = this.vehicleForm.value;
    const operation = this.isEditMode
      ? this.vehicleService.update(this.vehicleId, data)
      : this.vehicleService.create(data);

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.router.navigate(['/vehicles']); },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.error || 'Failed to save vehicle';
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
