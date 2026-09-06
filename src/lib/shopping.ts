const HEADING =
  /^(kahvalt[ıi]|[oö]ğle|ak[sş]am|ara öğün|gece|gün\s*\d|1\. gün|2\. gün|3\. gün|4\. gün|su tüket|not\b|önemli\b)/i;

function titleCaseTr(s: string) {
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
}

/** Diet PDF text → grocery draft. Duplicates merged. Not medical advice. */
export function shoppingFromDiet(text: string): string[] {
  const counts = new Map<string, { label: string; n: number }>();
  for (const raw of String(text || "").split(/\r?\n+/)) {
    let s = raw.replace(/^[•\-\u2013\u2014\d.)\s]+/, "").trim();
    s = s.replace(/\s{2,}/g, " ");
    if (s.length < 3 || s.length > 70) continue;
    if (HEADING.test(s) && s.length < 28) continue;
    if (/https?:\/\//i.test(s)) continue;
    if (/^(sayfa|page)\s*\d+/i.test(s)) continue;
    const key = s.toLocaleLowerCase("tr-TR");
    const prev = counts.get(key);
    if (prev) prev.n += 1;
    else counts.set(key, { label: titleCaseTr(s), n: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, "tr"))
    .slice(0, 80)
    .map((x) => (x.n > 1 ? `${x.label} (${x.n})` : x.label));
}
