const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const userModel = require('../models/userModel')
const companyModel = require('../models/companyModel')
const { userValidation, verifyEmailCodeValidation } = require('../models/userValidator');
const { generateUniqueReferenceNumber } = require('../utilities/companyReference');
const { generateUniqueSlug } = require('../utilities/companySlug');
const { sendSignupVerificationCode } = require('../utilities/mailer');
const { generateAccessToken } = require('../utilities/generateToken');
const { CODE_EXPIRY_MS, MAX_VERIFY_ATTEMPTS, RESEND_COOLDOWN_MS, generateCode, hashCode } = require('../utilities/verificationCode');

// Public self-signup always creates a brand-new Company and its Manager.
// Dispatcher accounts are never self-registered - see routes/userProfile.js's
// POST /dispatchers, which a logged-in Manager uses instead.
router.post('/signup', async (req, res) => {
    const { success, data, error } = userValidation(req.body);
    if (!success) return res.status(400).send({ message: error.errors[0].message });

    const { fullName, dateOfBirth, email, password, companyName } = data

    try {
        const existingUser = await userModel.findOne({ email })
        if (existingUser) return res.status(409).send({ message: "An account with this email already exists" })

        const referenceNumber = await generateUniqueReferenceNumber();
        const slug = await generateUniqueSlug(companyName);
        const newCompany = new companyModel({ companyName, referenceNumber, slug });
        const savedCompany = await newCompany.save();

        try {
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(password, salt)
            const code = generateCode();

            const newUser = new userModel({
                fullName,
                dateOfBirth,
                email,
                password: hashedPassword,
                companyName,
                companySlug: savedCompany.slug,
                companyId: savedCompany._id,
                role: 'manager',
                // Public self-signup is the one place that overrides the
                // schema's default(true) - see models/userModel.js.
                isEmailVerified: false,
                emailVerificationCodeHash: hashCode(code),
                emailVerificationExpires: new Date(Date.now() + CODE_EXPIRY_MS),
                emailVerificationAttempts: 0,
            })
            const savedUser = await newUser.save()

            // The account is already durably created at this point - a failed
            // send is reported to the frontend (so "Resend" can retry) but
            // never undoes the signup, same non-destructive-side-effect
            // pattern used for driver-assignment SMS.
            let verificationSent = true;
            try {
                await sendSignupVerificationCode(savedUser.email, savedUser.fullName, code);
            } catch (mailErr) {
                console.error("Failed to send signup verification email:", mailErr.message);
                verificationSent = false;
            }

            res.status(201).send({
                message: verificationSent
                    ? "Account created. Check your email for a verification code."
                    : "Account created, but the verification email could not be sent. Use Resend on the next screen.",
                email: savedUser.email,
                verificationSent,
                companySlug: savedCompany.slug,
            })
        } catch (userErr) {
            // Don't leave an orphaned Company record behind if the manager
            // account itself couldn't be created.
            await companyModel.deleteOne({ _id: savedCompany._id });
            throw userErr;
        }
    } catch (err) {
        res.status(400).send({ message: "Error trying to create new user" })
    }
})

// Public - the user has no JWT yet at this point in the flow, they only have
// the email they just signed up with plus the code from their inbox.
router.post('/verify-signup-email', async (req, res) => {
    const { success, data, error } = verifyEmailCodeValidation(req.body);
    if (!success) return res.status(400).send({ message: error.errors[0].message });

    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).send({ message: "Email is required" });

    try {
        const user = await userModel.findOne({ email });
        if (!user) return res.status(404).send({ message: "Account not found" });

        if (user.isEmailVerified) {
            return res.status(400).send({ message: "This email is already verified. Please log in." });
        }
        if (!user.emailVerificationCodeHash || !user.emailVerificationExpires) {
            return res.status(400).send({ message: "No pending verification. Please request a new code." });
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

        user.isEmailVerified = true;
        user.emailVerificationCodeHash = null;
        user.emailVerificationExpires = null;
        user.emailVerificationAttempts = 0;
        await user.save();

        const accessToken = generateAccessToken(user);
        const { password: _password, emailVerificationCodeHash: _hash, ...userWithoutSecrets } = user.toObject();
        res.send({ message: "Email verified successfully.", user: userWithoutSecrets, accessToken });
    } catch (err) {
        res.status(500).send({ message: "Could not verify the code" });
    }
});

// Public, rate-limited by RESEND_COOLDOWN_MS (derived from the existing
// emailVerificationExpires field rather than a new "last sent" field).
router.post('/resend-signup-verification', async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).send({ message: "Email is required" });

    try {
        const user = await userModel.findOne({ email });
        if (!user) return res.status(404).send({ message: "Account not found" });
        if (user.isEmailVerified) return res.status(400).send({ message: "This email is already verified. Please log in." });

        if (user.emailVerificationExpires) {
            const sentAt = user.emailVerificationExpires.getTime() - CODE_EXPIRY_MS;
            const nextAllowedAt = sentAt + RESEND_COOLDOWN_MS;
            if (Date.now() < nextAllowedAt) {
                const waitSeconds = Math.ceil((nextAllowedAt - Date.now()) / 1000);
                return res.status(429).send({ message: `Please wait ${waitSeconds}s before requesting another code.` });
            }
        }

        const code = generateCode();
        try {
            await sendSignupVerificationCode(user.email, user.fullName, code);
        } catch (mailErr) {
            console.error("Failed to resend signup verification email:", mailErr.message);
            return res.status(502).send({ message: "Could not send the verification email. Please try again later." });
        }

        user.emailVerificationCodeHash = hashCode(code);
        user.emailVerificationExpires = new Date(Date.now() + CODE_EXPIRY_MS);
        user.emailVerificationAttempts = 0;
        await user.save();

        res.send({ message: "Verification code sent. Please check your email." });
    } catch (err) {
        res.status(500).send({ message: "Could not resend the code" });
    }
});

module.exports = router;
