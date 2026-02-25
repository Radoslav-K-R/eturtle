import {
  Component,
  Input,
  OnChanges,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouteStop, RoutePackageSummary } from '../../../../models/route.model';
import * as L from 'leaflet';

const DEPOT_COLORS = ['#2196F3', '#FF9800', '#4CAF50', '#9C27B0', '#F44336', '#00BCD4'];

@Component({
  selector: 'app-route-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './route-map.component.html',
  styleUrl: './route-map.component.scss',
})
export class RouteMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() stops: RouteStop[] = [];
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  private layerGroup: L.LayerGroup | null = null;

  ngAfterViewInit(): void {
    this.initMap();
    this.renderMarkers();
  }

  ngOnChanges(): void {
    if (this.map) {
      this.renderMarkers();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
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
    const depotLatLngs: L.LatLngExpression[] = [];

    for (let i = 0; i < this.stops.length; i++) {
      const stop = this.stops[i]!;
      if (stop.depotLatitude == null || stop.depotLongitude == null) continue;

      const latLng: L.LatLngExpression = [stop.depotLatitude, stop.depotLongitude];
      bounds.push(latLng);
      depotLatLngs.push(latLng);

      const color = DEPOT_COLORS[i % DEPOT_COLORS.length]!;
      const pickupCount = stop.pickupPackages.length;
      const dropoffCount = stop.dropoffPackages.length;

      const depotMarker = L.circleMarker(latLng, {
        radius: 16,
        fillColor: color,
        color: '#fff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.85,
      });

      depotMarker.bindTooltip(`${stop.stopOrder}`, {
        permanent: true,
        direction: 'center',
        className: 'depot-label',
      });

      depotMarker.bindPopup(
        `<strong>Stop ${stop.stopOrder}: ${stop.depotName}</strong><br/>` +
        `Pickups: ${pickupCount}<br/>` +
        `Dropoffs: ${dropoffCount}`
      );

      this.layerGroup.addLayer(depotMarker);

      const allPackages = [...stop.pickupPackages, ...stop.dropoffPackages];
      const seen = new Set<string>();
      for (const pkg of allPackages) {
        if (seen.has(pkg.id)) continue;
        seen.add(pkg.id);
        if (pkg.destinationLatitude != null && pkg.destinationLongitude != null) {
          const pkgLatLng: L.LatLngExpression = [pkg.destinationLatitude, pkg.destinationLongitude];
          bounds.push(pkgLatLng);

          const pkgMarker = L.circleMarker(pkgLatLng, {
            radius: 7,
            fillColor: '#E91E63',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          });

          pkgMarker.bindPopup(
            `<strong>${pkg.trackingNumber}</strong><br/>${pkg.destinationAddress}`
          );

          this.layerGroup.addLayer(pkgMarker);
        }
      }
    }

    if (depotLatLngs.length >= 2) {
      const routeLine = L.polyline(depotLatLngs, {
        color: '#333',
        weight: 3,
        dashArray: '8, 6',
        opacity: 0.7,
      });
      this.layerGroup.addLayer(routeLine);
    }

    if (bounds.length > 0) {
      this.map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] });
    }
  }
}
