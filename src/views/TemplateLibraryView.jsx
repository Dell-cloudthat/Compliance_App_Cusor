import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, Copy, Edit, Trash2,
  ClipboardCheck, Target, Lightbulb, FileCheck, Building2,
  Shield, Clock, Star, Download, Eye, ChevronDown, X,
  CheckCircle2, AlertTriangle, Briefcase, Tag, BookOpen
} from 'lucide-react';
import api from '../services/api';

const TEMPLATE_TYPES = [
  { id: 'assessment', name: 'Assessments', icon: ClipboardCheck, color: 'bg-blue-500' },
  { id: 'recommendation', name: 'Recommendations', icon: Lightbulb, color: 'bg-yellow-500' },
  { id: 'report', name: 'Reports', icon: FileCheck, color: 'bg-green-500' }
];

const INDUSTRIES = ['Healthcare', 'Finance', 'Technology', 'Manufacturing', 'Retail', 'Government', 'General'];
const FRAMEWORKS = ['SOC 2', 'ISO 27001', 'HIPAA', 'PCI DSS', 'NIST CSF', 'CMMC', 'GDPR'];
const CATEGORIES = ['Policy', 'Process', 'Technology', 'People', 'Governance'];

export default function TemplateLibraryView({ currentUser }) {
  const [activeType, setActiveType] = useState('assessment');
  const [templates, setTemplates] = useState({
    assessment: [],
    recommendation: [],
    report: []
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('');
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  useEffect(() => {
    loadTemplates();
  }, []);
  
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const assessments = await api.getIndustryTemplates();
      setTemplates(prev => ({
        ...prev,
        assessment: assessments || getDefaultAssessmentTemplates()
      }));
    } catch (err) {
      console.error('Error loading templates:', err);
      setTemplates({
        assessment: getDefaultAssessmentTemplates(),
        recommendation: getDefaultRecommendationTemplates(),
        report: getDefaultReportTemplates()
      });
    } finally {
      setLoading(false);
    }
  };
  
  const getDefaultAssessmentTemplates = () => [
    {
      id: 1,
      template_name: 'Healthcare Security Assessment',
      industry: 'Healthcare',
      target_frameworks: ['HIPAA', 'HITRUST'],
      description: 'Comprehensive healthcare security assessment covering HIPAA requirements.',
      categories: [
        { id: 'privacy', name: 'Privacy & PHI Protection', weight: 1.5 },
        { id: 'access', name: 'Access Controls', weight: 1.2 },
        { id: 'audit', name: 'Audit Controls', weight: 1.0 }
      ],
      questions: [
        { id: 'h1', category: 'privacy', text: 'Is PHI encrypted at rest?', max_score: 5 },
        { id: 'h2', category: 'privacy', text: 'Are there documented policies for PHI handling?', max_score: 5 },
        { id: 'h3', category: 'access', text: 'Is role-based access control implemented?', max_score: 5 }
      ],
      estimated_duration_minutes: 45,
      difficulty_level: 'intermediate',
      usage_count: 12,
      is_system_template: true
    },
    {
      id: 2,
      template_name: 'Financial Services Security Assessment',
      industry: 'Finance',
      target_frameworks: ['SOC 2', 'PCI DSS', 'GLBA'],
      description: 'Security assessment for financial services organizations.',
      categories: [
        { id: 'data_protection', name: 'Data Protection', weight: 1.5 },
        { id: 'access_mgmt', name: 'Access Management', weight: 1.3 }
      ],
      questions: [
        { id: 'f1', category: 'data_protection', text: 'Is customer financial data encrypted?', max_score: 5 },
        { id: 'f2', category: 'access_mgmt', text: 'Is MFA required for all financial systems?', max_score: 5 }
      ],
      estimated_duration_minutes: 60,
      difficulty_level: 'advanced',
      usage_count: 8,
      is_system_template: true
    },
    {
      id: 3,
      template_name: 'Technology Startup Security Assessment',
      industry: 'Technology',
      target_frameworks: ['SOC 2', 'ISO 27001'],
      description: 'Right-sized security assessment for technology startups.',
      categories: [
        { id: 'sdlc', name: 'Secure Development', weight: 1.5 },
        { id: 'cloud', name: 'Cloud Security', weight: 1.3 }
      ],
      questions: [
        { id: 't1', category: 'sdlc', text: 'Is security integrated into the SDLC?', max_score: 5 },
        { id: 't2', category: 'cloud', text: 'Are cloud resources properly configured?', max_score: 5 }
      ],
      estimated_duration_minutes: 30,
      difficulty_level: 'basic',
      usage_count: 25,
      is_system_template: true
    },
    {
      id: 4,
      template_name: 'General Security Maturity Assessment',
      industry: 'General',
      target_frameworks: ['NIST CSF', 'CIS Controls'],
      description: 'Universal security maturity assessment applicable to any industry.',
      categories: [
        { id: 'governance', name: 'Governance', weight: 1.2 },
        { id: 'protect', name: 'Protection', weight: 1.0 },
        { id: 'detect', name: 'Detection', weight: 1.0 },
        { id: 'respond', name: 'Response', weight: 1.0 }
      ],
      questions: [
        { id: 'g1', category: 'governance', text: 'Is there an information security policy?', max_score: 5 },
        { id: 'g2', category: 'protect', text: 'Are endpoints protected with EDR?', max_score: 5 }
      ],
      estimated_duration_minutes: 40,
      difficulty_level: 'intermediate',
      usage_count: 42,
      is_system_template: true
    }
  ];
  
  const getDefaultRecommendationTemplates = () => [
    {
      id: 1,
      title: 'Implement Multi-Factor Authentication',
      category: 'Technology',
      subcategory: 'Access Control',
      description: 'Deploy MFA across all user accounts and critical systems.',
      detailed_guidance: 'Implement a phishing-resistant MFA solution such as FIDO2/WebAuthn for all user authentication...',
      implementation_steps: [
        'Assess current authentication methods',
        'Select MFA solution (recommend FIDO2/hardware keys for high-security)',
        'Pilot with IT team and executives',
        'Roll out to all employees in phases',
        'Disable legacy authentication methods'
      ],
      applicable_frameworks: ['SOC 2', 'ISO 27001', 'NIST CSF', 'PCI DSS'],
      effort_level: 'moderate',
      typical_hours_min: 40,
      typical_hours_max: 80,
      default_priority: 1,
      usage_count: 56
    },
    {
      id: 2,
      title: 'Develop Incident Response Plan',
      category: 'Process',
      subcategory: 'Incident Management',
      description: 'Create comprehensive incident response procedures.',
      detailed_guidance: 'Develop an incident response plan that covers preparation, detection, containment, eradication, recovery, and lessons learned...',
      implementation_steps: [
        'Define incident categories and severity levels',
        'Establish IR team and roles',
        'Create communication procedures',
        'Define escalation paths',
        'Conduct tabletop exercises'
      ],
      applicable_frameworks: ['SOC 2', 'ISO 27001', 'HIPAA', 'NIST CSF'],
      effort_level: 'moderate',
      typical_hours_min: 30,
      typical_hours_max: 60,
      default_priority: 2,
      usage_count: 38
    },
    {
      id: 3,
      title: 'Implement Data Classification Policy',
      category: 'Policy',
      subcategory: 'Data Governance',
      description: 'Establish data classification scheme and handling procedures.',
      detailed_guidance: 'Create a data classification policy that defines sensitivity levels (Public, Internal, Confidential, Restricted) with corresponding handling requirements...',
      implementation_steps: [
        'Define classification levels',
        'Document handling requirements per level',
        'Train employees on classification',
        'Implement technical controls',
        'Audit and enforce compliance'
      ],
      applicable_frameworks: ['SOC 2', 'ISO 27001', 'GDPR', 'HIPAA'],
      effort_level: 'significant',
      typical_hours_min: 60,
      typical_hours_max: 120,
      default_priority: 2,
      usage_count: 29
    },
    {
      id: 4,
      title: 'Deploy Endpoint Detection and Response',
      category: 'Technology',
      subcategory: 'Endpoint Security',
      description: 'Implement EDR solution across all endpoints.',
      detailed_guidance: 'Deploy an enterprise EDR solution that provides real-time threat detection, investigation, and response capabilities...',
      implementation_steps: [
        'Evaluate EDR solutions',
        'Conduct POC with leading vendors',
        'Design deployment architecture',
        'Phase rollout starting with high-risk systems',
        'Tune detection rules and integrate with SIEM'
      ],
      applicable_frameworks: ['SOC 2', 'NIST CSF', 'CIS Controls'],
      effort_level: 'significant',
      typical_hours_min: 80,
      typical_hours_max: 160,
      default_priority: 1,
      usage_count: 21
    },
    {
      id: 5,
      title: 'Security Awareness Training Program',
      category: 'People',
      subcategory: 'Training',
      description: 'Establish ongoing security awareness training for all employees.',
      detailed_guidance: 'Implement a comprehensive security awareness program including annual training, monthly phishing simulations, and targeted training for high-risk roles...',
      implementation_steps: [
        'Select training platform',
        'Develop role-based training curriculum',
        'Launch baseline phishing assessment',
        'Roll out initial training',
        'Establish monthly phishing campaigns'
      ],
      applicable_frameworks: ['SOC 2', 'ISO 27001', 'HIPAA', 'PCI DSS'],
      effort_level: 'moderate',
      typical_hours_min: 20,
      typical_hours_max: 40,
      default_priority: 2,
      usage_count: 47
    }
  ];
  
  const getDefaultReportTemplates = () => [
    {
      id: 1,
      template_name: 'Executive Security Summary',
      template_type: 'executive_summary',
      description: 'High-level security posture overview for executives and board.',
      sections: ['Executive Summary', 'Key Metrics', 'Risk Overview', 'Recommendations', 'Next Steps'],
      usage_count: 34
    },
    {
      id: 2,
      template_name: 'Detailed Assessment Report',
      template_type: 'assessment',
      description: 'Comprehensive assessment findings with technical details.',
      sections: ['Executive Summary', 'Methodology', 'Findings by Category', 'Risk Analysis', 'Detailed Recommendations', 'Appendix'],
      usage_count: 28
    },
    {
      id: 3,
      template_name: 'Gap Analysis Report',
      template_type: 'gap_analysis',
      description: 'Framework gap analysis with remediation roadmap.',
      sections: ['Executive Summary', 'Framework Overview', 'Current State', 'Gap Analysis', 'Remediation Roadmap', 'Resource Requirements'],
      usage_count: 19
    },
    {
      id: 4,
      template_name: 'Compliance Progress Report',
      template_type: 'progress',
      description: 'Monthly/quarterly compliance progress update.',
      sections: ['Period Summary', 'Metrics Overview', 'Completed Items', 'In Progress', 'Blockers', 'Next Period Goals'],
      usage_count: 45
    }
  ];
  
  const getFilteredTemplates = () => {
    let filtered = templates[activeType] || [];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        (t.template_name || t.title || '').toLowerCase().includes(query) ||
        (t.description || '').toLowerCase().includes(query)
      );
    }
    
    if (selectedIndustry) {
      filtered = filtered.filter(t => 
        t.industry === selectedIndustry || t.industry === 'General'
      );
    }
    
    if (selectedFramework) {
      filtered = filtered.filter(t => 
        (t.target_frameworks || t.applicable_frameworks || []).includes(selectedFramework)
      );
    }
    
    return filtered;
  };
  
  const getDifficultyColor = (level) => {
    switch (level) {
      case 'basic': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  const getEffortColor = (level) => {
    switch (level) {
      case 'minimal': return 'text-green-600 bg-green-100';
      case 'moderate': return 'text-yellow-600 bg-yellow-100';
      case 'significant': return 'text-orange-600 bg-orange-100';
      case 'major': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  const filteredTemplates = getFilteredTemplates();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Template Library</h2>
          <p className="text-gray-500 mt-1">Reusable assessments, recommendations, and reports</p>
        </div>
        <button
          onClick={() => setShowNewTemplate(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Template
        </button>
      </div>
      
      {/* Type Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {TEMPLATE_TYPES.map(type => {
          const Icon = type.icon;
          const count = templates[type.id]?.length || 0;
          
          return (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`
                flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                ${activeType === type.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'}
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{type.name}</span>
              <span className={`
                px-2 py-0.5 rounded-full text-xs
                ${activeType === type.id ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'}
              `}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
        
        <select
          value={selectedIndustry}
          onChange={(e) => setSelectedIndustry(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">All Industries</option>
          {INDUSTRIES.map(ind => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
        
        <select
          value={selectedFramework}
          onChange={(e) => setSelectedFramework(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">All Frameworks</option>
          {FRAMEWORKS.map(fw => (
            <option key={fw} value={fw}>{fw}</option>
          ))}
        </select>
      </div>
      
      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-500">Try adjusting your filters or create a new template</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className="bg-white rounded-xl border border-gray-200 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${activeType === 'assessment' ? 'bg-blue-100' : 
                      activeType === 'recommendation' ? 'bg-yellow-100' : 'bg-green-100'}
                  `}>
                    {activeType === 'assessment' ? (
                      <ClipboardCheck className={`w-5 h-5 ${activeType === 'assessment' ? 'text-blue-600' : ''}`} />
                    ) : activeType === 'recommendation' ? (
                      <Lightbulb className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <FileCheck className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  {template.is_system_template && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                      System
                    </span>
                  )}
                </div>
                
                <h4 className="font-medium text-gray-900 mb-1">
                  {template.template_name || template.title}
                </h4>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                  {template.description}
                </p>
                
                {/* Metadata */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {template.industry && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {template.industry}
                    </span>
                  )}
                  {template.category && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {template.category}
                    </span>
                  )}
                  {template.difficulty_level && (
                    <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${getDifficultyColor(template.difficulty_level)}`}>
                      {template.difficulty_level}
                    </span>
                  )}
                  {template.effort_level && (
                    <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${getEffortColor(template.effort_level)}`}>
                      {template.effort_level}
                    </span>
                  )}
                </div>
                
                {/* Frameworks */}
                {(template.target_frameworks || template.applicable_frameworks) && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(template.target_frameworks || template.applicable_frameworks).slice(0, 3).map(fw => (
                      <span key={fw} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                        {fw}
                      </span>
                    ))}
                    {(template.target_frameworks || template.applicable_frameworks).length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                        +{(template.target_frameworks || template.applicable_frameworks).length - 3} more
                      </span>
                    )}
                  </div>
                )}
                
                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    {template.estimated_duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {template.estimated_duration_minutes} min
                      </span>
                    )}
                    {template.questions && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {template.questions.length} questions
                      </span>
                    )}
                    {template.implementation_steps && (
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {template.implementation_steps.length} steps
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Used {template.usage_count || 0}x
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{selectedTemplate.template_name || selectedTemplate.title}</h3>
                  <p className="text-gray-500 mt-1">{selectedTemplate.description}</p>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Metadata */}
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.industry && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {selectedTemplate.industry}
                  </span>
                )}
                {(selectedTemplate.target_frameworks || selectedTemplate.applicable_frameworks || []).map(fw => (
                  <span key={fw} className="px-3 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    {fw}
                  </span>
                ))}
              </div>
              
              {/* Assessment Categories & Questions */}
              {selectedTemplate.categories && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Assessment Categories</h4>
                  <div className="space-y-2">
                    {selectedTemplate.categories.map(cat => (
                      <div key={cat.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-sm text-gray-500">Weight: {cat.weight}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedTemplate.questions && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Questions ({selectedTemplate.questions.length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedTemplate.questions.map((q, idx) => (
                      <div key={q.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-medium text-gray-400 mt-0.5">{idx + 1}.</span>
                          <div>
                            <p className="text-gray-900">{q.text}</p>
                            <p className="text-xs text-gray-500 mt-1">Category: {q.category} • Max Score: {q.max_score}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recommendation Details */}
              {selectedTemplate.implementation_steps && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Implementation Steps</h4>
                  <div className="space-y-2">
                    {selectedTemplate.implementation_steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-medium">
                          {idx + 1}
                        </div>
                        <p className="text-gray-700 pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedTemplate.detailed_guidance && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Detailed Guidance</h4>
                  <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                    {selectedTemplate.detailed_guidance}
                  </p>
                </div>
              )}
              
              {/* Report Sections */}
              {selectedTemplate.sections && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Report Sections</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.sections.map((section, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {section}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Effort Estimate */}
              {selectedTemplate.typical_hours_min && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Effort Estimate</h4>
                  <p className="text-blue-800">
                    {selectedTemplate.typical_hours_min} - {selectedTemplate.typical_hours_max} hours
                    <span className="text-blue-600 ml-2">
                      ({selectedTemplate.effort_level} effort)
                    </span>
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Used {selectedTemplate.usage_count || 0} times
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
                <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Use Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
