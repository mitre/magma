// src/utils/utils.js

// ---------- Time helpers ----------
export function toMs(x) {
  if (x == null) return 0;
  if (typeof x === "number") return x < 1e12 ? Math.floor(x * 1000) : x; // seconds→ms
  const p = Date.parse(x);                 // ISO 8601 → ok
  if (!Number.isNaN(p)) return p;
  // Rescue "YYYY-MM-DD HH:mm:ss" (UTC) without TZ
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(x)) {
    const q = Date.parse(x.replace(" ", "T") + "Z");
    if (!Number.isNaN(q)) return q;
  }
  return 0;
}

export function getHumanFriendlyTimeISO8601(dateTime) {
  const ms = toMs(dateTime);
  if (!ms) return "";
  return getHumanFriendlyDelta(ms);
}

export function getHumanFriendlyTime(date) {
  const ms = toMs(date);
  if (!ms) return "";
  return getHumanFriendlyDelta(ms);
}

function getHumanFriendlyDelta(givenMs) {
  let delta = Math.round((Date.now() - givenMs) / 1000);
  const minute = 60, hour = 60 * minute, day = 24 * hour;
  if (delta < 30) return "just now";
  if (delta < minute) return `${delta} seconds ago`;
  if (delta < 2 * minute) return "a minute ago";
  if (delta < hour) return `${Math.floor(delta / minute)} min ago`;
  if (Math.floor(delta / hour) === 1) return "1 hr ago";
  if (delta < day) return `${Math.floor(delta / hour)} hrs ago`;

  const d = new Date(givenMs);
  const yesterday = givenMs >= Date.now() - day;
  if (yesterday) {
    return `yesterday ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} UTC`;
  }
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} UTC`;
}

function pad2(n){ return String(n).padStart(2,"0"); }

export function getReadableTime(dateTime) {
  const ms = toMs(dateTime);
  if (!ms) return "";
  return new Date(ms).toLocaleString("en-US", { timeZoneName: "short" });
}

// ---------- Base64 helpers ----------
/** Decode base64 into UTF-8 string; falls back to Latin-1 if not UTF-8 */
export function b64DecodeUnicode(str) {
  if (str == null) return "";
  try {
    return decodeURIComponent(
      atob(str)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    try { return atob(str); } catch { return ""; }
  }
}

/** Encode UTF-8 string to base64 (unicode-safe) */
export function b64EncodeUnicode(str) {
  if (str == null) return "";
  // encodeURIComponent → percent bytes → base64
  const pct = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode("0x" + p1)
  );
  return btoa(pct);
}

/** Encode raw bytes (Uint8Array/Array) to base64 */
export function b64EncodeBytes(bytes) {
  if (!bytes) return "";
  let bin = "";
  const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}

/** Decode base64 to Uint8Array (raw bytes) */
export function b64DecodeToBytes(str) {
  if (!str) return new Uint8Array();
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- Misc ----------
/** Cartesian product of an array of arrays (skips empties) */
export function cartesian(args) {
  const filtered = (args || []).filter(arr => Array.isArray(arr) && arr.length > 0);
  if (!filtered.length) return [];
  const r = [];
  const max = filtered.length - 1;
  (function helper(prefix, i) {
    for (const el of filtered[i]) {
      const next = prefix.concat([el]);
      i === max ? r.push(next) : helper(next, i + 1);
    }
  })([], 0);
  return r;
}