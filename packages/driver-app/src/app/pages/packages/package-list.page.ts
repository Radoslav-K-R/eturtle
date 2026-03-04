import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonBadge,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locationOutline, cubeOutline } from 'ionicons/icons';
import { RefresherCustomEvent } from '@ionic/angular';
import { DriverService } from '../../core/services/driver.service';
import { RoutePackage } from '../../models/route.model';

@Component({
  selector: 'app-package-list',
  templateUrl: './package-list.page.html',
  styleUrls: ['./package-list.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonBadge,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    NgIf,
    NgFor,
    RouterLink,
  ],
})
export class PackageListPage implements OnInit {
  packages: RoutePackage[] = [];
  isLoading = false;

  constructor(private driverService: DriverService) {
    addIcons({ locationOutline, cubeOutline });
  }

  ngOnInit(): void {
    this.loadPackages();
  }

  refresh(event: RefresherCustomEvent): void {
    this.driverService.getTodayRoute().subscribe({
      next: (route) => {
        this.packages = route.packages;
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      },
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_transit':
        return 'primary';
      case 'delivered':
        return 'success';
      default:
        return 'medium';
    }
  }

  private loadPackages(): void {
    this.isLoading = true;
    this.driverService.getTodayRoute().subscribe({
      next: (route) => {
        this.packages = route.packages;
        this.isLoading = false;
      },
      error: () => {
        this.packages = [];
        this.isLoading = false;
      },
    });
  }
}
