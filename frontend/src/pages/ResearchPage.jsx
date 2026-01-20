import AnimatedBackground from '../components/AnimatedBackground';
import './ResearchPage.css';

function ResearchPage() {

    // ===========================================
    // 📝 MY PAPERS - เปเปอร์ของคุณ (แก้ไขตรงนี้!)
    // ===========================================
    const myPapers = [
        {
            title: "Your Paper Title Here",
            authors: "Your Name, Co-Author 1, Co-Author 2",
            venue: "Conference/Journal Name 2024",
            year: "2024",
            abstract: "Brief description of your paper. Explain what your research is about and what problems it solves.",
            tags: ["Deep Learning", "Face Recognition"],
            arxiv: "https://arxiv.org/abs/xxxx.xxxxx",
            pdf: null,
            github: "https://github.com/your-repo",
            demo: null,
            image: null
        },
    ];

    // ===========================================
    // 📚 RELATED PAPERS - เปเปอร์ที่เกี่ยวข้อง
    // ===========================================
    const relatedPapers = [
        {
            title: "SimSwap: An Efficient Framework For High Fidelity Face Swapping",
            authors: "Renwang Chen, Xuanhong Chen, Bingbing Ni, Yanhao Ge",
            venue: "ACM MM 2020",
            year: "2020",
            tags: ["Face Swap", "GAN"],
            arxiv: "https://arxiv.org/abs/2106.06340",
            github: "https://github.com/neuralchen/SimSwap"
        },
        {
            title: "HeadNeRF: A Real-time NeRF-based Parametric Head Model",
            authors: "Yang Hong, Bo Peng, Haiyao Xiao, Ligang Liu, Juyong Zhang",
            venue: "CVPR 2022",
            year: "2022",
            tags: ["NeRF", "3D Face"],
            arxiv: "https://arxiv.org/abs/2112.05637",
            github: "https://github.com/CrisHY1995/headnerf"
        },
        {
            title: "DiFaReli: Diffusion Face Relighting",
            authors: "Puntawat Ponglertnapakorn, Nontawat Charoenphakdee, et al.",
            venue: "ICCV 2023",
            year: "2023",
            tags: ["Diffusion", "Relighting"],
            arxiv: "https://arxiv.org/abs/2304.09479",
            github: "https://github.com/diffusion-face-relighting/difareli_code"
        },
    ];



    return (
        <div className="research-page">
            <AnimatedBackground />

            <div className="container">
                {/* My Papers Section */}
                {myPapers.length > 0 && (
                    <section className="papers-section featured-section">
                        <div className="section-header">
                            <div className="section-icon-wrapper">
                                <span className="section-icon">📄</span>
                            </div>
                            <div>
                                <h2>My Publications</h2>
                                <p>Research papers I have authored or co-authored</p>
                            </div>
                        </div>

                        <div className="papers-grid featured">
                            {myPapers.map((paper, index) => (
                                <PaperCard key={index} paper={paper} featured={true} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Related Papers Section */}
                {relatedPapers.length > 0 && (
                    <section className="papers-section">
                        <div className="section-header">
                            <div className="section-icon-wrapper purple">
                                <span className="section-icon">📚</span>
                            </div>
                            <div>
                                <h2>Related Research</h2>
                                <p>Key papers and resources in the field</p>
                            </div>
                        </div>

                        <div className="papers-grid">
                            {relatedPapers.map((paper, index) => (
                                <PaperCard key={index} paper={paper} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

// Paper Card Component
function PaperCard({ paper, featured = false }) {
    return (
        <article className={`paper-card ${featured ? 'featured' : ''}`}>
            {paper.image && (
                <div className="paper-image">
                    <img src={paper.image} alt={paper.title} />
                </div>
            )}

            <div className="paper-content">
                {/* Tags */}
                {paper.tags && paper.tags.length > 0 && (
                    <div className="paper-tags">
                        {paper.tags.map((tag, i) => (
                            <span key={i} className="paper-tag">{tag}</span>
                        ))}
                    </div>
                )}

                {/* Title */}
                <h3 className="paper-title">{paper.title}</h3>

                {/* Authors */}
                <p className="paper-authors">{paper.authors}</p>

                {/* Venue & Year */}
                <div className="paper-meta">
                    <span className="paper-venue">{paper.venue}</span>
                    <span className="paper-year">{paper.year}</span>
                </div>

                {/* Abstract */}
                {featured && paper.abstract && (
                    <p className="paper-abstract">{paper.abstract}</p>
                )}

                {/* Links */}
                <div className="paper-links">
                    {paper.arxiv && (
                        <a href={paper.arxiv} target="_blank" rel="noopener noreferrer" className="paper-link arxiv">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                            arXiv
                        </a>
                    )}
                    {paper.pdf && (
                        <a href={paper.pdf} target="_blank" rel="noopener noreferrer" className="paper-link pdf">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            PDF
                        </a>
                    )}
                    {paper.github && (
                        <a href={paper.github} target="_blank" rel="noopener noreferrer" className="paper-link github">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>
                            Code
                        </a>
                    )}
                    {paper.demo && (
                        <a href={paper.demo} target="_blank" rel="noopener noreferrer" className="paper-link demo">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                            Demo
                        </a>
                    )}
                </div>
            </div>
        </article>
    );
}

export default ResearchPage;
