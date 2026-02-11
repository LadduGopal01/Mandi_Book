import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Filter, X, Search, Clock, CheckCircle, ChevronDown, Loader2, Edit2, RefreshCw, Send, Tag, Plus, Trash2, Calendar } from "lucide-react";
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const API_URL = import.meta.env.VITE_SHEET_API_URL;
// TP Summary Sheet Names
const SUMMARY_SHEET = import.meta.env.VITE_SHEET_SUMMARY || "SUMMARY";
const SHEET_42 = import.meta.env.VITE_SHEET_42 || "Sheet42";
const SHEET_45 = import.meta.env.VITE_SHEET_45 || "Sheet45";
const TP_NOT_RECEIVE_SHEET = import.meta.env.VITE_SHEET_TP_NOT_RECEIVE || "Tp not receive";
const ENTRY_SHEET = import.meta.env.VITE_SHEET_ENTRY || "Entry";
const ACHIEVED_ERROR_SHEET = import.meta.env.VITE_SHEET_ACHIEVED_ERROR || "Acheived Error";

const SUMMARY_FILTER_DEFS = [
  { key: 'slipNo', label: 'SLIP NO.' },
  { key: 'pacsName', label: 'PACS NAME' },
  { key: 'vehicleNo', label: 'VEHICLE NO.' },
  { key: 'tpNo', label: 'TP NO.' },
  { key: 'rstNo', label: 'RST NO.' },
  { key: 'millName', label: 'MILL NAME' },
];

const formatChhatni = (v) => {
  if (v === '' || v === null || v === undefined) return '';
  if (typeof v === 'number') return (v * 100).toFixed(2) + '%';
  return String(v);
};

const formatQty = (quantity) => {
  const num = parseFloat(quantity);
  if (isNaN(num)) return "0";
  if (num % 1 === 0) return Math.round(num).toString();
  return num.toFixed(2);
};

const toInputDate = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr instanceof Date) {
    return dateStr.toISOString().split('T')[0];
  }
  const p = String(dateStr).split('/');
  return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : '';
};

const fetchSheetData = async (sheetName) => {
  const res = await fetch(`${API_URL}?sheet=${encodeURIComponent(sheetName)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || `Failed to fetch ${sheetName}`);
  return data.data || [];
};

// Helper function to format date to DD/MM/YYYY hh:mm:ss
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch {
    return dateString; // Return original if parsing fails
  }
};

const TpSummaryPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading] = useState(false);

  // ==================== TP SUMMARY STATE ====================
  const [summaryData, setSummaryData] = useState([]);
  const [remainingData, setRemainingData] = useState([]);
  const [allAvailableSlips, setAllAvailableSlips] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [remainingLoading, setRemainingLoading] = useState(false);
  const [tpStartDate, setTpStartDate] = useState('');
  const [tpEndDate, setTpEndDate] = useState('');
  const [summaryMessage, setSummaryMessage] = useState(null);
  const [remainingMessage, setRemainingMessage] = useState(null);
  // Summary multi-select filters
  const [summaryFilterSelections, setSummaryFilterSelections] = useState(() => {
    const init = {};
    SUMMARY_FILTER_DEFS.forEach(f => { init[f.key] = []; });
    return init;
  });
  const [openSummaryFilter, setOpenSummaryFilter] = useState(null);
  const [summaryFilterSearchTerms, setSummaryFilterSearchTerms] = useState({});
  // Tag Modal
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagCurrentItem, setTagCurrentItem] = useState(null);
  const [tagMappings, setTagMappings] = useState([]);
  const [tagMappingCounter, setTagMappingCounter] = useState(0);
  const [tagSourceSlipIndex, setTagSourceSlipIndex] = useState('');
  const [tagQuantity, setTagQuantity] = useState('');
  const [isSummaryTagMode, setIsSummaryTagMode] = useState(false);
  const [tagTargetInfo, setTagTargetInfo] = useState({ tpNo: '', pacsName: '' });
  const [tagSaving, setTagSaving] = useState(false);
  const [tagPacsOptions, setTagPacsOptions] = useState({});

  // ==================== TP SUMMARY FUNCTIONS ====================

  const loadSummaryData = async (showMsg = false) => {
    try {
      setSummaryLoading(true);
      if (showMsg) setSummaryMessage({ text: 'Loading…', type: 'info' });
      const [summaryRaw, sheet42Raw] = await Promise.all([
        fetchSheetData(SUMMARY_SHEET),
        fetchSheetData(SHEET_42),
      ]);
      // Build taggedIn and agentName maps from Sheet42
      const taggedInMap = {};
      const agentNameMap = {};
      for (let i = 1; i < sheet42Raw.length; i++) {
        const r = sheet42Raw[i];
        const tp = (r[1] || '').toString().trim();
        const pacs = (r[3] || '').toString().trim();
        if (tp && pacs) {
          const k = tp + '|' + pacs;
          taggedInMap[k] = r[29] ? r[29].toString() : '';
          agentNameMap[k] = r[30] ? r[30].toString() : '';
        }
      }
      // Parse dates from row 1
      if (summaryRaw.length > 0) {
        const row1 = summaryRaw[0];
        if (row1[2]) setTpStartDate(toInputDate(row1[2]));
        if (row1[5]) setTpEndDate(toInputDate(row1[5]));
      }
      // Process data from row 3 (index 2)
      const processed = [];
      for (let i = 2; i < summaryRaw.length; i++) {
        const row = summaryRaw[i];
        const errVal = (row[13] || '').toString().trim();
        if (errVal === 'Tp Not received') continue;
        const slipNo = (row[1] || '').toString();
        const tpNo = (row[6] || '').toString();
        const pacsName = (row[2] || '').toString();
        const key = tpNo.trim() + '|' + pacsName.trim();
        processed.push({
          _idx: i,
          select: row[0] === true,
          slipNo, pacsName, vehicleNo: (row[3] || '').toString(),
          tpDate: (row[4] || '').toString(), millDate: (row[5] || '').toString(),
          tpNo, tpQty: (row[7] || '').toString(), millNetWt: (row[8] || '').toString(),
          chhatniPercent: row[9], rstNo: (row[10] || '').toString(),
          millName: (row[11] || '').toString(), diffInWt: (row[12] || '').toString(),
          errorInDiff: errVal, entryQty: (row[14] || '').toString(),
          approved: (row[15] || '').toString(), sendEntryQty: (row[16] || '').toString(),
          achieveApproved: (row[17] || '').toString(),
          multipleReceived: (row[18] || '').toString(),
          millNetWtSlipwise: (row[19] || '').toString(),
          taggedInHistory: taggedInMap[key] || '',
          agentName: agentNameMap[key] || '',
          remaining: (row[21] || '').toString(),
          rowIndex: i + 1,
          isChhatniLow: typeof row[9] === 'number' && row[9] < 0.025,
          hasError: errVal === '❌ ERROR',
          hasMultipleReceived: (row[18] || '').toString() === '❌',
        });
      }
      setSummaryData(processed);
      setSummaryMessage(null);
    } catch (err) {
      console.error('Error loading summary:', err);
      setSummaryMessage({ text: 'Error: ' + err.message, type: 'error' });
    } finally { setSummaryLoading(false); }
  };

  const loadRemainingData = async () => {
    try {
      setRemainingLoading(true);
      setRemainingMessage({ text: 'Loading…', type: 'info' });
      const [s42, s45, tnr] = await Promise.all([
        fetchSheetData(SHEET_42).catch(() => []),
        fetchSheetData(SHEET_45).catch(() => []),
        fetchSheetData(TP_NOT_RECEIVE_SHEET).catch(() => []),
      ]);
      const results = [];
      const addedKeys = {};
      // Sheet45
      for (let i = 1; i < s45.length; i++) {
        const r = s45[i];
        const slipNo = (r[1] || '').toString().trim();
        const tpNo = (r[10] || '').toString().trim();
        const pacsName = (r[4] || '').toString().trim();
        const remQty = parseFloat(r[27]) || 0;
        if (remQty > 0 && slipNo && tpNo && pacsName) {
          const k = slipNo + '|' + tpNo + '|' + pacsName;
          if (!addedKeys[k]) {
            addedKeys[k] = true;
            results.push({
              slipNo, tpNo, pacsName, vehicleNo: (r[5] || '').toString().trim(),
              remainingQty: remQty, taggedRemainingHistory: (r[29] || '').toString(),
              sourceSheet: 'Sheet45', source: 'Sheet45', isSingleSlip: false
            });
          }
        }
      }
      // Tp not receive
      for (let i = 1; i < tnr.length; i++) {
        const r = tnr[i];
        const status = (r[23] || '').toString().trim();
        if (status === 'APPROVED') continue;
        const slipNo = (r[14] || '').toString().trim();
        const tpNo = (r[4] || '').toString().trim();
        const pacsName = (r[15] || '').toString().trim();
        const remQty = parseFloat(r[25]) || 0;
        if (remQty > 0 && slipNo) {
          const k = 'TpNotReceive|' + slipNo;
          if (!addedKeys[k]) {
            addedKeys[k] = true;
            results.push({
              slipNo, tpNo: tpNo || '-', pacsName: pacsName || '-',
              vehicleNo: (r[17] || '').toString().trim() || '-', remainingQty: remQty,
              taggedRemainingHistory: (r[28] || '').toString(),
              sourceSheet: 'TpNotReceive', source: 'TpNotReceive', isSingleSlip: true,
              tpNotReceiveRowIndex: i + 1
            });
          }
        }
      }
      // Sheet42
      for (let i = 1; i < s42.length; i++) {
        const r = s42[i];
        const slipNo = (r[0] || '').toString().trim();
        const tpNo = (r[1] || '').toString().trim();
        const pacsName = (r[3] || '').toString().trim();
        const remQty = parseFloat(r[15]) || 0;
        if (remQty > 0 && slipNo && tpNo && pacsName) {
          const k = slipNo + '|' + tpNo + '|' + pacsName;
          if (!addedKeys[k]) {
            addedKeys[k] = true;
            results.push({
              slipNo, tpNo, pacsName, vehicleNo: (r[8] || '').toString().trim(),
              remainingQty: remQty, taggedRemainingHistory: (r[28] || '').toString(),
              sourceSheet: 'Sheet42', source: 'Sheet42-Direct', isSingleSlip: true
            });
          }
        }
      }
      setRemainingData(results);
      setRemainingMessage(null);
    } catch (err) {
      console.error('Error loading remaining:', err);
      setRemainingMessage({ text: 'Error: ' + err.message, type: 'error' });
    } finally { setRemainingLoading(false); }
  };

  const loadAvailableSlips = async () => {
    try {
      const [s42, s45, tnr] = await Promise.all([
        fetchSheetData(SHEET_42).catch(() => []),
        fetchSheetData(SHEET_45).catch(() => []),
        fetchSheetData(TP_NOT_RECEIVE_SHEET).catch(() => []),
      ]);
      const slipMap = {};
      // Sheet42
      for (let i = 1; i < s42.length; i++) {
        const r = s42[i];
        const sl = (r[0] || '').toString().trim();
        const rem = parseFloat(r[15]) || 0;
        if (rem > 0 && sl && !slipMap[sl]) {
          slipMap[sl] = {
            slipNo: sl, tpNo: (r[1] || '').toString().trim(), pacsName: (r[3] || '').toString().trim(),
            vehicleNo: (r[8] || '').toString().trim(), remainingQty: rem, sourceSheet: 'Sheet42', isSingleSlip: true
          };
        }
      }
      // Sheet45
      for (let i = 1; i < s45.length; i++) {
        const r = s45[i];
        const sl = (r[1] || '').toString().trim();
        const rem = parseFloat(r[27]) || 0;
        if (rem > 0 && sl && !slipMap[sl]) {
          slipMap[sl] = {
            slipNo: sl, tpNo: (r[10] || '').toString().trim(), pacsName: (r[4] || '').toString().trim(),
            vehicleNo: (r[5] || '').toString().trim(), remainingQty: rem, sourceSheet: 'Sheet45', isSingleSlip: false
          };
        }
      }
      // Tp not receive
      for (let i = 1; i < tnr.length; i++) {
        const r = tnr[i];
        const status = (r[23] || '').toString().trim();
        if (status === 'APPROVED') continue;
        const sl = (r[14] || '').toString().trim();
        const rem = parseFloat(r[25]) || 0;
        if (rem > 0 && sl && !slipMap[sl]) {
          slipMap[sl] = {
            slipNo: sl, tpNo: (r[4] || '').toString().trim(), pacsName: (r[15] || '').toString().trim(),
            vehicleNo: (r[17] || '').toString().trim(), remainingQty: rem, sourceSheet: 'TpNotReceive',
            isSingleSlip: true, tpNotReceiveRowIndex: i + 1
          };
        }
      }
      const arr = Object.values(slipMap).sort((a, b) => a.slipNo.localeCompare(b.slipNo));
      setAllAvailableSlips(arr);
    } catch (err) { console.error('Error loading slips:', err); }
  };

  // Summary filter logic
  const filteredSummaryData = useMemo(() => {
    return summaryData.filter(row => {
      for (const def of SUMMARY_FILTER_DEFS) {
        const sel = summaryFilterSelections[def.key];
        if (sel && sel.length > 0) {
          if (!sel.includes((row[def.key] || '').toString().trim())) return false;
        }
      }
      return true;
    });
  }, [summaryData, summaryFilterSelections]);

  const getFilterOptions = useCallback((targetKey) => {
    const set = new Set();
    summaryData.forEach(row => {
      let pass = true;
      for (const d of SUMMARY_FILTER_DEFS) {
        if (d.key === targetKey) continue;
        const sel = summaryFilterSelections[d.key];
        if (sel && sel.length > 0 && !sel.includes((row[d.key] || '').toString().trim())) { pass = false; break; }
      }
      if (pass) { const v = (row[targetKey] || '').toString().trim(); if (v) set.add(v); }
    });
    return [...set].sort();
  }, [summaryData, summaryFilterSelections]);

  const toggleSummaryFilterOption = (key, value) => {
    setSummaryFilterSelections(prev => {
      const arr = prev[key] || [];
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  };

  const clearSummaryFilter = (key) => {
    setSummaryFilterSelections(prev => ({ ...prev, [key]: [] }));
  };

  const clearAllSummaryFilters = () => {
    const init = {};
    SUMMARY_FILTER_DEFS.forEach(f => { init[f.key] = []; });
    setSummaryFilterSelections(init);
  };

  const totalSummaryFilters = useMemo(() => {
    return Object.values(summaryFilterSelections).reduce((s, a) => s + a.length, 0);
  }, [summaryFilterSelections]);

  // Remaining stats
  const remainingStats = useMemo(() => {
    const total = remainingData.reduce((s, i) => s + i.remainingQty, 0);
    const tpSet = new Set(remainingData.map(i => i.tpNo));
    const tnrCount = remainingData.filter(i => i.source === 'TpNotReceive').length;
    return {
      totalItems: remainingData.length, totalRemaining: total.toFixed(2),
      uniqueTp: tpSet.size, tpNotReceiveCount: tnrCount, sheet4245Count: remainingData.length - tnrCount
    };
  }, [remainingData]);

  // Cell update helpers
  const updateCell = async (sheet, rowIdx, colIdx, value) => {
    await fetch(API_URL, {
      method: 'POST', body: new URLSearchParams({
        action: 'updateCell', sheetName: sheet, rowIndex: rowIdx, columnIndex: colIdx, value: value
      })
    });
  };

  const handleSummaryCheckbox = async (idx, checked) => {
    setSummaryData(prev => prev.map(r => r._idx === idx ? { ...r, select: checked } : r));
    try { await updateCell(SUMMARY_SHEET, idx + 1, 1, checked); } catch (e) { console.error(e); }
  };

  const handleSendEntryQtyChange = async (idx, rowIndex, value) => {
    setSummaryData(prev => prev.map(r => r._idx === idx ? { ...r, sendEntryQty: value } : r));
    try { await updateCell(SUMMARY_SHEET, rowIndex, 17, value); } catch (e) { console.error(e); }
  };

  const handleAchieveApprovedChange = async (idx, rowIndex, value) => {
    setSummaryData(prev => prev.map(r => r._idx === idx ? { ...r, achieveApproved: value } : r));
    try { await updateCell(SUMMARY_SHEET, rowIndex, 18, value); } catch (e) { console.error(e); }
  };

  const handleApplyDateFilters = async () => {
    if (!tpStartDate || !tpEndDate) { setSummaryMessage({ text: 'Select both dates', type: 'error' }); return; }
    try {
      setSummaryMessage({ text: 'Updating filters…', type: 'info' });
      await updateCell(SUMMARY_SHEET, 1, 3, tpStartDate);
      await updateCell(SUMMARY_SHEET, 1, 6, tpEndDate);
      setSummaryMessage({ text: 'Filters updated', type: 'success' });
      setTimeout(() => loadSummaryData(true), 1000);
    } catch (e) { setSummaryMessage({ text: 'Error: ' + e.message, type: 'error' }); }
  };

  // Submit Entry Qty
  const handleSubmitEntryQty = async () => {
    const checked = summaryData.filter(r => r.select === true && r.sendEntryQty && parseFloat(r.sendEntryQty) > 0);
    if (!checked.length) { showToast('Select rows with entry quantity', 'error'); return; }
    // Collect agent names
    const agentNames = {};
    for (let c = 0; c < checked.length; c++) {
      const r = checked[c];
      const name = prompt(`Entry ${c + 1}/${checked.length}\nTP: ${r.tpNo} | PACS: ${r.pacsName}\nQty: ${r.sendEntryQty}\n\nEnter AGENT NAME:`);
      if (!name || !name.trim()) { showToast('Agent name required. Cancelled.', 'error'); return; }
      agentNames[r.tpNo + '|' + r.pacsName] = name.trim();
    }
    if (!confirm(`Submit ${checked.length} entry(ies) with agent names?`)) return;
    try {
      setSummaryLoading(true);
      // Insert into Entry sheet
      for (const r of checked) {
        await fetch(API_URL, {
          method: 'POST', body: new URLSearchParams({
            action: 'insert', sheetName: ENTRY_SHEET,
            rowData: JSON.stringify([r.pacsName, r.tpDate, r.tpNo, r.tpQty, r.millName, '', r.sendEntryQty])
          })
        });
        // Reset checkbox and sendEntryQty
        await updateCell(SUMMARY_SHEET, r.rowIndex, 1, false);
        await updateCell(SUMMARY_SHEET, r.rowIndex, 17, '');
      }
      // Save agent names to Sheet42
      const s42 = await fetchSheetData(SHEET_42);
      for (const [key, agName] of Object.entries(agentNames)) {
        const [tp, pacs] = key.split('|');
        for (let i = 1; i < s42.length; i++) {
          if ((s42[i][1] || '').toString().trim() === tp && (s42[i][3] || '').toString().trim() === pacs) {
            await updateCell(SHEET_42, i + 1, 31, agName);
            break;
          }
        }
      }
      showToast(`Submitted ${checked.length} entries successfully!`, 'success');
      loadSummaryData(true);
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
    finally { setSummaryLoading(false); }
  };

  // Submit Approved
  const handleSubmitApproved = async () => {
    const approved = summaryData.filter(r => r.select && r.achieveApproved === 'APPROVED');
    if (!approved.length) { showToast('Select rows marked APPROVED', 'error'); return; }
    if (!confirm(`Submit ${approved.length} approved entries?`)) return;
    try {
      setSummaryLoading(true);
      for (const r of approved) {
        await fetch(API_URL, {
          method: 'POST', body: new URLSearchParams({
            action: 'insert', sheetName: ACHIEVED_ERROR_SHEET,
            rowData: JSON.stringify([r.slipNo, r.pacsName, r.vehicleNo, r.tpNo, r.millNetWt])
          })
        });
        await updateCell(SUMMARY_SHEET, r.rowIndex, 1, false);
        await updateCell(SUMMARY_SHEET, r.rowIndex, 18, '');
      }
      showToast(`Submitted ${approved.length} approved entries`, 'success');
      loadSummaryData(true);
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
    finally { setSummaryLoading(false); }
  };

  // Tag Modal functions
  const openSummaryTagModal = async (row) => {
    if (!allAvailableSlips.length) await loadAvailableSlips();
    if (!allAvailableSlips.length) { showToast('No slips with remaining qty', 'error'); return; }
    setIsSummaryTagMode(true);
    setTagTargetInfo({ tpNo: row.tpNo, pacsName: row.pacsName });
    setTagCurrentItem(null);
    setTagSourceSlipIndex('');
    setTagQuantity('');
    setTagMappings([]);
    setTagMappingCounter(0);
    setShowTagModal(true);
  };

  const openRemainingTagModal = (item) => {
    setIsSummaryTagMode(false);
    setTagCurrentItem(item);
    setTagMappings([{ id: 0, targetTp: '', targetPacs: '', quantity: '' }]);
    setTagMappingCounter(1);
    setShowTagModal(true);
  };

  const closeTagModal = () => {
    setShowTagModal(false);
    setTagCurrentItem(null);
    setTagMappings([]);
    setTagMappingCounter(0);
    setIsSummaryTagMode(false);
  };

  const addTagMapping = () => {
    setTagMappings(prev => [...prev, { id: tagMappingCounter, targetTp: '', targetPacs: '', quantity: '' }]);
    setTagMappingCounter(prev => prev + 1);
  };

  const removeTagMapping = (id) => {
    setTagMappings(prev => prev.filter(m => m.id !== id));
  };

  const updateTagMapping = (id, field, value) => {
    setTagMappings(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const fetchPacsForTp = async (tpNo) => {
    try {
      const [summRaw, tnrRaw] = await Promise.all([
        fetchSheetData(SUMMARY_SHEET).catch(() => []),
        fetchSheetData(TP_NOT_RECEIVE_SHEET).catch(() => []),
      ]);
      const pacsSet = new Set();
      for (let i = 2; i < summRaw.length; i++) {
        if ((summRaw[i][6] || '').toString().trim() === tpNo && (summRaw[i][2] || '').toString().trim())
          pacsSet.add((summRaw[i][2]).toString().trim());
      }
      for (let i = 1; i < tnrRaw.length; i++) {
        if ((tnrRaw[i][4] || '').toString().trim() === tpNo && (tnrRaw[i][15] || '').toString().trim())
          pacsSet.add((tnrRaw[i][15]).toString().trim());
      }
      return [...pacsSet];
    } catch { return []; }
  };

  const handleLoadPacs = async (mappingId, tpNo) => {
    if (!tpNo) return;
    const pacs = await fetchPacsForTp(tpNo.trim());
    setTagPacsOptions(prev => ({ ...prev, [mappingId]: pacs }));
    if (!pacs.length) showToast('No PACS found for TP: ' + tpNo, 'error');
  };

  const onSourceSlipChanged = (idx) => {
    setTagSourceSlipIndex(idx);
    if (idx === '') { setTagCurrentItem(null); return; }
    const slip = allAvailableSlips[parseInt(idx)];
    setTagCurrentItem({
      slipNo: slip.slipNo, tpNo: slip.tpNo, pacsName: slip.pacsName,
      remainingQty: slip.remainingQty, sourceSheet: slip.sourceSheet,
      isSingleSlip: slip.sourceSheet !== 'Sheet45',
      tpNotReceiveRowIndex: slip.tpNotReceiveRowIndex,
    });
    setTagQuantity('');
  };

  const tagTotalMapped = useMemo(() => {
    if (isSummaryTagMode) return parseFloat(tagQuantity) || 0;
    return tagMappings.reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0);
  }, [isSummaryTagMode, tagQuantity, tagMappings]);

  const tagRemainingBalance = useMemo(() => {
    if (!tagCurrentItem) return 0;
    return tagCurrentItem.remainingQty - tagTotalMapped;
  }, [tagCurrentItem, tagTotalMapped]);

  // Save tag mappings
  const handleSaveTagMappings = async () => {
    if (!tagCurrentItem) return;
    try {
      setTagSaving(true);
      if (isSummaryTagMode) {
        // Summary tag: source slip → target row
        const qty = parseFloat(tagQuantity);
        if (isNaN(qty) || qty <= 0) { alert('Enter a valid quantity'); setTagSaving(false); return; }
        if (qty > tagCurrentItem.remainingQty) { alert('Qty exceeds remaining'); setTagSaving(false); return; }
        const mappedArr = [{ targetTpNo: tagTargetInfo.tpNo, targetPacsName: tagTargetInfo.pacsName, quantity: qty }];
        if (!confirm(`Tag ${qty.toFixed(2)} from slip ${tagCurrentItem.slipNo} → TP ${tagTargetInfo.tpNo} (${tagTargetInfo.pacsName})?`)) { setTagSaving(false); return; }
        await performTagging(tagCurrentItem.slipNo, tagCurrentItem.sourceSheet, mappedArr);
        showToast('Tagged successfully!', 'success');
      } else {
        // Remaining tag: multiple destinations
        const tagArr = [];
        let hasErr = false;
        for (const m of tagMappings) {
          if (!m.targetTp || !m.targetPacs || !m.quantity || parseFloat(m.quantity) <= 0) { hasErr = true; break; }
          tagArr.push({ targetTpNo: m.targetTp.trim(), targetPacsName: m.targetPacs.trim(), quantity: parseFloat(m.quantity) });
        }
        if (hasErr) { alert('Fill all fields correctly'); setTagSaving(false); return; }
        if (!tagArr.length) { alert('Add at least one mapping'); setTagSaving(false); return; }
        const total = tagArr.reduce((s, t) => s + t.quantity, 0);
        if (tagCurrentItem.remainingQty > 0 && total > tagCurrentItem.remainingQty) {
          alert(`Total (${total.toFixed(2)}) exceeds remaining (${tagCurrentItem.remainingQty.toFixed(2)})`); setTagSaving(false); return;
        }
        if (!confirm(`Submit ${tagArr.length} mapping(s), total: ${total.toFixed(2)}?`)) { setTagSaving(false); return; }
        await performTagging(tagCurrentItem.slipNo, tagCurrentItem.sourceSheet, tagArr);
        showToast('Tagged successfully!', 'success');
      }
      closeTagModal();
      if (activeTab === 'summary') loadSummaryData(true);
      else loadRemainingData();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    } finally { setTagSaving(false); }
  };

  const performTagging = async (sourceSlipNo, sourceSheet, taggedMappings) => {
    const totalTagged = taggedMappings.reduce((s, m) => s + m.quantity, 0);
    // Fetch current sheet data
    const [s42, s45, tnr] = await Promise.all([
      fetchSheetData(SHEET_42).catch(() => []),
      fetchSheetData(SHEET_45).catch(() => []),
      fetchSheetData(TP_NOT_RECEIVE_SHEET).catch(() => []),
    ]);

    // 1. UPDATE DESTINATIONS
    for (const m of taggedMappings) {
      const targetTpNo = m.targetTpNo.toString().trim();
      const targetPacsName = m.targetPacsName.toString().trim();
      const quantity = m.quantity;
      let matched = false;

      // Check Sheet42 (Col X=24 for Tagged In, Col AD=30 for Historry)
      for (let i = 1; i < s42.length; i++) {
        if ((s42[i][1] || '').toString().trim() === targetTpNo && (s42[i][3] || '').toString().trim() === targetPacsName) {
          const cur = parseFloat(s42[i][23]) || 0;
          await updateCell(SHEET_42, i + 1, 24, cur + quantity);

          // Update Tagged IN History (AD=30)
          const hist = (s42[i][29] || '').toString().trim();
          const entry = `From Slip ${sourceSlipNo}: ${formatQty(quantity)}`;
          await updateCell(SHEET_42, i + 1, 30, hist ? hist + ' | ' + entry : entry);
          matched = true;
          break;
        }
      }

      // If not in 42, check TpNotReceive (Col AA=27 for Tagged In)
      if (!matched) {
        for (let i = 1; i < tnr.length; i++) {
          const rowTp = (tnr[i][4] || '').toString().trim();
          const rowPacs = (tnr[i][15] || '').toString().trim();
          if (rowTp === targetTpNo && rowPacs === targetPacsName) {
            const cur = parseFloat(tnr[i][26]) || 0;
            await updateCell(TP_NOT_RECEIVE_SHEET, i + 1, 27, cur + quantity);
            matched = true;
            break;
          }
        }
      }

      // Check Sheet45 as destination (Col AE=31 for History) - logic from script
      for (let i = 1; i < s45.length; i++) {
        const rowTp = (s45[i][10] || '').toString().trim();
        const rowPacs = (s45[i][4] || '').toString().trim();
        if (rowTp === targetTpNo && rowPacs === targetPacsName) {
          const hist = (s45[i][30] || '').toString().trim(); // AE is index 30
          const entry = `From Slip ${sourceSlipNo}: ${formatQty(quantity)}`;
          await updateCell(SHEET_45, i + 1, 31, hist ? hist + ' | ' + entry : entry);
          break;
        }
      }
    }

    // 2. UPDATE SOURCE
    const historyEntries = taggedMappings.map(m =>
      `Slip → TP: ${m.targetTpNo} (${m.targetPacsName}) → Qty: ${formatQty(m.quantity)}`
    );
    const newHistoryString = historyEntries.join(' | ');

    if (sourceSheet === 'TpNotReceive') {
      let tnrRowIndex = -1;
      // Update Tnr Source Row (Col AB=28 TaggedOut, AC=29 History)
      for (let i = 1; i < tnr.length; i++) {
        if ((tnr[i][14] || '').toString().trim() === sourceSlipNo) {
          tnrRowIndex = i;
          const cur = parseFloat(tnr[i][27]) || 0; // Col AB is index 27
          await updateCell(TP_NOT_RECEIVE_SHEET, i + 1, 28, cur + totalTagged);

          const ex = (tnr[i][28] || '').toString().trim(); // Col AC is index 28 (WAIT: AB=28th col=idx27. AC=29th col=idx28)
          await updateCell(TP_NOT_RECEIVE_SHEET, i + 1, 29, ex ? ex + ' | ' + newHistoryString : newHistoryString);
          break;
        }
      }
      // Also update Sheet42 col X (Tagged Remaining/In sync?) - from script logic
      if (tnrRowIndex !== -1) {
        for (let i = 1; i < s42.length; i++) {
          if ((s42[i][0] || '').toString().trim() === sourceSlipNo) {
            const curX = parseFloat(s42[i][23]) || 0; // Col X is index 23
            await updateCell(SHEET_42, i + 1, 24, curX + totalTagged);
            break;
          }
        }
      }
    } else if (sourceSheet === 'Sheet42') {
      // Update S42 Col Y=25 (Tagged Out), AC=29 (History)
      for (let i = 1; i < s42.length; i++) {
        if ((s42[i][0] || '').toString().trim() === sourceSlipNo) {
          const curY = parseFloat(s42[i][24]) || 0; // Col Y is index 24
          await updateCell(SHEET_42, i + 1, 25, curY + totalTagged);

          const ex = (s42[i][28] || '').toString().trim(); // Col AC is index 28
          await updateCell(SHEET_42, i + 1, 29, ex ? ex + ' | ' + newHistoryString : newHistoryString);
          break;
        }
      }
    } else if (sourceSheet === 'Sheet45') {
      // Update S45 Col AC=29 (Tagged Out), AD=30 (History)
      let sourceTpNo = '', sourcePacsName = '';
      for (let i = 1; i < s45.length; i++) {
        const rowSlip = (s45[i][1] || '').toString().trim();
        if (rowSlip === sourceSlipNo) {
          sourceTpNo = (s45[i][10] || '').toString().trim();
          sourcePacsName = (s45[i][4] || '').toString().trim();

          const curAC = parseFloat(s45[i][28]) || 0; // Col AC is index 28
          const newAC = curAC + totalTagged;
          await updateCell(SHEET_45, i + 1, 29, newAC);

          const ex = (s45[i][29] || '').toString().trim(); // Col AD is index 29
          await updateCell(SHEET_45, i + 1, 30, ex ? ex + ' | ' + newHistoryString : newHistoryString);

          // Update local data clone for summation logic below
          s45[i][28] = newAC;
          break;
        }
      }

      // SYNC SUM to Sheet42 (Col Y)
      if (sourceTpNo && sourcePacsName) {
        let sumFromSheet45 = 0;
        // Re-iterate S45 (using updated local values)
        for (let i = 1; i < s45.length; i++) {
          const rTp = (s45[i][10] || '').toString().trim();
          const rPacs = (s45[i][4] || '').toString().trim();
          if (rTp === sourceTpNo && rPacs === sourcePacsName) {
            sumFromSheet45 += (parseFloat(s45[i][28]) || 0);
          }
        }
        // Update Sheet42 Col Y for this TP/PACS (Not Slip!) - Wait, script finds row by TP/PACS in S42
        for (let i = 1; i < s42.length; i++) {
          const rTp = (s42[i][1] || '').toString().trim();
          const rPacs = (s42[i][3] || '').toString().trim();
          if (rTp === sourceTpNo && rPacs === sourcePacsName) {
            await updateCell(SHEET_42, i + 1, 25, sumFromSheet45);
            break;
          }
        }
      }
    }
  };

  // Load summary data when tab switches
  useEffect(() => {
    if (activeTab === 'summary' && summaryData.length === 0) { loadSummaryData(); loadAvailableSlips(); }
    if (activeTab === 'remaining' && remainingData.length === 0) { loadRemainingData(); }
  }, [activeTab]);

  // ==================== END TP SUMMARY FUNCTIONS ====================

  return (
    <div className="h-[88vh] bg-gray-50 flex flex-col overflow-hidden">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-red-800 animate-spin" />
            <p className="text-gray-700">Loading...</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Quick Actions */}
        <div className="flex-shrink-0 p-4 lg:p-6 bg-gray-50">
          <div className="max-w-full mx-auto">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">TP Summary</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 px-4 lg:px-6">
          <div className="max-w-full mx-auto">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab("summary")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === "summary"
                    ? "border-red-800 text-red-800"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  disabled={loading || summaryLoading}
                >
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    TP Summary
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("remaining")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === "remaining"
                    ? "border-red-800 text-red-800"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  disabled={loading || remainingLoading}
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tag Remaining
                  </div>
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1 overflow-hidden px-4 lg:px-6 pb-4 lg:pb-6">
          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            {/* TP Summary Tab */}
            {activeTab === "summary" && (
              <div className="flex flex-col h-full overflow-hidden bg-white">
                {/* Summary Controls */}
                <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-300 shadow-sm">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <input type="date" value={tpStartDate} onChange={e => setTpStartDate(e.target.value)} className="text-xs border-none outline-none text-gray-700 bg-transparent" />
                      <span className="text-gray-400">-</span>
                      <input type="date" value={tpEndDate} onChange={e => setTpEndDate(e.target.value)} className="text-xs border-none outline-none text-gray-700 bg-transparent" />
                    </div>
                    <button onClick={handleApplyDateFilters} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition">
                      Apply
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSubmitEntryQty} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 transition flex items-center gap-1">
                      <Send className="w-3 h-3" /> Submit Entry
                    </button>
                    <button onClick={handleSubmitApproved} className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Submit Approved
                    </button>
                    <button onClick={() => loadSummaryData(true)} className="px-3 py-1.5 bg-gray-600 text-white text-xs font-semibold rounded hover:bg-gray-700 transition flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                  </div>
                </div>

                {/* Summary Filter Bar */}
                <div className="flex-shrink-0 px-4 py-2 bg-white border-b border-gray-200 flex flex-wrap items-center gap-3 relative z-40">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-shrink-0">Filters:</span>
                  {SUMMARY_FILTER_DEFS.map(def => {
                    const active = summaryFilterSelections[def.key].length > 0;
                    return (
                      <div key={def.key} className="relative flex-shrink-0">
                        <button
                          onClick={() => setOpenSummaryFilter(openSummaryFilter === def.key ? null : def.key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                          {def.label}
                          {active && <span className="bg-blue-600 text-white text-[10px] px-1.5 rounded-full">{summaryFilterSelections[def.key].length}</span>}
                          <ChevronDown className="w-3 h-3 text-gray-400" />
                        </button>
                        {openSummaryFilter === def.key && (
                          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
                            <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                              <Search className="w-3.5 h-3.5 text-gray-400" />
                              <input
                                autoFocus
                                type="text"
                                placeholder={`Search ${def.label}...`}
                                className="w-full text-xs bg-transparent border-none outline-none"
                                value={summaryFilterSearchTerms[def.key] || ''}
                                onChange={e => setSummaryFilterSearchTerms(prev => ({ ...prev, [def.key]: e.target.value }))}
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1">
                              {getFilterOptions(def.key)
                                .filter(opt => !summaryFilterSearchTerms[def.key] || opt.toLowerCase().includes(summaryFilterSearchTerms[def.key].toLowerCase()))
                                .map(opt => (
                                  <label key={opt} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded-md">
                                    <input
                                      type="checkbox"
                                      checked={summaryFilterSelections[def.key].includes(opt)}
                                      onChange={() => toggleSummaryFilterOption(def.key, opt)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                    />
                                    <span className="text-xs text-gray-700 truncate">{opt}</span>
                                  </label>
                                ))}
                            </div>
                            {active && (
                              <div className="p-2 border-t border-gray-100 bg-gray-50">
                                <button onClick={() => clearSummaryFilter(def.key)} className="w-full text-xs text-red-600 hover:text-red-700 font-medium">Clear Filter</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {totalSummaryFilters > 0 && (
                    <button onClick={clearAllSummaryFilters} className="ml-auto text-xs text-red-600 hover:text-red-700 font-medium whitespace-nowrap px-2">
                      Clear All
                    </button>
                  )}
                </div>

                {/* Summary Table */}
                <div className="flex-1 overflow-auto bg-white relative">
                  {(summaryLoading || summaryMessage) && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm p-4 text-center">
                      {summaryLoading ? <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" /> : null}
                      {summaryMessage && (
                        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${summaryMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                          {summaryMessage.text}
                        </div>
                      )}
                    </div>
                  )}

                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-semibold text-gray-500 uppercase tracking-wider shadow-sm">
                      <tr>
                        <th className="p-2 border-b border-gray-200 w-10 text-center">
                          <input type="checkbox" onChange={(e) => {
                            const checked = e.target.checked;
                            setSummaryData(prev => prev.map(r => ({ ...r, select: checked })));
                            filteredSummaryData.forEach(r => updateCell(SUMMARY_SHEET, r.rowIndex, 1, checked));
                          }}
                          />
                        </th>
                        <th className="p-2 border-b border-gray-200 min-w-[50px]">#</th>
                        <th className="p-2 border-b border-gray-200 min-w-[90px]">SLIP NO.</th>
                        <th className="p-2 border-b border-gray-200 min-w-[140px]">PACS NAME</th>
                        <th className="p-2 border-b border-gray-200 min-w-[100px]">VEHICLE</th>
                        <th className="p-2 border-b border-gray-200 min-w-[90px]">TP DATE</th>
                        <th className="p-2 border-b border-gray-200 min-w-[90px]">MILL DATE</th>
                        <th className="p-2 border-b border-gray-200 min-w-[100px]">TP NO.</th>
                        <th className="p-2 border-b border-gray-200 min-w-[80px] text-right">TP QTY</th>
                        <th className="p-2 border-b border-gray-200 min-w-[80px] text-right">MILL NET</th>
                        <th className="p-2 border-b border-gray-200 min-w-[80px]">CHHATNI%</th>
                        <th className="p-2 border-b border-gray-200 min-w-[80px]">RST NO.</th>
                        <th className="p-2 border-b border-gray-200 min-w-[120px]">MILL NAME</th>
                        <th className="p-2 border-b border-gray-200 min-w-[80px] text-right">DIFF WT</th>
                        <th className="p-2 border-b border-gray-200 min-w-[100px]">ERROR DIFF</th>
                        <th className="p-2 border-b border-gray-200 min-w-[80px] text-right">ENTRY QTY</th>
                        <th className="p-2 border-b border-gray-200 min-w-[90px]">APPROVED</th>
                        <th className="p-2 border-b border-gray-200 min-w-[100px]">SEND ENTRY</th>
                        <th className="p-2 border-b border-gray-200 min-w-[100px]">ACHIEVE APPR</th>
                        <th className="p-2 border-b border-gray-200 min-w-[100px]">AGENT</th>
                        <th className="p-2 border-b border-gray-200 min-w-[80px] text-right">MULTIPLE</th>
                        <th className="p-2 border-b border-gray-200 min-w-[80px] text-right">SLIP NET</th>
                        <th className="p-2 border-b border-gray-200 min-w-[140px]">TAGGED HIST</th>
                        <th className="p-2 border-b border-gray-200 min-w-[100px] text-right">REMAINING</th>
                        <th className="p-2 border-b border-gray-200 min-w-[80px]">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {filteredSummaryData.map((row) => (
                        <tr key={row._idx} className={`hover:bg-blue-50/50 transition-colors ${row.isChhatniLow ? 'bg-purple-50' : ''}`}>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={!!row.select}
                              onChange={(e) => handleSummaryCheckbox(row._idx, e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                            />
                          </td>
                          <td className="p-2 text-gray-500 font-mono">{row.rowIndex}</td>
                          <td className="p-2 font-medium">{row.slipNo}</td>
                          <td className="p-2">{row.pacsName}</td>
                          <td className="p-2">{row.vehicleNo}</td>
                          <td className="p-2 whitespace-nowrap">{formatDate(row.tpDate).split(' ')[0]}</td>
                          <td className="p-2 whitespace-nowrap">{formatDate(row.millDate).split(' ')[0]}</td>
                          <td className="p-2 font-medium">{row.tpNo}</td>
                          <td className="p-2 text-right font-mono">{formatQty(row.tpQty)}</td>
                          <td className="p-2 text-right font-mono">{formatQty(row.millNetWt)}</td>
                          <td className="p-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded ${row.isChhatniLow ? 'bg-purple-100 text-purple-700 font-bold' : ''}`}>
                              {formatChhatni(row.chhatniPercent)}
                            </span>
                          </td>
                          <td className="p-2">{row.rstNo}</td>
                          <td className="p-2">{row.millName}</td>
                          <td className={`p-2 text-right font-mono font-medium ${parseFloat(row.diffInWt) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatQty(row.diffInWt)}
                          </td>
                          <td className="p-2 font-bold text-red-600">{row.hasError ? '❌ ERROR' : row.errorInDiff}</td>
                          <td className="p-2 text-right font-mono">{formatQty(row.entryQty)}</td>
                          <td className="p-2">{row.approved}</td>
                          <td className="p-2">
                            <input
                              type="number"
                              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                              value={row.sendEntryQty}
                              onChange={(e) => handleSendEntryQtyChange(row._idx, row.rowIndex, e.target.value)}
                              placeholder="Qty"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                              value={row.achieveApproved}
                              onChange={(e) => handleAchieveApprovedChange(row._idx, row.rowIndex, e.target.value)}
                            >
                              <option value=""></option>
                              <option value="APPROVED">APPROVED</option>
                              <option value="REJECTED">REJECTED</option>
                            </select>
                          </td>
                          <td className="p-2">{row.agentName}</td>
                          <td className="p-2 text-right">{row.multipleReceived}</td>
                          <td className="p-2 text-right font-mono">{formatQty(row.millNetWtSlipwise)}</td>
                          <td className="p-2 text-[10px] text-gray-500 max-w-[150px] truncate" title={row.taggedInHistory}>{row.taggedInHistory}</td>
                          <td className="p-2 text-right font-bold text-orange-600">{formatQty(row.remaining)}</td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => openSummaryTagModal(row)}
                              className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                              title="Tag Remaining"
                            >
                              <Tag className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredSummaryData.length === 0 && !summaryLoading && (
                        <tr><td colSpan="25" className="p-8 text-center text-gray-400 italic">No records found matching filters</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tag Remaining Tab */}
            {activeTab === "remaining" && (
              <div className="flex flex-col h-full overflow-hidden bg-white">
                {/* Stats Header */}
                <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-6 items-center">
                  <button onClick={() => loadRemainingData()} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded hover:bg-purple-700 transition flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                  {[
                    { l: 'Total Items', v: remainingStats.totalItems },
                    { l: 'Total Remaining', v: remainingStats.totalRemaining, c: 'text-purple-700' },
                    { l: 'Unique TPs', v: remainingStats.uniqueTp },
                    { l: 'Sheet 42/45', v: remainingStats.sheet4245Count },
                    { l: 'TP Not Receive', v: remainingStats.tpNotReceiveCount }
                  ].map((s, i) => (
                    <div key={i} className="flex flex-col">
                      <span className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">{s.l}</span>
                      <span className={`text-lg font-bold ${s.c || 'text-gray-800'}`}>{s.v}</span>
                    </div>
                  ))}
                </div>

                {/* Remaining Table */}
                <div className="flex-1 overflow-auto bg-white relative">
                  {(remainingLoading || remainingMessage) && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm p-4 text-center">
                      {remainingLoading ? <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-2" /> : null}
                      {remainingMessage && (
                        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${remainingMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-purple-50 text-purple-700'}`}>
                          {remainingMessage.text}
                        </div>
                      )}
                    </div>
                  )}

                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-semibold text-gray-500 uppercase tracking-wider shadow-sm">
                      <tr>
                        <th className="p-3 border-b border-gray-200 w-12 text-center">#</th>
                        <th className="p-3 border-b border-gray-200 text-right">Remaining Qty</th>
                        <th className="p-3 border-b border-gray-200">Slip No</th>
                        <th className="p-3 border-b border-gray-200">TP No</th>
                        <th className="p-3 border-b border-gray-200">PACS Name</th>
                        <th className="p-3 border-b border-gray-200">Vehicle No</th>
                        <th className="p-3 border-b border-gray-200">Tagged OUT History</th>
                        <th className="p-3 border-b border-gray-200 w-24 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                      {remainingData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-purple-50/50 transition-colors">
                          <td className="p-3 text-center text-gray-500">{idx + 1}</td>
                          <td className="p-3 text-right font-bold text-orange-600 font-mono">{formatQty(row.remainingQty)}</td>
                          <td className="p-3 font-medium">{row.slipNo}</td>
                          <td className="p-3">{row.tpNo}</td>
                          <td className="p-3">{row.pacsName}</td>
                          <td className="p-3">{row.vehicleNo}</td>
                          <td className="p-3 text-xs text-gray-500 max-w-[200px] break-words">{row.taggedRemainingHistory || '-'}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => openRemainingTagModal(row)}
                              className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-md hover:bg-purple-200 transition-colors"
                            >
                              Tag
                            </button>
                          </td>
                        </tr>
                      ))}
                      {remainingData.length === 0 && !remainingLoading && (
                        <tr><td colSpan="8" className="p-12 text-center text-gray-400 italic">No remaining quantities found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAG MODAL */}
            {showTagModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-purple-800 to-indigo-900 flex-shrink-0">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Tag className="w-5 h-5" /> Tag Remaining Quantity
                      </h3>
                      <p className="text-purple-200 text-sm mt-1">
                        {isSummaryTagMode ?
                          `Tagging TO: TP ${tagTargetInfo.tpNo} (${tagTargetInfo.pacsName})` :
                          'Distribute remaining quantity to one or more TPs'
                        }
                      </p>
                    </div>
                    <button onClick={closeTagModal} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
                      <X size={20} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                    {/* Source Info */}
                    <div className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm mb-6">
                      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span> Source Slip Information
                      </h4>
                      {isSummaryTagMode ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Select Source Slip (with remaining qty)</label>
                            <select
                              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                              value={tagSourceSlipIndex}
                              onChange={(e) => onSourceSlipChanged(e.target.value)}
                            >
                              <option value="">-- Select Slip --</option>
                              {allAvailableSlips.map((s, i) => (
                                <option key={i} value={i}>
                                  {s.slipNo} | Rem: {formatQty(s.remainingQty)} | TP: {s.tpNo} | {s.pacsName}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gray-50 p-2 rounded border border-gray-100">
                            <span className="block text-xs text-gray-400 uppercase">Slip No</span>
                            <span className="block font-bold text-gray-800">{tagCurrentItem?.slipNo}</span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded border border-gray-100">
                            <span className="block text-xs text-gray-400 uppercase">TP No</span>
                            <span className="block font-bold text-gray-800">{tagCurrentItem?.tpNo}</span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded border border-gray-100">
                            <span className="block text-xs text-gray-400 uppercase">PACS</span>
                            <span className="block font-medium text-gray-800 truncate" title={tagCurrentItem?.pacsName}>{tagCurrentItem?.pacsName}</span>
                          </div>
                          <div className="bg-orange-50 p-2 rounded border border-orange-100">
                            <span className="block text-xs text-orange-400 uppercase">Remaining Qty</span>
                            <span className="block font-bold text-orange-700 text-lg">{formatQty(tagCurrentItem?.remainingQty)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Destination Inputs */}
                    {(tagCurrentItem || !isSummaryTagMode) && (
                      <div className="mt-6">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                            {isSummaryTagMode ? 'Quantity to Tag' : 'Destination Details'}
                          </h4>
                        </div>
                        {isSummaryTagMode ? (
                          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Quantity to Tag</label>
                              <input
                                type="number"
                                className="w-full text-lg p-2 border-b-2 border-indigo-200 focus:border-indigo-600 outline-none font-mono bg-transparent transition-colors"
                                placeholder="0.00"
                                value={tagQuantity}
                                onChange={(e) => setTagQuantity(e.target.value)}
                                autoFocus
                              />
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-400 uppercase mb-1">Target Information</div>
                              <div className="font-bold text-gray-800">Has TP No: <span className="text-indigo-600">{tagTargetInfo.tpNo}</span></div>
                              <div className="text-sm text-gray-600">{tagTargetInfo.pacsName}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {tagMappings.map((map, idx) => (
                              <div key={map.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative group hover:border-indigo-300 transition-all">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                  <div className="md:col-span-3">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Target TP No</label>
                                    <input
                                      type="text"
                                      className="w-full p-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                                      value={map.targetTp}
                                      onChange={(e) => updateTagMapping(map.id, 'targetTp', e.target.value)}
                                      onBlur={(e) => handleLoadPacs(map.id, e.target.value)}
                                      placeholder="Ex: 51234"
                                    />
                                  </div>
                                  <div className="md:col-span-6">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Target PACS Name</label>
                                    {tagPacsOptions[map.id] && tagPacsOptions[map.id].length > 0 ? (
                                      <select
                                        className="w-full p-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                                        value={map.targetPacs}
                                        onChange={(e) => updateTagMapping(map.id, 'targetPacs', e.target.value)}
                                      >
                                        <option value="">-- Select PACS --</option>
                                        {tagPacsOptions[map.id].map(p => <option key={p} value={p}>{p}</option>)}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        className="w-full p-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                                        value={map.targetPacs}
                                        onChange={(e) => updateTagMapping(map.id, 'targetPacs', e.target.value)}
                                        placeholder="Enter PACS Name"
                                      />
                                    )}
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                                    <input
                                      type="number"
                                      className="w-full p-2 border border-gray-200 rounded text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                                      value={map.quantity}
                                      onChange={(e) => updateTagMapping(map.id, 'quantity', e.target.value)}
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <div className="md:col-span-1 flex justify-end">
                                    <button
                                      onClick={() => removeTagMapping(map.id)}
                                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                      disabled={tagMappings.length === 1}
                                      title="Remove"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={addTagMapping}
                              className="mt-2 text-sm flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors font-medium w-full justify-center border border-indigo-200 border-dashed"
                            >
                              <Plus className="w-4 h-4" /> Add Another Mapping
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Footer Stats & Actions */}
                  <div className="bg-white border-t border-gray-200 p-4 md:px-6 md:py-4 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
                    <div className="flex gap-6 text-sm">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase">Total Mapped</span>
                        <span className="font-bold text-indigo-700 text-lg">{tagTotalMapped.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase">Remaining Balance</span>
                        <span className={`font-bold text-lg ${tagRemainingBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {tagRemainingBalance.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                      <button
                        onClick={closeTagModal}
                        className="flex-1 md:flex-none px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        disabled={tagSaving}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTagMappings}
                        disabled={tagSaving || !tagCurrentItem || tagTotalMapped <= 0}
                        className="flex-1 md:flex-none px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        {tagSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" /> Confirm Tagging
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TpSummaryPage;