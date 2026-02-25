import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccessResponse } from '../../../models/api-response.model';
import { CitySearchResult, GeocodingResult } from '../../../models/depot.model';

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly baseUrl = `${environment.apiUrl}/geocoding`;

  constructor(private readonly httpClient: HttpClient) {}

  searchCities(query: string, country?: string): Observable<ApiSuccessResponse<CitySearchResult[]>> {
    let params = new HttpParams().set('q', query);
    if (country) {
      params = params.set('country', country);
    }
    return this.httpClient.get<ApiSuccessResponse<CitySearchResult[]>>(
      `${this.baseUrl}/cities`,
      { params },
    );
  }

  geocodeAddress(query: string, city?: string): Observable<ApiSuccessResponse<GeocodingResult[]>> {
    let params = new HttpParams().set('q', query);
    if (city) {
      params = params.set('city', city);
    }
    return this.httpClient.get<ApiSuccessResponse<GeocodingResult[]>>(
      `${this.baseUrl}/address`,
      { params },
    );
  }
}
