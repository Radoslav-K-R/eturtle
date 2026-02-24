import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonBadge,
  IonBackButton,
  IonButtons,
  IonText,
  IonNote,
} from '@ionic/angular/standalone';
import { DriverService } from '../../core/services/driver.service';
import { RoutePackage } from '../../models/route.model';
import { DeliveryConfirmation } from '../../models/delivery.model';

@Component({
  selector: 'app-package-detail',
  templateUrl: './package-detail.page.html',
  styleUrls: ['./package-detail.page.scss'],
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
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonButton,
    IonBadge,
    IonBackButton,
    IonButtons,
    IonText,
    IonNote,
    NgIf,
    ReactiveFormsModule,
  ],
})
export class PackageDetailPage implements OnInit {
  package: RoutePackage | null = null;
  isLoading = false;
  deliveryForm: FormGroup;
  isDelivering = false;
  successMessage = '';

  constructor(
    private activatedRoute: ActivatedRoute,
    private driverService: DriverService,
    private fb: FormBuilder,
  ) {
    this.deliveryForm = this.fb.group({
      recipientName: ['', [Validators.required]],
      notes: [''],
    });
  }

  ngOnInit(): void {
    const packageId = this.activatedRoute.snapshot.paramMap.get('id');
    if (packageId) {
      this.loadPackage(packageId);
    }
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

  confirmDelivery(): void {
    if (this.deliveryForm.invalid || this.isDelivering || !this.package) {
      return;
    }

    this.isDelivering = true;
    this.successMessage = '';

    const confirmation: DeliveryConfirmation = {
      recipientName: this.deliveryForm.value.recipientName as string,
      notes: this.deliveryForm.value.notes as string || undefined,
    };

    this.driverService.confirmDelivery(this.package.id, confirmation).subscribe({
      next: () => {
        this.isDelivering = false;
        this.successMessage = 'Delivery confirmed successfully!';
        if (this.package) {
          this.package = { ...this.package, status: 'delivered' };
        }
      },
      error: () => {
        this.isDelivering = false;
      },
    });
  }

  private loadPackage(packageId: string): void {
    this.isLoading = true;
    this.driverService.getPackageDetail(packageId).subscribe({
      next: (pkg) => {
        this.package = pkg;
        this.isLoading = false;
      },
      error: () => {
        this.package = null;
        this.isLoading = false;
      },
    });
  }
}
