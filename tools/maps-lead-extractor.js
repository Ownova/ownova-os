/**
 * Ownova OS — Google Maps lead extractor
 * ======================================
 *
 * Paste into the browser console on a Google Maps *search results* page, e.g.
 *   https://www.google.com/maps/search/dental+clinics+in+Dubai
 *
 * It scrolls the results panel, reads each listing, and posts them to Ownova OS as CRM leads.
 * Costs nothing — no API key, no scraping service, no monthly bill.
 *
 * ---------------------------------------------------------------------------------------------
 * READ THIS FIRST
 *
 * 1. Scraping Google Maps is against Google's Terms of Service. It is a civil matter with Google
 *    rather than a criminal one, and the data here is public business-listing information, but
 *    the decision to run it is yours. The practical risk is a temporary IP block.
 *
 * 2. Pacing is deliberate. SCROLL_DELAY_MS is set high enough to look like a human reading
 *    results. Lower it and you will get rate-limited, which is the main way this stops working.
 *
 * 3. Google Maps rarely exposes email addresses. You get name, phone, website, rating and
 *    address. That is fine — the website is the useful part, because "no website" and "website
 *    from 2011" are the strongest buying signals Ownova has.
 *
 * 4. Leads land at stage `lead` with a compliance flag derived from country. Cold email is NOT
 *    lawful in Saudi Arabia, Qatar, Kuwait or Oman without prior consent. Check the badge in CRM
 *    before emailing anyone.
 * ---------------------------------------------------------------------------------------------
 */

const OWNOVA_ENDPOINT = "https://os.ownova.org/api/intake/lead";
const OWNOVA_SECRET = "HfrOCckNNPrt-dxlTJe5iflCzzZMNpPgoheq8iFBx6msACs6";

/** Which country these results are in. Must match the CRM compliance list exactly. */
const COUNTRY = "United Arab Emirates";
/** Free-text label stored on each lead, e.g. "Dental Clinic". Helps you segment later. */
const INDUSTRY = "";

const SCROLL_ROUNDS = 12; // ~120-240 listings. Raise slowly if you want more.
const SCROLL_DELAY_MS = 1800; // Do not go below ~1200 unless you enjoy being blocked.
const POST_DELAY_MS = 250; // Gentle on your own API too.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The scrollable results column. Google changes class names often, so find it by behaviour. */
function findFeed() {
  return (
    document.querySelector('div[role="feed"]') ||
    Array.from(document.querySelectorAll("div")).find(
      (d) => d.scrollHeight > d.clientHeight + 400 && d.querySelector('a[href*="/maps/place/"]')
    )
  );
}

async function loadAllResults() {
  const feed = findFeed();
  if (!feed) throw new Error("Couldn't find the results list. Are you on a Maps *search* page?");

  let lastCount = 0;
  for (let i = 0; i < SCROLL_ROUNDS; i++) {
    feed.scrollTop = feed.scrollHeight;
    await sleep(SCROLL_DELAY_MS);
    const count = feed.querySelectorAll('a[href*="/maps/place/"]').length;
    console.log(`scroll ${i + 1}/${SCROLL_ROUNDS} — ${count} listings`);
    // Stop early when Google stops adding results; no point hammering it for nothing.
    if (count === lastCount && i > 1) break;
    lastCount = count;
  }
  return feed;
}

/** Pulls one business out of a listing card. */
function readCard(link) {
  const card = link.closest('div[role="feed"] > div') || link.parentElement;
  if (!card) return null;

  const name = link.getAttribute("aria-label")?.trim();
  if (!name) return null;

  const text = card.innerText || "";

  // Phone numbers on Maps cards are reliably formatted with a leading + or 0 and spaced groups.
  const phone = (text.match(/(\+?\d[\d\s\-()]{7,}\d)/) || [])[1]?.trim() || null;

  // The website link is any external anchor that isn't a Google URL.
  const siteAnchor = Array.from(card.querySelectorAll("a[href]")).find((a) => {
    const href = a.getAttribute("href") || "";
    return href.startsWith("http") && !href.includes("google.com") && !href.includes("/maps/");
  });
  const website = siteAnchor?.getAttribute("href") || null;

  const rating = (text.match(/(\d\.\d)\s*\(/) || [])[1] || null;

  // Address is usually the line after the rating/category. Best-effort only.
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const address = lines.find((l) => /\d/.test(l) && l !== phone && !/^\d\.\d/.test(l)) || null;

  return {
    name,
    phone,
    website,
    rating,
    address,
    mapsUrl: link.getAttribute("href"),
  };
}

function collect(feed) {
  const seen = new Set();
  const out = [];
  feed.querySelectorAll('a[href*="/maps/place/"]').forEach((link) => {
    const biz = readCard(link);
    if (!biz || seen.has(biz.name)) return;
    seen.add(biz.name);
    out.push(biz);
  });
  return out;
}

async function send(biz) {
  // The Maps place URL is stable per business, so it doubles as the dedupe key. Re-running the
  // same search tomorrow updates rather than duplicates.
  const externalId = biz.mapsUrl || `${biz.name}|${COUNTRY}`;

  const res = await fetch(OWNOVA_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ownova-secret": OWNOVA_SECRET },
    body: JSON.stringify({
      source: "google_maps",
      externalId,
      name: biz.name,
      company: biz.name,
      phone: biz.phone,
      website: biz.website,
      country: COUNTRY,
      address: biz.address,
      industry: INDUSTRY,
      // Kept verbatim so you can see why a lead was worth having.
      "Google rating": biz.rating || "not rated",
      "Has website": biz.website ? "yes" : "NO — strong signal",
      "Maps listing": biz.mapsUrl || "",
    }),
  });
  return res.json();
}

(async function run() {
  console.log("%cOwnova lead extractor", "font-weight:bold;font-size:14px");
  if (!COUNTRY) return console.error("Set COUNTRY at the top of the script first.");

  const feed = await loadAllResults();
  const businesses = collect(feed);
  console.log(`Found ${businesses.length} businesses. Sending to Ownova OS...`);

  let created = 0;
  let duplicate = 0;
  let failed = 0;

  for (const biz of businesses) {
    try {
      const r = await send(biz);
      if (r.duplicate) duplicate++;
      else if (r.ok) created++;
      else failed++;
    } catch (e) {
      failed++;
      console.warn("failed:", biz.name, e);
    }
    await sleep(POST_DELAY_MS);
  }

  console.log(
    `%cDone — ${created} new, ${duplicate} already known, ${failed} failed.`,
    "color:#22d3ee;font-weight:bold"
  );
  console.log("Check CRM: https://os.ownova.org/crm");
  const noSite = businesses.filter((b) => !b.website).length;
  console.log(`${noSite} of them have no website at all — start there.`);
})();
