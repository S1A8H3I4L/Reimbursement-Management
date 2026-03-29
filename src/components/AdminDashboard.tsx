import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { User, Company, ApprovalRule, Expense, ApprovalLog } from '../types';
import { Plus, Users, Settings as SettingsIcon, Shield, ChevronRight, Check, X, Edit2, Trash2, Receipt, Clock, CheckCircle, XCircle, MessageSquare, Loader2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import ApprovalRuleForm from './ApprovalRuleForm';

interface AdminDashboardProps {
  user: User;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [company, setCompany] = useState<Company | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [newUser, setNewUser] = useState({ email: '', displayName: '', role: 'employee' as any, managerId: '' });
  const [editCompany, setEditCompany] = useState({ name: '', country: '', baseCurrency: '' });
  const [expensesToReview, setExpensesToReview] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (company) {
      setEditCompany({ name: company.name, country: company.country, baseCurrency: company.baseCurrency });
    }
  }, [company]);

  useEffect(() => {
    const unsubscribeCompany = onSnapshot(doc(db, 'companies', user.companyId), (doc) => {
      setCompany(doc.data() as Company);
    });

    const unsubscribeUsers = onSnapshot(query(collection(db, 'users'), where('companyId', '==', user.companyId)), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as User));
    });

    const unsubscribeRules = onSnapshot(query(collection(db, 'approvalRules'), where('companyId', '==', user.companyId)), (snapshot) => {
      setRules(snapshot.docs.map(doc => doc.data() as ApprovalRule));
    });

    const unsubscribeExpenses = onSnapshot(query(collection(db, 'expenses'), where('companyId', '==', user.companyId), where('status', '==', 'pending')), (snapshot) => {
      setExpensesToReview(snapshot.docs.map(doc => doc.data() as Expense));
    });

    return () => {
      unsubscribeCompany();
      unsubscribeUsers();
      unsubscribeRules();
      unsubscribeExpenses();
    };
  }, [user.companyId]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = editingUser ? editingUser.uid : crypto.randomUUID();
    const userToCreate: User = {
      uid,
      email: newUser.email,
      displayName: newUser.displayName,
      role: newUser.role,
      companyId: user.companyId,
      createdAt: editingUser ? editingUser.createdAt : Date.now()
    };

    if (newUser.managerId) {
      userToCreate.managerId = newUser.managerId;
    }

    await setDoc(doc(db, 'users', uid), userToCreate);
    setShowUserForm(false);
    setEditingUser(null);
    setNewUser({ email: '', displayName: '', role: 'employee', managerId: '' });
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteDoc(doc(db, 'users', uid));
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      await deleteDoc(doc(db, 'approvalRules', id));
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    await updateDoc(doc(db, 'companies', company.id), editCompany);
    setShowCompanyForm(false);
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
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Employees</p>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-purple-100 p-3 rounded-lg text-purple-600">
            <Shield size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Active Rules</p>
            <p className="text-2xl font-bold text-gray-900">{rules.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 p-3 rounded-lg text-green-600">
              <SettingsIcon size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Base Currency</p>
              <p className="text-2xl font-bold text-gray-900">{company?.baseCurrency}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowCompanyForm(true)}
            className="text-indigo-600 hover:text-indigo-800 p-2"
          >
            <Edit2 size={20} />
          </button>
        </div>
      </div>

      {/* User Management */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
          <button 
            onClick={() => setShowUserForm(true)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            <span>Add User</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Manager</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{u.displayName}</td>
                  <td className="px-6 py-4 text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {users.find(m => m.uid === u.managerId)?.displayName || '-'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => {
                        setEditingUser(u);
                        setNewUser({ email: u.email, displayName: u.displayName, role: u.role, managerId: u.managerId || '' });
                        setShowUserForm(true);
                      }}
                      className="text-gray-400 hover:text-indigo-600 p-1"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(u.uid)}
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Approval Rules */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Approval Rules</h3>
          <button 
            onClick={() => setShowRuleForm(true)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            <span>New Rule</span>
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {rules.map(rule => (
            <div key={rule.id} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                  <p className="text-sm text-gray-500">{rule.description}</p>
                </div>
                <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg flex space-x-2">
                  <button 
                    onClick={() => {
                      setEditingRule(rule);
                      setShowRuleForm(true);
                    }}
                    className="hover:text-indigo-800"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteRule(rule.id)}
                    className="hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Manager Approval Required</span>
                  {rule.isManagerApprover ? <Check className="text-green-500" size={16} /> : <X className="text-red-500" size={16} />}
                </div>
                <div className="flex items-center justify-between">
                  <span>Sequence Required</span>
                  {rule.isSequenceRequired ? <Check className="text-green-500" size={16} /> : <X className="text-red-500" size={16} />}
                </div>
                <div className="flex items-center justify-between">
                  <span>Min Approval %</span>
                  <span className="font-medium">{rule.minApprovalPercentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
            <h3 className="text-xl font-bold mb-6">{editingUser ? 'Edit User' : 'Add New User'}</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                  required
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newUser.managerId}
                  onChange={(e) => setNewUser({...newUser, managerId: e.target.value})}
                >
                  <option value="">No Manager</option>
                  {users.filter(u => u.role === 'manager').map(m => (
                    <option key={m.uid} value={m.uid}>{m.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Company Form Modal */}
      {showCompanyForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
            <h3 className="text-xl font-bold mb-6">Company Settings</h3>
            <form onSubmit={handleUpdateCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editCompany.name}
                  onChange={(e) => setEditCompany({...editCompany, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editCompany.country}
                  onChange={(e) => setEditCompany({...editCompany, country: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Currency</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editCompany.baseCurrency}
                  onChange={(e) => setEditCompany({...editCompany, baseCurrency: e.target.value})}
                  required
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCompanyForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Update Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Rule Form Modal */}
      {showRuleForm && (
        <ApprovalRuleForm 
          companyId={user.companyId} 
          users={users} 
          editingRule={editingRule || undefined}
          onClose={() => {
            setShowRuleForm(false);
            setEditingRule(null);
          }} 
        />
      )}

      {/* Pending Approvals Section */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expensesToReview.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{e.employeeName}</td>
                  <td className="px-6 py-4 text-gray-600">{e.description}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(e.amount, e.currency)}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Pending</span>
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
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                    No pending approvals at the moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

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
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold">{formatCurrency(selectedExpense.amount, selectedExpense.currency)}</span>
                </div>
                <div className="flex justify-between text-indigo-600">
                  <span className="font-medium">Company Value</span>
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
          </div>
        </div>
      )}
    </div>
  );
}
