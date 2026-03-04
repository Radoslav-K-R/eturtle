import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { NgIf } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonChip,
  IonLabel,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locationOutline, cubeOutline, navigateOutline } from 'ionicons/icons';
import { RefresherCustomEvent } from '@ionic/angular';
import * as L from 'leaflet';
import { DriverService } from '../../core/services/driver.service';
import { DriverRoute } from '../../models/route.model';

const STOP_COLORS = ['#2e7d32', '#1565c0', '#e65100', '#6a1b9a', '#c62828', '#00838f'];

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonChip,
    IonLabel,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    NgIf,
  ],
})
export class MapPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  route: DriverRoute | null = null;
  isLoading = false;
  private map: L.Map | null = null;
  private layerGroup: L.LayerGroup | null = null;

  constructor(private driverService: DriverService) {
    addIcons({ locationOutline, cubeOutline, navigateOutline });
  }

  ngOnInit(): void {
    this.loadRoute();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 100);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  refresh(event: RefresherCustomEvent): void {
    this.driverService.getTodayRoute().subscribe({
      next: (route) => {
        this.route = route;
        this.renderMarkers();
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      },
    });
  }

  get deliveredCount(): number {
    return this.route?.packages.filter((p) => p.status === 'delivered').length ?? 0;
  }

  get totalPackages(): number {
    return this.route?.packages.length ?? 0;
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement) {
      return;
    }

    this.map = L.map(this.mapContainer.nativeElement, {
      scrollWheelZoom: true,
      zoomControl: true,
    }).setView([42.7, 25.5], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);

    this.layerGroup = L.layerGroup().addTo(this.map);

    if (this.route) {
      this.renderMarkers();
    }
  }

  private renderMarkers(): void {
    if (!this.map || !this.layerGroup || !this.route) {
      return;
    }

    this.layerGroup.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    this.route.stops.forEach((stop, index) => {
      if (stop.latitude == null || stop.longitude == null) {
        return;
      }

      const color = STOP_COLORS[index % STOP_COLORS.length];
      const latLng: L.LatLngExpression = [stop.latitude, stop.longitude];
      bounds.push(latLng);

      const marker = L.circleMarker(latLng, {
        radius: 14,
        fillColor: color,
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9,
      });

      marker.bindTooltip(String(stop.stopOrder), {
        permanent: true,
        direction: 'center',
        className: 'stop-tooltip',
      });

      marker.bindPopup(
        `<strong>Stop ${stop.stopOrder}</strong><br>${stop.depotName}`,
      );

      marker.addTo(this.layerGroup!);
    });

    const seenDestinations = new Set<string>();
    this.route.packages.forEach((pkg) => {
      if (pkg.destinationLatitude == null || pkg.destinationLongitude == null) {
        return;
      }
      const key = `${pkg.destinationLatitude},${pkg.destinationLongitude}`;
      if (seenDestinations.has(key)) {
        return;
      }
      seenDestinations.add(key);

      const latLng: L.LatLngExpression = [pkg.destinationLatitude, pkg.destinationLongitude];
      bounds.push(latLng);

      const fillColor = pkg.status === 'delivered' ? '#4caf50' : '#e91e63';

      const marker = L.circleMarker(latLng, {
        radius: 7,
        fillColor,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      });

      marker.bindPopup(
        `<strong>${pkg.trackingNumber}</strong><br>${pkg.destinationAddress}<br>Status: ${pkg.status}`,
      );

      marker.addTo(this.layerGroup!);
    });

    const stopsWithCoords = this.route.stops
      .filter((s) => s.latitude != null && s.longitude != null)
      .sort((a, b) => a.stopOrder - b.stopOrder);

    if (stopsWithCoords.length > 1) {
      const polylineCoords: L.LatLngExpression[] = stopsWithCoords.map(
        (s) => [s.latitude!, s.longitude!],
      );

      L.polyline(polylineCoords, {
        color: '#2e7d32',
        weight: 3,
        opacity: 0.7,
        dashArray: '8, 6',
      }).addTo(this.layerGroup!);
    }

    if (bounds.length > 0) {
      this.map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] });
    }
  }

  private loadRoute(): void {
    this.isLoading = true;
    this.driverService.getTodayRoute().subscribe({
      next: (route) => {
        this.route = route;
        this.isLoading = false;
        this.renderMarkers();
      },
      error: () => {
        this.route = null;
        this.isLoading = false;
      },
    });
  }
}
