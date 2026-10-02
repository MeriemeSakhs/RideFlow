const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    // Email changes require confirming a code sent to the NEW address before
    // the real `email` field is ever touched - these hold that transient state.
    pendingEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },

    emailVerificationCodeHash: {
      type: String,
      default: null,
    },

    emailVerificationExpires: {
      type: Date,
      default: null,
    },

    emailVerificationAttempts: {
      type: Number,
      default: 0,
    },

    // Defaults to true deliberately, not false: Mongoose applies this default
    // on read for any document that lacks the field (including every real
    // user that existed before this feature shipped), so pre-existing
    // accounts and manager-created dispatchers are verified automatically -
    // no migration script needed. Public self-signup (routes/userSignUp.js)
    // is the one place that explicitly overrides this to false.
    isEmailVerified: {
      type: Boolean,
      default: true,
    },

    // Same reasoning as isEmailVerified above - defaults true so it can never
    // retroactively deactivate an existing account. Only set to false by a
    // Manager removing a Dispatcher (routes/userProfile.js).
    isActive: {
      type: Boolean,
      default: true,
    },

    role: {
      type: String,
      enum: ["dispatcher", "manager"],
      required: true,
    },

    // The real tenant boundary - every company-scoped query filters by this,
    // read only from the verified JWT (see utilities/generateToken.js and
    // middleware/auth.js), never trusted from a request body. companyName/
    // companySlug below are denormalized display fields only.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "companies",
      required: true,
    },

    // Free-text company name as entered by the user. companySlug is the
    // normalized (trimmed/lowercased) form; both are display-only now that
    // companyId is the actual security boundary.
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    // The company's real, unique, URL-safe Company.slug (see
    // utilities/companySlug.js) - explicitly set from that authoritative
    // value at both places a user is ever created (routes/userSignUp.js for
    // a new Manager+Company, routes/userProfile.js's POST /dispatchers for
    // a Dispatcher joining an existing company), not auto-derived here.
    // Previously this was guessed from companyName via a pre-validate hook
    // (lowercase, spaces kept) - that guess was never guaranteed unique or
    // URL-safe, so it couldn't be trusted once company URLs needed a real
    // unique slug; explicit assignment from Company.slug is what makes it
    // correct.
    companySlug: {
      type: String,
      required: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },

  { collection: "users" }
);

module.exports = mongoose.model("users", userSchema);
