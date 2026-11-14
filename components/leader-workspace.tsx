"use client";
import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Link,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  LoaderCircle,
} from "lucide-react";
import type { LeaderApi, LeaderEvent } from "./leader-attendance";
import "./leader.css";
type Home = {
  video_url?: string;
  poster_url?: string;
  gallery_urls?: string[];
};
export function LeaderWorkspace({
  events,
  home,
  en,
  onCreate,
  onManage,
  api,
  onRefresh,
}: {
  events: LeaderEvent[];
  home: Home;
  en: boolean;
  onCreate: () => void;
  onManage: (e: LeaderEvent) => void;
  api: LeaderApi;
  onRefresh: () => Promise<void>;
}) {
  const t = (a: string, b: string) => (en ? b : a);
  const [tab, setTab] = useState("events"),
    [past, setPast] = useState(false),
    [query, setQuery] = useState(""),
    [copied, setCopied] = useState(""),
    [copyError, setCopyError] = useState("");
  const [pending, setPending] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [title, setTitle] = useState(""),
    [body, setBody] = useState("");
  const [media, setMedia] = useState({
      video_url: home.video_url || "",
      poster_url: home.poster_url || "",
      gallery_urls: home.gallery_urls?.join("\n") || "",
    }),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty)
      setMedia({
        video_url: home.video_url || "",
        poster_url: home.poster_url || "",
        gallery_urls: home.gallery_urls?.join("\n") || "",
      });
  }, [home, dirty]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(""), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  const list = events
    .filter((e) =>
      past ? new Date(e.end_at) < new Date() : new Date(e.end_at) >= new Date(),
    )
    .filter((e) =>
      (e.title + " " + e.location)
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
    )
    .sort((a, b) =>
      past
        ? +new Date(b.start_at) - +new Date(a.start_at)
        : +new Date(a.start_at) - +new Date(b.start_at),
    );
  async function copy(e: LeaderEvent) {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(
        new URL("/?event=" + encodeURIComponent(e.id), location.origin).href,
      );
      setCopied(e.id);
    } catch {
      setCopyError(
        t(
          "تعذّر النسخ. افتح الفعالية وانسخ الرابط من المتصفح.",
          "Unable to copy. Open the event and copy its URL from the browser.",
        ),
      );
    }
  }
  async function submit(action: string, data: Record<string, unknown>) {
    setPending(action);
    setError("");
    setNotice("");
    try {
      await api(action, data);
      if (action === "news") {
        setTitle("");
        setBody("");
      }

      setNotice(t("تم الحفظ", "Saved"));
      try {
        await onRefresh();
        if (action === "home") setDirty(false);
      } catch {
        setNotice(
          t(
            "تم الحفظ. حدّث الصفحة لعرض آخر نسخة.",
            "Saved. Reload the page to see the latest version.",
          ),
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t(
              "لم تُحفظ التغييرات، حاول مجددًا",
              "Changes were not saved, please retry",
            ),
      );
    } finally {
      setPending("");
    }
  }
  const Arrow = en ? ChevronRight : ChevronLeft;
  return (
    <section className="app-container leader-workspace">
      <div className="page-heading">
        <h1>{t("إدارة الأسرة", "Team management")}</h1>
        <button className="primary" onClick={onCreate}>
          <Plus size={18} />
          {t("إنشاء فعالية", "Create event")}
        </button>
      </div>
      <div
        className="leader-tabs"
        role="tablist"
        aria-label={t("أدوات الإدارة", "Management tools")}
      >
        {[
          ["events", t("الفعاليات", "Events")],
          ["news", t("الأخبار", "News")],
          ["home", t("الصفحة الرئيسية", "Homepage")],
        ].map(([id, label]) => (
          <button
            id={"leader-tab-" + id}
            role="tab"
            key={id}
            aria-selected={tab === id}
            aria-controls={"leader-page-" + id}
            disabled={!!pending}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => {
              setTab(id);
              setError("");
              setNotice("");
            }}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const tabs = ["events", "news", "home"];
                const next =
                  e.key === "Home"
                    ? "events"
                    : e.key === "End"
                      ? "home"
                      : tabs[
                          (tabs.indexOf(tab) +
                            (e.key === (en ? "ArrowRight" : "ArrowLeft")
                              ? 1
                              : 2)) %
                            3
                        ];
                setTab(next);
                setError("");
                setNotice("");
                document.getElementById("leader-tab-" + next)?.focus();
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="leader-page-events"
        aria-labelledby="leader-tab-events"
        hidden={tab !== "events"}
      >
        <div className="leader-event-tools">
          <div className="segmented">
            <button
              className={!past ? "selected" : ""}
              onClick={() => setPast(false)}
            >
              {t("الحالية والقادمة", "Active & upcoming")}
            </button>
            <button
              className={past ? "selected" : ""}
              onClick={() => setPast(true)}
            >
              {t("السابقة", "Past")}
            </button>
          </div>
          <label className="leader-search">
            <Search size={18} />
            <input
              aria-label={t("البحث في الفعاليات", "Search events")}
              placeholder={t("ابحث عن فعالية", "Search events")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {copyError && (
          <p role="alert" className="leader-error">
            {copyError}
          </p>
        )}
        <div className="leader-event-list">
          {list.length ? (
            list.map((e) => (
              <article className="leader-event-row" key={e.id}>
                <div className="leader-date">
                  <CalendarDays size={20} />
                  <time dateTime={e.start_at}>
                    {new Date(e.start_at).toLocaleDateString(
                      en ? "en-GB" : "ar-EG",
                      {
                        day: "numeric",
                        month: "short",
                        timeZone: "Africa/Cairo",
                      },
                    )}
                  </time>
                </div>
                <div className="leader-event-info">
                  <button onClick={() => onManage(e)}>
                    <h2>{e.title}</h2>
                  </button>
                  <p>
                    {new Date(e.start_at).toLocaleTimeString(
                      en ? "en-GB" : "ar-EG",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Africa/Cairo",
                      },
                    )}{" "}
                    - {e.location}
                  </p>
                  <span className="status-label status-points">
                    {e.points} {t("نقطة", "points")}
                  </span>
                </div>
                <div className="leader-event-actions">
                  <button
                    className="outline"
                    onClick={() => copy(e)}
                    aria-label={t("نسخ رابط ", "Copy link for ") + e.title}
                  >
                    {copied === e.id ? <Check size={16} /> : <Link size={16} />}{" "}
                    {copied === e.id
                      ? t("تم النسخ", "Copied")
                      : t("نسخ الرابط", "Copy link")}
                  </button>
                  <button className="primary" onClick={() => onManage(e)}>
                    {t("إدارة الحضور", "Manage attendance")}
                    <Arrow size={17} />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="leader-empty">
              <h2>
                {query
                  ? t("لا توجد نتائج مطابقة", "No matching events")
                  : past
                    ? t("لا توجد فعاليات سابقة", "No past events")
                    : t("لا توجد فعاليات قادمة", "No upcoming events")}
              </h2>
              {query ? (
                <button className="outline" onClick={() => setQuery("")}>
                  {t("مسح البحث", "Clear search")}
                </button>
              ) : (
                !past && (
                  <button className="primary" onClick={onCreate}>
                    <Plus size={16} />
                    {t("إنشاء أول فعالية", "Create your first event")}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
      <div
        role="tabpanel"
        id="leader-page-news"
        aria-labelledby="leader-tab-news"
        hidden={tab !== "news"}
      >
        <form
          className="leader-editor"
          onSubmit={(e) => {
            e.preventDefault();
            submit("news", { title, body });
          }}
        >
          <h2>{t("نشر خبر", "Publish news")}</h2>
          <label>
            {t("عنوان الخبر", "Title")}
            <input
              name="title"
              required
              minLength={2}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            {t("التفاصيل", "Details")}
            <textarea
              name="body"
              required
              minLength={2}
              maxLength={5000}
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <button className="primary" disabled={!!pending}>
            {pending === "news" && <LoaderCircle size={16} className="spin" />}
            {t("نشر الخبر", "Publish news")}
          </button>
        </form>
      </div>
      <div
        role="tabpanel"
        id="leader-page-home"
        aria-labelledby="leader-tab-home"
        hidden={tab !== "home"}
      >
        <form
          className="leader-editor"
          onSubmit={(e) => {
            e.preventDefault();
            const urls = media.gallery_urls
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean);
            if (
              urls.length > 12 ||
              urls.some((url) => {
                try {
                  return new URL(url).protocol !== "https:";
                } catch {
                  return true;
                }
              })
            ) {
              setError(
                t(
                  "أضف حتى 12 رابط صورة صالحًا يبدأ بـ https://، رابط في كل سطر.",
                  "Add up to 12 valid image URLs starting with https://, one per line.",
                ),
              );
              e.currentTarget
                .querySelector<HTMLTextAreaElement>('[name="gallery_urls"]')
                ?.focus();
              return;
            }
            submit("home", {
              home: {
                video_url: media.video_url,
                poster_url: media.poster_url,
                gallery_urls: media.gallery_urls
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              },
            });
          }}
        >
          <h2>
            {t("صور وفيديو الصفحة الرئيسية", "Homepage photos and video")}
          </h2>
          <label>
            {t("رابط فيديو MP4 (اختياري)", "MP4 video URL (optional)")}
            <input
              name="video_url"
              type="url"
              pattern="https://.*"
              dir="ltr"
              value={media.video_url}
              onChange={(e) => {
                setDirty(true);
                setMedia({ ...media, video_url: e.target.value });
              }}
            />
          </label>
          <label>
            {t("رابط الصورة البديلة", "Fallback image URL")}
            <input
              name="poster_url"
              type="url"
              pattern="https://.*"
              dir="ltr"
              value={media.poster_url}
              onChange={(e) => {
                setDirty(true);
                setMedia({ ...media, poster_url: e.target.value });
              }}
            />
          </label>
          <label>
            {t(
              "صور المعرض - رابط في كل سطر",
              "Gallery images - one URL per line",
            )}
            <textarea
              name="gallery_urls"
              dir="ltr"
              rows={6}
              value={media.gallery_urls}
              onChange={(e) => {
                setDirty(true);
                setMedia({ ...media, gallery_urls: e.target.value });
              }}
            />
            <small>
              {t(
                "حتى 12 صورة. تظهر الصورة البديلة عند تعذّر تشغيل الفيديو.",
                "Up to 12 images. The fallback image appears when the video cannot play.",
              )}
            </small>
          </label>
          <button className="primary" disabled={!!pending}>
            {pending === "home" && <LoaderCircle size={16} className="spin" />}
            {t("حفظ الوسائط", "Save media")}
          </button>
        </form>
      </div>
      {error && (
        <p role="alert" className="leader-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="leader-feedback">
          {notice}
        </p>
      )}
    </section>
  );
}
