# Reimbursement Management System  

**Problem Statement - Reimbursement Management System**  

**Sahil Panchal - sahilpanchal1818@gmail.com**  

---

## 🎯 Objective  

Design and implement a smart, automated reimbursement management system to streamline company expense workflows.  
Enable efficient expense submission, multi-level approval processes, and flexible rule-based decision making.  
Improve transparency, reduce manual errors, and enhance overall operational efficiency in organizations.  

---

## 👥 User Roles & Permissions

**Employee**  
- Submit expense claims with Amount, Category, Description, Date, and Receipt  
- View expense history: Approved, Rejected, Pending  
- Track approval status in real-time  

**Manager**  
- Approve/reject expenses of assigned employees  
- Add comments while approving/rejecting  
- Escalate expenses as per conditional rules  
- View team expenses  

**Admin**  
- Create companies and users, assign roles  
- Define multi-level and conditional approval rules  
- Override approvals if needed  
- View all expenses in the system  

---

## 🧩 Core Features

**Expense Submission**  
- Employees submit expenses with multi-currency support  
- OCR for receipts automatically fills details: Amount, Date, Description, Merchant  

**Approval Workflow**  
- Multi-level approval sequence: Employee → Manager → Finance → Director → Admin → Final Approved  
- Conditional rules:  
  - Percentage rule (e.g., 60% approval → approved)  
  - Specific approver rule (e.g., CFO approval → auto-approved)  
  - Hybrid rule (combination of both)  

**Real-Time Updates**  
- Firestore listeners reflect expense status changes instantly across dashboards  

**Expense History & Tracking**  
- Filter expenses by status, category, and date  
- Search functionality for easy tracking  

---

## 🔄 Expense Lifecycle

1. **Draft** – Employee prepares the expense  
2. **Pending** – Submitted for Manager review  
3. **Approved** – Verified by Manager/Admin, ready for reimbursement  
4. **Rejected** – Denied with optional comments  

---

## 🚀 Tech Stack

- **Frontend**: React 19 + Vite (dev server → http://localhost:3000/)  
- **Backend**: Express (optional local backend → http://localhost:5000/)  
- **Styling**: Tailwind CSS 4  
- **Database & Authentication**: Firebase (Firestore + Email/Password Auth)  
- **Animations**: Motion (formerly Framer Motion)  
- **Icons**: Lucide React  
- **Routing**: React Router 7  
- **Utilities**: `date-fns`, `tailwind-merge`  

---

# Run the frontend app
npm run dev   # Vite dev server → http://localhost:3000/

# (Optional) Run Express backend if used
node server.js   # Express backend → http://localhost:5000/

---


✅ Summary

This Reimbursement Management System provides:

Efficient expense submission & tracking
Multi-level, conditional approval flows
Real-time updates & notifications
OCR-enabled receipt scanning
Enterprise-grade security & role-based access

---

⚡ Fully frontend-driven, using Firebase for backend services (database & auth). Express backend is optional.

Designed for scalability, transparency, and ease of use, providing a professional solution for modern business expense management.
