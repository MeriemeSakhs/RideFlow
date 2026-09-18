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

    role: {
      type: String,
      enum: ["dispatcher", "manager"],
      required: true,
    },

    // Free-text company name as entered by the user. companySlug is the
    // normalized (trimmed/lowercased) form actually used to scope queries,
    // so two people at "Acme Transport" and "acme transport " still land
    // in the same tenant instead of being silently split by a casing typo.
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

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

userSchema.pre("validate", function (next) {
  if (this.companyName) {
    this.companySlug = this.companyName.trim().toLowerCase();
  }
  next();
});

module.exports = mongoose.model("users", userSchema);
