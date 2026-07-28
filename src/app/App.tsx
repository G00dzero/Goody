import { useState, useEffect, useRef, createContext, useContext, FormEvent } from "react";
import { Instagram, Phone, X, Send } from "lucide-react";

type Page = "home" | "about" | "projects" | "contact";
type Theme = "light" | "dark";

// ── Theme context ─────────────────────────────────────────────────────────────
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });
const useTheme = () => useContext(ThemeCtx);

const T = {
  light: {
    home:     { bg: "#f5f4f0", text: "#111", sub: "#777", accent: "#bbb", border: "#ddd", btnHoverBg: "#111", btnHoverText: "#fff" },
    about:    { bg: "#f0ece8", text: "#1a1008", sub: "#665544", accent: "#c09070", tag: "#c09070" },
    projects: { bg: "#f2f5f0", text: "#101810", sub: "#667766", accent: "#6aaa70", cardBg: "rgba(255,255,255,0.8)", cardBorder: "rgba(255,255,255,0.6)" },
    toggleBg: "rgba(0,0,0,0.06)", toggleBorder: "rgba(0,0,0,0.12)", toggleColor: "#444",
  },
  dark: {
    home:     { bg: "#0d0d14", text: "#f0f0f0", sub: "#888", accent: "#555", border: "#2a2a3a", btnHoverBg: "#f0f0f0", btnHoverText: "#111" },
    about:    { bg: "#120f0a", text: "#e8ddd0", sub: "#a89070", accent: "#c09070", tag: "#c09070" },
    projects: { bg: "#0a110a", text: "#d0e8d0", sub: "#7a9a7a", accent: "#7aaa80", cardBg: "rgba(255,255,255,0.04)", cardBorder: "rgba(255,255,255,0.08)" },
    toggleBg: "rgba(255,255,255,0.07)", toggleBorder: "rgba(255,255,255,0.14)", toggleColor: "#bbb",
  },
};

// ── Mouse tilt hook ───────────────────────────────────────────────────────────
function useTilt(strength = 12) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.closest("[data-tiltzone]") as HTMLElement ?? el;

    function onMove(e: MouseEvent) {
      const r = parent.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width  - 0.5;
      const cy = (e.clientY - r.top)  / r.height - 0.5;
      setTilt({ rx: -cy * strength, ry: cx * strength });
    }
    function onLeave() { setTilt({ rx: 0, ry: 0 }); }

    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseleave", onLeave);
    return () => { parent.removeEventListener("mousemove", onMove); parent.removeEventListener("mouseleave", onLeave); };
  }, [strength]);

  return { ref, tilt };
}

function useIsCompact(breakpoint = 820) {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsCompact(query.matches);

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [breakpoint]);

  return isCompact;
}

// ── Nav maps ──────────────────────────────────────────────────────────────────
const ENTER_FROM: Record<Page, string> = { home: "translateX(-100%)", about: "translateX(100%)", projects: "translateX(-100%)", contact: "translateY(100%)" };
const EXIT_TO:    Record<Page, string> = { home: "translateX(-100%)", about: "translateX(100%)", projects: "translateX(-100%)", contact: "translateY(100%)" };
const BACK: Record<Page, { exitTo: string; homeEnterFrom: string }> = {
  home:     { exitTo: "translateX(0)",     homeEnterFrom: "translateX(0)" },
  about:    { exitTo: "translateX(100%)",  homeEnterFrom: "translateX(-100%)" },
  projects: { exitTo: "translateX(-100%)", homeEnterFrom: "translateX(100%)" },
  contact:  { exitTo: "translateY(100%)",  homeEnterFrom: "translateY(-100%)" },
};
const EASE = "cubic-bezier(0.77, 0, 0.18, 1)";

const STARS = Array.from({ length: 60 }, () => ({
  w: Math.random() * 2 + 1, op: Math.random() * 0.7 + 0.1,
  top: Math.random() * 100, left: Math.random() * 100,
  dur: Math.random() * 3 + 2, delay: Math.random() * 3,
}));

// ── Shared UI ─────────────────────────────────────────────────────────────────
function ThemeToggle({ invert }: { invert?: boolean }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const bg     = invert ? "rgba(255,255,255,0.1)"  : (isDark ? T.dark.toggleBg     : T.light.toggleBg);
  const border = invert ? "rgba(255,255,255,0.2)"  : (isDark ? T.dark.toggleBorder  : T.light.toggleBorder);
  const color  = invert ? "rgba(255,255,255,0.7)"  : (isDark ? T.dark.toggleColor   : T.light.toggleColor);
  return (
    <button onClick={toggle} title={isDark ? "Light mode" : "Dark mode"} style={{ position: "absolute", top: "28px", right: "28px", width: "40px", height: "40px", borderRadius: "50%", border: `1.5px solid ${border}`, background: bg, color, cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.25s", zIndex: 5 }}
      onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.6"; }}
      onMouseOut={e => {  (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}>
      {isDark ? "☀︎" : "☾"}
    </button>
  );
}

function BackButton({ onBack, dark }: { onBack: () => void; dark?: boolean }) {
  const col = dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
  const hov = dark ? "white" : "#111";
  return (
    <button onClick={onBack} style={{ position: "absolute", top: "32px", left: "32px", background: "none", border: "none", cursor: "pointer", color: col, fontSize: "0.85rem", letterSpacing: "0.05em", padding: "8px 0", transition: "color 0.2s", zIndex: 5 }}
      onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.color = hov; }}
      onMouseOut={e => {  (e.currentTarget as HTMLButtonElement).style.color = col; }}>
      ← back
    </button>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────
function HomePage({ onNav }: { onNav: (p: Page) => void }) {
  const { theme } = useTheme();
  const p = T[theme].home;
  const { ref, tilt } = useTilt(10);
  const isDark = theme === "dark";
  const isCompact = useIsCompact(820);

  const orbs = [
    { size: 500, x: "60%", y: "-10%", color: isDark ? "rgba(120,80,200,0.12)" : "rgba(180,140,255,0.15)", blur: 80 },
    { size: 350, x: "-10%", y: "55%", color: isDark ? "rgba(60,120,200,0.1)"  : "rgba(100,160,255,0.12)", blur: 60 },
    { size: 280, x: "75%", y: "70%",  color: isDark ? "rgba(200,80,120,0.08)" : "rgba(255,120,160,0.1)",  blur: 50 },
  ];

  return (
    <div data-tiltzone style={{ width: "100%", height: "100%", background: p.bg, position: "relative", overflow: "hidden", transition: "background 0.4s" }}>
      {/* depth orbs */}
      {orbs.map((o, i) => (
        <div key={i} style={{ position: "absolute", width: o.size, height: o.size, borderRadius: "50%", background: o.color, filter: `blur(${o.blur}px)`, left: o.x, top: o.y, transform: `translate(-50%,-50%) translateZ(0)`, pointerEvents: "none" }} />
      ))}

      {/* grid lines */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)"} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)"} 1px, transparent 1px)`, backgroundSize: "60px 60px", pointerEvents: "none" }} />

      <ThemeToggle />

      {/* 3D tilt card */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", perspective: "800px" }}>
        <div ref={ref} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: isCompact ? "16px" : "20px", transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`, transition: "transform 0.12s ease-out", transformStyle: "preserve-3d", padding: isCompact ? "0 18px" : 0 }}>
          <p style={{ color: p.accent, letterSpacing: "0.25em", textTransform: "uppercase", fontSize: isCompact ? "0.62rem" : "0.7rem", transform: "translateZ(20px)" }}>welcome to</p>
          <h1 style={{ fontSize: isCompact ? "clamp(2.35rem, 13vw, 4.2rem)" : "clamp(3rem, 9vw, 6rem)", fontWeight: 800, color: p.text, textAlign: "center", lineHeight: 1.0, letterSpacing: "-0.03em", transform: "translateZ(40px)", textShadow: isDark ? "0 8px 40px rgba(150,100,255,0.3)" : "0 8px 32px rgba(0,0,0,0.08)", transition: "color 0.4s" }}>
            Goody's Portfolio
          </h1>
          <p style={{ color: p.sub, maxWidth: isCompact ? "300px" : "380px", textAlign: "center", lineHeight: 1.7, fontSize: isCompact ? "0.88rem" : "0.95rem", transform: "translateZ(20px)", transition: "color 0.4s" }}>
            Designer, builder, and creative thinker.
          </p>
          {/* nav pills */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", transform: "translateZ(30px)", marginTop: "12px", padding: isCompact ? "0 8px" : 0 }}>
            {(["Projects", "About", "Contact"] as const).map((label) => {
              const page = label.toLowerCase() as Page;
              return (
                <button key={label} onClick={() => onNav(page)}
                  style={{ padding: isCompact ? "9px 20px" : "10px 28px", borderRadius: "100px", border: `1.5px solid ${p.border}`, background: "transparent", color: p.text, cursor: "pointer", fontSize: isCompact ? "0.8rem" : "0.88rem", backdropFilter: "blur(8px)", transition: "all 0.2s" }}
                  onMouseOver={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = p.btnHoverBg; b.style.color = p.btnHoverText; b.style.borderColor = p.btnHoverBg; b.style.transform = "translateY(-2px)"; }}
                  onMouseOut={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "transparent"; b.style.color = p.text; b.style.borderColor = p.border; b.style.transform = ""; }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── About ─────────────────────────────────────────────────────────────────────
function AboutPage({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const p = T[theme].about;
  const { ref, tilt } = useTilt(8);
  const isDark = theme === "dark";
  const isCompact = useIsCompact(820);

  const floaters = [
    { size: 420, x: "80%", y: "20%", color: isDark ? "rgba(200,140,80,0.08)"  : "rgba(200,140,80,0.1)",  blur: 70, speed: "18s" },
    { size: 300, x: "10%", y: "75%", color: isDark ? "rgba(160,100,60,0.07)"  : "rgba(180,120,70,0.08)", blur: 60, speed: "24s" },
    { size: 200, x: "50%", y: "10%", color: isDark ? "rgba(220,160,100,0.06)" : "rgba(220,160,100,0.09)",blur: 40, speed: "20s" },
  ];

  return (
    <div data-tiltzone style={{ width: "100%", height: "100%", background: p.bg, position: "relative", overflow: "hidden", transition: "background 0.4s" }}>
      {floaters.map((f, i) => (
        <div key={i} style={{ position: "absolute", width: f.size, height: f.size, borderRadius: "50%", background: f.color, filter: `blur(${f.blur}px)`, left: f.x, top: f.y, transform: "translate(-50%,-50%)", pointerEvents: "none", animation: `floatOrb ${f.speed} ease-in-out infinite alternate` }} />
      ))}

      {/* subtle lines */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 79px, ${isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.03)"} 80px)`, pointerEvents: "none" }} />

      <BackButton onBack={onBack} dark={isDark} />
      <ThemeToggle />

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", perspective: "900px" }}>
        <div ref={ref} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0", transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`, transition: "transform 0.12s ease-out", transformStyle: "preserve-3d", width: isCompact ? "100%" : "80%", maxWidth: "800px", padding: isCompact ? "0 16px" : "0 32px" }}>

          {/* glass card */}
          <div style={{ width: "100%", borderRadius: "24px", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.6)", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"}`, backdropFilter: "blur(20px)", padding: isCompact ? "32px 22px" : "48px 40px", boxShadow: isDark ? "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)" : "0 32px 80px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.8)", transform: "translateZ(0px)", display: "flex", flexDirection: "column", alignItems: "center", gap: isCompact ? "16px" : "20px" }}>
            <p style={{ color: p.accent, letterSpacing: "0.2em", textTransform: "uppercase", fontSize: isCompact ? "0.62rem" : "0.7rem" }}>about me</p>
            <h2 style={{ fontSize: isCompact ? "clamp(1.8rem, 8vw, 2.6rem)" : "clamp(2rem, 6vw, 3.2rem)", fontWeight: 800, color: p.text, textAlign: "center", lineHeight: 1.1, letterSpacing: "-0.02em" }}>Hey, I'm Goody.</h2>
            <p style={{ color: p.sub, textAlign: "center", lineHeight: 1.85, fontSize: isCompact ? "0.88rem" : "0.95rem", maxWidth: "400px" }}>
              I'm a creative developer with a passion for building things that feel good to use. I blend design thinking with technical craft to create experiences that are both beautiful and functional.<br/>
              Apart from coding, I love exploring new ideas, experimenting with motion design, and sharing knowledge with the community.<br/>
              I also dabble in the arts of fashion, music, and photography, always seeking inspiration from the world around me.
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }}>
              {["Design", "Code", "Motion", "Ideas"].map(s => (
                <span key={s} style={{ padding: isCompact ? "6px 12px" : "6px 16px", borderRadius: "100px", background: isDark ? "rgba(200,140,80,0.15)" : "rgba(200,140,80,0.12)", color: p.tag, fontSize: isCompact ? "0.68rem" : "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", border: `1px solid ${isDark ? "rgba(200,140,80,0.2)" : "rgba(200,140,80,0.25)"}` }}>{s}</span>
              ))}
            </div>

            <a href="Goodness Efe.pdf" target="_blank">Download My CV</a>
          </div>

          {/* floating depth chips */}
          {/* <div style={{ display: "flex", justifyContent: "space-between", width: "90%", marginTop: "-16px", transform: "translateZ(30px)" }}>
            {["Dublin 🇮🇪", "Available for hire"].map((chip, i) => (
              <div key={i} style={{ padding: "8px 18px", borderRadius: "100px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`, backdropFilter: "blur(12px)", color: p.sub, fontSize: "0.75rem", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                {chip}
              </div>
            ))}
          </div> */}
        </div>
      </div>

      <style>{`@keyframes floatOrb { from { transform: translate(-50%,-50%) scale(1); } to { transform: translate(-50%,-50%) scale(1.15); } }`}</style>
    </div>
  );
}

// ── Projects ──────────────────────────────────────────────────────────────────
const PROJECTS = [
  {
    title: "Verite",
    tag: "Web-App",
    desc: "A web experience built with intention — every interaction considered, every pixel purposeful.",
    year: "2024",
    bg: ["#0e1a2b", "#0a2240"],
    bgL: ["#ddeeff", "#c8e0f8"],
    orb: "rgba(60,130,255,0.18)",
    accent: "#5599ff",
    accentL: "#2266cc",
    href: "https://github.com/G00dzero/verite.git",
  },
  {
    title: "Claddagh Watch",
    tag: "Design",
    desc: "Design meets function in every detail. A system built on coherence and quiet confidence.",
    year: "2024",
    bg: ["#1a0e22", "#2a0a38"],
    bgL: ["#f0e8ff", "#e0d0f8"],
    orb: "rgba(160,80,255,0.18)",
    accent: "#cc77ff",
    accentL: "#8844cc",
    href: "https://github.com/TUS-DEVMR/full-stack-project-multi-sprint-development-iipgroup2a.git",
  },
  {
    title: "Roundablock",
    tag: "Motion",
    desc: "Motion, interaction, and clean code — where the boundary between design and engineering blurs.",
    year: "2026",
    bg: ["#0a1a10", "#0a2216"],
    bgL: ["#e0f4e8", "#c8ecd4"],
    orb: "rgba(60,200,100,0.16)",
    accent: "#44dd88",
    accentL: "#228844",
    href: "https://github.com/G00dzero/RoundaBlock.git",
  },
  {
    title: "Meme Generator",
    tag: "Code",
    desc: "A playful build for fast, shareable content.",
    year: "2023",
    bg: ["#26131a", "#3a1721"],
    bgL: ["#ffe4e8", "#f6ccd4"],
    orb: "rgba(255,100,130,0.16)",
    accent: "#ff6b8b",
    accentL: "#cc3a61",
    href: "#",
  },
];

function FullProjectCard({ project, isDark }: { project: typeof PROJECTS[0]; isDark: boolean }) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [hover, setHover] = useState(false);
  const isCompact = useIsCompact(820);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width - 0.5;
    const cy = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -cy * 10, ry: cx * 10 });
  }

  const bg0 = isDark ? project.bg[0] : project.bgL[0];
  const bg1 = isDark ? project.bg[1] : project.bgL[1];
  const ac = isDark ? project.accent : project.accentL;
  const textMain = isDark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.85)";
  const textSub = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";

  return (
    <a href={project.href} target={project.href === "#" ? "_self" : "_blank"} rel={project.href === "#" ? undefined : "noopener noreferrer"} style={{ width: "100%", height: "100%", textDecoration: "none", color: "inherit" }}>
      <div
        onMouseMove={onMove}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => { setTilt({ rx: 0, ry: 0 }); setHover(false); }}
        style={{
          width: "100%", height: "100%", flexShrink: 0,
          background: `linear-gradient(135deg, ${bg0} 0%, ${bg1} 100%)`,
          position: "relative", overflow: "hidden",
          cursor: "default",
          transition: "transform 0.12s ease-out",
          transform: `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          boxShadow: isCompact ? "0 18px 40px rgba(0,0,0,0.18)" : "none",
        }}
      >
        <div style={{ position: "absolute", width: "60vmax", height: "60vmax", borderRadius: "50%", background: project.orb, filter: "blur(80px)", left: "50%", top: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", transition: "transform 0.3s ease-out", ...(hover ? { transform: `translate(calc(-50% + ${tilt.ry * 6}px), calc(-50% + ${-tilt.rx * 6}px))` } : {}) }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle, ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"} 1px, transparent 1px)`, backgroundSize: "32px 32px", pointerEvents: "none" }} />
        {hover && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 50% at ${50 + tilt.ry * 2}% ${50 - tilt.rx * 2}%, ${isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.35)"} 0%, transparent 70%)`, pointerEvents: "none" }} />}

        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "flex-start", padding: isCompact ? "26px 22px 30px" : "32px 28px 40px", transformStyle: "preserve-3d" }}>
          <div style={{ position: "absolute", top: isCompact ? "12px" : "16px", right: isCompact ? "16px" : "20px", fontSize: isCompact ? "clamp(3rem, 15vw, 5rem)" : "clamp(4rem, 8vw, 7rem)", fontWeight: 900, color: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)", lineHeight: 1, userSelect: "none", letterSpacing: "-0.05em" }}>
            {String(PROJECTS.indexOf(project) + 1).padStart(2, "0")}
          </div>

          <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: "100px", border: `1px solid ${ac}55`, background: `${ac}18`, color: ac, fontSize: isCompact ? "0.6rem" : "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "16px", transform: "translateZ(20px)" }}>
            {project.tag} · {project.year}
          </span>
          <h2 style={{ fontSize: isCompact ? "clamp(1.5rem, 8vw, 2.1rem)" : "clamp(1.6rem, 3.5vw, 2.6rem)", fontWeight: 800, color: textMain, lineHeight: 1.0, letterSpacing: "-0.03em", marginBottom: "14px", transform: "translateZ(40px)", textShadow: hover ? `0 12px 40px ${ac}44` : "none", transition: "text-shadow 0.3s" }}>
            {project.title}
          </h2>
          <p style={{ color: textSub, fontSize: isCompact ? "0.76rem" : "0.82rem", lineHeight: 1.7, transform: "translateZ(25px)", marginBottom: "24px", maxWidth: isCompact ? "220px" : "240px" }}>
            {project.desc}
          </p>
          <button style={{ padding: isCompact ? "8px 18px" : "9px 22px", borderRadius: "100px", border: `1.5px solid ${ac}60`, background: `${ac}15`, color: ac, cursor: "pointer", fontSize: isCompact ? "0.72rem" : "0.78rem", letterSpacing: "0.08em", backdropFilter: "blur(8px)", transition: "all 0.25s", transform: "translateZ(30px)" }}
            onMouseOver={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = `${ac}30`; b.style.borderColor = ac; }}
            onMouseOut={e => {  const b = e.currentTarget as HTMLButtonElement; b.style.background = `${ac}15`; b.style.borderColor = `${ac}60`; }}>
            View project →
          </button>
        </div>
      </div>
    </a>
  );
}

function ProjectsPage({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isCompact = useIsCompact(820);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: isCompact ? "flex" : "grid", gridTemplateColumns: isCompact ? undefined : "repeat(4, minmax(0, 1fr))", gap: isCompact ? "14px" : "2px", background: "rgba(255,255,255,0.06)" }}>
      <BackButton onBack={onBack} dark />
      <ThemeToggle invert />
      {isCompact ? (
        <div
          style={{
            display: "flex",
            gap: "14px",
            width: "100%",
            height: "100%",
            overflowX: "auto",
            overflowY: "hidden",
            padding: "86px 18px 22px",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          onScroll={(e) => {
            const container = e.currentTarget;
            const cardWidth = container.firstElementChild instanceof HTMLElement
              ? container.firstElementChild.getBoundingClientRect().width + 14
              : container.clientWidth;
            const nextIndex = Math.max(0, Math.min(PROJECTS.length - 1, Math.round(container.scrollLeft / cardWidth)));
            if (nextIndex !== activeIndex) setActiveIndex(nextIndex);
          }}
        >
          {PROJECTS.map((proj, i) => (
            <div key={i} style={{ minWidth: "82vw", maxWidth: "82vw", height: "100%", scrollSnapAlign: "center", scrollSnapStop: "always" }}>
              <FullProjectCard project={proj} isDark={isDark} />
            </div>
          ))}
        </div>
      ) : PROJECTS.map((proj, i) => (
        <FullProjectCard key={i} project={proj} isDark={isDark} />
      ))}

      {isCompact && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "14px", display: "flex", justifyContent: "center", gap: "6px", pointerEvents: "none", zIndex: 6 }}>
          {PROJECTS.map((_, i) => (
            <span key={i} style={{ width: i === activeIndex ? "18px" : "6px", height: "6px", borderRadius: "999px", background: i === activeIndex ? (isDark ? "rgba(255,255,255,0.82)" : "rgba(16,24,16,0.86)") : "rgba(255,255,255,0.28)", transition: "all 0.2s ease" }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Contact ───────────────────────────────────────────────────────────────────
const CONTACT_ORBS = Array.from({ length: 6 }, (_, i) => ({
  size:  80 + i * 60,
  x:     Math.random() * 100,
  y:     Math.random() * 100,
  color: `hsla(${220 + i * 30}, 60%, 60%, ${0.04 + i * 0.015})`,
  dur:   12 + i * 4,
  delay: i * 2,
}));

function ContactPage({ onBack }: { onBack: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg]     = useState("");
  const [sent, setSent]   = useState(false);
  const [sending, setSending] = useState(false);
  const { ref, tilt } = useTilt(6);
  const isCompact = useIsCompact(820);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message: msg }),
      });
      const text = await response.text();
      let body: any = text;
      try { body = text ? JSON.parse(text) : {}; } catch (err) { /* not JSON */ }

      if (!response.ok) {
        console.error('Contact API error', response.status, text, body);
        window.alert(`Email error: ${response.status} - ${body?.error ?? text}`);
        setSent(false);
        return;
      }

      console.log('Contact API success', response.status, body);
      setSent(true);
      setTimeout(() => { setFormOpen(false); setSent(false); setName(""); setEmail(""); setMsg(""); }, 1800);
    } catch {
      setSent(false);
      // Provide more detailed feedback in case of network or unexpected errors
      // eslint-disable-next-line no-undef
      const errMsg = (arguments[0] && arguments[0].message) || 'Unknown error';
      console.error('Failed to send contact message', arguments[0]);
      window.alert(`Email could not be sent: ${errMsg}. Make sure the local mail server is running and SMTP settings are configured.`);
    } finally {
      setSending(false);
    }
  }

  const inputStyle = { width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "white", fontSize: "0.9rem", outline: "none", transition: "border-color 0.2s" } as React.CSSProperties;

  return (
    <div style={{ width: "100%", height: "100%", background: "radial-gradient(ellipse at 60% 40%, #12102a 0%, #0a0a18 60%, #06060f 100%)", position: "relative", overflow: "hidden" }}>

      {/* floating orbs */}
      {CONTACT_ORBS.map((o, i) => (
        <div key={i} style={{ position: "absolute", width: o.size, height: o.size, borderRadius: "50%", background: o.color, filter: "blur(40px)", left: o.x + "%", top: o.y + "%", transform: "translate(-50%,-50%)", pointerEvents: "none", animation: `floatOrb ${o.dur}s ${o.delay}s ease-in-out infinite alternate` }} />
      ))}

      {/* nebula layer */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 30% 60%, rgba(100,60,200,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      <BackButton onBack={onBack} dark />
      <ThemeToggle invert />

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", perspective: "900px" }}>
        <div ref={ref} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: isCompact ? "16px" : "20px", transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`, transition: "transform 0.12s ease-out", transformStyle: "preserve-3d", padding: isCompact ? "0 18px" : "0 32px", width: "100%", maxWidth: "480px" }}>
          <p style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.25em", textTransform: "uppercase", fontSize: isCompact ? "0.62rem" : "0.7rem", transform: "translateZ(10px)" }}>get in touch</p>
          <h2 style={{ fontSize: isCompact ? "clamp(2.1rem, 12vw, 3.5rem)" : "clamp(2.5rem, 8vw, 4.5rem)", fontWeight: 800, color: "white", textAlign: "center", lineHeight: 1.0, letterSpacing: "-0.03em", textShadow: "0 0 80px rgba(140,100,255,0.4)", transform: "translateZ(40px)" }}>Let's Talk.</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.8, fontSize: isCompact ? "0.88rem" : "0.95rem", transform: "translateZ(20px)", maxWidth: "360px" }}>
            Have a project in mind or just want to say hello?
          </p>

          <button onClick={() => setFormOpen(true)} style={{ marginTop: "4px", padding: isCompact ? "12px 34px" : "14px 44px", borderRadius: "100px", border: "1.5px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.07)", color: "white", cursor: "pointer", fontSize: isCompact ? "0.82rem" : "0.9rem", letterSpacing: "0.12em", backdropFilter: "blur(12px)", transition: "all 0.25s", boxShadow: "0 0 30px rgba(140,100,255,0.15)", transform: "translateZ(30px)" }}
            onMouseOver={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(255,255,255,0.14)"; b.style.boxShadow = "0 0 50px rgba(140,100,255,0.3)"; }}
            onMouseOut={e => {  const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(255,255,255,0.07)"; b.style.boxShadow = "0 0 30px rgba(140,100,255,0.15)"; }}>
            send a message
          </button>

          <div style={{ display: "flex", gap: "16px", transform: "translateZ(20px)" }}>
            {[
              { href: "https://www.instagram.com/jt_goody", icon: <Instagram size={18} />, label: "@jt_goody" },
              { href: "https://wa.me/353892095987",         icon: <Phone size={18} />,      label: "WhatsApp" },
              { href: "https://www.linkedin.com/in/efe-goodness-5b995b2a1", icon: <span style={{ fontWeight: 700, fontSize: "0.75rem" }}>in</span>, label: "LinkedIn" },
            ].map(({ href, icon, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={label}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: isCompact ? "9px 16px" : "10px 20px", borderRadius: "100px", border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.55)", textDecoration: "none", fontSize: isCompact ? "0.74rem" : "0.8rem", backdropFilter: "blur(8px)", transition: "all 0.25s" }}
                onMouseOver={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.background = "rgba(255,255,255,0.1)"; a.style.color = "white"; a.style.borderColor = "rgba(255,255,255,0.3)"; }}
                onMouseOut={e => {  const a = e.currentTarget as HTMLAnchorElement; a.style.background = "rgba(255,255,255,0.04)"; a.style.color = "rgba(255,255,255,0.55)"; a.style.borderColor = "rgba(255,255,255,0.12)"; }}>
                {icon} {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* form sheet */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(18,14,40,0.95)", borderTop: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px 24px 0 0", padding: isCompact ? "24px 18px 34px" : "32px 32px 48px", transform: formOpen ? "translateY(0)" : "translateY(100%)", transition: "transform 0.55s cubic-bezier(0.77,0,0.18,1)", zIndex: 20, backdropFilter: "blur(24px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <p style={{ color: "white", fontWeight: 600, fontSize: "1.05rem" }}>Send a message</p>
          <button onClick={() => setFormOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "flex", padding: "4px" }}
            onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.color = "white"; }}
            onMouseOut={e => {  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)"; }}>
            <X size={20} />
          </button>
        </div>
        {sent ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.6)" }}>✓ Message sent.</div>
        ) : (
          <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input required placeholder="Your name"  value={name}  onChange={e => setName(e.target.value)}  style={inputStyle} onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(140,100,255,0.5)"; }} onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.1)"; }} />
            <input required type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(140,100,255,0.5)"; }} onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.1)"; }} />
            <textarea required placeholder="Your message" rows={4} value={msg} onChange={e => setMsg(e.target.value)} style={{ ...inputStyle, resize: "none" }} onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(140,100,255,0.5)"; }} onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(255,255,255,0.1)"; }} />
            <button type="submit" disabled={sending} style={{ marginTop: "4px", padding: "13px", borderRadius: "10px", border: "none", background: sending ? "rgba(255,255,255,0.7)" : "white", color: "#0f0f1a", fontWeight: 700, fontSize: "0.9rem", cursor: sending ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "opacity 0.2s" }}
              onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
              onMouseOut={e => {  (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}>
              <Send size={15} /> {sending ? "Sending..." : "Send message"}
            </button>
          </form>
        )}
      </div>

      <style>{`@keyframes floatOrb { from { transform: translate(-50%,-50%) scale(1); } to { transform: translate(-50%,-50%) scale(1.2); } }`}</style>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme]       = useState<Theme>("light");
  const [unlocked, setUnlocked] = useState(false);
  const [current, setCurrent]   = useState<Page>("home");
  const [outgoing, setOutgoing] = useState<{ page: Page; exitTo: string } | null>(null);
  const [enterFrom, setEnterFrom] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [time, setTime]           = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  function go(next: Page, isBack: boolean) {
    if (animating || next === current) return;
    const exitTo  = isBack ? BACK[current].exitTo        : EXIT_TO[current];
    const fromDir = isBack ? BACK[current].homeEnterFrom : ENTER_FROM[next];
    setOutgoing({ page: current, exitTo });
    setEnterFrom(fromDir);
    setCurrent(next);
    setAnimating(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setOutgoing(null); setEnterFrom(null); setAnimating(false); }, 650);
  }

  const ctx = { theme, toggle: () => setTheme(t => t === "light" ? "dark" : "light") };

  function renderPage(page: Page) {
    switch (page) {
      case "home":     return <HomePage     onNav={(p) => go(p, false)} />;
      case "about":    return <AboutPage    onBack={() => go("home", true)} />;
      case "projects": return <ProjectsPage onBack={() => go("home", true)} />;
      case "contact":  return <ContactPage  onBack={() => go("home", true)} />;
    }
  }

  return (
    <ThemeCtx.Provider value={ctx}>
      <div style={{ width: "100%", height: "100vh", overflow: "hidden", position: "relative", fontFamily: "system-ui, sans-serif", background: "#000", touchAction: "manipulation" }}>

        {outgoing && (
          <div key={`out-${outgoing.page}`} style={{ position: "absolute", inset: 0, zIndex: 1, animation: `pageOut 0.65s ${EASE} forwards` }}>
            <style>{`@keyframes pageOut { from { transform: translate(0,0); } to { transform: ${outgoing.exitTo}; } }`}</style>
            {renderPage(outgoing.page)}
          </div>
        )}

        <div key={`in-${current}-${enterFrom ?? "initial"}`} style={{ position: "absolute", inset: 0, zIndex: 2, animation: enterFrom ? `pageIn 0.65s ${EASE} forwards` : undefined }}>
          <style>{`@keyframes pageIn { from { transform: ${enterFrom}; } to { transform: translate(0,0); } }`}</style>
          {renderPage(current)}
        </div>

        {/* Lock screen */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #0f0f1a 0%, #1a1028 50%, #0a0a14 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "48px", transform: unlocked ? "translateY(-100%)" : "translateY(0)", transition: `transform 0.75s ${EASE}`, willChange: "transform", zIndex: 10 }}>
          {STARS.map((s, i) => (
            <div key={i} style={{ position: "absolute", width: s.w + "px", height: s.w + "px", borderRadius: "50%", background: "white", opacity: s.op, top: s.top + "%", left: s.left + "%", animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite alternate` }} />
          ))}
          <p style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.25em", textTransform: "uppercase", fontSize: "0.7rem" }}>
            {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <p style={{ color: "white", fontSize: "clamp(4rem, 15vw, 7rem)", fontWeight: 200, letterSpacing: "-0.02em", lineHeight: 1 }}>{time}</p>
          <button onClick={() => setUnlocked(true)} style={{ marginTop: "16px", padding: "14px 48px", borderRadius: "100px", border: "1.5px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.08)", color: "white", cursor: "pointer", fontSize: "1rem", letterSpacing: "0.15em", textTransform: "uppercase", backdropFilter: "blur(12px)", boxShadow: "0 0 40px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)", transition: "all 0.3s" }}
            onMouseOver={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(255,255,255,0.15)"; b.style.borderColor = "rgba(255,255,255,0.5)"; }}
            onMouseOut={e => {  const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(255,255,255,0.08)"; b.style.borderColor = "rgba(255,255,255,0.25)"; }}>
            Welcome
          </button>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem", marginTop: "-24px" }}>tap to enter</p>
          <style>{`@keyframes twinkle { from { opacity: 0.1; } to { opacity: 0.8; } }`}</style>
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}
