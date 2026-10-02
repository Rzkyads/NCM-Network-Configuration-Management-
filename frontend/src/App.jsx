import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Play, CheckCircle, AlertCircle, Server, Activity, Terminal, 
  Plus, Trash2, X, Clock, FileText, Eye, Edit3, Search, 
  PlayCircle, GitCompare, Download, LogOut, ShieldCheck, User,
  LayoutDashboard, HardDrive, Archive, Settings as SettingsIcon, LayoutGrid, List
} from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

axios.interceptors.request.use(
  (config) => {
    const storedToken = localStorage.getItem('ncm_token');
    if (storedToken) {
      config.headers.Authorization = `Bearer ${storedToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('ncm_token') || '');
  const [userRole, setUserRole] = useState(localStorage.getItem('ncm_role') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'devices', 'backups', 'settings'
  const [viewMode, setViewMode] = useState('table'); // 'table', 'grid'
  const [vendorFilter, setVendorFilter] = useState('ALL');

  const [devices, setDevices] = useState([]);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState('');
  const [isMassBackingUp, setIsMassBackingUp] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);

  const [tgConfig, setTgConfig] = useState({ bot_token: '', chat_id: '' });
  const [isSavingTg, setIsSavingTg] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);

  const [formData, setFormData] = useState({
    hostname: '', ip_address: '', port: 22, 
    vendor: '', device_type: '', 
    os_version: '', netmiko_driver: '',
    username: '', password: '', is_active: true,
    location: '', notes: ''
  });
  const [selectedDevicePreset, setSelectedDevicePreset] = useState("");

  const devicePresets = [
    { label: "MikroTik - Router - CCR / RB Series (RouterOS v6/v7)", vendor: "MikroTik", type: "Router", driver: "mikrotik_routeros" },
    { label: "MikroTik - Switch - CRS Series (RouterOS / SwitchOS)", vendor: "MikroTik", type: "Switch", driver: "mikrotik_routeros" },
    { label: "MikroTik - Wireless / AP - cAP / wAP Series", vendor: "MikroTik", type: "Wireless AP", driver: "mikrotik_routeros" },
    { label: "Cisco - Router - Catalyst IR1100 / ISR Series", vendor: "Cisco", type: "Router", driver: "cisco_ios" },
    { label: "Cisco - Switch - Catalyst 2960 / 3850 (L2/L3)", vendor: "Cisco", type: "Switch", driver: "cisco_ios" },
    { label: "Cisco - Data Center Switch - Nexus Series", vendor: "Cisco", type: "Switch", driver: "cisco_nxos" },
    { label: "Cisco - Core Router - ASR Series", vendor: "Cisco", type: "Core Router", driver: "cisco_ios" },
    { label: "TP-Link Omada - Managed Switch - TL-SG Series (JetStream)", vendor: "TP-Link Omada", type: "Switch", driver: "tp_link_jetstream" },
    { label: "TP-Link Omada - Gateway / Router - ER Series", vendor: "TP-Link Omada", type: "Router", driver: "tp_link_jetstream" },
    { label: "Ruijie - Access Switch - RG-S2910 / RG-S5750 Series", vendor: "Ruijie", type: "Switch", driver: "ruijie_os" },
    { label: "Ruijie Reyee - Managed Switch - RG-ES Series", vendor: "Ruijie", type: "Switch", driver: "ruijie_os" },
    { label: "HP / Aruba - Switch - ProCurve Series", vendor: "HP / Aruba", type: "Switch", driver: "hp_procurve" },
    { label: "Huawei - Switch - S5700 / S6700 Series (VRP)", vendor: "Huawei", type: "Switch", driver: "huawei" },
    { label: "Juniper - Switch - EX Series (Junos OS)", vendor: "Juniper", type: "Switch", driver: "juniper_junos" },
    { label: "Fortinet - Firewall - FortiGate Series (FortiOS)", vendor: "Fortinet", type: "Firewall", driver: "fortinet" },
    { label: "Lainnya (Custom Manual)", vendor: "", type: "", driver: "autodetect" }
  ];

  const handlePresetChange = (e) => {
    const value = e.target.value;
    const chosen = devicePresets.find(p => p.label === value);
    if (chosen) {
      setFormData({
        ...formData,
        vendor: chosen.vendor,
        device_type: chosen.type,
        netmiko_driver: chosen.driver
      });
    }
    setSelectedDevicePreset(value);
  };
  const [backupTime, setBackupTime] = useState('02:00');

  const [selectedBackupContent, setSelectedBackupContent] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);

  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffData, setDiffData] = useState({ oldLines: [], newLines: [], oldTitle: '', newTitle: '' });
  const [compareSelection, setCompareSelection] = useState({ olderId: '', newerId: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const params = new URLSearchParams();
      params.append('username', loginForm.username);
      params.append('password', loginForm.password);

      const response = await axios.post(`${API_BASE_URL}/auth/login`, params);
      const accessToken = response.data.access_token;
      const role = response.data.role;

      localStorage.setItem('ncm_token', accessToken);
      localStorage.setItem('ncm_role', role);
      setToken(accessToken);
      setUserRole(role);
      setLoginForm({ username: '', password: '' });
    } catch (error) {
      setLoginError('Username atau password salah.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ncm_token');
    localStorage.removeItem('ncm_role');
    setToken('');
    setUserRole('');
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      const [devicesRes, backupsRes, auditRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/devices/`),
        axios.get(`${API_BASE_URL}/backups/`),
        axios.get(`${API_BASE_URL}/audit/`).catch(() => ({ data: [] }))
      ]);
      setDevices(devicesRes.data);
      setBackups(backupsRes.data);
      setAuditLogs(auditRes.data || []);
    } catch (error) {
      if (error.response?.status === 401) {
        handleLogout();
      }
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      axios.get(`${API_BASE_URL}/settings/telegram/`).then(res => {
        if (res.data) setTgConfig({ bot_token: res.data.bot_token || '', chat_id: res.data.chat_id || '' });
      }).catch(() => {});
    }
  }, [token]);

  const handleSaveTelegram = async (e) => {
    e.preventDefault();
    setIsSavingTg(true);
    try {
      await axios.post(`${API_BASE_URL}/settings/telegram/`, tgConfig);
      showNotification('Pengaturan Telegram berhasil disimpan!');
    } catch (error) {
      showNotification('Gagal menyimpan pengaturan Telegram.');
    } finally {
      setIsSavingTg(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!tgConfig.bot_token || !tgConfig.chat_id) {
      alert('Mohon isi Bot Token dan Chat ID terlebih dahulu.');
      return;
    }
    showNotification('Mengirim pesan uji coba ke Telegram...');
    try {
      const res = await axios.post(`${API_BASE_URL}/settings/telegram/test`, tgConfig);
      showNotification(res.data.message);
    } catch (error) {
      showNotification('Gagal mengirim pesan uji coba.');
    }
  };

  const showNotification = (message) => {
    setActionStatus(message);
    setTimeout(() => setActionStatus(''), 5000);
  };

  const handleTriggerBackup = async (deviceId, hostname) => {
    showNotification(`Menjalankan backup ${hostname}...`);
    try {
      await axios.post(`${API_BASE_URL}/devices/${deviceId}/trigger-backup`);
      showNotification(`Sukses: Backup ${hostname} selesai!`);
      setTimeout(fetchData, 2000);
    } catch (error) {
      showNotification(`Gagal: Cek koneksi ${hostname}.`);
    }
  };

  const handleTriggerBackupAll = async () => {
    if (devices.length === 0) {
      showNotification('Tidak ada perangkat untuk di-backup.');
      return;
    }

    if (!window.confirm(`Yakin ingin menjalankan backup massal untuk ${devices.length} perangkat?`)) return;

    setIsMassBackingUp(true);
    showNotification(`Memulai backup massal untuk ${devices.length} perangkat...`);

    try {
      const backupPromises = devices.map(device => 
        axios.post(`${API_BASE_URL}/devices/${device.id}/trigger-backup`).catch(err => ({ error: true }))
      );
      await Promise.all(backupPromises);
      showNotification('Backup massal selesai dikirim ke antrean server!');
      setTimeout(fetchData, 3000);
    } catch (error) {
      showNotification('Terjadi kesalahan saat memicu backup massal.');
    } finally {
      setIsMassBackingUp(false);
    }
  };

  const handleDeleteDevice = async (deviceId, hostname) => {
    if (!window.confirm(`Yakin ingin menghapus perangkat ${hostname}?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/devices/${deviceId}`);
      showNotification(`Perangkat ${hostname} berhasil dihapus.`);
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.detail || `Gagal menghapus perangkat ${hostname}.`);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setCurrentDeviceId(null);
    setFormData({
      hostname: '', ip_address: '', port: 22, 
      vendor: '', device_type: '', 
      os_version: '', netmiko_driver: '',
      username: '', password: '', is_active: true,
      location: '', notes: ''
    });
    setSelectedDevicePreset("");
    setBackupTime('02:00');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (device) => {
    setIsEditMode(true);
    setCurrentDeviceId(device.id);
    setFormData({
      hostname: device.hostname || '',
      ip_address: device.ip_address || '',
      port: device.port || 22,
      vendor: device.vendor || '',
      device_type: device.device_type || '',
      os_version: device.os_version || '',
      netmiko_driver: device.netmiko_driver || '',
      username: device.username || '',
      password: device.password || '',
      is_active: device.is_active ?? true,
      location: device.location || '',
      notes: device.notes || ''
    });

    if (device.cron_schedule && device.cron_schedule !== 'string') {
      const parts = device.cron_schedule.split(' ');
      if (parts.length >= 2) {
        const minute = parts[0].padStart(2, '0');
        const hour = parts[1].padStart(2, '0');
        setBackupTime(`${hour}:${minute}`);
      }
    }

    setIsModalOpen(true);
  };

  const handleSaveDevice = async (e) => {
    e.preventDefault();
    const [hours, minutes] = backupTime.split(':');
    const cronSchedule = `${parseInt(minutes, 10)} ${parseInt(hours, 10)} * * *`;
    const payload = { ...formData, cron_schedule: cronSchedule };

    try {
      if (isEditMode) {
        await axios.put(`${API_BASE_URL}/devices/${currentDeviceId}`, payload);
        showNotification(`Perangkat ${formData.hostname} berhasil diperbarui!`);
      } else {
        await axios.post(`${API_BASE_URL}/devices/`, payload);
        showNotification(`Perangkat ${formData.hostname} berhasil ditambahkan!`);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.detail || `Gagal menyimpan perangkat.`);
    }
  };

  const handleViewConfig = async (backupId) => {
    setIsViewerOpen(true);
    setViewerLoading(true);
    setSelectedBackupContent(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/backups/${backupId}/content`, { responseType: 'text' });
      setSelectedBackupContent(response.data);
    } catch (error) {
      setSelectedBackupContent(`# /etc/swos/config backup file\n# Gagal memuat konten dari: ${error.config?.url || 'server'}`);
    } finally {
      setViewerLoading(false);
    }
  };

  const handleDownloadConfig = async (backupId, filePath) => {
    try {
      showNotification('Mengunduh file konfigurasi...');
      const response = await axios.get(`${API_BASE_URL}/backups/${backupId}/content`, { responseType: 'blob' });
      
      const defaultFilename = filePath ? filePath.split('\\').pop().split('/').pop() : `config_backup_${backupId}.rsc`;
      
      const blob = new Blob([response.data], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', defaultFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showNotification('File .rsc berhasil diunduh!');
    } catch (error) {
      showNotification('Gagal mengunduh file dari server.');
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm('Yakin ingin menghapus riwayat dan file konfigurasi ini?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/backups/${backupId}`);
      showNotification('Riwayat backup berhasil dihapus.');
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.detail || 'Gagal menghapus riwayat backup.');
    }
  };

  const handleOpenDiffModal = () => {
    if (backups.length < 2) {
      alert('Minimal harus ada 2 riwayat backup untuk melakukan perbandingan (Diff).');
      return;
    }
    setCompareSelection({
      olderId: backups[1]?.id || backups[0].id,
      newerId: backups[0].id
    });
    setIsDiffOpen(true);
    runComparison(backups[1]?.id || backups[0].id, backups[0].id);
  };

  const runComparison = async (olderId, newerId) => {
    if (!olderId || !newerId) return;
    setDiffLoading(true);
    try {
      const [resOld, resNew] = await Promise.all([
        axios.get(`${API_BASE_URL}/backups/${olderId}/content`, { responseType: 'text' }).catch(() => ({ data: '# Gagal memuat file lama' })),
        axios.get(`${API_BASE_URL}/backups/${newerId}/content`, { responseType: 'text' }).catch(() => ({ data: '# Gagal memuat file baru' }))
      ]);

      const oldText = typeof resOld.data === 'string' ? resOld.data : JSON.stringify(resOld.data);
      const newText = typeof resNew.data === 'string' ? resNew.data : JSON.stringify(resNew.data);

      const oldLines = oldText.split('\n');
      const newLines = newText.split('\n');

      const oldBackupObj = backups.find(b => b.id === olderId);
      const newBackupObj = backups.find(b => b.id === newerId);

      setDiffData({
        oldLines,
        newLines,
        oldTitle: oldBackupObj ? new Date(oldBackupObj.created_at).toLocaleString('id-ID') : 'Versi Lama',
        newTitle: newBackupObj ? new Date(newBackupObj.created_at).toLocaleString('id-ID') : 'Versi Baru'
      });
    } catch (error) {
      console.error('Error running diff:', error);
    } finally {
      setDiffLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-cyan-100">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-cyan-600 text-white rounded-2xl shadow-lg shadow-cyan-500/30 mb-2">
              <Activity className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Cyaneum NCM</h1>
            <p className="text-xs text-slate-500">Masuk untuk mengelola infrastruktur jaringan</p>
          </div>
          
          {loginError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-xs font-semibold text-center animate-shake">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
              <input 
                required 
                type="text" 
                placeholder="admin / operator"
                value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input 
                required 
                type="password" 
                placeholder="••••••"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none text-sm transition-all"
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-all shadow-md shadow-cyan-500/30 cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? 'Memproses Masuk...' : 'Masuk Sistem'}
            </button>
          </form>
          
          <div className="text-center text-[11px] text-slate-400 border-t border-slate-100 pt-4">
            Default Admin: <span className="font-mono font-semibold text-slate-600">admin / admin123</span><br/>
            Default Operator: <span className="font-mono font-semibold text-slate-600">operator / operator123</span>
          </div>
        </div>
      </div>
    );
  }

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          device.ip_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (device.vendor && device.vendor.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesVendor = vendorFilter === 'ALL' || (device.vendor && device.vendor.toLowerCase() === vendorFilter.toLowerCase());
    return matchesSearch && matchesVendor;
  });

  const totalDevices = devices.length;
  const successBackups = backups.filter(b => b.status === 'success').length;
  const failedBackups = backups.filter(b => b.status === 'failed').length;
  const successRate = totalDevices > 0 ? Math.round((successBackups / (successBackups + failedBackups || 1)) * 100) : 0;
  
  const chartData = [
    { name: 'Sukses', value: successBackups, color: '#06b6d4' },
    { name: 'Gagal', value: failedBackups, color: '#ef4444' }
  ];

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-cyan-400 font-medium">Memuat Sistem Enterprise...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex selection:bg-cyan-500 selection:text-white">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between hidden md:flex sticky top-0 h-screen">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-cyan-400 rounded-xl shadow-lg shadow-cyan-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider text-white">CYANEUM</h1>
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">Enterprise NCM</span>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard Utama
            </button>

            <button 
              onClick={() => setActiveTab('devices')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'devices' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              Manajemen Perangkat
            </button>

            <button 
              onClick={() => setActiveTab('backups')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'backups' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Archive className="w-4 h-4" />
              Arsip Backup (.rsc)
            </button>

            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'settings' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              Pengaturan & Audit
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-slate-800/80 space-y-4 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-cyan-400 font-bold text-xs">
                {userRole.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-200 truncate">Operator NOC</p>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  userRole === 'admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400'
                }`}>
                  {userRole.toUpperCase()}
                </span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-xl transition-all cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen bg-slate-950">
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-6 md:px-10 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold tracking-wide uppercase text-slate-300">
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'devices' && 'Infrastruktur Perangkat Jaringan'}
              {activeTab === 'backups' && 'Arsip & Perbandingan Konfigurasi'}
              {activeTab === 'settings' && 'Integrasi Telegram & Audit Trail'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {actionStatus && (
              <div className="bg-slate-900 border border-cyan-500/30 text-cyan-400 px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-500/10 animate-pulse">
                <Terminal className="w-3.5 h-3.5" />
                {actionStatus}
              </div>
            )}

            <button 
              onClick={handleOpenDiffModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl border border-slate-800 transition-all cursor-pointer shadow-sm"
            >
              <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
              Diff Config
            </button>

            <button 
              onClick={handleTriggerBackupAll}
              disabled={isMassBackingUp || devices.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-600/30 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <PlayCircle className="w-4 h-4" />
              {isMassBackingUp ? 'Memproses...' : 'Backup Semua'}
            </button>

            {userRole === 'admin' && activeTab === 'devices' && (
              <button 
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Perangkat
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Tab Contents */}
        <div className="p-6 md:p-10 space-y-8 flex-1">
          
          {/* TAB 1: DASHBOARD UTAMA */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* Stat Cards (Glassmorphism & Subtle Shadow) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-800/80 flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-all"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Perangkat Aktif</p>
                      <p className="text-3xl font-black text-white mt-2">{totalDevices}</p>
                    </div>
                    <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
                      <Server className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[11px] text-cyan-400 font-semibold">
                    <span>🟢 100% online & terhubung</span>
                  </div>
                </div>
                
                <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-800/80 flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Backup Sukses</p>
                      <p className="text-3xl font-black text-emerald-400 mt-2">{successBackups}</p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                    <span>↑ {successRate}% tingkat keberhasilan</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-800/80 flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/10 transition-all"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Backup Gagal</p>
                      <p className="text-3xl font-black text-rose-400 mt-2">{failedBackups}</p>
                    </div>
                    <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                    <span>Perlu verifikasi kredensial</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Rasio Kesehatan</p>
                    <p className="text-2xl font-black text-cyan-400">{successRate}%</p>
                    <p className="text-[10px] text-slate-500 mt-1">Sistem automasi berjalan normal</p>
                  </div>
                  <div className="w-20 h-20">
                    {successBackups === 0 && failedBackups === 0 ? (
                      <div className="flex items-center justify-center h-full text-xs text-slate-500">N/A</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={35} stroke="none" paddingAngle={4}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Shortcuts & Recent Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Aktivitas Perangkat Terbaru</h3>
                    <button onClick={() => setActiveTab('devices')} className="text-xs font-semibold text-cyan-400 hover:text-cyan-300">Kelola Semua →</button>
                  </div>

                  <div className="divide-y divide-slate-800/60">
                    {devices.slice(0, 4).map(device => (
                      <div key={device.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${device.is_active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-600'}`}></div>
                          <div>
                            <p className="text-xs font-bold text-slate-200">{device.hostname}</p>
                            <p className="text-[11px] font-mono text-slate-500">{device.ip_address}:{device.port} • {device.vendor}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleTriggerBackup(device.id, device.hostname)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Backup Now
                        </button>
                      </div>
                    ))}
                    {devices.length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-6">Belum ada perangkat terdaftar.</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 p-8 space-y-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2">Pusat Pintasan NOC</h3>
                    <p className="text-xs text-slate-400">Aksi cepat untuk pemeliharaan jaringan dan konfigurasi.</p>
                  </div>

                  <div className="space-y-3">
                    <button onClick={handleOpenAddModal} className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border border-slate-700/60">
                      <span className="flex items-center gap-2"><Plus className="w-4 h-4 text-cyan-400" /> Tambah Router/Switch Baru</span>
                      <span>→</span>
                    </button>
                    <button onClick={handleOpenDiffModal} className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border border-slate-700/60">
                      <span className="flex items-center gap-2"><GitCompare className="w-4 h-4 text-cyan-400" /> Periksa Perbedaan Config</span>
                      <span>→</span>
                    </button>
                    <button onClick={() => setActiveTab('backups')} className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border border-slate-700/60">
                      <span className="flex items-center gap-2"><Archive className="w-4 h-4 text-cyan-400" /> Unduh Arsip .rsc</span>
                      <span>→</span>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 text-center font-mono">
                    Cyaneum Engine v1.0 • Stable Release
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: MANAJEMEN PERANGKAT */}
          {activeTab === 'devices' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Toolbar & Filter */}
              <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Cari hostname, IP, vendor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-950 rounded-xl border border-slate-800 focus:border-cyan-500 outline-none text-xs text-slate-200 transition-all"
                    />
                  </div>

                  <select 
                    value={vendorFilter} 
                    onChange={e => setVendorFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 outline-none"
                  >
                    <option value="ALL">Semua Vendor</option>
                    <option value="MikroTik">MikroTik</option>
                    <option value="Cisco">Cisco</option>
                    <option value="TP-Link Omada">TP-Link Omada</option>
                    <option value="Ruijie">Ruijie</option>
                    <option value="HP / Aruba">HP / Aruba</option>
                    <option value="Huawei">Huawei</option>
                    <option value="Juniper">Juniper</option>
                    <option value="Fortinet">Fortinet</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button 
                    onClick={() => setViewMode('table')} 
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'table' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="Tampilan Tabel"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode('grid')} 
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="Tampilan Grid Card"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* View Mode: Table */}
              {viewMode === 'table' ? (
                <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                          <th className="px-6 py-3.5 font-semibold">Hostname / IP</th>
                          <th className="px-6 py-3.5 font-semibold">Vendor & Lokasi</th>
                          <th className="px-6 py-3.5 font-semibold">Status</th>
                          <th className="px-6 py-3.5 font-semibold text-right">Aksi Cepat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs">
                        {filteredDevices.map((device) => (
                          <tr key={device.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-200">{device.hostname}</p>
                              <p className="text-slate-400 font-mono text-[11px]">{device.ip_address}:{device.port}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full font-bold border border-cyan-500/20">
                                  {device.vendor || 'Custom'}
                                </span>
                                <span className="text-slate-400 text-[11px]">{device.location || 'Server Room'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {device.is_active ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-bold border border-emerald-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-800 text-slate-400 rounded-full font-bold border border-slate-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>Offline
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right space-x-1">
                              <button 
                                onClick={() => handleTriggerBackup(device.id, device.hostname)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl transition-all shadow-sm cursor-pointer"
                              >
                                <Play className="w-3 h-3" /> Backup
                              </button>
                              {userRole === 'admin' && (
                                <>
                                  <button onClick={() => handleOpenEditModal(device)} className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg cursor-pointer" title="Edit">
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDeleteDevice(device.id, device.hostname)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg cursor-pointer" title="Hapus">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                        {filteredDevices.length === 0 && (
                          <tr>
                            <td colSpan="4" className="px-6 py-12 text-center text-slate-500">Tidak ada perangkat yang ditemukan.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* View Mode: Grid Cards */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {filteredDevices.map(device => (
                    <div key={device.id} className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 p-6 space-y-4 relative group hover:border-cyan-500/50 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-3 h-3 rounded-full ${device.is_active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse' : 'bg-slate-600'}`}></div>
                          <h4 className="font-bold text-slate-100">{device.hostname}</h4>
                        </div>
                        <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold rounded-md border border-cyan-500/20">
                          {device.vendor || 'Custom'}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-xs text-slate-400 bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
                        <p>IP: <span className="text-slate-200">{device.ip_address}:{device.port}</span></p>
                        <p>Loc: <span className="text-slate-200">{device.location || 'N/A'}</span></p>
                        <p>Type: <span className="text-slate-200">{device.device_type}</span></p>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <button 
                          onClick={() => handleTriggerBackup(device.id, device.hostname)}
                          className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" /> Backup Sekarang
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredDevices.length === 0 && (
                    <div className="col-span-3 text-center py-12 text-slate-500">Tidak ada perangkat ditemukan.</div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: ARSIP BACKUP */}
          {activeTab === 'backups' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Arsip File Konfigurasi .rsc / .cfg</h3>
                  </div>
                  <button onClick={handleOpenDiffModal} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
                    Bandingkan 2 Versi (Diff)
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-950/50 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                        <th className="px-6 py-3.5 font-semibold">Waktu Eksekusi</th>
                        <th className="px-6 py-3.5 font-semibold">Status</th>
                        <th className="px-6 py-3.5 font-semibold">File Path</th>
                        <th className="px-6 py-3.5 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {backups.map((backup) => (
                        <tr key={backup.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-200">
                            {new Date(backup.created_at).toLocaleString('id-ID')}
                          </td>
                          <td className="px-6 py-4">
                            {backup.status === 'success' ? (
                              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-bold border border-emerald-500/20">
                                Berhasil
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-400 rounded-full font-bold border border-rose-500/20">
                                Gagal
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                            {backup.file_path || 'Server storage'}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => handleViewConfig(backup.id)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg cursor-pointer">
                              Lihat
                            </button>
                            <button onClick={() => handleDownloadConfig(backup.id, backup.file_path)} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg cursor-pointer">
                              Download
                            </button>
                            {userRole === 'admin' && (
                              <button onClick={() => handleDeleteBackup(backup.id)} className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg cursor-pointer">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {backups.length === 0 && (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-slate-500">Belum ada arsip backup tercatat.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PENGATURAN & AUDIT */}
          {activeTab === 'settings' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* Telegram Settings */}
              {userRole === 'admin' && (
                <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                    <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Integrasi Telegram Notifikasi</h3>
                      <p className="text-xs text-slate-400">Kirim laporan otomatis dan peringatan error backup langsung ke Telegram.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveTelegram} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Bot Token</label>
                      <input 
                        type="password"
                        placeholder="123456789:ABCdef..."
                        value={tgConfig.bot_token}
                        onChange={e => setTgConfig({...tgConfig, bot_token: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none text-xs font-mono focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Chat ID</label>
                      <input 
                        type="text"
                        placeholder="987654321"
                        value={tgConfig.chat_id}
                        onChange={e => setTgConfig({...tgConfig, chat_id: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none text-xs font-mono focus:border-cyan-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="submit" disabled={isSavingTg} className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer">
                        Simpan
                      </button>
                      <button type="button" onClick={handleTestTelegram} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer">
                        Tes Kirim
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Audit Trail */}
              <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Log Audit Aktivitas Sistem</h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">Real-time tracking</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-950/50 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                        <th className="px-6 py-3.5 font-semibold">Waktu</th>
                        <th className="px-6 py-3.5 font-semibold">User</th>
                        <th className="px-6 py-3.5 font-semibold">Aksi</th>
                        <th className="px-6 py-3.5 font-semibold">Deskripsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/40">
                          <td className="px-6 py-3 text-slate-400">{new Date(log.created_at).toLocaleString('id-ID')}</td>
                          <td className="px-6 py-3"><span className="text-cyan-400">@{log.username}</span></td>
                          <td className="px-6 py-3"><span className="px-2 py-0.5 bg-slate-800 rounded text-slate-200">{log.action}</span></td>
                          <td className="px-6 py-3 text-slate-300 font-sans">{log.description}</td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan="4" className="px-6 py-8 text-center text-slate-500 font-sans">Belum ada audit log tercatat.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* MODALS (Viewer, Diff, Add/Edit Device) */}
      {isViewerOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 text-slate-100 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-800">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-mono font-bold text-cyan-400">Config Viewer (.rsc)</h3>
              </div>
              <button onClick={() => setIsViewerOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 bg-slate-950/50">
              {viewerLoading ? <div className="text-center text-slate-500 py-8 animate-pulse">Memuat konfigurasi...</div> : <pre className="whitespace-pre-wrap">{selectedBackupContent}</pre>}
            </div>
          </div>
        </div>
      )}

      {isDiffOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 text-slate-100 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-800 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h3 className="text-xs font-mono font-bold text-cyan-400">Configuration Diff</h3>
              <div className="flex items-center gap-3 text-xs font-mono">
                <select value={compareSelection.olderId} onChange={e => { setCompareSelection({...compareSelection, olderId: e.target.value}); runComparison(e.target.value, compareSelection.newerId); }} className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 outline-none">
                  {backups.map(b => <option key={b.id} value={b.id}>{new Date(b.created_at).toLocaleString('id-ID')}</option>)}
                </select>
                <span>vs</span>
                <select value={compareSelection.newerId} onChange={e => { setCompareSelection({...compareSelection, newerId: e.target.value}); runComparison(compareSelection.olderId, e.target.value); }} className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 outline-none">
                  {backups.map(b => <option key={b.id} value={b.id}>{new Date(b.created_at).toLocaleString('id-ID')}</option>)}
                </select>
                <button onClick={() => setIsDiffOpen(false)} className="text-slate-400 hover:text-white cursor-pointer ml-4"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-4 bg-slate-950/40 grid grid-cols-2 gap-4 text-xs font-mono overflow-y-auto max-h-[65vh]">
              <div className="bg-slate-950 border border-rose-900/30 rounded-2xl p-4">
                <div className="text-rose-400 font-bold mb-2">[-] {diffData.oldTitle}</div>
                {diffData.oldLines.map((l, i) => <div key={i} className={`px-2 py-0.5 rounded ${!diffData.newLines.includes(l) ? 'bg-rose-950/40 text-rose-300' : 'text-slate-400'}`}><span className="mr-3 text-slate-600">{i+1}</span>{l}</div>)}
              </div>
              <div className="bg-slate-950 border border-emerald-900/30 rounded-2xl p-4">
                <div className="text-emerald-400 font-bold mb-2">[+] {diffData.newTitle}</div>
                {diffData.newLines.map((l, i) => <div key={i} className={`px-2 py-0.5 rounded ${!diffData.oldLines.includes(l) ? 'bg-emerald-950/40 text-emerald-300' : 'text-slate-400'}`}><span className="mr-3 text-slate-600">{i+1}</span>{l}</div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 text-slate-100 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-800">
            <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h2 className="text-base font-bold text-slate-100">{isEditMode ? 'Edit Perangkat' : 'Tambah Perangkat Baru'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveDevice} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Preset Merek & Model</label>
                    <select value={selectedDevicePreset} onChange={handlePresetChange} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none font-mono">
                      <option value="" disabled>-- Pilih Preset --</option>
                      {devicePresets.map((p, idx) => <option key={idx} value={p.label}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Hostname</label>
                    <input required type="text" value={formData.hostname} onChange={e => setFormData({...formData, hostname: e.target.value})} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none" placeholder="Router-Core-01" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">IP Address</label>
                    <input required type="text" value={formData.ip_address} onChange={e => setFormData({...formData, ip_address: e.target.value})} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none font-mono" placeholder="192.168.1.1" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Port SSH</label>
                    <input required type="number" min="1" max="65535" value={formData.port} onChange={e => setFormData({...formData, port: parseInt(e.target.value) || 22})} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none font-mono" placeholder="22" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Username SSH</label>
                    <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none" placeholder="admin" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Password SSH</label>
                    <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none" placeholder="••••••" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Lokasi / Ruangan</label>
                    <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none" placeholder="Server Room Lt.2" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Waktu Backup Harian (WIB)</label>
                    <input required type="time" value={backupTime} onChange={e => setBackupTime(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none font-mono" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer">Batal</button>
                <button type="submit" className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-cyan-600/30">Simpan Perangkat</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
