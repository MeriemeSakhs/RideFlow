const z = require('zod')

// zod 3.19 has no z.coerce, so dates are coerced manually (see rideValidator.js for the same pattern)
const dateOfBirthField = z.preprocess(value => {
  if (value === undefined || value === null || value === '') return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed;
}, z.date({ invalid_type_error: 'A valid date of birth is required', required_error: 'Date of birth is required' }))
  .refine(date => date.getTime() <= Date.now(), { message: 'Date of birth cannot be in the future' });

// Dispatcher and Manager collect identical fields at signup - only the role differs.
// Driver is never a valid signup role: drivers are added by a manager, not self-registered.
const userValidation = data => {
  const registerValidationSchema = z.object({
    fullName: z.string().trim().min(1, 'Full name is required').max(200, 'Full name must be 200 characters or fewer'),
    dateOfBirth: dateOfBirthField,
    email: z.string().trim().email('Please input a valid email').transform(v => v.toLowerCase()),
    password: z.string().min(8, 'Password must be 8 or more characters').trim(),
    confirmPassword: z.string().min(1, 'Please confirm your password').trim(),
    companyName: z.string().trim().min(1, 'Company name is required').max(200, 'Company name must be 200 characters or fewer'),
    role: z.enum(['dispatcher', 'manager'], { errorMap: () => ({ message: 'Role must be either dispatcher or manager' }) }),
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

  return registerValidationSchema.safeParse(data)
};

// login is by email now (the signup form never collects a username)
const userLoginValidation = data => {
  const loginValidationSchema = z.object({
    email: z.string().trim().email('Please input a valid email').transform(v => v.toLowerCase()),
    password: z.string().min(1, 'Password is required').trim(),
  });
  return loginValidationSchema.safeParse(data)
};

module.exports.userValidation = userValidation;
module.exports.userLoginValidation = userLoginValidation;
