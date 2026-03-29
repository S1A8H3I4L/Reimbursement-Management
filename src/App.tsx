import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from './types';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import ExpensesPage from './pages/ExpensesPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          setUser(userDoc.exists() ? (userDoc.data() as User) : null);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Firebase error:", err);
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Layout user={user} /> : <Navigate to="/auth" />}>
          <Route index element={
            user?.role === 'admin' ? <AdminDashboard user={user} /> :
              user?.role === 'manager' ? <ManagerDashboard user={user} /> :
                <EmployeeDashboard user={user} />
          } />
          <Route path="expenses" element={user ? <ExpensesPage user={user} /> : <Navigate to="/auth" />} />
          <Route path="settings" element={user ? <SettingsPage user={user} /> : <Navigate to="/auth" />} />
        </Route>
      </Routes>
    </Router>
  );
}
