const z = require('zod')

// Mirrors the E.164 phone rule already used for ride passengers (see
// rideValidator.js) - drivers will need the same format once SMS (Todo #8)
// is built, so validating it now avoids a re-entry/migration later.
const phoneField = z.string().trim().regex(/^\+[1-9]\d{6,14}$/, 'Phone number must be in E.164 format, e.g. +15551234567')

const driverCreateValidation = data => {
  const driverCreateSchema = z.object({
    name: z.string().trim().min(1, 'Driver name is required').max(200, 'Driver name must be 200 characters or fewer'),
    phone: phoneField,
    licenseNumber: z.string().trim().min(1, 'License number is required').max(50, 'License number must be 50 characters or fewer'),
  });
  return driverCreateSchema.safeParse(data)
};

module.exports.driverCreateValidation = driverCreateValidation;
