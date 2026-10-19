import type { Metadata, TagValue } from "./metadata";

type T = (key: string, params?: Record<string, string | number>) => string;

export interface Row {
  label: string;
  value: string;
}

export interface Group {
  id: "camera" | "capture" | "image" | "author" | "location" | "other";
  title: string;
  rows: Row[];
}

export interface Location {
  lat: number;
  lon: number;
  altitude: number | null;
}

const num = (v: TagValue | undefined, i = 0): number | null => {
  if (!v) return null;
  if (v.kind === "num") return v.nums[i] ?? null;
  if (v.kind === "rat") {
    const r = v.rats[i];
    return r && r[1] !== 0 ? r[0] / r[1] : null;
  }
  return null;
};

const text = (v: TagValue | undefined): string | null => {
  if (!v) return null;
  if (v.kind === "text") return v.text || null;
  if (v.kind === "bytes") {
    // UserComment: 8-byte charset id, then text.
    const head = new TextDecoder("latin1").decode(v.bytes.subarray(0, 8));
    const body = v.bytes.subarray(8);
    const s = head.startsWith("UNICODE") ? new TextDecoder("utf-16be").decode(body) : new TextDecoder("utf-8").decode(body);
    return s.replace(/\0+/g, "").trim() || null;
  }
  return null;
};

/** Windows XP* tags: UCS-2 little endian stored as BYTE. */
const xpText = (v: TagValue | undefined): string | null => {
  if (v?.kind !== "num") return null;
  return new TextDecoder("utf-16le").decode(new Uint8Array(v.nums)).replace(/\0+/g, "").trim() || null;
};

const trim = (n: number, digits = 1) => String(Number(n.toFixed(digits)));

/** 1/250 s, 1/3 s, 0.6 s, 2.5 s, 30 s — never "1/2" for 0.6. */
export function formatExposure(v: number, t: T): string {
  if (v <= 0) return t("exif.v2.seconds", { n: "0" });
  if (v < 1) {
    const inv = 1 / v;
    const rounded = Math.round(inv);
    if (Math.abs(inv - rounded) <= inv * 0.03) return t("exif.v2.seconds", { n: `1/${rounded}` });
    return t("exif.v2.seconds", { n: trim(v, 2) });
  }
  return t("exif.v2.seconds", { n: trim(v, 1) });
}

function exifDate(raw: string | null, offset: string | null, locale: string): string | null {
  if (!raw) return null;
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(raw);
  if (!m) return raw;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
  if (isNaN(d.getTime())) return raw;
  const s = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium" }).format(d);
  return offset ? `${s} (UTC${offset})` : s;
}

function dms(v: TagValue | undefined): number | null {
  if (v?.kind !== "rat" || v.rats.length < 1) return null;
  const part = (i: number) => {
    const r = v.rats[i];
    return r && r[1] ? r[0] / r[1] : 0;
  };
  const value = part(0) + part(1) / 60 + part(2) / 3600;
  return isFinite(value) ? value : null;
}

/** XMP form "41,0.5123N" or "41,0,30.7N". */
function xmpCoord(s: string | null): number | null {
  if (!s) return null;
  const m = /^\s*(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?([NSEW])\s*$/i.exec(s);
  if (!m) return null;
  const v = +m[1] + +m[2] / 60 + (m[3] ? +m[3] / 3600 : 0);
  return /[SW]/i.test(m[4]) ? -v : v;
}

export function xmpField(xmp: string | null, name: string): string | null {
  if (!xmp) return null;
  const esc = name.replace(/[.:]/g, (c) => `\\${c}`);
  const attr = new RegExp(`${esc}="([^"]*)"`).exec(xmp);
  if (attr) return attr[1].trim() || null;
  const el = new RegExp(`<${esc}>([\\s\\S]*?)</${esc}>`).exec(xmp);
  if (!el) return null;
  const li = /<rdf:li[^>]*>([^<]*)<\/rdf:li>/.exec(el[1]);
  const value = (li ? li[1] : el[1]).replace(/<[^>]+>/g, "").trim();
  return value || null;
}

export function locationOf(meta: Metadata): Location | null {
  const gps = meta.tiff?.gps;
  if (gps && gps.size) {
    let lat = dms(gps.get(0x0002));
    let lon = dms(gps.get(0x0004));
    if (lat !== null && lon !== null && !(lat === 0 && lon === 0)) {
      if (text(gps.get(0x0001))?.toUpperCase() === "S") lat = -lat;
      if (text(gps.get(0x0003))?.toUpperCase() === "W") lon = -lon;
      let altitude = num(gps.get(0x0006));
      if (altitude !== null && num(gps.get(0x0005)) === 1) altitude = -altitude;
      if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon, altitude };
    }
  }
  const lat = xmpCoord(xmpField(meta.xmp, "exif:GPSLatitude"));
  const lon = xmpCoord(xmpField(meta.xmp, "exif:GPSLongitude"));
  if (lat !== null && lon !== null) return { lat, lon, altitude: null };
  return null;
}

export function formatCoord(v: number, positive: string, negative: string) {
  return `${Math.abs(v).toFixed(6)}° ${v >= 0 ? positive : negative}`;
}

export function describe(meta: Metadata, t: T, locale: string): { groups: Group[]; location: Location | null; count: number } {
  const ifd0 = meta.tiff?.ifd0 ?? new Map<number, TagValue>();
  const ex = meta.tiff?.exif ?? new Map<number, TagValue>();
  const gps = meta.tiff?.gps ?? new Map<number, TagValue>();
  const groups: Group[] = [];
  const group = (id: Group["id"], title: string, rows: (Row | null)[]) => {
    const r = rows.filter((x): x is Row => Boolean(x && x.value));
    if (r.length) groups.push({ id, title, rows: r });
  };
  const row = (label: string, value: string | null | undefined): Row | null => (value ? { label, value } : null);
  const pick = (map: Record<number, string>, v: number | null) => (v !== null && map[v] ? map[v] : null);

  // Camera
  const lensSpec = ex.get(0xa432);
  let lens = text(ex.get(0xa434));
  if (!lens && lensSpec?.kind === "rat" && lensSpec.rats.length === 4) {
    const [a, b, c, d] = [0, 1, 2, 3].map((i) => num(lensSpec, i));
    if (a && b) lens = `${trim(a)}${b !== a ? `–${trim(b)}` : ""} mm${c ? ` f/${trim(c)}${d && d !== c ? `–${trim(d)}` : ""}` : ""}`;
  }
  group("camera", t("exif.v2.group.camera"), [
    row(t("exif.tag.cameramake"), text(ifd0.get(0x010f))),
    row(t("exif.tag.cameramodel"), text(ifd0.get(0x0110))),
    row(t("exif.v2.tag.lens"), [text(ex.get(0xa433)), lens].filter(Boolean).join(" ") || null),
    row(t("exif.v2.tag.serial"), text(ex.get(0xa431))),
    row(t("exif.tag.software"), text(ifd0.get(0x0131)) ?? xmpField(meta.xmp, "xmp:CreatorTool")),
    row(t("exif.v2.tag.hostComputer"), text(ifd0.get(0x013c))),
  ]);

  // Capture
  const exposure = num(ex.get(0x829a));
  const fnum = num(ex.get(0x829d));
  const iso = num(ex.get(0x8827));
  const focal = num(ex.get(0x920a));
  const focal35 = num(ex.get(0xa405));
  const bias = num(ex.get(0x9204));
  const flash = num(ex.get(0x9209));
  let flashText: string | null = null;
  if (flash !== null) {
    if (flash & 0x20) flashText = t("exif.v2.flash.none");
    else {
      flashText = flash & 1 ? t("exif.v2.flash.fired") : t("exif.v2.flash.notFired");
      if (((flash >> 3) & 3) === 3) flashText += ` · ${t("exif.v2.flash.auto")}`;
    }
  }
  group("capture", t("exif.v2.group.capture"), [
    row(t("exif.tag.datetaken"), exifDate(text(ex.get(0x9003)), text(ex.get(0x9011)), locale)),
    row(t("exif.tag.exposuretime"), exposure !== null ? formatExposure(exposure, t) : null),
    row(t("exif.tag.fnumber"), fnum ? `f/${trim(fnum)}` : null),
    row(t("exif.tag.isospeed"), iso ? `ISO ${iso}` : null),
    row(t("exif.tag.focallength"), focal ? `${trim(focal)} mm` : null),
    row(t("exif.tag.focallength35mm"), focal35 ? `${focal35} mm` : null),
    row(t("exif.v2.tag.exposureBias"), bias !== null ? `${bias > 0 ? "+" : ""}${trim(bias)} EV` : null),
    row(
      t("exif.v2.tag.exposureProgram"),
      pick(
        {
          1: t("exif.v2.prog.manual"),
          2: t("exif.v2.prog.normal"),
          3: t("exif.v2.prog.aperture"),
          4: t("exif.v2.prog.shutter"),
          5: t("exif.v2.prog.creative"),
          6: t("exif.v2.prog.action"),
          7: t("exif.v2.prog.portrait"),
          8: t("exif.v2.prog.landscape"),
        },
        num(ex.get(0x8822)),
      ),
    ),
    row(
      t("exif.v2.tag.exposureMode"),
      pick({ 0: t("exif.v2.auto"), 1: t("exif.v2.prog.manual"), 2: t("exif.v2.bracket") }, num(ex.get(0xa402))),
    ),
    row(
      t("exif.v2.tag.metering"),
      pick(
        {
          1: t("exif.v2.meter.average"),
          2: t("exif.v2.meter.center"),
          3: t("exif.v2.meter.spot"),
          4: t("exif.v2.meter.multiSpot"),
          5: t("exif.v2.meter.pattern"),
          6: t("exif.v2.meter.partial"),
        },
        num(ex.get(0x9207)),
      ),
    ),
    row(t("exif.v2.tag.flash"), flashText),
    row(t("exif.v2.tag.whiteBalance"), pick({ 0: t("exif.v2.auto"), 1: t("exif.v2.prog.manual") }, num(ex.get(0xa403)))),
    row(
      t("exif.v2.tag.scene"),
      pick(
        { 0: t("exif.v2.scene.standard"), 1: t("exif.v2.prog.landscape"), 2: t("exif.v2.prog.portrait"), 3: t("exif.v2.scene.night") },
        num(ex.get(0xa406)),
      ),
    ),
    row(t("exif.tag.datedigitized"), exifDate(text(ex.get(0x9004)), text(ex.get(0x9012)), locale)),
    row(t("exif.tag.datemodified"), exifDate(text(ifd0.get(0x0132)), text(ex.get(0x9010)), locale)),
  ]);

  // Image
  const orientation = num(ifd0.get(0x0112));
  const xres = num(ifd0.get(0x011a));
  const unit = num(ifd0.get(0x0128));
  const pxW = num(ex.get(0xa002));
  const pxH = num(ex.get(0xa003));
  group("image", t("exif.v2.group.image"), [
    row(t("exif.v2.tag.pixelSize"), pxW && pxH ? `${pxW} × ${pxH}` : null),
    row(
      t("exif.tag.orientation"),
      pick(
        {
          1: t("exif.v2.orient.1"),
          2: t("exif.v2.orient.2"),
          3: t("exif.v2.orient.3"),
          4: t("exif.v2.orient.4"),
          5: t("exif.v2.orient.5"),
          6: t("exif.v2.orient.6"),
          7: t("exif.v2.orient.7"),
          8: t("exif.v2.orient.8"),
        },
        orientation,
      ),
    ),
    row(t("exif.tag.colorspace"), pick({ 1: "sRGB", 2: "Adobe RGB", 65535: t("exif.v2.uncalibrated") }, num(ex.get(0xa001)))),
    row(t("exif.v2.tag.resolution"), xres ? `${trim(xres)} ${unit === 3 ? "px/cm" : "dpi"}` : null),
    row(t("exif.v2.tag.thumbnail"), meta.tiff?.hasThumbnail ? t("exif.v2.thumbnailYes") : null),
    row(t("exif.v2.tag.icc"), meta.icc ? t("exif.v2.iccKept") : null),
  ]);

  // People & description
  group("author", t("exif.v2.group.author"), [
    row(t("exif.v2.tag.artist"), text(ifd0.get(0x013b)) ?? xpText(ifd0.get(0x9c9d)) ?? xmpField(meta.xmp, "dc:creator")),
    row(t("exif.v2.tag.owner"), text(ex.get(0xa430))),
    row(t("exif.v2.tag.copyright"), text(ifd0.get(0x8298)) ?? xmpField(meta.xmp, "dc:rights")),
    row(t("exif.v2.tag.title"), xpText(ifd0.get(0x9c9b)) ?? xmpField(meta.xmp, "dc:title")),
    row(t("exif.v2.tag.description"), text(ifd0.get(0x010e)) ?? xmpField(meta.xmp, "dc:description")),
    row(t("exif.v2.tag.comment"), text(ex.get(0x9286)) ?? xpText(ifd0.get(0x9c9c))),
    row(t("exif.v2.tag.keywords"), xpText(ifd0.get(0x9c9e))),
    row(t("exif.v2.tag.subject"), xpText(ifd0.get(0x9c9f))),
    row(t("exif.tag.imageuniqueid"), text(ex.get(0xa420))),
  ]);

  // Location
  const location = locationOf(meta);
  const gpsDate = text(gps.get(0x001d));
  const gpsTime = gps.get(0x0007);
  let gpsWhen: string | null = null;
  if (gpsDate && gpsTime?.kind === "rat" && gpsTime.rats.length === 3) {
    const [h, m, s] = [0, 1, 2].map((i) => Math.floor(num(gpsTime, i) ?? 0));
    gpsWhen = `${gpsDate.replace(/:/g, "-")} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} UTC`;
  }
  const direction = num(gps.get(0x0011));
  const city = [xmpField(meta.xmp, "photoshop:City"), xmpField(meta.xmp, "photoshop:State"), xmpField(meta.xmp, "photoshop:Country")]
    .filter(Boolean)
    .join(", ");
  group("location", t("exif.v2.group.location"), [
    row(
      t("exif.v2.tag.coordinates"),
      location ? `${formatCoord(location.lat, t("exif.v2.dir.n"), t("exif.v2.dir.s"))}, ${formatCoord(location.lon, t("exif.v2.dir.e"), t("exif.v2.dir.w"))}` : null,
    ),
    row(t("exif.tag.gpsaltitude"), location?.altitude != null ? `${trim(location.altitude)} m` : null),
    row(t("exif.v2.tag.gpsTime"), gpsWhen),
    row(t("exif.v2.tag.direction"), direction !== null ? `${trim(direction)}°` : null),
    row(t("exif.v2.tag.place"), city || xmpField(meta.xmp, "Iptc4xmpCore:Location")),
  ]);

  // Other blocks
  group("other", t("exif.v2.group.other"), [
    row("XMP", meta.xmp ? t("exif.v2.present") : null),
    row("IPTC", meta.iptc ? t("exif.v2.present") : null),
    row(t("exif.v2.tag.trailer"), meta.trailerBytes > 1024 ? t("exif.v2.trailerValue", { kb: Math.round(meta.trailerBytes / 1024) }) : null),
    row(t("exif.v2.tag.damaged"), meta.exifDamaged ? t("exif.v2.damagedValue") : null),
    ...meta.texts.map((e) => row(e.keyword, e.text)),
  ]);

  const count = groups.reduce((n, g) => n + g.rows.filter((r) => !(g.id === "image" && r.label === t("exif.v2.tag.icc"))).length, 0);
  return { groups, location, count };
}
