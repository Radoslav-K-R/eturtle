import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccessResponse, PaginatedData } from '../../../models/api-response.model';
import { Depot, DepotWithDistance, DepotType, CreateDepotRequest } from '../../../models/depot.model';

@Injectable({ providedIn: 'root' })
export class DepotService {
  private readonly baseUrl = `${environment.apiUrl}/depots`;

  constructor(private readonly httpClient: HttpClient) {}

  getAll(
    page: number = 1,
    pageSize: number = 20,
    sortBy: string = 'name',
    sortOrder: string = 'asc',
    type?: DepotType,
  ): Observable<ApiSuccessResponse<PaginatedData<Depot>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder);

    if (type) {
      params = params.set('type', type);
    }

    return this.httpClient.get<ApiSuccessResponse<PaginatedData<Depot>>>(
      this.baseUrl,
      { params },
    );
  }

  findNearest(
    latitude: number,
    longitude: number,
    type?: DepotType,
    limit: number = 5,
  ): Observable<ApiSuccessResponse<DepotWithDistance[]>> {
    let params = new HttpParams()
      .set('latitude', latitude.toString())
      .set('longitude', longitude.toString())
      .set('limit', limit.toString());

    if (type) {
      params = params.set('type', type);
    }

    return this.httpClient.get<ApiSuccessResponse<DepotWithDistance[]>>(
      `${this.baseUrl}/nearest`,
      { params },
    );
  }

  create(request: CreateDepotRequest): Observable<ApiSuccessResponse<Depot>> {
    return this.httpClient.post<ApiSuccessResponse<Depot>>(this.baseUrl, request);
  }

  update(id: string, request: Partial<CreateDepotRequest>): Observable<ApiSuccessResponse<Depot>> {
    return this.httpClient.put<ApiSuccessResponse<Depot>>(`${this.baseUrl}/${id}`, request);
  }
}
