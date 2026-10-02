const z = require('zod')
const mongoose = require('mongoose')

//zod 3.19 has no z.coerce, so dates are coerced manually via preprocess
const dateField = z.preprocess(value => {
  if (value === undefined || value === null || value === '') return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed;
}, z.date({ invalid_type_error: 'A valid ride date/time is required', required_error: 'Ride date is required' }))

const locationField = z.string().trim().min(1, 'Location is required').max(200, 'Location must be 200 characters or fewer')
const nameField = z.string().trim().min(1, 'Passenger name is required').max(200, 'Passenger name must be 200 characters or fewer')
//E.164 format, e.g. +15551234567 - required for Twilio SMS delivery
const phoneField = z.string().trim().regex(/^\+[1-9]\d{6,14}$/, 'Phone number must be in E.164 format, e.g. +15551234567')
const vehicleTypeField = z.string().trim().min(1, 'Vehicle type is required').max(50, 'Vehicle type must be 50 characters or fewer')
const passengerCountField = z.number({ invalid_type_error: 'Passenger count must be a number' }).int('Passenger count must be a whole number').min(1, 'Passenger count must be at least 1').max(20, 'Passenger count must be 20 or fewer')
const notesField = z.string().trim().max(1000, 'Notes must be 1000 characters or fewer')
// Optional - no real distance/travel-time engine exists yet (see
// utilities/driverSchedule.js), so this lets a ride carry its own known/
// estimated duration when one is available; omitted rides fall back to the
// configurable default there. Capped at 24h as a sanity bound, not a real
// business rule.
// .nullable() so a dispatcher can explicitly clear a previously-set
// duration back to "unknown" when editing, not just set a new one.
const estimatedDurationMinutesField = z.number({ invalid_type_error: 'Estimated duration must be a number' }).int('Estimated duration must be a whole number of minutes').positive('Estimated duration must be greater than 0').max(1440, 'Estimated duration must be 24 hours or fewer').nullable()
// Optional - when provided, the ride is priced through the pricing engine
// (see utilities/pricingEngine.js) at creation time using the company's own
// PriceRule rates; omitted entirely (the default today, since no UI sends
// this yet) leaves ride creation behaving exactly as before. vehicleId
// references an actual Vehicle (see models/vehiculeModel.js), separate from
// the ride's own free-text vehicleType field above - pricing rules are keyed
// by the real vehicle, not that label.
const pricingTypeField = z.enum(['point-to-point', 'hourly'], { invalid_type_error: 'Pricing type must be "point-to-point" or "hourly"' })
const durationHoursField = z.number({ invalid_type_error: 'Duration must be a number' }).positive('Duration must be greater than 0').max(24, 'Duration must be 24 hours or fewer')
const vehicleIdField = z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), { message: 'A valid vehicle is required for pricing' })
// Already-resolved coordinates, from the address autocomplete the
// dispatcher used to select pickup/drop-off/each stop (see
// routes/geocodeRoutes.js) - never trusted as free text alone. Optional at
// the schema level (rides can still be created without them, same as
// before this field existed); required specifically for point-to-point
// pricing, enforced by the refine below.
const coordinatesField = z.object({
  lat: z.number({ invalid_type_error: 'Latitude must be a number' }).min(-90).max(90),
  lng: z.number({ invalid_type_error: 'Longitude must be a number' }).min(-180).max(180),
})
const stopField = z.object({
  address: locationField,
  coordinates: coordinatesField,
})

//validates a new ride request created by a dispatcher
const rideCreateValidation = data => {
  const rideCreateSchema = z.object({
    pickupLocation: locationField,
    dropoffLocation: locationField,
    rideDate: dateField,
    passengerName: nameField,
    passengerPhone: phoneField,
    vehicleType: vehicleTypeField,
    passengerCount: passengerCountField,
    notes: notesField.optional().default(''),
    estimatedDurationMinutes: estimatedDurationMinutesField.optional(),
    pricingType: pricingTypeField.optional(),
    durationHours: durationHoursField.optional(),
    vehicleId: vehicleIdField.optional(),
    pickupCoordinates: coordinatesField.optional(),
    dropoffCoordinates: coordinatesField.optional(),
    stops: z.array(stopField).max(10, 'No more than 10 stops are allowed').optional().default([]),
  }).refine(data => data.pickupLocation.toLowerCase() !== data.dropoffLocation.toLowerCase(), {
    message: 'Pickup and dropoff locations cannot be the same',
    path: ['dropoffLocation'],
  }).refine(data => data.rideDate.getTime() >= Date.now(), {
    message: 'Ride date cannot be in the past',
    path: ['rideDate'],
  }).refine(data => data.pricingType !== 'hourly' || data.durationHours !== undefined, {
    message: 'Duration (in hours) is required for hourly pricing',
    path: ['durationHours'],
  }).refine(data => !data.pricingType || data.vehicleId !== undefined, {
    message: 'A vehicle is required for pricing',
    path: ['vehicleId'],
  }).refine(data => data.pricingType !== 'point-to-point' || !!data.pickupCoordinates, {
    message: 'A selected pickup address (with coordinates) is required for point-to-point pricing',
    path: ['pickupCoordinates'],
  }).refine(data => data.pricingType !== 'point-to-point' || !!data.dropoffCoordinates, {
    message: 'A selected drop-off address (with coordinates) is required for point-to-point pricing',
    path: ['dropoffCoordinates'],
  });

  return rideCreateSchema.safeParse(data)
};

//validates dispatcher edits to an existing ride's details (not status/assignment)
const rideUpdateValidation = data => {
  const rideUpdateSchema = z.object({
    pickupLocation: locationField.optional(),
    dropoffLocation: locationField.optional(),
    rideDate: dateField.optional(),
    passengerName: nameField.optional(),
    passengerPhone: phoneField.optional(),
    vehicleType: vehicleTypeField.optional(),
    passengerCount: passengerCountField.optional(),
    notes: notesField.optional(),
    estimatedDurationMinutes: estimatedDurationMinutesField.optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  }).refine(data => data.rideDate === undefined || data.rideDate.getTime() >= Date.now(), {
    message: 'Ride date cannot be in the past',
    path: ['rideDate'],
  });

  return rideUpdateSchema.safeParse(data)
};

module.exports.rideCreateValidation = rideCreateValidation;
module.exports.rideUpdateValidation = rideUpdateValidation;
