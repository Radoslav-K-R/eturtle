import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PackageService } from '../services/package.service';

@Component({
  selector: 'app-package-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './package-form.component.html',
  styleUrl: './package-form.component.scss',
})
export class PackageFormComponent implements OnDestroy {
  packageForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly packageService: PackageService,
    private readonly router: Router,
  ) {
    this.packageForm = this.formBuilder.group({
      originAddress: ['', [Validators.required, Validators.maxLength(500)]],
      destinationAddress: ['', [Validators.required, Validators.maxLength(500)]],
      weightKg: [null, [Validators.required, Validators.min(0.01)]],
      lengthCm: [null, [Validators.required, Validators.min(0.01)]],
      widthCm: [null, [Validators.required, Validators.min(0.01)]],
      heightCm: [null, [Validators.required, Validators.min(0.01)]],
      contentsDescription: [''],
    });
  }

  onSubmit(): void {
    if (this.packageForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.packageService
      .create(this.packageForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.router.navigate(['/packages', response.data.id]);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.errorMessage = error.error?.error || 'Failed to create package';
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
