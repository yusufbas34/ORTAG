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

`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` push bildirimleri içindir (`npx web-push generate-vapid-keys` ile üretilir). Boş bırakılırsa bildirimler sadece backend konsoluna loglanır, uygulama normal çalışmaya devam eder.

`FIREBASE_SERVICE_ACCOUNT_JSON` native (Android/iOS) uygulama push bildirimleri içindir — aşağıdaki "Native uygulama" bölümüne bakın.

## Native uygulama (Android) — Capacitor

`frontend/` içindeki React uygulaması [Capacitor](https://capacitorjs.com) ile Android'e sarılmış durumda (`frontend/android/`). Bu, PWA'nın web push'un aksine **uygulama tamamen kapalıyken de** gerçek FCM push bildirimi alabilmesi için gerekli — web push tarayıcıya, native push ise doğrudan Google'ın push servisine bağlıdır ve çok daha güvenilirdir.

### 1. Firebase projesi oluşturma (bir kere yapılır)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Proje ekle** → bir isim ver (örn. "YOL") → devam et (Analytics'i kapatabilirsin).
2. Proje açıldıktan sonra sol üstteki dişli ikonuna tıkla → **Project settings**.
3. **General** sekmesinde "Your apps" altında Android ikonuna tıkla, uygulama ekle:
   - Android package name: `com.yol.app` (bu, `frontend/capacitor.config.ts` içindeki `appId` ile birebir aynı olmalı).
   - App nickname: "YOL" (opsiyonel).
4. **`google-services.json` dosyasını indir** ve `frontend/android/app/google-services.json` konumuna koy (bu dosya `.gitignore`'da değil, projene özel olduğu için commit'lemek istemezsen kendin `.gitignore`'a ekleyebilirsin, ama olmadan native push çalışmaz).
5. Sol menüden **Project settings → Service accounts** sekmesine git → **Generate new private key** butonuna bas → bir JSON dosyası iner.
6. Bu JSON dosyasının **tüm içeriğini** tek satır olarak Railway'deki backend servisinin `FIREBASE_SERVICE_ACCOUNT_JSON` değişkenine yapıştır.

### 2. Yerel makinende derleme (Android Studio gerekir)

```bash
cd frontend
npm run build          # dist/ klasörünü güncel tutar
npx cap sync android    # dist/ içeriğini native projeye kopyalar, native bağımlılıkları günceller
npm run cap:android     # Android Studio'yu açar (veya: npx cap open android)
```

Android Studio açıldıktan sonra üstteki ▶️ (Run) butonuyla bağlı bir cihazda/emülatörde çalıştırabilir, ya da **Build → Generate Signed Bundle/APK** ile Play Store'a yüklenecek `.aab` dosyasını üretebilirsin (imzalama anahtarı oluşturman gerekir — Android Studio bu adımda yönlendirir).

`frontend/capacitor.config.ts` içindeki `server.url` alanı, uygulamanın hangi adresi göstereceğini belirler — projeyi Railway'e (veya kendi domainine) deploy ettikten sonra bu adresi gerçek URL'inle güncelle.

### 3. iOS

iOS derlemesi yalnızca **macOS + Xcode** ile mümkündür (Apple'ın kısıtı, başka platformdan yapılamaz). Bir Mac ve [Apple Developer Program](https://developer.apple.com/programs/) üyeliği ($99/yıl) edindiğinde:

```bash
npm install @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios
```

Push bildirimleri için Firebase konsolunda bir iOS uygulaması daha eklemen ve Apple Developer hesabından bir APNs anahtarı oluşturup Firebase'e yüklemen gerekir (Firebase konsolu adım adım yönlendirir).
