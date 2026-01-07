import { useState, useEffect, useCallback } from 'react';
import './LuxuryCarousel.css';

const images = [
    {
        url: "/carousel/facelab_result_1767811075072.png",
        title: "TEST 1",
        subtitle: "TEST 1",
    },
    {
        url: "/carousel/facelab_result_1767811095071.png",
        title: "TEST 2",
        subtitle: "TEST 2",
    },
    {
        url: "/carousel/facelab_result_1767811133389.png",
        title: "TEST 3",
        subtitle: "TEST 3",
    },
    {
        url: "/carousel/facelab_result_1767811176453.png",
        title: "TEST 4",
        subtitle: "TEST 4",
    }
];

function LuxuryCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [direction, setDirection] = useState("right");
    const [isHovered, setIsHovered] = useState(false);
    const [progress, setProgress] = useState(0);

    const nextSlide = useCallback(() => {
        setDirection("right");
        setCurrentIndex((prev) => (prev + 1) % images.length);
        setProgress(0);
    }, []);

    const prevSlide = useCallback(() => {
        setDirection("left");
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
        setProgress(0);
    }, []);

    const goToSlide = (index) => {
        setDirection(index > currentIndex ? "right" : "left");
        setCurrentIndex(index);
        setProgress(0);
    };

    useEffect(() => {
        if (!isPlaying) return;

        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    nextSlide();
                    return 0;
                }
                return prev + 1; // Slightly slower than 2 for smoother feel
            });
        }, 50);

        return () => clearInterval(progressInterval);
    }, [isPlaying, nextSlide]);

    return (
        <div
            className="carousel-container"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Background Images */}
            {images.map((image, index) => (
                <div
                    key={index}
                    className={`carousel-slide ${index === currentIndex ? 'active' : ''} ${direction === 'right' ? 'slide-right' : 'slide-left'}`}
                >
                    <div
                        className="slide-image"
                        style={{ backgroundImage: `url(${image.url})` }}
                    />
                    <div className="slide-overlay" />
                </div>
            ))}

            {/* Content Overlay */}
            <div className="carousel-content-wrapper">
                {/* Header - Hidden as integrated into Landing Page */}
                {/* <header className="carousel-header">...</header> */}

                {/* Main Content */}
                <div className="carousel-text-area">
                    {images.map((image, index) => (
                        <div
                            key={index}
                            className={`carousel-text-item ${index === currentIndex ? 'active' : ''}`}
                        >
                            <span className="carousel-counter">
                                {String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
                            </span>
                            <h1>{image.title}</h1>
                            <p>{image.subtitle}</p>
                        </div>
                    ))}
                </div>

                {/* Bottom Controls */}
                <div className="carousel-controls">
                    {/* Navigation Dots with Progress */}
                    <div className="carousel-dots">
                        {images.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className="carousel-dot"
                            >
                                <div
                                    className="dot-progress"
                                    style={{
                                        width: index === currentIndex ? `${progress}%` : "0%",
                                        opacity: index === currentIndex ? 1 : 0
                                    }}
                                />
                                <div className={`dot-bg ${index < currentIndex ? 'completed' : ''}`} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Thumbnail Strip */}
            <div className={`carousel-thumbnails ${isHovered ? 'visible' : ''}`}>
                {images.map((image, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`thumbnail-btn ${index === currentIndex ? 'active' : ''}`}
                    >
                        <img src={image.url} alt={image.title} />
                    </button>
                ))}
            </div>

            {/* Scroll Indicator - Optional/Removed for embedding */}
        </div>
    );
}

export default LuxuryCarousel;
