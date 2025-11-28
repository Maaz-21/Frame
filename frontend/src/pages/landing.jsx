import React from "react";
import { Link, useNavigate } from "react-router-dom";
// classes.css is imported globally from index.css

export default function LandingPage() {
  const router = useNavigate();

  return (
    <>
      {/* HERO SECTION */}
      <div className="hero-container">
        <nav className="flex items-center justify-between mb-12">
          <h2 className="text-2xl font-semibold text-zinc-50 ">Frame</h2>

          <div className="flex items-center gap-4">
            <button className="nav-btn text-white" onClick={() => router("/auth")}>
              Register
            </button>
            <button className="nav-btn text-white" onClick={() => router("/auth")}>
              Login
            </button>
          </div>
        </nav>

        <div className="text-center space-y-5 py-12">
          <h1 className="hero-title">
            One-click <span className="text-white/70">Video Meetings</span>
          </h1>

          <p className="hero-desc">
            Effortless, secure, real-time communication built for everyone.
          </p>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button onClick={() => router("/aljk23")} className="cta-dark">
              Join as Guest
            </button>

            <Link to="/auth">
              <button className="cta-light">Get Started</button>
            </Link>
          </div>
        </div>

        {/* Floating Nodes */}
        <div className="absolute top-[22%] left-[8%] text-xs text-white/40 animate-floatAround">
          Is my mic on?
        </div>
        <div className="absolute bottom-[12%] right-[10%] text-xs text-white/40 animate-floatAround">
          …hello?
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer-container">
        <div className="footer-content">
          <p className="text-sm">
            © 2024 Frame — Built for effortless communication.
          </p>

          <div className="flex items-center justify-center gap-6 mt-3 text-xs">
            <a href="#" className="hover:text-white/70 transition">
              Privacy
            </a>
            <a href="#" className="hover:text-white/70 transition">
              Terms
            </a>
            <a href="#" className="hover:text-white/70 transition">
              Support
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
