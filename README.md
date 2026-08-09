# TAG

Martı/Uber benzeri, Türkiye pazarına yönelik taksi çağırma uygulaması. Yolcu, şoför ve admin rolleri; anlık araç çağırma, randevulu araç planlama, harita üzerinde rota+fiyat hesaplama (40 TL/km taban ücret) ve iPhone'a kurulabilir PWA arayüzü.

## Proje yapısı

```
/frontend   React + TypeScript + Vite (PWA)
/backend    Express + TypeScript API + Socket.IO
/shared     Frontend/backend arasında paylaşılan TS tipleri
```

## Kurulum

```bash
npm install
cp backend/.env.example backend/.env
```

## Geliştirme

```bash
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:5173
```

Şu anki durum: proje aşamalı olarak inşa ediliyor (bkz. görev listesi). Auth, gerçek zamanlı dispatch, randevu sistemi ve admin paneli sonraki aşamalarda eklenecek.
