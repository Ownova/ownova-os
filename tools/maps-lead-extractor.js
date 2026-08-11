/**
 * Ownova OS — Google Maps lead extractor
 * ======================================
 *
 * Paste into the browser console on a Google Maps *search results* page, e.g.
 *   https://www.google.com/maps/search/dental+clinics+in+Dubai
 *
 * Costs nothing — no API key, no scraping service, no monthly bill.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THIS OPENS EACH LISTING
 *
 * The first version read the result *cards* and reported 27 of 28 businesses as having "no
 * website". That was wrong. Maps result cards do not contain the website or the phone number —
 * only 2 of 28 even had a phone. Both live in the detail panel, which means each listing has to
 * be opened.
 *
 * That makes this slower (~4s per business) but the data is real. A fast scrape that tells you
 * every clinic in Dubai lacks a website is worse than no scrape, because you would act on it.
 * ---------------------------------------------------------------------------------------------
 *
 * ALSO READ
 *
 * 1. Scraping Google Maps is against Google's Terms of Service. Civil matter, public data, your
 *    call. Practical risk is a temporary IP block.
 * 2. Pacing is deliberate. Lower the delays and you will get rate-limited.
 * 3. Cold email is NOT lawful in Saudi Arabia, Qatar, Kuwait or Oman without prior consent.
 *    Check the badge in CRM before emailing. UAE and USA are the safe ones.
 */

const OWNOVA_ENDPOINT = "https://os.ownova.org/api/intake/lead";
const OWNOVA_SECRET = "HfrOCckNNPrt-dxlTJe5iflCzzZMNpPgoheq8iFBx6msACs6";

/** Must match the CRM compliance list exactly, or the lead is flagged red as unknown. */
const COUNTRY = "United Arab Emirates";
/** e.g. "Dental Clinic". Stored on the lead so you can segment later. */
const INDUSTRY = "Dental Clinic";
/** How many listings to open. Each takes ~4 seconds. */
const MAX_PLACES = 20;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadResults() {
  const feed = document.querySelector('div[role="feed"]');
  if (!feed) throw new Error("Not a Maps search results page.");
  let last = 0;
  for (let i = 0; i < 10; i++) {
    feed.scrollTop = feed.scrollHeight;
    await sleep(1800);
    const n = feed.querySelectorAll('a[href*="/maps/place/"]').length;
    console.log(`scroll ${i + 1} — ${n} listings`);
    if (n === last && i > 1) break;
    last = n;
  }
  return [...new Set(Array.from(feed.querySelectorAll('a[href*="/maps/place/"]')).map((a) => a.href))];
}

/**
 * Reads the detail panel. Also grabs category and review count, because a lead you know nothing
 * about is a lead nobody calls — the note is what makes outreach possible.
 */
function readPanel() {
  const t = (el, strip) =>
    el ? (el.getAttribute("aria-label") || "").replace(strip, "").trim() : null;

  const h1 = document.querySelector("h1");
  const site = document.querySelector('a[data-item-id="authority"]');
  const reviews = document.querySelector('button[aria-label*="review"]');

  return {
    name: h1 ? h1.textContent.trim() : null,
    website: site ? site.href.split("?")[0] : null,
    phone: t(document.querySelector('button[data-item-id^="phone"]'), /^Phone:\s*/),
    address: t(document.querySelector('button[data-item-id="address"]'), /^Address:\s*/),
    rating: (document.querySelector('div.F7nice span[aria-hidden="true"]') || {}).textContent || null,
    reviews: reviews ? (reviews.getAttribute("aria-label") || "").trim() : null,
    category: (document.querySelector("button.DkEaL") || {}).textContent || null,
    hours: (document.querySelector('div[aria-label*="Hours"]') || {}).getAttribute?.("aria-label") || null,
  };
}

/** A short, factual brief so whoever makes contact isn't starting from a name and a phone number. */
function describe(b) {
  const bits = [];
  if (b.category) bits.push(b.category);
  if (b.address) bits.push(`Located at ${b.address}`);
  if (b.rating) bits.push(`Google rating ${b.rating}${b.reviews ? ` (${b.reviews})` : ""}`);
  if (!b.website) bits.push("NO WEBSITE — strongest buying signal; they are losing enquiries to competitors who rank");
  else if (b.website.startsWith("http://")) bits.push(`Website ${b.website} is HTTP-only — browsers show "Not secure", a visible trust problem`);
  else bits.push(`Website: ${b.website}`);
  if (b.hours && /24/.test(b.hours)) bits.push("Open 24 hours — enquiries arrive with nobody on the desk, strong case for automated response");
  return bits.join(". ") + ".";
}

async function send(b) {
  const res = await fetch(OWNOVA_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ownova-secret": OWNOVA_SECRET },
    body: JSON.stringify({
      source: "google_maps",
      externalId: `gmaps:${COUNTRY}:${b.name}`,
      name: b.name,
      company: b.name,
      phone: b.phone,
      website: b.website,
      country: COUNTRY,
      address: b.address,
      industry: INDUSTRY || b.category || "",
      "About the business": describe(b),
      "Google rating": b.rating || "not rated",
      "Reviews": b.reviews || "",
      "Has website": b.website ? "yes" : "NO - strong signal",
    }),
  });
  return res.json();
}

(async function run() {
  console.log("%cOwnova lead extractor", "font-weight:bold;font-size:14px");

  // Resume-safe: the walk survives the page navigations that opening each listing causes.
  if (!sessionStorage.ov_urls) {
    const urls = await loadResults();
    sessionStorage.ov_urls = JSON.stringify(urls.slice(0, MAX_PLACES));
    sessionStorage.ov_i = "0";
    sessionStorage.ov_out = "[]";
    console.log(`Queued ${Math.min(urls.length, MAX_PLACES)} listings. Opening each one...`);
    location.href = JSON.parse(sessionStorage.ov_urls)[0];
    return;
  }

  const urls = JSON.parse(sessionStorage.ov_urls);
  let i = Number(sessionStorage.ov_i);
  const out = JSON.parse(sessionStorage.ov_out);

  if (i < urls.length) {
    await sleep(1500);
    const b = readPanel();
    if (b.name) {
      out.push(b);
      sessionStorage.ov_out = JSON.stringify(out);
      console.log(`${out.length}/${urls.length}  ${b.name}  ${b.website ? "site" : "NO SITE"}`);
    }
    sessionStorage.ov_i = String(++i);
    if (i < urls.length) {
      location.href = urls[i];
      return; // Re-paste the script after it lands, or just run it again.
    }
  }

  console.log(`Collected ${out.length}. Sending to Ownova OS...`);
  let created = 0, dup = 0, failed = 0;
  for (const b of out) {
    try {
      const r = await send(b);
      if (r.duplicate) dup++; else if (r.ok) created++; else failed++;
    } catch (e) { failed++; console.warn(b.name, e); }
    await sleep(300);
  }
  console.log(`%cDone — ${created} new, ${dup} known, ${failed} failed.`, "color:#22d3ee;font-weight:bold");
  console.log(`${out.filter((b) => !b.website).length} have no website. Start there.`);
  console.log("CRM: https://os.ownova.org/crm");
  ["ov_urls", "ov_i", "ov_out"].forEach((k) => sessionStorage.removeItem(k));
})();
