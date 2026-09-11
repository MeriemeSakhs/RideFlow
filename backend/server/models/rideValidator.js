const z = require('zod')

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

//validates a new ride request created by a dispatcher
const rideCreateValidation = data => {
  const rideCreateSchema = z.object({
    pickupLocation: locationField,
    dropoffLocation: locationField,
    rideDate: dateField,
    passengerName: nameField,
    passengerPhone: phoneField,
    vehicleType: vehicleTypeField,
  }).refine(data => data.pickupLocation.toLowerCase() !== data.dropoffLocation.toLowerCase(), {
    message: 'Pickup and dropoff locations cannot be the same',
    path: ['dropoffLocation'],
  }).refine(data => data.rideDate.getTime() >= Date.now(), {
    message: 'Ride date cannot be in the past',
    path: ['rideDate'],
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
