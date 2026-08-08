import { describe, expect, it } from "vitest";
import { analyzeSvg, looksLikeSvg } from "@/lib/domain/svg-analyzer";
import {
  MAX_ICON_FILE_SIZE_BYTES,
  readPngDimensions,
  resolveIcon,
  validateIconFile,
  validateIconName,
} from "@/lib/domain/icon-rules";

/** یک PNG معتبر حداقلی با ابعاد دلخواه می‌سازد (فقط امضا + هدر IHDR لازم است). */
function makePng(width: number, height: number, extraBytes = 0): Uint8Array {
  const bytes = new Uint8Array(24 + extraBytes);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8); // طول قطعه
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function svgBytes(source: string): Uint8Array {
  return new TextEncoder().encode(source);
}

const pngMeta = (size: number) => ({ filename: "icon.png", declaredMimeType: "image/png", size });
const svgMeta = (size: number) => ({ filename: "icon.svg", declaredMimeType: "image/svg+xml", size });

// ---------------------------------------------------------------------------

describe("readPngDimensions", () => {
  it("I-01/I-02: ابعاد PNG معتبر خوانده می‌شود", () => {
    expect(readPngDimensions(makePng(64, 48))).toEqual({ width: 64, height: 48 });
  });

  it("I-03: PNG بریده null می‌دهد", () => {
    expect(readPngDimensions(new Uint8Array(12))).toBeNull();
  });

  it("بایت‌های بدون امضای PNG null می‌دهند", () => {
    const bytes = makePng(32, 32);
    bytes[0] = 0x00;
    expect(readPngDimensions(bytes)).toBeNull();
  });
});

describe("validateIconFile — PNG", () => {
  it("PNG معتبر پذیرفته می‌شود", () => {
    const bytes = makePng(64, 64);
    expect(validateIconFile(pngMeta(bytes.length), bytes)).toEqual({
      mimeType: "image/png",
      width: 64,
      height: 64,
    });
  });

  it("I-05: مرزهای ابعاد", () => {
    for (const [w, h, ok] of [
      [15, 32, false],
      [16, 16, true],
      [512, 512, true],
      [513, 32, false],
    ] as const) {
      const bytes = makePng(w, h);
      const run = () => validateIconFile(pngMeta(bytes.length), bytes);
      if (ok) expect(run).not.toThrow();
      else expect(run).toThrowError(/ابعاد/);
    }
  });

  it("I-06: مرزهای حجم", () => {
    const bytes = makePng(32, 32);
    expect(() => validateIconFile(pngMeta(0), bytes)).toThrowError(/خالی/);
    expect(() => validateIconFile(pngMeta(MAX_ICON_FILE_SIZE_BYTES), bytes)).not.toThrow();
    expect(() => validateIconFile(pngMeta(MAX_ICON_FILE_SIZE_BYTES + 1), bytes)).toThrowError(/۲ مگابایت/);
  });

  it("I-04: PNG با نام svg. رد می‌شود (عدم تطابق پسوند و نوع)", () => {
    const bytes = makePng(32, 32);
    expect(() =>
      validateIconFile({ filename: "icon.svg", declaredMimeType: "image/png", size: bytes.length }, bytes),
    ).toThrowError(/هم‌خوانی/);
  });

  it("I-04b: بایت‌های غیر PNG با ادعای PNG رد می‌شوند", () => {
    const bytes = new TextEncoder().encode("<?php echo 1; ?>          ");
    expect(() => validateIconFile(pngMeta(bytes.length), bytes)).toThrowError(/PNG معتبر/);
  });

  it("I-07/I-08: پسوند و MIME نامعتبر", () => {
    const bytes = makePng(32, 32);
    expect(() =>
      validateIconFile({ filename: "icon.exe", declaredMimeType: "image/png", size: bytes.length }, bytes),
    ).toThrowError(/پسوند/);
    expect(() =>
      validateIconFile({ filename: "icon.png", declaredMimeType: "text/html", size: bytes.length }, bytes),
    ).toThrowError(/نوع فایل/);
  });
});

// ---------------------------------------------------------------------------
// SVG مخرب — هر مورد باید رد شود
// ---------------------------------------------------------------------------

const HOSTILE_SVGS: [string, string][] = [
  ["I-09 script در ریشه", `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`],
  ["I-10 script تودرتو در defs", `<svg><defs><script>alert(1)</script></defs></svg>`],
  ["I-11 script با فاصله", `<svg>< script >alert(1)</script></svg>`],
  ["I-11b script با حروف مخلوط", `<svg><sCrIpT>alert(1)</sCrIpT></svg>`],
  ["I-12 foreignObject", `<svg><foreignObject><body>x</body></foreignObject></svg>`],
  ["I-13 onload", `<svg onload="alert(1)"><circle r="1"/></svg>`],
  ["I-14 onclick روی فرزند", `<svg><circle r="1" onclick="alert(1)"/></svg>`],
  ["I-15 javascript: href", `<svg><a href="javascript:alert(1)"><circle r="1"/></a></svg>`],
  ["I-16 xlink:href بیرونی", `<svg><image xlink:href="https://evil.example/x.png"/></svg>`],
  ["I-17 href پروتکل‌نسبی", `<svg><image href="//evil.example/x.svg"/></svg>`],
  ["I-18 ENTITY / XXE", `<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg>&xxe;</svg>`],
  ["I-20 CSS @import", `<svg><style>@import url(https://evil.example/x.css);</style></svg>`],
  ["I-21 CSS expression", `<svg><style>width:expression(alert(1))</style></svg>`],
  ["I-22 url() بیرونی", `<svg><rect fill="url(https://evil.example/x)"/></svg>`],
  ["I-23 data URI غیر PNG", `<svg><image href="data:text/html;base64,PHNjcmlwdD4="/></svg>`],
  ["I-24 iframe", `<svg><iframe src="x"></iframe></svg>`],
  ["I-24b embed", `<svg><embed src="x"/></svg>`],
  ["I-24c object", `<svg><object data="x"></object></svg>`],
];

describe("analyzeSvg — SVG مخرب", () => {
  it.each(HOSTILE_SVGS)("%s رد می‌شود", (_name, source) => {
    expect(analyzeSvg(source).length).toBeGreaterThan(0);
  });

  it.each(HOSTILE_SVGS)("%s از validateIconFile هم عبور نمی‌کند", (_name, source) => {
    const bytes = svgBytes(source);
    expect(() => validateIconFile(svgMeta(bytes.length), bytes)).toThrowError(/غیرمجاز|SVG معتبر/);
  });
});

describe("analyzeSvg — SVG بی‌خطر", () => {
  it("I-25: SVG ساده هیچ یافته‌ای ندارد", () => {
    const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>`;
    expect(analyzeSvg(source)).toEqual([]);
  });

  it("I-25b: ارجاع داخلی به gradient مجاز است", () => {
    const source = `<svg><defs><linearGradient id="g"/></defs><rect fill="url(#g)"/><use href="#g"/></svg>`;
    expect(analyzeSvg(source)).toEqual([]);
  });

  it("I-25c: data URI از نوع PNG مجاز است", () => {
    const source = `<svg><image href="data:image/png;base64,iVBORw0KGgo="/></svg>`;
    expect(analyzeSvg(source)).toEqual([]);
  });

  it("I-26: کامنت باعث رد شدن نمی‌شود", () => {
    const source = `<svg><!-- یک کامنت بی‌خطر --><path d="M0 0"/></svg>`;
    expect(analyzeSvg(source)).toEqual([]);
  });

  it("I-25d: SVG بی‌خطر از validateIconFile عبور می‌کند", () => {
    const bytes = svgBytes(`<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>`);
    expect(validateIconFile(svgMeta(bytes.length), bytes)).toEqual({
      mimeType: "image/svg+xml",
      width: null,
      height: null,
    });
  });

  it("محتوایی که SVG نیست رد می‌شود", () => {
    const bytes = svgBytes("just plain text");
    expect(looksLikeSvg("just plain text")).toBe(false);
    expect(() => validateIconFile(svgMeta(bytes.length), bytes)).toThrowError(/SVG معتبر/);
  });
});

// ---------------------------------------------------------------------------

describe("resolveIcon", () => {
  const usable = new Set(["A", "B"]);

  it("I-27: آیکن خود موجودیت اولویت دارد", () => {
    expect(resolveIcon("A", "B", usable)).toBe("A");
  });

  it("I-28: در نبود آیکن موجودیت، آیکن نوع", () => {
    expect(resolveIcon(null, "B", usable)).toBe("B");
  });

  it("I-29: در نبود هر دو، پیش‌فرض داخلی", () => {
    expect(resolveIcon(null, null, usable)).toBeNull();
  });

  it("I-30: آیکن حذف‌شده موجودیت به آیکن نوع می‌افتد", () => {
    expect(resolveIcon("GONE", "B", usable)).toBe("B");
  });

  it("I-31: هر دو غیرقابل استفاده → پیش‌فرض", () => {
    expect(resolveIcon("GONE", "ALSO_GONE", usable)).toBeNull();
  });

  it("I-32: هرگز خطا نمی‌دهد", () => {
    expect(() => resolveIcon(undefined, undefined, new Set())).not.toThrow();
    expect(resolveIcon(undefined, undefined, new Set())).toBeNull();
  });
});

describe("validateIconName", () => {
  it("مرزهای طول", () => {
    expect(() => validateIconName("")).toThrow();
    expect(validateIconName(" کامیون ")).toBe("کامیون");
    expect(() => validateIconName("x".repeat(65))).toThrow();
  });
});
