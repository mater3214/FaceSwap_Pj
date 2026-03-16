import { useState } from 'react';
import { Link } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';
import './AboutPage.css';

const serviceFlows = [
    {
        id: 'simswap',
        title: 'SimSwap',
        subtitle: 'AI Face Swap Pipeline',
        icon: '🔄',
        color: 'blue',
        description: 'High-quality face swapping using deep neural networks with precise identity-preserving transfer.',
        steps: [
            { label: 'Upload Source', detail: 'Select source face image', icon: '📤' },
            { label: 'Upload Target', detail: 'Select target image', icon: '🖼️' },
            { label: 'Face Detection', detail: 'Detect faces using InsightFace (AntelopeV2)', icon: '👁️' },
            { label: 'ArcFace Extract', detail: 'Extract Identity Vector via ArcFace Network', icon: '🧬' },
            { label: 'SimSwap Inference', detail: 'Perform face swap via SimSwap Neural Network', icon: '🤖' },
            { label: 'Reverse Warp', detail: 'Reverse warp swapped face back to target using Affine Transform', icon: '🔄' },
            { label: 'Result', detail: 'Final swapped result image', icon: '✅' },
        ],
        link: '/tool/simswap-single'
    },
    {
        id: 'headnerf',
        title: 'HeadNeRF',
        subtitle: '3D Head Generation',
        icon: '🧊',
        color: 'purple',
        description: 'Neural Radiance Field for parametric 3D head generation with real-time blending and pose control.',
        steps: [
            { label: 'Upload Face', detail: 'Upload face image (auto-resizes to 512x512)', icon: '📤' },
            { label: 'Head Mask', detail: 'Generate head mask using GenHeadMask Model', icon: '🎭' },
            { label: 'Landmarks', detail: 'Detect 68 facial landmarks', icon: '📍' },
            { label: 'Fit 3DMM', detail: 'Fit 3D Morphable Model (NL3DMM)', icon: '📐' },
            { label: 'Fit NeRF Code', detail: 'Convert to HeadNeRF Latent Code', icon: '🧠' },
            { label: 'Parameters', detail: 'Adjust identity, expression, and pose parameters', icon: '🎛️' },
            { label: 'NeRF Render', detail: 'Render 3D image via Neural Radiance Field', icon: '🖥️' },
            { label: 'Result', detail: 'Final generated 3D head', icon: '✅' },
        ],
        link: '/tool/headnerf'
    },
    {
        id: 'bg-removal',
        title: 'Background Removal',
        subtitle: 'AI Background Processing',
        icon: '🖼️',
        color: 'teal',
        description: 'AI-powered background removal with transparent, solid color, blur, or custom image replacement options.',
        steps: [
            { label: 'Upload Image', detail: 'Upload original image', icon: '📤' },
            { label: 'AI Segmentation', detail: 'Remove background via rembg (U²-Net Model)', icon: '✂️' },
            { label: 'Generate Mask', detail: 'Generate Alpha Mask separating subject from background', icon: '🎭' },
            { label: 'Mode Select', detail: 'Select output mode', icon: '🔀', isBranch: true },
        ],
        branches: [
            { label: 'Transparent', detail: 'Export PNG with transparent background', icon: '🔳' },
            { label: 'Color', detail: 'Replace with solid color background', icon: '🎨' },
            { label: 'Image', detail: 'Composite with new background image', icon: '🏞️' },
            { label: 'Blur', detail: 'Apply blur to original background', icon: '🌫️' },
            { label: 'Multi-Person', detail: 'Isolate individuals using YOLOv8', icon: '👥' },
        ],
        link: '/tool/bg-removal'
    },
    {
        id: 'live',
        title: 'Live Deepfake',
        subtitle: 'Real-time Face Swap',
        icon: '📹',
        color: 'orange',
        description: 'Real-time face swapping on live webcam feed using WebSocket streaming and optimized AI inference.',
        steps: [
            { label: 'Prepare Source', detail: 'Extract ArcFace embedding from source image', icon: '🧬' },
            { label: 'WebSocket', detail: 'Establish WebSocket connection for streaming', icon: '🔌' },
            { label: 'Webcam Capture', detail: 'Capture webcam frames', icon: '📷' },
            { label: 'Downscale Detect', detail: 'Downscale frames for faster face detection', icon: '🔍' },
            { label: 'Face Crop', detail: 'Crop faces using Affine Transform', icon: '✂️' },
            { label: 'SimSwap Infer', detail: 'Perform face swap via SimSwap GPU Inference', icon: '⚡' },
            { label: 'Reverse Warp', detail: 'Reverse warp swapped face back to original frame', icon: '🔄' },
            { label: 'Stream Result', detail: 'Stream back processed frames via WebSocket', icon: '📡' },
        ],
        link: '/tool/live'
    }
];

function FlowStep({ step, index, total, color }) {
    return (
        <div className={`flow-step ${color}`} style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="flow-step-number">{index + 1}</div>
            <div className="flow-step-icon">{step.icon}</div>
            <div className="flow-step-content">
                <h4>{step.label}</h4>
                <p>{step.detail}</p>
            </div>
            {index < total - 1 && (
                <div className={`flow-connector ${step.isBranch ? 'branch' : ''}`}>
                    <div className="connector-line"></div>
                </div>
            )}
        </div>
    );
}

function BranchDiagram({ branches, color }) {
    return (
        <div className={`branch-container ${color}`}>
            <div className="branch-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9" />
                </svg>
                <span>Output Options</span>
            </div>
            <div className="branch-grid">
                {branches.map((branch, idx) => (
                    <div
                        key={idx}
                        className={`branch-item hover-${color}`}
                        style={{ animationDelay: `${0.5 + idx * 0.08}s` }}
                    >
                        <span className="branch-icon">{branch.icon}</span>
                        <strong>{branch.label}</strong>
                        <p>{branch.detail}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ServiceFlowCard({ service, onBack }) {
    return (
        <div className={`service-flow-card ${service.color} animate-fade-in`} id={`flow-${service.id}`}>
            <button className="btn-back-flow" onClick={onBack}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to Dashboard
            </button>
            <div className="service-flow-header">
                <div className="service-flow-title">
                    <div className="service-flow-icon-large">{service.icon}</div>
                    <div>
                        <h2>{service.title}</h2>
                        <span className="service-flow-subtitle">{service.subtitle}</span>
                    </div>
                </div>
                <div className="service-flow-actions">
                    <Link
                        to={service.link}
                        className={`btn btn-try flex items-center justify-center ${service.color}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        Launch {service.title}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{marginLeft: '0.5rem'}}>
                            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                </div>
            </div>

            <p className="service-flow-desc">{service.description}</p>

            <div className="flow-diagram-container">
                <div className="flow-steps">
                    {service.steps.map((step, idx) => (
                        <FlowStep
                            key={idx}
                            step={step}
                            index={idx}
                            total={service.steps.length}
                            color={service.color}
                        />
                    ))}
                </div>
                {service.branches && (
                    <BranchDiagram branches={service.branches} color={service.color} />
                )}
            </div>
        </div>
    );
}

function AboutPage() {
    const [selectedServiceId, setSelectedServiceId] = useState(null);
    const selectedService = serviceFlows.find(s => s.id === selectedServiceId);

    return (
        <div className="about-page">
            <AnimatedBackground />

            {/* Hero */}
            <section className="workflow-hero">
                <div className="container">
                    <div className="hero-badge-glass">
                        <span className="badge-glow-dot"></span>
                        Explore System Architecture
                    </div>
                    <h1>
                        <span className="futuristic-text" data-text="AI Core">AI Core</span> Workflows
                    </h1>
                    <p className="hero-subtitle">
                        Select a module below to explore the enterprise-level inference pipeline from input to output.
                    </p>
                </div>
            </section>

            {/* Service Flow Content */}
            <section className="workflow-section">
                <div className="container" style={{ position: 'relative', zIndex: 10 }}>
                    {!selectedService ? (
                        <div className="service-selector-grid">
                            {serviceFlows.map((s, idx) => (
                                <div 
                                    key={s.id} 
                                    className={`selector-card ${s.color}`}
                                    onClick={() => setSelectedServiceId(s.id)}
                                    style={{ animationDelay: `${idx * 0.15}s` }}
                                >
                                    <div className="selector-bg-glow"></div>
                                    <div className="selector-icon">{s.icon}</div>
                                    <div className="selector-content">
                                        <h3>{s.title}</h3>
                                        <span>{s.subtitle}</span>
                                    </div>
                                    <div className="selector-arrow">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div className="card-border-glow"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <ServiceFlowCard 
                            key={selectedService.id} 
                            service={selectedService} 
                            onBack={() => setSelectedServiceId(null)}
                        />
                    )}
                </div>
            </section>
        </div>
    );
}

export default AboutPage;
