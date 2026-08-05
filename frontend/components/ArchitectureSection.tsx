export default function ArchitectureSection() {
  return (
    <section className="py-28 bg-alt">
      <div className="max-w-[1280px] mx-auto px-6 md:px-16 lg:px-24">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <p className="text-muted text-sm font-medium tracking-widest uppercase mb-4">ARCHITECTURE</p>
          <h2 className="text-primary text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Designed for how you already work
          </h2>
          <p className="text-secondary text-lg md:text-xl max-w-2xl mx-auto">
            Connect FormBridge to your existing Microsoft ecosystem without rebuilding your core systems.
          </p>
        </div>

        <div className="mt-20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-12 lg:gap-16">
            {/* Your documents */}
            <div className="flex-1">
              <div className="bg-card radius-card border border-card p-8 shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                <div className="flex justify-center mb-6">
                  <svg 
                    className="w-12 h-12 accent-blue" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                    />
                  </svg>
                </div>
                <h3 className="text-primary text-xl md:text-2xl font-semibold mb-3 text-center">
                  Your documents
                </h3>
                <p className="text-muted text-sm md:text-base text-center">
                  PDF · DOCX · Email
                </p>
              </div>
            </div>

            {/* Arrow connector (desktop only) */}
            <div className="hidden md:block">
              <svg 
                className="w-10 h-10 text-muted" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M17 8l4 4m0 0l-4 4m4-4H3" 
                />
              </svg>
            </div>

            {/* FormBridge AI - Center highlighted */}
            <div className="flex-1">
              <div className="bg-card-secondary radius-card border-2 border-accent-blue p-8 shadow-soft relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-blue text-white text-xs font-medium px-3 py-1 radius-md">
                  AI Powered
                </div>
                <div className="flex justify-center mb-6 mt-2">
                  <svg 
                    className="w-12 h-12 accent-blue" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M13 10V3L4 14h7v7l9-11h-7z" 
                    />
                  </svg>
                </div>
                <h3 className="text-primary text-xl md:text-2xl font-semibold mb-3 text-center">
                  FormBridge AI
                </h3>
                <p className="text-muted text-sm md:text-base text-center">
                  Extract · Classify · Validate
                </p>
              </div>
            </div>

            {/* Arrow connector (desktop only) */}
            <div className="hidden md:block">
              <svg 
                className="w-10 h-10 text-muted" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M17 8l4 4m0 0l-4 4m4-4H3" 
                />
              </svg>
            </div>

            {/* Your systems */}
            <div className="flex-1">
              <div className="bg-card radius-card border border-card p-8 shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                <div className="flex justify-center mb-6">
                  <svg 
                    className="w-12 h-12 accent-blue" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
                    />
                  </svg>
                </div>
                <h3 className="text-primary text-xl md:text-2xl font-semibold mb-3 text-center">
                  Your systems
                </h3>
                <p className="text-muted text-sm md:text-base text-center">
                  Azure · M365 · APIs
                </p>
              </div>
            </div>
          </div>

          {/* Technology badges */}
          <div className="mt-16 flex flex-wrap justify-center gap-4">
            <div className="bg-card-secondary border border-card px-4 py-2 radius-md text-sm text-muted">
              Azure Blob Storage
            </div>
            <div className="bg-card-secondary border border-card px-4 py-2 radius-md text-sm text-muted">
              Azure Document Intelligence
            </div>
            <div className="bg-card-secondary border border-card px-4 py-2 radius-md text-sm text-muted">
              Microsoft Graph API
            </div>
            <div className="bg-card-secondary border border-card px-4 py-2 radius-md text-sm text-muted">
              Azure Cognitive Search
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
