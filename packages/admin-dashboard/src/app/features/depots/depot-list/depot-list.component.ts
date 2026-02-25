import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DepotService } from '../services/depot.service';
import { Depot, DepotType } from '../../../models/depot.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-depot-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './depot-list.component.html',
  styleUrl: './depot-list.component.scss',
})
export class DepotListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  depots: Depot[] = [];
  totalCount = 0;
  isLoading = false;
  sortBy = 'name';
  sortOrder = 'asc';
  typeFilter: DepotType | undefined;
  private readonly destroy$ = new Subject<void>();

  private map: L.Map | null = null;
  private layerGroup: L.LayerGroup | null = null;

  constructor(private readonly depotService: DepotService) {}

  ngOnInit(): void { this.loadDepots(); }

  ngAfterViewInit(): void {
    this.initMap();
  }

  loadDepots(): void {
    this.isLoading = true;
    this.depotService
      .getAll(1, 100, this.sortBy, this.sortOrder, this.typeFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.depots = response.data.items;
          this.totalCount = response.data.total;
          this.isLoading = false;
          this.renderMarkers();
        },
        error: () => { this.isLoading = false; },
      });
  }

  onSort(column: string): void {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'asc';
    }
    this.loadDepots();
  }

  onFilterType(type: DepotType | undefined): void {
    this.typeFilter = type;
    this.loadDepots();
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      scrollWheelZoom: true,
    }).setView([42.7, 25.5], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    this.layerGroup = L.layerGroup().addTo(this.map);
  }

  private renderMarkers(): void {
    if (!this.map || !this.layerGroup) return;
    this.layerGroup.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    for (const depot of this.depots) {
      if (depot.latitude == null || depot.longitude == null) continue;

      const latLng: L.LatLngExpression = [depot.latitude, depot.longitude];
      bounds.push(latLng);

      const isHub = depot.type === 'hub';
      const color = isHub ? '#FF9800' : '#2196F3';
      const radius = isHub ? 10 : 12;

      const marker = L.circleMarker(latLng, {
        radius,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      });

      marker.bindPopup(
        `<strong>${depot.name}</strong><br/>` +
        `Type: ${depot.type}<br/>` +
        `City: ${depot.city || '—'}<br/>` +
        `Address: ${depot.address}<br/>` +
        `Vehicles: ${depot.vehicleCount}`
      );

      this.layerGroup.addLayer(marker);
    }

    if (bounds.length > 0) {
      this.map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] });
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
