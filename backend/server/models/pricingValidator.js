const z = require('zod')
const mongoose = require('mongoose')

// References an actual Vehicle document (see models/vehiculeModel.js) -
// ownership (does this vehicle belong to the caller's company) is checked
// separately in routes/pricingRoutes.js, since that requires a DB lookup
// this validator doesn't have access to. This only checks the shape.
const vehicleIdField = z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), { message: 'A valid vehicle is required' })
const pricingTypeField = z.enum(['point-to-point', 'hourly'], {
  invalid_type_error: 'Pricing type must be "point-to-point" or "hourly"',
  required_error: 'Pricing type is required',
})
// Sanity-capped, not a real business rule - just keeps obviously-wrong input
// (e.g. a stray extra zero) from being saved.
const rateField = z.number({ invalid_type_error: 'Rate must be a number' }).positive('Rate must be greater than 0').max(10000, 'Rate must be 10,000 or fewer')
const durationHoursField = z.number({ invalid_type_error: 'Duration must be a number' }).positive('Duration must be greater than 0').max(24, 'Duration must be 24 hours or fewer')
// Already-resolved coordinates (from the address autocomplete the caller
// used - see routes/geocodeRoutes.js), never address strings - the pricing
// engine does no geocoding of its own (see utilities/pricingEngine.js).
const waypointField = z.object({
  lat: z.number({ invalid_type_error: 'Latitude must be a number' }).min(-90).max(90),
  lng: z.number({ invalid_type_error: 'Longitude must be a number' }).min(-180).max(180),
})

// validates a manager creating a new pricing rule
const priceRuleCreateValidation = (data) => {
  const schema = z.object({
    vehicleId: vehicleIdField,
    pricingType: pricingTypeField,
    rate: rateField,
    active: z.boolean().optional().default(true),
  })
  return schema.safeParse(data)
}

// validates a manager editing an existing pricing rule - all fields optional,
// at least one required (same pattern as rideValidator.js's update schema)
const priceRuleUpdateValidation = (data) => {
  const schema = z.object({
    vehicleId: vehicleIdField.optional(),
    pricingType: pricingTypeField.optional(),
    rate: rateField.optional(),
    active: z.boolean().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  })
  return schema.safeParse(data)
}

// validates a price-calculation request (used by ride creation today, and
// reusable as-is by a future client reservation flow) - waypoints
// (pickup, then any stops, then drop-off; at least 2) are required for
// point-to-point, durationHours is required for hourly.
const calculateRequestValidation = (data) => {
  const schema = z.object({
    vehicleId: vehicleIdField,
    pricingType: pricingTypeField,
    waypoints: z.array(waypointField).optional(),
    durationHours: durationHoursField.optional(),
  }).superRefine((data, ctx) => {
    if (data.pricingType === 'point-to-point') {
      if (!data.waypoints || data.waypoints.length < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Pickup and drop-off coordinates are required for point-to-point pricing', path: ['waypoints'] })
    } else if (data.pricingType === 'hourly') {
      if (data.durationHours === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duration (in hours) is required for hourly pricing', path: ['durationHours'] })
    }
  })
  return schema.safeParse(data)
}

module.exports.priceRuleCreateValidation = priceRuleCreateValidation
module.exports.priceRuleUpdateValidation = priceRuleUpdateValidation
module.exports.calculateRequestValidation = calculateRequestValidation
