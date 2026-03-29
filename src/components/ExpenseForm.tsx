import React, { useState, useRef, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { User, Expense, Company, ApprovalRule } from '../types';
import { X, Camera, Upload, Receipt, DollarSign, Calendar, Tag, FileText, Loader2, CheckCircle, Shield, MessageSquare } from 'lucide-react';
import { scanReceipt } from '../services/ocrService';
import { convertCurrency } from '../services/currencyService';

interface ExpenseFormProps {
  user: User;
  company: Company;
  onClose: () => void;
}

export default function ExpenseForm({ user, company, onClose }: ExpenseFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [currency, setCurrency] = useState(company.baseCurrency);
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchRules = async () => {
      const q = query(collection(db, 'approvalRules'), where('companyId', '==', user.companyId));
      const snapshot = await getDocs(q);
      const rulesData = snapshot.docs.map(doc => doc.data() as ApprovalRule);
      setRules(rulesData);
      if (rulesData.length > 0) setSelectedRuleId(rulesData[0].id);
    };
    fetchRules();
  }, [user.companyId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setError('');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        const data = await scanReceipt(base64);
        
        if (data) {
          setDescription(data.description || data.restaurant_name || '');
          setAmount(data.amount || '');
          setCategory(data.category || '');
          setDate(data.date || new Date().toISOString().split('T')[0]);
          if (data.currency) {
            setCurrency(data.currency);
          }
          if (data.restaurant_name) {
            setRemarks(`Restaurant: ${data.restaurant_name}`);
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError("Failed to scan receipt. Please enter details manually.");
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRuleId) {
      setError("Please select an approval rule.");
      return;
    }
    setLoading(true);
    setError('');

    try {
      const expenseId = crypto.randomUUID();
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      
      // Convert to base currency for manager's view
      const baseAmount = await convertCurrency(numAmount, currency, company.baseCurrency);

      const expense: Expense = {
        id: expenseId,
        employeeId: user.uid,
        employeeName: user.displayName,
        companyId: user.companyId,
        amount: numAmount,
        currency: currency,
        baseAmount: baseAmount,
        category: category,
        description: description,
        date: date,
        status: 'pending',
        ruleId: selectedRuleId,
        currentApproverIndex: 0,
        approvals: [],
        remarks: remarks,
        receiptUrl: imagePreview || undefined,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'expenses', expenseId), expense);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <Receipt size={24} className="text-indigo-600" />
            <span>Submit New Expense</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="mb-8 p-6 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/50 text-center">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload}
            />
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              ref={cameraInputRef} 
              onChange={handleFileUpload}
            />
            {imagePreview && !scanning && (
              <div className="mb-4 relative group">
                <img src={imagePreview} alt="Receipt Preview" className="w-full h-48 object-cover rounded-xl border border-gray-200" />
                <button 
                  onClick={() => setImagePreview(null)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {scanning ? (
              <div className="flex flex-col items-center space-y-3">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <p className="text-indigo-600 font-medium">Scanning your receipt...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center space-x-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 bg-white px-6 py-3 rounded-xl shadow-sm border border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-all font-semibold"
                  >
                    <Upload size={20} />
                    <span>Upload Receipt</span>
                  </button>
                  <button 
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center space-x-2 bg-indigo-600 px-6 py-3 rounded-xl shadow-sm text-white hover:bg-indigo-700 transition-all font-semibold"
                  >
                    <Camera size={20} />
                    <span>Take Photo</span>
                  </button>
                </div>
                <p className="text-sm text-gray-500">OCR will automatically fill the form fields for you</p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center space-x-2">
                <FileText size={16} />
                <span>Description</span>
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this expense for?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center space-x-2">
                <DollarSign size={16} />
                <span>Amount</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.01"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
                <select
                  className="w-24 px-2 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 font-bold"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                  <option value="JPY">JPY</option>
                  <option value="AUD">AUD</option>
                  <option value="CAD">CAD</option>
                  <option value="AED">AED</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center space-x-2">
                <Tag size={16} />
                <span>Category</span>
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Select Category</option>
                <option value="Food & Dining">Food & Dining</option>
                <option value="Travel">Travel</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Software">Software</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center space-x-2">
                <Calendar size={16} />
                <span>Date</span>
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center space-x-2">
                <Shield size={16} />
                <span>Approval Rule</span>
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedRuleId}
                onChange={(e) => setSelectedRuleId(e.target.value)}
                required
              >
                <option value="">Select Rule</option>
                {rules.map(rule => (
                  <option key={rule.id} value={rule.id}>{rule.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center space-x-2">
                <MessageSquare size={16} />
                <span>Remarks</span>
              </label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Additional notes..."
              />
            </div>

            <div className="md:col-span-2 pt-6 flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold flex items-center justify-center space-x-2 disabled:opacity-50 shadow-lg shadow-indigo-200"
              >
                {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                <span>{loading ? 'Submitting...' : 'Submit Claim'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
