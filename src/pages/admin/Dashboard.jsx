import React, { useState, useEffect } from "react";
import {
  FileText,
  Truck,
  PackageCheck,
  ClipboardCheck,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useToast } from '../../contexts/ToastContext';

const API_URL = import.meta.env.VITE_SHEET_API_URL;
const DISPATCH_SHEET = import.meta.env.VITE_SHEET_DISPATCH;
const LOADING_COMPLETE_SHEET = import.meta.env.VITE_SHEET_LOADINGCOMPLETE;

const Dashboard = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState({
    totalIndents: 0,
    pendingProcessing: 0, // Loading Point Pending
    processedIndents: 0, // Loading Point Complete
    pendingLoading: 0, // Loading Complete Pending
    loadingCompleted: 0, // Loading Complete Complete
    pendingGatePass: 0, // Gate Pass Pending
    gatePassCompleted: 0 // Gate Pass Complete
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Function to fetch data from both sheets
  const fetchSheetData = async () => {
    try {
      setLoading(true);
      const [dispatchResponse, loadingCompleteResponse] = await Promise.all([
        fetch(`${API_URL}?sheet=${DISPATCH_SHEET}&action=getData`),
        fetch(`${API_URL}?sheet=${LOADING_COMPLETE_SHEET}&action=getData`)
      ]);

      if (!dispatchResponse.ok || !loadingCompleteResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [dispatchData, loadingCompleteData] = await Promise.all([
        dispatchResponse.json(),
        loadingCompleteResponse.json()
      ]);

      return {
        dispatch: (dispatchData.success && dispatchData.data) ? dispatchData.data : [],
        loadingComplete: (loadingCompleteData.success && loadingCompleteData.data) ? loadingCompleteData.data : []
      };

    } catch (error) {
      console.error('Error fetching sheet data:', error);
      showToast('Failed to load dashboard data. Please refresh the page.', 'error');
      return { dispatch: [], loadingComplete: [] };
    }
  };

  // Calculate statistics from sheet data
  const calculateStats = (data) => {
    const { dispatch, loadingComplete } = data;

    let totalIndents = 0;
    let loadingPointPending = 0;
    let loadingPointComplete = 0;
    let loadingCompletePending = 0;
    let loadingCompleteComplete = 0;
    let gatePassPending = 0;
    let gatePassComplete = 0;

    // Process Dispatch Sheet (Start from row 7 / index 6)
    // Columns: B=1, M=12, N=13, Q=16, R=17
    for (let i = 6; i < dispatch.length; i++) {
      const row = dispatch[i];

      // Total Indent: Count from 'Dispatch' sheet Column 'B7:B'
      // Check if Column B (Index 1) is not empty
      if (row[1] && row[1].toString().trim() !== '') {
        totalIndents++;

        // Loading Point Logic:
        // Pending: Col M (12) != Null AND Col N (13) == Null
        // Complete: Col M (12) != Null AND Col N (13) != Null
        const colM = row[12];
        const colN = row[13];
        const hasM = colM && colM.toString().trim() !== '';
        const hasN = colN && colN.toString().trim() !== '';

        if (hasM && !hasN) {
          loadingPointPending++;
        }
        if (hasM && hasN) {
          loadingPointComplete++;
        }

        // Loading Complete Logic:
        // Pending: Col Q (16) != Null AND Col R (17) == Null
        // Complete: Col Q (16) != Null AND Col R (17) != Null
        const colQ = row[16];
        const colR = row[17];
        const hasQ = colQ && colQ.toString().trim() !== '';
        const hasR = colR && colR.toString().trim() !== '';

        if (hasQ && !hasR) {
          loadingCompletePending++;
        }
        if (hasQ && hasR) {
          loadingCompleteComplete++;
        }
      }
    }

    // Process Loading Complete Sheet (Start from row 7 / index 6)
    // Columns: S=18, T=19
    for (let i = 6; i < loadingComplete.length; i++) {
      const row = loadingComplete[i];

      // Gate Pass Logic (from Loading Complete Sheet):
      // Pending: Col S (18) != Null AND Col T (19) == Null
      // Complete: Col S (18) != Null AND Col T (19) != Null

      // Need to check if row has data first? Usually safer to check key column but user logic depends on S & T
      // Let's assume valid rows have at least something, but condition relies on S
      const colS = row[18];
      const colT = row[19];
      const hasS = colS && colS.toString().trim() !== '';
      const hasT = colT && colT.toString().trim() !== '';

      if (hasS && !hasT) {
        gatePassPending++;
      }
      if (hasS && hasT) {
        gatePassComplete++;
      }
    }

    return {
      totalIndents,
      pendingProcessing: loadingPointPending,
      processedIndents: loadingPointComplete,
      pendingLoading: loadingCompletePending,
      loadingCompleted: loadingCompleteComplete,
      pendingGatePass: gatePassPending,
      gatePassCompleted: gatePassComplete
    };
  };

  const loadDashboardData = async () => {
    try {
      const data = await fetchSheetData();
      if (data.dispatch.length > 0 || data.loadingComplete.length > 0) {
        const calculatedStats = calculateStats(data);
        setStats(calculatedStats);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate completion rate
  const completionRate = stats.totalIndents > 0
    ? Math.round(stats.gatePassCompleted)
    : 0;

  const StatCard = ({ title, value, icon: Icon, color, bgColor, subtitle, trend }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-600 font-medium">{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  const WorkflowStageCard = ({ title, pending, completed, icon: Icon, color, bgColor }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            Pending
          </span>
          <span className="text-lg font-bold text-orange-600">{pending}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Completed
          </span>
          <span className="text-lg font-bold text-green-600">{completed}</span>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{completed + pending > 0 ? Math.round((completed / (completed + pending)) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${bgColor} ${color.replace('text', 'bg')}`}
              style={{ width: `${completed + pending > 0 ? (completed / (completed + pending)) * 100 : 0}%` }}
            />
          </div>
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
              Overview of indent management workflow
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Indents"
            value={stats.totalIndents}
            icon={FileText}
            color="text-blue-600"
            bgColor="bg-blue-50"
            subtitle=""
          />
          <StatCard
            title="Pending Loading Point"
            value={stats.pendingProcessing}
            icon={Clock}
            color="text-orange-600"
            bgColor="bg-orange-50"
            subtitle=""
          />
          <StatCard
            title="Loading Complete"
            value={stats.loadingCompleted}
            icon={PackageCheck}
            color="text-green-600"
            bgColor="bg-green-50"
            subtitle=""
          />
          <StatCard
            title="Gate Pass Completed"
            value={`${completionRate}`}
            icon={TrendingUp}
            color="text-purple-600"
            bgColor="bg-purple-50"
            subtitle=""
          />
        </div>

        {/* Workflow Stages */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-800" />
            Workflow Pipeline
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <WorkflowStageCard
              title="Loading Point"
              pending={stats.pendingProcessing}
              completed={stats.processedIndents}
              icon={Truck}
              color="text-purple-600"
              bgColor="bg-purple-50"
            />
            <WorkflowStageCard
              title="Loading Complete"
              pending={stats.pendingLoading}
              completed={stats.loadingCompleted}
              icon={PackageCheck}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <WorkflowStageCard
              title="Gate Pass"
              pending={stats.pendingGatePass}
              completed={stats.gatePassCompleted}
              icon={ClipboardCheck}
              color="text-green-600"
              bgColor="bg-green-50"
            />
          </div>
        </div>

        {/* Alert Section */}
        {(stats.pendingProcessing > 5 || stats.pendingLoading > 5 || stats.pendingGatePass > 5) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-orange-900 mb-1">Action Required</h4>
                <p className="text-sm text-orange-800">
                  You have pending items that need attention:
                  {stats.pendingProcessing > 5 && ` ${stats.pendingProcessing} indents at loading point,`}
                  {stats.pendingLoading > 5 && ` ${stats.pendingLoading} items pending loading completion,`}
                  {stats.pendingGatePass > 5 && ` ${stats.pendingGatePass} items awaiting gate pass.`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;