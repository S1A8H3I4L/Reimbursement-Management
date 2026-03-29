import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { User, Expense, Company, ApprovalLog } from '../types';
import { Receipt, Clock, CheckCircle, XCircle, Filter, Search, Download, Plus, MessageSquare, Loader2, Users } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import ExpenseForm from '../components/ExpenseForm';

interface ExpensesPageProps {
  user: User;
}

export default function ExpensesPage({ user }: ExpensesPageProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewFilter, setViewFilter] = useState<'mine' | 'team'>('mine');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [employees, setEmployees] = useState<Record<string, User>>({});

  useEffect(() => {
    const unsubscribeCompany = onSnapshot(doc(db, 'companies', user.companyId), (doc) => {
      setCompany(doc.data() as Company);
    });

    const fetchEmployees = async () => {
      if (user.role === 'admin' || user.role === 'manager') {
        const q = query(collection(db, 'users'), where('companyId', '==', user.companyId));
        const snapshot = await getDocs(q);
        const map: Record<string, User> = {};
        snapshot.docs.forEach(doc => {
          map[doc.id] = doc.data() as User;
        });
        setEmployees(map);
      }
    };
    fetchEmployees();

    let q = query(collection(db, 'expenses'), where('companyId', '==', user.companyId));
    
    if (user.role === 'employee') {
      q = query(collection(db, 'expenses'), where('employeeId', '==', user.uid));
    }

    const unsubscribeExpenses = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => doc.data() as Expense).sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => {
      unsubscribeCompany();
      unsubscribeExpenses();
    };
  }, [user.uid, user.companyId, user.role]);

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         e.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    
    let matchesView = true;
    if (user.role === 'manager' && viewFilter === 'team') {
      matchesView = employees[e.employeeId]?.managerId === user.uid;
    } else if (user.role === 'manager' && viewFilter === 'mine') {
      matchesView = e.employeeId === user.uid;
    }

    return matchesSearch && matchesStatus && matchesView;
  });

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Description,Category,Amount,Currency,Status\n"
      + filteredExpenses.map(e => `${e.date},${e.description},${e.category},${e.amount},${e.currency},${e.status}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAdminAction = async (expense: Expense, status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const approvalLog: ApprovalLog = {
        approverId: user.uid,
        approverName: user.displayName,
        status,
        comment,
        timestamp: Date.now()
      };

      await updateDoc(doc(db, 'expenses', expense.id), {
        status,
        approvals: [...expense.approvals, approvalLog],
        remarks: comment || expense.remarks || ''
      });

      setSelectedExpense(null);
      setComment('');
    } catch (error) {
      console.error("Admin action error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => setShowExpenseForm(true)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>New Expense</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search by description, category, or employee..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {user.role === 'manager' && (
            <div className="flex items-center bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewFilter('mine')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewFilter === 'mine' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                My Expenses
              </button>
              <button
                onClick={() => setViewFilter('team')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewFilter === 'team' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Team Expenses
              </button>
            </div>
          )}
          <div className="flex items-center space-x-3">
            <Filter className="text-gray-400" size={18} />
            <select 
              className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-medium text-gray-700"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">⏳ Pending Review</option>
              <option value="approved">✅ Approved Claims</option>
              <option value="rejected">❌ Rejected Claims</option>
              <option value="draft">📝 Drafts</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
              <tr>
                <th className="px-6 py-4">Expense</th>
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
                      <div>
                        <p className="font-medium text-gray-900">{e.description}</p>
                        {user.role === 'admin' && <p className="text-xs text-gray-500">By {e.employeeName}</p>}
                      </div>
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
                    <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">View Details</button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                    No expenses found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showExpenseForm && (
        <ExpenseForm 
          user={user} 
          company={company!} 
          onClose={() => setShowExpenseForm(false)} 
        />
      )}

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
              <div className="flex justify-between border-b border-gray-100 pb-2 text-indigo-600">
                <span className="font-medium">Company Value</span>
                <span className="font-bold">{formatCurrency(selectedExpense.baseAmount, company?.baseCurrency || 'USD')}</span>
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

              {/* Admin Action Buttons */}
              {user.role === 'admin' && selectedExpense.status === 'pending' && (
                <div className="pt-6 border-t border-gray-100 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                      <MessageSquare size={16} />
                      <span>Admin Comments</span>
                    </label>
                    <textarea
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                      placeholder="Add a final comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-4">
                    <button
                      disabled={loading}
                      onClick={() => handleAdminAction(selectedExpense, 'rejected')}
                      className="flex-1 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-bold flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <XCircle size={20} />}
                      <span>Reject Final</span>
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleAdminAction(selectedExpense, 'approved')}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                      <span>Approve Final</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
