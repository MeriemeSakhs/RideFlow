const z = require('zod')

// zod 3.19 has no z.coerce, so dates are coerced manually (see rideValidator.js for the same pattern)
const dateOfBirthField = z.preprocess(value => {
  if (value === undefined || value === null || value === '') return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed;
}, z.date({ invalid_type_error: 'A valid date of birth is required', required_error: 'Date of birth is required' }))
  .refine(date => date.getTime() <= Date.now(), { message: 'Date of birth cannot be in the future' });

// Public self-signup always creates a new Company + its Manager - there is no
// role field here on purpose. Dispatcher accounts are never self-registered;
// see dispatcherCreateValidation below for how a Manager creates those instead.
const userValidation = data => {
  const registerValidationSchema = z.object({
    fullName: z.string().trim().min(1, 'Full name is required').max(200, 'Full name must be 200 characters or fewer'),
    dateOfBirth: dateOfBirthField,
    email: z.string().trim().email('Please input a valid email').transform(v => v.toLowerCase()),
    password: z.string().min(8, 'Password must be 8 or more characters').trim(),
    confirmPassword: z.string().min(1, 'Please confirm your password').trim(),
    companyName: z.string().trim().min(1, 'Company name is required').max(200, 'Company name must be 200 characters or fewer'),
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

  return registerValidationSchema.safeParse(data)
};

// A Manager creating a Dispatcher account for their own company. No
// companyName/role fields here - companyId is always taken from the
// Manager's own authenticated session (req.user.companyId), never the body.
const dispatcherCreateValidation = data => {
  const dispatcherCreateSchema = z.object({
    fullName: z.string().trim().min(1, 'Full name is required').max(200, 'Full name must be 200 characters or fewer'),
    dateOfBirth: dateOfBirthField,
    email: z.string().trim().email('Please input a valid email').transform(v => v.toLowerCase()),
    password: z.string().min(8, 'Password must be 8 or more characters').trim(),
    confirmPassword: z.string().min(1, 'Please confirm the password').trim(),
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

  return dispatcherCreateSchema.safeParse(data)
};

// login is by email now (the signup form never collects a username)
const userLoginValidation = data => {
  const loginValidationSchema = z.object({
    email: z.string().trim().email('Please input a valid email').transform(v => v.toLowerCase()),
    password: z.string().min(1, 'Password is required').trim(),
  });
  return loginValidationSchema.safeParse(data)
};

// Self-service profile edits. Deliberately excludes role/companyName/password -
// those are never accepted from this form, even if present in the request body.
const profileUpdateValidation = data => {
  const profileUpdateSchema = z.object({
    fullName: z.string().trim().min(1, 'Full name is required').max(200, 'Full name must be 200 characters or fewer'),
    email: z.string().trim().email('Please input a valid email').transform(v => v.toLowerCase()),
    phone: z.string().trim().max(30, 'Phone number must be 30 characters or fewer').optional().default(''),
  });
  return profileUpdateSchema.safeParse(data)
};

const changePasswordValidation = data => {
  const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be 8 or more characters').trim(),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password').trim(),
  }).refine(data => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  });
  return changePasswordSchema.safeParse(data)
};

const verifyEmailCodeValidation = data => {
  const verifyEmailCodeSchema = z.object({
    code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  });
  return verifyEmailCodeSchema.safeParse(data)
};

module.exports.userValidation = userValidation;
module.exports.dispatcherCreateValidation = dispatcherCreateValidation;
module.exports.userLoginValidation = userLoginValidation;
module.exports.profileUpdateValidation = profileUpdateValidation;
module.exports.changePasswordValidation = changePasswordValidation;
module.exports.verifyEmailCodeValidation = verifyEmailCodeValidation;
