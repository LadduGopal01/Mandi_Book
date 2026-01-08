import React, { useState, useEffect } from "react";
import { Filter, X, Search, Edit, CheckCircle, Clock, ChevronDown, Loader2 } from "lucide-react";
import { useToast } from '../../contexts/ToastContext';

const API_URL = import.meta.env.VITE_SHEET_API_URL;
const SHEET_ID = import.meta.env.VITE_SHEET_ID;
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

const IndentProcessingPage = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [showFilters, setShowFilters] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [editingIndent, setEditingIndent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState({
    plantName: [],
    officeDispatcher: [],
    commodityType: []
  });

  const [filters, setFilters] = useState({
    trType: "",
    rstNo: "",
    party: "",
    place: "",
    truckNo: "",
    item: "",
  });

  const [processForm, setProcessForm] = useState({
    vehicleReached: "Yes"
  });

  const [editForm, setEditForm] = useState({
    plantName: "",
    officeDispatcher: "",
    partyName: "",
    vehicleNo: "",
    commodityType: "",
    noOfPkts: "",
    bhartiSize: "",
    totalQty: "",
    tyreWeight: "",
    vehicleReached: "Yes",
    remarks: ""
  });

  // State for searchable dropdowns
  const [searchTerms, setSearchTerms] = useState({
    plantName: "",
    officeDispatcher: "",
    commodityType: "",
  });

  const [showDropdowns, setShowDropdowns] = useState({
    plantName: false,
    officeDispatcher: false,
    commodityType: false,
  });

  // State for filter searchable dropdowns
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

  // State for history edit modal (only vehicleReached is editable)
  const [showHistoryEditModal, setShowHistoryEditModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [historyEditForm, setHistoryEditForm] = useState({
    vehicleReached: "Yes"
  });

  // Fetch dropdown options from Google Sheets
  const fetchDropdownOptions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}?sheet=${DROP_DOWN_SHEET}&action=getData`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dropdown data');
      }

      const data = await response.json();
      if (data.success && data.data) {
        // Extract data from columns A, B, C (skip header row)
        const sheetData = data.data;

        // Get Plant Names from column A (A2:A)
        const plantNames = [];
        for (let i = 1; i < sheetData.length; i++) {
          if (sheetData[i][0]) {
            plantNames.push(sheetData[i][0].trim());
          }
        }

        // Get Office Dispatcher Names from column B (B2:B)
        const dispatcherNames = [];
        for (let i = 1; i < sheetData.length; i++) {
          if (sheetData[i][1]) {
            dispatcherNames.push(sheetData[i][1].trim());
          }
        }

        // Get Commodity Types from column C (C2:C)
        const commodityTypes = [];
        for (let i = 1; i < sheetData.length; i++) {
          if (sheetData[i][2]) {
            commodityTypes.push(sheetData[i][2].trim());
          }
        }

        setDropdownOptions({
          plantName: [...new Set(plantNames)], // Remove duplicates
          officeDispatcher: [...new Set(dispatcherNames)], // Remove duplicates
          commodityType: [...new Set(commodityTypes)] // Remove duplicates
        });
      }
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      showToast('Failed to load dropdown options. Please refresh the page.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
          if (row[1]) { // Column B has data (TR Type)
            const indent = {
              id: i + 1, // Use row number as ID for editing
              rowIndex: i + 1, // Store actual row index for updates
              date: row[0] || '',             // Column A - Date/Timestamp
              trType: row[1] || '',           // Column B - TR Type
              rstNo: row[2] || '',            // Column C - RST No
              plantName: row[3] || '',        // Column D - Plant Name
              dispatcherName: row[4] || '',   // Column E - Dispatcher Name
              party: row[5] || '',            // Column F - Party
              place: row[6] || '',            // Column G - Place
              truckNo: row[7] || '',          // Column H - Truck No
              item: row[8] || '',             // Column I - Item
              totalBag: row[9] || '',         // Column J - Total Bag
              bhartiSize: row[10] || '',      // Column K - Bharti Size
              totalQty: row[11] || '',        // Column L - Total Qty
              tareWt: row[12] || '',          // Column M - Tare WT
              netWt: row[13] || '',           // Column N - Net WT
              grossWt: row[14] || '',         // Column O - Gross WT
              jute: row[15] || '',            // Column P - Jute
              plastic: row[16] || '',         // Column Q - Plastic
              tpNo: row[17] || '',            // Column R - TP No
              tpWt: row[18] || '',            // Column S - TP WT
              remarks: row[19] || '',         // Column T - Remarks
              vehicleReached: row[23] || '',  // Column X - Vehicle Reached
            };

            // Check conditions for pending vs history
            // Column U (index 20) and Column V (index 21)
            const hasColumnU = row[20] && row[20].toString().trim() !== ''; // Column U not null
            const hasColumnV = row[21] && row[21].toString().trim() !== ''; // Column V not null

            if (hasColumnU && !hasColumnV) {
              // Pending: Column U = Not Null, Column V = Null
              pendingData.push(indent);
            } else if (hasColumnU && hasColumnV) {
              // History: Column U = Not Null, Column V = Not Null
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
    fetchDropdownOptions();
    fetchIndents();
  }, []);

  // Apply filters whenever filters or data change
  useEffect(() => {
    applyFilters();
  }, [filters, pendingIndents, historyIndents]);

  const applyFilters = () => {
    // Filter pending indents
    let filteredPendingData = [...pendingIndents];
    let filteredHistoryData = [...historyIndents];

    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        filteredPendingData = filteredPendingData.filter((item) =>
          item[key]?.toLowerCase().includes(filters[key].toLowerCase())
        );
        filteredHistoryData = filteredHistoryData.filter((item) =>
          item[key]?.toLowerCase().includes(filters[key].toLowerCase())
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
  };

  const handleProcessClick = (indent) => {
    setSelectedIndent(indent);
    setProcessForm({
      vehicleReached: "Yes",
      plantName: indent.plantName || "",
      officeDispatcher: indent.officeDispatcher || "",
      partyName: indent.partyName || "",
      vehicleNo: indent.vehicleNo || "",
      commodityType: indent.commodityType || "",
      noOfPkts: indent.noOfPkts || "",
      bhartiSize: indent.bhartiSize || "",
      totalQty: indent.totalQty || "",
      tyreWeight: indent.tyreWeight || "",
      remarks: indent.remarks || ""
    });
    setShowProcessModal(true);
  };

  // Edit button handler - opens popup form
  const handleEditClick = (indent) => {
    setEditingIndent(indent);
    setEditForm({
      plantName: indent.plantName || "",
      officeDispatcher: indent.officeDispatcher || "",
      partyName: indent.partyName || "",
      vehicleNo: indent.vehicleNo || "",
      commodityType: indent.commodityType || "",
      noOfPkts: indent.noOfPkts || "",
      bhartiSize: indent.bhartiSize || "",
      totalQty: indent.totalQty || "",
      tyreWeight: indent.tyreWeight || "",
      vehicleReached: indent.vehicleReached || "Yes",
      remarks: indent.remarks || ""
    });
    setShowEditModal(true);
  };

  // Generic handler for dropdown selection
  const handleDropdownSelect = (field, value) => {
    setProcessForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSearchTerms((prev) => ({
      ...prev,
      [field]: "",
    }));
    setShowDropdowns((prev) => ({
      ...prev,
      [field]: false,
    }));
  };

  // Handler for search input changes
  const handleSearchChange = (field, value) => {
    setSearchTerms((prev) => ({
      ...prev,
      [field]: value,
    }));
    setShowDropdowns((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  // Handler for dropdown focus
  const handleDropdownFocus = (field) => {
    setShowDropdowns((prev) => ({
      ...prev,
      [field]: true,
    }));
    setSearchTerms((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  // Handler for dropdown blur
  const handleDropdownBlur = (field) => {
    setTimeout(() => {
      setShowDropdowns((prev) => ({
        ...prev,
        [field]: false,
      }));
    }, 200);
  };

  // Handler for regular input changes in process modal
  const handleProcessInputChange = (e) => {
    const { name, value } = e.target;
    setProcessForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handler for regular input changes in edit modal
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Process form submission - Mark vehicle as reached at loading point
  const handleProcessSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Generate timestamp in YYYY-MM-DD HH:mm:ss format
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // Update only column V (timestamp) and column X (Vehicle Reached) for the matched RST No
      const rowIndex = selectedIndent.rowIndex;

      // Update Column V (column 22, 1-indexed) - Timestamp
      const updateVResponse = await fetch(API_URL, {
        method: 'POST',
        body: new URLSearchParams({
          action: 'updateCell',
          sheetName: DISPATCH_SHEET,
          rowIndex: rowIndex,
          columnIndex: 22, // Column V (1-indexed: A=1, B=2, ... V=22)
          value: timestamp
        })
      });

      const resultV = await updateVResponse.json();
      console.log('Update Column V result:', resultV);

      if (!resultV.success) {
        throw new Error(resultV.error || 'Failed to update timestamp in Column V');
      }

      // Update Column X (column 24, 1-indexed) - Vehicle Reached
      const updateXResponse = await fetch(API_URL, {
        method: 'POST',
        body: new URLSearchParams({
          action: 'updateCell',
          sheetName: DISPATCH_SHEET,
          rowIndex: rowIndex,
          columnIndex: 24, // Column X (1-indexed: A=1, B=2, ... X=24)
          value: processForm.vehicleReached
        })
      });

      const resultX = await updateXResponse.json();
      console.log('Update Column X result:', resultX);

      if (resultX.success) {
        showToast('Vehicle marked as reached at loading point!', 'success');

        // Reset form
        setProcessForm({
          vehicleReached: "Yes"
        });

        // Reset search terms and dropdowns
        setSearchTerms({
          plantName: "",
          officeDispatcher: "",
          commodityType: "",
        });

        setShowDropdowns({
          plantName: false,
          officeDispatcher: false,
          commodityType: false,
        });

        setSelectedIndent(null);
        setShowProcessModal(false);

        // Refresh data from sheet
        await fetchIndents();
      } else {
        throw new Error(resultX.error || 'Failed to update vehicle reached status in Column X');
      }
    } catch (error) {
      console.error('Error processing indent:', error);
      showToast(`Error processing indent: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const rowIndex = editingIndent.rowIndex;

      // Prepare update data - only update specific columns based on editForm
      const rowData = [
        '', // Column A - keep original timestamp
        editingIndent.indentNo, // Column B - keep original
        editForm.plantName, // Column C - updated
        editForm.officeDispatcher, // Column D - updated
        editForm.partyName, // Column E - updated
        editForm.vehicleNo, // Column F - updated
        editForm.commodityType, // Column G - updated
        editForm.noOfPkts, // Column H - updated
        editForm.bhartiSize, // Column I - updated
        editForm.totalQty, // Column J - updated
        editForm.tyreWeight, // Column K - updated
        editForm.remarks, // Column L - updated
        '', // Column M - keep original
        '', // Column N - keep original timestamp
        '', // Column O - keep original
        editForm.vehicleReached, // Column P - updated
        '', // Column Q - keep original
        '', // Column R - keep original
        '', // Column S - keep original
        ''  // Column T - keep original
      ];

      const response = await fetch(API_URL, {
        method: 'POST',
        body: new URLSearchParams({
          action: 'update',
          sheetName: DISPATCH_SHEET,
          rowIndex: rowIndex,
          rowData: JSON.stringify(rowData)
        })
      });

      const result = await response.json();

      if (result.success) {
        showToast('Indent updated successfully!', 'success');

        // Reset form
        setEditForm({
          plantName: "",
          officeDispatcher: "",
          partyName: "",
          vehicleNo: "",
          commodityType: "",
          noOfPkts: "",
          bhartiSize: "",
          totalQty: "",
          tyreWeight: "",
          vehicleReached: "Yes",
          remarks: ""
        });

        setEditingIndent(null);
        setShowEditModal(false);

        // Refresh data from sheet
        await fetchIndents();
      } else {
        throw new Error(result.error || 'Failed to update indent');
      }
    } catch (error) {
      console.error('Error updating indent:', error);
      showToast(`Error updating indent: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowProcessModal(false);
    setSelectedIndent(null);

    // Reset search terms and dropdowns
    setSearchTerms({
      plantName: "",
      officeDispatcher: "",
      commodityType: "",
    });

    setShowDropdowns({
      plantName: false,
      officeDispatcher: false,
      commodityType: false,
    });
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditingIndent(null);

    // Reset edit form
    setEditForm({
      plantName: "",
      officeDispatcher: "",
      partyName: "",
      vehicleNo: "",
      commodityType: "",
      noOfPkts: "",
      bhartiSize: "",
      totalQty: "",
      tyreWeight: "",
      vehicleReached: "Yes",
      remarks: ""
    });
  };

  // ==================== HISTORY EDIT HANDLERS ====================

  // Handle edit button click on history item
  const handleHistoryEditClick = (item) => {
    setSelectedHistoryItem(item);
    setHistoryEditForm({
      vehicleReached: item.vehicleReached || "Yes"
    });
    setShowHistoryEditModal(true);
  };

  // Handler for history edit input changes
  const handleHistoryEditInputChange = (e) => {
    const { name, value } = e.target;
    setHistoryEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Save edited history item - update vehicleReached (Column X) and timestamp (Column V)
  const handleSaveHistoryEdit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Generate timestamp in YYYY-MM-DD HH:mm:ss format
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // Update Column V (column 22, 1-indexed) - Actual Timestamp
      const timestampResponse = await fetch(API_URL, {
        method: 'POST',
        body: new URLSearchParams({
          action: 'updateCell',
          sheetName: DISPATCH_SHEET,
          rowIndex: selectedHistoryItem.rowIndex,
          columnIndex: 22, // Column V (1-indexed: A=1, B=2, ... V=22)
          value: timestamp
        })
      });

      const timestampResult = await timestampResponse.json();
      if (!timestampResult.success) {
        throw new Error(timestampResult.error || 'Failed to update timestamp');
      }

      // Update Column X (column 24, 1-indexed) - Vehicle Reached
      const response = await fetch(API_URL, {
        method: 'POST',
        body: new URLSearchParams({
          action: 'updateCell',
          sheetName: DISPATCH_SHEET,
          rowIndex: selectedHistoryItem.rowIndex,
          columnIndex: 24, // Column X (1-indexed: A=1, B=2, ... X=24)
          value: historyEditForm.vehicleReached
        })
      });

      const result = await response.json();

      if (result.success) {
        showToast('Record updated successfully!', 'success');

        // Reset and close modal
        setHistoryEditForm({ vehicleReached: "Yes" });
        setSelectedHistoryItem(null);
        setShowHistoryEditModal(false);

        // Refresh data
        await fetchIndents();
      } else {
        throw new Error(result.error || 'Failed to update record');
      }
    } catch (error) {
      console.error('Error updating record:', error);
      showToast(`Error updating record: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel history edit modal
  const handleHistoryEditCancel = () => {
    setShowHistoryEditModal(false);
    setSelectedHistoryItem(null);
    setHistoryEditForm({ vehicleReached: "Yes" });
  };

  // ==================== END HISTORY EDIT HANDLERS ====================

  // Check if any filter is active
  const hasActiveFilters = Object.values(filters).some(value => value !== "");

  // Get unique values from current tab's data only (like Indent.jsx)
  const currentTabData = activeTab === 'pending' ? pendingIndents : historyIndents;

  const uniqueTrTypes = [...new Set(
    currentTabData.map(item => item.trType)
  )].filter(Boolean).sort();

  const uniqueParties = [...new Set(
    currentTabData.map(item => item.party)
  )].filter(Boolean).sort();

  const uniquePlaces = [...new Set(
    currentTabData.map(item => item.place)
  )].filter(Boolean).sort();

  const uniqueItems = [...new Set(
    currentTabData.map(item => item.item)
  )].filter(Boolean).sort();

  // Filter options based on search for filter dropdowns
  const filteredPartyOptions = uniqueParties.filter(party =>
    party.toLowerCase().includes(filterSearchTerms.party.toLowerCase())
  );

  const filteredPlaceOptions = uniquePlaces.filter(place =>
    place.toLowerCase().includes(filterSearchTerms.place.toLowerCase())
  );

  const filteredItemOptions = uniqueItems.filter(item =>
    item.toLowerCase().includes(filterSearchTerms.item.toLowerCase())
  );

  // Handlers for filter searchable dropdowns
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
    setTimeout(() => {
      setShowFilterDropdowns(prev => ({ ...prev, [field]: false }));
    }, 150);
  };

  const handleClearFilterField = (field) => {
    setFilters(prev => ({ ...prev, [field]: "" }));
    setFilterSearchTerms(prev => ({ ...prev, [field]: "" }));
  };

  // Filter options based on search (for process/edit modals)
  const filteredPlants = dropdownOptions.plantName.filter(plant =>
    plant.toLowerCase().includes(searchTerms.plantName.toLowerCase())
  );

  const filteredDispatchers = dropdownOptions.officeDispatcher.filter(dispatcher =>
    dispatcher.toLowerCase().includes(searchTerms.officeDispatcher.toLowerCase())
  );

  const filteredCommodities = dropdownOptions.commodityType.filter(commodity =>
    commodity.toLowerCase().includes(searchTerms.commodityType.toLowerCase())
  );

  // Function to render label with proper content display
  const renderLabelContent = (label, value) => {
    return (
      <div className="space-y-1">
        <span className="text-xs font-medium text-gray-600 block">{label}</span>
        <div className="min-h-[20px] py-1">
          <span className="text-sm font-medium text-gray-900 break-words">
            {value || "-"}
          </span>
        </div>
      </div>
    );
  };

  // Render searchable dropdown component for process modal
  const renderSearchableDropdown = (field, label, filteredOptions, placeholder, value) => (
    <div className="relative">
      <label className="block mb-1.5 text-sm font-medium text-gray-700">
        {label} <span className="text-red-600">*</span>
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={showDropdowns[field] ? searchTerms[field] : value}
          onChange={(e) => handleSearchChange(field, e.target.value)}
          onFocus={() => handleDropdownFocus(field)}
          onBlur={() => handleDropdownBlur(field)}
          className="w-full px-10 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
          placeholder={placeholder}
          autoComplete="off"
          disabled={loading}
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
        ) : (
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        )}
      </div>

      {/* Dropdown Menu */}
      {showDropdowns[field] && !loading && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={index}
                onClick={() => handleDropdownSelect(field, option)}
                className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
              >
                {option}
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
              No {label.toLowerCase()} found
            </div>
          )}
        </div>
      )}
    </div>
  );

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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Indent Processing</h1>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {hasActiveFilters && (
                    <span className="px-1.5 py-0.5 text-xs font-semibold text-white bg-red-800 rounded-full">
                      ●
                    </span>
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
                  disabled={loading}
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
                  disabled={loading}
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

        {/* Compact Filters Section */}
        {showFilters && (
          <div className="flex-shrink-0 px-4 lg:px-6 py-4 bg-gray-50">
            <div className="max-w-full mx-auto">
              <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Quick Filters</h3>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {/* TR Type Dropdown Filter */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">
                      TR Type
                    </label>
                    <div className="relative">
                      <select
                        value={filters.trType}
                        onChange={(e) => setFilters({ ...filters, trType: e.target.value })}
                        className="py-1.5 px-2 w-full text-xs rounded border border-gray-300 focus:ring-1 focus:ring-red-800 focus:border-transparent disabled:opacity-50 appearance-none bg-white"
                        disabled={loading}
                      >
                        <option value="">All TR Types</option>
                        {uniqueTrTypes.map((trType) => (
                          <option key={trType} value={trType}>
                            {trType}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 w-3 h-3 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* RST No Text Filter */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">
                      RST No
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 w-3 h-3 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={filters.rstNo}
                        onChange={(e) => setFilters({ ...filters, rstNo: e.target.value })}
                        placeholder="Search RST..."
                        className="py-1.5 pr-2 pl-7 w-full text-xs rounded border border-gray-300 focus:ring-1 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        autoComplete="off"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Party Searchable Dropdown */}
                  <div className="space-y-1 relative">
                    <label className="block text-xs font-medium text-gray-600">
                      Party
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 w-3 h-3 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={showFilterDropdowns.party ? filterSearchTerms.party : filters.party}
                        onChange={(e) => handleFilterSearchChange('party', e.target.value)}
                        onFocus={() => handleFilterDropdownFocus('party')}
                        onBlur={() => handleFilterDropdownBlur('party')}
                        placeholder="Search party..."
                        className="py-1.5 pr-7 pl-7 w-full text-xs rounded border border-gray-300 focus:ring-1 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        autoComplete="off"
                        disabled={loading}
                      />
                      {filters.party ? (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleClearFilterField('party')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      ) : (
                        <ChevronDown className="absolute right-2 top-1/2 w-3 h-3 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                      )}
                    </div>
                    {showFilterDropdowns.party && !loading && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredPartyOptions.length > 0 ? (
                          filteredPartyOptions.map((option, index) => (
                            <div
                              key={index}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleFilterDropdownSelect('party', option);
                              }}
                              className="px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                            >
                              {option}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-1.5 text-xs text-gray-500">No party found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Place Searchable Dropdown */}
                  <div className="space-y-1 relative">
                    <label className="block text-xs font-medium text-gray-600">
                      Place
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 w-3 h-3 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={showFilterDropdowns.place ? filterSearchTerms.place : filters.place}
                        onChange={(e) => handleFilterSearchChange('place', e.target.value)}
                        onFocus={() => handleFilterDropdownFocus('place')}
                        onBlur={() => handleFilterDropdownBlur('place')}
                        placeholder="Search place..."
                        className="py-1.5 pr-7 pl-7 w-full text-xs rounded border border-gray-300 focus:ring-1 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        autoComplete="off"
                        disabled={loading}
                      />
                      {filters.place ? (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleClearFilterField('place')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      ) : (
                        <ChevronDown className="absolute right-2 top-1/2 w-3 h-3 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                      )}
                    </div>
                    {showFilterDropdowns.place && !loading && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredPlaceOptions.length > 0 ? (
                          filteredPlaceOptions.map((option, index) => (
                            <div
                              key={index}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleFilterDropdownSelect('place', option);
                              }}
                              className="px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                            >
                              {option}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-1.5 text-xs text-gray-500">No place found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Truck No Text Filter */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">
                      Truck No
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 w-3 h-3 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={filters.truckNo}
                        onChange={(e) => setFilters({ ...filters, truckNo: e.target.value })}
                        placeholder="Search truck..."
                        className="py-1.5 pr-2 pl-7 w-full text-xs rounded border border-gray-300 focus:ring-1 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        autoComplete="off"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Item Searchable Dropdown */}
                  <div className="space-y-1 relative">
                    <label className="block text-xs font-medium text-gray-600">
                      Item
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 w-3 h-3 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={showFilterDropdowns.item ? filterSearchTerms.item : filters.item}
                        onChange={(e) => handleFilterSearchChange('item', e.target.value)}
                        onFocus={() => handleFilterDropdownFocus('item')}
                        onBlur={() => handleFilterDropdownBlur('item')}
                        placeholder="Search item..."
                        className="py-1.5 pr-7 pl-7 w-full text-xs rounded border border-gray-300 focus:ring-1 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        autoComplete="off"
                        disabled={loading}
                      />
                      {filters.item ? (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleClearFilterField('item')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      ) : (
                        <ChevronDown className="absolute right-2 top-1/2 w-3 h-3 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                      )}
                    </div>
                    {showFilterDropdowns.item && !loading && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredItemOptions.length > 0 ? (
                          filteredItemOptions.map((option, index) => (
                            <div
                              key={index}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleFilterDropdownSelect('item', option);
                              }}
                              className="px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                            >
                              {option}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-1.5 text-xs text-gray-500">No item found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table Section */}
        <div className="flex-1 overflow-hidden px-4 lg:px-6 pb-4 lg:pb-6">
          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">

            {/* Pending Table */}
            {activeTab === "pending" && (
              <>
                {/* Desktop View */}
                <div className="hidden lg:flex lg:flex-col lg:h-full lg:overflow-hidden">
                  <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between px-6 py-3">
                      <div className="text-sm text-gray-600">
                        Showing <span className="font-semibold">{filteredPending.length}</span> pending indents
                      </div>
                      {hasActiveFilters && (
                        <div className="flex items-center gap-2 text-xs text-red-800">
                          <Filter className="w-3 h-3" />
                          <span>Filters Active</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <div className="min-w-full">
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Action</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">TR Type</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">RST No</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Plant Name</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Dispatcher Name</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Party</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Place</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Truck No</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Item</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Total Bag</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Bharti Size</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Total Qty</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Tare WT</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Net WT</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Gross WT</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Jute</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Plastic</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">TP No</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">TP WT</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredPending.length > 0 ? (
                            filteredPending.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                  <button
                                    onClick={() => handleProcessClick(item)}
                                    className="px-3 py-1.5 text-xs font-medium text-white rounded-md transition-all hover:opacity-90 disabled:opacity-50"
                                    style={{ backgroundColor: '#991b1b' }}
                                    disabled={loading}
                                  >
                                    Process
                                  </button>
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
                                <td className="px-3 py-2 text-sm text-gray-900 max-w-xs">
                                  <div className="break-words" title={item.remarks}>
                                    {item.remarks || '-'}
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="20" className="px-6 py-12 text-center text-gray-500">
                                <div className="flex flex-col gap-2 items-center">
                                  <Clock className="w-8 h-8 text-gray-400" />
                                  <span>No pending records found</span>
                                  {hasActiveFilters && (
                                    <button
                                      onClick={handleClearFilters}
                                      className="text-sm text-red-800 hover:text-red-900 mt-2"
                                      disabled={loading}
                                    >
                                      Clear filters to see all records
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Mobile View */}
                <div className="lg:hidden flex flex-col h-full overflow-hidden">
                  <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-2">
                    <div className="text-sm text-gray-600"><span className="font-semibold">{filteredPending.length}</span> pending records</div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    {filteredPending.length > 0 ? (
                      <div className="space-y-3">
                        {filteredPending.map((item) => (
                          <div key={item.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                              <div>
                                <p className="font-bold text-gray-900">{item.rstNo}</p>
                                <p className="text-xs text-gray-600">{item.trType} | {item.plantName || '-'}</p>
                              </div>
                              <button onClick={() => handleProcessClick(item)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900" disabled={loading}>Process</button>
                            </div>
                            <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-gray-500">Party:</span> <span className="font-medium">{item.party || '-'}</span></div>
                              <div><span className="text-gray-500">Place:</span> <span className="font-medium">{item.place || '-'}</span></div>
                              <div><span className="text-gray-500">Truck:</span> <span className="font-medium font-mono">{item.truckNo || '-'}</span></div>
                              <div><span className="text-gray-500">Item:</span> <span className="font-medium">{item.item || '-'}</span></div>
                              <div><span className="text-gray-500">Total Bag:</span> <span className="font-medium">{item.totalBag || '-'}</span></div>
                              <div><span className="text-gray-500">Total Qty:</span> <span className="font-medium">{item.totalQty || '-'}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 items-center justify-center py-12 text-gray-500">
                        <Clock className="w-8 h-8 text-gray-400" />
                        <span>No pending records found</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* History Table */}
            {activeTab === "history" && (
              <>
                {/* Desktop View */}
                <div className="hidden lg:flex lg:flex-col lg:h-full lg:overflow-hidden">
                  <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between px-6 py-3">
                      <div className="text-sm text-gray-600">
                        Showing <span className="font-semibold">{filteredHistory.length}</span> processed records
                      </div>
                      {hasActiveFilters && (
                        <div className="flex items-center gap-2 text-xs text-red-800">
                          <Filter className="w-3 h-3" />
                          <span>Filters Active</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <div className="min-w-full">
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Action</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">TR Type</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">RST No</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Plant Name</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Dispatcher Name</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Party</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Place</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Truck No</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Item</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Total Bag</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Bharti Size</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Total Qty</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Tare WT</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Net WT</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Gross WT</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Jute</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Plastic</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">TP No</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">TP WT</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Remarks</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Vehicle Reached</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredHistory.length > 0 ? (
                            filteredHistory.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                  <button
                                    onClick={() => handleHistoryEditClick(item)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-all hover:opacity-90 disabled:opacity-50"
                                    style={{ backgroundColor: '#991b1b' }}
                                    disabled={loading}
                                  >
                                    <Edit className="w-3 h-3" />
                                    Edit
                                  </button>
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
                                <td className="px-3 py-2 text-sm text-gray-900 max-w-xs">
                                  <div className="break-words" title={item.remarks}>
                                    {item.remarks || '-'}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.vehicleReached || '-'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="21" className="px-6 py-12 text-center text-gray-500">
                                <div className="flex flex-col gap-2 items-center">
                                  <CheckCircle className="w-8 h-8 text-gray-400" />
                                  <span>No processed records found</span>
                                  {hasActiveFilters && (
                                    <button
                                      onClick={handleClearFilters}
                                      className="text-sm text-red-800 hover:text-red-900 mt-2"
                                      disabled={loading}
                                    >
                                      Clear filters to see all records
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Mobile View */}
                <div className="lg:hidden flex flex-col h-full overflow-hidden">
                  <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-2">
                    <div className="text-sm text-gray-600"><span className="font-semibold">{filteredHistory.length}</span> processed records</div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    {filteredHistory.length > 0 ? (
                      <div className="space-y-3">
                        {filteredHistory.map((item) => (
                          <div key={item.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                              <div>
                                <p className="font-bold text-gray-900">{item.rstNo}</p>
                                <p className="text-xs text-gray-600">{item.trType} | {item.plantName || '-'}</p>
                              </div>
                              <button onClick={() => handleHistoryEditClick(item)} className="px-2 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900 flex items-center gap-1" disabled={loading}><Edit className="w-3 h-3" /> Edit</button>
                            </div>
                            <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-gray-500">Party:</span> <span className="font-medium">{item.party || '-'}</span></div>
                              <div><span className="text-gray-500">Place:</span> <span className="font-medium">{item.place || '-'}</span></div>
                              <div><span className="text-gray-500">Truck:</span> <span className="font-medium font-mono">{item.truckNo || '-'}</span></div>
                              <div><span className="text-gray-500">Item:</span> <span className="font-medium">{item.item || '-'}</span></div>
                              <div><span className="text-gray-500">Total Qty:</span> <span className="font-medium">{item.totalQty || '-'}</span></div>
                              <div><span className="text-gray-500">Reached:</span> <span className="font-medium text-green-700">{item.vehicleReached || '-'}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 items-center justify-center py-12 text-gray-500">
                        <CheckCircle className="w-8 h-8 text-gray-400" />
                        <span>No processed records found</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Process Modal */}
      {showProcessModal && selectedIndent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 flex justify-between items-center px-5 py-4 bg-gradient-to-r from-red-800 to-red-900">
              <div>
                <h3 className="text-lg font-bold text-white">Loading Point Action</h3>
                <p className="text-red-200 text-sm">{selectedIndent.rstNo} • {selectedIndent.trType}</p>
              </div>
              <button
                onClick={handleCancel}
                className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto">
              {/* Pre-filled Dispatch Details */}
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">RST Details</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Date</span>
                    <p className="text-xs font-medium text-gray-800 break-words">{formatDate(selectedIndent.date)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">TR Type</span>
                    <p className="text-xs font-medium text-gray-800 break-words">{selectedIndent.trType || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">RST No</span>
                    <p className="text-xs font-medium text-gray-800 break-words">{selectedIndent.rstNo || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Plant Name</span>
                    <p className="text-xs font-medium text-gray-800 break-words">{selectedIndent.plantName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Dispatcher Name</span>
                    <p className="text-xs font-medium text-gray-800 break-words">{selectedIndent.dispatcherName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Party</span>
                    <p className="text-xs font-medium text-gray-800 break-words">{selectedIndent.party || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Place</span>
                    <p className="text-xs font-medium text-gray-800 break-words">{selectedIndent.place || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Truck No</span>
                    <p className="text-xs font-medium text-gray-800 break-words">{selectedIndent.truckNo || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Item</span>
                    <p className="text-xs font-medium text-gray-800 break-words">{selectedIndent.item || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Total Bag</span>
                    <p className="text-xs font-medium text-gray-800">{selectedIndent.totalBag || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Bharti Size</span>
                    <p className="text-xs font-medium text-gray-800">{selectedIndent.bhartiSize || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Total Qty</span>
                    <p className="text-xs font-medium text-gray-800">{selectedIndent.totalQty || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Tare WT</span>
                    <p className="text-xs font-medium text-gray-800">{selectedIndent.tareWt || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Net WT</span>
                    <p className="text-xs font-medium text-gray-800">{selectedIndent.netWt || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Gross WT</span>
                    <p className="text-xs font-medium text-gray-800">{selectedIndent.grossWt || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Jute</span>
                    <p className="text-xs font-medium text-gray-800">{selectedIndent.jute || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Plastic</span>
                    <p className="text-xs font-medium text-gray-800">{selectedIndent.plastic || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">TP No</span>
                    <p className="text-xs font-medium text-gray-800">{selectedIndent.tpNo || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">TP WT</span>
                    <p className="text-xs font-medium text-gray-800">{selectedIndent.tpWt || '-'}</p>
                  </div>
                  <div className="col-span-2 md:col-span-4">
                    <span className="text-[10px] text-gray-400 uppercase">Remarks</span>
                    <p className="text-xs font-medium text-gray-800 break-words whitespace-pre-wrap">{selectedIndent.remarks || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Form with Vehicle Reached Dropdown */}
              <div className="p-5 space-y-4">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Vehicle Reached at Loading Point <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={processForm.vehicleReached}
                    onChange={(e) => setProcessForm({ ...processForm, vehicleReached: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <form onSubmit={handleProcessSubmit} className="flex-shrink-0">
              <div className="flex gap-3 justify-end px-5 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                  style={{ backgroundColor: '#991b1b' }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingIndent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Indent - {editingIndent.indentNo}
              </h3>
              <button
                onClick={handleEditCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Editable Indent Summary Section */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Edit Indent Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  {/* Plant Name */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Plant Name
                    </label>
                    <input
                      type="text"
                      name="plantName"
                      value={editForm.plantName || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter plant name"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </div>

                  {/* Office Dispatcher */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Office Dispatcher
                    </label>
                    <input
                      type="text"
                      name="officeDispatcher"
                      value={editForm.officeDispatcher || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter office dispatcher"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </div>

                  {/* Party Name */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Party Name
                    </label>
                    <input
                      type="text"
                      name="partyName"
                      value={editForm.partyName || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter party name"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </div>

                  {/* Vehicle No */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Vehicle No
                    </label>
                    <input
                      type="text"
                      name="vehicleNo"
                      value={editForm.vehicleNo || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter vehicle number"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </div>

                  {/* Commodity Type */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Commodity Type
                    </label>
                    <input
                      type="text"
                      name="commodityType"
                      value={editForm.commodityType || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter commodity type"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </div>

                  {/* No. of PKTS */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      No. of PKTS
                    </label>
                    <input
                      type="text"
                      name="noOfPkts"
                      value={editForm.noOfPkts || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter number of packets"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </div>

                  {/* Bharti Size */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Bharti Size
                    </label>
                    <input
                      type="text"
                      name="bhartiSize"
                      value={editForm.bhartiSize || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter bharti size"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </div>

                  {/* Total Quantity */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Total Quantity
                    </label>
                    <input
                      type="text"
                      name="totalQty"
                      value={editForm.totalQty || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter total quantity"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </div>

                  {/* Tare Weight */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Tare Weight
                    </label>
                    <input
                      type="text"
                      name="tyreWeight"
                      value={editForm.tyreWeight || ''}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter Tare Weight"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </div>

                  {/* Vehicle Reached */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Vehicle Reached at Loading Point
                    </label>
                    <select
                      name="vehicleReached"
                      value={editForm.vehicleReached}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      disabled={loading}
                    >
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  {/* Remarks */}
                  <div className="md:col-span-2">
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Remarks
                    </label>
                    <textarea
                      name="remarks"
                      value={editForm.remarks || ''}
                      onChange={handleEditInputChange}
                      rows="3"
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter remarks"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="flex gap-3 justify-end p-4 border-t border-gray-200 sticky bottom-0 bg-white mt-6">
                  <button
                    type="button"
                    onClick={handleEditCancel}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-sm font-medium text-white rounded-md transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#991b1b' }}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </span>
                    ) : (
                      'Update'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* History Edit Modal - Only Vehicle Reached is editable */}
      {showHistoryEditModal && selectedHistoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 bg-gradient-to-r from-red-800 to-red-900">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Record</h3>
                <p className="text-red-200 text-sm">{selectedHistoryItem.rstNo} • {selectedHistoryItem.trType}</p>
              </div>
              <button
                onClick={handleHistoryEditCancel}
                className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>

            {/* Record Details (Read-only) */}
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 overflow-y-auto flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Record Details</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">TR Type</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{selectedHistoryItem.trType || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">RST No</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{selectedHistoryItem.rstNo || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Plant Name</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{selectedHistoryItem.plantName || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Dispatcher</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{selectedHistoryItem.dispatcherName || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Party</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{selectedHistoryItem.party || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Place</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{selectedHistoryItem.place || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Truck No</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{selectedHistoryItem.truckNo || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Item</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{selectedHistoryItem.item || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Total Bag</span>
                  <p className="text-xs font-medium text-gray-800">{selectedHistoryItem.totalBag || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Bharti Size</span>
                  <p className="text-xs font-medium text-gray-800">{selectedHistoryItem.bhartiSize || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Total Qty</span>
                  <p className="text-xs font-medium text-gray-800">{selectedHistoryItem.totalQty || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Gross WT</span>
                  <p className="text-xs font-medium text-gray-800">{selectedHistoryItem.grossWt || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Tare WT</span>
                  <p className="text-xs font-medium text-gray-800">{selectedHistoryItem.tareWt || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Net WT</span>
                  <p className="text-xs font-medium text-gray-800">{selectedHistoryItem.netWt || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Jute</span>
                  <p className="text-xs font-medium text-gray-800">{selectedHistoryItem.jute || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Plastic</span>
                  <p className="text-xs font-medium text-gray-800">{selectedHistoryItem.plastic || '-'}</p>
                </div>
              </div>
              {selectedHistoryItem.remarks && (
                <div className="mt-3">
                  <span className="text-[10px] text-gray-400 uppercase">Remarks</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{selectedHistoryItem.remarks}</p>
                </div>
              )}
            </div>

            {/* Edit Form - Only Vehicle Reached is editable */}
            <form onSubmit={handleSaveHistoryEdit}>
              <div className="p-5 border-t border-gray-200">
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Vehicle Reached at Loading Point <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="vehicleReached"
                        value="Yes"
                        checked={historyEditForm.vehicleReached === "Yes"}
                        onChange={handleHistoryEditInputChange}
                        className="w-4 h-4 text-red-800 border-gray-300 focus:ring-red-800"
                        disabled={loading}
                      />
                      <span className="text-sm text-gray-700">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="vehicleReached"
                        value="No"
                        checked={historyEditForm.vehicleReached === "No"}
                        onChange={handleHistoryEditInputChange}
                        className="w-4 h-4 text-red-800 border-gray-300 focus:ring-red-800"
                        disabled={loading}
                      />
                      <span className="text-sm text-gray-700">No</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 justify-end px-5 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleHistoryEditCancel}
                  className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                  style={{ backgroundColor: '#991b1b' }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndentProcessingPage;