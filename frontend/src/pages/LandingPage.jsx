import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import LuxuryCarousel from '../components/LuxuryCarousel';
import AnimatedBackground from '../components/AnimatedBackground';
import './LandingPage.css';

const subtitles = [
    "Face Swapping",
    "3D Head Generation",
    "Background Removal",
    "Live Streaming",
];

function LandingPage() {
    const [currentWord, setCurrentWord] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const featuresRef = useRef(null);
    const statsRef = useRef(null);
    const [featuresVisible, setFeaturesVisible] = useState(false);
    const [statsVisible, setStatsVisible] = useState(false);

    // Rotating subtitle text
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentWord((prev) => (prev + 1) % subtitles.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    // Hero fade-in
    useEffect(() => {
        setTimeout(() => setIsVisible(true), 100);
    }, []);

    // Intersection observer for scroll animations
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.target === featuresRef.current && entry.isIntersecting) {
                        setFeaturesVisible(true);
                    }
                    if (entry.target === statsRef.current && entry.isIntersecting) {
                        setStatsVisible(true);
                    }
                });
            },
            { threshold: 0.15 }
        );
        if (featuresRef.current) observer.observe(featuresRef.current);
        if (statsRef.current) observer.observe(statsRef.current);
        return () => observer.disconnect();
    }, []);

    const features = [
        {
            icon: "\ud83c\udfad",
            title: "SimSwap",
            desc: "High-quality face swapping with state-of-the-art neural networks. HD output, multi-face support.",
            color: "#8b5cf6",
        },
        {
            icon: "\ud83e\udde0",
            title: "HeadNeRF",
            desc: "3D head generation using Neural Radiance Fields. Real-time blending and parametric control.",
            color: "#ec4899",
        },
        {
            icon: "\u2702\ufe0f",
            title: "Background Removal",
            desc: "Instant AI-powered background removal. Transparent, solid, or custom image replacements.",
            color: "#14b8a6",
        },
        {
            icon: "\ud83c\udfa5",
            title: "Live Mode",
            desc: "Real-time face swapping via webcam. Low-latency streaming with seamless identity transfer.",
            color: "#f59e0b",
        },
    ];

    return (
        <div className="landing-page">
            <AnimatedBackground />

            {/* ===== HERO SECTION ===== */}
            <section className={`hero-section ${isVisible ? 'visible' : ''}`}>
                <div className="hero-grid-bg"></div>

                <div className="container hero-container">
                    <div className="hero-content">
                        <div className="hero-badge">
                            <span className="badge-pulse"></span>
                            <span>AI-Powered Platform</span>
                        </div>

                        <h1 className="hero-title">
                            FACELAB AI
                            <br />The Ultimate Toolbox for

                            <br />
                            <span className="hero-rotating-wrapper">
                                {subtitles.map((word, i) => (
                                    <span
                                        key={i}
                                        className={`hero-rotating-text ${i === currentWord ? 'active' : ''}`}
                                    >
                                        {word}
                                    </span>
                                ))}
                            </span>
                        </h1>

                        <p className="hero-description">
                            Experience seamless, high-quality face manipulation powered by cutting-edge AI.
                            Built for researchers, creators, and enterprise solutions.
                        </p>

                        <div className="hero-actions">
                            <Link to="/services" className="hero-btn-primary">
                                <span>Get Started</span>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </Link>
                            <Link to="/research" className="hero-btn-secondary">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                <span>View Research</span>
                            </Link>
                        </div>

                        {/* Mini stats row */}
                        <div className="hero-mini-stats">
                            <div className="mini-stat">
                                <strong>4+</strong>
                                <span>AI Models</span>
                            </div>
                            <div className="mini-stat-divider"></div>
                            <div className="mini-stat">
                                <strong>HD</strong>
                                <span>Quality Output</span>
                            </div>
                            <div className="mini-stat-divider"></div>
                            <div className="mini-stat">
                                <strong>Real-time</strong>
                                <span>Processing</span>
                            </div>
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="hero-visual-glow"></div>
                        <LuxuryCarousel />
                    </div>
                </div>
            </section>

            {/* ===== FEATURES SECTION ===== */}
            <section
                ref={featuresRef}
                className={`features-section ${featuresVisible ? 'visible' : ''}`}
            >
                <div className="container">
                    <div className="section-header">
                        <span className="section-label">Our Services</span>
                        <h2 className="section-title">
                            Powerful AI Tools at Your Fingertips
                        </h2>
                        <p className="section-subtitle">
                            From face swapping to 3D generation — everything you need in one platform.
                        </p>
                    </div>

                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="feature-card"
                                style={{
                                    animationDelay: `${index * 0.1}s`,
                                    '--accent': feature.color,
                                }}
                            >
                                <div className="feature-icon-wrapper">
                                    <span className="feature-icon">{feature.icon}</span>
                                    <div className="feature-icon-bg" style={{ background: `${feature.color}15` }}></div>
                                </div>
                                <h3>{feature.title}</h3>
                                <p>{feature.desc}</p>
                                <Link to="/services" className="feature-link">
                                    Learn more
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== STATS / CTA SECTION ===== */}
            <section
                ref={statsRef}
                className={`stats-cta-section ${statsVisible ? 'visible' : ''}`}
            >
                <div className="container">
                    <div className="stats-cta-card">
                        <div className="stats-cta-bg"></div>
                        <div className="stats-cta-content">
                            <h2>Ready to Transform Your Workflow?</h2>
                            <p>Join researchers and creators using FaceLab's AI-powered tools.</p>
                            <Link to="/services" className="stats-cta-btn">
                                Explore Services
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                        <div className="stats-grid">
                            {[
                                { number: "4+", label: "AI Services" },
                                { number: "HD", label: "Output Quality" },
                                { number: "RT", label: "Real-time" },
                                { number: "\u221e", label: "Possibilities" },
                            ].map((stat, i) => (
                                <div key={i} className="stat-item" style={{ animationDelay: `${i * 0.1}s` }}>
                                    <span className="stat-number">{stat.number}</span>
                                    <span className="stat-label">{stat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default LandingPage;
