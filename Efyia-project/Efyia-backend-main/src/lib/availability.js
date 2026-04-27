'use strict';

function parseTimeToMinutes(value) {
  if (typeof value !== 'string') return NaN;

  const ampm = value.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = Number(ampm[2]);
    const marker = ampm[3].toUpperCase();

    if (hour === 12) hour = 0;
    if (marker === 'PM') hour += 12;

    return hour * 60 + minute;
  }

  const hhmm = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!hhmm) return NaN;

  const hour = Number(hhmm[1]);
  const minute = Number(hhmm[2]);
  return hour * 60 + minute;
}

function hasOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

async function checkAvailability(prisma, studioId, date, time, hours) {
  const dt = new Date(date + 'T00:00:00');
  const dayOfWeek = dt.getDay();

  const schedule = await prisma.studioSchedule.findUnique({
    where: {
      studioId_dayOfWeek: {
        studioId,
        dayOfWeek,
      },
    },
  });

  if (schedule && !schedule.isOpen) {
    return { available: false, reason: 'Studio is closed on this day.' };
  }

  const startMinutes = parseTimeToMinutes(time);
  const endMinutes = startMinutes + Number(hours) * 60;

  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) {
    return { available: false, reason: 'Invalid time value.' };
  }

  if (schedule && schedule.isOpen) {
    const openMinutes = parseTimeToMinutes(schedule.openTime);
    const closeMinutes = parseTimeToMinutes(schedule.closeTime);

    if (Number.isNaN(openMinutes) || Number.isNaN(closeMinutes) || startMinutes < openMinutes || endMinutes > closeMinutes) {
      return { available: false, reason: 'Outside studio hours.' };
    }
  }

  const blocks = await prisma.availabilityBlock.findMany({
    where: { studioId, date },
  });

  for (const block of blocks) {
    const blockStart = parseTimeToMinutes(block.startTime);
    const blockEnd = parseTimeToMinutes(block.endTime);

    if (hasOverlap(startMinutes, endMinutes, blockStart, blockEnd)) {
      return { available: false, reason: block.reason || 'This time is blocked.' };
    }
  }

  const bookings = await prisma.booking.findMany({
    where: {
      studioId,
      date,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: { time: true, hours: true },
  });

  for (const booking of bookings) {
    const bookedStart = parseTimeToMinutes(booking.time);
    const bookedEnd = bookedStart + Number(booking.hours) * 60;

    if (hasOverlap(startMinutes, endMinutes, bookedStart, bookedEnd)) {
      return { available: false, reason: 'This time slot is already booked.' };
    }
  }

  return { available: true, reason: null };
}

module.exports = { checkAvailability };
