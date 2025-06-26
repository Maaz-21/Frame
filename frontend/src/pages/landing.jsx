import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../App.css'
export default function LandingPage() {
  const router = useNavigate();
  return (
    <div className="landingPageContainer">
      <nav>
        <div className='navHeader'>
          <h2>Frame</h2>
        </div>
        <div className='navList'>
          <p onClick={() => { router("/aljk23")}} >Join as Guest</p>
          <p onClick={() => { router("/auth") }} > Register</p>
          <div onClick={() => {router("/auth")}} role='button' className="loginBtn">
          <p>Login</p>
          </div>
        </div>
      </nav>
      <div className="landingMainContainer">
        <div className="textSection">
          <h1><span>Effortless</span> video calls that bring people closer</h1>
          <p>Experience smooth, secure, and stunning video quality—built for true connection.</p>
          <div role="button" className="ctaButton">
              <Link to="/auth">Get Started</Link>
          </div>
        </div>
        <div className="imageSection">
          <img src="/mobile.png" alt="mobile-img" />
        </div>
      </div>
    </div>
  );
}