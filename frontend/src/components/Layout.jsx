import { Outlet, Link, useLocation } from 'react-router-dom';
import ToolsPanel from './ToolsPanel';
import './Layout.css';

function Layout() {
    const location = useLocation();

    // Show sidebar on tool pages
    const isToolPage = location.pathname.startsWith('/tool');

    return (
        <div className="layout">
            <header className="main-header">
                <div className="container header-container">
                    <Link to="/" className="logo">
                        <span className="logo-text">FaceLab</span>
                    </Link>

                    <nav className="main-nav">
                        <Link
                            to="/"
                            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                        >
                            Home
                        </Link>
                        <Link
                            to="/services"
                            className={`nav-link ${location.pathname.startsWith('/services') ? 'active' : ''}`}
                        >
                            Services
                        </Link>
                        <Link
                            to="/research"
                            className={`nav-link ${location.pathname.startsWith('/research') ? 'active' : ''}`}
                        >
                            Research
                        </Link>
                        <Link
                            to="/about"
                            className={`nav-link ${location.pathname.startsWith('/about') ? 'active' : ''}`}
                        >
                            About Us
                        </Link>
                    </nav>

                    <div className="header-actions">
                        <a
                            href="https://github.com/mater3214/FaceSwap_Pj"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                        >
                            GitHub ↗
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
                        <p>© 2024 FaceLab. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Layout;
