'use strict';

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

function monthLabel(date) {
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

router.get('/studio', requireAuth, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const studio = await prisma.studio.findFirst({ where: { ownerId: req.user.id } });
    if (!studio) {
      return res.status(404).json({ error: 'Studio not found.' });
    }

    const bookings = await prisma.booking.findMany({
      where: { studioId: studio.id },
      select: {
        sessionType: true,
        date: true,
        hours: true,
        subtotal: true,
        status: true,
      },
    });

    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      months.push({
        key,
        month: monthLabel(d),
        revenue: 0,
        bookings: 0,
      });
    }

    const monthMap = new Map(months.map((m) => [m.key, m]));

    let totalRevenue = 0;
    let totalBookings = 0;
    let pendingCount = 0;
    let confirmedCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let totalHours = 0;
    let hoursCount = 0;
    const sessionCounts = new Map();

    for (const booking of bookings) {
      const monthKey = String(booking.date).slice(0, 7);
      const nonCancelled = booking.status !== 'CANCELLED';
      const revenueEligible = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED';

      if (revenueEligible) {
        totalRevenue += booking.subtotal;
      }

      if (nonCancelled) {
        totalBookings += 1;
        totalHours += booking.hours;
        hoursCount += 1;
      }

      if (booking.status === 'PENDING') pendingCount += 1;
      else if (booking.status === 'CONFIRMED') confirmedCount += 1;
      else if (booking.status === 'COMPLETED') completedCount += 1;
      else if (booking.status === 'CANCELLED') cancelledCount += 1;

      sessionCounts.set(booking.sessionType, (sessionCounts.get(booking.sessionType) || 0) + 1);

      const monthStat = monthMap.get(monthKey);
      if (monthStat) {
        if (revenueEligible) {
          monthStat.revenue += booking.subtotal;
        }
        if (nonCancelled) {
          monthStat.bookings += 1;
        }
      }
    }

    const topSessionTypes = Array.from(sessionCounts.entries())
      .map(([sessionType, count]) => ({ sessionType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const monthlyData = months.map((m) => ({
      month: m.month,
      revenue: Math.round(m.revenue * 100) / 100,
      bookings: m.bookings,
    }));

    return res.json({
      monthly: monthlyData,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalBookings,
      pendingCount,
      topSessionTypes,
      averageSessionHours: hoursCount ? Math.round((totalHours / hoursCount) * 100) / 100 : 0,
      bookingStatusBreakdown: {
        pending: pendingCount,
        confirmed: confirmedCount,
        completed: completedCount,
        cancelled: cancelledCount,
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
