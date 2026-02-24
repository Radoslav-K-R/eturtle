import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccessResponse, PaginatedData } from '../../../models/api-response.model';
import { Route, RouteWithDetails } from '../../../models/route.model';

@Injectable({ providedIn: 'root' })
export class RouteService {
  private readonly baseUrl = `${environment.apiUrl}/routes`;

  constructor(private readonly httpClient: HttpClient) {}

  getAll(
    page: number = 1,
    pageSize: number = 20,
    sortBy: string = 'routeDate',
    sortOrder: string = 'desc',
    status?: string,
  ): Observable<ApiSuccessResponse<PaginatedData<Route>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder);

    if (status) {
      params = params.set('status', status);
    }

    return this.httpClient.get<ApiSuccessResponse<PaginatedData<Route>>>(
      this.baseUrl,
      { params },
    );
  }

  getById(id: string): Observable<ApiSuccessResponse<RouteWithDetails>> {
    return this.httpClient.get<ApiSuccessResponse<RouteWithDetails>>(
      `${this.baseUrl}/${id}`,
    );
  }

  approve(id: string): Observable<ApiSuccessResponse<RouteWithDetails>> {
    return this.httpClient.post<ApiSuccessResponse<RouteWithDetails>>(
      `${this.baseUrl}/${id}/approve`,
      {},
    );
  }

  reject(id: string, reason?: string): Observable<ApiSuccessResponse<RouteWithDetails>> {
    return this.httpClient.post<ApiSuccessResponse<RouteWithDetails>>(
      `${this.baseUrl}/${id}/reject`,
      { reason },
    );
  }
}
