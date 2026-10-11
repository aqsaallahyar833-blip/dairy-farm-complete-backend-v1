import React, { useState } from 'react';
import {
  Building2,
  Users,
  Shield,
  FileSpreadsheet,
  Database,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Globe,
  Clock,
  Bell,
  Plus,
  X,
  Wheat,
  Tag,
  Save,
} from 'lucide-react';
import { mockConfig, mockStorage } from '../services';

interface SettingsViewProps {
  onDataRefresh: () => void;
}

interface UserRecord {
  id: string;
  name: string;
  role: 'Owner' | 'Manager' | 'Vet' | 'Worker' | 'Viewer';
  email: string;
  phone: string;
  shed: string;
  status: 'Active' | 'Invited';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onDataRefresh }) => {
  // Sub-tabs matching Section 16: Farm Profile, Breeds & Categories, Rations, Users & Roles, App Preferences
  const [activeTab, setActiveTab] = useState<
    'farm' | 'breeds' | 'rations' | 'roles' | 'preferences' | 'database'
  >('farm');

  const [latency, setLatency] = useState(mockConfig.latencyMs);
  const [resetting, setResetting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Farm Profile State (Section 16: name, location (district, province), total area (acres), contact, currency (PKR), bulk milk buyer name & contract rate)
  const [farmProfile, setFarmProfile] = useState({
    name: 'Green Dairy Farm (Punjab Pure Dairy Ltd)',
    district: 'Kasur',
    province: 'Punjab, Pakistan',
    totalAreaAcres: 45,
    contactPerson: 'Chaudhry Tariq Gujjar',
    contactPhone: '0300-8451234',
    contactEmail: 'operations@punjabpure.com',
    currency: 'PKR (Pakistani Rupee)',
    bulkMilkBuyer: 'Engro Foods (FrieslandCampina)',
    contractRatePKR: 175,
  });

  // Users List (Section 16: list of users (name, role: owner, manager, vet, worker, viewer), invite/add user modal)
  const [users, setUsers] = useState<UserRecord[]>([
    {
      id: 'u-1',
      name: 'Chaudhry Tariq Gujjar',
      role: 'Owner',
      email: 'tariq@punjabpure.com',
      phone: '0300-8451234',
      shed: 'All Facilities',
      status: 'Active',
    },
    {
      id: 'u-2',
      name: 'Muhammad Ali',
      role: 'Manager',
      email: 'manager@punjabpure.com',
      phone: '0301-4455667',
      shed: 'All Sheds',
      status: 'Active',
    },
    {
      id: 'u-3',
      name: 'Dr. Imran Qureshi',
      role: 'Vet',
      email: 'vet@punjabpure.com',
      phone: '0302-9988776',
      shed: 'Hospital & Maternity Shed',
      status: 'Active',
    },
    {
      id: 'u-4',
      name: 'Rashid Khan',
      role: 'Worker',
      email: 'milking@punjabpure.com',
      phone: '0304-1122334',
      shed: 'Milking Parlor & Tank Room',
      status: 'Active',
    },
    {
      id: 'u-5',
      name: 'Farooq Ahmad',
      role: 'Viewer',
      email: 'accounts@punjabpure.com',
      phone: '0305-6677889',
      shed: 'Finance & Administration',
      status: 'Active',
    },
  ]);

  // Invite/Add User Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Worker' as UserRecord['role'],
    shed: 'Shed 1',
  });

  // App Preferences State (Section 16: language (English, Urdu transliteration), date format, default milking shift times, notifications (push, SMS))
  const [preferences, setPreferences] = useState({
    language: 'English',
    dateFormat: 'YYYY-MM-DD',
    morningShiftTime: '04:30',
    eveningShiftTime: '16:30',
    enablePushAlerts: true,
    enableSmsAlerts: true,
    smsRecipients: '03008451234, 03029988776',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleLatencyChange = (ms: number) => {
    setLatency(ms);
    mockConfig.latencyMs = ms;
    showToast(`Simulated network latency set to ${ms}ms`);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all farm data to initial factory demonstration seed?')) {
      setResetting(true);
      mockStorage.reset();
      setTimeout(() => {
        setResetting(false);
        onDataRefresh();
        showToast('Database reset to initial demonstration state.');
      }, 400);
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email) return;

    const newUser: UserRecord = {
      id: `u-${users.length + 1}`,
      name: inviteForm.name,
      email: inviteForm.email,
      phone: inviteForm.phone,
      role: inviteForm.role,
      shed: inviteForm.shed,
      status: 'Invited',
    };

    setUsers([...users, newUser]);
    setShowInviteModal(false);
    setInviteForm({ name: '', email: '', phone: '', role: 'Worker', shed: 'Shed 1' });
    showToast(`Invitation sent to ${newUser.name} (${newUser.role})`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-700" />
              <span>Farm Settings &amp; Configuration</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Farm profile &bull; Cattle breeds &bull; Ration templates &bull; Users &amp; roles &bull; System preferences
          </p>
        </div>
      </div>

      {/* Sub-tabs per Section 16 */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs flex space-x-1.5 overflow-x-auto scrollbar-none">
        {[
          { key: 'farm', label: 'Farm Profile', icon: Building2 },
          { key: 'breeds', label: 'Breeds & Categories', icon: Tag },
          { key: 'rations', label: 'Rations Setup', icon: Wheat },
          { key: 'roles', label: 'Users & Roles', icon: Users },
          { key: 'preferences', label: 'App Preferences', icon: Sliders },
          { key: 'database', label: 'Database & Sync', icon: Database },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 min-h-[38px] ${
                activeTab === t.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: FARM PROFILE (Section 16 Specification)                         */}
      {/* ========================================================================= */}
      {activeTab === 'farm' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Farm Profile &amp; Commercial Contract</h3>
              <p className="text-xs text-slate-500">Official registry credentials and bulk milk supply agreement</p>
            </div>
            <button
              onClick={() => showToast('Farm profile settings saved successfully')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center space-x-1.5 min-h-[38px]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Farm Name *</label>
              <input
                type="text"
                value={farmProfile.name}
                onChange={(e) => setFarmProfile({ ...farmProfile, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Location District *</label>
              <input
                type="text"
                value={farmProfile.district}
                onChange={(e) => setFarmProfile({ ...farmProfile, district: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Province / State *</label>
              <input
                type="text"
                value={farmProfile.province}
                onChange={(e) => setFarmProfile({ ...farmProfile, province: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Total Farm Area (Acres) *</label>
              <input
                type="number"
                value={farmProfile.totalAreaAcres}
                onChange={(e) =>
                  setFarmProfile({ ...farmProfile, totalAreaAcres: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Primary Contact Person</label>
              <input
                type="text"
                value={farmProfile.contactPerson}
                onChange={(e) => setFarmProfile({ ...farmProfile, contactPerson: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Contact Phone (WhatsApp)</label>
              <input
                type="text"
                value={farmProfile.contactPhone}
                onChange={(e) => setFarmProfile({ ...farmProfile, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Operational Currency</label>
              <input
                type="text"
                readOnly
                value={farmProfile.currency}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Bulk Milk Commercial Buyer *</label>
              <input
                type="text"
                value={farmProfile.bulkMilkBuyer}
                onChange={(e) => setFarmProfile({ ...farmProfile, bulkMilkBuyer: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Bulk Milk Contract Base Rate (PKR / Liter) *</label>
              <input
                type="number"
                value={farmProfile.contractRatePKR}
                onChange={(e) =>
                  setFarmProfile({ ...farmProfile, contractRatePKR: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-emerald-800 font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: BREEDS & CATEGORIES (Section 16 Specification)                  */}
      {/* ========================================================================= */}
      {activeTab === 'breeds' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Supported Cattle Breeds</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block">Holstein Friesian (HF)</span>
                <span className="text-slate-500">Pure exotic high-production dairy line (85% of herd)</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block">Jersey</span>
                <span className="text-slate-500">High milk-fat breed for butterfat premium blending</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block">Crossbred (HF &times; Sahiwal)</span>
                <span className="text-slate-500">Heat-tolerant Punjab climate adapted genetics</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Animal Lifecycle Categories &amp; Stages</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {[
                { name: 'Lactating Cow', desc: 'Active milking herd' },
                { name: 'Dry Cow', desc: 'Late gestation recovery' },
                { name: 'Pregnant Heifer', desc: 'Confirmed pregnant maiden' },
                { name: 'Growing Heifer', desc: '6 to 14 months age' },
                { name: 'Weaned Calf', desc: '3 to 6 months starter' },
                { name: 'Suckling Calf', desc: '0 to 90 days colostrum/milk' },
                { name: 'Breeding Bull', desc: 'Semen donor / natural cover' },
                { name: 'Quarantine / Sick', desc: 'Under veterinary observation' },
              ].map((c) => (
                <div key={c.name} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="font-semibold text-slate-900">{c.name}</div>
                  <div className="text-[11px] text-slate-500">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: RATIONS SETUP (Section 16 Specification)                        */}
      {/* ========================================================================= */}
      {activeTab === 'rations' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Nutritional Rations &amp; Feed Formulas</h3>
              <p className="text-xs text-slate-500">Ration recipes configured per physiological group</p>
            </div>
            <button
              onClick={() => showToast('Ration formulas updated successfully')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              Update Formulas
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
              <span className="font-bold text-emerald-950 text-xs uppercase tracking-wider block">
                High Milker TMR Ration
              </span>
              <p className="text-slate-600 text-[11px]">For cows producing &gt; 25 Liters / day</p>
              <ul className="text-[11px] text-slate-700 space-y-1 list-disc pl-4">
                <li>Corn Silage: 28 kg / day</li>
                <li>Supreme Dairy Wanda (19% CP): 8.5 kg</li>
                <li>Rhodes Grass Hay: 2.5 kg</li>
                <li>Bypass Fat &amp; Minerals: 450 g</li>
              </ul>
              <div className="pt-2 border-t border-emerald-200 font-mono font-bold text-emerald-900">
                Target DMI: 22.5 kg &bull; Est. Cost: Rs 680 / cow / day
              </div>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
              <span className="font-bold text-amber-950 text-xs uppercase tracking-wider block">
                Dry Cow Transition Ration
              </span>
              <p className="text-slate-600 text-[11px]">Last 60 days of gestation (Close-up)</p>
              <ul className="text-[11px] text-slate-700 space-y-1 list-disc pl-4">
                <li>Wheat Straw / Hay: 6 kg / day</li>
                <li>Corn Silage: 14 kg</li>
                <li>Transition Wanda (14% CP): 3.5 kg</li>
                <li>Anionic Salts &amp; Vitamin E: 200 g</li>
              </ul>
              <div className="pt-2 border-t border-amber-200 font-mono font-bold text-amber-900">
                Target DMI: 12.8 kg &bull; Est. Cost: Rs 340 / cow / day
              </div>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
              <span className="font-bold text-blue-950 text-xs uppercase tracking-wider block">
                Calf Starter &amp; Grower Ration
              </span>
              <p className="text-slate-600 text-[11px]">Calves from 2 to 6 months age</p>
              <ul className="text-[11px] text-slate-700 space-y-1 list-disc pl-4">
                <li>Pelleted Calf Starter (21% CP): 2.5 kg</li>
                <li>Alfalfa Leaf Meal Hay: 1.0 kg</li>
                <li>Clean water ad libitum</li>
                <li>Probiotics &amp; Coccidiostat</li>
              </ul>
              <div className="pt-2 border-t border-blue-200 font-mono font-bold text-blue-900">
                Target DMI: 3.5 kg &bull; Est. Cost: Rs 220 / calf / day
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: USERS & ROLES (Section 16 Specification)                        */}
      {/* ========================================================================= */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Farm Team &amp; User Access Roles</h3>
              <p className="text-xs text-slate-500">Roles: Owner, Manager, Vet, Worker, Viewer</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Invite New User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Assigned Shed</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-bold text-slate-900">{u.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'Owner'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'Vet'
                            ? 'bg-rose-100 text-rose-800'
                            : u.role === 'Manager'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{u.phone}</td>
                    <td className="px-4 py-3">{u.shed}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          u.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 5: APP PREFERENCES (Section 16 Specification)                      */}
      {/* ========================================================================= */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Application Regional &amp; Shift Preferences</h3>
              <p className="text-xs text-slate-500">Localization, shift schedules, and automated SMS alerts</p>
            </div>
            <button
              onClick={() => showToast('Preferences updated successfully')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Preferences</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Display Language</label>
              <select
                value={preferences.language}
                onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="English">English (Standard Dairy Terminology)</option>
                <option value="Urdu Transliteration">Roman Urdu Transliteration (Doodh, Gaaye, Sooa)</option>
                <option value="Urdu">اردو (Urdu Dairy Interface)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Calendar &amp; Date Format</label>
              <select
                value={preferences.dateFormat}
                onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (Standard ISO)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (Commonwealth / Pakistan)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Default Morning Milking Shift Time</label>
              <input
                type="time"
                value={preferences.morningShiftTime}
                onChange={(e) => setPreferences({ ...preferences, morningShiftTime: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Default Evening Milking Shift Time</label>
              <input
                type="time"
                value={preferences.eveningShiftTime}
                onChange={(e) => setPreferences({ ...preferences, eveningShiftTime: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-900">SMS &amp; Emergency Mobile Notifications</h4>
            <div className="space-y-2 text-xs">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.enableSmsAlerts}
                  onChange={(e) => setPreferences({ ...preferences, enableSmsAlerts: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-slate-800 font-medium">
                  Send Instant SMS on Antibiotic Withdrawal Violations &amp; Calving Alerts
                </span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.enablePushAlerts}
                  onChange={(e) => setPreferences({ ...preferences, enablePushAlerts: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-slate-800 font-medium">Enable In-Browser Audio Chime for Critical Alerts</span>
              </label>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1 text-xs">
                Emergency Alert SMS Phone Numbers (comma-separated)
              </label>
              <input
                type="text"
                value={preferences.smsRecipients}
                onChange={(e) => setPreferences({ ...preferences, smsRecipients: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 6: DATABASE & SYNC CONTROLS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'database' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Centralized Mock Service Layer Controls</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configured strictly to simulate real REST API behavior with localStorage persistence
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Simulate Network Latency:</span>
              <span className="text-xs font-mono font-bold text-emerald-700">{latency} ms</span>
            </div>
            <div className="flex gap-2">
              {[0, 150, 300, 600].map((ms) => (
                <button
                  key={ms}
                  onClick={() => handleLatencyChange(ms)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    latency === ms
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {ms === 0 ? 'Instant (0ms)' : `${ms}ms`}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 space-y-2">
            <h4 className="text-xs font-bold text-rose-900">Demonstration Database Reset</h4>
            <p className="text-xs text-rose-800">
              Reset all cattle records, milk production logs, treatments, and ledger entries back to the factory demonstration state.
            </p>
            <button
              onClick={handleResetData}
              disabled={resetting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              {resetting ? 'Resetting Database...' : 'Reset to Initial Demonstration Seed'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INVITE / ADD USER (Section 16 Specification)                       */}
      {/* ========================================================================= */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Invite Farm Team Member</h3>
                <p className="text-xs text-slate-500">Configure credentials and role permissions</p>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asif Raza"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. asif@punjabpure.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="0300-1234567"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Role *</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Manager">Manager</option>
                    <option value="Vet">Vet</option>
                    <option value="Worker">Worker</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assigned Shed / Facility</label>
                <select
                  value={inviteForm.shed}
                  onChange={(e) => setInviteForm({ ...inviteForm, shed: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                >
                  <option value="All Facilities">All Facilities</option>
                  <option value="Shed 1">Shed 1 (High Milking Cows)</option>
                  <option value="Shed 2">Shed 2 (Medium Milkers & Dry)</option>
                  <option value="Calf Shed">Calf Shed & Heifers</option>
                  <option value="Hospital & Maternity">Hospital & Maternity Shed</option>
                  <option value="Milking Parlor">Milking Parlor & Bulk Tanks</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
