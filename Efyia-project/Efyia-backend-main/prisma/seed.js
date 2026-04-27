'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function assertRequiredColumnsPresent() {
  const requiredStudioColumns = ['stripeConnectAccountId', 'stripeConnectStatus'];
  const existing = await prisma.$queryRawUnsafe(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'studios'
      AND column_name = ANY($1)
  `, requiredStudioColumns);

  const existingNames = new Set(existing.map((row) => row.column_name));
  const missing = requiredStudioColumns.filter((name) => !existingNames.has(name));

  if (missing.length) {
    throw new Error(
      `Database schema drift detected: missing studios column(s): ${missing.join(', ')}. ` +
      'Run `npx prisma migrate deploy` before seeding to apply pending Prisma migrations.'
    );
  }
}


async function main() {
  console.log('Seeding database...');
  await assertRequiredColumnsPresent();

  // Clear existing data in dependency order
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.availabilityBlock.deleteMany();
  await prisma.studio.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('efyia2024!', 12);

  // Create users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@efyia.com',
      password: passwordHash,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  const owner1 = await prisma.user.create({
    data: {
      email: 'owner@sable.com',
      password: passwordHash,
      name: 'Marcus Webb',
      role: 'OWNER',
    },
  });

  const owner2 = await prisma.user.create({
    data: {
      email: 'owner@meridian.com',
      password: passwordHash,
      name: 'Dani Cross',
      role: 'OWNER',
    },
  });

  const owner3 = await prisma.user.create({
    data: {
      email: 'owner@lighthouse.com',
      password: passwordHash,
      name: 'Rowan Pierce',
      role: 'OWNER',
    },
  });

  const owner4 = await prisma.user.create({
    data: {
      email: 'owner@deepbasin.com',
      password: passwordHash,
      name: 'Casey Monroe',
      role: 'OWNER',
    },
  });

  const owner5 = await prisma.user.create({
    data: {
      email: 'owner@tidalworks.com',
      password: passwordHash,
      name: 'Sofia Reyes',
      role: 'OWNER',
    },
  });

  const client1 = await prisma.user.create({
    data: {
      email: 'jordan@artist.com',
      password: passwordHash,
      name: 'Jordan S.',
      role: 'CLIENT',
    },
  });

  const client2 = await prisma.user.create({
    data: {
      email: 'alicia@artist.com',
      password: passwordHash,
      name: 'Alicia M.',
      role: 'CLIENT',
    },
  });

  // Create studios
  const sable = await prisma.studio.create({
    data: {
      slug: 'sable-sound-studio',
      name: 'Sable Sound Studio',
      description: "Hollywood's intimate professional recording space with a live room, isolation booth, and premium analog chain for vocals and production sessions.",
      address: '1847 Cahuenga Blvd, Hollywood, CA',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90028',
      lat: 34.098,
      lng: -118.328,
      pricePerHour: 85,
      featured: true,
      verified: true,
      color: '#62f3d4',
      ownerId: owner1.id,
      tags: ['Pro Tools', 'Vocal Booth', 'Live Room'],
      amenities: ['Parking', 'Lounge', 'WiFi', 'HVAC', 'Coffee Bar'],
      equipment: ['Neve 8078', 'Pro Tools Ultimate', 'API 2500', 'Neumann U87', 'SSL G-Comp'],
      sessionTypes: ['Recording', 'Mixing', 'Mastering', 'Podcast'],
    },
  });

  const meridian = await prisma.studio.create({
    data: {
      slug: 'meridian-audio',
      name: 'Meridian Audio',
      description: "Atlanta's go-to urban recording studio with three rooms built for hip-hop, beat production, podcasts, and songwriter sessions.",
      address: '2210 Howell Mill Rd NW, Atlanta, GA',
      city: 'Atlanta',
      state: 'GA',
      zip: '30318',
      lat: 33.789,
      lng: -84.415,
      pricePerHour: 65,
      featured: true,
      verified: true,
      color: '#6dc2a3',
      ownerId: owner2.id,
      tags: ['Hip-Hop', 'Trap', 'Full Band'],
      amenities: ['Street Parking', 'Lounge', 'WiFi', 'Green Room'],
      equipment: ['SSL 4000', 'Pro Tools HD', 'Focusrite ISA', 'MPC 4000', 'Roland 808'],
      sessionTypes: ['Recording', 'Beat Production', 'Mixing'],
    },
  });

  const lighthouse = await prisma.studio.create({
    data: {
      slug: 'lighthouse-recording',
      name: 'Lighthouse Recording',
      description: 'A full-service Manhattan recording complex with premium vintage gear, flexible rooms, and reliable engineer support for commercial sessions.',
      address: '318 W 28th St, Manhattan, NY',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      lat: 40.748,
      lng: -74.0,
      pricePerHour: 120,
      featured: false,
      verified: true,
      color: '#73aa8b',
      ownerId: owner3.id,
      tags: ['Vintage Gear', 'Orchestral', 'Jazz'],
      amenities: ['24/7 Access', 'Isolation Booths', 'Lounge', 'Mastering Suite'],
      equipment: ['Neve 8048', 'Studer A800', 'Pro Tools Ultimate', 'Lexicon 480L'],
      sessionTypes: ['Recording', 'Orchestral', 'Mastering', 'Mixing'],
    },
  });

  const deepBasin = await prisma.studio.create({
    data: {
      slug: 'deep-basin-studio',
      name: 'Deep Basin Studio',
      description: 'A Music Row tracking room built for live bands, acoustic projects, writing camps, and modern country production.',
      address: '1100 Broadway, Nashville, TN',
      city: 'Nashville',
      state: 'TN',
      zip: '37203',
      lat: 36.156,
      lng: -86.782,
      pricePerHour: 75,
      featured: false,
      verified: true,
      color: '#789173',
      ownerId: owner4.id,
      tags: ['Country', 'Americana', 'Live Band'],
      amenities: ['Free Parking', 'Lounge', 'Kitchen', 'Backline'],
      equipment: ['API 1608', 'Pro Tools', 'Neve 1073 Preamps', 'Royer Ribbons'],
      sessionTypes: ['Recording', 'Live Tracking', 'Mixing'],
    },
  });

  const tidalWorks = await prisma.studio.create({
    data: {
      slug: 'tidal-works',
      name: 'Tidal Works',
      description: 'A Miami boutique studio specializing in Latin, electronic, and pop sessions with a bright creative lounge and production suite.',
      address: '100 NE 11th St, Miami, FL',
      city: 'Miami',
      state: 'FL',
      zip: '33132',
      lat: 25.786,
      lng: -80.189,
      pricePerHour: 90,
      featured: false,
      verified: false,
      color: '#7e795b',
      ownerId: owner5.id,
      tags: ['Latin', 'Electronic', 'Pop'],
      amenities: ['Valet', 'Rooftop Lounge', 'WiFi', 'In-House Engineer'],
      equipment: ['Neve Genesys', 'Ableton Live Suite', 'Moog Minimoog', 'Roland Fantom'],
      sessionTypes: ['Recording', 'Electronic Production', 'Mixing', 'Podcast'],
    },
  });

  // Create reviews
  await prisma.review.create({
    data: {
      studioId: sable.id,
      userId: client1.id,
      rating: 5,
      content: 'Beautiful signal chain, fast setup, and a relaxed room that made vocals easy all night.',
      ownerReply: 'Appreciate you trusting us with the session. Come back anytime.',
    },
  });

  await prisma.review.create({
    data: {
      studioId: sable.id,
      userId: client2.id,
      rating: 5,
      content: 'The engineer support was great and the room translated really well for mixing.',
    },
  });

  await prisma.review.create({
    data: {
      studioId: meridian.id,
      userId: client1.id,
      rating: 4,
      content: 'Great Atlanta energy and easy parking. Would book again for writing sessions.',
    },
  });

  // Update studio ratings from seeded reviews
  await prisma.studio.update({
    where: { id: sable.id },
    data: { rating: 4.9, reviewCount: 47 },
  });
  await prisma.studio.update({
    where: { id: meridian.id },
    data: { rating: 4.7, reviewCount: 31 },
  });
  await prisma.studio.update({
    where: { id: lighthouse.id },
    data: { rating: 4.8, reviewCount: 62 },
  });
  await prisma.studio.update({
    where: { id: deepBasin.id },
    data: { rating: 4.6, reviewCount: 28 },
  });
  await prisma.studio.update({
    where: { id: tidalWorks.id },
    data: { rating: 4.5, reviewCount: 19 },
  });

  // Create sample bookings
  const fee = 0.08;
  const b1Subtotal = 85 * 2;
  const b1Fee = Math.round(b1Subtotal * fee);
  await prisma.booking.create({
    data: {
      studioId: sable.id,
      userId: client1.id,
      sessionType: 'Recording',
      date: '2026-04-14',
      time: '10:00 AM',
      hours: 2,
      subtotal: b1Subtotal,
      platformFee: b1Fee,
      total: b1Subtotal + b1Fee,
      status: 'CONFIRMED',
    },
  });

  const b2Subtotal = 65 * 3;
  const b2Fee = Math.round(b2Subtotal * fee);
  await prisma.booking.create({
    data: {
      studioId: meridian.id,
      userId: client1.id,
      sessionType: 'Mixing',
      date: '2026-02-21',
      time: '1:00 PM',
      hours: 3,
      subtotal: b2Subtotal,
      platformFee: b2Fee,
      total: b2Subtotal + b2Fee,
      status: 'COMPLETED',
    },
  });

  // Create favorites
  await prisma.favorite.create({ data: { userId: client1.id, studioId: sable.id } });
  await prisma.favorite.create({ data: { userId: client1.id, studioId: lighthouse.id } });

  console.log('Seed complete.');
  console.log('\nDefault credentials (all accounts use this password): efyia2024!');
  console.log('  Admin:   admin@efyia.com');
  console.log('  Owners:  owner@sable.com, owner@meridian.com, owner@lighthouse.com, owner@deepbasin.com, owner@tidalworks.com');
  console.log('  Clients: jordan@artist.com, alicia@artist.com');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
