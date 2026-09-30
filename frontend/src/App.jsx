import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Play, CheckCircle, AlertCircle, Server, Activity, Terminal, 
  Plus, Trash2, X, Clock, FileText, Eye, Edit3, Search, 
  PlayCircle, GitCompare, Download, LogOut, ShieldCheck, User 
} from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// Axios Interceptor untuk otomatis menyertakan Token JWT
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
  // State Autentikasi
  const [token, setToken] = useState(localStorage.getItem('ncm_token') || '');
  const [userRole, setUserRole] = useState(localStorage.getItem('ncm_role') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // State Data Dashboard
  const [devices, setDevices] = useState([]);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState('');
  const [isMassBackingUp, setIsMassBackingUp] = useState(false);
  
  // State untuk Pencarian & Filter
  const [searchTerm, setSearchTerm] = useState('');

  // State untuk Audit Trail
  const [auditLogs, setAuditLogs] = useState([]);

  // State untuk Panel Telegram
  const [tgConfig, setTgConfig] = useState({ bot_token: '', chat_id: '' });
  const [isSavingTg, setIsSavingTg] = useState(false);

  // State Modal Tambah/Edit Perangkat
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);

  const [formData, setFormData] = useState({
    hostname: '', ip_address: '', port: 22, 
    vendor: 'MikroTik', device_type: 'Router', 
    username: '', password: '', is_active: true
  });
  const [backupTime, setBackupTime] = useState('02:00');

  // State Modal Viewer .rsc
  const [selectedBackupContent, setSelectedBackupContent] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);

  // State Modal Diff / Compare
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

  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/audit/`);
      setAuditLogs(res.data);
    } catch (error) {
      console.error('Gagal memuat audit logs:', error);
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
      vendor: 'MikroTik', device_type: 'Router', 
      username: '', password: '', is_active: true
    });
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
      vendor: device.vendor || 'MikroTik',
      device_type: device.device_type || 'Router',
      username: device.username || '',
      password: device.password || '',
      is_active: device.is_active ?? true
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

  // TAMPILAN HALAMAN LOGIN (Jika belum login)
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-cyan-100">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-cyan-500 text-white rounded-2xl shadow-lg shadow-cyan-500/30 mb-2">
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

  const filteredDevices = devices.filter(device => 
    device.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.ip_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.vendor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDevices = devices.length;
  const successBackups = backups.filter(b => b.status === 'success').length;
  const failedBackups = backups.filter(b => b.status === 'failed').length;
  const chartData = [
    { name: 'Sukses', value: successBackups, color: '#06b6d4' },
    { name: 'Gagal', value: failedBackups, color: '#ef4444' }
  ];

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-medium">Memuat Sistem...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 selection:bg-cyan-100">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section dengan Badge Role & Tombol Logout */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-cyan-500 rounded-lg shadow-sm shadow-cyan-200">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Cyaneum NCM</h1>
            </div>
            <div className="flex items-center gap-2 ml-12">
              <p className="text-slate-500 font-medium text-sm">Network Configuration Management</p>
              <span className="text-slate-300">•</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                userRole === 'admin' 
                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                {userRole.toUpperCase()}
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {actionStatus && (
              <div className="bg-slate-800 text-cyan-400 px-5 py-2 rounded-full text-sm font-semibold shadow-lg shadow-slate-200/50 flex items-center gap-2 animate-pulse">
                <Terminal className="w-4 h-4" />
                {actionStatus}
              </div>
            )}
            
            <button 
              onClick={handleOpenDiffModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl border border-slate-200 transition-all shadow-sm cursor-pointer"
            >
              <GitCompare className="w-4 h-4 text-cyan-600" />
              Bandingkan Config
            </button>

            <button 
              onClick={handleTriggerBackupAll}
              disabled={isMassBackingUp || devices.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <PlayCircle className="w-5 h-5 text-cyan-400" />
              {isMassBackingUp ? 'Memproses...' : 'Backup Semua'}
            </button>

            {userRole === 'admin' && (
              <button 
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-cyan-500/40 active:scale-95 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Tambah Perangkat
              </button>
            )}

            <button 
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold rounded-xl border border-rose-200 transition-all cursor-pointer shadow-sm"
              title="Keluar dari Sistem"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100/60 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Perangkat Aktif</p>
              <Server className="w-5 h-5 text-cyan-500" />
            </div>
            <p className="text-4xl font-black text-slate-700 mt-4">{totalDevices}</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100/60 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Backup Sukses</p>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-4xl font-black text-emerald-600 mt-4">{successBackups}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100/60 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Backup Gagal</p>
              <AlertCircle className="w-5 h-5 text-rose-500" />
            </div>
            <p className="text-4xl font-black text-rose-600 mt-4">{failedBackups}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100/60 flex items-center justify-center">
            {successBackups === 0 && failedBackups === 0 ? (
               <p className="text-sm text-slate-400">Belum ada data</p>
            ) : (
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={50} stroke="none" paddingAngle={5}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip cursor={false} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Devices Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100/60 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">Infrastruktur Jaringan</h2>
            
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Cari hostname, IP, vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 focus:border-cyan-500 outline-none text-sm transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white text-slate-400 text-xs uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-4 font-semibold">Hostname / IP</th>
                  <th className="px-8 py-4 font-semibold">Vendor & Tipe</th>
                  <th className="px-8 py-4 font-semibold">Status</th>
                  <th className="px-8 py-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-700">{device.hostname}</p>
                      <p className="text-slate-500 font-mono text-sm">{device.ip_address}:{device.port}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-bold tracking-wide border border-cyan-100">
                          {device.vendor}
                        </span>
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold border border-slate-200">
                          {device.device_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {device.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold border border-slate-200">
                          <span className="w-2 h-2 rounded-full bg-slate-300"></span>Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right space-x-1">
                      <button 
                        onClick={() => handleTriggerBackup(device.id, device.hostname)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-cyan-600 text-white text-xs font-semibold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Backup
                      </button>
                      
                      {userRole === 'admin' && (
                        <>
                          <button 
                            onClick={() => handleOpenEditModal(device)}
                            className="inline-flex items-center p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl transition-all cursor-pointer"
                            title="Edit Perangkat"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteDevice(device.id, device.hostname)}
                            className="inline-flex items-center p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                            title="Hapus Perangkat"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredDevices.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-8 py-12 text-center text-slate-400">
                      {devices.length === 0 ? 'Belum ada perangkat terdaftar.' : 'Tidak ada perangkat yang cocok dengan pencarian.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabel Riwayat File Backup (.rsc Viewer & Tombol Download) */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100/60 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-600" />
              <h2 className="text-lg font-bold text-slate-800">Riwayat File Konfigurasi Backup</h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">Klik tombol untuk melihat atau mengunduh file .rsc</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white text-slate-400 text-xs uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-4 font-semibold">Waktu Eksekusi</th>
                  <th className="px-8 py-4 font-semibold">Status</th>
                  <th className="px-8 py-4 font-semibold">Direktori File Penyimpanan</th>
                  <th className="px-8 py-4 font-semibold text-right">Aksi Viewer & Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-4 text-sm font-semibold text-slate-700">
                      {new Date(backup.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-8 py-4">
                      {backup.status === 'success' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
                          Berhasil
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-100">
                          Gagal
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-4 font-mono text-xs text-slate-500 truncate max-w-xs" title={backup.file_path}>
                      {backup.file_path || 'Simpanan server lokal'}
                    </td>
                    <td className="px-8 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleViewConfig(backup.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                        title="Lihat isi konfigurasi di browser"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Lihat
                      </button>
                      <button 
                        onClick={() => handleDownloadConfig(backup.id, backup.file_path)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
                        title="Download file .rsc ke komputer"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        Download
                      </button>
                      <button 
                        onClick={() => handleDeleteBackup(backup.id)}
                        className="inline-flex items-center p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                        title="Hapus riwayat & file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {backups.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-8 py-8 text-center text-slate-400">Belum ada riwayat backup tercatat.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel Pengaturan Telegram Bot (Hanya Admin) */}
        {userRole === 'admin' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100/60 p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Integrasi Telegram Notifikasi</h2>
                  <p className="text-xs text-slate-400">Atur Bot Telegram untuk laporan backup harian dan peringatan error.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveTelegram} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Telegram Bot Token</label>
                <input 
                  type="password"
                  placeholder="123456789:ABCdefGhIJK..."
                  value={tgConfig.bot_token}
                  onChange={e => setTgConfig({...tgConfig, bot_token: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Telegram Chat ID</label>
                <input 
                  type="text"
                  placeholder="987654321"
                  value={tgConfig.chat_id}
                  onChange={e => setTgConfig({...tgConfig, chat_id: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none text-sm font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="submit"
                  disabled={isSavingTg}
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Simpan
                </button>
                <button 
                  type="button"
                  onClick={handleTestTelegram}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
                  title="Kirim pesan tes ke Telegram"
                >
                  Tes Kirim
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabel Log Audit Aktivitas */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100/60 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-600" />
              <h2 className="text-lg font-bold text-slate-800">Log Audit Aktivitas (Audit Trail)</h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">Rekam jejak operasional sistem</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white text-slate-400 text-xs uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-4 font-semibold">Waktu</th>
                  <th className="px-8 py-4 font-semibold">Pengguna</th>
                  <th className="px-8 py-4 font-semibold">Aksi</th>
                  <th className="px-8 py-4 font-semibold">Deskripsi Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-8 py-4 text-xs font-semibold text-slate-500 font-mono">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-8 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold font-mono">
                        @{log.username}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-bold border border-cyan-100 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-sm text-slate-700">
                      {log.description}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-8 py-8 text-center text-slate-400">Belum ada catatan aktivitas tercatat.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Viewer Konfigurasi .rsc */}
        {isViewerOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 text-slate-100 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-800">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-mono font-bold text-cyan-400">Router Configuration Viewer (.rsc)</h3>
                </div>
                <button onClick={() => setIsViewerOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 bg-slate-950/30">
                {viewerLoading ? (
                  <div className="flex items-center justify-center py-12 text-slate-500 animate-pulse">Memuat isi konfigurasi...</div>
                ) : (
                  <pre className="whitespace-pre-wrap">{selectedBackupContent || 'Tidak ada konten skrip yang ditemukan.'}</pre>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
                <button onClick={() => setIsViewerOpen(false)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer">
                  Tutup Viewer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Config Diff / Compare Side-by-Side */}
        {isDiffOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 text-slate-100 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-800 flex flex-col max-h-[90vh]">
              
              <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-mono font-bold text-cyan-400">Configuration Diff & Comparison</h3>
                </div>
                
                <div className="flex items-center gap-2 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 mr-1">Versi Lama:</span>
                    <select 
                      value={compareSelection.olderId}
                      onChange={(e) => {
                        setCompareSelection({...compareSelection, olderId: e.target.value});
                        runComparison(e.target.value, compareSelection.newerId);
                      }}
                      className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 outline-none"
                    >
                      {backups.map(b => (
                        <option key={b.id} value={b.id}>{new Date(b.created_at).toLocaleString('id-ID')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-slate-400 mr-1">Versi Baru:</span>
                    <select 
                      value={compareSelection.newerId}
                      onChange={(e) => {
                        setCompareSelection({...compareSelection, newerId: e.target.value});
                        runComparison(compareSelection.olderId, e.target.value);
                      }}
                      className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 outline-none"
                    >
                      {backups.map(b => (
                        <option key={b.id} value={b.id}>{new Date(b.created_at).toLocaleString('id-ID')}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => setIsDiffOpen(false)} className="text-slate-400 hover:text-white cursor-pointer ml-2">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden p-4 bg-slate-950/40">
                {diffLoading ? (
                  <div className="flex items-center justify-center py-24 text-slate-500 animate-pulse font-mono text-sm">Membandingkan skrip konfigurasi...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-y-auto max-h-[65vh] font-mono text-xs">
                    
                    <div className="bg-slate-950 border border-rose-900/30 rounded-2xl p-4 overflow-x-auto">
                      <div className="text-rose-400 font-bold pb-2 mb-2 border-b border-rose-900/30 flex justify-between items-center">
                        <span>[-] {diffData.oldTitle}</span>
                        <span className="text-[10px] text-slate-500">Versi Pembanding</span>
                      </div>
                      <div className="space-y-0.5">
                        {diffData.oldLines.map((line, idx) => {
                          const isRemoved = !diffData.newLines.includes(line);
                          return (
                            <div key={idx} className={`px-2 py-0.5 rounded ${isRemoved ? 'bg-rose-950/40 text-rose-300 font-semibold' : 'text-slate-400'}`}>
                              <span className="text-slate-600 select-none mr-3">{idx + 1}</span>
                              {line || ' '}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-emerald-900/30 rounded-2xl p-4 overflow-x-auto">
                      <div className="text-emerald-400 font-bold pb-2 mb-2 border-b border-emerald-900/30 flex justify-between items-center">
                        <span>[+] {diffData.newTitle}</span>
                        <span className="text-[10px] text-slate-500">Versi Terkini</span>
                      </div>
                      <div className="space-y-0.5">
                        {diffData.newLines.map((line, idx) => {
                          const isAdded = !diffData.oldLines.includes(line);
                          return (
                            <div key={idx} className={`px-2 py-0.5 rounded ${isAdded ? 'bg-emerald-950/40 text-emerald-300 font-semibold' : 'text-slate-400'}`}>
                              <span className="text-slate-600 select-none mr-3">{idx + 1}</span>
                              {line || ' '}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex justify-between items-center text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500/40 border border-rose-500"></span> Baris Dihapus / Berubah</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500"></span> Baris Baru Ditambahkan</span>
                </div>
                <button onClick={() => setIsDiffOpen(false)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl cursor-pointer">
                  Tutup Perbandingan
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Modal Tambah / Edit Perangkat */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-800">
                  {isEditMode ? 'Edit Perangkat Jaringan' : 'Tambah Perangkat Jaringan'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSaveDevice} className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Hostname</label>
                      <input required type="text" value={formData.hostname} onChange={e => setFormData({...formData, hostname: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none transition-all" placeholder="Router-Core-01" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">IP Address</label>
                      <input required type="text" value={formData.ip_address} onChange={e => setFormData({...formData, ip_address: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none transition-all font-mono text-sm" placeholder="192.168.18.254" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Vendor</label>
                      <select value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none bg-white">
                        <option value="MikroTik">MikroTik</option>
                        <option value="Cisco">Cisco</option>
                        <option value="Juniper">Juniper</option>
                        <option value="TP-Link Omada">TP-Link Omada</option>
                        <option value="Huawei">Huawei</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Tipe Perangkat</label>
                      <select value={formData.device_type} onChange={e => setFormData({...formData, device_type: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none bg-white">
                        <option value="Router">Router</option>
                        <option value="Switch">Switch</option>
                        <option value="Access Point">Access Point</option>
                        <option value="Firewall">Firewall</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Username SSH</label>
                      <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none transition-all" placeholder="admin" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Password SSH</label>
                      <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none transition-all" placeholder="••••••" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Waktu Backup Harian</span>
                        <span className="text-xs font-normal text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> WIB
                        </span>
                      </label>
                      <input 
                        required 
                        type="time" 
                        value={backupTime} 
                        onChange={e => setBackupTime(e.target.value)} 
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-cyan-500 outline-none transition-all font-mono text-sm bg-white" 
                      />
                    </div>
                    <div className="pt-7">
                      <button type="submit" className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-all shadow-md shadow-cyan-500/30 cursor-pointer">
                        {isEditMode ? 'Simpan Perubahan' : 'Simpan Perangkat'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
