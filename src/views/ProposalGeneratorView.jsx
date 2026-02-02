import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, DollarSign, Calendar, Building2, 
  Send, Download, Eye, Edit, Trash2, Check, X,
  ChevronDown, ChevronUp, Clock, User, Mail, 
  Percent, Calculator, Sparkles, AlertCircle,
  Copy, ExternalLink, CheckCircle2, XCircle,
  MoreVertical, Archive
} from 'lucide-react';
import api from '../services/api';

const PAYMENT_TERMS = [
  { value: 'net_30', label: 'Net 30', description: 'Payment due in 30 days' },
  { value: 'net_60', label: 'Net 60', description: 'Payment due in 60 days' },
  { value: '50_50', label: '50/50 Split', description: '50% upfront, 50% on completion' },
  { value: 'monthly', label: 'Monthly', description: 'Monthly installments' }
];

export default function ProposalGeneratorView({ currentUser }) {
  const [proposals, setProposals] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewProposal, setShowNewProposal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // New proposal form
  const [newProposal, setNewProposal] = useState({
    proposal_name: '',
    client_name: '',
    client_contact_name: '',
    client_contact_email: '',
    client_industry: '',
    client_size: 'medium',
    selected_services: [],
    custom_items: [],
    discount_percent: 0,
    payment_terms: 'net_30',
    proposed_start_date: '',
    proposed_duration_weeks: 4,
    valid_days: 30,
    executive_summary: '',
    frameworks_in_scope: []
  });
  
  // Load data
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [proposalsData, servicesData] = await Promise.all([
        api.listProposals(),
        api.getServiceCatalog()
      ]);
      setProposals(proposalsData || []);
      setServices(servicesData || getDefaultServices());
    } catch (err) {
      console.error('Error loading data:', err);
      setServices(getDefaultServices());
      setProposals(getDemoProposals());
    } finally {
      setLoading(false);
    }
  };
  
  const getDefaultServices = () => [
    { id: 1, service_name: 'Security Maturity Assessment', service_category: 'assessment', base_price: 15000, description: 'Comprehensive security assessment' },
    { id: 2, service_name: 'Compliance Gap Analysis', service_category: 'gap_analysis', base_price: 20000, description: 'Gap analysis against target framework' },
    { id: 3, service_name: 'Compliance Roadmap', service_category: 'roadmap', base_price: 25000, description: 'Strategic compliance roadmap' },
    { id: 4, service_name: 'SOC 2 Readiness', service_category: 'audit_prep', base_price: 18000, description: 'SOC 2 audit preparation' },
    { id: 5, service_name: 'ISO 27001 Implementation', service_category: 'implementation', base_price: 45000, description: 'Full ISMS implementation' },
    { id: 6, service_name: 'Virtual CISO (Monthly)', service_category: 'managed_services', base_price: 5000, description: 'Ongoing security leadership' },
    { id: 7, service_name: 'Penetration Testing', service_category: 'assessment', base_price: 12000, description: 'External and internal pentest' },
    { id: 8, service_name: 'Security Awareness Training', service_category: 'training', base_price: 25, pricing_model: 'per_user', description: 'Per user training program' }
  ];
  
  const getDemoProposals = () => [
    {
      id: 1,
      proposal_number: 'PROP-2026-0001',
      proposal_name: 'TechStart Inc - SOC 2 Readiness',
      client_name: 'TechStart Inc',
      proposal_status: 'sent',
      total_price: 38000,
      valid_until: '2026-02-15',
      created_at: '2026-01-20'
    },
    {
      id: 2,
      proposal_number: 'PROP-2026-0002',
      proposal_name: 'HealthCo - HIPAA Assessment',
      client_name: 'HealthCo Systems',
      proposal_status: 'accepted',
      total_price: 35000,
      valid_until: '2026-02-20',
      created_at: '2026-01-22'
    }
  ];
  
  const calculateTotals = () => {
    let subtotal = 0;
    
    // Services
    newProposal.selected_services.forEach(item => {
      const service = services.find(s => s.id === item.service_id);
      if (service) {
        subtotal += (item.custom_price || service.base_price) * (item.quantity || 1);
      }
    });
    
    // Custom items
    newProposal.custom_items.forEach(item => {
      subtotal += (item.unit_price || 0) * (item.quantity || 1);
    });
    
    const discountAmount = subtotal * (newProposal.discount_percent / 100);
    const total = subtotal - discountAmount;
    
    return { subtotal, discountAmount, total };
  };
  
  const toggleService = (serviceId) => {
    setNewProposal(prev => {
      const existing = prev.selected_services.find(s => s.service_id === serviceId);
      if (existing) {
        return {
          ...prev,
          selected_services: prev.selected_services.filter(s => s.service_id !== serviceId)
        };
      } else {
        return {
          ...prev,
          selected_services: [...prev.selected_services, { service_id: serviceId, quantity: 1, custom_price: null }]
        };
      }
    });
  };
  
  const updateServiceItem = (serviceId, field, value) => {
    setNewProposal(prev => ({
      ...prev,
      selected_services: prev.selected_services.map(s => 
        s.service_id === serviceId ? { ...s, [field]: value } : s
      )
    }));
  };
  
  const addCustomItem = () => {
    setNewProposal(prev => ({
      ...prev,
      custom_items: [...prev.custom_items, {
        id: Date.now(),
        custom_name: '',
        description: '',
        quantity: 1,
        unit_price: 0
      }]
    }));
  };
  
  const updateCustomItem = (itemId, field, value) => {
    setNewProposal(prev => ({
      ...prev,
      custom_items: prev.custom_items.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };
  
  const removeCustomItem = (itemId) => {
    setNewProposal(prev => ({
      ...prev,
      custom_items: prev.custom_items.filter(item => item.id !== itemId)
    }));
  };
  
  const handleCreateProposal = async () => {
    if (!newProposal.proposal_name || !newProposal.client_name) {
      alert('Please fill in proposal name and client name');
      return;
    }
    
    if (newProposal.selected_services.length === 0 && newProposal.custom_items.length === 0) {
      alert('Please add at least one service or custom item');
      return;
    }
    
    try {
      const services = [
        ...newProposal.selected_services.map(s => ({
          service_id: s.service_id,
          quantity: s.quantity || 1,
          custom_price: s.custom_price
        })),
        ...newProposal.custom_items.map(item => ({
          custom_name: item.custom_name,
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0
        }))
      ];
      
      const result = await api.createProposal({
        ...newProposal,
        services
      });
      
      if (result.id) {
        await loadData();
        setShowNewProposal(false);
        resetNewProposal();
      }
    } catch (err) {
      console.error('Error creating proposal:', err);
      // Add to local state for demo
      const { total } = calculateTotals();
      setProposals(prev => [{
        id: Date.now(),
        proposal_number: `PROP-2026-${String(prev.length + 1).padStart(4, '0')}`,
        proposal_name: newProposal.proposal_name,
        client_name: newProposal.client_name,
        proposal_status: 'draft',
        total_price: total,
        valid_until: new Date(Date.now() + newProposal.valid_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created_at: new Date().toISOString().split('T')[0]
      }, ...prev]);
      setShowNewProposal(false);
      resetNewProposal();
    }
  };
  
  const resetNewProposal = () => {
    setNewProposal({
      proposal_name: '',
      client_name: '',
      client_contact_name: '',
      client_contact_email: '',
      client_industry: '',
      client_size: 'medium',
      selected_services: [],
      custom_items: [],
      discount_percent: 0,
      payment_terms: 'net_30',
      proposed_start_date: '',
      proposed_duration_weeks: 4,
      valid_days: 30,
      executive_summary: '',
      frameworks_in_scope: []
    });
  };
  
  const updateProposalStatus = async (proposalId, status) => {
    try {
      await api.updateProposalStatus(proposalId, status);
      await loadData();
    } catch (err) {
      console.error('Error updating status:', err);
      // Update locally for demo
      setProposals(prev => prev.map(p => 
        p.id === proposalId ? { ...p, proposal_status: status } : p
      ));
    }
  };
  
  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      sent: 'bg-blue-100 text-blue-700',
      viewed: 'bg-purple-100 text-purple-700',
      accepted: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      expired: 'bg-orange-100 text-orange-700'
    };
    return styles[status] || styles.draft;
  };
  
  const { subtotal, discountAmount, total } = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Proposal Generator</h2>
          <p className="text-gray-500 mt-1">Create and manage client proposals</p>
        </div>
        <button
          onClick={() => setShowNewProposal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Proposal
        </button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Proposals</p>
              <p className="text-2xl font-bold">{proposals.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold">
                {proposals.filter(p => ['draft', 'sent', 'viewed'].includes(p.proposal_status)).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Won</p>
              <p className="text-2xl font-bold">
                {proposals.filter(p => p.proposal_status === 'accepted').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pipeline Value</p>
              <p className="text-2xl font-bold">
                ${proposals.filter(p => !['rejected', 'expired'].includes(p.proposal_status))
                  .reduce((sum, p) => sum + (p.total_price || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Proposals List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold">All Proposals</h3>
        </div>
        
        {proposals.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="font-medium text-gray-900 mb-2">No proposals yet</h4>
            <p className="text-gray-500 mb-4">Create your first proposal to get started</p>
            <button
              onClick={() => setShowNewProposal(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create Proposal
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {proposals.map(proposal => (
              <div key={proposal.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{proposal.proposal_name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(proposal.proposal_status)}`}>
                          {proposal.proposal_status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {proposal.proposal_number} • {proposal.client_name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${proposal.total_price?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Valid until {proposal.valid_until}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {proposal.proposal_status === 'draft' && (
                        <button
                          onClick={() => updateProposalStatus(proposal.id, 'sent')}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                          <Send className="w-4 h-4" />
                          Send
                        </button>
                      )}
                      {proposal.proposal_status === 'sent' && (
                        <>
                          <button
                            onClick={() => updateProposalStatus(proposal.id, 'accepted')}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                          >
                            <Check className="w-4 h-4" />
                            Won
                          </button>
                          <button
                            onClick={() => updateProposalStatus(proposal.id, 'rejected')}
                            className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Lost
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setSelectedProposal(proposal);
                          setShowPreview(true);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                      <button 
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* New Proposal Modal */}
      {showNewProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold">Create New Proposal</h3>
                  <p className="text-gray-500 text-sm">Generate a professional quote for your client</p>
                </div>
                <button
                  onClick={() => {
                    setShowNewProposal(false);
                    resetNewProposal();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proposal Name *
                  </label>
                  <input
                    type="text"
                    value={newProposal.proposal_name}
                    onChange={(e) => setNewProposal({...newProposal, proposal_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="TechStart Inc - SOC 2 Readiness"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client/Company Name *
                  </label>
                  <input
                    type="text"
                    value={newProposal.client_name}
                    onChange={(e) => setNewProposal({...newProposal, client_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="TechStart Inc"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={newProposal.client_contact_name}
                    onChange={(e) => setNewProposal({...newProposal, client_contact_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={newProposal.client_contact_email}
                    onChange={(e) => setNewProposal({...newProposal, client_contact_email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="john@techstart.com"
                  />
                </div>
              </div>
              
              {/* Services Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Services
                </label>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                  {services.map(service => {
                    const isSelected = newProposal.selected_services.some(s => s.service_id === service.id);
                    const selectedItem = newProposal.selected_services.find(s => s.service_id === service.id);
                    
                    return (
                      <div key={service.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-3 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleService(service.id)}
                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                            />
                            <div>
                              <span className="font-medium">{service.service_name}</span>
                              <p className="text-xs text-gray-500">{service.description}</p>
                            </div>
                          </label>
                          <span className="text-sm font-medium text-gray-700">
                            ${service.base_price.toLocaleString()}
                            {service.pricing_model === 'per_user' && '/user'}
                          </span>
                        </div>
                        
                        {isSelected && (
                          <div className="mt-3 ml-7 flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-gray-500">Qty:</label>
                              <input
                                type="number"
                                min="1"
                                value={selectedItem?.quantity || 1}
                                onChange={(e) => updateServiceItem(service.id, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-gray-500">Custom Price:</label>
                              <input
                                type="number"
                                min="0"
                                value={selectedItem?.custom_price || ''}
                                onChange={(e) => updateServiceItem(service.id, 'custom_price', e.target.value ? parseFloat(e.target.value) : null)}
                                className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder={service.base_price.toString()}
                              />
                            </div>
                            <span className="text-sm font-medium text-primary">
                              = ${((selectedItem?.custom_price || service.base_price) * (selectedItem?.quantity || 1)).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Custom Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Custom Line Items</label>
                  <button
                    onClick={addCustomItem}
                    className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Custom Item
                  </button>
                </div>
                
                {newProposal.custom_items.length > 0 && (
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                    {newProposal.custom_items.map(item => (
                      <div key={item.id} className="p-3">
                        <div className="grid grid-cols-4 gap-3 items-center">
                          <input
                            type="text"
                            value={item.custom_name}
                            onChange={(e) => updateCustomItem(item.id, 'custom_name', e.target.value)}
                            className="col-span-2 px-2 py-1.5 border border-gray-300 rounded text-sm"
                            placeholder="Item name"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateCustomItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="Qty"
                            />
                            <span className="text-gray-500">×</span>
                            <input
                              type="number"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => updateCustomItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="Price"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              ${(item.quantity * item.unit_price).toLocaleString()}
                            </span>
                            <button
                              onClick={() => removeCustomItem(item.id)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Trash2 className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Discount & Terms */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount %
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newProposal.discount_percent}
                      onChange={(e) => setNewProposal({...newProposal, discount_percent: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={newProposal.payment_terms}
                    onChange={(e) => setNewProposal({...newProposal, payment_terms: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    {PAYMENT_TERMS.map(term => (
                      <option key={term.value} value={term.value}>{term.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid For (days)
                  </label>
                  <input
                    type="number"
                    min="7"
                    value={newProposal.valid_days}
                    onChange={(e) => setNewProposal({...newProposal, valid_days: parseInt(e.target.value) || 30})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              
              {/* Executive Summary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Executive Summary (Optional)
                </label>
                <textarea
                  value={newProposal.executive_summary}
                  onChange={(e) => setNewProposal({...newProposal, executive_summary: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Brief overview of the engagement and value proposition..."
                />
              </div>
              
              {/* Pricing Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-gray-500" />
                  Pricing Summary
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${subtotal.toLocaleString()}</span>
                  </div>
                  {newProposal.discount_percent > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount ({newProposal.discount_percent}%)</span>
                      <span>-${discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
                    <span>Total</span>
                    <span className="text-primary">${total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center sticky bottom-0">
              <button
                onClick={() => {
                  setShowNewProposal(false);
                  resetNewProposal();
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateProposal}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Create Proposal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Preview Modal */}
      {showPreview && selectedProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Proposal Preview</h3>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setSelectedProposal(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-8">
              {/* Proposal Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">PROPOSAL</h1>
                <p className="text-gray-500">{selectedProposal.proposal_number}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Prepared For:</h4>
                  <p className="font-medium">{selectedProposal.client_name}</p>
                  <p className="text-gray-500">{selectedProposal.client_contact_name}</p>
                  <p className="text-gray-500">{selectedProposal.client_contact_email}</p>
                </div>
                <div className="text-right">
                  <h4 className="font-semibold text-gray-900 mb-2">Proposal Details:</h4>
                  <p className="text-gray-500">Date: {selectedProposal.created_at}</p>
                  <p className="text-gray-500">Valid Until: {selectedProposal.valid_until}</p>
                  <p className={`font-medium ${getStatusBadge(selectedProposal.proposal_status)?.replace('bg-', 'text-').split(' ')[1]}`}>
                    Status: {selectedProposal.proposal_status}
                  </p>
                </div>
              </div>
              
              <div className="border-t border-b border-gray-200 py-6 mb-8">
                <h4 className="font-semibold text-gray-900 mb-4">{selectedProposal.proposal_name}</h4>
                <p className="text-gray-600">{selectedProposal.executive_summary || 'Comprehensive security and compliance services tailored to your organization\'s needs.'}</p>
              </div>
              
              <div className="bg-primary/5 rounded-lg p-6 text-center">
                <p className="text-gray-500 mb-2">Total Investment</p>
                <p className="text-4xl font-bold text-primary">${selectedProposal.total_price?.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Copy Link
              </button>
              <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
