const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const { profileUpdateValidation, changePasswordValidation, verifyEmailCodeValidation, dispatcherCreateValidation } = require("../models/userValidator");
const { generateAccessToken } = require("../utilities/generateToken");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sendEmailChangeCode } = require("../utilities/mailer");

const CODE_EXPIRY_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

const hashCode = (code) => crypto.createHash("sha256").update(code).digest("hex");
const generateCode = () => String(crypto.randomInt(100000, 1000000));

// Self-service - always operates on req.user.id from the verified token,
// never a client-supplied id, so a user can only ever read/edit their own record.
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select("-password -emailVerificationCodeHash");
    if (!user) return res.status(404).send({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).send({ message: "Could not retrieve profile" });
  }
});

router.put("/profile", requireAuth, async (req, res) => {
  const { success, data, error } = profileUpdateValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).send({ message: "User not found" });

    const emailChanged = data.email && data.email !== user.email;

    if (emailChanged) {
      const existingUser = await userModel.findOne({ email: data.email, _id: { $ne: req.user.id } });
      if (existingUser) return res.status(409).send({ message: "An account with this email already exists" });

      const code = generateCode();
      try {
        await sendEmailChangeCode(data.email, code);
      } catch (mailErr) {
        console.error("Failed to send email-change verification code:", mailErr.message);
        return res.status(502).send({ message: "Could not send the verification email. Please try again later." });
      }

      user.fullName = data.fullName;
      user.phone = data.phone;
      user.pendingEmail = data.email;
      user.emailVerificationCodeHash = hashCode(code);
      user.emailVerificationExpires = new Date(Date.now() + CODE_EXPIRY_MS);
      user.emailVerificationAttempts = 0;
      await user.save();

      return res.send({
        pendingEmailVerificationRequired: true,
        pendingEmail: user.pendingEmail,
        message: `A 6-digit code was sent to ${user.pendingEmail}. Enter it to confirm your new email.`,
      });
    }

    // Email unchanged (or being re-submitted as-is) - clear any stale pending
    // verification from an earlier, never-completed email change attempt.
    user.fullName = data.fullName;
    user.phone = data.phone;
    user.pendingEmail = null;
    user.emailVerificationCodeHash = null;
    user.emailVerificationExpires = null;
    user.emailVerificationAttempts = 0;
    await user.save();

    const { password: _password, emailVerificationCodeHash: _hash, ...userWithoutSecrets } = user.toObject();
    const accessToken = generateAccessToken(user);
    res.send({ user: userWithoutSecrets, accessToken });
  } catch (err) {
    res.status(400).send({ message: "Could not update profile" });
  }
});

router.post("/verify-email-change", requireAuth, async (req, res) => {
  const { success, data, error } = verifyEmailCodeValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).send({ message: "User not found" });

    if (!user.pendingEmail || !user.emailVerificationCodeHash) {
      return res.status(400).send({ message: "No email change is pending" });
    }

    if (user.emailVerificationExpires < new Date()) {
      return res.status(400).send({ message: "This code has expired. Please request a new one." });
    }

    if (user.emailVerificationAttempts >= MAX_VERIFY_ATTEMPTS) {
      return res.status(429).send({ message: "Too many incorrect attempts. Please request a new code." });
    }

    if (hashCode(data.code) !== user.emailVerificationCodeHash) {
      user.emailVerificationAttempts += 1;
      await user.save();
      return res.status(400).send({ message: "Incorrect code. Please try again." });
    }

    user.email = user.pendingEmail;
    user.pendingEmail = null;
    user.emailVerificationCodeHash = null;
    user.emailVerificationExpires = null;
    user.emailVerificationAttempts = 0;
    await user.save();

    const { password: _password, emailVerificationCodeHash: _hash, ...userWithoutSecrets } = user.toObject();
    const accessToken = generateAccessToken(user);
    res.send({ user: userWithoutSecrets, accessToken });
  } catch (err) {
    res.status(500).send({ message: "Could not verify the code" });
  }
});

router.post("/resend-email-change-code", requireAuth, async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).send({ message: "User not found" });
    if (!user.pendingEmail) return res.status(400).send({ message: "No email change is pending" });

    const code = generateCode();
    try {
      await sendEmailChangeCode(user.pendingEmail, code);
    } catch (mailErr) {
      console.error("Failed to resend email-change verification code:", mailErr.message);
      return res.status(502).send({ message: "Could not send the verification email. Please try again later." });
    }

    user.emailVerificationCodeHash = hashCode(code);
    user.emailVerificationExpires = new Date(Date.now() + CODE_EXPIRY_MS);
    user.emailVerificationAttempts = 0;
    await user.save();

    res.send({ message: `A new code was sent to ${user.pendingEmail}.` });
  } catch (err) {
    res.status(500).send({ message: "Could not resend the code" });
  }
});

router.put("/change-password", requireAuth, async (req, res) => {
  const { success, data, error } = changePasswordValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).send({ message: "User not found" });

    const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isCurrentPasswordValid) return res.status(401).send({ message: "Current password is incorrect" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(data.newPassword, salt);
    await user.save();

    res.send({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).send({ message: "Could not update password" });
  }
});

// Powers the Manager's Team Hours view - lets dispatchers with zero punch
// sessions still show up as "Clocked Out" instead of only appearing once
// they've punched in for the first time.
router.get("/dispatchers", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const dispatchers = await userModel
      .find({ role: "dispatcher", companyId: req.user.companyId })
      .select("fullName email");
    res.json(dispatchers);
  } catch (err) {
    res.status(500).send({ message: "Could not retrieve dispatchers" });
  }
});

// A Manager creating an account for a Dispatcher on their own team.
// companyId is always req.user.companyId from the verified token - the
// request body has no companyId field at all, so there's nothing to trust
// or ignore; a Dispatcher can never end up in a company other than the
// Manager's own by calling this differently.
router.post("/dispatchers", requireAuth, requireRole("manager"), async (req, res) => {
  const { success, data, error } = dispatcherCreateValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  try {
    const existingUser = await userModel.findOne({ email: data.email });
    if (existingUser) return res.status(409).send({ message: "An account with this email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const newDispatcher = new userModel({
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      email: data.email,
      password: hashedPassword,
      role: "dispatcher",
      companyId: req.user.companyId,
      companyName: req.user.companyName,
    });
    const savedDispatcher = await newDispatcher.save();

    const { password: _password, ...dispatcherWithoutPassword } = savedDispatcher.toObject();
    res.status(201).send(dispatcherWithoutPassword);
  } catch (err) {
    res.status(400).send({ message: "Could not create the dispatcher account" });
  }
});

module.exports = router;
