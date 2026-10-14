"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPdfThumbnailer, isAbortError, type PdfThumbnailer } from "./pdf-thumb";

export type ThumbnailerState =
  | { status: "idle"; thumbs: null; error: null }
  | { status: "loading"; thumbs: null; error: null }
  | { status: "ready"; thumbs: PdfThumbnailer; error: null }
  | { status: "error"; thumbs: null; error: unknown };

/**
 * Open `file` once with pdf.js for thumbnails. The document is destroyed (and
 * every thumbnail URL revoked) when the file changes or the component unmounts.
 */
export function usePdfThumbnailer(file: File | null): ThumbnailerState {
  const [state, setState] = useState<ThumbnailerState>({ status: "idle", thumbs: null, error: null });

  useEffect(() => {
    if (!file) {
      setState({ status: "idle", thumbs: null, error: null });
      return;
    }
    let cancelled = false;
    let created: PdfThumbnailer | null = null;
    setState({ status: "loading", thumbs: null, error: null });
    createPdfThumbnailer(file).then(
      (thumbs) => {
        if (cancelled) {
          thumbs.destroy();
          return;
        }
        created = thumbs;
        setState({ status: "ready", thumbs, error: null });
      },
      (error) => {
        if (!cancelled) setState({ status: "error", thumbs: null, error });
      },
    );
    return () => {
      cancelled = true;
      created?.destroy();
    };
  }, [file]);

  return state;
}

/**
 * A lazily rendered page thumbnail. Renders only when the tile is on (or
 * near) screen; requests for tiles scrolled away before rendering are
 * cancelled. `root` should be the nearest scroll container, if any, so the
 * look-ahead margin applies to it.
 */
export function PdfPageThumb({
  thumbs,
  page,
  box,
  root,
  className = "",
  imgClassName = "",
  imgStyle,
  placeholder,
}: {
  thumbs: PdfThumbnailer | null;
  page: number;
  /** Longer side of the rendered image in CSS pixels. */
  box: number;
  root?: Element | null;
  className?: string;
  imgClassName?: string;
  imgStyle?: CSSProperties;
  placeholder?: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setUrl(null);
    setFailed(false);
  }, [thumbs, page, box]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setVisible(entry.isIntersecting);
      },
      { root: root ?? null, rootMargin: "320px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    if (!visible || !thumbs || url || failed) return;
    const ac = new AbortController();
    thumbs.render(page, box, ac.signal).then(
      (u) => {
        if (!ac.signal.aborted) setUrl(u);
      },
      (error) => {
        if (!isAbortError(error) && !ac.signal.aborted) setFailed(true);
      },
    );
    return () => ac.abort();
  }, [visible, thumbs, page, box, url, failed]);

  return (
    <div ref={hostRef} className={className}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" draggable={false} className={imgClassName} style={imgStyle} />
      ) : (
        placeholder ?? null
      )}
    </div>
  );
}
