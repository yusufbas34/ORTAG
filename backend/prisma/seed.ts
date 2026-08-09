import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prismaClient.js';

async function upsertUser(params: {
  email: string;
  password: string;
  name: string;
  role: 'RIDER' | 'DRIVER' | 'ADMIN';
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  return prisma.user.upsert({
    where: { email: params.email },
    update: {},
    create: {
      email: params.email,
      passwordHash,
      name: params.name,
      role: params.role,
      emailVerified: true,
    },
  });
}

async function main() {
  const admin = await upsertUser({
    email: 'admin@tag.app',
    password: 'admin1234',
    name: 'TAG Admin',
    role: 'ADMIN',
  });
  console.log('admin:', admin.email);

  const rider = await upsertUser({
    email: 'rider@tag.app',
    password: 'rider1234',
    name: 'Ayşe Yolcu',
    role: 'RIDER',
  });
  await prisma.riderProfile.upsert({
    where: { userId: rider.id },
    update: {},
    create: { userId: rider.id },
  });
  console.log('rider:', rider.email);

  const driverStandard = await upsertUser({
    email: 'driver1@tag.app',
    password: 'driver1234',
    name: 'Mehmet Şoför',
    role: 'DRIVER',
  });
  await prisma.driverProfile.upsert({
    where: { userId: driverStandard.id },
    update: {},
    create: {
      userId: driverStandard.id,
      vehiclePlate: '34 TAG 001',
      vehicleModel: 'Toyota Corolla',
      vehicleType: 'STANDARD',
      iban: 'TR330006100519786457841326',
      isAvailable: true,
      currentLat: 40.9917,
      currentLng: 29.0275,
      lastLocationAt: new Date(),
    },
  });
  console.log('driver:', driverStandard.email);

  const driverXl = await upsertUser({
    email: 'driver2@tag.app',
    password: 'driver1234',
    name: 'Ali XL Şoför',
    role: 'DRIVER',
  });
  await prisma.driverProfile.upsert({
    where: { userId: driverXl.id },
    update: {},
    create: {
      userId: driverXl.id,
      vehiclePlate: '34 TAG 002',
      vehicleModel: 'Volkswagen Transporter',
      vehicleType: 'XL',
      iban: 'TR640001200945678903335044',
      isAvailable: true,
      currentLat: 41.0422,
      currentLng: 29.007,
      lastLocationAt: new Date(),
    },
  });
  console.log('driver:', driverXl.email);

  await prisma.pricingConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', baseRatePerKm: 40, adjustmentPercent: 0 },
  });
  console.log('pricing config: baseRatePerKm=40 adjustmentPercent=0');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
