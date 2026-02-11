import React, { useState, useEffect } from "react";
import {
  FileText,
  RefreshCw,
  Loader2,
  Tag,
  AlertTriangle,
  CheckCircle,
  Database,
  TrendingUp,
  Clock
} from "lucide-react";
import { useToast } from '../../contexts/ToastContext';

const API_URL = import.meta.env.VITE_SHEET_API_URL;
// Sheet Names (matching TpSummary.jsx)
const SUMMARY_SHEET = import.meta.env.VITE_SHEET_SUMMARY || "SUMMARY";
const SHEET_42 = import.meta.env.VITE_SHEET_42 || "Sheet42";
const SHEET_45 = import.meta.env.VITE_SHEET_45 || "Sheet45";
const TP_NOT_RECEIVE_SHEET = import.meta.env.VITE_SHEET_TP_NOT_RECEIVE || "Tp not receive";

const Dashboard = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState({
    totalSummaryRows: 0,
    lowChhatniCount: 0,
    approvedCount: 0,
    totalRemainingQty: 0,
    remainingItemsCount: 0,
    uniqueTpCount: 0,
    sheet4245Count: 0,
    tpNotReceiveCount: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const fetchSheetData = async (sheetName) => {
    const res = await fetch(`${API_URL}?sheet=${encodeURIComponent(sheetName)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || `Failed to fetch ${sheetName}`);
    return data.data || [];
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [summaryRaw, s42Raw, s45Raw, tnrRaw] = await Promise.all([
        fetchSheetData(SUMMARY_SHEET).catch(() => []),
        fetchSheetData(SHEET_42).catch(() => []),
        fetchSheetData(SHEET_45).catch(() => []),
        fetchSheetData(TP_NOT_RECEIVE_SHEET).catch(() => [])
      ]);

      // --- Process SUMMARY Data ---
      let totalSummaryRows = 0;
      let lowChhatniCount = 0;
      let approvedCount = 0;

      // Start from index 2 (row 3) as per TpSummary.jsx
      for (let i = 2; i < summaryRaw.length; i++) {
        const row = summaryRaw[i];
        if ((row[13] || '').toString().trim() === 'Tp Not received') continue;

        totalSummaryRows++;

        // Chhatni check
        const chhatni = row[9];
        if (typeof chhatni === 'number' && chhatni < 0.025) {
          lowChhatniCount++;
        }

        // Approved check
        if ((row[17] || '').toString() === 'APPROVED') {
          approvedCount++;
        }
      }

      // --- Process REMAINING Data ---
      const remainingItems = [];
      const addedKeys = {};

      // Sheet45
      for (let i = 1; i < s45Raw.length; i++) {
        const r = s45Raw[i];
        const slipNo = (r[1] || '').toString().trim();
        const tpNo = (r[10] || '').toString().trim();
        const pacsName = (r[4] || '').toString().trim();
        const remQty = parseFloat(r[27]) || 0;

        if (remQty > 0 && slipNo && tpNo && pacsName) {
          const k = slipNo + '|' + tpNo + '|' + pacsName;
          if (!addedKeys[k]) {
            addedKeys[k] = true;
            remainingItems.push({ tpNo, remainingQty: remQty, source: 'Sheet45' });
          }
        }
      }

      // Tp not receive
      for (let i = 1; i < tnrRaw.length; i++) {
        const r = tnrRaw[i];
        const status = (r[23] || '').toString().trim();
        if (status === 'APPROVED') continue;
        const slipNo = (r[14] || '').toString().trim();
        const tpNo = (r[4] || '').toString().trim();
        const remQty = parseFloat(r[25]) || 0;

        if (remQty > 0 && slipNo) {
          const k = 'TpNotReceive|' + slipNo;
          if (!addedKeys[k]) {
            addedKeys[k] = true;
            remainingItems.push({ tpNo, remainingQty: remQty, source: 'TpNotReceive' });
          }
        }
      }

      // Sheet42
      for (let i = 1; i < s42Raw.length; i++) {
        const r = s42Raw[i];
        const slipNo = (r[0] || '').toString().trim();
        const tpNo = (r[1] || '').toString().trim();
        const pacsName = (r[3] || '').toString().trim();
        const remQty = parseFloat(r[15]) || 0;

        if (remQty > 0 && slipNo && tpNo && pacsName) {
          const k = slipNo + '|' + tpNo + '|' + pacsName;
          if (!addedKeys[k]) {
            addedKeys[k] = true;
            remainingItems.push({ tpNo, remainingQty: remQty, source: 'Sheet42' });
          }
        }
      }

      const totalRemainingQty = remainingItems.reduce((acc, item) => acc + item.remainingQty, 0);
      const uniqueTps = new Set(remainingItems.map(i => i.tpNo).filter(t => t && t !== '-'));
      const tnrCount = remainingItems.filter(i => i.source === 'TpNotReceive').length;

      setStats({
        totalSummaryRows,
        lowChhatniCount,
        approvedCount,
        totalRemainingQty,
        remainingItemsCount: remainingItems.length,
        uniqueTpCount: uniqueTps.size,
        sheet4245Count: remainingItems.length - tnrCount,
        tpNotReceiveCount: tnrCount
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, bgColor, subtitle }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
          <h3 className={`text-3xl font-bold ${color || 'text-gray-900'}`}>{value}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-2 font-medium">{subtitle}</p>
          )}
        </div>
        <div className={`p-4 rounded-xl ${bgColor} transition-transform transform hover:scale-110`}>
          <Icon className={`w-7 h-7 ${color}`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="h-[88vh] bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-xl">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-gray-600 font-medium animate-pulse">Running analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[88vh] bg-gray-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard Overview</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <Database className="w-4 h-4" /> Live data from TP Summary System
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-indigo-200 transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total TP Entries"
            value={stats.totalSummaryRows}
            icon={FileText}
            color="text-blue-600"
            bgColor="bg-blue-50"
            subtitle="Total records in Summary"
          />
          <StatCard
            title="Remaining Quantity"
            value={stats.totalRemainingQty.toFixed(2)}
            icon={Tag}
            color="text-orange-600"
            bgColor="bg-orange-50"
            subtitle={`${stats.remainingItemsCount} items to be tagged`}
          />
          <StatCard
            title="Low Chhatni (< 2.5%)"
            value={stats.lowChhatniCount}
            icon={AlertTriangle}
            color="text-purple-600"
            bgColor="bg-purple-50"
            subtitle="Requires attention"
          />
          <StatCard
            title="Approved Status"
            value={stats.approvedCount}
            icon={CheckCircle}
            color="text-green-600"
            bgColor="bg-green-50"
            subtitle="Achieved Approved entries"
          />
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" /> Remaining Inventory Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <Database className="w-5 h-5" />
                  </div>
                  <span className="text-gray-700 font-medium">Sheet 42 & 45 Items</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{stats.sheet4245Count}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-100 rounded-lg text-pink-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span className="text-gray-700 font-medium">TP Not Received</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{stats.tpNotReceiveCount}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <span className="text-gray-700 font-medium">Unique TP Numbers</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{stats.uniqueTpCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl shadow-lg p-6 text-white text-center flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <svg width="100%" height="100%">
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
            <Clock className="w-16 h-16 text-indigo-300 mb-4 opacity-80" />
            <h3 className="text-2xl font-bold mb-2">System Status</h3>
            <p className="text-indigo-200 mb-6 max-w-sm">
              The TP Summary dashboard is live and syncing with your Google Sheets backend.
            </p>
            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
              <span className="text-sm font-medium tracking-wide">
                Synced {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;