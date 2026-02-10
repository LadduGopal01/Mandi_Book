import React, { useState, useEffect } from "react";
import {
  FileText,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useToast } from '../../contexts/ToastContext';

const API_URL = import.meta.env.VITE_SHEET_API_URL;
const DISPATCH_SHEET = import.meta.env.VITE_SHEET_DISPATCH;

const Dashboard = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState({
    totalTpSummaries: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Function to fetch data from both sheets
  const fetchSheetData = async () => {
    try {
      setLoading(true);
      const dispatchResponse = await fetch(`${API_URL}?sheet=${DISPATCH_SHEET}&action=getData`);

      if (!dispatchResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dispatchData = await dispatchResponse.json();

      return {
        dispatch: (dispatchData.success && dispatchData.data) ? dispatchData.data : [],
      };

    } catch (error) {
      console.error('Error fetching sheet data:', error);
      showToast('Failed to load dashboard data. Please refresh the page.', 'error');
      return { dispatch: [] };
    }
  };

  // Calculate statistics from sheet data
  const calculateStats = (data) => {
    const { dispatch } = data;

    let totalTpSummaries = 0;

    // Process Dispatch Sheet (Start from row 7 / index 6)
    for (let i = 6; i < dispatch.length; i++) {
      const row = dispatch[i];

      // Total TP Summary: Count from 'Dispatch' sheet Column 'B7:B'
      if (row[1] && row[1].toString().trim() !== '') {
        totalTpSummaries++;
      }
    }

    return {
      totalTpSummaries,
    };
  };

  const loadDashboardData = async () => {
    try {
      const data = await fetchSheetData();
      if (data.dispatch.length > 0) {
        const calculatedStats = calculateStats(data);
        setStats(calculatedStats);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, bgColor, subtitle }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="h-[88vh] bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-red-800 animate-spin" />
          <p className="text-sm text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[88vh] bg-gray-50 overflow-y-auto">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Overview of TP Summary workflow
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total TP Summaries"
            value={stats.totalTpSummaries}
            icon={FileText}
            color="text-blue-600"
            bgColor="bg-blue-50"
            subtitle=""
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;