export interface PricingConfig {
  id: string;
  baseRatePerKm: number;
  adjustmentPercent: number;
  updatedAt: string;
}

export interface PricingHistoryEntry {
  id: string;
  adjustmentPercent: number;
  baseRatePerKm: number;
  updatedByName: string;
  createdAt: string;
}
