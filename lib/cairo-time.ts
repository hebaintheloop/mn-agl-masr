const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Cairo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
function stamp(time: number) {
  const p = Object.fromEntries(
    formatter
      .formatToParts(time)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, Number(p.value)]),
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}
export function cairoLocalToISO(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Enter a valid Cairo date and time");
  const naive = Date.parse(value + ":00Z");
  if (!Number.isFinite(naive) || new Date(naive).toISOString().slice(0,16) !== value)
    throw new Error("Enter a valid Cairo date and time");
  const offsets = new Set([
    stamp(naive - 86400000) - (naive - 86400000),
    stamp(naive + 86400000) - (naive + 86400000),
  ]);
  const matches = [...offsets]
    .map((offset) => naive - offset)
    .filter((candidate) => stamp(candidate) === naive);
  if (matches.length !== 1)
    throw new Error(
      "This Cairo time is skipped or repeated by daylight saving. Choose another time.",
    );
  return new Date(matches[0]).toISOString();
}
