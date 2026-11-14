"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpLeft,
  ArrowUpRight,
  Menu,
  X,
  Moon,
  Sun,
  Pause,
  Play,
  ChevronDown,
} from "lucide-react";
import "./nonprofit-preview.css";
type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  points: number;
  cover_url: string | null;
};
type News = { id: string; title: string; body: string; created_at: string };
const photoSource =
  "https://commons.wikimedia.org/wiki/File:%D9%82%D8%A8%D8%A9_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D9%82%D8%A7%D9%87%D8%B1%D8%A9.jpg";
export default function NonprofitPreview() {
  const [en, setEn] = useState(false),
    [dark, setDark] = useState(false),
    [menu, setMenu] = useState(false),
    [screen, setScreen] = useState("home"),
    [past, setPast] = useState(false),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [events, setEvents] = useState<Event[]>([]),
    [news, setNews] = useState<News[]>([]),
    [home, setHome] = useState<{ video_url?: string; poster_url?: string }>({}),
    [paused, setPaused] = useState(false),
    [videoFailed, setVideoFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const t = (ar: string, english: string) => (en ? english : ar);
  const Arrow = en ? ArrowUpRight : ArrowUpLeft;
  async function load() {
    setLoading(true);
    setFailed(false);
    try {
      const r = await fetch("/api/action");
      if (!r.ok) throw new Error();
      const d = await r.json();
      setEvents(d.events || []);
      setNews(d.news || []);
      setHome(d.home || {});
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
    if (new URLSearchParams(location.search).get("view") === "feed")
      setScreen("events");
    load();
  }, []);
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
  }, [home.video_url, paused, screen]);
  function go(target: string) {
    setMenu(false);
    if (target === "events") {
      setScreen("events");
      history.replaceState(null, "", "/design-preview?view=feed");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (target === "home") {
      setScreen("home");
      history.replaceState(null, "", "/design-preview");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setScreen("home");
      history.replaceState(null, "", "/design-preview#" + target);
      requestAnimationFrame(() =>
        document.getElementById(target)?.scrollIntoView({ behavior: "smooth" }),
      );
    }
  }
  const upcoming = events.filter((e) => new Date(e.end_at) >= new Date());
  const visible = events.filter((e) =>
    past ? new Date(e.end_at) < new Date() : new Date(e.end_at) >= new Date(),
  );
  const when = (s: string) =>
    new Date(s).toLocaleDateString(en ? "en-GB" : "ar-EG", {
      day: "numeric",
      month: "long",
      timeZone: "Africa/Cairo",
    });
  const eventList = (items: Event[]) =>
    items.length ? (
      <div className="nf-event-list">
        {items.map((e) => (
          <a className="nf-event" href={"/?event=" + e.id} key={e.id}>
            <div className="nf-event-art">
              {e.cover_url ? (
                <img src={e.cover_url} alt="" loading="lazy" />
              ) : (
                <>
                  <img
                    className="nf-event-mark"
                    src="/assets/cairo-student-logo.jpg"
                    alt=""
                  />
                  <strong>{t("طلاب من أجل مصر", "Students for Egypt")}</strong>
                </>
              )}
            </div>
            <div className="nf-event-text">
              <time>{when(e.start_at)}</time>
              <h3>{e.title}</h3>
              <p>{e.location}</p>
              <span className="nf-chip">
                {e.points} {t("نقطة عند الحضور", "attendance points")}
              </span>
            </div>
            <Arrow size={24} />
          </a>
        ))}
      </div>
    ) : (
      <div className="nf-empty">
        <h3>{t("الفعاليات الجديدة بتتحضّر", "New events are on the way")}</h3>
        <p>
          {t(
            "تابعنا هنا، هتلاقي التفاصيل وطريقة المشاركة بمجرد الإعلان عنها",
            "Check back here for details and registration when events are announced",
          )}
        </p>
      </div>
    );
  const eventsContent = (items: Event[]) =>
    loading ? (
      <p role="status" className="nf-load">
        {t("جارٍ تحميل الفعاليات…", "Loading events…")}
      </p>
    ) : failed ? (
      <div className="nf-empty" role="alert">
        <h3>{t("تعذّر تحميل الفعاليات", "Unable to load events")}</h3>
        <button className="nf-link" onClick={load}>
          {t("حاول مجددًا", "Try again")}
          <Arrow size={20} />
        </button>
      </div>
    ) : (
      eventList(items)
    );
  return (
    <div className="nf" data-language={en ? "en" : "ar"}>
      <link rel="stylesheet" href="/assets/nonprofit/fonts.css" />
      <a className="nf-skip" href="#nf-main">
        {t("انتقل للمحتوى", "Skip to content")}
      </a>
      <div className="nf-review">
        <span>{t("معاينة التصميم الجديد", "New design preview")}</span>
        <a href="/">
          {t("العودة للتطبيق الحالي", "Current app")}
          <Arrow size={14} />
        </a>
      </div>
      <header className="nf-header">
        <button
          className="nf-brand"
          onClick={() => go("home")}
          aria-label={t("الصفحة الرئيسية", "Home")}
        >
          <img
            src="/assets/cairo-student-logo.jpg"
            alt=""
            width={70}
            height={70}
          />
          <span>
            طلاب من أجل مصر
            <small>
              {t(
                "كلية العلوم، جامعة القاهرة",
                "Faculty of Science, Cairo University",
              )}
            </small>
          </span>
        </button>
        <nav
          className={menu ? "nf-nav is-open" : "nf-nav"}
          aria-label={t("القائمة الرئيسية", "Main navigation")}
        >
          <button onClick={() => go("nf-about")}>
            {t("عن الأسرة", "About us")}
          </button>
          <button onClick={() => go("nf-participate")}>
            {t("شارك معانا", "Get involved")}
          </button>
          <button
            onClick={() => go("events")}
            aria-current={screen === "events" ? "page" : undefined}
          >
            {t("الفعاليات", "Events")}
          </button>
          <button onClick={() => go("nf-news")}>{t("الأخبار", "News")}</button>
        </nav>
        <div className="nf-actions">
          <button
            className="nf-icon"
            aria-label={t("تغيير المظهر", "Toggle theme")}
            onClick={() => {
              setDark(!dark);
              document.documentElement.dataset.theme = dark ? "light" : "dark";
              localStorage.setItem("mam-theme", dark ? "light" : "dark");
            }}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="nf-language" onClick={() => setEn(!en)}>
            {en ? "عربي" : "EN"}
          </button>
          <a className="nf-login" href="/?login=1">
            {t("دخول", "Log in")}
          </a>
          <a className="nf-button" href="/?join=1">
            {t("انضم إلينا", "Join us")}
          </a>
          <button
            className="nf-menu nf-icon"
            aria-label={t("فتح القائمة", "Open menu")}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>
      {screen === "home" ? (
        <main id="nf-main">
          <section
            className="nf-hero"
            aria-label={t(
              "من أجل مصر بكلية العلوم",
              "Students for Egypt at the Faculty of Science",
            )}
          >
            <div className="nf-hero-media">
              {home.video_url && !videoFailed ? (
                <video
                  ref={video}
                  src={home.video_url}
                  poster={
                    home.poster_url || "/assets/nonprofit/cairo-campus.jpg"
                  }
                  muted
                  loop
                  playsInline
                  preload="none"
                  onError={() => setVideoFailed(true)}
                />
              ) : (
                <img
                  src={home.poster_url || "/assets/nonprofit/cairo-campus.jpg"}
                  alt={t("قبة جامعة القاهرة", "Dome of Cairo University")}
                  fetchPriority="high"
                />
              )}
            </div>
            <div className="nf-hero-inner">
              <div className="nf-hero-title">
                <p>{t("أهلًا بيك في", "Welcome to")}</p>
                <h1>
                  {t("طلاب", "Students")}
                  <br />
                  {t("من أجل مصر", "for Egypt")}
                </h1>
                <p className="nf-hero-faculty">
                  {t(
                    "كلية العلوم، جامعة القاهرة",
                    "Faculty of Science, Cairo University",
                  )}
                </p>
              </div>
              <div className="nf-hero-caption">
                <p>
                  {t(
                    "فعاليات، تدريبات، وفرص للتطوع مع زمايلك في الكلية",
                    "Events, training and volunteering with your faculty community",
                  )}
                </p>
                <a className="nf-button nf-button-dark" href="/?join=1">
                  {t("شارك معانا", "Get involved")}
                  <Arrow size={21} />
                </a>
              </div>
            </div>
            <div className="nf-hero-bottom">
              <a
                href="#nf-about"
                onClick={(e) => {
                  e.preventDefault();
                  go("nf-about");
                }}
              >
                {t("اتعرف على الأسرة", "Meet our community")}
                <ChevronDown size={18} />
              </a>
              {home.video_url && !videoFailed ? (
                <button
                  className="nf-icon"
                  aria-label={
                    paused
                      ? t("تشغيل الفيديو", "Play video")
                      : t("إيقاف الفيديو", "Pause video")
                  }
                  onClick={() => setPaused(!paused)}
                >
                  {paused ? <Play size={18} /> : <Pause size={18} />}
                </button>
              ) : (
                <span>
                  {t(
                    "الحرم الجامعي، صورة أرشيفية",
                    "University campus, archive photograph",
                  )}
                </span>
              )}
            </div>
          </section>
          <section className="nf-about nf-section" id="nf-about">
            <div className="nf-section-title">
              <span>{t("عن الأسرة", "About us")}</span>
              <h2>
                {t("من كليتنا،", "From our faculty,")}
                <br />
                {t("ومع بعض", "together")}
              </h2>
            </div>
            <div className="nf-about-copy">
              <p className="nf-lead">
                {t(
                  "إحنا طلاب من أجل مصر بكلية العلوم، جامعة القاهرة. بنشارك في تنظيم فعاليات الكلية، ونتطوع في الأنشطة والتدريبات اللي تخلينا نتعلّم من بعض ونقدّم حاجة مفيدة لزمايلنا",
                  "We are Students for Egypt at the Faculty of Science, Cairo University. We organize faculty events and volunteer in activities and training that help us learn from one another and contribute to our community",
                )}
              </p>
              <p>
                {t(
                  "المشاركة على قد وقتك، وكل طالب عنده فكرة أو مهارة يقدر يضيفها. هنا هتلاقي الفعاليات، تفاصيلها، وطريقة التسجيل فيها",
                  "Take part when you can. Every student has ideas and skills to contribute. Here you can find events, their details and how to register",
                )}
              </p>
              <button className="nf-link" onClick={() => go("events")}>
                {t("شوف الفعاليات القادمة", "Explore upcoming events")}
                <Arrow size={22} />
              </button>
            </div>
          </section>
          <section className="nf-participate nf-section" id="nf-participate">
            <div className="nf-section-heading">
              <h2>
                {t("فيه أكتر من طريقة تشارك", "Find your way to take part")}
              </h2>
              <a className="nf-link" href="/?join=1">
                {t("سجّل معانا", "Join our community")}
                <Arrow size={22} />
              </a>
            </div>
            <div className="nf-features">
              <article>
                <div className="nf-feature-image">
                  <img
                    src="/assets/workshop.jpg"
                    alt={t(
                      "صورة توضيحية لتعاون طلابي",
                      "Illustrative photograph of students collaborating",
                    )}
                    loading="lazy"
                  />
                  <span>{t("صورة توضيحية", "Illustrative photograph")}</span>
                </div>
                <h3>{t("خليك جزء من التنظيم", "Help make events happen")}</h3>
                <p>
                  {t(
                    "شارك في تجهيز الفعاليات وتنظيمها، واتعرف على زمايل من فرق وتخصصات مختلفة",
                    "Help prepare and run events, and meet students from different years and disciplines",
                  )}
                </p>
                <a className="nf-link" href="/?join=1">
                  {t("ابدأ من هنا", "Start here")}
                  <Arrow size={20} />
                </a>
              </article>
              <article>
                <div className="nf-feature-statement">
                  <span className="nf-chip">
                    {t("المشاركة ليها قيمة", "Your participation matters")}
                  </span>
                  <strong>
                    {t("وقت بتقدّمه،", "The time you give,")}
                    <br />
                    {t("وخبرة بتكسبها", "the experience you gain")}
                  </strong>
                  <img
                    src="/assets/cairo-student-logo.jpg"
                    alt=""
                    width={64}
                    height={64}
                  />
                </div>
                <h3>{t("اتعلّم من التجربة", "Learn through experience")}</h3>
                <p>
                  {t(
                    "كل حضور بيضيف نقاط لحسابك. الفعاليات اللي محتاجة متطوعين أكتر بتمنح نقاط إضافية، ومشاركاتك بتفتح لك فرص حصرية",
                    "Attendance earns points. Events that need more volunteers offer extra points, and continued participation opens up exclusive opportunities",
                  )}
                </p>
                <button className="nf-link" onClick={() => go("events")}>
                  {t("اختار فعالية", "Find an event")}
                  <Arrow size={20} />
                </button>
              </article>
            </div>
          </section>
          <section className="nf-events-section nf-section" id="nf-events">
            <div className="nf-section-heading">
              <h2>{t("الفعاليات القادمة", "Upcoming events")}</h2>
              <button className="nf-link" onClick={() => go("events")}>
                {t("كل الفعاليات", "All events")}
                <Arrow size={22} />
              </button>
            </div>
            {eventsContent(upcoming.slice(0, 3))}
            <p className="nf-class-note">
              {t(
                "عندك محاضرة أو سكشن في نفس وقت الفعالية؟ تقدر تطلب عذرًا أكاديميًا عند التسجيل. طلبات الأعذار والتسهيلات مقبولة تلقائيًا لكل فعالية",
                "Have a lecture or section during an event? Request an academic excuse when registering. Excuse and accommodation requests are automatically accepted for each event",
              )}
            </p>
          </section>
          <section className="nf-news nf-section" id="nf-news">
            <div className="nf-section-heading">
              <h2>{t("أخبار الأسرة", "Community news")}</h2>
              <a
                className="nf-link"
                href="https://www.facebook.com/foregypt2030.cu/"
                target="_blank"
                rel="noreferrer"
              >
                {t("تابعنا على فيسبوك", "Follow us on Facebook")}
                <Arrow size={22} />
              </a>
            </div>
            {news.length ? (
              <div className="nf-news-list">
                {news.slice(0, 3).map((n) => (
                  <article key={n.id}>
                    <time>{when(n.created_at)}</time>
                    <h3>{n.title}</h3>
                    <p>{n.body}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="nf-news-empty">
                {t(
                  "الأخبار الجديدة هتلاقيها هنا، وتقدر تتابع صفحة الأسرة على فيسبوك",
                  "Updates will appear here. You can also follow the community Facebook page",
                )}
              </p>
            )}
          </section>
          <section className="nf-join-section">
            <div>
              <h2>{t("خد أول خطوة", "Take the first step")}</h2>
              <p>
                {t(
                  "انضم لطلاب من أجل مصر، كلية العلوم، جامعة القاهرة",
                  "Join Students for Egypt, Faculty of Science, Cairo University",
                )}
              </p>
            </div>
            <a className="nf-button nf-button-white" href="/?join=1">
              {t("إنشاء حساب", "Create an account")}
              <Arrow size={24} />
            </a>
          </section>
        </main>
      ) : (
        <main id="nf-main" className="nf-events-page nf-section">
          <div className="nf-section-heading">
            <div>
              <span className="nf-kicker">
                {t(
                  "كلية العلوم، جامعة القاهرة",
                  "Faculty of Science, Cairo University",
                )}
              </span>
              <h1>{t("الفعاليات", "Events")}</h1>
            </div>
            <div className="nf-filters">
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
          {eventsContent(visible)}
          <button className="nf-link nf-back" onClick={() => go("home")}>
            {t("العودة للرئيسية", "Back to home")}
            <Arrow size={22} />
          </button>
        </main>
      )}
      <footer className="nf-footer">
        <div className="nf-footer-main">
          <div className="nf-footer-brand">
            <img
              src="/assets/cairo-student-logo.jpg"
              alt=""
              width={64}
              height={64}
            />
            <span>
              طلاب من أجل مصر
              <small>
                {t(
                  "كلية العلوم، جامعة القاهرة",
                  "Faculty of Science, Cairo University",
                )}
              </small>
            </span>
          </div>
          <div>
            <a href="/?login=1">{t("تسجيل الدخول", "Log in")}</a>
            <a href="/?join=1">{t("انضم إلينا", "Join us")}</a>
            <a href="/">{t("التطبيق الحالي", "Current app")}</a>
          </div>
          <span>© {new Date().getFullYear()}</span>
        </div>
        <details className="nf-credits">
          <summary>
            {t(
              "عن معاينة التصميم ومصادر الصور",
              "About this preview and image credits",
            )}
          </summary>
          <p>
            {t(
              "هذا تصميم للمراجعة مستلهم من تنظيم الصفحات في مواقع مؤسسات غير ربحية فائزة بجوائز Webby، باستخدام هويتنا ومحتوانا وصورنا الخاصة",
              "This review concept follows page-layout patterns from Webby-winning nonprofit websites, using our own identity and content",
            )}
          </p>
          <p>
            <a href="https://www.obama.org/" target="_blank" rel="noreferrer">
              Obama Foundation
            </a>
            ,{" "}
            <a
              href="https://www.somasurf.org/"
              target="_blank"
              rel="noreferrer"
            >
              SOMA Surf Therapy
            </a>
            ,{" "}
            <a
              href="https://winners.webbyawards.com/winners/websites-and-mobile-sites/general-desktop-mobile-sites/charitable-organizationsnon-profit"
              target="_blank"
              rel="noreferrer"
            >
              Webby Awards
            </a>
          </p>
          <p>
            {t("صورة الحرم الجامعي:", "Campus photograph:")}{" "}
            <a href={photoSource} target="_blank" rel="noreferrer">
              Ahmed yousri elmamlouk, Wikimedia Commons
            </a>
            ,{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-SA 4.0
            </a>
            , 2012.{" "}
            {t(
              "الصورة الأصلية، مع اقتصاص للعرض فقط",
              "Original photograph, cropped for display only",
            )}
          </p>
          <p>
            {t(
              "الخط العربي للنصوص والقوائم: Noto Sans Arabic، والعناوين: Noto Naskh Arabic",
              "Arabic navigation and body: Noto Sans Arabic, headings: Noto Naskh Arabic",
            )}
          </p>
        </details>
      </footer>
    </div>
  );
}
