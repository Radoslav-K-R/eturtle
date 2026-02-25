import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DepotService } from '../services/depot.service';
import { GeocodingService } from '../services/geocoding.service';
import { CityAutocompleteComponent } from '../../../shared/components/city-autocomplete/city-autocomplete.component';
import { CitySearchResult, DepotType } from '../../../models/depot.model';

@Component({
  selector: 'app-depot-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, CityAutocompleteComponent],
  templateUrl: './depot-form.component.html',
  styleUrl: './depot-form.component.scss',
})
export class DepotFormComponent implements OnDestroy {
  depotForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  isGeocoding = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly depotService: DepotService,
    private readonly geocodingService: GeocodingService,
    private readonly router: Router,
  ) {
    this.depotForm = this.formBuilder.group({
      type: ['depot' as DepotType, [Validators.required]],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      city: [''],
      address: ['', [Validators.required, Validators.maxLength(500)]],
      latitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
    });
  }

  onCitySelected(city: CitySearchResult): void {
    this.depotForm.patchValue({
      latitude: city.latitude,
      longitude: city.longitude,
    });
  }

  onAddressBlur(): void {
    const address = this.depotForm.get('address')?.value;
    const city = this.depotForm.get('city')?.value;
    if (!address || address.length < 2) { return; }

    this.isGeocoding = true;
    this.geocodingService.geocodeAddress(address, city)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isGeocoding = false;
          if (response.data.length > 0) {
            const result = response.data[0];
            this.depotForm.patchValue({
              latitude: result.latitude,
              longitude: result.longitude,
            });
          }
        },
        error: () => { this.isGeocoding = false; },
      });
  }

  onSubmit(): void {
    if (this.depotForm.invalid) { return; }
    this.isSubmitting = true;

    const formValue = this.depotForm.value;
    const request = {
      name: formValue.name,
      address: formValue.address,
      latitude: formValue.latitude,
      longitude: formValue.longitude,
      type: formValue.type,
      city: formValue.city || undefined,
    };

    this.depotService.create(request)
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
