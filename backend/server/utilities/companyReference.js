const crypto = require("crypto");
const Company = require("../models/companyModel");

// Excludes visually ambiguous characters (0/O, 1/I) so the code stays easy
// to read and type, per the "RF-8K42M7" style example.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const randomSegment = (length) =>
  Array.from({ length }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join("");

// Generates a unique "RF-XXXXXX" reference number, retrying on the rare
// collision. Uniqueness is enforced by the schema too (referenceNumber is
// `unique: true`), this just avoids a failed insert in the common case.
const generateUniqueReferenceNumber = async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `RF-${randomSegment(6)}`;
    const existing = await Company.findOne({ referenceNumber: candidate });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique company reference number");
};

module.exports = { generateUniqueReferenceNumber };
