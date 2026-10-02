const z = require('zod')
const mongoose = require('mongoose')

const currentYear = new Date().getFullYear()

const vehicleIdField = z.string().trim().min(1, 'Vehicle ID is required').max(50, 'Vehicle ID must be 50 characters or fewer')
const vehicleTypeField = z.string().trim().min(1, 'Vehicle type is required').max(50, 'Vehicle type must be 50 characters or fewer')
const yearField = z.number({ invalid_type_error: 'Year must be a number' }).int('Year must be a whole number').min(1980, 'Year must be 1980 or later').max(currentYear + 1, `Year must be ${currentYear + 1} or earlier`)
const makeField = z.string().trim().min(1, 'Make is required').max(100, 'Make must be 100 characters or fewer')
const modelField = z.string().trim().min(1, 'Model is required').max(100, 'Model must be 100 characters or fewer')
const licensePlateField = z.string().trim().min(1, 'License plate is required').max(20, 'License plate must be 20 characters or fewer')
// References an actual Driver document - ownership (does this driver belong
// to the caller's company) is checked separately in routes/vehicleRoutes.js.
// .nullable() lets a manager explicitly clear an assignment, not just set one.
const assignedDriverField = z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), { message: 'Invalid driver' }).nullable()
const mileageField = z.number({ invalid_type_error: 'Mileage must be a number' }).min(0, 'Mileage cannot be negative')
const statusField = z.enum(['active', 'maintenance', 'inactive'], { invalid_type_error: 'Status must be "active", "maintenance", or "inactive"' })

const vehicleCreateValidation = data => {
  const vehicleCreateSchema = z.object({
    vehicleId: vehicleIdField,
    vehicleType: vehicleTypeField,
    year: yearField,
    make: makeField,
    model: modelField,
    licensePlate: licensePlateField,
    assignedDriver: assignedDriverField.optional(),
    mileage: mileageField.optional().default(0),
    status: statusField.optional().default('active'),
  });
  return vehicleCreateSchema.safeParse(data)
};

// validates a manager editing an existing vehicle - vehicleId is
// deliberately NOT accepted here (see models/vehiculeModel.js's comment on
// why it's immutable once set); status changes here are for
// active/maintenance only - deletion goes through PATCH /:id/remove instead.
const vehicleUpdateValidation = data => {
  const vehicleUpdateSchema = z.object({
    vehicleType: vehicleTypeField.optional(),
    year: yearField.optional(),
    make: makeField.optional(),
    model: modelField.optional(),
    licensePlate: licensePlateField.optional(),
    assignedDriver: assignedDriverField.optional(),
    mileage: mileageField.optional(),
    status: statusField.optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });
  return vehicleUpdateSchema.safeParse(data)
};

module.exports.vehicleCreateValidation = vehicleCreateValidation;
module.exports.vehicleUpdateValidation = vehicleUpdateValidation;
