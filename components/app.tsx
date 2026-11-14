"use client";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Sun,
  Moon,
  Menu,
  X,
  Plus,
  ScanLine,
  Check,
  ChevronLeft,
  LogOut,
  Trophy,
  LoaderCircle,
  Download,
} from "lucide-react";
import { CommunityExperience } from "./design-preview";
type EventItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  points: number;
  cover_url: string | null;
};
type Profile = {
  id: string;
  full_name: string;
  student_code: string;
  phone: string;
  email?: string | null;
  role: string;
};
type Registration = {
  event_id: string;
  going: boolean;
  accommodation: string;
  excuse: string;
  request_status: string;
};
type Me = {
  profile: Profile;
  registrations: Registration[];
  points: { points: number; event_id: string }[];
};
async function api(
  action: string,
  data: Record<string, unknown> = {},
  auth = false,
) {
  const r = await fetch(auth ? "/api/auth" : "/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  });
  const v = await r.json();
  if (!r.ok) throw new Error(v.error || "Something went wrong");
  return v;
}
const date = (s: string, en: boolean) =>
  new Date(s).toLocaleDateString(en ? "en-GB" : "ar-EG", {
    timeZone: "Africa/Cairo",
    day: "numeric",
    month: "long",
  });
export default function App() {
  const [home, setHome] = useState<{
    video_url?: string;
    poster_url?: string;
    gallery_urls?: string[];
  }>({});
  const [en, setEn] = useState(false),
    [dark, setDark] = useState(false),
    [view, setView] = useState("home"),
    [auth, setAuth] = useState<string | null>(null),
    [me, setMe] = useState<Me | null>(null),
    [authChecked, setAuthChecked] = useState(false),
    [events, setEvents] = useState<EventItem[]>([]),
    [news, setNews] = useState<
      { id: string; title: string; body: string; created_at: string }[]
    >([]),
    [selected, setSelected] = useState<EventItem | null>(null),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recovery, setRecovery] = useState(""),
    [menu, setMenu] = useState(false),
    [rows, setRows] = useState<{ full_name: string; points: number }[]>([]),
    [creating, setCreating] = useState(false),
    [qr, setQr] = useState(""),
    [qrImage, setQrImage] = useState(""),
    [attendees, setAttendees] = useState<any[]>([]),
    [search, setSearch] = useState(""),
    [loadFailed, setLoadFailed] = useState(false),
    [past, setPast] = useState(false);
  const t = (ar: string, eng: string) => (en ? eng : ar);
  const initialized = useRef(false);
  const refresh = async () => {
    const r = await fetch("/api/action");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setEvents(d.events);
    setNews(d.news);
    setHome(d.home || {});
    setLoadFailed(false);
    if (!initialized.current) {
      initialized.current = true;
      const params = new URLSearchParams(location.search);
      const event = d.events.find(
        (e: EventItem) => e.id === params.get("event"),
      );
      if (event) {
        setSelected(event);
        setView("event");
      } else if (
        ["events", "leaderboard", "account", "scan"].includes(
          params.get("view") || "",
        )
      )
        setView(params.get("view")!);
    }
  };
  const refreshMe = async () => {
    try {
      setMe(await api("me"));
    } catch {
      setMe(null);
    } finally {
      setAuthChecked(true);
    }
  };
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
    if (new URLSearchParams(location.search).get("join") === "1")
      setAuth("signup");
    refresh().catch(() => setLoadFailed(true));
    refreshMe();
  }, []);
  useEffect(() => {
    document.documentElement.lang = en ? "en" : "ar";
    document.documentElement.dir = en ? "ltr" : "rtl";
  }, [en]);
  useEffect(() => {
    if (view === "leaderboard" && me)
      api("leaderboard")
        .then((d) => setRows(d.rows))
        .catch((e) => setError(e.message));
  }, [view, me]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  function go(v: string) {
    history.pushState(null, "", v === "home" ? "/" : "/?view=" + v);
    setView(v);
    setSelected(null);
    setError("");
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const pop = () => {
      const q = new URLSearchParams(location.search);
      const e = events.find((x) => x.id === q.get("event"));
      setSelected(e || null);
      setView(e ? "event" : q.get("view") || "home");
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [events]);
  useEffect(() => {
    if (!auth && !creating && !recovery && !qr) return;
    const previous = document.activeElement as HTMLElement;
    const modal = document.querySelector<HTMLElement>("[role=dialog]");
    const first = modal?.querySelector<HTMLElement>("input,button,a[href]");
    first?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !recovery) {
        setAuth(null);
        setCreating(false);
        setQr("");
        setError("");
      }
      if (e.key === "Tab" && modal) {
        const focusable = Array.from(
          modal.querySelectorAll<HTMLElement>(
            "button:not([disabled]),input,textarea,a[href]",
          ),
        );
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [auth, creating, recovery, qr]);
  const total = me?.points.reduce((s, x) => s + x.points, 0) || 0;
  function openEvent(e: EventItem) {
    history.pushState(null, "", "/?event=" + e.id);
    setSelected(e);
    setView("event");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function register(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.currentTarget));
    await run(async () => {
      const d = await api(auth!, f, true);
      await refreshMe();
      if (d.recovery) setRecovery(d.recovery);
      setAuth(null);
      go("events");
      setNotice(t("أهلًا بك في من أجل مصر", "Welcome to Mn Agl Masr"));
    });
  }
  async function loadAttendees() {
    if (!selected) return;
    await run(async () => {
      const d = await api("attendees", { event_id: selected.id });
      setAttendees(
        d.rows.map((x: any) => ({
          ...x,
          present: d.attendance.some((a: any) => a.user_id === x.user_id),
        })),
      );
    });
  }
  return (
    <>
      <header className="site-header">
        <div className="nav-wrap">
          <button
            className="wordmark"
            onClick={() => go("home")}
            aria-label="Home"
          >
            <img
              className="app-logo"
              src="/assets/cairo-student-logo.jpg"
              width={58}
              height={58}
              alt={t(
                "شعار طلاب من أجل مصر، جامعة القاهرة",
                "Students for Egypt, Cairo University logo",
              )}
            />
            <span>
              من أجل مصر
              <small>
                {t(
                  "كلية العلوم، جامعة القاهرة",
                  "Faculty of Science, Cairo University",
                )}
              </small>
            </span>
          </button>
          <nav className={menu ? "open" : ""} aria-label="Main">
            <button
              className={view === "home" ? "active" : ""}
              onClick={() => go("home")}
            >
              {t("الرئيسية", "Home")}
            </button>
            <button
              className={view === "events" ? "active" : ""}
              onClick={() => go("events")}
            >
              {t("الفعاليات", "Events")}
            </button>
            {me && (
              <>
                <button
                  className={view === "leaderboard" ? "active" : ""}
                  onClick={() => go("leaderboard")}
                >
                  {t("المتصدرون", "Leaderboard")}
                </button>
                <button onClick={() => go("account")}>
                  {t("حسابي", "My account")}
                </button>
              </>
            )}
          </nav>
          <div className="nav-actions">
            <button
              className="icon-btn"
              aria-label={t("تغيير المظهر", "Toggle theme")}
              onClick={() => {
                const next = !dark;
                setDark(next);
                document.documentElement.dataset.theme = next
                  ? "dark"
                  : "light";
                localStorage.setItem("mam-theme", next ? "dark" : "light");
              }}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="language" onClick={() => setEn(!en)}>
              {en ? "عربي" : "EN"}
            </button>
            {me ? (
              <button className="small-btn" onClick={() => go("scan")}>
                <ScanLine size={16} />
                {t("الحضور", "Check in")}
              </button>
            ) : (
              <>
                <button
                  className="login-link"
                  onClick={() => {
                    setError("");
                    setAuth("login");
                  }}
                >
                  {t("دخول", "Log in")}
                </button>
                <button
                  className="primary small"
                  onClick={() => {
                    setError("");
                    setAuth("signup");
                  }}
                >
                  {t("انضم إلينا", "Join us")}
                </button>
              </>
            )}
            <button
              className="mobile-menu icon-btn"
              onClick={() => setMenu(!menu)}
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>
      {notice && (
        <div role="status" className="toast">
          <Check size={18} />
          {notice}
        </div>
      )}
      {error && !auth && (
        <div role="alert" className="error-bar">
          {error}
          <button onClick={() => setError("")} aria-label="Close">
            <X size={16} />
          </button>
        </div>
      )}
      <main className={view === "home" ? "home-main" : "workspace-main"}>
        {["account", "leaderboard"].includes(view) && !authChecked && (
          <section className="app-container narrow" role="status">
            {t("جارٍ تحميل حسابك…", "Loading your account…")}
          </section>
        )}
        {["account", "leaderboard"].includes(view) && authChecked && !me && (
          <section className="app-container narrow">
            <Empty
              title={t("أهلًا بك في من أجل مصر", "Welcome to Mn Agl Masr")}
              text={t("سجّل دخولك للمتابعة", "Log in to continue")}
              action={() => setAuth("login")}
              label={t("تسجيل الدخول", "Log in")}
            />
          </section>
        )}
        {view === "home" && (
          <CommunityExperience
            embedded
            live
            language={en}
            content={{ home, events, news }}
            loading={!initialized.current && !loadFailed}
            loadError={loadFailed}
            onRetry={() => refresh().catch(() => setLoadFailed(true))}
            onNavigate={go}
            onEvent={openEvent}
            onJoin={() => (me ? go("events") : setAuth("signup"))}
          />
        )}
        {view === "events" && (
          <section className="app-container">
            <div className="page-heading">
              <h1>{t("الفعاليات", "Events")}</h1>
              <div className="segmented">
                <button
                  className={!past ? "selected" : ""}
                  onClick={() => setPast(false)}
                >
                  {t("القادمة", "Upcoming")}
                </button>
                <button
                  className={past ? "selected" : ""}
                  onClick={() => setPast(true)}
                >
                  {t("السابقة", "Past")}
                </button>
              </div>
            </div>
            {me?.profile.role === "leader" && (
              <button
                className="outline create-button"
                onClick={() => setCreating(true)}
              >
                <Plus size={16} />
                {t("إنشاء فعالية", "Create event")}
              </button>
            )}
            {events.filter((e) =>
              past
                ? new Date(e.end_at) < new Date()
                : new Date(e.end_at) >= new Date(),
            ).length ? (
              <div className="timeline">
                {events
                  .filter((e) =>
                    past
                      ? new Date(e.end_at) < new Date()
                      : new Date(e.end_at) >= new Date(),
                  )
                  .map((e) => (
                    <div className="timeline-row" key={e.id}>
                      <time>
                        {date(e.start_at, en)}
                        <small>
                          {new Date(e.start_at).toLocaleDateString(
                            en ? "en" : "ar",
                            { weekday: "long", timeZone: "Africa/Cairo" },
                          )}
                        </small>
                      </time>
                      <span className="timeline-dot" />
                      <EventCard
                        e={e}
                        en={en}
                        onClick={() => openEvent(e)}
                        registered={me?.registrations.some(
                          (r) => r.event_id === e.id && r.going,
                        )}
                      />
                    </div>
                  ))}
              </div>
            ) : (
              <Empty
                title={t("لا توجد فعاليات حتى الآن", "No events here yet")}
                text={t(
                  "ستجد الفعاليات الجديدة هنا بعد الإعلان عنها.",
                  "New events will appear here when announced.",
                )}
              />
            )}
          </section>
        )}
        {view === "event" && selected && (
          <section className="event-detail app-container">
            <aside>
              <div className="event-cover">
                {selected.cover_url ? (
                  <img src={selected.cover_url} alt="" />
                ) : (
                  <div className="cover-letter" aria-hidden="true">
                    <img
                      className="cover-badge"
                      src="/assets/cairo-student-logo.jpg"
                      alt=""
                      width={52}
                      height={52}
                    />
                    <h2>{selected.title}</h2>
                    <span>
                      {t("طلاب من أجل مصر", "Mn Agl Masr")}
                      <br />
                      {t(
                        "كلية العلوم، جامعة القاهرة",
                        "Faculty of Science, Cairo University",
                      )}
                    </span>
                  </div>
                )}
              </div>
              <p className="muted">{t("تنظيم", "Presented by")}</p>
              <h3>
                {t(
                  "طلاب من أجل مصر, كلية العلوم، جامعة القاهرة",
                  "Mn Agl Masr, Faculty of Science, Cairo University",
                )}
              </h3>
            </aside>
            <div>
              <button className="text-btn back" onClick={() => go("events")}>
                {t("الفعاليات", "Events")}
                <ChevronLeft size={15} />
              </button>
              <h1>{selected.title}</h1>
              <div className="event-meta">
                <CalendarDays />
                <div>
                  {date(selected.start_at, en)}
                  <small>
                    {new Date(selected.start_at).toLocaleTimeString(
                      en ? "en-GB" : "ar-EG",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Africa/Cairo",
                      },
                    )}
                  </small>
                </div>
              </div>
              <div className="event-meta">
                <MapPin />
                <div>{selected.location}</div>
              </div>
              <div className="event-meta">
                <Trophy />
                <span className="status-label status-points">
                  {selected.points}{" "}
                  {t("نقطة عند الحضور", "points for attending")}
                </span>
              </div>
              <div className="registration-card">
                <h3>
                  {me?.registrations.some(
                    (r) => r.event_id === selected.id && r.going,
                  )
                    ? t("أنت مشارك", "You’re going")
                    : t("شارك في الفعالية", "Join this event")}
                </h3>
                {me?.registrations.some(
                  (r) => r.event_id === selected.id && r.going,
                ) && (
                  <span className="status-label status-confirmed registration-status">
                    <Check size={14} />
                    {t("مشاركة مؤكدة", "Registration confirmed")}
                  </span>
                )}
                {me ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const data = Object.fromEntries(
                        new FormData(e.currentTarget),
                      );
                      run(async () => {
                        await api("rsvp", { ...data, event_id: selected.id });
                        await refreshMe();
                        setNotice(
                          t(
                            "تم التسجيل وحفظ طلباتك. مقبولة تلقائيًا.",
                            "Registration saved. Your requests are automatically accepted.",
                          ),
                        );
                      });
                    }}
                  >
                    <label>
                      {t(
                        "تسهيلات تحتاجها لهذه الفعالية (اختياري)",
                        "Accommodations for this event (optional)",
                      )}
                      <textarea
                        name="accommodation"
                        maxLength={2000}
                        defaultValue={
                          me.registrations.find(
                            (r) => r.event_id === selected.id,
                          )?.accommodation
                        }
                        placeholder={t(
                          "أخبرنا بما يساعدك على المشاركة",
                          "Tell us what would help you take part",
                        )}
                      />
                    </label>
                    <label>
                      {t(
                        "عذر رسمي لمحاضرة أو سكشن متعارض (اختياري)",
                        "Academic excuse for a conflicting class (optional)",
                      )}
                      <textarea
                        name="excuse"
                        maxLength={2000}
                        defaultValue={
                          me.registrations.find(
                            (r) => r.event_id === selected.id,
                          )?.excuse
                        }
                        placeholder={t(
                          "اسم المقرر، المحاضرة أو السكشن، الموعد",
                          "Course, lecture or section, and time",
                        )}
                      />
                    </label>
                    <span className="status-label status-confirmed request-status">
                      <Check size={14} />
                      {t(
                        "الطلبات مقبولة تلقائيًا",
                        "Requests automatically accepted",
                      )}
                    </span>
                    <p className="small muted">
                      {t(
                        "طلباتك تخص هذه الفعالية فقط، وتُقبل تلقائيًا.",
                        "These requests belong only to this event and are automatically accepted.",
                      )}
                    </p>
                    <button className="primary full" disabled={busy}>
                      {busy ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <Check size={17} />
                      )}{" "}
                      {t(
                        "تأكيد المشاركة وحفظ الطلبات",
                        "Confirm attendance & save requests",
                      )}
                    </button>
                    {me.registrations.some(
                      (r) => r.event_id === selected.id && r.going,
                    ) && (
                      <button
                        type="button"
                        className="text-btn cancel"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await api("rsvp", {
                              event_id: selected.id,
                              going: false,
                            });
                            await refreshMe();
                            setNotice(
                              t("تم إلغاء المشاركة", "Registration cancelled"),
                            );
                          })
                        }
                      >
                        {t("إلغاء المشاركة", "Cancel registration")}
                      </button>
                    )}
                  </form>
                ) : (
                  <>
                    <p>
                      {t(
                        "سجّل دخولك للمشاركة وحفظ طلباتك.",
                        "Log in to register and save your requests.",
                      )}
                    </p>
                    <button
                      className="primary full"
                      onClick={() => setAuth("login")}
                    >
                      {t("تسجيل الدخول", "Log in")}
                    </button>
                  </>
                )}
              </div>
              <div className="about-event">
                <h3>{t("عن الفعالية", "About the event")}</h3>
                <p>{selected.description}</p>
              </div>
              {me?.profile.role === "leader" && (
                <div className="leader-panel">
                  <button className="outline" onClick={loadAttendees}>
                    {t(
                      "المشاركون وطلبات الأعذار",
                      "Attendees & academic excuses",
                    )}
                  </button>
                  {attendees.length > 0 && (
                    <>
                      <input
                        aria-label="Search phone"
                        placeholder={t("بحث برقم الهاتف", "Search by phone")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <button
                        className="outline"
                        onClick={() => {
                          const csv =
                            "\uFEFF" +
                            [
                              [
                                "Name",
                                "Student code",
                                "Phone",
                                "Accommodation",
                                "Academic excuse",
                                "Status",
                                "Attended",
                              ],
                              ...attendees.map((r) => [
                                r.profiles.full_name,
                                r.profiles.student_code,
                                r.profiles.phone,
                                r.accommodation,
                                r.excuse,
                                "Accepted",
                                r.present ? "Yes" : "No",
                              ]),
                            ]
                              .map((row) =>
                                row
                                  .map(
                                    (c) =>
                                      '"' +
                                      String(c)
                                        .replace(/^[=+\-@]/, "'")
                                        .replaceAll('"', '""') +
                                      '"',
                                  )
                                  .join(","),
                              )
                              .join("\r\n");
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(
                            new Blob([csv], {
                              type: "text/csv;charset=utf-8;",
                            }),
                          );
                          a.download = "event-requests.csv";
                          a.click();
                          URL.revokeObjectURL(a.href);
                        }}
                      >
                        <Download size={16} />
                        {t("تصدير CSV", "Export CSV")}
                      </button>
                      {attendees
                        .filter((r) => r.profiles.phone.includes(search))
                        .map((r) => (
                          <article className="attendee" key={r.user_id}>
                            <b>{r.profiles.full_name}</b>
                            <span dir="ltr">{r.profiles.phone}</span>
                            {r.excuse && (
                              <p>
                                {t("عذر أكاديمي: ", "Academic excuse: ")}
                                {r.excuse}
                              </p>
                            )}
                            {r.accommodation && (
                              <p>
                                {t("تسهيلات: ", "Accommodation: ")}
                                {r.accommodation}
                              </p>
                            )}
                            <small className="status-label status-confirmed">
                              {t("الطلبات مقبولة", "Requests accepted")}
                            </small>
                            {r.present ? (
                              <span className="status-label status-confirmed attendance-present">
                                <Check size={14} />
                                {t("حاضر", "Present")}
                              </span>
                            ) : (
                              <button
                                className="small-btn"
                                disabled={busy}
                                onClick={() =>
                                  run(async () => {
                                    await api("manual", {
                                      event_id: selected.id,
                                      user_id: r.user_id,
                                    });
                                    await loadAttendees();
                                  })
                                }
                              >
                                {t("تسجيل الحضور", "Check in")}
                              </button>
                            )}
                          </article>
                        ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
        {view === "leaderboard" && me && (
          <section className="app-container narrow">
            <div className="page-heading">
              <h1>{t("المتصدرون", "Leaderboard")}</h1>
              <Trophy size={32} />
            </div>
            <div className="leaderboard">
              {rows.length ? (
                rows.map((r, i) => (
                  <div key={i}>
                    <span className="rank">{i + 1}</span>
                    <b>{r.full_name}</b>
                    <strong>
                      {r.points}
                      <small>{t("نقطة", "points")}</small>
                    </strong>
                  </div>
                ))
              ) : (
                <Empty
                  title={t(
                    "هنا تبدأ المنافسة الجميلة",
                    "This is where it begins",
                  )}
                  text={t(
                    "شارك في فعالية واجمع أول نقاطك.",
                    "Join an event and earn your first points.",
                  )}
                />
              )}
            </div>
          </section>
        )}
        {view === "account" && me && (
          <section className="app-container narrow">
            <div className="page-heading">
              <h1>{t("حسابي", "My account")}</h1>
              <button
                className="icon-btn"
                aria-label="Log out"
                onClick={() =>
                  run(async () => {
                    await api("logout", {}, true);
                    setMe(null);
                    go("home");
                  })
                }
              >
                <LogOut size={20} />
              </button>
            </div>
            <div className="account-summary">
              {me.profile.role === "leader" && (
                <span className="status-label status-confirmed account-role">
                  {t("قائد الفريق", "Team leader")}
                </span>
              )}
              <h2>{me.profile.full_name}</h2>
              <p dir="ltr">{me.profile.student_code}</p>
              <div className="account-points">
                {total}
                <small>{t("نقطة", "points")}</small>
              </div>
            </div>
            <div className="panel">
              <h3>{t("بياناتك", "Your details")}</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = Object.fromEntries(new FormData(e.currentTarget));
                  run(async () => {
                    const result = await api("profile", f);
                    setMe((current) =>
                      current
                        ? {
                            ...current,
                            profile: { ...current.profile, ...result.profile },
                          }
                        : current,
                    );
                    setNotice(t("تم حفظ بياناتك", "Contact details saved"));
                  });
                }}
              >
                <label>
                  {t("رقم الهاتف", "Phone number")}
                  <input
                    type="tel"
                    name="phone"
                    dir="ltr"
                    autoComplete="tel"
                    defaultValue={me.profile.phone}
                    pattern={"\\+?[0-9\\s\\-]{10,16}"}
                    maxLength={16}
                    required
                  />
                </label>
                <label>
                  {t("البريد الإلكتروني", "Email")}
                  <input
                    type="email"
                    name="email"
                    dir="ltr"
                    autoComplete="email"
                    defaultValue={me.profile.email || ""}
                    maxLength={254}
                  />
                </label>
                <button className="outline" disabled={busy}>
                  {t("حفظ التغييرات", "Save changes")}
                </button>
              </form>
            </div>
            <div className="panel">
              <h3>{t("مشاركاتي", "My registrations")}</h3>
              {me.registrations
                .filter((r) => r.going)
                .map((r) => {
                  const e = events.find((x) => x.id === r.event_id);
                  return e ? (
                    <button
                      key={e.id}
                      className="registration-row"
                      onClick={() => openEvent(e)}
                    >
                      <span>{e.title}</span>
                      <small>{date(e.start_at, en)}</small>
                      <ChevronLeft size={16} />
                    </button>
                  ) : null;
                })}
              {!me.registrations.some((r) => r.going) && (
                <p className="muted">
                  {t(
                    "لم تسجل في فعاليات بعد.",
                    "You haven’t registered for any events yet.",
                  )}
                </p>
              )}
            </div>
            {me.profile.role === "leader" && (
              <div className="panel">
                <h3>{t("أدوات القادة", "Leader tools")}</h3>
                <button className="primary" onClick={() => setCreating(true)}>
                  <Plus size={16} />
                  {t("إنشاء فعالية", "Create event")}
                </button>
                <form
                  className="news-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = Object.fromEntries(new FormData(e.currentTarget));
                    const form = e.currentTarget;
                    run(async () => {
                      await api("news", f);
                      await refresh();
                      form.reset();
                      setNotice(t("تم نشر الخبر", "News published"));
                    });
                  }}
                >
                  <h3>{t("نشر خبر", "Publish news")}</h3>
                  <label>
                    {t("عنوان الخبر", "Title")}
                    <input name="title" required maxLength={200} />
                  </label>
                  <label>
                    {t("التفاصيل", "Details")}
                    <textarea name="body" required maxLength={5000} />
                  </label>
                  <button className="outline" disabled={busy}>
                    {t("نشر", "Publish")}
                  </button>
                </form>
                <form
                  className="news-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = Object.fromEntries(new FormData(e.currentTarget));
                    run(async () => {
                      await api("home", {
                        home: {
                          video_url: f.video_url,
                          poster_url: f.poster_url,
                          gallery_urls: String(f.gallery_urls || "")
                            .split("\n")
                            .map((x) => x.trim())
                            .filter(Boolean),
                        },
                      });
                      await refresh();
                      setNotice(
                        t(
                          "تم حفظ وسائط الصفحة الرئيسية",
                          "Homepage media saved",
                        ),
                      );
                    });
                  }}
                >
                  <h3>{t("وسائط الصفحة الرئيسية", "Homepage media")}</h3>
                  <label>
                    {t("رابط فيديو MP4 (اختياري)", "MP4 video URL (optional)")}
                    <input
                      type="url"
                      name="video_url"
                      defaultValue={home.video_url}
                      pattern="https://.*"
                    />
                  </label>
                  <label>
                    {t("رابط الصورة البديلة", "Fallback image URL")}
                    <input
                      type="url"
                      name="poster_url"
                      defaultValue={home.poster_url}
                      pattern="https://.*"
                    />
                  </label>
                  <label>
                    {t(
                      "صور المعرض - رابط في كل سطر",
                      "Gallery images - one URL per line",
                    )}
                    <textarea
                      name="gallery_urls"
                      defaultValue={home.gallery_urls?.join("\n")}
                    />
                  </label>
                  <button className="outline" disabled={busy}>
                    {t("حفظ الوسائط", "Save media")}
                  </button>
                </form>
              </div>
            )}
          </section>
        )}
        {view === "scan" && authChecked && (
          <section className="app-container narrow">
            <h1>{t("تسجيل الحضور", "Check in")}</h1>
            <p className="muted">
              {t(
                "امسح رمز الحضور المطبوع من هنا وأنت مسجل الدخول.",
                "Scan the printed attendance code here while logged in.",
              )}
            </p>
            {me ? (
              <Scanner
                en={en}
                onCode={async (code) => {
                  const result = await api("scan", { code });
                  setNotice(
                    result.alreadyRecorded
                      ? t(
                          "حضورك مسجل بالفعل",
                          "Your attendance is already recorded",
                        )
                      : t(
                          "تم حفظ حضورك ونقاطك",
                          "Your attendance and points are saved",
                        ),
                  );
                  await refreshMe();
                }}
              />
            ) : (
              <button className="primary" onClick={() => setAuth("login")}>
                {t("سجل دخولك أولًا", "Log in first")}
              </button>
            )}
          </section>
        )}
      </main>
      <footer>
        <div className="footer-brand">
          من أجل مصر{" "}
          <small>
            {t(
              "كلية العلوم، جامعة القاهرة",
              "Faculty of Science, Cairo University",
            )}
          </small>
        </div>
        <span>© {new Date().getFullYear()}</span>
      </footer>
      {auth && (
        <div
          className="modal-overlay"
          onClick={() => {
            setAuth(null);
            setError("");
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            className="modal auth-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close icon-btn"
              aria-label="Close"
              onClick={() => {
                setAuth(null);
                setError("");
              }}
            >
              <X size={20} />
            </button>
            <img
              className="app-logo auth-logo"
              src="/assets/cairo-student-logo.jpg"
              width={58}
              height={58}
              alt={t(
                "شعار طلاب من أجل مصر، جامعة القاهرة",
                "Students for Egypt, Cairo University logo",
              )}
            />
            <h2 id="auth-title">
              {auth === "signup"
                ? t("بداية حكايتك", "Your story starts here")
                : auth === "recover"
                  ? t("استعادة حسابك", "Recover your account")
                  : t("أهلًا برجوعك", "Welcome back")}
            </h2>
            <p className="muted">
              {t(
                "طلاب من أجل مصر, كلية العلوم، جامعة القاهرة",
                "Mn Agl Masr, Faculty of Science, Cairo University",
              )}
            </p>
            <form onSubmit={register}>
              {auth === "signup" && (
                <label>
                  {t("الاسم بالكامل", "Full name")}
                  <input
                    name="full_name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </label>
              )}
              <label>
                {t("كود الطالب", "Student code")}
                <input
                  name="student_code"
                  dir="ltr"
                  placeholder="2527646"
                  pattern="[0-9]{7}"
                  maxLength={7}
                  inputMode="numeric"
                  autoComplete="username"
                  required
                />
              </label>
              {auth === "signup" && (
                <>
                  <label>
                    {t("رقم الهاتف", "Phone number")}
                    <input
                      name="phone"
                      type="tel"
                      dir="ltr"
                      autoComplete="tel"
                      pattern="\+?[0-9\s-]{10,16}"
                      required
                    />
                  </label>
                  <label>
                    {t("الرقم القومي", "National ID")}
                    <input
                      name="national_id"
                      inputMode="numeric"
                      dir="ltr"
                      pattern="[0-9]{14}"
                      maxLength={14}
                      autoComplete="off"
                      required
                    />
                    <small>
                      {t(
                        "14 رقمًا. لا يمكن عرضه أو تغييره بعد التسجيل.",
                        "14 digits. It cannot be viewed or changed after submission.",
                      )}
                    </small>
                  </label>
                </>
              )}
              {auth === "recover" && (
                <label>
                  {t("كود الاستعادة", "Recovery code")}
                  <input
                    name="recovery_code"
                    dir="ltr"
                    required
                    minLength={20}
                    autoComplete="off"
                  />
                </label>
              )}
              <label>
                {auth === "recover"
                  ? t("كلمة المرور الجديدة", "New password")
                  : t("كلمة المرور", "Password")}
                <input
                  name="password"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete={
                    auth === "login" ? "current-password" : "new-password"
                  }
                  required
                />
                <small>
                  {t("12 حرفًا على الأقل", "At least 12 characters")}
                </small>
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="primary full" disabled={busy}>
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : auth === "signup" ? (
                  t("إنشاء حساب", "Create account")
                ) : auth === "recover" ? (
                  t("حفظ كلمة المرور الجديدة", "Save new password")
                ) : (
                  t("تسجيل الدخول", "Log in")
                )}
              </button>
            </form>
            {auth === "login" && (
              <button
                className="forgot-password"
                onClick={() => {
                  setAuth("recover");
                  setError("");
                }}
              >
                {t("نسيت كلمة المرور؟", "Forgot password?")}
              </button>
            )}
            <p className="switch-auth">
              {auth === "signup"
                ? t("عندك حساب؟", "Already a member?")
                : t("أول مرة هنا؟", "New here?")}{" "}
              <button
                onClick={() => {
                  setAuth(auth === "signup" ? "login" : "signup");
                  setError("");
                }}
              >
                {auth === "signup"
                  ? t("سجل دخولك", "Log in")
                  : t("انضم إلينا", "Join us")}
              </button>
            </p>
          </section>
        </div>
      )}
      {recovery && (
        <div className="modal-overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Recovery code"
          >
            <h2>{t("احفظ كود استعادة حسابك", "Save your recovery code")}</h2>
            <p>
              {t(
                "الكود ده يظهر مرة واحدة فقط. خزّنه في مكان آمن خارج جهازك. الرقم القومي لا يُستخدم لاستعادة كلمة المرور.",
                "This code is shown only once. Store it somewhere safe. Your national ID is not used to recover your password.",
              )}
            </p>
            <code className="recovery-code" dir="ltr">
              {recovery}
            </code>
            <button
              className="outline"
              onClick={() => {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(
                  new Blob(["Mn Agl Masr recovery code\n" + recovery], {
                    type: "text/plain",
                  }),
                );
                a.download = "mn-agl-masr-recovery.txt";
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              <Download size={16} />
              {t("تحميل الكود", "Download code")}
            </button>
            <button className="primary full" onClick={() => setRecovery("")}>
              {t("حفظت الكود في مكان آمن", "I saved my code safely")}
            </button>
          </section>
        </div>
      )}
      {creating && (
        <div className="modal-overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Create event"
          >
            <button
              className="close icon-btn"
              aria-label="Close"
              onClick={() => setCreating(false)}
            >
              <X size={20} />
            </button>
            <h2>{t("فعالية جديدة", "New event")}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                run(async () => {
                  const d = await api("create-event", {
                    ...f,
                    points: Number(f.points),
                    start_at: new Date(String(f.start_at)).toISOString(),
                    end_at: new Date(String(f.end_at)).toISOString(),
                  });
                  setQr(d.code);
                  const QRCode = (await import("qrcode")).default;
                  setQrImage(
                    await QRCode.toDataURL(d.code, { width: 800, margin: 3 }),
                  );
                  setCreating(false);
                  await refresh();
                  setNotice(t("تم إنشاء الفعالية", "Event created"));
                });
              }}
            >
              <label>
                {t("العنوان", "Title")}
                <input name="title" required maxLength={200} />
              </label>
              <label>
                {t("الوصف ونقطة التجمع", "Description & meeting point")}
                <textarea name="description" required maxLength={5000} />
              </label>
              <label>
                {t("المكان", "Location")}
                <input name="location" required maxLength={300} />
              </label>
              <div className="form-columns">
                <label>
                  {t("البداية", "Starts")}
                  <input type="datetime-local" name="start_at" required />
                </label>
                <label>
                  {t("النهاية", "Ends")}
                  <input type="datetime-local" name="end_at" required />
                </label>
              </div>
              <label>
                {t("نقاط الحضور", "Attendance points")}
                <input
                  type="number"
                  name="points"
                  min={0}
                  max={10000}
                  defaultValue={10}
                  required
                />
              </label>
              <label>
                {t("رابط صورة الغلاف (اختياري)", "Cover image URL (optional)")}
                <input type="url" name="cover_url" pattern="https://.*" />
              </label>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <button className="primary full" disabled={busy}>
                {t("إنشاء وحفظ رمز الحضور", "Create & generate attendance QR")}
              </button>
            </form>
          </section>
        </div>
      )}
      {qr && (
        <div className="modal-overlay">
          <section
            className="modal qr-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Attendance QR"
          >
            <h2>{t("رمز حضور الفعالية", "Event attendance QR")}</h2>
            <p>
              {t(
                "اطبعه واحتفظ بنسخة منه. يُمسح فقط داخل التطبيق بعد تسجيل الدخول.",
                "Print and keep a copy. Scan it inside the app after logging in.",
              )}
            </p>
            <img src={qrImage} alt="Attendance QR" />
            <a
              className="primary full"
              href={qrImage}
              download="attendance-qr.png"
            >
              <Download size={16} />
              {t("تحميل للطباعة", "Download to print")}
            </a>
            <button
              className="text-btn"
              onClick={() => {
                setQr("");
                setQrImage("");
              }}
            >
              {t("تم", "Done")}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
function Empty({
  title,
  text,
  action,
  label,
}: {
  title: string;
  text: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <CalendarDays size={27} strokeWidth={1.3} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="outline" onClick={action}>
          {label}
        </button>
      )}
    </div>
  );
}
function EventCard({
  e,
  en,
  onClick,
  registered,
}: {
  e: EventItem;
  en: boolean;
  onClick: () => void;
  registered?: boolean;
}) {
  return (
    <button className="event-card" onClick={onClick}>
      <div className="event-card-copy">
        <time>
          {new Date(e.start_at).toLocaleTimeString(en ? "en-GB" : "ar-EG", {
            timeZone: "Africa/Cairo",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
        <h3>{e.title}</h3>
        <p>
          <MapPin size={15} />
          {e.location}
        </p>
        <div className="event-card-bottom">
          <span className="status-label status-points">
            {e.points} {en ? "points" : "نقطة"}
          </span>
          {registered && (
            <span className="status-label status-confirmed">
              <Check size={14} />
              {en ? "You’re going" : "أنت مشارك"}
            </span>
          )}
        </div>
      </div>
      <div className="event-thumbnail">
        {e.cover_url ? (
          <img src={e.cover_url} alt="" />
        ) : (
          <img
            className="event-logo"
            src="/assets/cairo-student-logo.jpg"
            alt=""
          />
        )}
      </div>
    </button>
  );
}
function Scanner({
  en,
  onCode,
}: {
  en: boolean;
  onCode: (code: string) => Promise<void>;
}) {
  const video = useRef<HTMLVideoElement>(null),
    stop = useRef<(() => void) | null>(null),
    [active, setActive] = useState(false),
    [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => () => stop.current?.(), []);
  async function start() {
    setMessage("");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      setActive(true);
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        video.current!,
        async (result, _error, scanControls) => {
          if (result) {
            scanControls.stop();
            setActive(false);
            setSaving(true);
            try {
              await onCode(result.getText());
              setMessage(en ? "Attendance saved." : "تم حفظ الحضور.");
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Failed");
            } finally {
              setSaving(false);
            }
          }
        },
      );
      stop.current = () => controls.stop();
    } catch {
      setActive(false);
      setMessage(
        en
          ? "Camera unavailable. Allow camera access in your browser, then try again."
          : "الكاميرا غير متاحة. اسمح بالوصول إلى الكاميرا من إعدادات المتصفح، وحاول مجددًا.",
      );
    }
  }
  return (
    <div className="scanner">
      <div className="camera-window">
        <video ref={video} muted playsInline />
        {!active && <ScanLine size={64} strokeWidth={1} />}
      </div>
      <p role="status">
        {saving ? (en ? "Saving attendance…" : "جارٍ حفظ الحضور…") : message}
      </p>
      <button
        className="primary full"
        disabled={active || saving}
        onClick={start}
      >
        <ScanLine size={17} />
        {en ? "Open camera" : "فتح الكاميرا"}
      </button>
      {active && (
        <button
          className="outline"
          onClick={() => {
            stop.current?.();
            setActive(false);
          }}
        >
          {en ? "Stop camera" : "إيقاف الكاميرا"}
        </button>
      )}
    </div>
  );
}
