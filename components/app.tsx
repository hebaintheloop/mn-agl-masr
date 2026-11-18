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
  Users,
  Shirt,
} from "lucide-react";
import { toAsciiDigits } from "@/lib/number-input";
import { uiError } from "@/lib/ui-error";
import { PwaInstall } from "./pwa-install";
import { ImageUpload, ImagePreview } from "./image-upload";
import { EventArtwork } from "./event-artwork";
import { PasswordField } from "./password-field";
import { CommunityExperience } from "./design-preview";
import { LeaderWorkspace } from "./leader-workspace";
import { LeaderAttendance } from "./leader-attendance";
import { cairoLocalToISO } from "@/lib/cairo-time";
type EventItem = {
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
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
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
  if (!r.ok) throw new ApiError(uiError(v.error), r.status);
  return v;
}
const date = (s: string, en: boolean) =>
  new Date(s).toLocaleDateString(en ? "en-GB" : "ar-EG", {
    timeZone: "Africa/Cairo",
    day: "numeric",
    month: "long",
  });
function normalizeNumberInput(e: React.FormEvent<HTMLInputElement>) {
  const input = e.currentTarget,
    value = toAsciiDigits(input.value);
  if (value !== input.value) {
    const caret = input.selectionStart;
    input.value = value;
    if (caret !== null) input.setSelectionRange(caret, caret);
  }
}
export default function App() {
  const [home, setHome] = useState<{
    video_url?: string;
    poster_url?: string;
    gallery_urls?: string[];
  }>({});
  const en = false;
  const [dark, setDark] = useState(false),
    [view, setView] = useState("home"),
    [auth, setAuth] = useState<string | null>(null),
    [me, setMe] = useState<Me | null>(null),
    [authChecked, setAuthChecked] = useState(false),
    [profileFailed, setProfileFailed] = useState(false),
    [events, setEvents] = useState<EventItem[]>([]),
    [selected, setSelected] = useState<EventItem | null>(null),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recovery, setRecovery] = useState(""),
    [menu, setMenu] = useState(false),
    [rows, setRows] = useState<{ full_name: string; points: number }[]>([]),
    [leaderboardLoading, setLeaderboardLoading] = useState(true),
    [leaderboardFailed, setLeaderboardFailed] = useState(false),
    [leaderboardRetry, setLeaderboardRetry] = useState(0),
    [creating, setCreating] = useState(false),
    [uploadBusy, setUploadBusy] = useState(false),
    [qr, setQr] = useState(""),
    [qrImage, setQrImage] = useState(""),
    [manageRoster, setManageRoster] = useState(false),
    [eventDraft, setEventDraft] = useState<Record<string, string>>({}),
    [qrError, setQrError] = useState(""),
    [loadFailed, setLoadFailed] = useState(false),
    [past, setPast] = useState(false);
  const t = (ar: string, eng: string) => (en ? eng : ar);
  const initialized = useRef(false);
  const operationBusy = useRef(false);
  const dataRequest = useRef(0);
  const uploadBusyRef = useRef(false);
  uploadBusyRef.current = uploadBusy;
  const refresh = async (fresh = false) => {
    const request = ++dataRequest.current;
    const [r, memberEvents] = await Promise.all([
      fetch("/api/action" + (fresh ? "?fresh=" + Date.now() : "")),
      api("events").catch((e) => {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }),
    ]);
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    const nextEvents: EventItem[] =
      memberEvents?.events ||
      (d.events || []).filter(
        (e: EventItem) => new Date(e.end_at) <= new Date(),
      );
    if (request !== dataRequest.current) return nextEvents;
    setEvents(nextEvents);
    setHome(d.home || {});
    setLoadFailed(false);
    if (!initialized.current) {
      initialized.current = true;
      const params = new URLSearchParams(location.search);
      const id = params.get("event");
      if (id) {
        const event = nextEvents.find((e) => e.id === id);
        if (event) {
          setManageRoster(params.get("manage") === "1");
          setSelected(event);
          setView("event");
        } else if (memberEvents) {
          try {
            const result = await api("event", { event_id: id });
            setSelected(result.event);
            setView("event");
          } catch {
            setView("event-missing");
          }
        } else setView("event-gate");
      } else if (
        ["events", "leaderboard", "account", "scan", "leader"].includes(
          params.get("view") || "",
        )
      )
        setView(params.get("view")!);
    }
    return nextEvents;
  };
  const refreshMe = async () => {
    try {
      setMe(await api("me"));
      setProfileFailed(false);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setMe(null);
        setProfileFailed(false);
      } else setProfileFailed(true);
      return false;
    } finally {
      setAuthChecked(true);
    }
  };
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
    const params = new URLSearchParams(location.search);
    if (params.get("event")) setView("event-loading");
    else if (
      ["events", "leaderboard", "account", "scan", "leader"].includes(
        params.get("view") || "",
      )
    )
      setView(params.get("view")!);
    if (params.get("join") === "1") setAuth("signup");
    refresh().catch(() => setLoadFailed(true));
    refreshMe();
  }, []);
  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  }, []);
  useEffect(() => {
    if (view !== "leaderboard") return;
    let active = true;
    setLeaderboardLoading(true);
    setLeaderboardFailed(false);
    setRows([]);
    api("leaderboard")
      .then((d) => {
        if (active) setRows(d.rows);
      })
      .catch(() => {
        if (active) setLeaderboardFailed(true);
      })
      .finally(() => {
        if (active) setLeaderboardLoading(false);
      });
    return () => {
      active = false;
    };
  }, [view, leaderboardRetry]);
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
    if (operationBusy.current) return;
    operationBusy.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(uiError(e instanceof Error ? e.message : null));
    } finally {
      operationBusy.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    const pop = () => {
      const q = new URLSearchParams(location.search);
      const e = events.find((x) => x.id === q.get("event"));
      setManageRoster(q.get("manage") === "1");
      setSelected(e || null);
      setView(
        e ? "event" : q.get("event") ? "event-gate" : q.get("view") || "home",
      );
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [events]);
  useEffect(() => {
    if (!menu) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        document.querySelector<HTMLButtonElement>(".mobile-menu")?.focus();
      }
    };
    const outside = (e: PointerEvent) => {
      if (!(e.target as Element).closest(".site-header")) setMenu(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
    };
  }, [menu]);
  useEffect(() => {
    if (!auth && !creating && !recovery && !qr) return;
    const previous = document.activeElement as HTMLElement;
    const modal = document.querySelector<HTMLElement>("[role=dialog]");
    const first =
      modal?.querySelector<HTMLElement>(
        'input:not([type="hidden"]),textarea',
      ) || modal?.querySelector<HTMLElement>("button,a[href]");
    first?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !recovery) {
        if (operationBusy.current || uploadBusyRef.current) return;
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
  const RegistrationContainer =
    me?.profile.role === "leader" ? "details" : "div";
  const total = me?.points.reduce((s, x) => s + x.points, 0) || 0;
  function openEvent(e: EventItem, manage = false) {
    setManageRoster(manage);
    history.pushState(
      null,
      "",
      "/?event=" + e.id + (manage ? "&manage=1" : ""),
    );
    setSelected(e);
    setView("event");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function register(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.currentTarget));
    for (const key of ["student_code", "phone", "national_id"])
      if (typeof f[key] === "string") f[key] = toAsciiDigits(f[key]);
    await run(async () => {
      const d = await api(auth!, f, true);
      await refreshMe();
      if (d.recovery) setRecovery(d.recovery);
      const returnEvent = new URLSearchParams(location.search).get("event");
      setAuth(null);
      let updatedEvents: EventItem[] = [];
      try {
        updatedEvents = await refresh(true);
      } catch {
        setLoadFailed(true);
      }
      if (returnEvent) {
        const found = updatedEvents.find((e) => e.id === returnEvent);
        if (found) openEvent(found);
        else {
          try {
            const result = await api("event", { event_id: returnEvent });
            openEvent(result.event);
          } catch (e) {
            setView(
              e instanceof ApiError && e.status === 404
                ? "event-missing"
                : "event-gate",
            );
          }
        }
      } else go("events");
      setNotice(t("أهلًا بك في من أجل مصر", "Welcome to Mn Agl Masr"));
    });
  }
  async function generateQr(code: string) {
    setQrError("");
    try {
      const QRCode = (await import("qrcode")).default;
      setQrImage(await QRCode.toDataURL(code, { width: 800, margin: 3 }));
    } catch {
      setQrError(
        t(
          "الفعالية اتعملت. أعد محاولة عرض الرمز.",
          "Event created. Retry generating its QR image.",
        ),
      );
    }
  }
  return (
    <>
      <header className="site-header">
        <div className="nav-wrap">
          <button
            className="wordmark"
            onClick={() => go("home")}
            aria-label="الرئيسية"
          >
            <img
              className="app-logo"
              src="/assets/cairo-student-logo.png"
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
          <nav
            id="main-navigation"
            className={menu ? "open" : ""}
            aria-label="القائمة الرئيسية"
          >
            {!me && authChecked && !profileFailed && (
              <button
                className="mobile-login"
                onClick={() => {
                  setMenu(false);
                  setError("");
                  setAuth("login");
                }}
              >
                تسجيل الدخول
              </button>
            )}
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
            {me?.profile.role === "leader" && (
              <button
                className={"leader-nav " + (view === "leader" ? "active" : "")}
                onClick={() => go("leader")}
              >
                {t("الإدارة", "Manage")}
              </button>
            )}
            <button
              className={view === "leaderboard" ? "active" : ""}
              onClick={() => go("leaderboard")}
            >
              {t("المتصدرون", "Leaderboard")}
            </button>
            {me && (
              <>
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
            {!authChecked || (profileFailed && !me) ? (
              <span
                className="nav-session-loading"
                role="status"
                aria-label="جارٍ تحميل حسابك"
              >
                <LoaderCircle className="spin" size={18} />
              </span>
            ) : me ? (
              <button
                className="small-btn"
                onClick={() =>
                  go(me.profile.role === "leader" ? "leader" : "scan")
                }
              >
                {me.profile.role === "leader" ? (
                  <Users size={16} />
                ) : (
                  <ScanLine size={16} />
                )}
                {me.profile.role === "leader"
                  ? t("الإدارة", "Manage")
                  : t("الحضور", "Check in")}
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
                  {t("سجّل معانا", "Join us")}
                </button>
              </>
            )}
            <button
              className="mobile-menu icon-btn"
              onClick={() => setMenu(!menu)}
              aria-label="القائمة"
              aria-expanded={menu}
              aria-controls="main-navigation"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>
      {profileFailed && (
        <div className="profile-retry" role="alert">
          <p>مش قادرين نحدّث بيانات حسابك دلوقتي. جرّب التحديث تاني.</p>
          <button
            className="outline"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await refreshMe();
              })
            }
          >
            تحديث الحساب
          </button>
        </div>
      )}
      {notice && (
        <div role="status" className="toast">
          <Check size={18} />
          {notice}
        </div>
      )}
      {error && !auth && !creating && (
        <div role="alert" className="error-bar">
          {error}
          <button onClick={() => setError("")} aria-label="إغلاق">
            <X size={16} />
          </button>
        </div>
      )}
      <main className={view === "home" ? "home-main" : "workspace-main"}>
        {view === "event-loading" && (
          <section className="app-container narrow">
            {loadFailed ? (
              <Empty
                title="مش قادرين نحمّل الفعالية دلوقتي"
                text="جرّب تاني بعد لحظة."
                label="جرّب تاني"
                action={() =>
                  run(async () => {
                    await refresh(true);
                  })
                }
              />
            ) : (
              <p role="status">بنحمّل الفعالية…</p>
            )}
          </section>
        )}
        {view === "account" && !authChecked && (
          <section className="app-container narrow" role="status">
            {t("جارٍ تحميل حسابك…", "Loading your account…")}
          </section>
        )}
        {view === "account" && authChecked && !me && !profileFailed && (
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
            content={{ home, events }}
            onNavigate={go}
            onEvent={openEvent}
            onJoin={() => (me ? go("events") : setAuth("signup"))}
          />
        )}
        {view === "leader" &&
          authChecked &&
          (me || !profileFailed) &&
          (me?.profile.role === "leader" ? (
            <LeaderWorkspace
              events={events}
              home={home}
              en={en}
              onCreate={() => {
                setError("");
                setCreating(true);
              }}
              onManage={(event) => openEvent(event, true)}
              api={api}
              onRefresh={async () => {
                await refresh(true);
              }}
            />
          ) : (
            <section className="app-container narrow">
              <Empty
                title={t("هذه الصفحة للقادة", "Leader access required")}
                text={t(
                  "سجّل الدخول بحساب قائد لعرض أدوات الإدارة.",
                  "Sign in with a leader account to use these tools.",
                )}
              />
            </section>
          ))}
        {(me || !profileFailed) &&
          (view === "event-gate" ||
            (view === "events" && authChecked && !me) ||
            (view === "event" &&
              selected &&
              !me &&
              authChecked &&
              new Date(selected.end_at) > new Date())) && (
            <section className="app-container narrow event-enroll">
              <h1>
                {me
                  ? "مش قادرين نعرض الفعالية دلوقتي"
                  : "سجّل معانا عشان تأكد مشاركتك"}
              </h1>
              {me ? (
                <>
                  <p>جرّب تفتح الفعالية تاني.</p>
                  <button
                    className="primary"
                    onClick={() =>
                      run(async () => {
                        const id = new URLSearchParams(location.search).get(
                          "event",
                        );
                        if (!id) {
                          go("events");
                          return;
                        }
                        try {
                          const result = await api("event", { event_id: id });
                          openEvent(result.event);
                        } catch (e) {
                          if (e instanceof ApiError && e.status === 404)
                            setView("event-missing");
                          else throw e;
                        }
                      })
                    }
                  >
                    افتح الفعالية
                  </button>
                </>
              ) : (
                <>
                  <p>
                    الفعاليات الجاية متاحة لأعضاء الأسرة. اعمل حسابك، ولو عندك
                    حساب سجّل دخولك.
                  </p>
                  <div>
                    <button
                      className="primary"
                      onClick={() => setAuth("signup")}
                    >
                      اعمل حسابك
                    </button>
                    <button
                      className="outline"
                      onClick={() => setAuth("login")}
                    >
                      عندي حساب، سجّل دخولي
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
        {view === "event-missing" && (
          <section className="app-container narrow">
            <Empty
              title="الفعالية مش موجودة"
              text="راجع الرابط أو شوف الفعاليات الموجودة."
              action={() => go("events")}
              label="شوف الفعاليات"
            />
          </section>
        )}
        {view === "events" && me && (
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
                title={t("لسه مفيش فعاليات", "No events here yet")}
                text={t(
                  "أول ما ننزل فعالية، هتلاقيها هنا.",
                  "New events will appear here when announced.",
                )}
              />
            )}
          </section>
        )}
        {view === "event" &&
          selected &&
          (me || new Date(selected.end_at) <= new Date()) && (
            <section
              className={
                "event-detail app-container " +
                (me?.profile.role === "leader" ? "leader-event-detail" : "")
              }
            >
              <aside>
                <div className="event-cover">
                  <EventArtwork
                    title={selected.title}
                    src={selected.cover_url}
                    large
                  />
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
                      )}{" "}
                      إلى{" "}
                      {new Date(selected.end_at).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Africa/Cairo",
                      })}
                      {date(selected.start_at, false) !==
                        date(selected.end_at, false) &&
                        `، ${date(selected.end_at, false)}`}
                      ، بتوقيت القاهرة
                    </small>
                  </div>
                </div>
                <div className="event-meta">
                  <MapPin />
                  <div>{selected.location}</div>
                </div>
                {selected.dress_code && (
                  <div className="event-meta">
                    <Shirt />
                    <div>
                      <small>{t("الزي المطلوب", "Dress code")}</small>
                      {selected.dress_code}
                    </div>
                  </div>
                )}
                <div className="event-meta">
                  <Trophy />
                  <span className="status-label status-points">
                    {selected.points}{" "}
                    {t("نقطة عند الحضور", "points for attending")}
                  </span>
                </div>
                {me?.profile.role === "leader" && (
                  <>
                    <button
                      className="text-btn leader-back"
                      onClick={() => go("leader")}
                    >
                      <ChevronLeft size={17} />
                      {t("العودة للإدارة", "Back to management")}
                    </button>
                    <LeaderAttendance
                      key={selected.id}
                      event={selected}
                      en={en}
                      api={api}
                      initialOpen={manageRoster}
                    />
                  </>
                )}
                <RegistrationContainer className="leader-personal">
                  {me?.profile.role === "leader" && (
                    <summary>
                      {t("مشاركتي في الفعالية", "My own registration")}
                    </summary>
                  )}
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
                            await api("rsvp", {
                              ...data,
                              event_id: selected.id,
                            });
                            setMe((current) =>
                              current
                                ? {
                                    ...current,
                                    registrations: [
                                      ...current.registrations.filter(
                                        (r) => r.event_id !== selected.id,
                                      ),
                                      {
                                        event_id: selected.id,
                                        going: true,
                                        accommodation: String(
                                          data.accommodation || "",
                                        ),
                                        excuse: String(data.excuse || ""),
                                        request_status: "accepted",
                                      },
                                    ],
                                  }
                                : current,
                            );
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
                            "تسهيلات لاحتياج طبي أو إعاقة في الفعالية دي (اختياري)",
                            "Medical or disability accommodations for this event (optional)",
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
                              "اكتب المساعدة اللي محتاجها، مش لازم تذكر التشخيص",
                              "Describe the support you need; no diagnosis is required",
                            )}
                          />
                        </label>
                        <label>
                          {t(
                            "عذر لمحاضرة أو سكشن في نفس المعاد (اختياري)",
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
                            "الطلبات بتتقبل تلقائي",
                            "Requests automatically accepted",
                          )}
                        </span>
                        <p className="small muted">
                          {t(
                            "طلباتك للفعالية دي بس، وبتتقبل تلقائي.",
                            "These requests belong only to this event and are automatically accepted.",
                          )}
                        </p>
                        <button className="primary full" disabled={busy}>
                          {busy ? (
                            <LoaderCircle className="spin" size={17} />
                          ) : (
                            <Check size={17} />
                          )}{" "}
                          {me.registrations.some(
                            (r) => r.event_id === selected.id && r.going,
                          )
                            ? "حفظ التعديلات"
                            : "أكد مشاركتك واحفظ الطلبات"}
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
                                setMe((current) =>
                                  current
                                    ? {
                                        ...current,
                                        registrations:
                                          current.registrations.map((r) =>
                                            r.event_id === selected.id
                                              ? { ...r, going: false }
                                              : r,
                                          ),
                                      }
                                    : current,
                                );
                                await refreshMe();
                                setNotice(
                                  t("مشاركتك اتلغت", "Registration cancelled"),
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
                </RegistrationContainer>
                <div className="about-event">
                  <h3>{t("عن الفعالية", "About the event")}</h3>
                  <p>{selected.description}</p>
                </div>
              </div>
            </section>
          )}
        {view === "leaderboard" && (
          <section className="app-container narrow">
            <div className="page-heading">
              <h1>{t("المتصدرون", "Leaderboard")}</h1>
              <Trophy size={32} />
            </div>
            <div className="leaderboard">
              {leaderboardLoading ? (
                <p role="status">بنحمّل المتصدرين…</p>
              ) : leaderboardFailed ? (
                <Empty
                  title="مش قادرين نعرض المتصدرين دلوقتي"
                  text="جرّب تاني بعد لحظة."
                  action={() => setLeaderboardRetry((n) => n + 1)}
                  label="جرّب تاني"
                />
              ) : rows.length ? (
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
                  title={t("لسه مفيش نقاط", "This is where it begins")}
                  text={t(
                    "نقاط الحضور هتظهر هنا أول ما تتسجّل.",
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
                aria-label="تسجيل الخروج"
                onClick={() =>
                  run(async () => {
                    await api("logout", {}, true);
                    setMe(null);
                    setEvents([]);
                    go("home");
                    await refresh(true);
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
                  if (typeof f.phone === "string")
                    f.phone = toAsciiDigits(f.phone);
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
                    setNotice(t("بياناتك اتحفظت", "Contact details saved"));
                  });
                }}
              >
                <label>
                  {t("رقم الهاتف", "Phone number")}
                  <input
                    type="tel"
                    name="phone"
                    onInput={normalizeNumberInput}
                    dir="ltr"
                    autoComplete="tel"
                    defaultValue={me.profile.phone}
                    pattern={"\\+?[0-9٠-٩۰-۹\\s\\-]{10,16}"}
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
                    "لسه ما سجّلتش في أي فعالية.",
                    "You haven’t registered for any events yet.",
                  )}
                </p>
              )}
            </div>
            {me.profile.role === "leader" && (
              <div className="panel leader-shortcut">
                <button className="primary" onClick={() => go("leader")}>
                  {t("إدارة الأسرة", "Team management")}
                </button>
                <button
                  className="outline"
                  onClick={() => {
                    setError("");
                    setCreating(true);
                  }}
                >
                  <Plus size={16} />
                  {t("إنشاء فعالية", "Create event")}
                </button>
                <button className="outline" onClick={() => go("scan")}>
                  <ScanLine size={16} />
                  {t("مسح رمز حضوري", "Scan my attendance QR")}
                </button>
              </div>
            )}
          </section>
        )}
        {view === "scan" && authChecked && (me || !profileFailed) && (
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
        <PwaInstall />
        <span>© {new Date().getFullYear()}</span>
      </footer>
      {auth && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (operationBusy.current) return;
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
              aria-label="إغلاق"
              disabled={busy}
              onClick={() => {
                setAuth(null);
                setError("");
              }}
            >
              <X size={20} />
            </button>
            <img
              className="app-logo auth-logo"
              src="/assets/cairo-student-logo.png"
              width={58}
              height={58}
              alt={t(
                "شعار طلاب من أجل مصر، جامعة القاهرة",
                "Students for Egypt, Cairo University logo",
              )}
            />
            <h2 id="auth-title">
              {auth === "signup"
                ? t("اعمل حسابك", "Your story starts here")
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
                {t("كودك في الكلية", "Student code")}
                <input
                  name="student_code"
                  onInput={normalizeNumberInput}
                  dir="ltr"
                  placeholder="٧ أرقام"
                  pattern="[0-9٠-٩۰-۹]{7}"
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
                      onInput={normalizeNumberInput}
                      type="tel"
                      dir="ltr"
                      autoComplete="tel"
                      pattern={"\\+?[0-9٠-٩۰-۹\\s\\-]{10,16}"}
                      required
                    />
                  </label>
                  <label>
                    {t("الرقم القومي", "National ID")}
                    <input
                      name="national_id"
                      onInput={normalizeNumberInput}
                      inputMode="numeric"
                      dir="ltr"
                      pattern="[0-9٠-٩۰-۹]{14}"
                      maxLength={14}
                      autoComplete="off"
                      required
                    />
                    <small>
                      {t(
                        "14 رقم. مش هتقدر تشوفه أو تغيّره بعد التسجيل.",
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
              <PasswordField key={auth} mode={auth} />
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
                disabled={busy}
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
                  if (operationBusy.current) return;
                  setAuth(auth === "signup" ? "login" : "signup");
                  setError("");
                }}
              >
                {auth === "signup"
                  ? t("سجل دخولك", "Log in")
                  : t("سجّل معانا", "Join us")}
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
            aria-label="كود الاستعادة"
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
                  new Blob(["كود استعادة حساب من أجل مصر\n" + recovery], {
                    type: "text/plain",
                  }),
                );
                a.download = "mn-agl-masr-recovery.txt";
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 30000);
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
            aria-label="إنشاء فعالية"
          >
            <button
              className="close icon-btn"
              aria-label="إغلاق"
              disabled={uploadBusy || busy}
              onClick={() => {
                setCreating(false);
                setError("");
              }}
            >
              <X size={20} />
            </button>
            <h2>{t("فعالية جديدة", "New event")}</h2>
            <form
              onInput={(e) => {
                const changed = e.target as HTMLInputElement;
                if (!changed.name || changed.type === "file") return;
                const f = Object.fromEntries(new FormData(e.currentTarget));
                delete f.cover_url;
                setEventDraft((current) => ({
                  ...current,
                  ...Object.fromEntries(
                    Object.entries(f).map(([k, v]) => [k, String(v)]),
                  ),
                }));
                e.currentTarget
                  .querySelector<HTMLInputElement>('[name="end_at"]')
                  ?.setCustomValidity("");
              }}
              onSubmit={(e) => {
                e.preventDefault();
                if (uploadBusy) return;
                const f = Object.fromEntries(new FormData(e.currentTarget));
                let startAt: string, endAt: string;
                try {
                  startAt = cairoLocalToISO(String(f.start_at));
                  endAt = cairoLocalToISO(String(f.end_at));
                } catch {
                  setError(
                    t(
                      "راجع الموعد بتوقيت القاهرة. اختر وقتًا غير متكرر أو محذوف بسبب التوقيت الصيفي.",
                      "Check the Cairo date and time. Choose a time that is not repeated or skipped by daylight saving.",
                    ),
                  );
                  return;
                }
                if (new Date(endAt) <= new Date(startAt)) {
                  const end =
                    e.currentTarget.querySelector<HTMLInputElement>(
                      '[name="end_at"]',
                    )!;
                  end.setCustomValidity(
                    t(
                      "النهاية يجب أن تكون بعد البداية",
                      "End time must be after start time",
                    ),
                  );
                  end.reportValidity();
                  return;
                }
                run(async () => {
                  const d = await api("create-event", {
                    ...f,
                    points: Number(f.points),
                    start_at: startAt,
                    end_at: endAt,
                  });
                  setEventDraft({});
                  setCreating(false);
                  setQrImage("");
                  setQr(d.code);
                  await generateQr(d.code);
                  try {
                    await refresh(true);
                  } catch {
                    setLoadFailed(true);
                  }
                  setNotice(t("الفعالية اتعملت", "Event created"));
                });
              }}
            >
              <label>
                {t("العنوان", "Title")}
                <input
                  name="title"
                  required
                  minLength={2}
                  maxLength={200}
                  defaultValue={eventDraft.title}
                />
              </label>
              <label>
                {t("الوصف ونقطة التجمع", "Description & meeting point")}
                <textarea
                  name="description"
                  required
                  maxLength={5000}
                  defaultValue={eventDraft.description}
                />
              </label>
              <label>
                {t("المكان", "Location")}
                <input
                  name="location"
                  required
                  minLength={2}
                  maxLength={300}
                  defaultValue={eventDraft.location}
                />
              </label>
              <label>
                {t("الزي المطلوب (اختياري)", "Dress code (optional)")}
                <input
                  name="dress_code"
                  maxLength={300}
                  defaultValue={eventDraft.dress_code}
                  placeholder={t(
                    "مثال: ملابس رسمية أو كاجوال",
                    "For example: formal or casual",
                  )}
                />
              </label>
              <p className="leader-create-help">
                {t(
                  "كل المواعيد بتوقيت القاهرة. الأعذار والتسهيلات تُقبل تلقائيًا عند التسجيل.",
                  "All times are in Cairo. Excuse and accommodation requests are automatically accepted.",
                )}
              </p>
              <div className="form-columns">
                <label>
                  {t("البداية", "Starts")}
                  <input
                    type="datetime-local"
                    name="start_at"
                    defaultValue={eventDraft.start_at}
                    required
                  />
                </label>
                <label>
                  {t("النهاية", "Ends")}
                  <input
                    type="datetime-local"
                    name="end_at"
                    defaultValue={eventDraft.end_at}
                    required
                  />
                </label>
              </div>
              <label>
                {t("نقاط الحضور", "Attendance points")}
                <input
                  type="number"
                  name="points"
                  min={0}
                  max={10000}
                  defaultValue={eventDraft.points || 10}
                  required
                />
              </label>
              <div className="image-picker">
                <label>صورة الفعالية (اختياري)</label>
                <ImageUpload
                  api={api}
                  purpose="event"
                  onBusyChange={setUploadBusy}
                  onUploaded={(url) =>
                    setEventDraft((current) => ({ ...current, cover_url: url }))
                  }
                />
                <input
                  type="hidden"
                  name="cover_url"
                  value={eventDraft.cover_url || ""}
                />
                {eventDraft.cover_url ? (
                  <>
                    <ImagePreview url={eventDraft.cover_url} api={api} />
                    <button
                      type="button"
                      className="text-btn"
                      disabled={uploadBusy}
                      onClick={() =>
                        setEventDraft((current) => ({
                          ...current,
                          cover_url: "",
                        }))
                      }
                    >
                      شيل الصورة
                    </button>
                  </>
                ) : (
                  <div className="event-draft-art">
                    <EventArtwork
                      title={eventDraft.title || "عنوان الفعالية"}
                    />
                  </div>
                )}
                <details>
                  <summary>أو استخدم رابط صورة</summary>
                  <input
                    type="url"
                    aria-label="رابط صورة الفعالية"
                    disabled={uploadBusy}
                    value={eventDraft.cover_url || ""}
                    onChange={(e) =>
                      setEventDraft((current) => ({
                        ...current,
                        cover_url: e.target.value,
                      }))
                    }
                    pattern="https://.*"
                  />
                </details>
              </div>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <button className="primary full" disabled={busy || uploadBusy}>
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
            aria-label="رمز حضور الفعالية"
          >
            <h2>{t("رمز حضور الفعالية", "Event attendance QR")}</h2>
            <p>
              {t(
                "اطبعه واحتفظ بنسخة منه. يُمسح فقط داخل التطبيق بعد تسجيل الدخول.",
                "Print and keep a copy. Scan it inside the app after logging in.",
              )}
            </p>
            {qrImage ? (
              <>
                <img src={qrImage} alt="رمز حضور الفعالية" />
                <a
                  className="primary full"
                  href={qrImage}
                  download="attendance-qr.png"
                >
                  <Download size={16} />
                  {t("تحميل للطباعة", "Download to print")}
                </a>
              </>
            ) : qrError ? (
              <div role="alert" className="leader-error">
                {qrError}
                <button className="outline" onClick={() => generateQr(qr)}>
                  {t("عرض الرمز", "Generate QR image")}
                </button>
              </div>
            ) : (
              <p role="status">
                {t("جارٍ تجهيز الرمز…", "Preparing QR image…")}
              </p>
            )}
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
        <EventArtwork title={e.title} src={e.cover_url} />
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
