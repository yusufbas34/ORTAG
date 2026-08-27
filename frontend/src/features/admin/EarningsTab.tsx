import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import type { AdminDriverOption, EarningsRow, EarningsSummary } from './types';
import styles from './AdminHome.module.css';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function csvEscape(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function buildCsv(rows: EarningsRow[]): string {
  const header = ['Tarih', 'Şoför', 'Plaka', 'Yolcu', 'Kalkış', 'Varış', 'Km', 'Tutar (TRY)', 'Ödeme'];
  const lines = [header.map(csvEscape).join(',')];
  for (const r of rows) {
    lines.push(
      [
        formatDateTime(r.completedAt),
        r.driverName,
        r.vehiclePlate,
        r.riderName,
        r.pickupAddress,
        r.dropoffAddress,
        r.distanceKm,
        r.priceTry,
        r.paymentMethod === 'CASH' ? 'Nakit' : 'IBAN Havale',
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  return lines.join('\r\n');
}

function downloadCsv(csv: string, filename: string) {
  // BOM prefix so Excel opens the UTF-8 file with Turkish characters intact.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function EarningsTab() {
  const [drivers, setDrivers] = useState<AdminDriverOption[]>([]);
  const [driverId, setDriverId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<EarningsRow[]>([]);
  const [summary, setSummary] = useState<EarningsSummary>({ totalRides: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<{ drivers: AdminDriverOption[] }>('/admin/drivers').then(({ drivers }) => setDrivers(drivers));
  }, []);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (driverId) params.set('driverId', driverId);
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(to).toISOString());
    apiClient
      .get<{ rows: EarningsRow[]; summary: EarningsSummary }>(`/admin/earnings?${params.toString()}`)
      .then(({ rows, summary }) => {
        setRows(rows);
        setSummary(summary);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleExport() {
    downloadCsv(buildCsv(rows), `yol-hizmet-raporu-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Hizmet Raporu</div>

      <div className={styles.filterGrid}>
        <select className={styles.filterSelect} value={driverId} onChange={(e) => setDriverId(e.target.value)}>
          <option value="">Tüm Şoförler</option>
          {drivers.map((d) => (
            <option key={d.userId} value={d.userId}>
              {d.name} • {d.vehiclePlate}
            </option>
          ))}
        </select>
        <input className={styles.filterDate} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className={styles.filterDate} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button className={styles.filterBtn} onClick={load}>
          Filtrele
        </button>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.label}>Tamamlanan Yolculuk</span>
          <span className={styles.value}>{summary.totalRides}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.label}>Toplam Gelir</span>
          <span className={styles.value}>₺{summary.totalRevenue}</span>
        </div>
        <button className={styles.exportBtn} onClick={handleExport} disabled={rows.length === 0}>
          <i className="fa-solid fa-file-csv" /> Excel'e Aktar
        </button>
      </div>

      {!loading && rows.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Kayıt bulunamadı.</p>}

      {rows.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Şoför</th>
                <th>Yolcu</th>
                <th>Güzergah</th>
                <th>Km</th>
                <th>Tutar</th>
                <th>Ödeme</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateTime(r.completedAt)}</td>
                  <td>
                    {r.driverName}
                    <br />
                    <span className={styles.tableSub}>{r.vehiclePlate}</span>
                  </td>
                  <td>{r.riderName}</td>
                  <td className={styles.tableRoute}>
                    {r.pickupAddress} → {r.dropoffAddress}
                  </td>
                  <td>{r.distanceKm}</td>
                  <td>₺{r.priceTry}</td>
                  <td>{r.paymentMethod === 'CASH' ? 'Nakit' : 'IBAN'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
