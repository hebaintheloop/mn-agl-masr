"use client";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Download,
  RefreshCw,
  Search,
  Users,
  LoaderCircle,
} from "lucide-react";
export type LeaderEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  points: number;
  cover_url: string | null;
  dress_code?: string;
};
type Row = {
  user_id: string;
  going: boolean;
  excuse: string;
  accommodation: string;
  present: boolean;
  profiles: { full_name: string; phone: string; student_code: string };
};
export type LeaderApi = (
  action: string,
  data?: Record<string, unknown>,
) => Promise<any>;
const normalize = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[أإآ]/g, "ا")
    .replace(/[\u064B-\u065F\u0640\s+\-]/g, "")
    .toLocaleLowerCase();
export function LeaderAttendance({
  event,
  en,
  api,
  initialOpen = false,
}: {
  event: LeaderEvent;
  en: boolean;
  api: LeaderApi;
  initialOpen?: boolean;
}) {
  const t = (a: string, b: string) => (en ? b : a);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [open, setOpen] = useState(initialOpen),
    [rows, setRows] = useState<Row[]>([]),
    [loaded, setLoaded] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [pending, setPending] = useState<Set<string>>(new Set()),
    [notice, setNotice] = useState("");
  const version = useRef(0),
    mounted = useRef(true),
    inflight = useRef(new Set<string>());
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      version.current++;
    };
  }, []);
  async function load() {
    const request = ++version.current;
    setLoading(true);
    setError("");
    try {
      const d = await api("attendees", { event_id: event.id });
      if (!mounted.current || request !== version.current) return;
      const present = new Set(
        d.attendance.map((a: { user_id: string }) => a.user_id),
      );
      setRows(
        d.rows.map((r: Row) => ({ ...r, present: present.has(r.user_id) })),
      );
      setLoaded(true);
    } catch (e) {
      if (mounted.current && request === version.current)
        setError(
          e instanceof Error
            ? e.message
            : t("تعذّر تحميل المشاركين", "Unable to load attendees"),
        );
    } finally {
      if (mounted.current && request === version.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (open && !loaded) load();
  }, [open]);
  async function checkIn(row: Row) {
    if (inflight.current.has(row.user_id)) return;
    inflight.current.add(row.user_id);
    setPending(new Set(inflight.current));
    setError("");
    setNotice("");
    // Invalidate an earlier roster refresh so it cannot overwrite the confirmed check-in.
    version.current++;
    setLoading(false);
    try {
      await api("manual", { event_id: event.id, user_id: row.user_id });
      if (!mounted.current) return;
      setRows((current) =>
        current.map((r) =>
          r.user_id === row.user_id ? { ...r, present: true } : r,
        ),
      );
      setNotice(
        t("تم تسجيل حضور ", "Attendance saved for ") + row.profiles.full_name,
      );
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : t(
                "لم يُحفظ الحضور، حاول مرة أخرى",
                "Attendance was not saved, please retry",
              ),
        );
    } finally {
      inflight.current.delete(row.user_id);
      if (mounted.current) setPending(new Set(inflight.current));
    }
  }
  const active = rows.filter((r) => r.going !== false),
    present = active.filter((r) => r.present).length,
    requests = active.filter((r) => r.excuse || r.accommodation).length;
  const list = (
    filter === "cancelled" ? rows.filter((r) => r.going === false) : active
  )
    .filter((r) =>
      filter === "waiting"
        ? !r.present
        : filter === "present"
          ? r.present
          : filter === "requests"
            ? !!(r.excuse || r.accommodation)
            : true,
    )
    .filter(
      (r) =>
        !query ||
        [r.profiles.full_name, r.profiles.phone, r.profiles.student_code].some(
          (s) => normalize(s).includes(normalize(query)),
        ),
    );
  const attendanceOpen =
    now >= new Date(event.start_at).getTime() - 3600000 &&
    now <= new Date(event.end_at).getTime() + 3600000;
  function download() {
    const fields = en
      ? [
          "Name",
          "Student code",
          "Phone",
          "Accommodation",
          "Academic excuse",
          "RSVP",
          "Attended",
        ]
      : [
          "الاسم",
          "كود الطالب",
          "الهاتف",
          "التسهيلات",
          "العذر الأكاديمي",
          "التسجيل",
          "الحضور",
        ];
    const csv =
      "\uFEFF" +
      [
        fields,
        ...list.map((r) => [
          r.profiles.full_name,
          r.profiles.student_code,
          r.profiles.phone,
          r.accommodation,
          r.excuse,
          r.going === false ? t("ملغي", "Cancelled") : t("مسجل", "Registered"),
          r.present ? t("حاضر", "Present") : t("لم يحضر", "Not checked in"),
        ]),
      ]
        .map((row) =>
          row
            .map(
              (v) =>
                '"' +
                String(v ?? "")
                  .replace(/^[\s]*[=+\-@\t\r]/, "'")
                  .replaceAll('"', '""') +
                '"',
            )
            .join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-${event.id}-${filter}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section
      className="leader-roster"
      aria-label={t("إدارة المشاركين", "Attendee management")}
    >
      <button
        className="roster-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`roster-${event.id}`}
      >
        <Users size={20} />
        {t("المشاركون وطلبات الأعذار", "Attendees & academic excuses")}
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div id={`roster-${event.id}`} className="roster-body">
          {loaded && (
            <div className="roster-stats">
              <span>
                <b>{active.length}</b>
                {t("مسجل", "Registered")}
              </span>
              <span>
                <b>{present}</b>
                {t("حاضر", "Present")}
              </span>
              <span>
                <b>{active.length - present}</b>
                {t("لم يحضر بعد", "Not checked in")}
              </span>
              <span>
                <b>{requests}</b>
                {t("طلبات", "Requests")}
              </span>
            </div>
          )}
          <div className="roster-tools">
            <label className="leader-search">
              <Search size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={t("ابحث عن مشارك", "Search attendees")}
                placeholder={t(
                  "الاسم، كود الطالب أو الهاتف",
                  "Name, student code or phone",
                )}
              />
              {query && (
                <button
                  aria-label={t("مسح البحث", "Clear search")}
                  onClick={() => setQuery("")}
                >
                  ×
                </button>
              )}
            </label>
            <button
              className="outline"
              onClick={load}
              disabled={loading || pending.size > 0}
              aria-label={t("تحديث المشاركين", "Refresh attendees")}
            >
              <RefreshCw size={16} className={loading ? "spin" : ""} />
            </button>
            <button
              className="outline"
              onClick={download}
              disabled={!loaded || !list.length}
            >
              <Download size={16} />
              {t("تصدير النتائج", "Export results")}
            </button>
          </div>
          <div
            className="roster-filters"
            role="group"
            aria-label={t("تصفية المشاركين", "Filter attendees")}
          >
            {[
              ["all", t("الكل", "All")],
              ["waiting", t("لم يحضر", "Not checked in")],
              ["present", t("حاضر", "Present")],
              ["requests", t("أعذار وتسهيلات", "Requests")],
              ["cancelled", t("ألغوا المشاركة", "Cancelled")],
            ].map(([id, title]) => (
              <button
                key={id}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {title}
              </button>
            ))}
          </div>
          {error && (
            <div className="leader-error" role="alert">
              {error}
              {!loaded && (
                <button className="outline" onClick={load}>
                  {t("إعادة المحاولة", "Retry")}
                </button>
              )}
            </div>
          )}
          {notice && (
            <p role="status" className="leader-feedback">
              {notice}
            </p>
          )}
          {loading && !loaded ? (
            <p role="status">
              {t("جارٍ تحميل المشاركين…", "Loading attendees…")}
            </p>
          ) : (
            loaded && (
              <>
                {!attendanceOpen && (
                  <p className="leader-help">
                    {t(
                      "تسجيل الحضور متاح من ساعة قبل البداية وحتى ساعة بعد النهاية.",
                      "Check-in opens one hour before the event and closes one hour after it ends.",
                    )}
                  </p>
                )}
                <div className="roster-results" aria-live="polite">
                  {t("النتائج: ", "Results: ")}
                  {list.length}
                </div>
                {list.length ? (
                  list.map((r) => (
                    <article className="leader-person" key={r.user_id}>
                      <div className="leader-person-top">
                        <div>
                          <h4>{r.profiles.full_name}</h4>
                          <div className="leader-person-contact">
                            <span dir="ltr">{r.profiles.student_code}</span>
                            <a dir="ltr" href={"tel:" + r.profiles.phone}>
                              {r.profiles.phone}
                            </a>
                          </div>
                        </div>
                        {r.present ? (
                          <span className="status-label status-confirmed">
                            <Check size={14} />
                            {t("حاضر", "Present")}
                          </span>
                        ) : r.going !== false ? (
                          <button
                            className="primary"
                            disabled={pending.has(r.user_id) || !attendanceOpen}
                            onClick={() => checkIn(r)}
                            aria-label={
                              t("تسجيل حضور ", "Check in ") +
                              r.profiles.full_name
                            }
                          >
                            {pending.has(r.user_id) ? (
                              <LoaderCircle size={16} className="spin" />
                            ) : (
                              <Check size={16} />
                            )}{" "}
                            {t("تسجيل الحضور", "Check in")}
                          </button>
                        ) : (
                          <span className="status-label status-neutral">
                            {t("ألغى المشاركة", "Cancelled")}
                          </span>
                        )}
                      </div>
                      {(r.excuse || r.accommodation) && (
                        <div className="leader-person-requests">
                          <span className="status-label status-confirmed">
                            {t("الطلبات مقبولة", "Requests accepted")}
                          </span>
                          <details>
                            <summary>
                              {t("عرض الطلبات", "View requests")}
                            </summary>
                            {r.excuse && (
                              <p>
                                <b>
                                  {t("العذر الأكاديمي: ", "Academic excuse: ")}
                                </b>
                                {r.excuse}
                              </p>
                            )}
                            {r.accommodation && (
                              <p>
                                <b>{t("التسهيلات: ", "Accommodation: ")}</b>
                                {r.accommodation}
                              </p>
                            )}
                          </details>
                        </div>
                      )}
                    </article>
                  ))
                ) : (
                  <div className="leader-empty">
                    <h3>
                      {query || filter !== "all"
                        ? t("لا توجد نتائج مطابقة", "No matching attendees")
                        : t("لم يسجل أحد بعد", "No registrations yet")}
                    </h3>
                    <p>
                      {query || filter !== "all"
                        ? t(
                            "جرّب بحثًا آخر أو اعرض كل المشاركين.",
                            "Try another search or show all attendees.",
                          )
                        : t(
                            "شارك رابط الفعالية لبدء التسجيل.",
                            "Share the event link to invite registrations.",
                          )}
                    </p>
                    {(query || filter !== "all") && (
                      <button
                        className="outline"
                        onClick={() => {
                          setQuery("");
                          setFilter("all");
                        }}
                      >
                        {t("عرض الكل", "Show all")}
                      </button>
                    )}
                  </div>
                )}
              </>
            )
          )}
        </div>
      )}
    </section>
  );
}
