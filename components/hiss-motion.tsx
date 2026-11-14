"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

// Independently implemented from the observed HISS hero timing and choreography.
// Keep Arabic text intact rather than splitting its connected glyphs into letters.
const ease = "cubic-bezier(0.16, 1, 0.35, 1)";
const duration = 10500;
const frame = (offset: number, scale: number): Keyframe => ({
  offset,
  transform: `scale(${scale})`,
  easing: ease,
});
const cycles: Keyframe[][] = [
  [
    frame(0, 1),
    frame(2 / 10.5, 1),
    frame(2.75 / 10.5, 0),
    frame(9.75 / 10.5, 0),
    frame(1, 1),
  ],
  [
    frame(0, 0),
    frame(2.75 / 10.5, 0),
    frame(3.5 / 10.5, 1),
    frame(5.5 / 10.5, 1),
    frame(6.25 / 10.5, 0),
    frame(1, 0),
  ],
  [
    frame(0, 0),
    frame(6.25 / 10.5, 0),
    frame(7 / 10.5, 1),
    frame(9 / 10.5, 1),
    frame(9.75 / 10.5, 0),
    frame(1, 0),
  ],
];

export function HissImageStack({
  images,
  label,
  index,
  paused,
  videoUrl,
  posterUrl,
}: {
  images: string[];
  label: string;
  index: number;
  paused: boolean;
  videoUrl?: string;
  posterUrl?: string;
}) {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const pausedRef = useRef(paused);
  const syncRef = useRef<() => void>(() => {});
  pausedRef.current = paused;
  useEffect(() => {
    syncRef.current();
  }, [paused]);
  const sourceKey = images.join("|");
  useEffect(() => setFailed(false), [videoUrl]);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const layers = Array.from(
      el.querySelectorAll<HTMLElement>(".hiss-image-layer"),
    );
    const entrance = el.querySelector<HTMLElement>(".hiss-stack-entrance")!;
    const entry = entrance.animate(
      [
        { opacity: 0, transform: "translateY(50px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 1000,
        delay: 400 + index * 100,
        easing: ease,
        fill: "backwards",
      },
    );
    const loops = layers.map((layer, i) =>
      layer.animate(cycles[i], {
        duration,
        delay: 1800 + index * 100,
        iterations: Infinity,
      }),
    );
    const animations = [entry, ...loops];
    let visible = false;
    let entered = false;
    entry.onfinish = () => {
      entered = true;
    };
    const sync = () => {
      if (reduced.matches) animations.forEach((a) => a.cancel());
      else
        animations.forEach((a) => {
          if (a === entry && entered) return;
          if (pausedRef.current || !visible || document.hidden) a.pause();
          else if (a !== entry || a.playState !== "finished") a.play();
        });
      const v = video.current;
      if (v) {
        if (pausedRef.current || !visible || document.hidden || reduced.matches)
          v.pause();
        else v.play().catch(() => {});
      }
    };
    syncRef.current = sync;
    animations.forEach((a) => a.pause());
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(el);
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      syncRef.current = () => {};
      animations.forEach((a) => a.cancel());
      observer.disconnect();
      reduced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      video.current?.pause();
    };
  }, [sourceKey, videoUrl, failed, index]);
  return (
    <figure
      ref={root}
      className={`hiss-image-stack hiss-stack-${index}`}
      role="img"
      aria-label={label}
    >
      <div className="hiss-stack-entrance">
        {images.slice(0, 3).map((src, i) => (
          <div className="hiss-image-layer" key={src + i} aria-hidden="true">
            {i === 0 && videoUrl && !failed ? (
              <video
                ref={video}
                src={videoUrl}
                poster={posterUrl || src}
                muted
                playsInline
                loop
                preload="none"
                onError={() => setFailed(true)}
              />
            ) : (
              <img
                src={i === 0 ? posterUrl || src : src}
                alt=""
                decoding="async"
              />
            )}
          </div>
        ))}
      </div>
    </figure>
  );
}

export function useHissReveals(
  root: RefObject<HTMLDivElement | null>,
  screen: string,
) {
  useEffect(() => {
    const el = root.current;
    if (!el || screen !== "welcome") return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    const animations: Animation[] = [];
    const targets = el.querySelectorAll<HTMLElement>("[data-hiss-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animations.push(
            (entry.target as HTMLElement).animate(
              [
                { transform: "translateY(45px)", opacity: 0 },
                { transform: "translateY(0)", opacity: 1 },
              ],
              { duration: 1000, easing: ease },
            ),
          );
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );
    targets.forEach((target) => observer.observe(target));
    const stop = () => {
      if (reduced.matches) {
        observer.disconnect();
        animations.forEach((a) => a.cancel());
      }
    };
    reduced.addEventListener("change", stop);
    return () => {
      observer.disconnect();
      animations.forEach((a) => a.cancel());
      reduced.removeEventListener("change", stop);
    };
  }, [root, screen]);
}
