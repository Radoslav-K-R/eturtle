import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccessResponse, PaginatedData } from '../../../models/api-response.model';
import { Depot, CreateDepotRequest } from '../../../models/depot.model';

@Injectable({ providedIn: 'root' })
export class DepotService {
  private readonly baseUrl = `${environment.apiUrl}/depots`;

  constructor(private readonly httpClient: HttpClient) {}

  getAll(
    page: number = 1,
    pageSize: number = 20,
    sortBy: string = 'name',
    sortOrder: string = 'asc',
  ): Observable<ApiSuccessResponse<PaginatedData<Depot>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder);

    return this.httpClient.get<ApiSuccessResponse<PaginatedData<Depot>>>(
      this.baseUrl,
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
