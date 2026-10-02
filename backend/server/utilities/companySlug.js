const Company = require("../models/companyModel");

// Lowercase, alphanumeric + hyphens only, no leading/trailing/double
// hyphens - e.g. "Azrou Transportation" -> "azrou-transportation".
const slugify = (name) =>
  String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "company";

// Generates a unique, URL-safe slug from a company name, appending -2, -3,
// etc. on collision (e.g. two different companies both named "Metro").
// Mirrors the retry-until-unique pattern already used by
// utilities/companyReference.js for reference numbers.
const generateUniqueSlug = async (companyName) => {
  const base = slugify(companyName);
  let candidate = base;
  let suffix = 2;
  while (await Company.findOne({ slug: candidate })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

module.exports = { slugify, generateUniqueSlug };
