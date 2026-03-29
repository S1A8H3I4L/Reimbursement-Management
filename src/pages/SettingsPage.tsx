import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { User, Company } from '../types';
import { Settings, User as UserIcon, Building, Globe, Mail, Shield, CheckCircle, Loader2 } from 'lucide-react';

interface SettingsPageProps {
  user: User;
}

export default function SettingsPage({ user }: SettingsPageProps) {
  const [company, setCompany] = useState<Company | null>(null);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [companyName, setCompanyName] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const unsubscribeCompany = onSnapshot(doc(db, 'companies', user.companyId), (doc) => {
      const data = doc.data() as Company;
      setCompany(data);
      setCompanyName(data.name);
      setCompanyCountry(data.country);
      setBaseCurrency(data.baseCurrency);
    });

    return () => unsubscribeCompany();
  }, [user.companyId]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { displayName });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.role !== 'admin') return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'companies', user.companyId), { 
        name: companyName,
        country: companyCountry,
        baseCurrency 
      });
      setSuccess('Company settings updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-3 mb-6">
        <Settings size={32} className="text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Account & Settings</h1>
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center space-x-2 border border-green-100 animate-in fade-in slide-in-from-top-4">
          <CheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Settings */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center space-x-2 text-gray-900 font-bold text-lg">
            <UserIcon size={20} className="text-indigo-600" />
            <h3>My Profile</h3>
          </div>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
                <Mail size={16} />
                <span>{user.email}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 capitalize">
                <Shield size={16} />
                <span>{user.role}</span>
              </div>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              <span>Save Profile Changes</span>
            </button>
          </form>
        </section>

        {/* Company Settings (Admin Only) */}
        {user.role === 'admin' && (
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center space-x-2 text-gray-900 font-bold text-lg">
              <Building size={20} className="text-indigo-600" />
              <h3>Company Settings</h3>
            </div>
            
            <form onSubmit={handleUpdateCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={companyCountry}
                  onChange={(e) => setCompanyCountry(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Currency</label>
                <div className="flex items-center space-x-2">
                  <Globe size={16} className="text-gray-400" />
                  <select 
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value)}
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                  </select>
                </div>
              </div>
              <div className="p-4 bg-indigo-50 rounded-xl">
                <p className="text-xs text-indigo-700 leading-relaxed">
                  <strong>Note:</strong> Changing the base currency will affect how new expenses are converted for reporting. Existing expenses will keep their original converted values.
                </p>
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading && <Loader2 className="animate-spin" size={18} />}
                <span>Update Company Settings</span>
              </button>
            </form>
          </section>
        )}

        {/* Security Info */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6 md:col-span-2">
          <div className="flex items-center space-x-2 text-gray-900 font-bold text-lg">
            <Shield size={20} className="text-indigo-600" />
            <h3>Security & Access</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 border border-gray-100 rounded-xl bg-gray-50">
              <p className="text-sm font-bold text-gray-900 mb-1">Account ID</p>
              <p className="text-xs text-gray-500 font-mono break-all">{user.uid}</p>
            </div>
            <div className="p-4 border border-gray-100 rounded-xl bg-gray-50">
              <p className="text-sm font-bold text-gray-900 mb-1">Company ID</p>
              <p className="text-xs text-gray-500 font-mono break-all">{user.companyId}</p>
            </div>
            <div className="p-4 border border-gray-100 rounded-xl bg-gray-50">
              <p className="text-sm font-bold text-gray-900 mb-1">Member Since</p>
              <p className="text-xs text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
