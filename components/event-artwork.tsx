"use client";
import { useState } from "react";
import "./event-artwork.css";
export function EventArtwork({
  title,
  src,
  large = false,
}: {
  title: string;
  src?: string | null;
  large?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <div
      className={"event-artwork " + (large ? "event-artwork--large" : "")}
      aria-hidden="true"
    >
      {src && failed !== src ? (
        <img
          className="event-artwork-photo"
          src={src}
          alt=""
          loading={large ? "eager" : "lazy"}
          onError={() => setFailed(src)}
        />
      ) : (
        <div className="event-artwork-fallback">
          <img
            className="event-artwork-logo"
            src="/assets/cairo-student-logo.png"
            alt=""
          />
          <strong>{title}</strong>
          <span>طلاب من أجل مصر</span>
        </div>
      )}
    </div>
  );
}
