// Regression guard for the slug bug: /company/att (and any punctuated name)
// rendered blank because the lookup derived a LIKE prefix from the stripped slug
// and matched it against the raw company column ("at&t" never starts with "att").
// The fix keys links, the indexed notices.slug column, and prerender off ONE
// companySlug fn. This asserts that fn, and that the reported slugs actually
// group >=1 notice in the shipped data.
//
// Run: node scripts/slug.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { companySlug } from "../src/slug.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// Punctuation/suffix cases that the old prefix scan could not match.
assert.equal(companySlug("AT&T"), "att");
assert.equal(companySlug("AT&T Corp."), "att");
assert.equal(companySlug("A. O. Smith"), "a-o-smith");
assert.equal(companySlug("C&S Wholesale Services"), "cs-wholesale-services");
assert.equal(companySlug("The Boeing Company"), "boeing");
assert.equal(companySlug(""), "unknown");

// Every reported soft-404 slug must resolve to >=1 notice under slug grouping,
// i.e. the company page will not be blank.
const notices = JSON.parse(readFileSync(path.join(ROOT, "public/data/notices.json"), "utf8"));
const bySlug = new Map();
for (const n of notices) bySlug.set(companySlug(n.company), (bySlug.get(companySlug(n.company)) ?? 0) + 1);
for (const slug of ["att", "a-o-smith", "cs-wholesale-services", "mt-zion-flat-glass-mfg-plant"]) {
  assert.ok((bySlug.get(slug) ?? 0) > 0, `slug "${slug}" resolves no notices`);
}

console.log("slug.test.mjs: all assertions passed");
