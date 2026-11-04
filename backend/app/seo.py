import re
from collections import Counter

STOP = set(
    "a an the and or of for to in on with by at from your our is are this that it as be you we "
    "i my me us not no can will".split()
)
UNITS = re.compile(r"\d|\b(cm|mm|inch|inches|oz|ounce|ounces|lb|lbs|kg|ml|liter|litre|gram|grams)\b", re.I)


def _words(text):
    return re.findall(r"[a-z0-9']+", (text or "").lower())


def _status(earned, maxp):
    if earned >= maxp:
        return "pass"
    if earned > 0:
        return "warn"
    return "fail"


def score_listing(title, description, tags, keyword, platform):
    title = (title or "").strip()
    description = (description or "").strip()
    keyword = " ".join((keyword or "").lower().split())
    platform = (platform or "etsy").lower()
    etsy = platform == "etsy"
    tag_list = [t.strip() for t in re.split(r"[,\n]", tags or "") if t.strip()]
    t_low = title.lower()
    d_low = description.lower()
    wc = len(_words(description))
    kw_words = keyword.split()
    checks = []

    def add(name, earned, maxp, detail, fix):
        checks.append({
            "name": name,
            "status": _status(earned, maxp),
            "earned": earned,
            "max": maxp,
            "detail": detail,
            "fix": fix if earned < maxp else "",
        })

    # 1. Title length
    n = len(title)
    if etsy:
        lo, hi, soft_lo, soft_hi = 60, 140, 30, 140
    else:
        lo, hi, soft_lo, soft_hi = 30, 70, 15, 100
    if lo <= n <= hi:
        e = 15
    elif soft_lo <= n <= soft_hi:
        e = 8
    else:
        e = 0
    add(
        "Title length", e, 15,
        f"Your title is {n} characters. A good range is {lo} to {hi}.",
        f"Aim for {lo} to {hi} characters, using the space for words buyers actually search.",
    )

    # 2-4. Keyword checks (only when a keyword is given)
    if keyword:
        pos = t_low.find(keyword)
        if pos == -1:
            if all(w in t_low for w in kw_words):
                e, detail = 8, "Your keyword words appear in the title, but not as one phrase."
            else:
                e, detail = 0, "Your main keyword is not in the title."
        elif pos <= 40:
            e, detail = 15, "Your main keyword appears near the start of the title."
        else:
            e, detail = 8, "Your main keyword is in the title, but late. Buyers and search engines weigh the start most."
        add("Main keyword in title", e, 15, detail,
            "Put your exact main keyword phrase within the first 40 characters of the title.")

        head = d_low[:160]
        if keyword in head:
            e, detail = 10, "Your keyword appears in the opening of the description."
        elif all(w in head for w in kw_words):
            e, detail = 5, "Your keyword words appear early in the description, but not as one phrase."
        else:
            e, detail = 0, "Your keyword is missing from the first lines of the description."
        add("Keyword in description opening", e, 10, detail,
            "Mention your main keyword naturally in the first sentence of the description.")

        occ = len(re.findall(re.escape(keyword), d_low))
        dens = occ * len(kw_words) / max(wc, 1) * 100
        if occ == 0:
            e, detail = 0, "Your keyword is never used in the description."
        elif dens > 4:
            e, detail = 3, f"Your keyword is used {occ} times, which looks like keyword stuffing."
        else:
            e, detail = 10, f"Your keyword is used {occ} time(s), a natural amount."
        add("Keyword use in description", e, 10, detail,
            "Use the keyword a few times naturally, and add related phrases instead of repeating it.")

    # 5. Title repetition
    words = [w for w in _words(title) if w not in STOP and len(w) > 2]
    counts = Counter(words)
    worst_word, worst = (counts.most_common(1)[0] if counts else ("", 0))
    if worst <= 1:
        e, detail = 8, "No word is repeated in the title."
    elif worst == 2:
        e, detail = 4, f'The word "{worst_word}" appears twice in the title.'
    else:
        e, detail = 0, f'The word "{worst_word}" appears {worst} times in the title.'
    add("Title variety", e, 8, detail,
        "Replace repeated words with different phrases buyers might search, such as materials, uses or occasions.")

    # 6. Title formatting
    caps = re.findall(r"\b[A-Z]{3,}\b", title)
    special = len(re.findall(r"[!$%*~<>{}\[\]]", title))
    if len(caps) <= 1 and special <= 1:
        e, detail = 6, "Your title formatting looks clean."
    elif len(caps) <= 3 and special <= 3:
        e, detail = 3, "Your title has some ALL CAPS words or special characters."
    else:
        e, detail = 0, "Your title has many ALL CAPS words or special characters."
    add("Clean title formatting", e, 6, detail,
        "Use normal capitalization and avoid symbols like ! $ % * in the title.")

    # 7. Description length
    if wc >= 120:
        e, detail = 15, f"Your description is {wc} words."
    elif wc >= 50:
        e, detail = 8, f"Your description is {wc} words, which is on the short side."
    else:
        e, detail = 0, f"Your description is only {wc} words."
    add("Description length", e, 15, detail,
        "Aim for at least 120 words: what it is, who it is for, materials, sizes, care and shipping.")

    # 8. Description structure
    if description.count("\n") >= 2:
        e, detail = 5, "Your description is broken into short lines or paragraphs."
    else:
        e, detail = 0, "Your description is one block of text."
    add("Easy to scan", e, 5, detail,
        "Break the description into short paragraphs or bullet points so buyers can scan it.")

    # 9. Specific details
    if UNITS.search(description):
        e, detail = 5, "Your description includes specific details such as sizes or quantities."
    else:
        e, detail = 0, "Your description has no numbers or measurements."
    add("Specific details", e, 5, detail,
        "Add concrete details: size, weight, material, quantity, care instructions.")

    # 10-11. Etsy tags
    if etsy:
        tn = len(tag_list)
        if tn == 13:
            e, detail = 12, "You are using all 13 tags."
        elif tn > 13:
            e, detail = 6, f"You entered {tn} tags, but Etsy allows 13."
        elif tn >= 9:
            e, detail = 7, f"You are using {tn} of 13 tags."
        elif tn > 0:
            e, detail = 3, f"You are using only {tn} of 13 tags."
        else:
            e, detail = 0, "No tags entered."
        add("Tag count", e, 12, detail,
            "Use all 13 tags. Each one is another phrase where your listing can appear.")

        if tn == 0:
            e, detail = 0, "No tags to check."
        else:
            long_tags = [t for t in tag_list if len(t) > 20]
            dup = tn - len({t.lower() for t in tag_list})
            multi = sum(1 for t in tag_list if " " in t) / tn
            e = 10
            problems = []
            if long_tags:
                e -= 4
                problems.append(f"{len(long_tags)} tag(s) are over 20 characters")
            if dup:
                e -= 3
                problems.append(f"{dup} duplicate tag(s)")
            if multi < 0.5:
                e -= 3
                problems.append("most tags are single words")
            e = max(e, 0)
            detail = "Your tags look good." if not problems else "Issues: " + ", ".join(problems) + "."
        add("Tag quality", e, 10, detail,
            "Use multi-word phrases of 20 characters or fewer, with no duplicates, that match how buyers search.")

    total_max = sum(c["max"] for c in checks)
    total = sum(c["earned"] for c in checks)
    score = round(total / total_max * 100) if total_max else 0
    if score >= 85:
        label = "Strong"
    elif score >= 65:
        label = "Good, with fixes to make"
    elif score >= 40:
        label = "Needs work"
    else:
        label = "Weak"

    gaps = sorted((c for c in checks if c["earned"] < c["max"]), key=lambda c: c["max"] - c["earned"], reverse=True)
    top_terms = [f"{w} ({c})" for w, c in Counter(
        w for w in _words(title + " " + description) if w not in STOP and len(w) > 2
    ).most_common(6)]

    return {
        "score": score,
        "label": label,
        "keyword_used": bool(keyword),
        "checks": checks,
        "top_fixes": [c["fix"] for c in gaps[:3]],
        "top_terms": top_terms,
        "note": "This checks common listing best practices. It does not predict Etsy or Google rankings, which also depend on sales, reviews, pricing and competition.",
    }
