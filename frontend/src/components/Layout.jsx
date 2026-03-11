import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ToolsPanel from './ToolsPanel';
import './Layout.css';

function Layout() {
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);

    // Show sidebar on tool pages
    const isToolPage = location.pathname.startsWith('/tool');

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="layout">
            <header className={`main-header ${scrolled ? 'scrolled' : ''}`}>
                {/* Animated gradient border */}
                <div className="header-gradient-border"></div>

                <div className="container header-container">
                    <Link to="/" className="logo">
                        <div className="logo-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <defs>
                                    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#8b5cf6" />
                                        <stop offset="100%" stopColor="#06b6d4" />
                                    </linearGradient>
                                </defs>
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="url(#logoGrad)" strokeWidth="1.5" fill="none" />
                                <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round" />
                                <circle cx="9" cy="10" r="1.2" fill="url(#logoGrad)" />
                                <circle cx="15" cy="10" r="1.2" fill="url(#logoGrad)" />
                            </svg>
                            <div className="logo-glow"></div>
                        </div>
                        <span className="logo-text">FaceLab</span>
                    </Link>

                    <nav className="main-nav">
                        {[
                            { to: '/', label: 'Home', match: (p) => p === '/' },
                            { to: '/services', label: 'Services', match: (p) => p.startsWith('/services') },
                            { to: '/research', label: 'Research', match: (p) => p.startsWith('/research') },
                            { to: '/about', label: 'About Us', match: (p) => p.startsWith('/about') },
                        ].map((item) => (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`nav-link ${item.match(location.pathname) ? 'active' : ''}`}
                            >
                                <span>{item.label}</span>
                                <div className="nav-indicator"></div>
                            </Link>
                        ))}
                    </nav>

                    <div className="header-actions">
                        <a
                            href="https://github.com/mater3214/FaceSwap_Pj"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="github-btn"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            <span>GitHub</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M7 17L17 7M17 7H7M17 7v10" />
                            </svg>
                        </a>
                    </div>
                </div>
            </header>

            <div className="main-body">
                {/* Sidebar for tool pages */}
                {isToolPage && (
                    <aside className="global-sidebar">
                        <ToolsPanel />
                    </aside>
                )}

                <main className={`main-content-wrapper ${isToolPage ? 'with-sidebar' : ''}`}>
                    <Outlet />
                </main>
            </div>

            <footer className="main-footer">
                <div className="container">
                    <div className="footer-content single-row">
                        <div className="footer-brand">
                            <h3>FaceLab</h3>
                            <p>State-of-the-art Face Swapping</p>
                        </div>
                        <div className="footer-links horizontal">
                            <Link to="/services">Face Swap</Link>
                            <Link to="/about">About</Link>
                            <Link to="/contact">Contact</Link>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; 2024 FaceLab. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Layout;
