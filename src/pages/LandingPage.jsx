/**
 * Public marketing / early-access landing page.
 *
 * Shown to unauthenticated visitors at "/" (no ?invite= param). Captures
 * early-access signups via POST /api/waitlist/signup — no auth required.
 */

import { useState } from 'react';
import {
  Shield, Sparkles, DollarSign, Network, MessageSquare, CheckCircle2,
  ArrowRight, Loader2, AlertCircle, Users, Zap, Lock,
} from 'lucide-react';
import api from '../services/api';

const FRAMEWORKS = ['SOC 2', 'ISO 27001', 'HIPAA', 'PCI-DSS', 'NIST', 'FedRAMP', 'GDPR', 'CIS', 'NIST AI RMF'];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'];

const FEATURES = [
  {
    icon: Shield,
    title: 'Multi-framework control mapping',
    description: 'One control library mapped across SOC 2, ISO 27001, HIPAA, PCI-DSS, NIST, FedRAMP, and AI-specific frameworks like NIST AI RMF and MITRE ATLAS.',
  },
  {
    icon: DollarSign,
    title: 'Business-value TCO analyzer',
    description: 'Three implementation tiers — Conservative, Balanced, Most Aggressive — each priced against real market tooling and modeled ROI tied to your ARR and breach risk.',
  },
  {
    icon: Network,
    title: 'Bring-your-own-credential integrations',
    description: 'Connect Okta and other IAM tools with your own read-only API tokens. Encrypted at rest, never shared, structurally isolated per tenant via MCP.',
  },
  {
    icon: MessageSquare,
    title: 'AI Controls Assistant',
    description: 'Ask what to fix first. Answers are grounded in your live control status — no invented control IDs, no generic advice.',
  },
  {
    icon: Sparkles,
    title: 'AI intake wizard',
    description: 'Answer a few questions about your business and get a scored framework recommendation with a phased roadmap.',
  },
  {
    icon: Users,
    title: 'Tenant Trust Portal',
    description: 'A shareable, evidence-backed trust score you can hand to prospects and auditors — without exposing raw internal data.',
  },
];

export default function LandingPage({ onRequestLogin }) {
  const [form, setForm] = useState({
    name: '', email: '', company: '', role_title: '', company_size: '',
    use_case: '', frameworks_interested: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const set = (field) => (e) => {
    setError('');
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const toggleFramework = (fw) => {
    setForm((prev) => ({
      ...prev,
      frameworks_interested: prev.frameworks_interested.includes(fw)
        ? prev.frameworks_interested.filter((f) => f !== fw)
        : [...prev.frameworks_interested, fw],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.waitlistSignup(form);
      setResult(res);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToForm = () => {
    document.getElementById('early-access-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
      {/* Nav */}
      <nav className="border-b border-slate-800/80 sticky top-0 bg-slate-900/80 backdrop-blur z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-semibold text-lg">Compliance Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={scrollToForm}
              className="hidden sm:inline text-sm text-slate-300 hover:text-white transition"
            >
              Request Access
            </button>
            <button
              type="button"
              onClick={onRequestLogin}
              className="text-sm font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-4 py-2 transition"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" />
            Now accepting early-access customers
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Compliance automation that actually knows{' '}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              what to fix next
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Multi-framework control mapping, an AI assistant grounded in your live gaps,
            and a business-value TCO analyzer that turns compliance debt into a
            prioritized, costed roadmap — not a spreadsheet.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={scrollToForm}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg px-6 py-3 text-sm transition-colors shadow-lg shadow-blue-600/25"
            >
              Request Early Access
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onRequestLogin}
              className="text-sm text-slate-300 hover:text-white transition px-4 py-3"
            >
              Already invited? Sign in →
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 hover:border-slate-600 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">How early access works</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { step: '1', title: 'Request access', desc: 'Tell us about your compliance goals below — takes under a minute.' },
            { step: '2', title: 'Get invited', desc: "We review requests and send a personal invite as trial seats open up." },
            { step: '3', title: 'Trial the platform', desc: 'Full access on your own data. Your usage directly shapes what we build next.' },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mx-auto mb-4">
                {s.step}
              </div>
              <h3 className="font-semibold mb-1.5">{s.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Signup form */}
      <section id="early-access-form" className="max-w-2xl mx-auto px-6 py-16">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-8">
          {result ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {result.already_registered ? "You're already on the list" : "You're on the list!"}
              </h3>
              <p className="text-sm text-slate-400">
                {result.position
                  ? `You're #${result.position} in the queue. `
                  : ''}
                We'll email you an invite as trial seats open up.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-1">Request early access</h2>
              <p className="text-sm text-slate-400 mb-6">
                Tell us a bit about your team so we can prioritize invites.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name *</label>
                    <input
                      type="text" required value={form.name} onChange={set('name')}
                      placeholder="Jane Smith"
                      className="w-full bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 rounded-lg py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Work email *</label>
                    <input
                      type="email" required value={form.email} onChange={set('email')}
                      placeholder="you@company.com"
                      className="w-full bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 rounded-lg py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Company</label>
                    <input
                      type="text" value={form.company} onChange={set('company')}
                      placeholder="Acme Corp"
                      className="w-full bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 rounded-lg py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Your role</label>
                    <input
                      type="text" value={form.role_title} onChange={set('role_title')}
                      placeholder="Head of Security"
                      className="w-full bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 rounded-lg py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Company size</label>
                  <div className="flex flex-wrap gap-2">
                    {COMPANY_SIZES.map((size) => (
                      <button
                        key={size} type="button"
                        onClick={() => setForm((p) => ({ ...p, company_size: size }))}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                          form.company_size === size
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                            : 'bg-slate-700/40 border-slate-600 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {size} employees
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Frameworks you care about
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FRAMEWORKS.map((fw) => (
                      <button
                        key={fw} type="button"
                        onClick={() => toggleFramework(fw)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                          form.frameworks_interested.includes(fw)
                            ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                            : 'bg-slate-700/40 border-slate-600 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {fw}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    What are you hoping to solve? <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={3} value={form.use_case} onChange={set('use_case')}
                    placeholder="e.g. Need SOC 2 Type II before our next enterprise deal closes."
                    className="w-full bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 rounded-lg py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg py-3 text-sm transition-colors shadow-lg shadow-blue-600/20"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Request Early Access
                </button>

                <p className="flex items-center gap-1.5 justify-center text-xs text-slate-500 pt-1">
                  <Lock className="w-3 h-3" />
                  We'll only use this to reach out about early access.
                </p>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} Compliance Platform</span>
          <button type="button" onClick={onRequestLogin} className="hover:text-slate-300 transition">
            Already have an account? Sign in
          </button>
        </div>
      </footer>
    </div>
  );
}
