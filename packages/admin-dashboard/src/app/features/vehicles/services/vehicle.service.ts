import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccessResponse, PaginatedData } from '../../../models/api-response.model';
import { Vehicle, CreateVehicleRequest } from '../../../models/vehicle.model';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private readonly baseUrl = `${environment.apiUrl}/vehicles`;

  constructor(private readonly httpClient: HttpClient) {}

  getAll(
    page: number = 1,
    pageSize: number = 20,
    sortBy: string = 'licensePlate',
    sortOrder: string = 'asc',
    type?: string,
    depotId?: string,
    status?: string,
  ): Observable<ApiSuccessResponse<PaginatedData<Vehicle>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder);

    if (type) { params = params.set('type', type); }
    if (depotId) { params = params.set('depotId', depotId); }
    if (status) { params = params.set('status', status); }

    return this.httpClient.get<ApiSuccessResponse<PaginatedData<Vehicle>>>(
      this.baseUrl,
      { params },
    );
  }

  getById(id: string): Observable<ApiSuccessResponse<Vehicle>> {
    return this.httpClient.get<ApiSuccessResponse<Vehicle>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateVehicleRequest): Observable<ApiSuccessResponse<Vehicle>> {
    return this.httpClient.post<ApiSuccessResponse<Vehicle>>(this.baseUrl, request);
  }

  update(id: string, request: Partial<CreateVehicleRequest>): Observable<ApiSuccessResponse<Vehicle>> {
    return this.httpClient.put<ApiSuccessResponse<Vehicle>>(`${this.baseUrl}/${id}`, request);
  }
}
