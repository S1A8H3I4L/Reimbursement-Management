import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { User, ApprovalRule } from '../types';
import { X, Plus, Trash2, User as UserIcon } from 'lucide-react';

interface ApprovalRuleFormProps {
  companyId: string;
  users: User[];
  editingRule?: ApprovalRule;
  onClose: () => void;
}

export default function ApprovalRuleForm({ companyId, users, editingRule, onClose }: ApprovalRuleFormProps) {
  const [name, setName] = useState(editingRule?.name || '');
  const [description, setDescription] = useState(editingRule?.description || '');
  const [isManagerApprover, setIsManagerApprover] = useState(editingRule?.isManagerApprover ?? true);
  const [isSequenceRequired, setIsSequenceRequired] = useState(editingRule?.isSequenceRequired ?? true);
  const [minApprovalPercentage, setMinApprovalPercentage] = useState(editingRule?.minApprovalPercentage ?? 100);
  const [approvers, setApprovers] = useState<{ userId: string; required: boolean; sequence: number }[]>(
    editingRule?.approvers || []
  );

  const handleAddApprover = () => {
    setApprovers([...approvers, { userId: '', required: false, sequence: approvers.length + 1 }]);
  };

  const handleRemoveApprover = (index: number) => {
    const newApprovers = approvers.filter((_, i) => i !== index);
    setApprovers(newApprovers.map((a, i) => ({ ...a, sequence: i + 1 })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ruleId = editingRule ? editingRule.id : crypto.randomUUID();
    const rule: ApprovalRule = {
      id: ruleId,
      companyId,
      name,
      description,
      isManagerApprover,
      isSequenceRequired,
      minApprovalPercentage,
      approvers,
      createdAt: editingRule ? editingRule.createdAt : Date.now()
    };
    await setDoc(doc(db, 'approvalRules', ruleId), rule);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">{editingRule ? 'Edit Approval Rule' : 'Configure Approval Rule'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Miscellaneous Expenses"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of the rule"
              />
            </div>
          </div>

          <div className="space-y-4 bg-gray-50 p-4 rounded-xl">
            <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
              <UserIcon size={18} />
              <span>Approvers</span>
            </h4>
            
            <div className="space-y-3">
              {approvers.map((approver, index) => (
                <div key={index} className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-sm font-bold text-gray-400 w-6">{index + 1}</span>
                  <select
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={approver.userId}
                    onChange={(e) => {
                      const newApprovers = [...approvers];
                      newApprovers[index].userId = e.target.value;
                      setApprovers(newApprovers);
                    }}
                    required
                  >
                    <option value="">Select Approver</option>
                    {users.filter(u => u.role !== 'employee').map(u => (
                      <option key={u.uid} value={u.uid}>{u.displayName} ({u.role})</option>
                    ))}
                  </select>
                  <label className="flex items-center space-x-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={approver.required}
                      onChange={(e) => {
                        const newApprovers = [...approvers];
                        newApprovers[index].required = e.target.checked;
                        setApprovers(newApprovers);
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Required</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveApprover(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddApprover}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center space-x-2"
              >
                <Plus size={18} />
                <span>Add Approver</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="flex items-center space-x-3 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isManagerApprover}
                  onChange={(e) => setIsManagerApprover(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Is Manager an Approver?</span>
              </label>
              <label className="flex items-center space-x-3 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSequenceRequired}
                  onChange={(e) => setIsSequenceRequired(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Enforce Sequence?</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Approval Percentage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={minApprovalPercentage}
                onChange={(e) => setMinApprovalPercentage(parseInt(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="flex space-x-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              {editingRule ? 'Update Approval Rule' : 'Save Approval Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
