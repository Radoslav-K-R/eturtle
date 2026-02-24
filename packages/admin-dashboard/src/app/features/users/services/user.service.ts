import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccessResponse, PaginatedData } from '../../../models/api-response.model';
import { User, CreateUserRequest } from '../../../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = `${environment.apiUrl}/users`;

  constructor(private readonly httpClient: HttpClient) {}

  getAll(
    page: number = 1,
    pageSize: number = 20,
    sortBy: string = 'fullName',
    sortOrder: string = 'asc',
    role?: string,
  ): Observable<ApiSuccessResponse<PaginatedData<User>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder);

    if (role) { params = params.set('role', role); }

    return this.httpClient.get<ApiSuccessResponse<PaginatedData<User>>>(
      this.baseUrl,
      { params },
    );
  }

  create(request: CreateUserRequest): Observable<ApiSuccessResponse<User>> {
    return this.httpClient.post<ApiSuccessResponse<User>>(this.baseUrl, request);
  }

  update(id: string, request: Partial<CreateUserRequest>): Observable<ApiSuccessResponse<User>> {
    return this.httpClient.put<ApiSuccessResponse<User>>(`${this.baseUrl}/${id}`, request);
  }
}
