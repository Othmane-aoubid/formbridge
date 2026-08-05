import Link from 'next/link';
import ArchitectureSection from '@/components/ArchitectureSection';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-main">
      <header className="bg-main/80 backdrop-blur-md sticky top-0 z-50 border-b border-card">
        <div className="max-w-[1280px] mx-auto px-6 md:px-16 lg:px-24">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="text-primary text-xl font-bold">
              FormBridge
            </Link>
            <nav className="hidden md:flex space-x-8">
              <Link href="#features" className="text-secondary hover:text-primary font-medium transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-secondary hover:text-primary font-medium transition-colors">
                How It Works
              </Link>
              <Link href="#pricing" className="text-secondary hover:text-primary font-medium transition-colors">
                Pricing
              </Link>
            </nav>
            <div className="flex space-x-4">
              <Link
                href="/signin"
                className="text-secondary hover:text-primary font-medium px-4 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-primary-cta text-white px-6 py-2 radius-lg font-medium bg-primary-cta-hover transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-24 lg:py-32 bg-main">
          <div className="max-w-[1280px] mx-auto px-6 md:px-16 lg:px-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h1 className="text-primary text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                  <span className="block">Automated Document</span>
                  <span className="block accent-blue">Processing Platform</span>
                </h1>
                <p className="mt-8 max-w-xl text-secondary text-lg leading-relaxed">
                  Transform your document workflow with AI-powered OCR, human-in-the-loop review, and seamless integrations
                </p>
                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/signup"
                    className="flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-primary-cta radius-lg bg-primary-cta-hover transition-all duration-200"
                  >
                    Start Free Trial
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="flex items-center justify-center px-8 py-4 text-base font-medium text-primary border border-card radius-lg hover:border-accent-blue transition-all duration-200"
                  >
                    Learn More
                  </Link>
                </div>
                <div className="mt-8 flex items-center gap-6 text-sm text-muted">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 accent-blue" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Free 14-day trial</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 accent-blue" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>No credit card required</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-card radius-card border border-card shadow-soft p-6">
                  <div className="bg-card-secondary radius-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-primary font-semibold">Dashboard Overview</div>
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-card radius-md p-3">
                        <div className="text-muted text-xs mb-1">Documents</div>
                        <div className="text-primary text-xl font-bold">1,247</div>
                      </div>
                      <div className="bg-card radius-md p-3">
                        <div className="text-muted text-xs mb-1">Processed</div>
                        <div className="text-primary text-xl font-bold">98.5%</div>
                      </div>
                      <div className="bg-card radius-md p-3">
                        <div className="text-muted text-xs mb-1">Pending</div>
                        <div className="text-primary text-xl font-bold">23</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-card-secondary radius-lg p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                        <svg className="w-5 h-5 accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-primary text-sm font-medium">invoice_001.pdf</div>
                        <div className="text-muted text-xs">Processed 2 min ago</div>
                      </div>
                      <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs radius-md">Complete</div>
                    </div>
                    <div className="bg-card-secondary radius-lg p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                        <svg className="w-5 h-5 accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-primary text-sm font-medium">contract_v2.docx</div>
                        <div className="text-muted text-xs">Processing...</div>
                      </div>
                      <div className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs radius-md">In Progress</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ArchitectureSection />

        <section id="features" className="py-28 bg-alt">
          <div className="max-w-[1280px] mx-auto px-6 md:px-16 lg:px-24">
            <div className="text-center mb-20">
              <h2 className="text-primary text-4xl sm:text-5xl font-bold mb-6">
                Everything you need to process documents
              </h2>
              <p className="text-secondary text-lg max-w-2xl mx-auto">
                Powerful features to automate your document workflow
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-card radius-card border border-card p-6 shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                    <svg className="h-6 w-6 accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-primary text-lg font-semibold">Easy Upload</h3>
                  </div>
                </div>
                <p className="text-secondary">
                  Upload documents directly to Azure Blob Storage with secure SAS URLs
                </p>
              </div>

              <div className="bg-card radius-card border border-card p-6 shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                    <svg className="h-6 w-6 accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-primary text-lg font-semibold">OCR Extraction</h3>
                  </div>
                </div>
                <p className="text-secondary">
                  Powered by Azure Document Intelligence for accurate data extraction
                </p>
              </div>

              <div className="bg-card radius-card border border-card p-6 shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                    <svg className="h-6 w-6 accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-primary text-lg font-semibold">Human Review</h3>
                  </div>
                </div>
                <p className="text-secondary">
                  Review and correct low-confidence extractions with an intuitive interface
                </p>
              </div>

              <div className="bg-card radius-card border border-card p-6 shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                    <svg className="h-6 w-6 accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-primary text-lg font-semibold">Searchable Archive</h3>
                  </div>
                </div>
                <p className="text-secondary">
                  Full-text search powered by Azure Cognitive Search
                </p>
              </div>

              <div className="bg-card radius-card border border-card p-6 shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                    <svg className="h-6 w-6 accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-primary text-lg font-semibold">Audit Trail</h3>
                  </div>
                </div>
                <p className="text-secondary">
                  Complete audit history for compliance and tracking
                </p>
              </div>

              <div className="bg-card radius-card border border-card p-6 shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                    <svg className="h-6 w-6 accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-primary text-lg font-semibold">Integrations</h3>
                  </div>
                </div>
                <p className="text-secondary">
                  Export to ERP, DMS, and other downstream systems
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-28 bg-main">
          <div className="max-w-[1280px] mx-auto px-6 md:px-16 lg:px-24">
            <div className="text-center mb-20">
              <h2 className="text-primary text-4xl sm:text-5xl font-bold mb-6">
                How It Works
              </h2>
              <p className="text-secondary text-lg max-w-2xl mx-auto">
                Simple 3-step process to automate your documents
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-accent-blue text-white rounded-full w-20 h-20 flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-card">
                  1
                </div>
                <h3 className="text-primary text-2xl font-semibold mb-3">Upload</h3>
                <p className="text-secondary">
                  Upload your documents to our secure cloud storage
                </p>
              </div>

              <div className="text-center">
                <div className="bg-accent-blue text-white rounded-full w-20 h-20 flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-card">
                  2
                </div>
                <h3 className="text-primary text-2xl font-semibold mb-3">Process</h3>
                <p className="text-secondary">
                  AI extracts data with human review for accuracy
                </p>
              </div>

              <div className="text-center">
                <div className="bg-accent-blue text-white rounded-full w-20 h-20 flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-card">
                  3
                </div>
                <h3 className="text-primary text-2xl font-semibold mb-3">Export</h3>
                <p className="text-secondary">
                  Export processed data to your systems
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-28 bg-alt">
          <div className="max-w-[1280px] mx-auto px-6 md:px-16 lg:px-24">
            <div className="bg-card radius-card border border-card shadow-soft p-16 text-center">
              <h2 className="text-primary text-4xl sm:text-5xl font-bold mb-6">
                Ready to transform your document workflow?
              </h2>
              <p className="text-secondary text-lg max-w-2xl mx-auto mb-10">
                Start your free 14-day trial today. No credit card required.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-10 py-4 text-lg font-medium text-white bg-primary-cta radius-lg bg-primary-cta-hover transition-all duration-200"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-main border-t border-card py-12">
        <div className="max-w-[1280px] mx-auto px-6 md:px-16 lg:px-24">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-primary text-lg font-semibold mb-4">FormBridge</h3>
              <p className="text-muted text-sm">
                Automated document processing platform for modern businesses
              </p>
            </div>
            <div>
              <h4 className="text-primary text-lg font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted text-sm">
                <li><Link href="#features" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                <li><Link href="#how-it-works" className="hover:text-primary transition-colors">How It Works</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-primary text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted text-sm">
                <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-primary text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-muted text-sm">
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Security</a></li>
              </ul>
            </div>
            </div>
          <div className="border-t border-card mt-8 pt-8 text-center text-muted text-sm">
            <p>© 2024 FormBridge. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
