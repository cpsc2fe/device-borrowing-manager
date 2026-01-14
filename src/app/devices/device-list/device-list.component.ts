import { Component, OnInit } from '@angular/core';
import { Device } from '../device.model';
import { DeviceService } from '../device.service';

@Component({
  selector: 'app-device-list',
  templateUrl: './device-list.component.html',
  styleUrls: ['./device-list.component.css']
})
export class DeviceListComponent implements OnInit {
  devices: Device[] = [];
  loading = true;
  errorMessage: string | null = null;

  constructor(private deviceService: DeviceService) { }

  ngOnInit(): void {
    this.loadDevices();
  }

  async loadDevices(): Promise<void> {
    this.loading = true;
    this.errorMessage = null;
    try {
      const { data, error } = await this.deviceService.getDevices();
      if (error) {
        throw error;
      }
      this.devices = data || [];
    } catch (error: any) {
      this.errorMessage = `Error fetching devices: ${error.message}`;
    } finally {
      this.loading = false;
    }
  }
}
