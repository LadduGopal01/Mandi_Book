import React, { useState, useEffect } from "react";
import { Filter, X, Search, Edit, CheckCircle, Clock, ChevronDown, Loader2 } from "lucide-react";
import { useToast } from '../../contexts/ToastContext';

const API_URL = import.meta.env.VITE_SHEET_API_URL;
const DROP_DOWN_SHEET = import.meta.env.VITE_SHEET_DROP_NAME;
const DISPATCH_SHEET = import.meta.env.VITE_SHEET_DISPATCH;

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

const UnloadingPoint = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState("pending");
    const [showFilters, setShowFilters] = useState(false);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedIndent, setSelectedIndent] = useState(null);
    const [loading, setLoading] = useState(false);

    // Filters state
    const [filters, setFilters] = useState({
        trType: "",
        rstNo: "",
        party: "",
        place: "",
        truckNo: "",
        item: "",
    });

    const [processForm, setProcessForm] = useState({
        status: "Yes"
    });

    // We only need status for history edit as per requirements (History section shows Status)
    const [historyEditForm, setHistoryEditForm] = useState({
        status: "Yes"
    });

    // Searchable dropdown states for filters
    const [filterSearchTerms, setFilterSearchTerms] = useState({
        party: "",
        place: "",
        item: "",
    });

    const [showFilterDropdowns, setShowFilterDropdowns] = useState({
        party: false,
        place: false,
        item: false,
    });

    const [pendingIndents, setPendingIndents] = useState([]);
    const [historyIndents, setHistoryIndents] = useState([]);
    const [filteredPending, setFilteredPending] = useState([]);
    const [filteredHistory, setFilteredHistory] = useState([]);

    // State for history edit modal
    const [showHistoryEditModal, setShowHistoryEditModal] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

    // Fetch indents from Google Sheets
    const fetchIndents = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `${API_URL}?sheet=${DISPATCH_SHEET}&action=getData`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch indent data');
            }

            const data = await response.json();
            if (data.success && data.data) {
                const sheetData = data.data;
                const pendingData = [];
                const historyData = [];

                // Start from row 7 (index 6) as per specification
                for (let i = 6; i < sheetData.length; i++) {
                    const row = sheetData[i];

                    // Check if row has at least basic data (TR Type in column B)
                    if (row[1]) { // Column B has data
                        const indent = {
                            id: i + 1, // Use row number as ID
                            rowIndex: i + 1, // Store actual row index
                            // Data mapping based on requirements
                            trType: row[1] || '',           // Column B
                            rstNo: row[2] || '',            // Column C
                            plantName: row[3] || '',        // Column D
                            dispatcherName: row[4] || '',   // Column E
                            party: row[5] || '',            // Column F
                            place: row[6] || '',            // Column G
                            truckNo: row[7] || '',          // Column H
                            item: row[8] || '',             // Column I
                            totalBag: row[9] || '',         // Column J
                            bhartiSize: row[10] || '',      // Column K
                            totalQty: row[11] || '',        // Column L
                            tareWt: row[12] || '',          // Column M
                            netWt: row[13] || '',           // Column N
                            grossWt: row[14] || '',         // Column O
                            jute: row[15] || '',            // Column P
                            plastic: row[16] || '',         // Column Q
                            tpNo: row[17] || '',            // Column R
                            tpWt: row[18] || '',            // Column S
                            remarks: row[19] || '',         // Column T

                            // Check columns for Unloading Point Logic
                            // AB (28) -> index 27
                            // AC (29) -> index 28
                            // AE (31) -> index 30
                            colAB: row[27] || '',
                            colAC: row[28] || '',
                            status: row[30] || '',
                        };

                        // Logic:
                        // Pending: AB != Null AND AC == Null
                        // History: AB != Null AND AC != Null

                        const hasColumnAB = row[27] && row[27].toString().trim() !== '';
                        const hasColumnAC = row[28] && row[28].toString().trim() !== '';

                        if (hasColumnAB && !hasColumnAC) {
                            pendingData.push(indent);
                        } else if (hasColumnAB && hasColumnAC) {
                            historyData.push(indent);
                        }
                    }
                }

                // Reverse data to show latest first
                pendingData.reverse();
                historyData.reverse();

                setPendingIndents(pendingData);
                setHistoryIndents(historyData);
                setFilteredPending(pendingData);
                setFilteredHistory(historyData);
            }
        } catch (error) {
            console.error('Error fetching indents:', error);
            showToast('Failed to load indents. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Load data on component mount
    useEffect(() => {
        fetchIndents();
    }, []);

    // Apply filters whenever filters or data change
    useEffect(() => {
        applyFilters();
    }, [filters, pendingIndents, historyIndents]);

    const applyFilters = () => {
        let filteredPendingData = [...pendingIndents];
        let filteredHistoryData = [...historyIndents];

        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                const filterValue = filters[key].toLowerCase();
                filteredPendingData = filteredPendingData.filter((item) =>
                    item[key]?.toString().toLowerCase().includes(filterValue)
                );
                filteredHistoryData = filteredHistoryData.filter((item) =>
                    item[key]?.toString().toLowerCase().includes(filterValue)
                );
            }
        });

        setFilteredPending(filteredPendingData);
        setFilteredHistory(filteredHistoryData);
    };

    const handleClearFilters = () => {
        setFilters({
            trType: "",
            rstNo: "",
            party: "",
            place: "",
            truckNo: "",
            item: "",
        });
        setFilterSearchTerms({
            party: "",
            place: "",
            item: "",
        });
    };

    const handleProcessClick = (indent) => {
        setSelectedIndent(indent);
        setProcessForm({
            status: "Yes"
        });
        setShowProcessModal(true);
    };

    const handleProcessSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);

            // Generate timestamp in YYYY-MM-DD HH:mm:ss format
            const now = new Date();
            const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

            const rowIndex = selectedIndent.rowIndex;

            // Update Column AC (column 29) - Timestamp
            const updateACResponse = await fetch(API_URL, {
                method: 'POST',
                body: new URLSearchParams({
                    action: 'updateCell',
                    sheetName: DISPATCH_SHEET,
                    rowIndex: rowIndex,
                    columnIndex: 29, // Column AC
                    value: timestamp
                })
            });

            const resultAC = await updateACResponse.json();

            if (!resultAC.success) {
                throw new Error(resultAC.error || 'Failed to update timestamp in Column AC');
            }

            // Update Column AE (column 31) - Vehicle Reached / Status
            const updateAEResponse = await fetch(API_URL, {
                method: 'POST',
                body: new URLSearchParams({
                    action: 'updateCell',
                    sheetName: DISPATCH_SHEET,
                    rowIndex: rowIndex,
                    columnIndex: 31, // Column AE
                    value: 'Vehicle Reached' // User said "'Vehicle Reached' store in 'AE7:AE'"
                })
            });

            const resultAE = await updateAEResponse.json();

            if (resultAE.success) {
                showToast('Unloading point processed successfully!', 'success');
                setShowProcessModal(false);
                setSelectedIndent(null);
                await fetchIndents();
            } else {
                throw new Error(resultAE.error || 'Failed to update status in Column AE');
            }
        } catch (error) {
            console.error('Error processing indent:', error);
            showToast(`Error processing indent: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleHistoryEditClick = (item) => {
        setSelectedHistoryItem(item);
        setHistoryEditForm({
            status: item.status || "Vehicle Reached"
        });
        setShowHistoryEditModal(true);
    };

    const handleSaveHistoryEdit = async (e) => {
        e.preventDefault();
        // Since the requirement didn't specify editing logic for history explicitly other than showing "Status",
        // we'll assume it allows editing the status in AE and updating timestamp in AC again if saved.
        // However, usually history edit updates the same fields.

        try {
            setLoading(true);

            // Generate timestamp in YYYY-MM-DD HH:mm:ss format
            const now = new Date();
            const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

            const rowIndex = selectedHistoryItem.rowIndex;

            // Updated Timestamp
            const updateACResponse = await fetch(API_URL, {
                method: 'POST',
                body: new URLSearchParams({
                    action: 'updateCell',
                    sheetName: DISPATCH_SHEET,
                    rowIndex: rowIndex,
                    columnIndex: 29,
                    value: timestamp
                })
            });

            if (!(await updateACResponse.json()).success) throw new Error('Failed to update timestamp');

            // Update Status
            const updateAEResponse = await fetch(API_URL, {
                method: 'POST',
                body: new URLSearchParams({
                    action: 'updateCell',
                    sheetName: DISPATCH_SHEET,
                    rowIndex: rowIndex,
                    columnIndex: 31,
                    value: historyEditForm.status
                })
            });

            if ((await updateAEResponse.json()).success) {
                showToast('Record updated successfully!', 'success');
                setShowHistoryEditModal(false);
                setSelectedHistoryItem(null);
                await fetchIndents();
            } else {
                throw new Error('Failed to update status');
            }
        } catch (error) {
            console.error('Error updating record:', error);
            showToast(`Error updating record: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setShowProcessModal(false);
        setSelectedIndent(null);
    };

    // Filter helpers
    const hasActiveFilters = Object.values(filters).some(value => value !== "");
    const currentTabData = activeTab === 'pending' ? pendingIndents : historyIndents;

    const uniqueTrTypes = [...new Set(currentTabData.map(item => item.trType))].filter(Boolean).sort();
    const uniqueParties = [...new Set(currentTabData.map(item => item.party))].filter(Boolean).sort();
    const uniquePlaces = [...new Set(currentTabData.map(item => item.place))].filter(Boolean).sort();
    const uniqueItems = [...new Set(currentTabData.map(item => item.item))].filter(Boolean).sort();

    const filteredPartyOptions = uniqueParties.filter(party => party.toLowerCase().includes(filterSearchTerms.party.toLowerCase()));
    const filteredPlaceOptions = uniquePlaces.filter(place => place.toLowerCase().includes(filterSearchTerms.place.toLowerCase()));
    const filteredItemOptions = uniqueItems.filter(item => item.toLowerCase().includes(filterSearchTerms.item.toLowerCase()));

    const handleFilterDropdownSelect = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setFilterSearchTerms(prev => ({ ...prev, [field]: "" }));
        setShowFilterDropdowns(prev => ({ ...prev, [field]: false }));
    };

    const handleFilterSearchChange = (field, value) => {
        setFilterSearchTerms(prev => ({ ...prev, [field]: value }));
        setFilters(prev => ({ ...prev, [field]: "" }));
        setShowFilterDropdowns(prev => ({ ...prev, [field]: true }));
    };

    const handleFilterDropdownFocus = (field) => {
        setShowFilterDropdowns(prev => ({ ...prev, [field]: true }));
        setFilterSearchTerms(prev => ({ ...prev, [field]: "" }));
    };

    const handleFilterDropdownBlur = (field) => {
        setTimeout(() => setShowFilterDropdowns(prev => ({ ...prev, [field]: false })), 150);
    };

    const handleClearFilterField = (field) => {
        setFilters(prev => ({ ...prev, [field]: "" }));
        setFilterSearchTerms(prev => ({ ...prev, [field]: "" }));
    };

    const renderLabelContent = (label, value) => (
        <div className="space-y-1">
            <span className="text-xs font-medium text-gray-600 block">{label}</span>
            <div className="min-h-[20px] py-1">
                <span className="text-sm font-medium text-gray-900 break-words">{value || "-"}</span>
            </div>
        </div>
    );

    return (
        <div className="h-[88vh] bg-gray-50 flex flex-col overflow-hidden">
            {loading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-red-800 animate-spin" />
                        <p className="text-gray-700">Loading...</p>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex-shrink-0 p-4 lg:p-6 bg-gray-50">
                    <div className="max-w-full mx-auto">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Unloading Point</h1>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <Filter className="w-4 h-4" />
                                    <span className="hidden sm:inline">Filters</span>
                                    {hasActiveFilters && (
                                        <span className="px-1.5 py-0.5 text-xs font-semibold text-white bg-red-800 rounded-full">●</span>
                                    )}
                                </button>
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
                                    onClick={() => setActiveTab("pending")}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === "pending"
                                        ? "border-red-800 text-red-800"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Pending ({pendingIndents.length})
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveTab("history")}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === "history"
                                        ? "border-red-800 text-red-800"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        History ({historyIndents.length})
                                    </div>
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="flex-shrink-0 px-4 lg:px-6 py-4 bg-gray-50">
                        <div className="max-w-full mx-auto">
                            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Quick Filters</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                                    {/* TR Type */}
                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-gray-600">TR Type</label>
                                        <div className="relative">
                                            <select
                                                value={filters.trType}
                                                onChange={(e) => setFilters({ ...filters, trType: e.target.value })}
                                                className="py-1.5 px-2 w-full text-xs rounded border border-gray-300 focus:ring-1 focus:ring-red-800 focus:border-transparent appearance-none bg-white"
                                            >
                                                <option value="">All TR Types</option>
                                                {uniqueTrTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 w-3 h-3 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>
                                    {/* RST No */}
                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-gray-600">RST No</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={filters.rstNo}
                                                onChange={(e) => setFilters({ ...filters, rstNo: e.target.value })}
                                                placeholder="Search RST..."
                                                className="py-1.5 px-2 w-full text-xs rounded border border-gray-300 focus:ring-1 focus:ring-red-800"
                                            />
                                        </div>
                                    </div>
                                    {/* Party */}
                                    <div className="space-y-1 relative">
                                        <label className="block text-xs font-medium text-gray-600">Party</label>
                                        <input
                                            type="text"
                                            value={showFilterDropdowns.party ? filterSearchTerms.party : filters.party}
                                            onChange={(e) => handleFilterSearchChange('party', e.target.value)}
                                            onFocus={() => handleFilterDropdownFocus('party')}
                                            onBlur={() => handleFilterDropdownBlur('party')}
                                            placeholder="Search Party..."
                                            className="py-1.5 px-2 w-full text-xs rounded border border-gray-300 focus:ring-1 focus:ring-red-800"
                                        />
                                        {filters.party && <button onClick={() => handleClearFilterField('party')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400" /></button>}
                                        {showFilterDropdowns.party && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                                {filteredPartyOptions.map((opt, i) => (
                                                    <div key={i} onMouseDown={(e) => { e.preventDefault(); handleFilterDropdownSelect('party', opt); }} className="px-3 py-1.5 text-xs hover:bg-gray-100 cursor-pointer">{opt}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Place */}
                                    <div className="space-y-1 relative">
                                        <label className="block text-xs font-medium text-gray-600">Place</label>
                                        <input
                                            type="text"
                                            value={showFilterDropdowns.place ? filterSearchTerms.place : filters.place}
                                            onChange={(e) => handleFilterSearchChange('place', e.target.value)}
                                            onFocus={() => handleFilterDropdownFocus('place')}
                                            onBlur={() => handleFilterDropdownBlur('place')}
                                            placeholder="Search Place..."
                                            className="py-1.5 px-2 w-full text-xs rounded border border-gray-300 focus:ring-1 focus:ring-red-800"
                                        />
                                        {filters.place && <button onClick={() => handleClearFilterField('place')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400" /></button>}
                                        {showFilterDropdowns.place && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                                {filteredPlaceOptions.map((opt, i) => (
                                                    <div key={i} onMouseDown={(e) => { e.preventDefault(); handleFilterDropdownSelect('place', opt); }} className="px-3 py-1.5 text-xs hover:bg-gray-100 cursor-pointer">{opt}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Truck No */}
                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-gray-600">Truck No</label>
                                        <input
                                            type="text"
                                            value={filters.truckNo}
                                            onChange={(e) => setFilters({ ...filters, truckNo: e.target.value })}
                                            placeholder="Search Truck..."
                                            className="py-1.5 px-2 w-full text-xs rounded border border-gray-300 focus:ring-1 focus:ring-red-800"
                                        />
                                    </div>
                                    {/* Item */}
                                    <div className="space-y-1 relative">
                                        <label className="block text-xs font-medium text-gray-600">Item</label>
                                        <input
                                            type="text"
                                            value={showFilterDropdowns.item ? filterSearchTerms.item : filters.item}
                                            onChange={(e) => handleFilterSearchChange('item', e.target.value)}
                                            onFocus={() => handleFilterDropdownFocus('item')}
                                            onBlur={() => handleFilterDropdownBlur('item')}
                                            placeholder="Search Item..."
                                            className="py-1.5 px-2 w-full text-xs rounded border border-gray-300 focus:ring-1 focus:ring-red-800"
                                        />
                                        {filters.item && <button onClick={() => handleClearFilterField('item')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400" /></button>}
                                        {showFilterDropdowns.item && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                                {filteredItemOptions.map((opt, i) => (
                                                    <div key={i} onMouseDown={(e) => { e.preventDefault(); handleFilterDropdownSelect('item', opt); }} className="px-3 py-1.5 text-xs hover:bg-gray-100 cursor-pointer">{opt}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="flex-1 overflow-hidden px-4 lg:px-6 pb-4 lg:pb-6">
                    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                        {/* Mobile Card View */}
                        <div className="lg:hidden flex-1 overflow-auto p-3 space-y-3">
                            {(activeTab === 'pending' ? filteredPending : filteredHistory).map((item) => (
                                <div key={item.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-gray-900">{item.rstNo || '-'}</p>
                                            <p className="text-xs text-gray-600">{item.trType || '-'} | {item.plantName || '-'}</p>
                                        </div>
                                        {activeTab === 'pending' ? (
                                            <button onClick={() => handleProcessClick(item)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900">Process</button>
                                        ) : (
                                            <button onClick={() => handleHistoryEditClick(item)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900 flex items-center gap-1"><Edit className="w-3 h-3" /> Edit</button>
                                        )}
                                    </div>
                                    <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                                        <div><span className="text-gray-500">Party:</span> <span className="font-medium">{item.party || '-'}</span></div>
                                        <div><span className="text-gray-500">Place:</span> <span className="font-medium">{item.place || '-'}</span></div>
                                        <div><span className="text-gray-500">Truck:</span> <span className="font-medium font-mono">{item.truckNo || '-'}</span></div>
                                        <div><span className="text-gray-500">Item:</span> <span className="font-medium">{item.item || '-'}</span></div>
                                        <div><span className="text-gray-500">Total Bag:</span> <span className="font-medium">{item.totalBag || '-'}</span></div>
                                        <div><span className="text-gray-500">Total Qty:</span> <span className="font-medium">{item.totalQty || '-'}</span></div>
                                        <div><span className="text-gray-500">Tare WT:</span> <span className="font-medium">{item.tareWt || '-'}</span></div>
                                        <div><span className="text-gray-500">Net WT:</span> <span className="font-medium">{item.netWt || '-'}</span></div>
                                        {activeTab === 'history' && (
                                            <div className="col-span-2"><span className="text-gray-500">Status:</span> <span className="font-medium text-green-700">{item.status || '-'}</span></div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {(activeTab === 'pending' ? filteredPending : filteredHistory).length === 0 && (
                                <div className="text-center py-12 text-gray-500">No records found</div>
                            )}
                        </div>
                        {/* Desktop Table View */}
                        <div className="hidden lg:block flex-1 overflow-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Action</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">TR Type</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">RST No</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Plant Name</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Dispatcher Name</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Party</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Place</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Truck No</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Item</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Total Bag</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Bharti Size</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Total Qty</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Tare WT</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Net WT</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Gross WT</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Jute</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Plastic</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">TP No</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">TP WT</th>
                                        <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Remarks</th>
                                        {activeTab === 'history' && (
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Status</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {(activeTab === 'pending' ? filteredPending : filteredHistory).map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 text-sm whitespace-nowrap">
                                                {activeTab === 'pending' ? (
                                                    <button
                                                        onClick={() => handleProcessClick(item)}
                                                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900"
                                                    >
                                                        Process
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleHistoryEditClick(item)}
                                                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900 flex items-center gap-1"
                                                    >
                                                        <Edit className="w-3 h-3" /> Edit
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.trType || '-'}</td>
                                            <td className="px-3 py-2 text-sm font-semibold text-gray-900 whitespace-nowrap">{item.rstNo || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.plantName || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.dispatcherName || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.party || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.place || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 font-mono whitespace-nowrap">{item.truckNo || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.item || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.totalBag || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.bhartiSize || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.totalQty || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.tareWt || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.netWt || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.grossWt || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.jute || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.plastic || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.tpNo || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.tpWt || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate" title={item.remarks}>{item.remarks || '-'}</td>
                                            {activeTab === 'history' && (
                                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.status || '-'}</td>
                                            )}
                                        </tr>
                                    ))}
                                    {(activeTab === 'pending' ? filteredPending : filteredHistory).length === 0 && (
                                        <tr>
                                            <td colSpan={21} className="px-6 py-12 text-center text-gray-500">
                                                No records found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Process Modal */}
            {showProcessModal && selectedIndent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 bg-gradient-to-r from-red-800 to-red-900">
                            <h3 className="text-lg font-bold text-white">Unloading Point Action</h3>
                            <button onClick={() => setShowProcessModal(false)} className="text-white hover:text-white/80"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            {/* Pre-fill Details Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {renderLabelContent("TR Type", selectedIndent.trType)}
                                {renderLabelContent("RST No", selectedIndent.rstNo)}
                                {renderLabelContent("Plant Name", selectedIndent.plantName)}
                                {renderLabelContent("Dispatcher Name", selectedIndent.dispatcherName)}
                                {renderLabelContent("Party", selectedIndent.party)}
                                {renderLabelContent("Place", selectedIndent.place)}
                                {renderLabelContent("Truck No", selectedIndent.truckNo)}
                                {renderLabelContent("Item", selectedIndent.item)}
                                {renderLabelContent("Total Bag", selectedIndent.totalBag)}
                                {renderLabelContent("Bharti Size", selectedIndent.bhartiSize)}
                                {renderLabelContent("Total Qty", selectedIndent.totalQty)}
                                {renderLabelContent("Tare WT", selectedIndent.tareWt)}
                                {renderLabelContent("Net WT", selectedIndent.netWt)}
                                {renderLabelContent("Gross WT", selectedIndent.grossWt)}
                                {renderLabelContent("Jute", selectedIndent.jute)}
                                {renderLabelContent("Plastic", selectedIndent.plastic)}
                                {renderLabelContent("TP No", selectedIndent.tpNo)}
                                {renderLabelContent("TP WT", selectedIndent.tpWt)}
                                {renderLabelContent("Remarks", selectedIndent.remarks)}
                            </div>

                            <form onSubmit={handleProcessSubmit} className="space-y-6 border-t border-gray-200 pt-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status <span className="text-red-600">*</span></label>
                                    <select
                                        value={processForm.status}
                                        onChange={(e) => setProcessForm({ ...processForm, status: e.target.value })}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-800 focus:border-red-800 sm:text-sm rounded-md"
                                        required
                                    >
                                        <option value="Yes">Yes</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button type="button" onClick={() => setShowProcessModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                                    <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-red-800 rounded-md hover:bg-red-900 disabled:opacity-50">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* History Edit Modal (Enhanced with details) */}
            {showHistoryEditModal && selectedHistoryItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 bg-gradient-to-r from-red-800 to-red-900">
                            <h3 className="text-lg font-bold text-white">Edit Unloading Status</h3>
                            <button onClick={() => setShowHistoryEditModal(false)} className="text-white hover:text-white/80"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            {/* Pre-fill Details Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {renderLabelContent("TR Type", selectedHistoryItem.trType)}
                                {renderLabelContent("RST No", selectedHistoryItem.rstNo)}
                                {renderLabelContent("Plant Name", selectedHistoryItem.plantName)}
                                {renderLabelContent("Dispatcher Name", selectedHistoryItem.dispatcherName)}
                                {renderLabelContent("Party", selectedHistoryItem.party)}
                                {renderLabelContent("Place", selectedHistoryItem.place)}
                                {renderLabelContent("Truck No", selectedHistoryItem.truckNo)}
                                {renderLabelContent("Item", selectedHistoryItem.item)}
                                {renderLabelContent("Total Bag", selectedHistoryItem.totalBag)}
                                {renderLabelContent("Bharti Size", selectedHistoryItem.bhartiSize)}
                                {renderLabelContent("Total Qty", selectedHistoryItem.totalQty)}
                                {renderLabelContent("Tare WT", selectedHistoryItem.tareWt)}
                                {renderLabelContent("Net WT", selectedHistoryItem.netWt)}
                                {renderLabelContent("Gross WT", selectedHistoryItem.grossWt)}
                                {renderLabelContent("Jute", selectedHistoryItem.jute)}
                                {renderLabelContent("Plastic", selectedHistoryItem.plastic)}
                                {renderLabelContent("TP No", selectedHistoryItem.tpNo)}
                                {renderLabelContent("TP WT", selectedHistoryItem.tpWt)}
                                {renderLabelContent("Remarks", selectedHistoryItem.remarks)}
                            </div>

                            <form onSubmit={handleSaveHistoryEdit} className="space-y-6 border-t border-gray-200 pt-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status</label>
                                    <input
                                        type="text"
                                        value={historyEditForm.status}
                                        onChange={(e) => setHistoryEditForm({ ...historyEditForm, status: e.target.value })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-800 focus:border-red-800 sm:text-sm"
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button type="button" onClick={() => setShowHistoryEditModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                                    <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-red-800 rounded-md hover:bg-red-900 disabled:opacity-50">Update</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default UnloadingPoint;