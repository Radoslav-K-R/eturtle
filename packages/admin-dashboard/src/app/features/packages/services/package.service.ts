import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccessResponse, PaginatedData } from '../../../models/api-response.model';
import { Package, PackageWithHistory, CreatePackageRequest } from '../../../models/package.model';

@Injectable({ providedIn: 'root' })
export class PackageService {
  private readonly baseUrl = `${environment.apiUrl}/packages`;

  constructor(private readonly httpClient: HttpClient) {}

  getAll(
    page: number = 1,
    pageSize: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: string = 'desc',
    status?: string,
  ): Observable<ApiSuccessResponse<PaginatedData<Package>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder);

    if (status) {
      params = params.set('status', status);
    }

    return this.httpClient.get<ApiSuccessResponse<PaginatedData<Package>>>(
      this.baseUrl,
      { params },
    );
  }

  getById(id: string): Observable<ApiSuccessResponse<PackageWithHistory>> {
    return this.httpClient.get<ApiSuccessResponse<PackageWithHistory>>(
      `${this.baseUrl}/${id}`,
    );
  }

  create(request: CreatePackageRequest): Observable<ApiSuccessResponse<Package>> {
    return this.httpClient.post<ApiSuccessResponse<Package>>(this.baseUrl, request);
  }
}
