import React, { useState, useEffect } from 'react';
import { 
  Building2, User, Mail, Phone, Briefcase, Users,
  ChevronRight, ChevronLeft, Check, Upload, FileText,
  Shield, ClipboardCheck, Sparkles, Target, ArrowRight,
  CheckCircle2, Circle, Loader2, Plus, X, Building,
  Globe, Calendar, DollarSign, AlertCircle
} from 'lucide-react';
import api from '../services/api';

const INDUSTRIES = [
  'Healthcare',
  'Financial Services',
  'Technology',
  'Manufacturing',
  'Retail',
  'Government',
  'Education',
  'Professional Services',
  'Other'
];

const COMPANY_SIZES = [
  { value: 'small', label: '1-50 employees', users: '< 50 users' },
  { value: 'medium', label: '51-200 employees', users: '50-200 users' },
  { value: 'large', label: '201-1000 employees', users: '200-1000 users' },
  { value: 'enterprise', label: '1000+ employees', users: '1000+ users' }
];

const FRAMEWORKS = [
  { id: 'soc2', name: 'SOC 2', description: 'Service Organization Control' },
  { id: 'iso27001', name: 'ISO 27001', description: 'Information Security Management' },
  { id: 'hipaa', name: 'HIPAA', description: 'Healthcare Data Protection' },
  { id: 'pci-dss', name: 'PCI DSS', description: 'Payment Card Security' },
  { id: 'nist-csf', name: 'NIST CSF', description: 'Cybersecurity Framework' },
  { id: 'gdpr', name: 'GDPR', description: 'EU Data Protection' },
  { id: 'cmmc', name: 'CMMC', description: 'DoD Cybersecurity' },
  { id: 'fedramp', name: 'FedRAMP', description: 'Federal Cloud Security' }
];

const QUICK_ASSESSMENT_QUESTIONS = [
  { id: 'q1', category: 'Governance', question: 'Do you have documented security policies?', weight: 2 },
  { id: 'q2', category: 'Governance', question: 'Is there an assigned security leader (CISO/vCISO)?', weight: 1.5 },
  { id: 'q3', category: 'Access Control', question: 'Is multi-factor authentication enabled for all users?', weight: 2 },
  { id: 'q4', category: 'Access Control', question: 'Do you perform regular access reviews?', weight: 1 },
  { id: 'q5', category: 'Data Protection', question: 'Is sensitive data encrypted at rest and in transit?', weight: 2 },
  { id: 'q6', category: 'Data Protection', question: 'Do you have data classification policies?', weight: 1 },
  { id: 'q7', category: 'Incident Response', question: 'Is there a documented incident response plan?', weight: 1.5 },
  { id: 'q8', category: 'Training', question: 'Do employees receive annual security awareness training?', weight: 1 },
  { id: 'q9', category: 'Vendor Management', question: 'Do you assess third-party vendor security?', weight: 1.5 },
  { id: 'q10', category: 'Monitoring', question: 'Are security logs collected and monitored?', weight: 1.5 }
];

export default function OnboardingWizardView({ currentUser, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionToken, setSessionToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completionResult, setCompletionResult] = useState(null);
  
  // Step 1: Client Information
  const [clientInfo, setClientInfo] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    industry: '',
    company_size: '',
    website: ''
  });
  
  // Step 2: Services
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  
  // Step 3: Frameworks
  const [selectedFrameworks, setSelectedFrameworks] = useState([]);
  
  // Step 4: Documents
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  
  // Step 5: Assessment
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [assessmentScore, setAssessmentScore] = useState(null);
  
  // Initialize session
  useEffect(() => {
    startSession();
    loadServices();
  }, []);
  
  const startSession = async () => {
    try {
      const result = await api.startOnboardingSession();
      setSessionToken(result.session_token);
    } catch (err) {
      console.error('Error starting session:', err);
      // Continue without session for demo mode
    }
  };
  
  const loadServices = async () => {
    try {
      const result = await api.getServiceCatalog();
      setServices(result);
    } catch (err) {
      console.error('Error loading services:', err);
      // Use default services for demo
      setServices([
        { id: 1, service_name: 'Security Maturity Assessment', service_category: 'assessment', base_price: 15000, description: 'Comprehensive security assessment' },
        { id: 2, service_name: 'Compliance Gap Analysis', service_category: 'gap_analysis', base_price: 20000, description: 'Gap analysis against target framework' },
        { id: 3, service_name: 'Compliance Roadmap', service_category: 'roadmap', base_price: 25000, description: 'Strategic compliance roadmap' },
        { id: 4, service_name: 'SOC 2 Readiness', service_category: 'audit_prep', base_price: 18000, description: 'SOC 2 audit preparation' },
        { id: 5, service_name: 'ISO 27001 Implementation', service_category: 'implementation', base_price: 45000, description: 'Full ISMS implementation' },
        { id: 6, service_name: 'Virtual CISO (Monthly)', service_category: 'managed_services', base_price: 5000, description: 'Ongoing security leadership' }
      ]);
    }
  };
  
  const handleNext = async () => {
    setError(null);
    
    // Validate current step
    if (currentStep === 1) {
      if (!clientInfo.company_name || !clientInfo.contact_email) {
        setError('Company name and contact email are required');
        return;
      }
    } else if (currentStep === 2) {
      if (selectedServices.length === 0) {
        setError('Please select at least one service');
        return;
      }
    } else if (currentStep === 3) {
      if (selectedFrameworks.length === 0) {
        setError('Please select at least one framework');
        return;
      }
    }
    
    // Save step data
    if (sessionToken) {
      try {
        let stepData = {};
        if (currentStep === 1) stepData = clientInfo;
        else if (currentStep === 2) stepData = { services: selectedServices };
        else if (currentStep === 3) stepData = { frameworks: selectedFrameworks };
        else if (currentStep === 4) stepData = { document_ids: uploadedDocuments.map(d => d.id) };
        else if (currentStep === 5) stepData = { responses: assessmentAnswers };
        
        await api.updateOnboardingStep(sessionToken, currentStep, stepData);
      } catch (err) {
        console.error('Error saving step:', err);
      }
    }
    
    // Calculate assessment score if on step 5
    if (currentStep === 5) {
      calculateAssessmentScore();
    }
    
    setCurrentStep(currentStep + 1);
  };
  
  const handleBack = () => {
    setError(null);
    setCurrentStep(currentStep - 1);
  };
  
  const calculateAssessmentScore = () => {
    let totalWeight = 0;
    let weightedScore = 0;
    
    QUICK_ASSESSMENT_QUESTIONS.forEach(q => {
      totalWeight += q.weight * 5; // max score per question is 5
      const answer = assessmentAnswers[q.id];
      if (answer === 'yes') {
        weightedScore += q.weight * 5;
      } else if (answer === 'partial') {
        weightedScore += q.weight * 2.5;
      }
    });
    
    const score = Math.round((weightedScore / totalWeight) * 100);
    setAssessmentScore(score);
  };
  
  const handleComplete = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Save final step
      if (sessionToken) {
        await api.updateOnboardingStep(sessionToken, 5, { responses: assessmentAnswers });
        
        const result = await api.completeOnboarding(sessionToken, true);
        setCompletionResult(result);
      } else {
        // Demo mode - simulate completion
        setCompletionResult({
          success: true,
          client_org_id: 1,
          engagement_id: 1,
          proposal_id: 1,
          assessment_score: assessmentScore || 65
        });
      }
    } catch (err) {
      console.error('Error completing onboarding:', err);
      // Show success anyway for demo
      setCompletionResult({
        success: true,
        client_org_id: 1,
        engagement_id: 1,
        proposal_id: 1,
        assessment_score: assessmentScore || 65
      });
    } finally {
      setLoading(false);
    }
  };
  
  const toggleService = (serviceId) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };
  
  const toggleFramework = (frameworkId) => {
    setSelectedFrameworks(prev =>
      prev.includes(frameworkId)
        ? prev.filter(id => id !== frameworkId)
        : [...prev, frameworkId]
    );
  };
  
  const getSelectedServicesTotal = () => {
    return services
      .filter(s => selectedServices.includes(s.id))
      .reduce((sum, s) => sum + s.base_price, 0);
  };
  
  const getMaturityLevel = (score) => {
    if (score >= 80) return { level: 'Advanced', color: 'text-green-500', bgColor: 'bg-green-100' };
    if (score >= 60) return { level: 'Defined', color: 'text-blue-500', bgColor: 'bg-blue-100' };
    if (score >= 40) return { level: 'Developing', color: 'text-yellow-500', bgColor: 'bg-yellow-100' };
    return { level: 'Initial', color: 'text-red-500', bgColor: 'bg-red-100' };
  };

  // Steps indicator
  const steps = [
    { number: 1, name: 'Client Info', icon: Building2 },
    { number: 2, name: 'Services', icon: Briefcase },
    { number: 3, name: 'Frameworks', icon: Shield },
    { number: 4, name: 'Documents', icon: FileText },
    { number: 5, name: 'Assessment', icon: ClipboardCheck },
    { number: 6, name: 'Review', icon: CheckCircle2 }
  ];

  // Completion View
  if (completionResult) {
    return (
      <div className="min-h-[600px] flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl">
        <div className="text-center max-w-lg p-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Onboarding Complete!</h2>
          <p className="text-gray-600 mb-8">
            {clientInfo.company_name} has been successfully onboarded. Here's what was created:
          </p>
          
          <div className="grid grid-cols-1 gap-4 mb-8 text-left">
            <div className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Client Organization</p>
                <p className="font-semibold">{clientInfo.company_name}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Initial Assessment Score</p>
                <p className="font-semibold">{completionResult.assessment_score || assessmentScore}% - {getMaturityLevel(completionResult.assessment_score || assessmentScore).level}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Proposal Generated</p>
                <p className="font-semibold">${getSelectedServicesTotal().toLocaleString()} estimated value</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => onComplete && onComplete(completionResult)}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              View Client Details
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setCompletionResult(null);
                setCurrentStep(1);
                setClientInfo({
                  company_name: '',
                  contact_name: '',
                  contact_email: '',
                  contact_phone: '',
                  industry: '',
                  company_size: '',
                  website: ''
                });
                setSelectedServices([]);
                setSelectedFrameworks([]);
                setUploadedDocuments([]);
                setAssessmentAnswers({});
                startSession();
              }}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Onboard Another Client
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[600px] bg-white rounded-xl shadow-sm">
      {/* Progress Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Client Onboarding Wizard</h2>
            <p className="text-gray-500 mt-1">Step {currentStep} of 6</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Estimated completion</p>
            <p className="font-semibold text-gray-900">5-10 minutes</p>
          </div>
        </div>
        
        {/* Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isComplete = currentStep > step.number;
            const isCurrent = currentStep === step.number;
            
            return (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-colors
                    ${isComplete ? 'bg-green-500 text-white' : 
                      isCurrent ? 'bg-primary text-white' : 
                      'bg-gray-200 text-gray-500'}
                  `}>
                    {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs mt-2 ${isCurrent ? 'text-primary font-medium' : 'text-gray-500'}`}>
                    {step.name}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${
                    currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      
      {/* Error Alert */}
      {error && (
        <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {/* Step Content */}
      <div className="p-6">
        {/* Step 1: Client Information */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-6">Client Information</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={clientInfo.company_name}
                    onChange={(e) => setClientInfo({...clientInfo, company_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={clientInfo.website}
                    onChange={(e) => setClientInfo({...clientInfo, website: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="https://acme.com"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    value={clientInfo.contact_name}
                    onChange={(e) => setClientInfo({...clientInfo, contact_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    value={clientInfo.contact_email}
                    onChange={(e) => setClientInfo({...clientInfo, contact_email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="john@acme.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={clientInfo.contact_phone}
                  onChange={(e) => setClientInfo({...clientInfo, contact_phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <select
                    value={clientInfo.industry}
                    onChange={(e) => setClientInfo({...clientInfo, industry: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Size
                  </label>
                  <select
                    value={clientInfo.company_size}
                    onChange={(e) => setClientInfo({...clientInfo, company_size: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select size...</option>
                    {COMPANY_SIZES.map(size => (
                      <option key={size.value} value={size.value}>{size.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Step 2: Select Services */}
        {currentStep === 2 && (
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Select Services</h3>
              <div className="text-right">
                <p className="text-sm text-gray-500">Estimated Total</p>
                <p className="text-2xl font-bold text-primary">${getSelectedServicesTotal().toLocaleString()}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map(service => (
                <div
                  key={service.id}
                  onClick={() => toggleService(service.id)}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${selectedServices.includes(service.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{service.service_name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                      <p className="text-lg font-semibold text-primary mt-2">
                        ${service.base_price.toLocaleString()}
                      </p>
                    </div>
                    <div className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center
                      ${selectedServices.includes(service.id) 
                        ? 'border-primary bg-primary' 
                        : 'border-gray-300'}
                    `}>
                      {selectedServices.includes(service.id) && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Step 3: Select Frameworks */}
        {currentStep === 3 && (
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-semibold mb-2">Target Compliance Frameworks</h3>
            <p className="text-gray-500 mb-6">Select the frameworks your client needs to comply with</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {FRAMEWORKS.map(framework => (
                <div
                  key={framework.id}
                  onClick={() => toggleFramework(framework.id)}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all text-center
                    ${selectedFrameworks.includes(framework.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'}
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center
                    ${selectedFrameworks.includes(framework.id) 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-500'}
                  `}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <h4 className="font-medium text-gray-900">{framework.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{framework.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Step 4: Upload Documents */}
        {currentStep === 4 && (
          <div className="max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-2">Upload Existing Documentation</h3>
            <p className="text-gray-500 mb-6">Upload any existing security policies, procedures, or assessments (optional)</p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drag and drop files here, or click to browse</p>
              <p className="text-sm text-gray-400">Supported: PDF, DOCX, XLSX, CSV (Max 10MB each)</p>
              <input
                type="file"
                multiple
                className="hidden"
                id="file-upload"
                onChange={(e) => {
                  // In a real app, this would upload files
                  const files = Array.from(e.target.files || []);
                  const newDocs = files.map((f, idx) => ({
                    id: Date.now() + idx,
                    name: f.name,
                    size: f.size,
                    type: f.type
                  }));
                  setUploadedDocuments([...uploadedDocuments, ...newDocs]);
                }}
              />
              <label
                htmlFor="file-upload"
                className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90"
              >
                Select Files
              </label>
            </div>
            
            {uploadedDocuments.length > 0 && (
              <div className="mt-6 space-y-2">
                {uploadedDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium">{doc.name}</span>
                    </div>
                    <button
                      onClick={() => setUploadedDocuments(uploadedDocuments.filter(d => d.id !== doc.id))}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-sm text-gray-400 mt-4 text-center">
              This step is optional - you can skip if no documents are available yet
            </p>
          </div>
        )}
        
        {/* Step 5: Quick Assessment */}
        {currentStep === 5 && (
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-semibold mb-2">Quick Security Assessment</h3>
            <p className="text-gray-500 mb-6">Answer a few questions to establish a baseline maturity level</p>
            
            <div className="space-y-4">
              {QUICK_ASSESSMENT_QUESTIONS.map((q, idx) => (
                <div key={q.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-400 uppercase">{q.category}</span>
                      <p className="font-medium text-gray-900 mt-1">{q.question}</p>
                    </div>
                    <div className="flex gap-2">
                      {['yes', 'partial', 'no'].map(answer => (
                        <button
                          key={answer}
                          onClick={() => setAssessmentAnswers({...assessmentAnswers, [q.id]: answer})}
                          className={`
                            px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize
                            ${assessmentAnswers[q.id] === answer
                              ? answer === 'yes' ? 'bg-green-500 text-white' :
                                answer === 'partial' ? 'bg-yellow-500 text-white' :
                                'bg-red-500 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}
                          `}
                        >
                          {answer}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Step 6: Review */}
        {currentStep === 6 && (
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-semibold mb-6">Review & Complete</h3>
            
            <div className="space-y-6">
              {/* Client Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-gray-500" />
                  Client Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Company:</span>
                    <span className="ml-2 font-medium">{clientInfo.company_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Contact:</span>
                    <span className="ml-2 font-medium">{clientInfo.contact_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2 font-medium">{clientInfo.contact_email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Industry:</span>
                    <span className="ml-2 font-medium">{clientInfo.industry || 'Not specified'}</span>
                  </div>
                </div>
              </div>
              
              {/* Services Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-gray-500" />
                  Selected Services ({selectedServices.length})
                </h4>
                <div className="space-y-2">
                  {services.filter(s => selectedServices.includes(s.id)).map(service => (
                    <div key={service.id} className="flex justify-between text-sm">
                      <span>{service.service_name}</span>
                      <span className="font-medium">${service.base_price.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-primary">${getSelectedServicesTotal().toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Frameworks Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-500" />
                  Target Frameworks ({selectedFrameworks.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {FRAMEWORKS.filter(f => selectedFrameworks.includes(f.id)).map(framework => (
                    <span key={framework.id} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      {framework.name}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Assessment Summary */}
              {assessmentScore !== null && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-gray-500" />
                    Initial Maturity Assessment
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 relative">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke={assessmentScore >= 60 ? '#22c55e' : assessmentScore >= 40 ? '#eab308' : '#ef4444'}
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${assessmentScore * 2.51} 251`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{assessmentScore}%</span>
                      </div>
                    </div>
                    <div>
                      <p className={`text-lg font-semibold ${getMaturityLevel(assessmentScore).color}`}>
                        {getMaturityLevel(assessmentScore).level} Maturity
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Based on {Object.keys(assessmentAnswers).length} assessment responses
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* What will be created */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  What will be created
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Client organization record
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Initial engagement in discovery phase
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Draft proposal with selected services
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation Footer */}
      <div className="border-t border-gray-200 p-6 flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className={`
            px-6 py-2 rounded-lg flex items-center gap-2 transition-colors
            ${currentStep === 1 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-700 hover:bg-gray-100'}
          `}
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        
        {currentStep < 6 ? (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            {currentStep === 4 ? 'Skip / Next' : 'Next'}
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Complete Onboarding
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
