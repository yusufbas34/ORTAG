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

export type AdminUserRole = 'RIDER' | 'DRIVER';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  isBanned: boolean;
  bannedReason: string | null;
  createdAt: string;
  vehiclePlate: string | null;
  vehicleModel: string | null;
}

export interface AdminDriverOption {
  userId: string;
  name: string;
  vehiclePlate: string;
}

export interface EarningsRow {
  id: string;
  completedAt: string;
  driverName: string;
  vehiclePlate: string;
  riderName: string;
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm: number;
  priceTry: number;
  paymentMethod: 'CASH' | 'IBAN_TRANSFER';
}

export interface EarningsSummary {
  totalRides: number;
  totalRevenue: number;
}
