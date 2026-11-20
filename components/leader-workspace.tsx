"use client";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  Link,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  RefreshCw,
  Download,
  LoaderCircle,
} from "lucide-react";
import type { LeaderApi, LeaderEvent } from "./leader-attendance";
import "./leader.css";
import { EventArtwork } from "./event-artwork";
import { downloadLeaderboardPdf, downloadLeaderboardXlsx } from "@/lib/leaderboard-report";
import { ImageUpload, ImagePreview } from "./image-upload";
type Home = { video_url?: string; poster_url?: string; gallery_urls?: string[] };
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
  const [mediaUploading, setMediaUploading] = useState(false);
  const [tab] = useState("events");
  const [past, setPast] = useState(false),
    [query, setQuery] = useState(""),
    [copied, setCopied] = useState(""),
    [copyError, setCopyError] = useState("");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [pending, setPending] = useState("");
  const [leaderboardExporting, setLeaderboardExporting] = useState<"xlsx" | "pdf" | null>(null);
  const [media, setMedia] = useState({ video_url: home.video_url || "", poster_url: home.poster_url || "", gallery_urls: home.gallery_urls?.join("\n") || "" });
  const [dirty, setDirty] = useState(false);
  async function submit(action: string, data: Record<string, unknown>) {
    setPending(action); setError(""); setNotice("");
    try { await api(action, data); setNotice(t("اتحفظت", "Saved")); await onRefresh(); setDirty(false); }
    catch (e) { setError(e instanceof Error ? e.message : t("لم تُحفظ التغييرات، حاول مجددًا", "Changes were not saved, please retry")); }
    finally { setPending(""); }
  }
  async function exportLeaderboard(format: "xlsx" | "pdf") {
    setLeaderboardExporting(format); setError("");
    try {
      const result = await api("leaderboard");
      if (format === "xlsx") await downloadLeaderboardXlsx(result.rows);
      else downloadLeaderboardPdf(result.rows);
      setNotice(t("اتحمّل جدول المتصدرين", "Leaderboard downloaded"));
    } catch (e) { setError(e instanceof Error ? e.message : "تعذّر تنزيل الجدول"); }
    finally { setLeaderboardExporting(null); }
  }
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(""), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  const [eventStats, setEventStats] = useState<
    Record<
      string,
      { rsvp_count: number; attended_count: number; pending_count: number }
    >
  >({});
  const [statsLoading, setStatsLoading] = useState(false),
    [statsError, setStatsError] = useState("");
  const statsBusy = useRef(false),
    statsMounted = useRef(true);
  async function loadStats() {
    if (statsBusy.current) return;
    statsBusy.current = true;
    setStatsLoading(true);
    setStatsError("");
    try {
      const d = await api("event-stats");
      if (statsMounted.current)
        setEventStats(
          Object.fromEntries(d.rows.map((r: any) => [r.event_id, r])),
        );
    } catch {
      if (statsMounted.current)
        setStatsError(
          "تعذّر تحديث الأعداد. اضغط تحديث الأعداد للمحاولة مجددًا.",
        );
    } finally {
      statsBusy.current = false;
      if (statsMounted.current) setStatsLoading(false);
    }
  }
  useEffect(() => {
    statsMounted.current = true;
    loadStats();
    const timer = setInterval(() => {
      if (!document.hidden) loadStats();
    }, 30000);
    return () => {
      statsMounted.current = false;
      clearInterval(timer);
    };
  }, [api]);
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
          "الرابط ماتنسخش. افتح الفعالية وانسخه من شريط العنوان.",
          "Unable to copy. Open the event and copy its URL from the browser.",
        ),
      );
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
        role="tabpanel"
        id="leader-page-events"
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
        <div className="leader-count-refresh">
          <button
            className="outline"
            onClick={loadStats}
            disabled={statsLoading}
          >
            <RefreshCw size={16} className={statsLoading ? "spin" : ""} />
            {statsLoading ? "جارٍ تحديث الأعداد…" : "تحديث الأعداد"}
          </button>
          <button className="outline" onClick={() => exportLeaderboard("xlsx")} disabled={!!leaderboardExporting}>
            <Download size={16} /> {leaderboardExporting === "xlsx" ? "جارٍ التحضير…" : "المتصدرون Excel"}
          </button>
          <button className="outline" onClick={() => exportLeaderboard("pdf")} disabled={!!leaderboardExporting}>
            <Download size={16} /> {leaderboardExporting === "pdf" ? "جارٍ التحضير…" : "المتصدرون PDF"}
          </button>
          {statsError && (
            <p role="alert" className="leader-help">
              {statsError}
            </p>
          )}
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
                <div className="leader-event-visual">
                  <div className="leader-event-art">
                    <EventArtwork title={e.title} src={e.cover_url} />
                  </div>
                  <div className="leader-date">
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
                  <div
                    className="leader-event-counts"
                    aria-label="أعداد المشاركة والحضور"
                  >
                    <span>
                      <b>
                        {eventStats[e.id]?.rsvp_count ??
                          (statsLoading ? "..." : "غير متاح")}
                      </b>{" "}
                      أكدوا المشاركة
                    </span>
                    {(new Date(e.start_at) <= new Date() ||
                      (eventStats[e.id]?.attended_count || 0) > 0) && (
                      <span>
                        <b>
                          {eventStats[e.id]?.attended_count ??
                            (statsLoading ? "..." : "غير متاح")}
                        </b>{" "}
                        حضروا
                      </span>
                    )}
                    {(eventStats[e.id]?.pending_count || 0) > 0 && (
                      <span className="leader-help">
                        {eventStats[e.id].pending_count} بانتظار إنشاء الحساب،
                        ضمن الحضور
                      </span>
                    )}
                  </div>
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
                  ? t("مفيش نتائج مطابقة", "No matching events")
                  : past
                    ? t("لسه مفيش فعاليات سابقة", "No past events")
                    : t("لسه مفيش فعاليات جاية", "No upcoming events")}
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
        id="leader-page-home"
        aria-labelledby="leader-tab-home"
        hidden={tab !== "home"}
      >
        <form
          className="leader-editor"
          onSubmit={(e) => {
            e.preventDefault();
            if (mediaUploading) return;
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
                setMedia((current) => ({
                  ...current,
                  video_url: e.target.value,
                }));
              }}
            />
          </label>
          <div className="image-picker">
            <label>الصورة البديلة للفيديو</label>
            <ImageUpload
              api={api}
              purpose="home"
              disabled={mediaUploading || !!pending}
              onBusyChange={setMediaUploading}
              onUploaded={(url) => {
                setDirty(true);
                setMedia((current) => ({ ...current, poster_url: url }));
              }}
            />
            {media.poster_url && (
              <>
                <ImagePreview url={media.poster_url} api={api} />
                <button
                  type="button"
                  className="text-btn"
                  disabled={mediaUploading}
                  onClick={() => {
                    setDirty(true);
                    setMedia((current) => ({ ...current, poster_url: "" }));
                  }}
                >
                  شيل الصورة
                </button>
              </>
            )}
            <details>
              <summary>أو استخدم رابط صورة</summary>
              <input
                type="url"
                name="poster_url"
                dir="ltr"
                pattern="https://.*"
                value={media.poster_url}
                onChange={(e) => {
                  setDirty(true);
                  setMedia((current) => ({
                    ...current,
                    poster_url: e.target.value,
                  }));
                }}
              />
            </details>
          </div>
          <div className="image-picker">
            <label>صور المعرض</label>
            <ImageUpload
              api={api}
              purpose="home"
              label="ارفع صور"
              multiple
              disabled={mediaUploading || !!pending}
              maxFiles={Math.max(
                0,
                12 -
                  media.gallery_urls.split("\n").filter((s) => s.trim()).length,
              )}
              onBusyChange={setMediaUploading}
              onUploaded={(url) => {
                setDirty(true);
                setMedia((current) => ({
                  ...current,
                  gallery_urls: [current.gallery_urls.trim(), url]
                    .filter(Boolean)
                    .join("\n"),
                }));
              }}
            />
            <div className="gallery-preview">
              {media.gallery_urls
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((url, i) => (
                  <div key={url + i}>
                    <img
                      src={url}
                      alt={"صورة المعرض " + (i + 1)}
                      loading="lazy"
                    />
                    <button
                      type="button"
                      disabled={mediaUploading}
                      onClick={() => {
                        setDirty(true);
                        setMedia((current) => ({
                          ...current,
                          gallery_urls: current.gallery_urls
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .filter((_, index) => index !== i)
                            .join("\n"),
                        }));
                      }}
                    >
                      شيل الصورة
                    </button>
                  </div>
                ))}
            </div>
            <small className="leader-help">تقدر تضيف لحد 12 صورة.</small>
            <details>
              <summary>أو أضف روابط صور</summary>
              <textarea
                name="gallery_urls"
                dir="ltr"
                rows={4}
                value={media.gallery_urls}
                onChange={(e) => {
                  setDirty(true);
                  setMedia((current) => ({
                    ...current,
                    gallery_urls: e.target.value,
                  }));
                }}
              />
              <small>رابط في كل سطر.</small>
            </details>
          </div>
          <button className="primary" disabled={!!pending || mediaUploading}>
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
