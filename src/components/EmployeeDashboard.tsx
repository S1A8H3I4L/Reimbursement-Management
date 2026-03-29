import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { User, Expense, Company } from '../types';
import { Plus, FileText, Clock, CheckCircle, XCircle, ChevronRight, Receipt, Filter, Search } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import ExpenseForm from './ExpenseForm';

interface EmployeeDashboardProps {
  user: User;
}

export default function EmployeeDashboard({ user }: EmployeeDashboardProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribeCompany = onSnapshot(doc(db, 'companies', user.companyId), (doc) => {
      setCompany(doc.data() as Company);
    });

    const unsubscribeExpenses = onSnapshot(query(collection(db, 'expenses'), where('employeeId', '==', user.uid)), (snapshot) => {
      setExpenses(snapshot.docs.map(doc => doc.data() as Expense).sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => {
      unsubscribeCompany();
      unsubscribeExpenses();
    };
  }, [user.uid, user.companyId]);

  const stats = {
    draft: expenses.filter(e => e.status === 'draft').reduce((acc, e) => acc + e.amount, 0),
    pending: expenses.filter(e => e.status === 'pending').reduce((acc, e) => acc + e.amount, 0),
    approved: expenses.filter(e => e.status === 'approved').reduce((acc, e) => acc + e.amount, 0),
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-gray-100 p-3 rounded-lg text-gray-600">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">To Submit</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.draft, company?.baseCurrency || 'USD')}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Waiting Approval</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.pending, company?.baseCurrency || 'USD')}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-green-100 p-3 rounded-lg text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.approved, company?.baseCurrency || 'USD')}</p>
          </div>
        </div>
      </div>

      {/* Expense History */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-4 flex-1 w-full">
            <h3 className="text-lg font-semibold text-gray-900 whitespace-nowrap">My Expenses</h3>
            <div className="relative flex-1 max-w-xs hidden sm:block">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="flex items-center space-x-2 flex-1 md:flex-none">
              <Filter className="text-gray-400" size={16} />
              <select 
                className="flex-1 md:w-40 px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-medium text-gray-700"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">⏳ Pending</option>
                <option value="approved">✅ Approved</option>
                <option value="rejected">❌ Rejected</option>
                <option value="draft">📝 Draft</option>
              </select>
            </div>
            <button 
              onClick={() => setShowExpenseForm(true)}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-bold"
            >
              <Plus size={18} />
              <span>New Expense</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
              <tr>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedExpense(e)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-100 p-2 rounded-lg text-gray-500">
                        <Receipt size={18} />
                      </div>
                      <span className="font-medium text-gray-900">{e.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{e.date}</td>
                  <td className="px-6 py-4 text-gray-600">{e.category}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(e.amount, e.currency)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit space-x-1 ${
                      e.status === 'approved' ? 'bg-green-100 text-green-700' :
                      e.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      e.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {e.status === 'approved' && <CheckCircle size={12} />}
                      {e.status === 'rejected' && <XCircle size={12} />}
                      {e.status === 'pending' && <Clock size={12} />}
                      <span className="capitalize">{e.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight size={18} className="text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <ExpenseForm 
          user={user} 
          company={company!} 
          onClose={() => setShowExpenseForm(false)} 
        />
      )}

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Expense Details</h3>
              <button onClick={() => setSelectedExpense(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            <div className="space-y-4">
              {/* Progress Stepper */}
              <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedExpense.status !== 'draft' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <CheckCircle size={16} />
                  </div>
                  <span className="text-[10px] mt-1 font-medium text-gray-500">Submitted</span>
                </div>
                <div className={`flex-1 h-0.5 mx-2 ${selectedExpense.status === 'pending' || selectedExpense.status === 'approved' ? 'bg-green-500' : 'bg-gray-200'}`} />
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedExpense.status === 'pending' ? 'bg-blue-500 text-white' : selectedExpense.status === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <Clock size={16} />
                  </div>
                  <span className="text-[10px] mt-1 font-medium text-gray-500">Reviewing</span>
                </div>
                <div className={`flex-1 h-0.5 mx-2 ${selectedExpense.status === 'approved' ? 'bg-green-500' : 'bg-gray-200'}`} />
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedExpense.status === 'approved' ? 'bg-green-500 text-white' : selectedExpense.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {selectedExpense.status === 'rejected' ? <XCircle size={16} /> : <CheckCircle size={16} />}
                  </div>
                  <span className="text-[10px] mt-1 font-medium text-gray-500">Final</span>
                </div>
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Status</span>
                <span className="font-semibold capitalize">{selectedExpense.status}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Amount</span>
                <span className="font-semibold">{formatCurrency(selectedExpense.amount, selectedExpense.currency)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Category</span>
                <span className="font-semibold">{selectedExpense.category}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Date</span>
                <span className="font-semibold">{selectedExpense.date}</span>
              </div>
              {selectedExpense.remarks && (
                <div className="border-b border-gray-100 pb-2">
                  <span className="text-gray-500 block mb-1">Remarks</span>
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">{selectedExpense.remarks}</p>
                </div>
              )}
              {selectedExpense.receiptUrl && (
                <div className="border-b border-gray-100 pb-2">
                  <span className="text-gray-500 block mb-1">Receipt Image</span>
                  <img src={selectedExpense.receiptUrl} alt="Receipt" className="w-full h-48 object-cover rounded-xl border border-gray-200" />
                </div>
              )}
              <div className="pt-4">
                <h4 className="font-semibold mb-2">Approval Log</h4>
                <div className="space-y-3">
                  {selectedExpense.approvals.map((log, i) => (
                    <div key={i} className="flex items-start space-x-3 text-sm">
                      <div className={`mt-1 w-2 h-2 rounded-full ${log.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="font-medium">{log.approverName} - {log.status}</p>
                        {log.comment && <p className="text-gray-500 italic">"{log.comment}"</p>}
                        <p className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  {selectedExpense.approvals.length === 0 && <p className="text-gray-500 text-sm italic">No approval history yet.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
