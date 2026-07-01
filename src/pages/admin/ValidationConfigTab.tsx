import * as React from 'react';
import { supabase } from '../../lib/supabase/client';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Loader2, Plus, Edit2, Trash2, Settings, RefreshCw, Eye } from 'lucide-react';
import { toast } from 'sonner';

export function ValidationConfigTab() {
  const [activeSubTab, setActiveSubTab] = React.useState<'rules' | 'fields' | 'samples' | 'logs'>('rules');
  const [docType, setDocType] = React.useState<'work_order' | 'w8ben'>('work_order');
  const [loading, setLoading] = React.useState(true);

  // States
  const [rules, setRules] = React.useState<any[]>([]);
  const [fields, setFields] = React.useState<any[]>([]);
  const [sample, setSample] = React.useState<any>(null);
  const [logs, setLogs] = React.useState<any[]>([]);

  // Modal / Editor States
  const [ruleModalOpen, setRuleModalOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<any>(null);

  const [fieldModalOpen, setFieldModalOpen] = React.useState(false);
  const [editingField, setEditingField] = React.useState<any>(null);

  const [selectedLog, setSelectedLog] = React.useState<any>(null);

  // API base URL
  const getBaseUrl = () => {
    return (import.meta.env.VITE_AUTH_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001").replace(/\/+$/, "");
  };

  const fetchToken = async () => {
    const sessionResponse = await supabase?.auth.getSession();
    return sessionResponse?.data?.session?.access_token || '';
  };

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const token = await fetchToken();
      const baseUrl = getBaseUrl();

      if (activeSubTab === 'rules') {
        const res = await fetch(`${baseUrl}/api/admin/config/rules/${docType}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setRules(json.data);
      } else if (activeSubTab === 'fields') {
        const res = await fetch(`${baseUrl}/api/admin/config/fields/${docType}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setFields(json.data);
      } else if (activeSubTab === 'samples') {
        const res = await fetch(`${baseUrl}/api/admin/config/samples/${docType}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setSample(json.data);
      } else if (activeSubTab === 'logs') {
        const res = await fetch(`${baseUrl}/api/admin/config/findings/${docType}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setLogs(json.data);
      }
    } catch (err) {
      console.error('Failed to load validation config:', err);
      toast.error('Failed to load active validation configurations.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, [activeSubTab, docType]);

  // Handle Rule Save
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const payload = {
      id: editingRule?.id || undefined,
      document_type: docType,
      rule_name: formData.get('rule_name'),
      rule_description: formData.get('rule_description'),
      rule_type: formData.get('rule_type'),
      weight: Number(formData.get('weight') || 0),
      is_active: formData.get('is_active') === 'true'
    };

    try {
      const token = await fetchToken();
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/admin/config/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editingRule ? 'Rule updated successfully!' : 'Rule created successfully!');
        setRuleModalOpen(false);
        setEditingRule(null);
        loadData();
      } else {
        toast.error(json.error || 'Failed to save validation rule');
      }
    } catch (err) {
      toast.error('An error occurred while saving the rule.');
    }
  };

  // Handle Rule Delete
  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this validation rule?')) return;
    try {
      const token = await fetchToken();
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/admin/config/rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Rule deleted successfully!');
        loadData();
      } else {
        toast.error(json.error || 'Failed to delete rule');
      }
    } catch (err) {
      toast.error('An error occurred while deleting the rule.');
    }
  };

  // Handle Field Save
  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const payload = {
      id: editingField?.id || undefined,
      document_type: docType,
      field_name: formData.get('field_name'),
      field_description: formData.get('field_description'),
      field_format: formData.get('field_format'),
      mapping_key: formData.get('mapping_key'),
      is_required: formData.get('is_required') === 'true'
    };

    try {
      const token = await fetchToken();
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/admin/config/fields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editingField ? 'Field updated successfully!' : 'Field created successfully!');
        setFieldModalOpen(false);
        setEditingField(null);
        loadData();
      } else {
        toast.error(json.error || 'Failed to save field definition');
      }
    } catch (err) {
      toast.error('An error occurred while saving the field.');
    }
  };

  // Handle Field Delete
  const handleDeleteField = async (id: string) => {
    if (!confirm('Are you sure you want to delete this field mapping?')) return;
    try {
      const token = await fetchToken();
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/admin/config/fields/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Field configuration deleted successfully!');
        loadData();
      } else {
        toast.error(json.error || 'Failed to delete field config');
      }
    } catch (err) {
      toast.error('An error occurred while deleting the field.');
    }
  };

  // Handle Samples Save
  const handleSaveSample = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const payload = {
      document_type: docType,
      sample_pdf_url: formData.get('sample_pdf_url'),
      instruction_doc_link: formData.get('instruction_doc_link'),
      is_active: true
    };

    try {
      const token = await fetchToken();
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/admin/config/samples`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Reference materials updated successfully!');
        loadData();
      } else {
        toast.error(json.error || 'Failed to save reference details');
      }
    } catch (err) {
      toast.error('An error occurred while saving samples.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector and Sub-tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Document Validation Control Center</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setDocType('work_order')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                docType === 'work_order' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Work Orders
            </button>
            <button
              onClick={() => setDocType('w8ben')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                docType === 'w8ben' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              W-8BEN Tax Forms
            </button>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg">
            {(['rules', 'fields', 'samples', 'logs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium capitalize rounded-md transition-all ${
                  activeSubTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'logs' ? 'Verification Logs' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Loading configuration...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Active Sub-tab Content */}
          {activeSubTab === 'rules' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">Verification Rules</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Manage checklist criteria used by OCR and AI analysis to determine validity score.</p>
                </div>
                <Button
                  onClick={() => {
                    setEditingRule(null);
                    setRuleModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Rule
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-600 font-medium">
                      <th className="py-3 px-4">Rule Name</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-center">Weight</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rules.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">No active rules defined. Click Add Rule to create one.</td>
                      </tr>
                    ) : (
                      rules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-gray-50/50 text-gray-700">
                          <td className="py-3 px-4 font-medium text-gray-900">{rule.rule_name}</td>
                          <td className="py-3 px-4 text-xs text-gray-500">{rule.rule_description || '-'}</td>
                          <td className="py-3 px-4"><span className="px-2.5 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-100 capitalize">{rule.rule_type}</span></td>
                          <td className="py-3 px-4 text-center font-semibold text-gray-800">{rule.weight} pts</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              rule.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                            }`}>
                              {rule.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingRule(rule);
                                  setRuleModalOpen(true);
                                }}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSubTab === 'fields' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">Extraction Fields</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Schema mappings that configure raw JSON fields variables matching onboarding profiles.</p>
                </div>
                <Button
                  onClick={() => {
                    setEditingField(null);
                    setFieldModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Field
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-600 font-medium">
                      <th className="py-3 px-4">Field Name</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Format</th>
                      <th className="py-3 px-4">Mapping Key</th>
                      <th className="py-3 px-4 text-center">Required</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fields.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">No fields defined. Click Add Field to create one.</td>
                      </tr>
                    ) : (
                      fields.map((field) => (
                        <tr key={field.id} className="hover:bg-gray-50/50 text-gray-700">
                          <td className="py-3 px-4 font-medium text-gray-900">{field.field_name}</td>
                          <td className="py-3 px-4 text-xs text-gray-500">{field.field_description || '-'}</td>
                          <td className="py-3 px-4"><span className="px-2 py-0.5 text-xs rounded bg-purple-50 text-purple-700 border border-purple-100 font-mono capitalize">{field.field_format}</span></td>
                          <td className="py-3 px-4 font-mono text-xs text-gray-600">{field.mapping_key}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              field.is_required ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                            }`}>
                              {field.is_required ? 'Required' : 'Optional'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingField(field);
                                  setFieldModalOpen(true);
                                }}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteField(field.id)}
                                className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSubTab === 'samples' && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900">Reference Materials</h3>
                <p className="text-xs text-gray-500 mt-0.5">Upload a correct sample document, instruct matching zones, or crop reference images for prompt guidance.</p>
              </div>

              <form onSubmit={handleSaveSample} className="space-y-5 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Correct Sample PDF Path</label>
                  <input
                    type="text"
                    name="sample_pdf_url"
                    defaultValue={sample?.sample_pdf_url || ''}
                    placeholder="e.g. tax-forms/samples/intellibus_sample_work_order.pdf"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:bg-white focus:border-blue-500 transition-all font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Instruction Document Link</label>
                  <input
                    type="text"
                    name="instruction_doc_link"
                    defaultValue={sample?.instruction_doc_link || ''}
                    placeholder="e.g. https://www.irs.gov/pub/irs-pdf/iw8ben.pdf"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:bg-white focus:border-blue-500 transition-all font-mono text-xs"
                  />
                </div>

                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 h-10">
                  Save Reference Configuration
                </Button>
              </form>
            </div>
          )}

          {activeSubTab === 'logs' && (
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Verification Logs</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Browse history of AI audit findings and extracted values for validation reviews.</p>
                </div>
                <button
                  onClick={loadData}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  title="Reload Logs"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-600 font-medium">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Contractor ID</th>
                      <th className="py-3 px-4 text-center">Score</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">View JSON</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">No log entries found.</td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50/50 text-gray-700">
                          <td className="py-3 px-4 text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="py-3 px-4 font-mono text-xs">{log.contractor_user_id}</td>
                          <td className="py-3 px-4 text-center font-bold">{log.confidence_score}%</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              log.validation_status === 'valid' ? 'bg-green-50 text-green-700 border-green-200' :
                              log.validation_status === 'needs_manual_review' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {log.validation_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              onClick={() => setSelectedLog(log)}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Inspect
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RULE MODAL */}
      {ruleModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{editingRule ? 'Edit Verification Rule' : 'Create Verification Rule'}</h3>
            <form onSubmit={handleSaveRule} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Rule Name</label>
                <input
                  type="text"
                  name="rule_name"
                  defaultValue={editingRule?.rule_name || ''}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Description</label>
                <textarea
                  name="rule_description"
                  defaultValue={editingRule?.rule_description || ''}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Rule Type</label>
                  <select
                    name="rule_type"
                    defaultValue={editingRule?.rule_type || 'layout'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:bg-white focus:border-blue-500"
                  >
                    <option value="layout">Layout Branding</option>
                    <option value="signature">Signature Check</option>
                    <option value="text_match">Text String Match</option>
                    <option value="field_check">Field Verification</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Score Weight (0-100)</label>
                  <input
                    type="number"
                    name="weight"
                    min="0"
                    max="100"
                    defaultValue={editingRule?.weight || 10}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Status</label>
                <select
                  name="is_active"
                  defaultValue={editingRule?.is_active !== false ? 'true' : 'false'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" onClick={() => setRuleModalOpen(false)} variant="outline">Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5">Save Rule</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FIELD MODAL */}
      {fieldModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{editingField ? 'Edit Field Definition' : 'Create Field Definition'}</h3>
            <form onSubmit={handleSaveField} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Field Name</label>
                <input
                  type="text"
                  name="field_name"
                  defaultValue={editingField?.field_name || ''}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Description</label>
                <textarea
                  name="field_description"
                  defaultValue={editingField?.field_description || ''}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Data Format</label>
                  <select
                    name="field_format"
                    defaultValue={editingField?.field_format || 'string'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:bg-white focus:border-blue-500 font-mono text-xs"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="date">Date (YYYY-MM-DD)</option>
                    <option value="boolean">Boolean</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Mapping Key (JSON)</label>
                  <input
                    type="text"
                    name="mapping_key"
                    defaultValue={editingField?.mapping_key || ''}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:bg-white focus:border-blue-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Required status</label>
                <select
                  name="is_required"
                  defaultValue={editingField?.is_required !== false ? 'true' : 'false'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="true">Required</option>
                  <option value="false">Optional (Nullable)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" onClick={() => setFieldModalOpen(false)} variant="outline">Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5">Save Field</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT LOG MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">OCR Validation Report Log</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">Record ID: {selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                Close
              </button>
            </div>

            <ScrollArea className="flex-1 my-4 pr-2">
              <div className="space-y-5 text-sm">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Confidence Score</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{selectedLog.confidence_score}%</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Validation Status</p>
                    <p className="text-sm font-bold text-gray-900 mt-1 capitalize">{selectedLog.validation_status}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Contractor ID</p>
                    <p className="text-xs font-mono text-gray-700 truncate mt-1.5">{selectedLog.contractor_user_id}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-semibold text-gray-800">Validation Rejection Reasons</h4>
                  <div className="bg-red-50/50 border border-red-100 text-red-800 rounded-xl p-3 text-xs space-y-1 font-medium">
                    {selectedLog.reasons && selectedLog.reasons.length > 0 ? (
                      selectedLog.reasons.map((r: string, idx: number) => (
                        <p key={idx}>• {r}</p>
                      ))
                    ) : (
                      <p className="text-green-700">None: Document passed all rule thresholds successfully.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-semibold text-gray-800">Raw Findings Payload JSON</h4>
                  <pre className="bg-gray-950 text-gray-100 p-4 rounded-xl font-mono text-xs overflow-x-auto select-all max-h-48">
                    {JSON.stringify(selectedLog.findings_json, null, 2)}
                  </pre>
                </div>
              </div>
            </ScrollArea>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button onClick={() => setSelectedLog(null)} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-6">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
