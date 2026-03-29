export type UserRole = 'admin' | 'manager' | 'employee';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  companyId: string;
  managerId?: string; // For employees
  photoURL?: string;
  createdAt: number;
}

export interface Company {
  id: string;
  name: string;
  baseCurrency: string;
  country: string;
  adminId: string;
  createdAt: number;
}

export interface Expense {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  amount: number;
  currency: string;
  baseAmount: number; // Converted to company's base currency
  category: string;
  description: string;
  date: string;
  receiptUrl?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  ruleId?: string;
  currentApproverIndex: number;
  approvals: ApprovalLog[];
  remarks?: string;
  createdAt: number;
  ocrData?: any;
}

export interface ApprovalLog {
  approverId: string;
  approverName: string;
  status: 'approved' | 'rejected';
  comment?: string;
  timestamp: number;
}

export interface ApprovalRule {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  approvers: {
    userId: string;
    required: boolean;
    sequence: number;
  }[];
  isManagerApprover: boolean;
  minApprovalPercentage: number;
  isSequenceRequired: boolean;
  createdAt: number;
}

export interface Currency {
  code: string;
  name: string;
}
