import { Component, EventEmitter, forwardRef, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Subject, of, debounceTime, distinctUntilChanged, filter, switchMap, catchError, takeUntil } from 'rxjs';
import { GeocodingService } from '../../../features/depots/services/geocoding.service';
import { CitySearchResult } from '../../../models/depot.model';

@Component({
  selector: 'app-city-autocomplete',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './city-autocomplete.component.html',
  styleUrl: './city-autocomplete.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CityAutocompleteComponent),
      multi: true,
    },
  ],
})
export class CityAutocompleteComponent implements ControlValueAccessor, OnDestroy {
  @Output() citySelected = new EventEmitter<CitySearchResult>();

  searchControl = new FormControl('');
  results: CitySearchResult[] = [];
  isOpen = false;
  isLoading = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly geocodingService: GeocodingService) {
    this.searchControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged(),
        filter((value): value is string => !!value && value.length >= 2),
        switchMap((value) => {
          this.isLoading = true;
          return this.geocodingService.searchCities(value).pipe(
            catchError(() => of({ data: [] as CitySearchResult[] })),
          );
        }),
      )
      .subscribe((response) => {
        this.results = response.data;
        this.isOpen = this.results.length > 0;
        this.isLoading = false;
      });
  }

  selectCity(city: CitySearchResult): void {
    this.searchControl.setValue(city.city, { emitEvent: false });
    this.onChange(city.city);
    this.isOpen = false;
    this.results = [];
    this.citySelected.emit(city);
  }

  onBlur(): void {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      this.isOpen = false;
      this.onTouched();
    }, 200);
  }

  writeValue(value: string): void {
    this.searchControl.setValue(value || '', { emitEvent: false });
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.searchControl.disable();
    } else {
      this.searchControl.enable();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
