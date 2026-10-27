import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './PublicNavbar.css';

export const PublicNavbar: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // If the user is authenticated or auth status is actively resolving with a saved token,
  // do not render the public navbar to prevent flicker or visual overlap with authenticated layouts.
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('lifesync_token') === 'true';
  if (user || (loading && hasToken)) {
    return null;
  }

  // Show "View My Portfolio" exclusively on the logged-out Login route
  const isLoginRoute = location.pathname.toLowerCase() === '/login';

  return (
    <header className="lamp-public-navbar" role="banner" aria-label="LifeSync AI Public Navigation" id="public-navbar">
      {/* Left: LifeSync AI Brand Badge */}
      <div className="lamp-navbar-brand">
        <Link to="/login" className="lamp-brand-badge-link" aria-label="LifeSync AI Home">
          <div className="lamp-brand-badge">
            <div className="lamp-brand-avatar-frame">
              <img
                src="/logo.jpg"
                alt="LifeSync AI logo"
                className="lamp-brand-avatar"
                width={48}
                height={48}
              />
            </div>
            <div className="lamp-brand-titles">
              <span className="lamp-brand-title">LIFESYNC AI</span>
              <span className="lamp-brand-tagline">Harmonize Health, Work & Life</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Right: Portfolio Action Button (Visible exclusively on Login page) */}
      {isLoginRoute && (
        <nav className="lamp-navbar-nav" aria-label="Public Actions">
          <a
            href="https://darshil-golaniya-portfolio.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            id="public-nav-portfolio-btn"
            className="lamp-nav-btn lamp-nav-btn-portfolio"
            aria-label="View My Portfolio (opens in a new tab)"
          >
            <span>View My Portfolio</span>
            <span className="lamp-portfolio-arrow" aria-hidden="true">↗</span>
          </a>
        </nav>
      )}
    </header>
  );
};

export default PublicNavbar;
