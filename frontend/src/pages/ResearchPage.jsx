import './ResearchPage.css';

function ResearchPage() {
    // Hardcoded based on directory scan of C:\Users\painh\Desktop\CS FINALPROJECT\facelab\Service
    const researchProjects = [
        {
            name: "SimSwap Service",
            description: "An efficient and high-fidelity face swapping framework.",
            path: "facelab/Service/simswap_service",
            status: "Active"
        },
        {
            name: "DiFaReLi Service",
            description: "Digital Face Relighting for realistic illumination changes.",
            path: "facelab/Service/difareli_service",
            status: "Experimental"
        }
    ];

    return (
        <div className="research-page">
            <div className="container">
                <header className="research-header">
                    <h1>Local Research Projects</h1>
                    <p>Analysis of local project directory: CS FINALPROJECT</p>
                </header>

                <div className="research-grid">
                    {researchProjects.map((project, index) => (
                        <div key={index} className="research-card">
                            <div className="card-header">
                                <h3>{project.name}</h3>
                                <span className={`status-badge ${project.status.toLowerCase()}`}>
                                    {project.status}
                                </span>
                            </div>
                            <div className="card-body">
                                <p>{project.description}</p>
                                <code className="path-display">{project.path}</code>
                            </div>
                        </div>
                    ))}

                    {/* Placeholder for no projects if empty */}
                    {researchProjects.length === 0 && (
                        <div className="empty-state">
                            <p>No research projects found in the specified directory.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ResearchPage;
