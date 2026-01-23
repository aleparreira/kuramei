import { Github, Linkedin, Twitter, MessageSquare, GitBranch, DollarSign, ExternalLink } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">Kuramei</span>
            <span className="text-xs text-muted-foreground">倉明</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/aleparreira/kuramei"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-medium"
            >
              <Github size={16} />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            AI-powered Architecture
            <br />
            <span className="text-primary">Decision-Making</span>
          </h1>

          <p className="text-xl text-muted mb-4">
            Transform conversations into architecture diagrams
          </p>

          <div className="flex items-center justify-center gap-3 text-lg text-foreground mb-8">
            <span className="px-3 py-1 bg-secondary/20 rounded-full">Chat</span>
            <span className="text-muted">→</span>
            <span className="px-3 py-1 bg-secondary/20 rounded-full">Diagram</span>
            <span className="text-muted">→</span>
            <span className="px-3 py-1 bg-secondary/20 rounded-full">Cost</span>
            <span className="text-muted">→</span>
            <span className="px-3 py-1 bg-secondary/20 rounded-full">Terraform</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a
              href="https://github.com/aleparreira/kuramei"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white hover:bg-primary-hover transition-colors font-medium"
            >
              <Github size={20} />
              View on GitHub
            </a>
            <a
              href="#features"
              className="flex items-center gap-2 px-6 py-3 rounded-full border border-border hover:bg-card transition-colors font-medium"
            >
              Learn More
            </a>
          </div>

          {/* Creator */}
          <div className="inline-flex flex-col items-center p-6 bg-card rounded-2xl border border-border">
            <p className="text-sm text-muted-foreground mb-2">Created by</p>
            <p className="text-lg font-semibold text-foreground">Alexandre Parreira</p>
            <p className="text-sm text-muted mb-3">Sociotechnical Systems Architect & AI Engineer</p>
            <p className="text-xs text-muted-foreground mb-4">30+ years in technology • Founder @Kaltam AI</p>
            <div className="flex items-center gap-4">
              <a
                href="https://linkedin.com/in/aleparreira"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={20} />
              </a>
              <a
                href="https://github.com/aleparreira"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-primary transition-colors"
                aria-label="GitHub"
              >
                <Github size={20} />
              </a>
              <a
                href="https://x.com/aleparreira"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-primary transition-colors"
                aria-label="X (Twitter)"
              >
                <Twitter size={20} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-card">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-4">
            What it does
          </h2>
          <p className="text-center text-muted mb-12 max-w-2xl mx-auto">
            Kuramei transforms how architects work — from blank canvas to production-ready infrastructure
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 bg-background rounded-xl border border-border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Describe in Chat
              </h3>
              <p className="text-muted">
                Tell the AI what you need. &quot;I need an API with a Postgres database and Redis cache.&quot;
                Kuramei asks the right questions and builds your architecture.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-background rounded-xl border border-border">
              <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center mb-4">
                <GitBranch className="text-secondary" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Visualize & Navigate
              </h3>
              <p className="text-muted">
                See your architecture at any level — from CEO view (system context) to DevOps view
                (infrastructure). Semantic zoom adapts to your audience.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-background rounded-xl border border-border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Cost & Export
              </h3>
              <p className="text-muted">
                Real-time cost estimation from AWS pricing. Export to Terraform and deploy.
                Architecture as code, not just documentation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Who it&apos;s for
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-4">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-semibold text-foreground">Solutions Architects</p>
                <p className="text-muted text-sm">Accelerate decision-making from hours to minutes</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-semibold text-foreground">CTOs & Tech Leads</p>
                <p className="text-muted text-sm">Executive visibility with cost transparency</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-semibold text-foreground">DevOps & SRE Teams</p>
                <p className="text-muted text-sm">Infrastructure as code from day one</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-semibold text-foreground">Startups</p>
                <p className="text-muted text-sm">MVP architecture in minutes, not weeks</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="py-20 px-6 bg-card">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/20 rounded-full text-sm font-medium text-foreground mb-6">
            <ExternalLink size={16} />
            Open Source
          </div>

          <h2 className="text-3xl font-bold text-foreground mb-4">
            MIT License • Built in Public
          </h2>

          <p className="text-muted mb-8 max-w-2xl mx-auto">
            Kuramei is 100% open source. No hidden features, no paywall.
            Fork it, extend it, contribute to it.
          </p>

          <p className="text-2xl font-light text-muted italic">
            &quot;Clarity emerges.&quot;
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground">Kuramei</span>
            <span className="text-xs text-muted-foreground">倉明</span>
          </div>

          <p className="text-sm text-muted-foreground">
            © 2026 Alexandre Parreira • Kaltam AI
          </p>

          <div className="flex items-center gap-6">
            <a
              href="https://github.com/aleparreira/kuramei"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/aleparreira"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              LinkedIn
            </a>
            <a
              href="https://x.com/aleparreira"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              X
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
