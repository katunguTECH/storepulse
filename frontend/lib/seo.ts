type Check = {
  name: string;
  status: "pass" | "warn" | "fail";
  earned: number;
  max: number;
  detail: string;
  fix: string;
};

const STOP = new Set(
  "a an the and or of for to in on with by at from your our is are this that it as be you we i my me us not no can will".split(" ")
);
const UNITS = /\d|\b(cm|mm|inch|inches|oz|ounce|ounces|lb|lbs|kg|ml|liter|litre|gram|grams)\b/i;

function words(text: string): string[] {
  return (text || "").toLowerCase().match(/[a-z0-9']+/g) ?? [];
}

function statusOf(earned: number, max: number): Check["status"] {
  if (earned >= max) return "pass";
  if (earned > 0) return "warn";
  return "fail";
}

function countOccurrences(hay: string, needle: string): number {
  if (!needle) return 0;
  return hay.split(needle).length - 1;
}

function mostCommon(items: string[], n: number): [string, number][] {
  const m = new Map<string, number>();
  for (const w of items) m.set(w, (m.get(w) ?? 0) + 1);
  return Array.from(m.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export function scoreListing(titleIn: string, descriptionIn: string, tagsIn: string, keywordIn: string, platformIn: string) {
  const title = (titleIn || "").trim();
  const description = (descriptionIn || "").trim();
  const keyword = (keywordIn || "").toLowerCase().split(/\s+/).filter(Boolean).join(" ");
  const platform = (platformIn || "etsy").toLowerCase();
  const etsy = platform === "etsy";
  const tagList = (tagsIn || "").split(/[,\n]/).map((t) => t.trim()).filter(Boolean);
  const tLow = title.toLowerCase();
  const dLow = description.toLowerCase();
  const wc = words(description).length;
  const kwWords = keyword ? keyword.split(" ") : [];
  const checks: Check[] = [];

  const add = (name: string, earned: number, max: number, detail: string, fix: string) => {
    checks.push({ name, status: statusOf(earned, max), earned, max, detail, fix: earned < max ? fix : "" });
  };

  // 1. Title length
  const n = title.length;
  const [lo, hi, softLo, softHi] = etsy ? [60, 140, 30, 140] : [30, 70, 15, 100];
  const lenScore = n >= lo && n <= hi ? 15 : n >= softLo && n <= softHi ? 8 : 0;
  add(
    "Title length",
    lenScore,
    15,
    `Your title is ${n} characters. A good range is ${lo} to ${hi}.`,
    `Aim for ${lo} to ${hi} characters, using the space for words buyers actually search.`
  );

  // 2-4. Keyword checks
  if (keyword) {
    const pos = tLow.indexOf(keyword);
    let e: number;
    let detail: string;
    if (pos === -1) {
      if (kwWords.every((w) => tLow.includes(w))) {
        e = 8;
        detail = "Your keyword words appear in the title, but not as one phrase.";
      } else {
        e = 0;
        detail = "Your main keyword is not in the title.";
      }
    } else if (pos <= 40) {
      e = 15;
      detail = "Your main keyword appears near the start of the title.";
    } else {
      e = 8;
      detail = "Your main keyword is in the title, but late. Buyers and search engines weigh the start most.";
    }
    add("Main keyword in title", e, 15, detail, "Put your exact main keyword phrase within the first 40 characters of the title.");

    const head = dLow.slice(0, 160);
    if (head.includes(keyword)) {
      e = 10;
      detail = "Your keyword appears in the opening of the description.";
    } else if (kwWords.every((w) => head.includes(w))) {
      e = 5;
      detail = "Your keyword words appear early in the description, but not as one phrase.";
    } else {
      e = 0;
      detail = "Your keyword is missing from the first lines of the description.";
    }
    add("Keyword in description opening", e, 10, detail, "Mention your main keyword naturally in the first sentence of the description.");

    const occ = countOccurrences(dLow, keyword);
    if (occ === 0) {
      e = 0;
      detail = "Your keyword is never used in the description.";
    } else if (occ === 1) {
      e = 10;
      detail = "Your keyword is used once in the description. Using it 2-3 times naturally would be even stronger.";
    } else if (occ <= 4) {
      e = 10;
      detail = `Your keyword is used ${occ} times, a natural amount.`;
    } else {
      e = 3;
      detail = `Your keyword is used ${occ} times, which looks like keyword stuffing.`;
    }
    add("Keyword use in description", e, 10, detail, "Use the keyword a few times naturally, and add related phrases instead of repeating it.");
  }

  // 5. Title variety
  const tw = words(title).filter((w) => !STOP.has(w) && w.length > 2);
  const tc = mostCommon(tw, 1);
  const [worstWord, worst] = tc.length ? tc[0] : ["", 0];
  let varScore: number;
  let varDetail: string;
  if (worst <= 1) {
    varScore = 8;
    varDetail = "No word is repeated in the title.";
  } else if (worst === 2) {
    varScore = 4;
    varDetail = `The word "${worstWord}" appears twice in the title.`;
  } else {
    varScore = 0;
    varDetail = `The word "${worstWord}" appears ${worst} times in the title.`;
  }
  add(
    "Title variety",
    varScore,
    8,
    varDetail,
    "Replace repeated words with different phrases buyers might search, such as materials, uses or occasions."
  );

  // 6. Title formatting
  const caps = title.match(/\b[A-Z]{3,}\b/g) ?? [];
  const special = (title.match(/[!$%*~<>{}\[\]]/g) ?? []).length;
  let fmtScore: number;
  let fmtDetail: string;
  if (caps.length <= 1 && special <= 1) {
    fmtScore = 6;
    fmtDetail = "Your title formatting looks clean.";
  } else if (caps.length <= 3 && special <= 3) {
    fmtScore = 3;
    fmtDetail = "Your title has some ALL CAPS words or special characters.";
  } else {
    fmtScore = 0;
    fmtDetail = "Your title has many ALL CAPS words or special characters.";
  }
  add("Clean title formatting", fmtScore, 6, fmtDetail, "Use normal capitalization and avoid symbols like ! $ % * in the title.");

  // 7. Description length
  let dlScore: number;
  let dlDetail: string;
  if (wc >= 120) {
    dlScore = 15;
    dlDetail = `Your description is ${wc} words.`;
  } else if (wc >= 50) {
    dlScore = 8;
    dlDetail = `Your description is ${wc} words, which is on the short side.`;
  } else {
    dlScore = 0;
    dlDetail = `Your description is only ${wc} words.`;
  }
  add("Description length", dlScore, 15, dlDetail, "Aim for at least 120 words: what it is, who it is for, materials, sizes, care and shipping.");

  // 8. Description structure
  const lineBreaks = (description.match(/\n/g) ?? []).length;
  add(
    "Easy to scan",
    lineBreaks >= 2 ? 5 : 0,
    5,
    lineBreaks >= 2 ? "Your description is broken into short lines or paragraphs." : "Your description is one block of text.",
    "Break the description into short paragraphs or bullet points so buyers can scan it."
  );

  // 9. Specific details
  const hasUnits = UNITS.test(description);
  add(
    "Specific details",
    hasUnits ? 5 : 0,
    5,
    hasUnits ? "Your description includes specific details such as sizes or quantities." : "Your description has no numbers or measurements.",
    "Add concrete details: size, weight, material, quantity, care instructions."
  );

  // 10-11. Etsy tags
  if (etsy) {
    const tn = tagList.length;
    let tcScore: number;
    let tcDetail: string;
    if (tn === 13) {
      tcScore = 12;
      tcDetail = "You are using all 13 tags.";
    } else if (tn > 13) {
      tcScore = 6;
      tcDetail = `You entered ${tn} tags, but Etsy allows 13.`;
    } else if (tn >= 9) {
      tcScore = 7;
      tcDetail = `You are using ${tn} of 13 tags.`;
    } else if (tn > 0) {
      tcScore = 3;
      tcDetail = `You are using only ${tn} of 13 tags.`;
    } else {
      tcScore = 0;
      tcDetail = "No tags entered.";
    }
    add("Tag count", tcScore, 12, tcDetail, "Use all 13 tags. Each one is another phrase where your listing can appear.");

    let tqScore: number;
    let tqDetail: string;
    if (tn === 0) {
      tqScore = 0;
      tqDetail = "No tags to check.";
    } else {
      const longTags = tagList.filter((t) => t.length > 20);
      const dup = tn - new Set(tagList.map((t) => t.toLowerCase())).size;
      const multi = tagList.filter((t) => t.includes(" ")).length / tn;
      tqScore = 10;
      const problems: string[] = [];
      if (longTags.length) {
        tqScore -= 4;
        problems.push(`${longTags.length} tag(s) are over 20 characters`);
      }
      if (dup) {
        tqScore -= 3;
        problems.push(`${dup} duplicate tag(s)`);
      }
      if (multi < 0.5) {
        tqScore -= 3;
        problems.push("most tags are single words");
      }
      tqScore = Math.max(tqScore, 0);
      tqDetail = problems.length ? "Issues: " + problems.join(", ") + "." : "Your tags look good.";
    }
    add(
      "Tag quality",
      tqScore,
      10,
      tqDetail,
      "Use multi-word phrases of 20 characters or fewer, with no duplicates, that match how buyers search."
    );
  }

  const totalMax = checks.reduce((s, c) => s + c.max, 0);
  const total = checks.reduce((s, c) => s + c.earned, 0);
  const score = totalMax ? Math.round((total / totalMax) * 100) : 0;
  const label = score >= 85 ? "Strong" : score >= 65 ? "Good, with fixes to make" : score >= 40 ? "Needs work" : "Weak";

  const gaps = checks.filter((c) => c.earned < c.max).sort((a, b) => b.max - b.earned - (a.max - a.earned));
  const topTerms = mostCommon(
    words(title + " " + description).filter((w) => !STOP.has(w) && w.length > 2),
    6
  ).map(([w, c]) => `${w} (${c})`);

  return {
    score,
    label,
    keyword_used: Boolean(keyword),
    checks,
    top_fixes: gaps.slice(0, 3).map((c) => c.fix),
    top_terms: topTerms,
    note: "This checks common listing best practices. It does not predict Etsy or Google rankings, which also depend on sales, reviews, pricing and competition.",
  };
}