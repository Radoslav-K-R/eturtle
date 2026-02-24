import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../services/user.service';
import { VehicleService } from '../../vehicles/services/vehicle.service';
import { Vehicle } from '../../../models/vehicle.model';

const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
})
export class UserFormComponent implements OnInit, OnDestroy {
  userForm: FormGroup;
  vehicles: Vehicle[] = [];
  isSubmitting = false;
  errorMessage = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly userService: UserService,
    private readonly vehicleService: VehicleService,
    private readonly router: Router,
  ) {
    this.userForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      fullName: ['', [Validators.required, Validators.maxLength(255)]],
      role: ['driver', [Validators.required]],
      vehicleId: [''],
    });
  }

  ngOnInit(): void {
    this.vehicleService.getAll(1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.vehicles = response.data.items.filter(
            (vehicle) => !vehicle.assignedDriver,
          );
        },
      });
  }

  onSubmit(): void {
    if (this.userForm.invalid) { return; }
    this.isSubmitting = true;
    const data = { ...this.userForm.value };
    if (!data.vehicleId) { delete data.vehicleId; }

    this.userService.create(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.router.navigate(['/users']); },
        error: (error) => {
          this.isSubmitting = false;
          this.errorMessage = error.error?.error || 'Failed to create user';
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
