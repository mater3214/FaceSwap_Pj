import { Link } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';
import './ServicesPage.css';

function ServicesPage() {
    const services = [
        {
            title: "SimSwap",
            description: "High-quality AI face swapping for images. Seamless identity transfer with state-of-the-art neural networks.",
            icon: "🎭",
            link: "/tool/simswap-single",
            cta: "Try Now",
            color: "blue",
            features: ["HD Quality", "Fast Processing", "Multi-face Support"]
        },
        {
            title: "HeadNeRF",
            description: "Neural Radiance Field for parametric 3D head generation. Real-time blending and pose control.",
            icon: "🧠",
            link: "/tool/headnerf",
            cta: "Try Now",
            color: "purple",
            features: ["3D Rendering", "Pose Control", "Real-time Preview"]
        },
        {
            title: "Background Removal",
            description: "AI-powered background removal with transparent, solid color, or custom image replacement options.",
            icon: "✂️",
            link: "/tool/bg-removal",
            cta: "Try Now",
            color: "teal",
            features: ["Instant Remove", "Custom Backgrounds", "Batch Processing"]
        }
    ];

    return (
        <div className="services-page">
            <AnimatedBackground />

            <section className="services-header">
                <div className="container">
                    <div className="header-badge">
                        <span className="badge-dot"></span>
                        AI-Powered Services
                    </div>
                    <h1>
                        <span className="gradient-text">FaceLab</span> Services
                    </h1>
                    <p className="header-subtitle">Your Trusted Partner in Facial AI Excellence</p>
                </div>
            </section>

            <section className="services-grid-section">
                <div className="container">
                    <div className="services-grid">
                        {services.map((service, index) => (
                            <div
                                key={index}
                                className={`service-card ${service.color}`}
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                {/* Card Glow Effect */}
                                <div className="card-glow"></div>

                                <div className="service-icon-wrapper">
                                    <span className="service-icon">{service.icon}</span>
                                    <div className="icon-ring"></div>
                                </div>

                                <h3>{service.title}</h3>
                                <p>{service.description}</p>

                                {/* Feature Tags */}
                                <div className="feature-tags">
                                    {service.features.map((feature, idx) => (
                                        <span key={idx} className="feature-tag">
                                            {feature}
                                        </span>
                                    ))}
                                </div>

                                <div className="service-footer">
                                    <Link to={service.link} className="service-link">
                                        <span>{service.cta}</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom CTA */}
                    <div className="services-cta">
                        <div className="cta-content">
                            <h3>Need Custom Solutions?</h3>
                            <p>We offer tailored AI solutions for your specific needs</p>
                        </div>
                        <Link to="/contact" className="cta-button">
                            Contact Us
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default ServicesPage;
