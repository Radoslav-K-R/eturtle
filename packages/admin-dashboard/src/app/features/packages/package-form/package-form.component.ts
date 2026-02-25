import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PackageService } from '../services/package.service';
import { GeocodingService } from '../../depots/services/geocoding.service';
import { DepotService } from '../../depots/services/depot.service';
import { CityAutocompleteComponent } from '../../../shared/components/city-autocomplete/city-autocomplete.component';
import { CitySearchResult, DepotWithDistance } from '../../../models/depot.model';

@Component({
  selector: 'app-package-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, CityAutocompleteComponent],
  templateUrl: './package-form.component.html',
  styleUrl: './package-form.component.scss',
})
export class PackageFormComponent implements OnDestroy {
  packageForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  originGeocoding = false;
  destinationGeocoding = false;
  originNearest: DepotWithDistance | null = null;
  destinationNearest: DepotWithDistance | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly packageService: PackageService,
    private readonly geocodingService: GeocodingService,
    private readonly depotService: DepotService,
    private readonly router: Router,
  ) {
    this.packageForm = this.formBuilder.group({
      originCity: [''],
      originAddress: ['', [Validators.required, Validators.maxLength(500)]],
      originLatitude: [null, [Validators.min(-90), Validators.max(90)]],
      originLongitude: [null, [Validators.min(-180), Validators.max(180)]],
      destinationCity: [''],
      destinationAddress: ['', [Validators.required, Validators.maxLength(500)]],
      destinationLatitude: [null, [Validators.min(-90), Validators.max(90)]],
      destinationLongitude: [null, [Validators.min(-180), Validators.max(180)]],
      weightKg: [null, [Validators.required, Validators.min(0.01)]],
      lengthCm: [null, [Validators.required, Validators.min(0.01)]],
      widthCm: [null, [Validators.required, Validators.min(0.01)]],
      heightCm: [null, [Validators.required, Validators.min(0.01)]],
      contentsDescription: [''],
    });
  }

  onOriginCitySelected(city: CitySearchResult): void {
    this.packageForm.patchValue({
      originLatitude: city.latitude,
      originLongitude: city.longitude,
    });
    this.lookupNearest('origin', city.latitude, city.longitude);
  }

  onDestinationCitySelected(city: CitySearchResult): void {
    this.packageForm.patchValue({
      destinationLatitude: city.latitude,
      destinationLongitude: city.longitude,
    });
    this.lookupNearest('destination', city.latitude, city.longitude);
  }

  onOriginAddressBlur(): void {
    this.geocodeAndResolve('origin');
  }

  onDestinationAddressBlur(): void {
    this.geocodeAndResolve('destination');
  }

  private geocodeAndResolve(prefix: 'origin' | 'destination'): void {
    const address = this.packageForm.get(`${prefix}Address`)?.value;
    const city = this.packageForm.get(`${prefix}City`)?.value;
    if (!address || address.length < 2) return;

    if (prefix === 'origin') {
      this.originGeocoding = true;
    } else {
      this.destinationGeocoding = true;
    }

    this.geocodingService.geocodeAddress(address, city)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (prefix === 'origin') {
            this.originGeocoding = false;
          } else {
            this.destinationGeocoding = false;
          }
          if (response.data.length > 0) {
            const result = response.data[0];
            this.packageForm.patchValue({
              [`${prefix}Latitude`]: result.latitude,
              [`${prefix}Longitude`]: result.longitude,
            });
            this.lookupNearest(prefix, result.latitude, result.longitude);
          }
        },
        error: () => {
          if (prefix === 'origin') {
            this.originGeocoding = false;
          } else {
            this.destinationGeocoding = false;
          }
        },
      });
  }

  private lookupNearest(prefix: 'origin' | 'destination', lat: number, lng: number): void {
    this.depotService.findNearest(lat, lng, undefined, 1)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const nearest = response.data.length > 0 ? response.data[0] : null;
          if (prefix === 'origin') {
            this.originNearest = nearest;
          } else {
            this.destinationNearest = nearest;
          }
        },
        error: () => {},
      });
  }

  get originLat(): number | null {
    return this.packageForm.get('originLatitude')?.value;
  }

  get originLng(): number | null {
    return this.packageForm.get('originLongitude')?.value;
  }

  get destLat(): number | null {
    return this.packageForm.get('destinationLatitude')?.value;
  }

  get destLng(): number | null {
    return this.packageForm.get('destinationLongitude')?.value;
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
