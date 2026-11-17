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
  Shirt,
} from "lucide-react";
import "./design-preview.css";
import { EventArtwork } from "./event-artwork";
import { HissImageStack, useHissReveals } from "./hiss-motion";
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
  content?: {
    events: EventItem[];
    home: { video_url?: string; poster_url?: string; gallery_urls?: string[] };
    news: { id: string; title: string; body: string; created_at?: string }[];
  };
  loading?: boolean;
  loadError?: boolean;
  onRetry?: () => void;
  onNavigate?: (view: string) => void;
  onEvent?: (event: EventItem) => void;
  onJoin?: () => void;
};
export default function DesignPreview() {
  return <CommunityExperience live />;
}
export function CommunityExperience({
  embedded = false,
  live = false,
  content,
  loading = false,
  loadError = false,
  onRetry,
  onNavigate,
  onEvent,
  onJoin,
}: CommunityProps) {
  const [dark, setDark] = useState(false),
    [tab, setTab] = useState("welcome"),
    [paused, setPaused] = useState(false),
    [past, setPast] = useState(false),
    [fetchedEvents, setEvents] = useState<EventItem[]>([]),
    [selected, setSelected] = useState<EventItem | null>(null),
    [fetchedHome, setHome] = useState<{
      video_url?: string;
      poster_url?: string;
      gallery_urls?: string[];
    }>({}),
    [fetchedNews, setNews] = useState<
      { title: string; body: string; id: string; created_at?: string }[]
    >([]);
  const motionRoot = useRef<HTMLDivElement>(null);
  useHissReveals(motionRoot, tab);
  const en = false;
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
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
  }, []);
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
    [
      "/assets/homepage-1.jpg",
      "/assets/homepage-2.jpg",
      "/assets/homepage-3.jpg",
    ][i];
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
    if (!embedded && next === "feed") {
      window.location.assign("/?view=events");
      return;
    }
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
          <div className="dp-poster">
            <EventArtwork title={title(e)} src={e.cover_url} />
          </div>
        </button>
      </div>
    ));
  return (
    <div
      ref={motionRoot}
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
                "شعار طلاب طلاب من علوم، جامعة القاهرة",
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
              aria-label="تغيير المظهر"
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
            <a className="dp-join" href="/?join=1" onClick={join}>
              {t("سجّل معانا", "Join us")}
              <Arrow size={15} />
            </a>
          </nav>
        </header>
      )}
      {tab === "welcome" ? (
        <ContentTag>
          <section className="dp-intro">
            <h1 data-hiss-reveal>
              {t("من أجل مصر", "Learn, take part,")}
              <br />
              <span className="dp-headline-accent">
                {t("في علوم القاهرة", "make an impact")}
              </span>
            </h1>
            <div className="dp-collage">
              {[0, 1, 2].map((slot) => (
                <HissImageStack
                  key={slot}
                  index={slot}
                  paused={paused}
                  images={[0, 1, 2].map(
                    (layer) =>
                      home.gallery_urls?.[slot + layer * 3] ||
                      img((slot + layer) % 3),
                  )}
                  label={t(
                    "صور من فعاليات طلاب من أجل مصر، جامعة القاهرة",
                    "Mn Agl Masr student activities at Cairo University",
                  )}
                  videoUrl={slot === 1 ? home.video_url : undefined}
                  posterUrl={slot === 1 ? home.poster_url : undefined}
                />
              ))}
              <button
                className="dp-motion"
                aria-pressed={paused}
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
            <div className="dp-intro-bottom">
              <button className="dp-discover" onClick={() => navigate("feed")}>
                {t("شوف الفعاليات", "Explore events")}
                <Arrow size={18} />
              </button>
            </div>
          </section>
          <section className="dp-news" aria-labelledby="news-heading">
            <div className="dp-section-heading" data-hiss-reveal>
              <h2 id="news-heading">آخر أخبارنا</h2>
            </div>
            {loading ? (
              <p role="status" className="dp-loading">
                بنحمّل الأخبار…
              </p>
            ) : loadError ? (
              <div className="dp-empty" role="alert">
                <h3>الأخبار مش ظاهرة دلوقتي</h3>
                <button className="dp-inline-link" onClick={onRetry}>
                  جرّب تاني
                </button>
              </div>
            ) : news.length ? (
              <div className="dp-news-list">
                {news.map((n) => (
                  <article key={n.id}>
                    {n.created_at && (
                      <time dateTime={n.created_at}>
                        {new Date(n.created_at).toLocaleDateString("ar-EG", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          timeZone: "Africa/Cairo",
                        })}
                      </time>
                    )}
                    <h3>{n.title}</h3>
                    <p>{n.body}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dp-empty" data-testid="empty-news">
                <p>لسه مفيش أخبار منشورة.</p>
              </div>
            )}
          </section>
          <section className="dp-about" data-hiss-reveal>
            <div>
              <h2>
                {t("طلاب من علوم،", "Mn Agl Masr.")}
                <br />
                {t("بنشارك مع بعض", "Made by us.")}
              </h2>
            </div>
            <div>
              <p>
                {t(
                  "إحنا طلاب من أجل مصر في كلية العلوم، جامعة القاهرة. بنجهّز فعاليات وورش، وبنشارك في أنشطة الكلية والتطوّع. هنا هتلاقي أخبارنا وتفاصيل كل فعالية وطريقة التسجيل فيها.",
                  "We are Mn Agl Masr students at the Faculty of Science, Cairo University. Through events, training and volunteering, we develop our skills, broaden our awareness and contribute to our community.",
                )}
              </p>
              <p className="dp-secondary">
                {t(
                  "كل فعالية بتحضرها بتضيف لحسابك نقاط. والفعاليات اللي محتاجة متطوّعين أكتر بتدي نقاط زيادة. كده نعرف مين بيشارك باستمرار ونرشّحه للفرص اللي بتتاح للأسرة.",
                  "The more you volunteer, the more points you earn and the closer you get to exclusive opportunities. Events that need you most reward you with extra points.",
                )}
              </p>
              <a className="dp-inline-link" href="/?join=1" onClick={join}>
                {t("سجّل معانا", "Come along. There’s a place for you.")}
                <Arrow size={17} />
              </a>
            </div>
          </section>
          <section
            className="dp-explainer"
            id="accessibility"
            aria-labelledby="accessibility-heading"
          >
            <h2 id="accessibility-heading">من أجل مصر متاحة للكل</h2>
            <div className="dp-explainer-copy">
              <p>
                لو محتاج تسهيلات تساعدك تحضر وتشارك براحتك، اكتب اللي يناسبك
                وإنت بتسجّل في الفعالية.
              </p>
              <p>
                زي مكان قريب من المدخل، ترتيب مناسب للجلوس، أو مساعدة في
                التنقّل. قول لنا محتاج إيه عشان القادة يقدروا يرتّبوا معاك.
              </p>
              <p>
                طلب التسهيلات بيتقبل تلقائيًا، وتفاصيله مش بتظهر لباقي الطلاب.
                الطلب بيخص الفعالية اللي اخترتها، فلو محتاج تسهيلات في فعالية
                تانية، اكتب طلب جديد فيها.
              </p>
              <a className="dp-inline-link" href="#how-to-use-requests">
                إزاي أضيف طلب التسهيلات؟
              </a>
            </div>
          </section>
          <section
            className="dp-guide"
            id="how-to-use"
            aria-labelledby="how-to-use-heading"
          >
            <h2 id="how-to-use-heading">إزاي تستخدم الموقع؟</h2>
            <ol className="dp-guide-steps">
              <li>
                <div>
                  <h3>اعمل حسابك</h3>
                  <p>
                    سجّل اسمك، كودك الجامعي من غير شرطات، رقم موبايلك، الرقم
                    القومي، وباسورد تختاره. احفظ كود الاستعادة اللي هيظهرلك عشان
                    تقدر ترجع لحسابك لو نسيت الباسورد.
                  </p>
                </div>
              </li>
              <li>
                <div>
                  <h3>اختار فعالية وأكد مشاركتك</h3>
                  <p>
                    بعد ما تدخل بحسابك، افتح الفعاليات وشوف اللي يناسبك. افتح
                    تفاصيل الفعالية واضغط «أكد مشاركتك واحفظ الطلبات». ولو حد
                    بعتلك رابط فعالية، سجّل دخولك أو اعمل حساب عشان تقدر تشارك.
                  </p>
                </div>
              </li>
              <li id="how-to-use-requests">
                <div>
                  <h3>محتاج عذر أكاديمي أو تسهيلات؟</h3>
                  <p>
                    في نموذج التسجيل، اكتب أي تسهيلات محتاجها عشان تقدر تحضر
                    وتشارك، زي ترتيب مناسب للجلوس أو مساعدة في التنقّل. ولو عندك
                    سكشن أو محاضرة في نفس معاد الفعالية، اكتب بياناتها في طلب
                    العذر الأكاديمي عشان غيابك عنها مايتحسبش. الطلبات بتتقبل
                    تلقائيًا، وبتخص الفعالية دي بس. بعدها اضغط «أكد مشاركتك
                    واحفظ الطلبات» عشان تتحفظ مع تسجيلك.
                  </p>
                </div>
              </li>
              <li>
                <div>
                  <h3>سجّل حضورك وخد نقاطك</h3>
                  <p>
                    يوم الفعالية، افتح تفاصيلها واضغط «مسح رمز حضوري» وإنت داخل
                    بحسابك، وامسح رمز QR المطبوع عند المنظّمين. لازم تكون مسجّل
                    في الفعالية الأول. بعد تأكيد الحضور، نقاطك بتتضاف تلقائيًا
                    وتقدر تتابعها من حسابك والمتصدرين.
                  </p>
                </div>
              </li>
            </ol>
          </section>
          <section
            className="dp-explainer"
            id="how-points-work"
            aria-labelledby="points-heading"
          >
            <h2 id="points-heading">النقاط بتتحسب إزاي؟</h2>
            <div className="dp-explainer-copy">
              <dl className="dp-points-explanation">
                <div>
                  <dt>كل فعالية ليها نقاطها</dt>
                  <dd>
                    هتلاقي عدد النقاط في تفاصيل الفعالية قبل ما تسجّل.
                    والفعاليات اللي محتاجة متطوّعين أكتر ممكن تدي نقاط زيادة،
                    حسب العدد المعلن فيها.
                  </dd>
                </div>
                <div>
                  <dt>الحضور هو اللي بيضيف النقاط</dt>
                  <dd>
                    التسجيل لوحده مش بيضيف نقاط. لما حضورك يتأكد بمسح الرمز من
                    الموقع أو بتسجيل القائد ليك، نقاط الفعالية بتتضاف لحسابك مرة
                    واحدة.
                  </dd>
                </div>
                <div>
                  <dt>تابع مشاركتك والفرص اللي جاية</dt>
                  <dd>
                    شوف نقاطك في حسابك وترتيبك في المتصدرين. كل ما تشارك وتتطوّع
                    أكتر، نقاطك بتزيد، وده بيساعد القادة يرشّحوا الطلاب
                    المشاركين للفرص المميزة اللي بتتاح للأسرة.
                  </dd>
                </div>
              </dl>
              <a className="dp-inline-link" href="/?view=leaderboard">
                شوف المتصدرين
              </a>
            </div>
          </section>
          <section className="dp-last-word" data-hiss-reveal>
            <h2>
              {t("اعمل حسابك", "Let’s make")}
              <br />
              {t("وشارك في اللي يناسبك", "a difference.")}
            </h2>
            <a className="dp-join dp-join-large" href="/?join=1" onClick={join}>
              {t("سجّل معانا", "Join us")}
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
              "عندك سكشن أو محاضرة في نفس معاد الفعالية؟ اكتب بياناتها في طلب العذر وإنت بتسجّل. الأعذار والتسهيلات بتتقبل تلقائي، لكل فعالية لوحدها.",
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
            {t("سجّل معانا", "Join us")}
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
              aria-label="إغلاق"
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
            {selected.dress_code && (
              <p className="dp-dialog-meta">
                <Shirt size={18} />
                <span>
                  {t("الزي المطلوب: ", "Dress code: ")}
                  {selected.dress_code}
                </span>
              </p>
            )}
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
