# YOL

Martı/Uber benzeri, Türkiye pazarına yönelik taksi çağırma uygulaması. Yolcu, şoför ve admin rolleri; anlık araç çağırma (Araç Bul / Araç Seç), randevulu araç planlama (Araç Planla / Planlı YOL), harita üzerinde rota+fiyat hesaplama (40 TL/km taban ücret, admin %ayarı), Socket.IO ile gerçek zamanlı şoför kabul/red akışı ve iPhone'a kurulabilir PWA arayüzü.

## Proje yapısı

```
/frontend   React + TypeScript + Vite (PWA)
/backend    Express + TypeScript API + Socket.IO + Prisma/SQLite
/shared     Frontend/backend arasında paylaşılan TS tipleri
```

## Kurulum

```bash
npm install
cp backend/.env.example backend/.env
npm run db:migrate --workspace backend
npm run db:seed --workspace backend
```

Seed sonrası hazır hesaplar:

| Rol    | Email             | Şifre       |
| ------ | ----------------- | ----------- |
| Admin  | admin@yol.app     | admin1234   |
| Yolcu  | rider@yol.app     | rider1234   |
| Şoför  | driver1@yol.app   | driver1234  |
| Şoför  | driver2@yol.app   | driver1234  |

## Geliştirme

```bash
npm run dev:backend    # http://localhost:4000 (API + Socket.IO)
npm run dev:frontend   # http://localhost:5173 (Vite dev server, /api ve /socket.io backend'e proxy'lenir)
```

Gerçek zamanlı akışları (şoför kabul/red, randevu bildirimleri) test etmek için birden fazla tarayıcı sekmesi/penceresi açıp farklı rollerle (yolcu/şoför) giriş yapabilirsiniz.

## PWA / iPhone'a kurulum

```bash
npm run build --workspace frontend
npm run preview --workspace frontend   # üretim build'ini önizler, manifest + service worker aktiftir
```

iOS Safari'de "Ana Ekrana Ekle" ile kurulabilmesi için sitenin **HTTPS** üzerinden yayınlanması gerekir (yerel `npm run dev` sunucusu iPhone'dan erişilemez) — bir hosting adresine (Vercel, Netlify, Railway vb.) deploy edildikten sonra Safari'den Paylaş → Ana Ekrana Ekle ile gerçek bir uygulama ikonu olarak kurulabilir.

## Ortam değişkenleri (backend/.env)

`OSRM_BASE_URL` ve `NOMINATIM_BASE_URL` varsayılan olarak ücretsiz genel servislere (router.project-osrm.org, nominatim.openstreetmap.org) işaret eder. Yoğun kullanımda kendi OSRM/Nominatim sunucunuzu self-host edip bu adresleri değiştirebilirsiniz.
