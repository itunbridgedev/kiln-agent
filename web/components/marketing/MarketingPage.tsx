export default function MarketingPage() {
  // Dynamically construct demo URL based on current hostname
  // kilnagent.com -> demo.kilnagent.com
  // kilnagent-stage.com -> demo.kilnagent-stage.com
  // kilnagent-dev.com -> demo.kilnagent-dev.com
  // localhost:3000 -> localhost:3000
  const getDemoUrl = () => {
    if (typeof window === 'undefined') {
      return process.env.NEXT_PUBLIC_DEMO_URL || "http://localhost:3000";
    }
    
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If localhost, stay on localhost
    if (hostname === 'localhost') {
      return `${protocol}//${hostname}:${window.location.port}`;
    }
    
    // For root domains, add 'demo.' subdomain
    // kilnagent.com -> demo.kilnagent.com
    // kilnagent-stage.com -> demo.kilnagent-stage.com
    return `${protocol}//demo.${hostname}`;
  };
  
  const demoUrl = getDemoUrl();
  
  return (
    <div className="marketing-container">
      <div className="marketing-hero">
        <div className="marketing-content">
          <h1 className="marketing-title">Kiln Agent</h1>
          <p className="marketing-tagline">
            The Modern Pottery Studio Management Platform
          </p>
          <p className="marketing-description">
            Streamline your pottery studio operations with comprehensive tools
            for class management, firing workflows, membership billing, and
            retail sales.
          </p>

          <div className="marketing-features">
            <div className="feature-card">
              <span className="feature-icon">🎨</span>
              <h3>Class Management</h3>
              <p>Schedule classes, track enrollment, and manage attendance</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🔥</span>
              <h3>Firing Workflow</h3>
              <p>Track pieces from dock to dryer to kiln to shelf</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">💳</span>
              <h3>Membership Billing</h3>
              <p>Automated recurring billing and access management</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🛍️</span>
              <h3>Retail Sales</h3>
              <p>Product catalog and sales management</p>
            </div>
          </div>

          <div className="cta-buttons">
            <a
              href={demoUrl}
              className="cta-button primary"
            >
              View Demo Studio
            </a>
            <a href="#" className="cta-button secondary">
              Learn More
            </a>
          </div>

          <p className="marketing-footer-text">
            Built for pottery studios, by pottery enthusiasts
          </p>
        </div>
      </div>
    </div>
  );
}
