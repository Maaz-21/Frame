import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const FEATURES = [
  {
    icon: "shield_lock",
    title: "End-to-End Secure",
    desc: "Enterprise-grade encryption keeps every conversation private.",
    gradient: "linear-gradient(135deg, #34d399, #10b981)"
  },
  {
    icon: "hd",
    title: "Crystal Clear HD",
    desc: "Stunning video and spatial audio in every call.",
    gradient: "linear-gradient(135deg, #38bdf8, #0ea5e9)"
  },
  {
    icon: "bolt",
    title: "Instant Connect",
    desc: "No downloads. No installs. One click and you're in.",
    gradient: "linear-gradient(135deg, #fbbf24, #f59e0b)"
  }
];

const STATS = [
  { value: "99.9%", label: "Uptime" },
  { value: "< 50ms", label: "Latency" },
  { value: "256-bit", label: "Encryption" },
  { value: "4K", label: "Resolution" }
];

const TYPEWRITER_WORDS = ["Connect.", "Collaborate.", "Create."];

const AVATAR_COLORS = [
  "linear-gradient(135deg, #34d399, #14b8a6)",
  "linear-gradient(135deg, #38bdf8, #0ea5e9)",
  "linear-gradient(135deg, #fbbf24, #f59e0b)",
  "linear-gradient(135deg, #f43f5e, #e11d48)",
  "linear-gradient(135deg, #a78bfa, #7c3aed)"
];
const AVATAR_INITIALS = ["M", "A", "K", "S", "R"];

export default function LandingPage() {
  const navigate = useNavigate();
  const [wordIndex, setWordIndex] = useState(0);
  const cardRefs = useRef([]);
  const isLoggedin = !!localStorage.getItem("token");

  // Typewriter word rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex(prev => (prev + 1) % TYPEWRITER_WORDS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Parallax tilt effect
  const handleMouseMove = (e, index) => {
    const card = cardRefs.current[index];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
  };

  const handleMouseLeave = (index) => {
    const card = cardRefs.current[index];
    if (!card) return;
    card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0)';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Gradient orbs */}
      <div className="orb-glow" style={{ width: 600, height: 600, top: '10%', left: '5%', background: 'rgba(52,211,153,0.25)' }} />
      <div className="orb-glow" style={{ width: 500, height: 500, bottom: '10%', right: '10%', background: 'rgba(251,191,36,0.15)' }} />

      {/* Hero */}
      <div className="hero-container fade-in">
        <div className="hero-badge slide-up">
          <span className="material-symbols-rounded text-sm">auto_awesome</span>
          Now with reactions, screen sharing & live chat
        </div>

        <h1 className="hero-title slide-up slide-up-delay-1">
          Video meetings<br />
          <span className="hero-title-accent" key={wordIndex} style={{
            display: 'inline-block',
            animation: 'typewriter 3s ease-in-out infinite'
          }}>
            {TYPEWRITER_WORDS[wordIndex]}
          </span>
        </h1>

        <p className="hero-desc slide-up slide-up-delay-2">
          Crystal-clear video calls with built-in chat, emoji reactions,
          screen sharing, and enterprise-grade security — no install needed.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 slide-up slide-up-delay-3">
          <button onClick={() => isLoggedin ? navigate("/home") : navigate("/auth")} className="cta-glow">
            <span className="flex items-center gap-2">
              <span className="material-symbols-rounded text-lg">video_call</span>
              Start a Meeting
            </span>
          </button>
          <button onClick={() => {
            const code = Math.random().toString(36).substring(2, 8);
            navigate(`/${code}`);
          }} className="cta-dark">
            <span className="flex items-center gap-2">
              <span className="material-symbols-rounded text-lg">group</span>
              Join as Guest
            </span>
          </button>
        </div>

        {/* Social Proof */}
        <div className="social-proof slide-up slide-up-delay-3">
          <div className="avatar-stack">
            {AVATAR_INITIALS.map((initial, i) => (
              <div key={i} className="avatar-dot" style={{ background: AVATAR_COLORS[i] }}>
                {initial}
              </div>
            ))}
          </div>
          <p className="text-xs ml-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Trusted by <span className="text-white/60 font-medium">2,000+</span> teams
          </p>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {STATS.map((s, i) => (
            <div key={i} className="stat-item fade-in" style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Parallax Tilt Feature Cards */}
      <div className="feature-grid px-6">
        {FEATURES.map((f, i) => (
          <div key={i} className="tilt-card">
            <div
              ref={el => cardRefs.current[i] = el}
              className={`tilt-card-inner shimmer-card slide-up slide-up-delay-${i + 1}`}
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={() => handleMouseLeave(i)}
            >
              <div className="feature-icon" style={{ background: f.gradient }}>
                <span className="material-symbols-rounded text-white text-lg">{f.icon}</span>
              </div>
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="footer-container">
        <div className="footer-content">
          <p className="text-sm">© 2025 Frame — Built for effortless communication.</p>
          <div className="flex items-center justify-center gap-6 mt-3 text-xs">
            <span className="hover:text-white/50 transition cursor-pointer">Privacy</span>
            <span className="hover:text-white/50 transition cursor-pointer">Terms</span>
            <span className="hover:text-white/50 transition cursor-pointer">Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
