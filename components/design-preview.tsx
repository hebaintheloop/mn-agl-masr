"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpLeft,
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Sun,
  Moon,
  Pause,
  Play,
  X,
  Check,
} from "lucide-react";
import "./design-preview.css";
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
const examples: EventItem[] = [
  {
    id: "preview-science",
    title: "يوم العلوم المفتوح",
    description:
      "يوم نتعرف فيه على أفكار ومشروعات طلاب كليتنا، ونشارك في تنظيمه معًا.",
    location: "كلية العلوم، جامعة القاهرة، ساحة الكلية",
    start_at: "2026-12-05T08:00:00+02:00",
    end_at: "2026-12-05T16:00:00+02:00",
    points: 20,
    cover_url: null,
  },
  {
    id: "preview-workshop",
    title: "ورشة التصوير بالموبايل",
    description: "نتعلم أساسيات الصورة، ونجرّبها مع بعض في جولة داخل الكلية.",
    location: "كلية العلوم، جامعة القاهرة، قاعة الأنشطة",
    start_at: "2026-12-08T12:00:00+02:00",
    end_at: "2026-12-08T15:00:00+02:00",
    points: 10,
    cover_url: null,
  },
  {
    id: "preview-volunteer",
    title: "نجهّز معرض الكلية، سوا",
    description:
      "محتاجين إيدك في التحضير والتنظيم. المشاركة في الفعاليات الأكثر احتياجًا تمنحك نقاطًا إضافية.",
    location: "كلية العلوم، جامعة القاهرة، مدخل المعرض",
    start_at: "2026-12-10T09:00:00+02:00",
    end_at: "2026-12-10T15:00:00+02:00",
    points: 30,
    cover_url: null,
  },
];
const exampleTitles = [
  "Science Open Day",
  "Phone Photography Workshop",
  "Let’s prepare the faculty exhibition",
];
type CommunityProps = {
  embedded?: boolean;
  live?: boolean;
  language?: boolean;
  content?: {
    events: EventItem[];
    home: { video_url?: string; poster_url?: string; gallery_urls?: string[] };
    news: { id: string; title: string; body: string }[];
  };
  loading?: boolean;
  loadError?: boolean;
  onRetry?: () => void;
  onNavigate?: (view: string) => void;
  onEvent?: (event: EventItem) => void;
  onJoin?: () => void;
};
export default function DesignPreview() {
  return <CommunityExperience />;
}
export function CommunityExperience({
  embedded = false,
  live = false,
  language,
  content,
  loading = false,
  loadError = false,
  onRetry,
  onNavigate,
  onEvent,
  onJoin,
}: CommunityProps) {
  const [localEn, setEn] = useState(false),
    [dark, setDark] = useState(false),
    [tab, setTab] = useState("welcome"),
    [paused, setPaused] = useState(false),
    [videoFailed, setVideoFailed] = useState(false),
    [past, setPast] = useState(false),
    [fetchedEvents, setEvents] = useState<EventItem[]>([]),
    [selected, setSelected] = useState<EventItem | null>(null),
    [fetchedHome, setHome] = useState<{
      video_url?: string;
      poster_url?: string;
      gallery_urls?: string[];
    }>({}),
    [fetchedNews, setNews] = useState<
      { title: string; body: string; id: string }[]
    >([]);
  const video = useRef<HTMLVideoElement>(null);
  const en = language ?? localEn;
  const events = content?.events ?? fetchedEvents;
  const home = content?.home ?? fetchedHome;
  const news = content?.news ?? fetchedNews;
  const ContentTag = embedded ? "section" : "main";
  function join(event: React.MouseEvent<HTMLAnchorElement>) {
    if (onJoin) {
      event.preventDefault();
      onJoin();
    }
  }
  const t = (ar: string, english: string) => (en ? english : ar);
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
    if (embedded) return;
    if (new URLSearchParams(location.search).get("view") === "feed")
      setTab("feed");
    fetch("/api/action")
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events || []);
        setHome(d.home || {});
        setNews(d.news || []);
      })
      .catch(() => {});
  }, [embedded]);
  useEffect(() => {
    document.documentElement.dir = en ? "ltr" : "rtl";
    document.documentElement.lang = en ? "en" : "ar";
  }, [en]);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !paused && !reduced.matches)
        v.play().catch(() => {});
      else v.pause();
    });
    observer.observe(v);
    return () => {
      observer.disconnect();
      v.pause();
    };
  }, [paused, home.video_url, tab]);
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement as HTMLElement;
    const dialog = document.querySelector<HTMLElement>(".dp-event-dialog");
    const controls = Array.from(
      dialog?.querySelectorAll<HTMLElement>("button, a[href]") || [],
    );
    controls[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === controls[0]) {
          e.preventDefault();
          controls.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === controls.at(-1)) {
          e.preventDefault();
          controls[0]?.focus();
        }
      }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [selected]);
  const sample = !live && !events.length;
  const list = sample ? examples : events;
  const shown = list.filter((e) =>
    past ? new Date(e.end_at) < new Date() : new Date(e.end_at) >= new Date(),
  );
  const img = (i: number) =>
    home.gallery_urls?.[i] ||
    ["/assets/community.jpg", "/assets/campus.jpg", "/assets/workshop.jpg"][i];
  const title = (e: EventItem) =>
    en && e.id.startsWith("preview-")
      ? exampleTitles[examples.findIndex((x) => x.id === e.id)]
      : e.title;
  const day = (e: EventItem) =>
    new Date(e.start_at).toLocaleDateString(en ? "en-GB" : "ar-EG", {
      timeZone: "Africa/Cairo",
      day: "numeric",
      month: "short",
    });
  const Arrow = en ? ArrowUpRight : ArrowUpLeft;
  function navigate(next: string) {
    if (embedded && onNavigate) {
      onNavigate(next === "feed" ? "events" : "home");
      return;
    }
    setTab(next);
    history.replaceState(
      null,
      "",
      next === "feed" ? "/design-preview?view=feed" : "/design-preview",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const cards = (items: EventItem[]) =>
    items.map((e, i) => (
      <div className="dp-timeline-row" key={e.id}>
        <time>
          {day(e)}
          <small>
            {new Date(e.start_at).toLocaleDateString(en ? "en" : "ar-EG", {
              timeZone: "Africa/Cairo",
              weekday: "long",
            })}
          </small>
        </time>
        <span className="dp-timeline-dot" />
        <button
          className="dp-event"
          onClick={() => (onEvent ? onEvent(e) : setSelected(e))}
        >
          <div className="dp-event-copy">
            <small>
              {new Date(e.start_at).toLocaleTimeString(en ? "en-GB" : "ar-EG", {
                timeZone: "Africa/Cairo",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
            <h3>{title(e)}</h3>
            <p>
              {t("طلاب من أجل مصر", "Mn Agl Masr")},{" "}
              {t(
                "كلية العلوم، جامعة القاهرة",
                "Faculty of Science, Cairo University",
              )}
            </p>
            <p>
              <MapPin size={15} />
              {sample
                ? t(
                    "كلية العلوم، جامعة القاهرة",
                    "Faculty of Science, Cairo University",
                  )
                : e.location}
            </p>
            <span className="dp-points">
              +{e.points} {t("نقطة عند الحضور", "points for attending")}
            </span>
          </div>
          <div className={"dp-poster poster-" + (i % 3)}>
            {e.cover_url ? (
              <img src={e.cover_url} alt="" />
            ) : (
              <>
                <span>{t("من أجل مصر", "MN AGL MASR")}</span>
                <b>{title(e)}</b>
                <small>{day(e)}</small>
              </>
            )}
          </div>
        </button>
      </div>
    ));
  return (
    <div
      className={
        "dp " + (embedded ? "dp-embedded " : "") + (paused ? "dp-paused" : "")
      }
    >
      {!live && (
        <div className="dp-preview-note">
          {t(
            "معاينة تصميم, الفعاليات والصور أمثلة توضيحية",
            "Design preview, Events and photos are illustrative examples",
          )}
          <a href="/">
            {t("العودة للتطبيق", "Back to app")}
            <Arrow size={12} />
          </a>
        </div>
      )}
      {!embedded && (
        <header className="dp-header">
          <button className="dp-wordmark" onClick={() => navigate("welcome")}>
            <img
              className="dp-logo"
              src="/assets/cairo-student-logo.jpg"
              alt={t(
                "شعار طلاب من أجل مصر، جامعة القاهرة",
                "Students for Egypt, Cairo University logo",
              )}
              width={58}
              height={58}
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
          <span className="dp-header-note">
            {t("(وعي، مهارات، مشاركة)", "(Awareness, skills, participation)")}
          </span>
          <nav>
            <button
              className={tab === "feed" ? "is-active" : ""}
              onClick={() => navigate("feed")}
            >
              {t("الفعاليات", "Events")}
            </button>
            <a href="/?view=leaderboard">{t("المتصدرون", "Leaderboard")}</a>
            <button
              className="dp-icon"
              aria-label="Toggle theme"
              onClick={() => {
                const next = !dark;
                setDark(next);
                document.documentElement.dataset.theme = next
                  ? "dark"
                  : "light";
                localStorage.setItem("mam-theme", next ? "dark" : "light");
              }}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button className="dp-language" onClick={() => setEn(!en)}>
              {en ? "عربي" : "EN"}
            </button>
            <a className="dp-join" href="/?join=1" onClick={join}>
              {t("انضم إلينا", "Join us")}
              <Arrow size={15} />
            </a>
          </nav>
        </header>
      )}
      {tab === "welcome" ? (
        <ContentTag>
          <section className="dp-intro">
            <p className="dp-welcome">
              {t(
                "أهلًا بك في من أجل مصر، كلية العلوم، جامعة القاهرة",
                "Welcome to Mn Agl Masr, Faculty of Science, Cairo University",
              )}
            </p>
            <h1>
              {t("نتعلّم، نشارك،", "Learn, take part,")}
              <br />
              <span className="dp-headline-accent">
                {t("ونصنع أثرًا", "make an impact")}
              </span>
            </h1>
            <div className="dp-collage">
              <span className="dp-collage-note note-one">
                {t("ناس جديدة،", "New faces,")}
                <br />
                {t("وحكايات أكتر.", "more stories.")}
              </span>
              <figure className="dp-photo photo-one">
                <img
                  src={img(0)}
                  alt={t(
                    "صورة توضيحية لمجموعة طلاب",
                    "Illustrative photograph of students",
                  )}
                />
                <figcaption>
                  {t(
                    "كل بداية، بتجمعنا.",
                    "Every beginning brings us together.",
                  )}
                </figcaption>
              </figure>
              <figure className="dp-photo photo-two">
                {home.video_url && !videoFailed ? (
                  <video
                    ref={video}
                    src={home.video_url}
                    muted
                    playsInline
                    loop
                    preload="none"
                    onError={() => setVideoFailed(true)}
                    poster={home.poster_url || img(1)}
                  />
                ) : (
                  <img
                    src={home.poster_url || img(1)}
                    alt={t(
                      "صورة توضيحية لفعالية طلابية",
                      "Illustrative photograph of an event",
                    )}
                  />
                )}
                <figcaption>
                  {t("من الكلية، نبدأ.", "It starts at our faculty.")}
                </figcaption>
              </figure>
              <figure className="dp-photo photo-three">
                <img
                  src={img(2)}
                  alt={t(
                    "صورة توضيحية للتعاون",
                    "Illustrative photograph of collaboration",
                  )}
                />
                <figcaption>{t("إيد في إيد.", "Side by side.")}</figcaption>
              </figure>
              <svg
                className="dp-hand-star"
                viewBox="0 0 50 50"
                aria-hidden="true"
                fill="none"
              >
                <path
                  d="M24 3l2 43M4 24l42 2M9 8l33 32M9 41L40 9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <span className="dp-collage-note note-two">
                {t("فيه دايمًا", "Always room")}
                <br />
                {t("مكان لفكرتك.", "for your ideas.")}
              </span>
              <button
                className="dp-motion"
                onClick={() => setPaused(!paused)}
                aria-label={
                  paused
                    ? t("تشغيل الحركة", "Resume motion")
                    : t("إيقاف الحركة", "Pause motion")
                }
              >
                {paused ? <Play size={14} /> : <Pause size={14} />}
              </button>
            </div>
            {live && (home.gallery_urls?.length || 0) < 3 && (
              <p className="dp-media-note">
                {t(
                  "صور توضيحية، صور فعالياتنا قريبًا",
                  "Illustrative photos, our faculty event photos coming soon",
                )}
              </p>
            )}
            <div className="dp-intro-bottom">
              <p>
                {t("وعي، مهارات، مشاركة", "Awareness, skills, participation")}
              </p>
              <button className="dp-discover" onClick={() => navigate("feed")}>
                {t("شوف الفعاليات", "Explore events")}
                <Arrow size={18} />
              </button>
            </div>
          </section>
          <section className="dp-about">
            <div>
              <span className="dp-label">{t("(عنّا)", "(About us)")}</span>
              <h2>
                {t("من أجل مصر،", "Mn Agl Masr.")}
                <br />
                {t("بأيدينا إحنا.", "Made by us.")}
              </h2>
            </div>
            <div>
              <p>
                {t(
                  "إحنا طلاب من أجل مصر بكلية العلوم، جامعة القاهرة. بنجمع أفكارنا وطاقتنا في فعاليات وتدريبات وأنشطة تطوعية، عشان ننمّي مهاراتنا، ونوسّع وعينا، ونخدم مجتمعنا.",
                  "We are Mn Agl Masr students at the Faculty of Science, Cairo University. Through events, training and volunteering, we develop our skills, broaden our awareness and contribute to our community.",
                )}
              </p>
              <p className="dp-secondary">
                {t(
                  "كل ما تشارك أكتر، تجمع نقاط أكتر وتفتح لنفسك فرص حصرية. والفعاليات اللي محتاجاك أكتر، بتديك نقاط إضافية.",
                  "The more you volunteer, the more points you earn and the closer you get to exclusive opportunities. Events that need you most reward you with extra points.",
                )}
              </p>
              <a className="dp-inline-link" href="/?join=1" onClick={join}>
                {t(
                  "تعالى، مكانك موجود.",
                  "Come along. There’s a place for you.",
                )}
                <Arrow size={17} />
              </a>
            </div>
          </section>
          <section className="dp-home-events">
            <div className="dp-section-heading">
              <div>
                <span className="dp-label">
                  {t("(الفعاليات القادمة)", "(Coming up)")}
                </span>
                <h2>{t("نلتقي قريبًا.", "See you soon.")}</h2>
              </div>
              <button
                className="dp-inline-link"
                onClick={() => navigate("feed")}
              >
                {t("كل الفعاليات", "All events")}
                <Arrow size={18} />
              </button>
            </div>
            {sample && (
              <p className="dp-example-label">
                {t(
                  "أمثلة لعرض التصميم - ليست فعاليات معلنة",
                  "Design examples - these are not announced events",
                )}
              </p>
            )}
            <div className="dp-timeline">
              {loading ? (
                <p role="status" className="dp-loading">
                  {t("جارٍ تحميل الفعاليات…", "Loading events…")}
                </p>
              ) : list.filter((e) => new Date(e.end_at) >= new Date())
                  .length ? (
                cards(
                  list
                    .filter((e) => new Date(e.end_at) >= new Date())
                    .slice(0, 2),
                )
              ) : (
                <div className="dp-empty" data-testid="empty-events">
                  <CalendarDays size={28} strokeWidth={1.2} />
                  <h3>
                    {loadError
                      ? t("تعذّر تحميل الفعاليات", "Unable to load events")
                      : t(
                          "فعالياتنا الجديدة قريبًا",
                          "Our next events are coming soon",
                        )}
                  </h3>
                  <p>
                    {loadError
                      ? t("حاول مرة أخرى بعد قليل", "Please try again shortly")
                      : t(
                          "أول ما نعلن عن فعالية، هتلاقيها هنا",
                          "New events will appear here when announced",
                        )}
                  </p>
                  {loadError && (
                    <button className="dp-inline-link" onClick={onRetry}>
                      {t("حاول مجددًا", "Retry")}
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
          {news.length > 0 && (
            <section className="dp-news">
              <span className="dp-label">
                {t("(آخر الأخبار)", "(Latest news)")}
              </span>
              {news.map((n) => (
                <article key={n.id}>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                </article>
              ))}
            </section>
          )}
          <section className="dp-last-word">
            <span className="dp-label">
              {t("(والحكاية لسه بتبدأ)", "(And this is just the beginning)")}
            </span>
            <h2>
              {t("يلا نعمل حاجة", "Let’s make")}
              <br />
              {t("تفرق.", "a difference.")}
            </h2>
            <a className="dp-join dp-join-large" href="/?join=1" onClick={join}>
              {t("انضم إلينا", "Join us")}
              <Arrow size={21} />
            </a>
          </section>
        </ContentTag>
      ) : (
        <ContentTag className="dp-feed">
          <div className="dp-feed-heading">
            <h1>{t("الفعاليات", "Events")}</h1>
            <div className="dp-segmented">
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
          <p className="dp-feed-intro">
            {t(
              "طلاب من أجل مصر، كلية العلوم، جامعة القاهرة",
              "Mn Agl Masr, Faculty of Science, Cairo University",
            )}
          </p>
          {sample && (
            <p className="dp-example-label">
              {t("أمثلة لعرض التصميم فقط", "Illustrative design examples only")}
            </p>
          )}
          <div className="dp-timeline">
            {shown.length ? (
              cards(shown)
            ) : (
              <div className="dp-empty">
                <CalendarDays size={28} strokeWidth={1.2} />
                <h2>{t("مفيش فعاليات هنا لسه.", "No events here yet.")}</h2>
                <p>
                  {t(
                    "أول ما نعلن عن فعالية، هتلاقيها هنا.",
                    "New events will appear here when announced.",
                  )}
                </p>
              </div>
            )}
          </div>
          <p className="dp-feed-footnote">
            {t(
              "عندك سكشن أو محاضرة وقت الفعالية؟ اطلب عذرًا رسميًا عند التسجيل. طلبات الأعذار والتسهيلات مقبولة تلقائيًا.",
              "Have a class during an event? Request an official academic excuse when registering. Excuse and accommodation requests are automatically accepted.",
            )}
          </p>
        </ContentTag>
      )}
      {!embedded && (
        <footer className="dp-footer">
          <span>
            من أجل مصر{" "}
            <small>
              {t(
                "كلية العلوم، جامعة القاهرة",
                "Faculty of Science, Cairo University",
              )}
            </small>
          </span>
          <button
            onClick={() => navigate(tab === "welcome" ? "feed" : "welcome")}
          >
            {tab === "welcome"
              ? t("الفعاليات", "Events")
              : t("عن من أجل مصر", "About our community")}
          </button>
          <a href="/?join=1" onClick={join}>
            {t("انضم إلينا", "Join us")}
          </a>
          <span className="dp-copyright">© {new Date().getFullYear()}</span>
        </footer>
      )}
      {selected && (
        <div className="dp-overlay" onClick={() => setSelected(null)}>
          <section
            className="dp-event-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={title(selected)}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="dp-dialog-close dp-icon"
              aria-label="Close"
              onClick={() => setSelected(null)}
            >
              <X size={20} />
            </button>
            <p className="dp-label">
              {sample
                ? t("مثال توضيحي للتصميم", "Illustrative design example")
                : t("فعالية من أجل مصر", "Mn Agl Masr event")}
            </p>
            <h2>{title(selected)}</h2>
            <p className="dp-dialog-meta">
              <CalendarDays size={18} />
              {day(selected)}
            </p>
            <p className="dp-dialog-meta">
              <MapPin size={18} />
              {sample
                ? t(
                    "كلية العلوم، جامعة القاهرة",
                    "Faculty of Science, Cairo University",
                  )
                : selected.location}
            </p>
            <p>{selected.description}</p>
            <span className="dp-points">
              <Check size={15} />+{selected.points}{" "}
              {t("نقطة عند الحضور", "points for attending")}
            </span>
            <a
              className="dp-join"
              href={sample ? "/?join=1" : "/?event=" + selected.id}
            >
              {sample
                ? t("انضم للمجتمع", "Join the community")
                : t("التفاصيل والتسجيل", "Details & registration")}
              <Arrow size={17} />
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
