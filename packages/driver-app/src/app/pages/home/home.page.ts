import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonNote,
} from '@ionic/angular/standalone';
import { RefresherCustomEvent } from '@ionic/angular';
import { DriverService } from '../../core/services/driver.service';
import { DriverRoute } from '../../models/route.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonRefresher,
    IonRefresherContent,
    IonNote,
    NgIf,
    NgFor,
  ],
})
export class HomePage implements OnInit {
  route: DriverRoute | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(private driverService: DriverService) {}

  ngOnInit(): void {
    this.loadRoute();
  }

  refresh(event: RefresherCustomEvent): void {
    this.driverService.getTodayRoute().subscribe({
      next: (route) => {
        this.route = route;
        this.errorMessage = '';
        event.target.complete();
      },
      error: () => {
        this.errorMessage = 'Failed to load route.';
        event.target.complete();
      },
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'success';
      default:
        return 'medium';
    }
  }

  getPackageCountByStatus(status: string): number {
    if (!this.route) {
      return 0;
    }
    return this.route.packages.filter((p) => p.status === status).length;
  }

  private loadRoute(): void {
    this.isLoading = true;
    this.driverService.getTodayRoute().subscribe({
      next: (route) => {
        this.route = route;
        this.isLoading = false;
      },
      error: () => {
        this.route = null;
        this.isLoading = false;
        this.errorMessage = 'Failed to load route.';
      },
    });
  }
}
