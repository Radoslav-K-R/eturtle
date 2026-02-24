import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { DriverRoute, RoutePackage } from '../../models/route.model';
import { DeliveryConfirmation, DeliveryRecord } from '../../models/delivery.model';

@Injectable({ providedIn: 'root' })
export class DriverService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getTodayRoute(): Observable<DriverRoute> {
    return this.http
      .get<ApiResponse<DriverRoute>>(`${this.apiUrl}/driver/today-route`)
      .pipe(map((r) => r.data));
  }

  getPackageDetail(packageId: string): Observable<RoutePackage> {
    return this.http
      .get<ApiResponse<RoutePackage>>(`${this.apiUrl}/driver/packages/${packageId}`)
      .pipe(map((r) => r.data));
  }

  confirmDelivery(packageId: string, confirmation: DeliveryConfirmation): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.apiUrl}/driver/packages/${packageId}/deliver`, confirmation)
      .pipe(map((r) => r.data));
  }

  getDeliveryHistory(): Observable<DeliveryRecord[]> {
    return this.http
      .get<ApiResponse<DeliveryRecord[]>>(`${this.apiUrl}/driver/deliveries`)
      .pipe(map((r) => r.data));
  }
}
