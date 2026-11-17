export type RosterRow = {
  user_id: string | null;
  going: boolean;
  excuse: string;
  accommodation: string;
  present: boolean;
  has_rsvp?: boolean;
  registered_before?: boolean;
  pending_account?: boolean;
  points?: number;
  profiles: { full_name: string; phone: string; student_code: string };
};

export const rosterViews = {
  all: "الكل",
  waiting: "لم يحضر",
  present: "حاضر",
  accommodations: "التسهيلات",
  excuses: "الأعذار الأكاديمية",
  requests: "أعذار وتسهيلات",
  cancelled: "ألغوا المشاركة",
} as const;
export type RosterView = keyof typeof rosterViews;

const normalize = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[أإآ]/g, "ا")
    .replace(/[\u064B-\u065F\u0640\s+\-]/g, "")
    .toLocaleLowerCase();

export function filterRoster(
  rows: RosterRow[],
  view: RosterView,
  query: string,
) {
  return rows.filter((r) => {
    if (
      view === "cancelled" ? r.going !== false : r.going === false && !r.present
    )
      return false;
    if (view === "waiting" && r.present) return false;
    if (view === "present" && !r.present) return false;
    if (view === "accommodations" && !r.accommodation?.trim()) return false;
    if (view === "excuses" && !r.excuse?.trim()) return false;
    if (view === "requests" && !r.excuse?.trim() && !r.accommodation?.trim())
      return false;
    return (
      !query ||
      [r.profiles.full_name, r.profiles.phone, r.profiles.student_code].some(
        (value) => normalize(value || "").includes(normalize(query)),
      )
    );
  });
}

export type RosterReport = {
  eventId: string;
  eventTitle: string;
  startAt: string;
  view: RosterView;
  query: string;
  generatedAt: string;
  headers: string[];
  rows: string[][];
};

export function makeRosterReport(
  event: { id: string; title: string; start_at: string },
  view: RosterView,
  query: string,
  rows: RosterRow[],
): RosterReport {
  const request = view === "accommodations" || view === "excuses";
  const headers = request
    ? [
        "الاسم",
        "كود الطالب",
        "الهاتف",
        view === "accommodations"
          ? "التسهيلات المطلوبة"
          : "العذر الأكاديمي المطلوب",
        "حالة الطلب",
        "الحضور",
      ]
    : [
        "الاسم",
        "كود الطالب",
        "الهاتف",
        "التسهيلات",
        "العذر الأكاديمي",
        "التسجيل",
        "الحضور",
        "الحساب",
      ];
  return {
    eventId: event.id,
    eventTitle: event.title,
    startAt: event.start_at,
    view,
    query: query.trim(),
    generatedAt: new Date().toISOString(),
    headers,
    rows: rows.map((r) => {
      const identity = [
        r.profiles.full_name || "لم يُنشئ حسابه بعد",
        r.profiles.student_code,
        r.profiles.phone || "",
      ];
      const attendance = r.present ? "حاضر" : "لم يحضر";
      return request
        ? [
            ...identity,
            view === "accommodations" ? r.accommodation : r.excuse,
            "مقبول تلقائيًا",
            attendance,
          ]
        : [
            ...identity,
            r.accommodation || "",
            r.excuse || "",
            r.going === false
              ? "ملغي"
              : r.registered_before === false
                ? "بدون تسجيل مسبق"
                : "مسجل",
            attendance,
            r.pending_account ? "بانتظار إنشاء الحساب" : "حساب موجود",
          ];
    }),
  };
}

export const cairoReportDate = (value: string) =>
  new Date(value).toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    dateStyle: "medium",
    timeStyle: "short",
  });

export function reportFilename(report: RosterReport, extension: string) {
  return `event-${report.eventId}-${report.view}.${extension}`;
}
