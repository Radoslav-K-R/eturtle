import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { RefresherCustomEvent } from '@ionic/angular';
import { DriverService } from '../../core/services/driver.service';
import { DeliveryRecord } from '../../models/delivery.model';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonRefresher,
    IonRefresherContent,
    NgIf,
    NgFor,
    DatePipe,
  ],
})
export class HistoryPage implements OnInit {
  deliveries: DeliveryRecord[] = [];
  isLoading = false;

  constructor(private driverService: DriverService) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  refresh(event: RefresherCustomEvent): void {
    this.driverService.getDeliveryHistory().subscribe({
      next: (deliveries) => {
        this.deliveries = deliveries;
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      },
    });
  }

  private loadHistory(): void {
    this.isLoading = true;
    this.driverService.getDeliveryHistory().subscribe({
      next: (deliveries) => {
        this.deliveries = deliveries;
        this.isLoading = false;
      },
      error: () => {
        this.deliveries = [];
        this.isLoading = false;
      },
    });
  }
}
