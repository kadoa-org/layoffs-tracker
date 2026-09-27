import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = route => fs.readFileSync(new URL(`../dist/layoffs/${route ? route + '/' : ''}index.html`, import.meta.url), 'utf8');
const seed = html => JSON.parse(html.match(/<script id="page-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const company = read('company/amazon');
assert.match(company, /Filing history/);
assert.match(company, /<table/);
const records = seed(company).data.rows;
assert(records.length > 0);
assert(records.every(row => row.slug === 'amazon'));
assert.match(company, new RegExp(`Notices filed[\\s\\S]*?>${records.length}<`));
assert(!company.includes('seo-shell'));
const state = read('state/CA');
assert.equal(seed(state).data.rows.length, seed(state).data.meta.notices, 'state download contains every notice');
const directory = read('companies/2');
assert.match(directory, /Layoffs by company, page 2/);
assert.match(directory, /rel="prev"/);
assert.match(directory, /rel="next"/);
const home = read('');
// States are linked from the States page, not from a block of links on the home page.
const statesPage = read('states');
for (const { state: code } of JSON.parse(fs.readFileSync(new URL('../public/data/states.json', import.meta.url), 'utf8'))) assert(statesPage.includes(`/layoffs/state/${code}`), `States page links ${code}`);
assert(!home.includes('Browse layoffs by state'), 'no browse link block on the home page');
assert.match(home, /Latest filings/);
console.log('Layoffs rendering: actual tables, complete downloads and crawlable directories verified');

const tennessee = read('state/TN');
const unnamedNotices = seed(tennessee).data.rows.filter(row => row.company === '.');
const sourceUnnamedNotices = JSON.parse(fs.readFileSync(new URL('../public/data/notices.json', import.meta.url), 'utf8'))
  .filter(row => row.state === 'TN' && row.company === '.');
assert.equal(unnamedNotices.length, sourceUnnamedNotices.length, 'keep every original notice with an unnamed company');
assert(!/href="\/layoffs\/company\/(?:unknown)?"/.test(tennessee), 'unnamed companies must not link to nonexistent company pages');
assert(tennessee.includes('href="/layoffs/company/kilgore-flares"'), 'named companies retain their detail links');
