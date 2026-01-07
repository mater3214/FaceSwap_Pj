import { Link } from 'react-router-dom';
import './ServicesPage.css';

function ServicesPage() {
    const services = [
        {
            title: "SimSwap (Face Swap)",
            description: "A seamless multi-platform tool designed for individual users. Experience high-quality face swapping for images with zero latency.",
            icon: "🎭",
            link: "/tool/simswap-single",
            cta: "Try Now",
            color: "blue"
        },
        /* Temporarily hidden as per user request
        {
            title: "Enterprise Solutions",
            description: "From high-precision tools for individuals to enterprise-grade API integration. Leverage our state-of-the-art technology.",
            icon: "🏢",
            link: "#enterprise",
            cta: "Contact Sales",
            color: "purple"
        },
        {
            title: "Commercial License",
            description: "Flexible commercial licenses for our proprietary and open-source models to scale your business.",
            icon: "📜",
            link: "#license",
            cta: "Learn More",
            color: "teal"
        },
        {
            title: "Face Recognition SDK",
            description: "Empower your applications with our comprehensive Face Recognition SDK. Full licensing and technical support included.",
            icon: "🛡️",
            link: "#sdk",
            cta: "Explore SDK",
            color: "orange"
        }
        */
    ];

    return (
        <div className="services-page">
            <section className="services-header">
                <div className="container">
                    <h1>FaceLab Services</h1>
                    <p>Your Trusted Partner in Facial AI Excellence</p>
                </div>
            </section>

            <section className="services-grid-section">
                <div className="container">
                    <div className="services-grid">
                        {services.map((service, index) => (
                            <div key={index} className={`service-card ${service.color}`}>
                                <div className="service-icon-wrapper">
                                    <span className="service-icon">{service.icon}</span>
                                </div>
                                <h3>{service.title}</h3>
                                <p>{service.description}</p>
                                <div className="service-footer">
                                    {service.link.startsWith('#') ? (
                                        <a href={service.link} className="service-link">
                                            {service.cta} →
                                        </a>
                                    ) : (
                                        <Link to={service.link} className="service-link">
                                            {service.cta} →
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}

export default ServicesPage;
