/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

// رسومات الفيزياء التفاعلية: دوال ترسم SVG كنص من أرقام فقط (لا مدخلات نصية من المستخدم)
// كل درس: n العنوان، c المنزلقات [المفتاح، النص، أقل، أكبر، الخطوة، الافتراضي]، f الحساب والرسم، q سؤال تدريب
const fmt = (x, d = 2) => (+x).toFixed(d).replace(/\.?0+$/, "");
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const MU = 4e-7 * Math.PI;
let lv = 1;

export const setLabLevel = (n) => {
  lv = n;
};

const wire = (d, c = "w1") => `<path class="${c}" d="${d}"/>`;
const arrow = (x1, y1, x2, y2, c = "var(--ac)", w = 2.4) => {
  const a = Math.atan2(y2 - y1, x2 - x1),
    h = 8;
  return `<path d="M${x1} ${y1}L${x2} ${y2}M${x2} ${y2}l${-h * Math.cos(a - 0.5)} ${-h * Math.sin(a - 0.5)}M${x2} ${y2}l${-h * Math.cos(a + 0.5)} ${-h * Math.sin(a + 0.5)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
};
const resistor = (x, y, r = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-27" y="-10" width="54" height="20" class="bgc"/><path class="w1" d="M-26 0H-17L-12 -7L-6 7L0 -7L6 7L12 -7L17 0H26"/></g>`;
const gauge = (x, y, r, fr) =>
  `<path class="w1" d="M${x - r} ${y}A${r} ${r} 0 0 1 ${x + r} ${y}Z" fill="var(--sf)"/><path d="M${x} ${y}L${x + (r - 5) * Math.cos(Math.PI * (1 - fr))} ${y - (r - 5) * Math.sin(Math.PI * (1 - fr))}" stroke="var(--ac2)" stroke-width="2.4" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="3.5" fill="var(--tx)"/>`;

const drawWireField = (v, B) => {
  const px = v.d * 6.5,
    gx = (d) => 290 + d * 4,
    gy = (d) => 160 - 130 / d;
  let s = `<svg class="dg" viewBox="0 0 380 190">`;
  [26, 52, 78].forEach(
    (r) =>
      (s += `<circle cx="110" cy="95" r="${r}" fill="none" stroke="var(--bd)" stroke-width="1.5"/>`),
  );
  s += `<circle cx="110" cy="95" r="${px}" fill="none" stroke="var(--ac)" stroke-width="2"/><circle cx="110" cy="95" r="9" class="bgc" stroke="var(--tx)" stroke-width="1.8"/><circle cx="110" cy="95" r="2.5" fill="var(--tx)"/>${arrow(110 + px, 95, 110 + px, 61, "var(--ac2)")}<circle cx="${110 + px}" cy="95" r="4" fill="var(--tx)"/><text class="t" x="${118 + px}" y="75">B</text><text class="t" x="${116 + px}" y="112">d = ${v.d} cm</text><text class="m" x="14" y="184">التيار خارج من الصفحة فيدور المجال عكس عقارب الساعة</text>`;
  let p = "";
  for (let d = 1; d <= 20; d += 0.5) p += `${gx(d)},${gy(d)} `;
  return (
    s +
    wire("M290 160H374M290 160V24") +
    `<polyline points="${p}" fill="none" stroke="var(--mu)" stroke-width="1.6"/><circle cx="${gx(v.d)}" cy="${gy(v.d)}" r="5" fill="var(--ac2)"/><text class="m" x="352" y="176">d</text><text class="m" x="270" y="20">B ∝ 1/d</text></svg>`
  );
};
const drawCoil = (v, B) => {
  const ry = 8 + v.r * 4,
    L = 24 + (110 * B) / 0.0157;
  let s = `<svg class="dg" viewBox="0 0 380 190">`;
  for (let i = 0; i < Math.min(v.N, 6); i++)
    s += `<ellipse cx="${180 + i * 3}" cy="95" rx="9" ry="${ry}" fill="none" stroke="var(--tx)" stroke-width="2"/>`;
  return (
    s +
    arrow(190, 95, 190 + L, 95, "var(--ac2)", 3) +
    `<text class="t mc" x="152" y="95">S</text><text class="t" x="${198 + L}" y="90">N</text><text class="t" x="${190 + L / 2}" y="82">B</text><text class="m" x="14" y="184">نصف القطر r = ${v.r} cm ، عدد اللفات N = ${v.N} (يظهر منها 6 كحد أقصى)</text></svg>`
  );
};
const drawSolenoid = (v, B) => {
  const n = Math.max(2, Math.round(v.N / 50)),
    lp = v.l * 6,
    x0 = 190 - lp / 2;
  let s = `<svg class="dg" viewBox="0 0 380 170">`;
  for (let i = 0; i < n; i++)
    s += `<ellipse cx="${x0 + (i * lp) / (n - 1)}" cy="85" rx="7" ry="34" fill="none" stroke="var(--tx)" stroke-width="2"/>`;
  return (
    s +
    arrow(x0 - 14, 85, x0 + lp + 14, 85, "var(--ac2)", 1.5 + (B / 0.026) * 6) +
    `<text class="t mc" x="${x0 - 30}" y="85">S</text><text class="t mc" x="${x0 + lp + 30}" y="85">N</text>${wire(`M${x0} 135H${x0 + lp}M${x0} 130V140M${x0 + lp} 130V140`)}<text class="t mc" x="190" y="154">l = ${v.l} cm</text><text class="m" x="14" y="14">سُمك السهم يدل على B</text></svg>`
  );
};
const drawForce = (v, F) => {
  const a = (v.t * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a),
    rr = F < 0.05 ? 0 : 6 + (22 * F) / 50;
  let h = `<svg class="dg" viewBox="0 0 380 190">`;
  for (let y = 30; y <= 160; y += 26) h += arrow(20, y, 360, y, "var(--bd)", 1.5);
  h +=
    `<path d="M${190 - 75 * c} ${95 + 75 * s}L${190 + 75 * c} ${95 - 75 * s}" stroke="var(--tx)" stroke-width="7" stroke-linecap="round"/>` +
    arrow(190 - 50 * c - 10, 95 + 50 * s, 190 - 45 * c + 6, 95 + 45 * s - 8, "var(--ac)", 3);
  if (rr)
    h += `<circle cx="190" cy="95" r="${rr}" fill="var(--sf)" stroke="var(--ac2)" stroke-width="2.4"/><circle cx="190" cy="95" r="${Math.max(3, rr / 4)}" fill="var(--ac2)"/>`;
  return (
    h +
    `<path d="M258 95A68 68 0 0 ${s > 0 ? 0 : 1} ${190 + 68 * c} ${95 - 68 * s}" fill="none" stroke="var(--mu)" stroke-width="1.3"/><text class="t" x="270" y="${95 - s * 20 - 4}">θ = ${v.t}°</text><text class="t" x="20" y="22">B (خطوط الفيض)</text><text class="m" x="14" y="184">الدائرة = القوة F ، تعامد مستوى B والسلك ، ونصف قطرها يدل على قيمتها</text></svg>`
  );
};
const drawParallelWires = (v, Fl) => {
  const x1 = 190 - v.d * 3.2,
    x2 = 190 + v.d * 3.2,
    len = 8 + 70 * Math.sqrt(Fl / 0.008),
    o = v.D == 1,
    m = len,
    y = 95;
  let h =
    `<svg class="dg" viewBox="0 0 380 190">` +
    wire(`M${x1} 20V170M${x2} 20V170`, "w1") +
    arrow(x1, 150, x1, 110, "var(--ac)", 2.4) +
    (o ? arrow(x2, 110, x2, 150, "var(--ac)", 2.4) : arrow(x2, 150, x2, 110, "var(--ac)", 2.4));
  h +=
    arrow(x1, y, x1 + (o ? -m : m), y, "var(--ac2)", 3.2) +
    arrow(x2, y, x2 + (o ? m : -m), y, "var(--ac2)", 3.2);
  return (
    h +
    `<text class="t mc" x="${x1}" y="12">I₁ = ${v.I1}</text><text class="t mc" x="${x2}" y="12">I₂ = ${v.I2}</text>${wire(`M${x1} 176H${x2}`, "w1 d")}<text class="m mc" x="190" y="184">d = ${v.d} cm</text><text class="t mc" x="190" y="60">${o ? "تنافر" : "تجاذب"}</text></svg>`
  );
};
const drawTorque = (v, T) => {
  const a = (v.t * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  let h = `<svg class="dg" viewBox="0 0 380 190"><rect x="14" y="30" width="36" height="130" rx="6" fill="var(--soft)"/><rect x="330" y="30" width="36" height="130" rx="6" fill="var(--soft)"/><text class="t mc" x="32" y="95">N</text><text class="t mc" x="348" y="95">S</text>`;
  [55, 95, 135].forEach((y) => (h += arrow(56, y, 324, y, "var(--bd)", 1.6)));
  return (
    h +
    `<path d="M${190 - s * 62} ${95 - c * 62}L${190 + s * 62} ${95 + c * 62}" stroke="var(--tx)" stroke-width="6" stroke-linecap="round"/>` +
    arrow(190, 95, 190 + 66 * c, 95 - 66 * s, "var(--ac2)", 3) +
    `<text class="t" x="${196 + 66 * c}" y="${88 - 66 * s}">m_d</text><text class="t" x="226" y="106">θ = ${v.t}°</text><text class="m" x="14" y="184">المنظر من أعلى: الخط الغليظ هو الملف ، والسهم عمودي على مستواه</text></svg>`
  );
};
const drawAmmeter = (v, Rs, Is) =>
  `<svg class="dg" viewBox="0 0 380 190">${wire("M10 100H70V50H250V100H370M70 100V140H250V100")}${arrow(14, 88, 50, 88, "var(--ac)")}${gauge(160, 62, 24, 1)}<text class="t" x="160" y="26" text-anchor="middle">الجلفانومتر R_g = ${v.R} Ω ، I_g = ${v.g} mA</text>${resistor(160, 140)}<text class="t" x="160" y="168" text-anchor="middle">مجزئ التيار R_s = ${Rs < 0.1 ? fmt(Rs * 1000, 3) + " mΩ" : fmt(Rs, 3) + " Ω"} ، I_s = ${fmt(Is, 3)} A</text><text class="t" x="20" y="80">I = ${v.I} A</text></svg>`;
const drawVoltmeter = (v, Rm, Vg) =>
  `<svg class="dg" viewBox="0 0 380 190">${wire("M10 100H60M140 100H190M270 100H370")}${gauge(100, 100, 36, 1)}${resistor(230, 100)}<text class="t mc" x="100" y="46">R_g = ${v.R} Ω</text><text class="t mc" x="230" y="70">R_m = ${fmt(Rm, 1)} Ω</text>${wire("M64 128H136M64 123V133M136 123V133", "w1 d")}<text class="t mc" x="100" y="146">V_g = ${fmt(Vg * 1000, 2)} mV</text>${wire("M10 164H370M10 159V169M370 159V169", "w1 d")}<text class="t mc" x="190" y="180">V = ${v.V} V (أقصى جهد يقيسه)</text></svg>`;
const drawOhmmeter = (v, fr, I) => {
  const cx = 190,
    cy = 165,
    r = 130;
  let h = `<svg class="dg" viewBox="0 0 380 190"><path class="w1" d="M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}"/>`;
  [
    [1, "0"],
    [0.5, "3750"],
    [0.25, "11250"],
    [0, "∞"],
  ].forEach(([q, l]) => {
    const a = Math.PI * (1 - q),
      x = cx + r * Math.cos(a),
      y = cy - r * Math.sin(a);
    h += `<path class="w1" d="M${x} ${y}L${cx + (r - 10) * Math.cos(a)} ${cy - (r - 10) * Math.sin(a)}"/><text class="t mc" x="${cx + (r + 14) * Math.cos(a)}" y="${cy - (r + 14) * Math.sin(a)}">${l}</text>`;
  });
  const a = Math.PI * (1 - fr);
  return (
    h +
    `<path d="M${cx} ${cy}L${cx + (r - 14) * Math.cos(a)} ${cy - (r - 14) * Math.sin(a)}" stroke="var(--ac2)" stroke-width="3" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="5" fill="var(--tx)"/><text class="t mc" x="${cx}" y="${cy - 48}">R_x (Ω)</text><text class="m mc" x="${cx}" y="${cy + 16}">التيار ${fmt(I * 1e6, 1)} μA من أصل 400 μA</text></svg>`
  );
};

const currentFlow = (d, I, rev) =>
  `<path class="fl${rev ? " rv" : ""}" d="${d}" style="animation-duration:${Math.max(0.15, 3 / (I + 0.4))}s;animation-play-state:${I > 0 ? "running" : "paused"}"/>`;
const battery = (x, y, r = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-8" y="-14" width="16" height="28" class="bgc"/><path class="w1" d="M-4 -12V12M4 -6V6" style="stroke-width:3"/></g>`;
const meter = (x, y, l) =>
  `<circle cx="${x}" cy="${y}" r="12" class="bgc" stroke="var(--tx)" stroke-width="1.6"/><text class="t mc" x="${x}" y="${y}">${l}</text>`;
const materials = [
  ["نحاس", 1.7e-8, "#d98a3d", "1.7×10⁻⁸"],
  ["ألومنيوم", 2.8e-8, "#9aa5b8", "2.8×10⁻⁸"],
  ["حديد", 1e-7, "#6b778c", "1×10⁻⁷"],
  ["نيكروم", 1.1e-6, "#8a63d2", "1.1×10⁻⁶"],
];
const voltageBars = (a, mx) =>
  `<svg class="dg" viewBox="0 0 380 ${a.length * 28 + 6}">` +
  a
    .map((x, i) => {
      const w = Math.max(2, (Math.abs(x[1]) / (mx || 1)) * 180);
      return `<text class="t" x="2" y="${i * 28 + 18}">${x[0]}</text><rect x="140" y="${i * 28 + 5}" width="${w}" height="16" rx="5" fill="${x[2]}"/><text class="t" x="${146 + w}" y="${i * 28 + 18}">${fmt(x[1])} V</text>`;
    })
    .join("") +
  `</svg>`;
const drawOhmLaw = (v, I) => {
  const ie = Math.min(12, 24 / v.R),
    gx = (a) => 232 + a * 11.6,
    gy = (a) => 160 - a * 5.8,
    L = "M24 34H164V134H24Z";
  return `<svg class="dg" viewBox="0 0 380 190">${wire(L)}${currentFlow(L, I)}${battery(24, 84, 90)}${resistor(94, 34)}${meter(94, 134, "A")}${wire("M70 34V80H82M118 34V80H106", "w1 d")}${meter(94, 80, "V")}
<text class="t" x="34" y="88">${v.V} V</text><text class="t mc" x="94" y="18">R = ${v.R} Ω</text>
${wire("M232 160H374M232 160V16")}<text class="m" x="342" y="178">I (A)</text><text class="m" x="212" y="14">V</text>
<path d="M232 160L${gx(ie)} ${gy(v.R * ie)}" stroke="var(--ac)" stroke-width="2.4"/><circle cx="${gx(I)}" cy="${gy(v.V)}" r="5.5" fill="var(--ac2)"/><text class="m" x="240" y="34">ميل الخط = R</text></svg>`;
};
const drawResistance = (v, m) => {
  const w = 40 + v.L * 28,
    h = 10 + v.A * 6;
  return `<svg class="dg" viewBox="0 0 380 150"><rect x="30" y="${62 - h / 2}" width="${w}" height="${h}" rx="5" fill="${m[2]}"/>${wire(`M30 112H${30 + w}M30 106V118M${30 + w} 106V118`)}<text class="t" x="30" y="136">L = ${v.L} m</text><text class="t" x="30" y="18">${m[0]}  ρ = ${m[3]} Ω.m</text><text class="t" x="${Math.min(40 + w, 250)}" y="${62 - h / 2 - 6}">A = ${v.A} mm²</text></svg>`;
};
const drawSeries = (v, R, I, b) => {
  const L = "M24 40H356V160H24Z";
  let s = `<svg class="dg" viewBox="0 0 380 200">${wire(L)}${currentFlow(L, I)}${battery(24, 100, 90)}${meter(66, 40, "A")}<text class="t" x="34" y="104">${v.V} V</text>`;
  R.forEach((r, i) => {
    const x = 130 + i * 85;
    s +=
      resistor(x, 40) +
      `<text class="t mc" x="${x}" y="22">R${i + 1} = ${r} Ω</text>` +
      wire(`M${x - 24} 40V92H${x - 12}M${x + 24} 40V92H${x + 12}`, "w1 d") +
      meter(x, 92, "V") +
      `<text class="t mc" x="${x}" y="120">${fmt(b[i])} V</text>`;
  });
  return (
    s +
    `<text class="m mc" x="190" y="186">التيار نفسه ${fmt(I)} A في كل نقطة، والجهد يتجزأ</text></svg>`
  );
};
const drawParallel = (v, R, I, b) => {
  const L = "M24 40H330V190H24Z";
  let s = `<svg class="dg" viewBox="0 0 380 210">${wire(L)}${currentFlow(L, I)}`;
  R.forEach((r, i) => {
    const x = 110 + i * 80;
    s +=
      currentFlow(`M${x} 40V190`, b[i]) +
      resistor(x, 135, 90) +
      meter(x, 78, "A") +
      `<text class="t" x="${x + 14}" y="82">I${i + 1}=${fmt(b[i])}</text><text class="t" x="${x + 14}" y="139">${r} Ω</text>`;
  });
  return (
    s +
    battery(24, 115, 90) +
    `<text class="t" x="34" y="119">${v.V} V</text>` +
    meter(62, 40, "A") +
    wire("M330 40H356V103M356 127V190H330", "w1 d") +
    meter(356, 115, "V") +
    `<text class="t mc" x="190" y="24">التيار الكلي ${fmt(I)} A</text></svg>`
  );
};
const drawClosedCircuit = (v, I, Vt) => {
  const L = "M24 34H356V150H24Z";
  return `<svg class="dg" viewBox="0 0 380 180">${wire(L)}${currentFlow(L, I)}${battery(24, 66, 90)}${resistor(24, 112, 90)}<text class="t" x="36" y="70">V_B = ${v.E} V</text><text class="t" x="38" y="116">r = ${v.r} Ω</text>
${wire("M96 34V80M96 150V104", "w1 d")}${meter(96, 92, "V")}<text class="t" x="110" y="96">${fmt(Vt)} V</text>${meter(190, 34, "A")}<text class="t mc" x="190" y="18">I = ${fmt(I)} A</text>${resistor(300, 34)}<text class="t mc" x="300" y="18">R = ${v.R} Ω</text></svg>`;
};
const drawKirchhoff1 = (v, i4) => {
  const w = (a) => 2 + Math.abs(a) * 1.6,
    P = (y, a) =>
      `<path d="M20 ${y}L190 95" stroke="var(--ac)" stroke-width="${w(a)}" stroke-linecap="round"/>`;
  return `<svg class="dg" viewBox="0 0 380 190">${P(40, v.I1)}${P(150, v.I2)}<path d="M190 95L360 40" stroke="var(--ac2)" stroke-width="${w(v.I3)}" stroke-linecap="round"/><path d="M190 95L360 150" stroke="var(--ac2)" stroke-width="${w(i4)}" stroke-linecap="round"/><circle cx="190" cy="95" r="8" fill="var(--tx)"/>${meter(105, 67, "A")}${meter(105, 122, "A")}${meter(275, 67, "A")}${meter(275, 122, "A")}
<text class="t" x="20" y="28">I₁ = ${v.I1} A (داخل)</text><text class="t" x="20" y="180">I₂ = ${v.I2} A (داخل)</text><text class="t" x="250" y="28">I₃ = ${v.I3} A (خارج)</text><text class="t" x="250" y="180">I₄ = ${fmt(i4)} A (خارج)</text></svg>`;
};
const drawKirchhoff2 = (v, I, d) => {
  const L = "M40 40H340V140H40Z";
  return `<svg class="dg" viewBox="0 0 380 180">${wire(L)}${currentFlow(L, I, d < 0)}${battery(40, 90, 90)}${battery(340, 90, -90)}${resistor(190, 40)}${meter(190, 140, "A")}<text class="t" x="52" y="94">E₁ = ${v.a} V</text><text class="t" x="328" y="94" text-anchor="end">E₂ = ${v.b} V</text><text class="t mc" x="190" y="22">R = ${v.R} Ω</text><text class="m mc" x="190" y="168">${d == 0 ? "القوتان متساويتان: لا يمر تيار" : d > 0 ? "اتجاه التيار مع E₁ (مع عقارب الساعة)" : "اتجاه التيار مع E₂ (عكس عقارب الساعة)"}</text></svg>`;
};
const network = (v, p) => {
  const R = [v.a, v.b, v.c],
    Re = p ? 1 / R.reduce((x, r) => x + 1 / r, 0) : R.reduce((x, y) => x + y),
    I = v.V / Re,
    b = p ? R.map((r) => v.V / r) : R.map((r) => I * r);
  return {
    o: [
      ["المقاومة المكافئة", fmt(Re), "Ω"],
      ["الأميتر الرئيسي", fmt(I), "A"],
      ["الفولتميتر", v.V, "V"],
    ],
    s: p
      ? `1/R′ = ${R.map((r) => "1/" + r).join(" + ")} → R′ = ${fmt(Re)} Ω ، I = ${v.V} ÷ ${fmt(Re)} = ${fmt(I)} A`
      : `R′ = ${R.join(" + ")} = ${fmt(Re)} Ω ، I = ${v.V} ÷ ${fmt(Re)} = ${fmt(I)} A`,
    g: p ? drawParallel(v, R, I, b) : drawSeries(v, R, I, b),
  };
};
const threeResistors = [
  ["V", "فرق جهد المصدر (فولت)", 1, 24, 1, 12],
  ["a", "R₁ (أوم)", 1, 20, 1, 4],
  ["b", "R₂ (أوم)", 1, 20, 1, 6],
  ["c", "R₃ (أوم)", 1, 20, 1, 12],
];

// الدروس: كل فصل له قائمة، وكل درس فيه ic الأيقونة و n العنوان و pg الصفحات و e الشرح
// و fm القانون و c المنزلقات و f الحساب والرسم و q سؤال التدريب
const PACKS = [
  {
    n: "الفصل الأول: التيار الكهربي وقانونا أوم وكيرشوف",
    L: [
      {
        ic: "ohm",
        n: "قانون أوم",
        pg: "ص 3–4",
        fm: "V = I R",
        e: "عند ثبوت درجة الحرارة يتناسب التيار المار في موصل طرديًا مع فرق الجهد بين طرفيه. ثابت التناسب هو مقلوب المقاومة، ولهذا يكون ميل خط V–I مساويًا لـ R.",
        t: "ثبّت V وزد R: يقل التيار وينخفض ميل الخط. القراءة تظهر على الأميتر والفولتميتر.",
        c: [
          ["V", "فرق الجهد V (فولت)", 0, 24, 1, 12],
          ["R", "المقاومة R (أوم)", 2, 20, 1, 6],
        ],
        f: (v) => {
          const I = v.V / v.R;
          return {
            o: [
              ["الأميتر", fmt(I), "A"],
              ["الفولتميتر", v.V, "V"],
            ],
            s: `I = V ÷ R = ${v.V} ÷ ${v.R} = ${fmt(I)} A`,
            g: drawOhmLaw(v, I),
          };
        },
        q: () => {
          const R = randInt(2, lv > 1 ? 15 : 8),
            I = randInt(1, lv > 1 ? 6 : 3);
          return [`مقاومة ${R} Ω يمر بها تيار ${I} A. احسب فرق الجهد بين طرفيها (V).`, R * I];
        },
      },
      {
        ic: "res",
        n: "مقاومة الموصل",
        pg: "ص 3–4",
        fm: "R = ρ L / A     σ = 1 / ρ",
        e: "مقاومة السلك تزيد مع طوله وتقل مع اتساع مقطعه، وتتحدد أيضًا بمادته عبر المقاومة النوعية ρ. التوصيلية σ هي مقلوب ρ، فكلما قلّت ρ زادت قدرة المادة على التوصيل.",
        t: "ضاعف الطول ثم ضاعف المساحة وقارن التغير في R، ثم بدّل المادة.",
        c: [
          ["L", "الطول L (متر)", 1, 10, 0.5, 2],
          ["A", "مساحة المقطع A (mm²)", 0.5, 5, 0.5, 1],
          ["M", "المادة (0 نحاس، 1 ألومنيوم، 2 حديد، 3 نيكروم)", 0, 3, 1, 0],
        ],
        f: (v) => {
          const m = materials[v.M],
            R = (m[1] * v.L) / (v.A * 1e-6);
          return {
            o: [
              ["المقاومة R", fmt(R, 3), "Ω"],
              ["المادة", m[0], ""],
              ["التوصيلية σ", fmt(1 / m[1] / 1e6, 2), "×10⁶ Ω⁻¹m⁻¹"],
            ],
            s: `R = ρL ÷ A = ${m[1].toExponential(1)} × ${v.L} ÷ (${v.A}×10⁻⁶) = ${fmt(R, 3)} Ω`,
            g: drawResistance(v, m),
          };
        },
        q: () => {
          const l = randInt(1, lv > 1 ? 9 : 5),
            a = randInt(1, lv > 1 ? 5 : 3);
          return [
            `سلك نحاس (ρ = 1.7×10⁻⁸ Ω.m) طوله ${l} m ومساحة مقطعه ${a} mm². احسب مقاومته (Ω).`,
            (1.7e-8 * l) / (a * 1e-6),
          ];
        },
      },
      {
        ic: "ser",
        n: "التوصيل على التوالي",
        pg: "ص 4–5",
        fm: "R′ = R₁ + R₂ + R₃",
        e: "تتصل المقاومات طرفًا بطرف فيمر فيها التيار نفسه، وينقسم فرق جهد المصدر بينها بنسب قيمها. المقاومة المكافئة أكبر من أكبر مقاومة في المجموعة، وإن تساوت N مقاومات قيمة كل منها R فإن R′ = N R.",
        t: "غيّر R₁ وراقب أي فولتميتر يتأثر: الأميتر ثابت، والجهد يتوزع.",
        c: threeResistors,
        f: (v) => network(v, false),
        q: () => {
          const a = randInt(1, 6),
            b = randInt(1, 6),
            c = randInt(1, 6),
            I = randInt(1, lv > 1 ? 4 : 2);
          return [
            `ثلاث مقاومات ${a} Ω و${b} Ω و${c} Ω على التوالي مع مصدر ${I * (a + b + c)} V (مقاومته الداخلية مهملة). احسب شدة التيار (A).`,
            I,
          ];
        },
      },
      {
        ic: "par",
        n: "التوصيل على التوازي",
        pg: "ص 6–7",
        fm: "1/R′ = 1/R₁ + 1/R₂ + 1/R₃",
        e: "تتصل بدايات المقاومات معًا ونهاياتها معًا، فيكون فرق الجهد نفسه على كل فرع، وينقسم التيار الكلي بحسب القيم: الجزء الأكبر في أصغر مقاومة. المقاومة المكافئة أقل من أصغر مقاومة، وإن تساوت N مقاومات فإن R′ = R ÷ N.",
        t: "صغّر R₁ وراقب كيف يزيد تياره، وكيف تنخفض المقاومة المكافئة.",
        c: threeResistors,
        f: (v) => network(v, true),
        q: () => {
          const a = randInt(2, lv > 1 ? 30 : 12),
            b = randInt(2, lv > 1 ? 30 : 12);
          return [
            `مقاومتان ${a} Ω و${b} Ω على التوازي. احسب المقاومة المكافئة (Ω).`,
            (a * b) / (a + b),
          ];
        },
      },
      {
        ic: "bat",
        n: "الدائرة المغلقة",
        pg: "ص 8–9",
        fm: "I = V_B / (R + r)     V = V_B − I r",
        e: "للبطارية مقاومة داخلية r، فيضيع جزء من قوتها الدافعة داخلها. لذلك يكون فرق الجهد بين قطبيها أقل من V_B بمقدار I·r، ولا يساوي V_B إلا إذا لم يمر تيار.",
        t: "زد r وانظر كيف يقل جهد القطبين، ثم زد R ليقل التيار ويقترب الجهد من V_B.",
        c: [
          ["E", "القوة الدافعة V_B (فولت)", 1, 24, 1, 12],
          ["r", "المقاومة الداخلية r (أوم)", 0, 5, 0.5, 1],
          ["R", "المقاومة الخارجية R (أوم)", 1, 20, 1, 5],
        ],
        f: (v) => {
          const I = v.E / (v.R + v.r),
            Ir = I * v.r,
            Vt = v.E - Ir;
          return {
            o: [
              ["الأميتر", fmt(I), "A"],
              ["جهد القطبين", fmt(Vt), "V"],
              ["الفقد الداخلي I·r", fmt(Ir), "V"],
            ],
            s: `I = ${v.E} ÷ (${v.R} + ${v.r}) = ${fmt(I)} A ، V = ${v.E} − ${fmt(I)}×${v.r} = ${fmt(Vt)} V`,
            g:
              drawClosedCircuit(v, I, Vt) +
              voltageBars(
                [
                  ["V_B", v.E, "var(--ok)"],
                  ["الفقد I·r", Ir, "var(--bad)"],
                  ["جهد القطبين", Vt, "var(--ac)"],
                ],
                v.E,
              ),
          };
        },
        q: () => {
          const r = randInt(1, 2),
            R = randInt(2, lv > 1 ? 9 : 5),
            I = randInt(1, lv > 1 ? 5 : 3);
          return [
            `بطارية مقاومتها الداخلية ${r} Ω وقوتها الدافعة ${I * (R + r)} V متصلة بمقاومة ${R} Ω. احسب شدة التيار (A).`,
            I,
          ];
        },
      },
      {
        ic: "node",
        n: "قانون كيرشوف الأول",
        pg: "ص 13",
        fm: "ΣI = 0     ΣI(داخل) = ΣI(خارج)",
        e: "الشحنة لا تتراكم عند نقطة تفرع، فكل ما يدخلها من تيار يخرج منها. ولذلك يساوي مجموع التيارات الداخلة إلى العقدة مجموع التيارات الخارجة منها.",
        t: "غيّر I₁ وI₂ وI₃ وشاهد التيار المجهول I₄ يتغير ليحفظ التوازن.",
        c: [
          ["I1", "I₁ داخل (A)", 0, 10, 1, 3],
          ["I2", "I₂ داخل (A)", 0, 10, 1, 2],
          ["I3", "I₃ خارج (A)", 0, 10, 1, 1],
        ],
        f: (v) => {
          const i4 = v.I1 + v.I2 - v.I3;
          return {
            o: [
              ["I₄ المجهول", fmt(i4), "A"],
              ["الداخل", fmt(v.I1 + v.I2), "A"],
              ["الخارج", fmt(v.I3 + i4), "A"],
            ],
            s:
              i4 < 0
                ? "I₄ سالب: يعني أن اتجاهه الفعلي داخل العقدة. قلّل I₃ لترى القيمة الموجبة."
                : `I₁ + I₂ = I₃ + I₄ → ${v.I1} + ${v.I2} = ${v.I3} + I₄ → I₄ = ${fmt(i4)} A`,
            g: drawKirchhoff1(v, i4),
          };
        },
        q: () => {
          const a = randInt(1, lv > 1 ? 9 : 5),
            b = randInt(1, lv > 1 ? 9 : 5),
            c = randInt(0, a + b - 1);
          return [
            `عند عقدة يدخل تياران ${a} A و${b} A، ويخرج تيار ${c} A وتيار مجهول. احسب التيار المجهول (A).`,
            a + b - c,
          ];
        },
      },
      {
        ic: "loop",
        n: "قانون كيرشوف الثاني",
        pg: "ص 13–14",
        fm: "ΣV_B = ΣI·R",
        e: "في أي مسار مغلق يساوي المجموع الجبري للقوى الدافعة المجموع الجبري لفروق الجهد I·R. نفترض اتجاهًا للتيار؛ فإن خرجت قيمته سالبة فاتجاهه الفعلي عكس المفروض.",
        t: "اجعل E₂ أكبر من E₁ فينعكس التيار، ثم ساوِ بينهما فيختفي.",
        c: [
          ["a", "E₁ (فولت)", 0, 24, 1, 12],
          ["b", "E₂ معاكسة (فولت)", 0, 24, 1, 6],
          ["R", "مجموع المقاومات R (أوم)", 1, 10, 1, 3],
        ],
        f: (v) => {
          const d = v.a - v.b,
            I = Math.abs(d) / v.R;
          return {
            o: [
              ["شدة التيار", fmt(I), "A"],
              ["الفرق E₁ − E₂", d, "V"],
            ],
            s: `ΣV_B = ΣI·R → ${v.a} − ${v.b} = I × ${v.R} → I = ${fmt(d / v.R)} A`,
            g: drawKirchhoff2(v, I, d),
          };
        },
        q: () => {
          const I = randInt(1, lv > 1 ? 6 : 4),
            R = randInt(2, 6),
            b = randInt(2, 10);
          return [
            `حلقة فيها بطاريتان متعاكستان ${b + I * R} V و${b} V ومجموع المقاومات ${R} Ω. احسب شدة التيار (A).`,
            I,
          ];
        },
      },
    ],
  },
  {
    n: "الفصل الثاني: التأثير المغناطيسي للتيار وأجهزة القياس",
    L: [
      {
        ic: "wf",
        n: "المجال حول سلك مستقيم",
        pg: "ص 26–27",
        fm: "B = μ I / (2π d)",
        e: "يتولد حول السلك مجال مغناطيسي خطوط فيضه دوائر مركزها السلك. تزداد كثافة الفيض بزيادة التيار وتقل بالابتعاد عن السلك. لتعيين الاتجاه اقبض السلك باليد اليمنى بحيث يشير الإبهام لاتجاه التيار، فتدل الأصابع الملتفة على اتجاه المجال.",
        t: "ابعد عن السلك وراقب النقطة على المنحنى: B تتناسب عكسيًا مع d.",
        c: [
          ["I", "شدة التيار I (أمبير)", 1, 50, 1, 10],
          ["d", "البعد d (سم)", 1, 20, 1, 10],
        ],
        f: (v) => {
          const B = (MU * v.I) / ((2 * Math.PI * v.d) / 100);
          return {
            o: [
              ["كثافة الفيض B", fmt(B * 1e6, 2), "μT"],
              ["بالتسلا", B.toExponential(2), "T"],
            ],
            s: `B = μI ÷ 2πd = 4π×10⁻⁷ × ${v.I} ÷ (2π × ${v.d / 100}) = ${fmt(B * 1e6, 2)} μT`,
            g: drawWireField(v, B),
          };
        },
        q: () => {
          const I = randInt(2, 20),
            d = randInt(5, 40);
          return [
            `سلك مستقيم طويل يمر به تيار ${I} A. احسب كثافة الفيض عند نقطة تبعد ${d} cm عنه في الهواء (μ = 4π×10⁻⁷). الإجابة بوحدة μT.`,
            ((MU * I) / ((2 * Math.PI * d) / 100)) * 1e6,
          ];
        },
      },
      {
        ic: "cl",
        n: "المجال في مركز ملف دائري",
        pg: "ص 28–30",
        fm: "B = μ N I / (2 r)",
        e: "المجال الناتج عن ملف دائري يشبه مجال مغناطيس قصير. تتناسب كثافة الفيض عند مركزه طرديًا مع عدد اللفات وشدة التيار، وعكسيًا مع نصف القطر. تحدد قاعدة البريمة اليمنى القطبية: الوجه الذي يبدو التيار عنده عكس عقارب الساعة هو الشمالي.",
        t: "صغّر نصف القطر وزد عدد اللفات: كيف يتغير طول سهم المجال؟",
        c: [
          ["N", "عدد اللفات N", 1, 50, 1, 20],
          ["I", "شدة التيار I (أمبير)", 0.1, 10, 0.1, 1.4],
          ["r", "نصف القطر r (سم)", 2, 20, 1, 11],
        ],
        f: (v) => {
          const B = (MU * v.N * v.I) / ((2 * v.r) / 100);
          return {
            o: [
              ["كثافة الفيض B", fmt(B * 1e6, 1), "μT"],
              ["بالتسلا", B.toExponential(2), "T"],
            ],
            s: `B = μNI ÷ 2r = 4π×10⁻⁷ × ${v.N} × ${v.I} ÷ (2 × ${v.r / 100}) = ${fmt(B * 1e6, 1)} μT`,
            g: drawCoil(v, B),
          };
        },
        q: () => {
          const N = randInt(5, 40),
            I = randInt(1, 8),
            r = randInt(5, 20);
          return [
            `ملف دائري عدد لفاته ${N} ونصف قطره ${r} cm ويمر به تيار ${I} A. احسب كثافة الفيض عند مركزه (μ = 4π×10⁻⁷). الإجابة بوحدة μT.`,
            ((MU * N * I) / ((2 * r) / 100)) * 1e6,
          ];
        },
      },
      {
        ic: "sl",
        n: "المجال داخل ملف لولبي",
        pg: "ص 30–32",
        fm: "B = μ N I / l = μ n I",
        e: "الملف اللولبي لفات متتالية يشبه مجاله مجال مغناطيس قضيبي، وهو منتظم داخله. تتوقف كثافة الفيض على شدة التيار وعدد اللفات في وحدة الأطوال n = N/l، وتزداد كثيرًا عند وضع قلب من الحديد داخله لأن نفاذيته أكبر من الهواء. تحدد قطبيته بقاعدة اليد اليمنى.",
        t: "قصّر الطول مع ثبات عدد اللفات: تتركز اللفات وتزداد B.",
        c: [
          ["N", "عدد اللفات N", 100, 1000, 50, 800],
          ["I", "شدة التيار I (أمبير)", 0.1, 2, 0.05, 0.7],
          ["l", "الطول l (سم)", 10, 40, 1, 20],
        ],
        f: (v) => {
          const B = (MU * v.N * v.I) / (v.l / 100);
          return {
            o: [
              ["كثافة الفيض B", fmt(B * 1e3, 2), "mT"],
              ["لفات لكل متر n", fmt(v.N / (v.l / 100), 0), "لفة/م"],
            ],
            s: `B = μNI ÷ l = 4π×10⁻⁷ × ${v.N} × ${v.I} ÷ ${v.l / 100} = ${fmt(B * 1e3, 2)} mT`,
            g: drawSolenoid(v, B),
          };
        },
        q: () => {
          const N = randInt(2, 10) * 100,
            I = randInt(1, 10) / 5,
            l = randInt(10, 40);
          return [
            `ملف لولبي عدد لفاته ${N} وطوله ${l} cm ويمر به تيار ${I} A. احسب كثافة الفيض داخله على محوره في الهواء. الإجابة بوحدة mT.`,
            ((MU * N * I) / (l / 100)) * 1e3,
          ];
        },
      },
      {
        ic: "fo",
        n: "القوة على سلك في مجال",
        pg: "ص 33–36",
        fm: "F = B I L sin θ",
        e: "السلك الذي يحمل تيارًا داخل مجال مغناطيسي تؤثر عليه قوة عمودية على كل من السلك والمجال. تزداد بزيادة B وI وطول السلك وجيب زاوية الميل، وتنعدم إذا كان السلك موازيًا للمجال. اتجاهها بقاعدة اليد اليسرى لفلمنج: السبابة للفيض والوسطى للتيار والإبهام للقوة. التسلا: كثافة الفيض التي تولد قوة نيوتن على متر من سلك يمر به أمبير.",
        t: "اجعل θ = 0 فتنعدم القوة، ثم θ = 90 فتبلغ أقصاها.",
        c: [
          ["B", "كثافة الفيض B (تسلا)", 0.5, 5, 0.5, 5],
          ["I", "شدة التيار I (أمبير)", 1, 10, 1, 4],
          ["L", "طول السلك L (متر)", 0.1, 1, 0.1, 0.3],
          ["t", "الزاوية θ (درجة)", 0, 90, 5, 90],
        ],
        f: (v) => {
          const F = v.B * v.I * v.L * Math.sin((v.t * Math.PI) / 180);
          return {
            o: [
              ["القوة F", fmt(F, 3), "N"],
              ["المركبة B⊥ = B sin θ", fmt(v.B * Math.sin((v.t * Math.PI) / 180), 2), "T"],
            ],
            s: `F = B I L sin θ = ${v.B} × ${v.I} × ${v.L} × sin ${v.t}° = ${fmt(F, 3)} N`,
            g: drawForce(v, F),
          };
        },
        q: () => {
          const B = randInt(1, 6),
            I = randInt(1, 8),
            L = randInt(1, 6) / 10,
            t = [30, 90, 90, 30][randInt(0, 3)];
          return [
            `سلك طوله ${L} m يمر به تيار ${I} A في مجال كثافته ${B} T، والزاوية بين السلك والمجال ${t}°. احسب القوة المؤثرة عليه بالنيوتن.`,
            B * I * L * Math.sin((t * Math.PI) / 180),
          ];
        },
      },
      {
        ic: "pw",
        n: "القوة بين سلكين متوازيين",
        pg: "ص 35–36",
        fm: "F / L = μ I₁ I₂ / (2π d)",
        e: "السلك الذي يحمل تيارًا يولد مجالًا يؤثر بقوة على سلك مجاور يحمل تيارًا. إذا كان التياران في الاتجاه نفسه تجاذب السلكان، وإذا تضادا تنافرا. تزداد القوة بزيادة التيارين وتقل بزيادة المسافة بينهما.",
        t: "بدّل اتجاه التيارين (0 أو 1) وراقب انعكاس القوة، ثم قرّب السلكين.",
        c: [
          ["I1", "التيار I₁ (أمبير)", 1, 20, 1, 10],
          ["I2", "التيار I₂ (أمبير)", 1, 20, 1, 10],
          ["d", "المسافة d (سم)", 1, 20, 1, 5],
          ["D", "الاتجاه (0 نفسه، 1 متضاد)", 0, 1, 1, 0],
        ],
        f: (v) => {
          const Fl = ((MU / (2 * Math.PI)) * v.I1 * v.I2) / (v.d / 100);
          return {
            o: [
              ["القوة لكل متر", fmt(Fl * 1e3, 3), "mN/m"],
              ["نوع القوة", v.D == 1 ? "تنافر" : "تجاذب", ""],
            ],
            s: `F/L = μI₁I₂ ÷ 2πd = 2×10⁻⁷ × ${v.I1} × ${v.I2} ÷ ${v.d / 100} = ${fmt(Fl * 1e3, 3)} mN/m`,
            g: drawParallelWires(v, Fl),
          };
        },
        q: () => {
          const a = randInt(2, 20),
            b = randInt(2, 20),
            d = randInt(2, 20);
          return [
            `سلكان متوازيان يمر بهما تياران ${a} A و${b} A والمسافة بينهما ${d} cm في الهواء. احسب القوة المتبادلة لكل متر من الطول. الإجابة بوحدة mN/m.`,
            (((MU / (2 * Math.PI)) * a * b) / (d / 100)) * 1e3,
          ];
        },
      },
      {
        ic: "tq",
        n: "عزم الازدواج على ملف",
        pg: "ص 36–38",
        fm: "τ = B I A N sin θ     m_d = I A N",
        e: "الملف المستطيل الذي يحمل تيارًا في مجال منتظم تؤثر عليه قوتان متساويتان متضادتان تكوّنان ازدواجًا يديره. θ هي الزاوية بين العمودي على مستوى الملف (اتجاه عزم ثنائي القطب m_d) وخطوط الفيض. ينعدم العزم عندما يكون مستوى الملف عموديًا على الفيض، ويبلغ أقصاه عندما يوازيه. على هذه الفكرة تعمل أجهزة القياس والمحرك الكهربي.",
        t: "اجعل θ = 0 فيكون الملف عموديًا على الفيض ويتلاشى العزم.",
        c: [
          ["B", "كثافة الفيض B (تسلا)", 0.1, 2, 0.1, 1],
          ["I", "شدة التيار I (أمبير)", 0.1, 5, 0.1, 2],
          ["N", "عدد اللفات N", 1, 100, 1, 20],
          ["A", "مساحة الملف A (سم²)", 10, 100, 5, 50],
          ["t", "الزاوية θ (درجة)", 0, 90, 5, 60],
        ],
        f: (v) => {
          const md = v.I * v.A * 1e-4 * v.N,
            T = v.B * md * Math.sin((v.t * Math.PI) / 180);
          return {
            o: [
              ["العزم τ", fmt(T * 1e3, 2), "mN·m"],
              ["عزم ثنائي القطب m_d", fmt(md, 3), "A·m²"],
            ],
            s: `τ = B I A N sin θ = ${v.B} × ${v.I} × ${v.A * 1e-4} × ${v.N} × sin ${v.t}° = ${fmt(T * 1e3, 2)} mN·m`,
            g: drawTorque(v, T),
          };
        },
        q: () => {
          const B = randInt(1, 10) / 10,
            I = randInt(1, 5),
            N = randInt(10, 100),
            A = randInt(2, 10) * 10,
            t = [30, 60, 90][randInt(0, 2)];
          return [
            `ملف عدد لفاته ${N} ومساحته ${A} cm² يمر به تيار ${I} A في مجال ${B} T، والزاوية بين العمودي على مستواه والمجال ${t}°. احسب عزم الازدواج بوحدة mN·m.`,
            B * I * A * 1e-4 * N * Math.sin((t * Math.PI) / 180) * 1e3,
          ];
        },
      },
      {
        ic: "am",
        n: "تحويل الجلفانومتر إلى أميتر",
        pg: "ص 39–41",
        fm: "R_s = I_g R_g / (I − I_g)",
        e: "الجلفانومتر ذو الملف المتحرك جهاز حساس يدل على التيارات الضعيفة جدًا ويحدد اتجاهها، وحساسيته هي انحراف المؤشر لكل وحدة تيار (درجة لكل ميكرو أمبير). لتحويله إلى أميتر نوصل بملفه على التوازي مقاومة صغيرة جدًا هي مجزئ التيار R_s، فيمر معظم التيار فيها ويمر في الملف I_g فقط عند نهاية التدريج. ولأن مقاومة الأميتر صغيرة لا يؤثر في الدائرة عند توصيله على التوالي.",
        t: "ارفع أقصى تيار I: يصغر R_s أكثر لأن الجزء الأكبر من التيار يجب أن يمر فيه.",
        c: [
          ["g", "تيار نهاية التدريج I_g (mA)", 1, 50, 1, 5],
          ["R", "مقاومة الملف R_g (أوم)", 0.5, 50, 0.5, 2],
          ["I", "أقصى تيار مطلوب I (أمبير)", 0.1, 10, 0.1, 10],
        ],
        f: (v) => {
          const Ig = v.g / 1000,
            Is = v.I - Ig,
            Rs = (Ig * v.R) / Is;
          return {
            o: [
              ["مجزئ التيار R_s", Rs < 0.1 ? fmt(Rs * 1000, 3) : fmt(Rs, 3), Rs < 0.1 ? "mΩ" : "Ω"],
              ["التيار في المجزئ I_s", fmt(Is, 3), "A"],
              ["مقاومة الأميتر", fmt(((Rs * v.R) / (Rs + v.R)) * 1000, 3), "mΩ"],
            ],
            s: `R_s = I_g R_g ÷ (I − I_g) = ${Ig} × ${v.R} ÷ (${v.I} − ${Ig}) = ${fmt(Rs * 1000, 3)} mΩ`,
            g: drawAmmeter(v, Rs, Is),
          };
        },
        q: () => {
          const g = randInt(1, 10),
            R = randInt(1, 20),
            I = randInt(1, 10);
          return [
            `جلفانومتر مقاومة ملفه ${R} Ω وتيار نهاية تدريجه ${g} mA. احسب مقاومة مجزئ التيار لتحويله إلى أميتر نهايته العظمى ${I} A. الإجابة بوحدة mΩ.`,
            (((g / 1000) * R) / (I - g / 1000)) * 1000,
          ];
        },
      },
      {
        ic: "vm",
        n: "تحويل الجلفانومتر إلى فولتميتر",
        pg: "ص 42–43",
        fm: "R_m = (V − V_g) / I_g     V_g = I_g R_g",
        e: "الفولتميتر يقيس فرق الجهد بين نقطتين فيوصل على التوازي مع الجزء المراد قياسه، ولا يجب أن يسحب تيارًا ملحوظًا. لذلك نوصل بملف الجلفانومتر على التوالي مقاومة كبيرة جدًا تسمى المقاومة المضاعفة R_m. أقصى تيار في الملف I_g، والجهد الكلي ينقسم بين الملف والمضاعف.",
        t: "ارفع أقصى جهد V: تكبر R_m لأن الجهد الزائد كله يقع عليها تقريبًا.",
        c: [
          ["g", "تيار نهاية التدريج I_g (mA)", 0.1, 5, 0.1, 1],
          ["R", "مقاومة الملف R_g (أوم)", 0.1, 100, 0.1, 0.1],
          ["V", "أقصى جهد V (فولت)", 5, 100, 1, 50],
        ],
        f: (v) => {
          const Ig = v.g / 1000,
            Vg = Ig * v.R,
            Rm = (v.V - Vg) / Ig;
          return {
            o: [
              ["المقاومة المضاعفة R_m", fmt(Rm, 1), "Ω"],
              ["جهد الملف V_g", fmt(Vg * 1000, 2), "mV"],
              ["مقاومة الفولتميتر", fmt(Rm + v.R, 1), "Ω"],
            ],
            s: `R_m = (V − I_g R_g) ÷ I_g = (${v.V} − ${fmt(Vg, 4)}) ÷ ${Ig} = ${fmt(Rm, 1)} Ω`,
            g: drawVoltmeter(v, Rm, Vg),
          };
        },
        q: () => {
          const g = randInt(1, 5),
            R = randInt(1, 50),
            V = randInt(1, 10) * 10;
          return [
            `جلفانومتر مقاومة ملفه ${R} Ω وأقصى تيار فيه ${g} mA. احسب المقاومة المضاعفة اللازمة لتحويله إلى فولتميتر نهايته العظمى ${V} V. الإجابة بوحدة Ω.`,
            (V - (g / 1000) * R) / (g / 1000),
          ];
        },
      },
      {
        ic: "om",
        n: "الأوميتر",
        pg: "ص 44–45",
        fm: "I = V_B / (R_int + R_x)",
        e: "الأوميتر ميكرو أميتر موصول على التوالي مع مقاومة ثابتة وأخرى متغيرة وعمود جاف. عند تلامس الطرفين (R_x = 0) تضبط المقاومة المتغيرة ليبلغ المؤشر نهاية التدريج. وكلما زادت المقاومة المجهولة قل التيار وقل الانحراف، ولذلك فتدريجه معكوس واتساع أقسامه غير منتظم.",
        t: "اضبط R_x على 3750 فينحرف المؤشر إلى منتصف التدريج، فهي تساوي مقاومة الجهاز الداخلية.",
        c: [["x", "المقاومة المجهولة R_x (أوم)", 0, 30000, 250, 3750]],
        f: (v) => {
          const I = 1.5 / (3750 + v.x),
            fr = I / 4e-4;
          return {
            o: [
              ["التيار", fmt(I * 1e6, 1), "μA"],
              ["الانحراف", fmt(fr * 100, 1), "% من التدريج"],
            ],
            s: `I = V_B ÷ (R_int + R_x) = 1.5 ÷ (3750 + ${v.x}) = ${fmt(I * 1e6, 1)} μA`,
            g: drawOhmmeter(v, fr, I),
          };
        },
        q: () => {
          const x = [1250, 3750, 7500, 11250][randInt(0, 3)];
          return [
            `أوميتر قوته الدافعة 1.5 V ومقاومته الداخلية الكلية 3750 Ω ونهاية تدريجه 400 μA. احسب التيار عند توصيل مقاومة مجهولة ${x} Ω بين طرفيه. الإجابة بوحدة μA.`,
            (1.5 / (3750 + x)) * 1e6,
          ];
        },
      },
    ],
  },
];

const LAB_IDS = [
  "ohm-law",
  "resistance",
  "series",
  "parallel",
  "closed-circuit",
  "kirchhoff-1",
  "kirchhoff-2",
  "wire-field",
  "coil",
  "solenoid",
  "force-on-wire",
  "parallel-wires",
  "torque",
  "ammeter",
  "voltmeter",
  "ohmmeter",
];
const flat = PACKS.flatMap((p) => p.L);

export const LABS = Object.fromEntries(flat.map((l, i) => [LAB_IDS[i], { ...l, id: LAB_IDS[i] }]));
