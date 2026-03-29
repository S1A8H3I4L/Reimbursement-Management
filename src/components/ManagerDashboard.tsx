import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { User, Expense, Company, ApprovalRule } from '../types';
import { CheckCircle, XCircle, Clock, Receipt, ChevronRight, MessageSquare, Loader2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface ManagerDashboardProps {
  user: User;
}

export default function ManagerDashboard({ user }: ManagerDashboardProps) {
  const [expensesToReview, setExpensesToReview] = useState<Expense[]>([]);
  const [historyExpenses, setHistoryExpenses] = useState<Expense[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<Record<string, ApprovalRule>>({});
  const [employees, setEmployees] = useState<Record<string, User>>({});
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');

  useEffect(() => {
    const unsubscribeCompany = onSnapshot(doc(db, 'companies', user.companyId), (doc) => {
      setCompany(doc.data() as Company);
    });

    const fetchMetadata = async () => {
      // Fetch rules
      const rulesQ = query(collection(db, 'approvalRules'), where('companyId', '==', user.companyId));
      const rulesSnapshot = await getDocs(rulesQ);
      const rulesMap: Record<string, ApprovalRule> = {};
      rulesSnapshot.docs.forEach(doc => {
        rulesMap[doc.id] = doc.data() as ApprovalRule;
      });
      setRules(rulesMap);

      // Fetch employees
      const usersQ = query(collection(db, 'users'), where('companyId', '==', user.companyId));
      const usersSnapshot = await getDocs(usersQ);
      const usersMap: Record<string, User> = {};
      usersSnapshot.docs.forEach(doc => {
        usersMap[doc.id] = doc.data() as User;
      });
      setEmployees(usersMap);
    };
    fetchMetadata();

    return () => {
      unsubscribeCompany();
    };
  }, [user.companyId]);

  useEffect(() => {
    // Only subscribe to expenses once we have the metadata needed for filtering
    if (Object.keys(rules).length === 0 || Object.keys(employees).length === 0) return;

    const unsubscribeExpenses = onSnapshot(query(collection(db, 'expenses'), where('companyId', '==', user.companyId)), (snapshot) => {
      const allExpenses = snapshot.docs.map(doc => doc.data() as Expense);
      
      // Expenses waiting for this manager's action
      const pending = allExpenses.filter(e => e.status === 'pending' && isCurrentApprover(e, rules, employees));
      
      // Expenses this manager has already acted upon
      const history = allExpenses.filter(e => 
        e.approvals.some(a => a.approverId === user.uid)
      ).sort((a, b) => b.createdAt - a.createdAt);

      setExpensesToReview(pending);
      setHistoryExpenses(history);
    });

    return () => {
      unsubscribeExpenses();
    };
  }, [user.companyId, rules, employees, user.uid]);

  const isCurrentApprover = (expense: Expense, currentRules: Record<string, ApprovalRule>, currentEmployees: Record<string, User>) => {
    const rule = currentRules[expense.ruleId || ''];
    if (!rule) return false;

    const employee = currentEmployees[expense.employeeId];
    if (!employee) return false;

    // Multi-level logic
    if (rule.isManagerApprover) {
      if (expense.currentApproverIndex === 0) {
        return employee.managerId === user.uid;
      }
      const approverIndex = expense.currentApproverIndex - 1;
      if (approverIndex < rule.approvers.length) {
        return rule.approvers[approverIndex].userId === user.uid;
      }
    } else {
      if (expense.currentApproverIndex < rule.approvers.length) {
        return rule.approvers[expense.currentApproverIndex].userId === user.uid;
      }
    }

    return false;
  };

  const handleApproval = async (expense: Expense, status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const rule = rules[expense.ruleId || ''];
      let nextStatus: Expense['status'] = status;
      let nextApproverIndex = expense.currentApproverIndex;

      if (status === 'approved' && rule) {
        const totalApprovers = rule.approvers.length + (rule.isManagerApprover ? 1 : 0);
        if (expense.currentApproverIndex + 1 < totalApprovers) {
          nextStatus = 'pending';
          nextApproverIndex = expense.currentApproverIndex + 1;
        } else {
          nextStatus = 'approved';
        }
      }

      const approvalLog = {
        approverId: user.uid,
        approverName: user.displayName,
        status,
        comment,
        timestamp: Date.now()
      };

      await updateDoc(doc(db, 'expenses', expense.id), {
        status: nextStatus,
        currentApproverIndex: nextApproverIndex,
        approvals: [...expense.approvals, approvalLog],
        remarks: comment
      });

      setSelectedExpense(null);
      setComment('');
    } catch (error) {
      console.error("Approval error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = historyExpenses.filter(e => {
    if (historyStatusFilter === 'all') return true;
    return e.status === historyStatusFilter;
  });

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Approvals to Review</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Converted</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expensesToReview.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{e.employeeName}</td>
                  <td className="px-6 py-4 text-gray-600">{e.description}</td>
                  <td className="px-6 py-4 text-gray-600">{e.category}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(e.amount, e.currency)}</td>
                  <td className="px-6 py-4 text-indigo-600 font-bold">
                    {formatCurrency(e.baseAmount, company?.baseCurrency || 'USD')}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedExpense(e)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1"
                    >
                      <span>Review</span>
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {expensesToReview.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                    No pending approvals at the moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">My Approval History</h3>
          <select 
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-medium text-gray-700"
            value={historyStatusFilter}
            onChange={(e) => setHistoryStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="approved">✅ Approved</option>
            <option value="rejected">❌ Rejected</option>
            <option value="pending">⏳ Pending (Next Level)</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHistory.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{e.employeeName}</td>
                  <td className="px-6 py-4 text-gray-600">{e.description}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(e.amount, e.currency)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit space-x-1 ${
                      e.status === 'approved' ? 'bg-green-100 text-green-700' :
                      e.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {e.status === 'approved' && <CheckCircle size={12} />}
                      {e.status === 'rejected' && <XCircle size={12} />}
                      {e.status === 'pending' && <Clock size={12} />}
                      <span className="capitalize">{e.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {new Date(e.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedExpense(e)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {historyExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                    No history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Review Expense Claim</h3>
              <button onClick={() => setSelectedExpense(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Employee</span>
                  <span className="font-semibold">{selectedExpense.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Original Amount</span>
                  <span className="font-semibold">{formatCurrency(selectedExpense.amount, selectedExpense.currency)}</span>
                </div>
                <div className="flex justify-between text-indigo-600">
                  <span className="font-medium">Company Currency</span>
                  <span className="font-bold">{formatCurrency(selectedExpense.baseAmount, company?.baseCurrency || 'USD')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Category</span>
                  <span className="font-semibold">{selectedExpense.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Description</span>
                  <span className="font-semibold">{selectedExpense.description}</span>
                </div>
              </div>

              {selectedExpense.receiptUrl && (
                <div className="border-b border-gray-100 pb-2">
                  <span className="text-gray-500 block mb-1">Receipt Image</span>
                  <img src={selectedExpense.receiptUrl} alt="Receipt" className="w-full h-48 object-cover rounded-xl border border-gray-200" />
                </div>
              )}

              {/* Only show action buttons if the expense is pending and the manager is the current approver */}
              {selectedExpense.status === 'pending' && isCurrentApprover(selectedExpense, rules, employees) ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                      <MessageSquare size={16} />
                      <span>Approval Comments</span>
                    </label>
                    <textarea
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                      placeholder="Add a comment for the employee..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      disabled={loading}
                      onClick={() => handleApproval(selectedExpense, 'rejected')}
                      className="flex-1 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-bold flex items-center justify-center space-x-2"
                    >
                      <XCircle size={20} />
                      <span>Reject</span>
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleApproval(selectedExpense, 'approved')}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold flex items-center justify-center space-x-2"
                    >
                      <CheckCircle size={20} />
                      <span>Approve</span>
                    </button>
                  </div>
                </>
              ) : (
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
