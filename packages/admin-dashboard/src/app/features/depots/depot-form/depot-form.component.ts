import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DepotService } from '../services/depot.service';

@Component({
  selector: 'app-depot-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './depot-form.component.html',
  styleUrl: './depot-form.component.scss',
})
export class DepotFormComponent implements OnDestroy {
  depotForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly depotService: DepotService,
    private readonly router: Router,
  ) {
    this.depotForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      address: ['', [Validators.required, Validators.maxLength(500)]],
      latitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
    });
  }

  onSubmit(): void {
    if (this.depotForm.invalid) { return; }
    this.isSubmitting = true;
    this.depotService.create(this.depotForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.router.navigate(['/depots']); },
        error: (error) => {
          this.isSubmitting = false;
          this.errorMessage = error.error?.error || 'Failed to create depot';
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
