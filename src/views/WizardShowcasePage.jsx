/**
 * WizardShowcasePage — Full-page showcase / launch pad for the
 * AI Compliance Intake Assessment Wizard.
 *
 * Accessible via the main nav ("AI Assessment") and acts as the
 * canonical entry-point for the wizard flow.
 */

import React, { useState } from 'react';
import {
  Sparkles, ArrowRight, ChevronRight, Building2, Shield, Target,
  Map, CheckCircle2, Clock, DollarSign, Download, Star, Zap,
  BarChart3, Globe, Users, Brain, CreditCard, Activity,
  FileCheck, Award, PlayCircle, ChevronDown, TrendingUp,
  AlertTriangle, Info, Layers, BookOpen
} from 'lucide-react';
import IntakeWizardView from './IntakeWizardView';

// ─── Static preview data (shown even before the user runs the wizard) ───────

const FRAMEWORK_PREVIEW = [
  { id: 'SOC2',         name: 'SOC 2 Type II',     icon: '🔐', color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   use: 'SaaS / Enterprise' },
  { id: 'ISO27001',     name: 'ISO 27001:2022',     icon: '🌐', color: 'text-green-500',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  use: 'Global / EU' },
  { id: 'HIPAA',        name: 'HIPAA',              icon: '🏥', color: 'text-red-500',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    use: 'Healthcare' },
  { id: 'PCI_DSS',      name: 'PCI DSS v4.0',       icon: '💳', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', use: 'Payments' },
  { id: 'NIST_800-53',  name: 'NIST 800-53',        icon: '🏛️',  color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', use: 'Federal' },
  { id: 'FedRAMP',      name: 'FedRAMP',            icon: '🦅', color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', use: 'Gov Cloud' },
  { id: 'NIST_800-171', name: 'NIST 800-171',       icon: '🛡️', color: 'text-teal-500',   bg: 'bg-teal-500/10',   border: 'border-teal-500/20',   use: 'DoD Contracts' },
  { id: 'CIS',          name: 'CIS Controls v8',    icon: '⚙️', color: 'text-cyan-500',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   use: 'Foundation' },
  { id: 'NIST_AI_RMF',  name: 'NIST AI RMF 1.0',   icon: '🤖', color: 'text-pink-500',   bg: 'bg-pink-500/10',   border: 'border-pink-500/20',   use: 'AI Products' },
  { id: 'MITRE_ATLAS',  name: 'MITRE ATLAS',        icon: '🎯', color: 'text-amber-500',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  use: 'AI Red Team' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Building2,
    title: 'Tell us about your organisation',
    body: 'Industry, size, geography, and the types of data you handle. Takes under 60 seconds.',
    color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
  },
  {
    step: '02',
    icon: Shield,
    title: 'We map your regulatory landscape',
    body: 'Government contracts, healthcare data, payment processing, EU customers — each signal narrows the framework list.',
    color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20',
  },
  {
    step: '03',
    icon: Sparkles,
    title: 'AI scores 10 frameworks for you',
    body: 'Our scoring engine runs every framework against your profile and ranks them Critical / High / Medium / Optional.',
    color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20',
  },
  {
    step: '04',
    icon: Map,
    title: 'Receive a phased roadmap',
    body: 'A 0-90 / 90-180 / 180-365 day implementation plan, estimated investment ranges, and 5 quick wins you can start today.',
    color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20',
  },
];

const SAMPLE_OUTPUT = [
  { name: 'HIPAA Security Rule',  priority: 'Critical', score: 100, months: 6,  costRange: '$20K–$80K',    phase: '0-90 days' },
  { name: 'SOC 2 Type II',        priority: 'Critical', score: 96,  months: 9,  costRange: '$30K–$120K',   phase: '90-180 days' },
  { name: 'ISO 27001:2022',       priority: 'High',     score: 75,  months: 12, costRange: '$50K–$200K',   phase: '90-180 days' },
  { name: 'CIS Controls v8',      priority: 'Medium',   score: 40,  months: 6,  costRange: '$15K–$60K',    phase: 'Quick win' },
];

const PRIORITY_STYLE = {
  Critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  High:     'bg-orange-500/15 text-orange-400 border-orange-500/30',
  Medium:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
};

const STATS = [
  { value: '10',     label: 'Frameworks scored',        icon: BarChart3 },
  { value: '< 5min', label: 'Assessment time',           icon: Clock },
  { value: '4',      label: 'Implementation phases',     icon: Layers },
  { value: '100%',   label: 'Explainable AI',            icon: Brain },
];

const AUDIENCE = [
  { title: 'Winning enterprise deals',    icon: TrendingUp, desc: 'Show prospects you have SOC 2 / ISO 27001 on the roadmap before they even ask.' },
  { title: 'DoD / federal contracting',   icon: Shield,     desc: 'Map NIST 800-171 and CMMC requirements before signing the DFARS clause.' },
  { title: 'Building AI products',        icon: Brain,      desc: 'Get NIST AI RMF and MITRE ATLAS scored against your specific AI risk profile.' },
  { title: 'Healthcare / PHI data',       icon: Activity,   desc: 'Identify exactly which HIPAA controls apply to your data handling workflow.' },
  { title: 'EU / global expansion',       icon: Globe,      desc: 'Understand ISO 27001 requirements before your first EU customer asks for them.' },
  { title: 'Investors & due diligence',   icon: FileCheck,  desc: 'Show a credible compliance roadmap during Series A / M&A due diligence.' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function WizardShowcasePage() {
  const [showWizard, setShowWizard] = useState(false);
  const [showSampleExpanded, setShowSampleExpanded] = useState(false);

  return (
    <>
      <div className="space-y-12 pb-16">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-purple-500/10 to-blue-500/10 border border-primary/20 p-8 md:p-12">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Powered · Instant · No LLM Required
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight mb-4">
                Find your compliance<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
                  roadmap in 5 minutes
                </span>
              </h1>

              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                Answer a few questions about your organisation and our scoring engine
                recommends the right frameworks, ranks them by priority, and generates
                a phased implementation roadmap — instantly.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowWizard(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 font-semibold text-base shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles className="w-5 h-5" />
                  Start My Free Assessment
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowSampleExpanded(v => !v)}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 border border-[hsl(var(--border))] bg-card rounded-xl hover:bg-muted text-foreground font-medium text-base transition-colors"
                >
                  <PlayCircle className="w-5 h-5 text-primary" />
                  Preview Sample Output
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSampleExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Mini stat cards */}
            <div className="grid grid-cols-2 gap-3 lg:w-64 shrink-0">
              {STATS.map(stat => (
                <div key={stat.label} className="bg-card/80 border border-[hsl(var(--border))] rounded-xl p-4 backdrop-blur-sm">
                  <stat.icon className="w-4 h-4 text-primary mb-2" />
                  <div className="text-xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sample output (expandable) ────────────────────────────────────── */}
        {showSampleExpanded && (
          <div className="bg-card border border-[hsl(var(--border))] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[hsl(var(--border))] bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground ml-2">Sample output · Healthcare SaaS, 100 employees</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-green-500">
                <CheckCircle2 className="w-3.5 h-3.5" /> Assessment complete
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">Profile:</span> Healthcare SaaS · 51–200 employees · PHI data · Enterprise customers · Seeking Series B
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Frameworks scored', value: '10',      color: 'text-primary' },
                  { label: 'Recommended',        value: '3',       color: 'text-green-500' },
                  { label: 'Est. timeline',       value: '12 mo',   color: 'text-orange-500' },
                  { label: 'Est. investment',     value: '$100K–$400K', color: 'text-blue-500' },
                ].map(c => (
                  <div key={c.label} className="bg-muted/30 rounded-xl p-3">
                    <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {SAMPLE_OUTPUT.map((rec, i) => (
                  <div key={rec.name} className="flex items-center gap-3 bg-muted/20 border border-[hsl(var(--border))] rounded-xl px-4 py-3">
                    <span className="text-xs text-muted-foreground w-4 shrink-0">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{rec.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_STYLE[rec.priority]}`}>{rec.priority}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{rec.phase}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-foreground">{rec.score}/100</div>
                      <div className="text-xs text-muted-foreground">{rec.costRange} · {rec.months}mo</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-semibold text-foreground">Quick wins to start this week</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                  {['Enable MFA on all admin accounts', 'Inventory all systems & data stores',
                    'Deploy centralised logging / SIEM', 'Document an Incident Response policy',
                    'Conduct a controls gap assessment'].map(qw => (
                    <div key={qw} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" /> {qw}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowWizard(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 font-medium text-sm transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Run Your Own Assessment
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">How it works</h2>
            <p className="text-muted-foreground">Four steps from zero to a prioritised compliance roadmap</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.step} className={`relative border rounded-xl p-5 ${item.bg} ${item.border}`}>
                {i < HOW_IT_WORKS.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                )}
                <div className={`text-4xl font-black opacity-20 ${item.color} mb-3`}>{item.step}</div>
                <item.icon className={`w-6 h-6 ${item.color} mb-3`} />
                <h3 className="font-semibold text-foreground mb-1 text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Supported frameworks ─────────────────────────────────────────── */}
        <div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">All 10 frameworks scored</h2>
            <p className="text-muted-foreground">Every assessment checks your profile against all of these simultaneously</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {FRAMEWORK_PREVIEW.map(fw => (
              <div key={fw.id} className={`border rounded-xl p-4 text-center ${fw.bg} ${fw.border} hover:scale-[1.02] transition-transform cursor-default`}>
                <div className="text-2xl mb-2">{fw.icon}</div>
                <div className={`text-xs font-bold ${fw.color} mb-0.5`}>{fw.name}</div>
                <div className="text-xs text-muted-foreground">{fw.use}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Who it's for ──────────────────────────────────────────────────── */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Built for your situation</h2>
            <p className="text-muted-foreground">The wizard adapts its recommendations to your exact context</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AUDIENCE.map(a => (
              <div key={a.title} className="flex items-start gap-4 bg-card border border-[hsl(var(--border))] rounded-xl p-5 hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <a.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm mb-1">{a.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-purple-600 p-8 text-center">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoLTZ2LTZoNnptMCAwdi02aDZ2NmgtNnptLTEyIDZ2Nmg2di02aC02em0wIDBoLTZ2Nmg2di02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="relative">
            <Sparkles className="w-10 h-10 text-white/80 mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
              Your compliance roadmap is 5 minutes away
            </h2>
            <p className="text-white/80 mb-6 max-w-xl mx-auto">
              No consulting fees. No waiting. Just answers about your organisation
              and a framework roadmap tailored to your exact situation.
            </p>
            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary rounded-xl hover:bg-white/90 font-bold text-base shadow-xl transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-5 h-5" />
              Start My Assessment — It's Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-white/50 text-xs mt-4">Takes less than 5 minutes · No account required to preview</p>
          </div>
        </div>

      </div>

      {/* Wizard modal */}
      {showWizard && <IntakeWizardView onClose={() => setShowWizard(false)} />}
    </>
  );
}
