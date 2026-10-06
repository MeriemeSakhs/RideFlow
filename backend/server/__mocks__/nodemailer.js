// Jest manual mock for the nodemailer package itself. Placed in a
// __mocks__ directory adjacent to node_modules (not under utilities/),
// which is Jest's convention for mocking a node_modules package - Jest
// applies it to every test automatically, no jest.mock('nodemailer') call
// needed anywhere.
//
// This is a second, independent safety net beyond mocking utilities/mailer
// in __tests__/testSetup.js: even if some future code path called
// nodemailer directly (bypassing utilities/mailer.js), this still
// guarantees no test can ever open a real SMTP connection or send a real
// email, regardless of what SMTP_USER/SMTP_APP_PASSWORD are set to in the
// real .env.
const createTransport = jest.fn(() => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: 'jest-mock-message-id' }),
}));

module.exports = { createTransport };
