import React, { useState, useEffect } from "react";
import { Filter, X, Search, Clock, CheckCircle, ChevronDown, Loader2, Edit2 } from "lucide-react";
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const API_URL = import.meta.env.VITE_SHEET_API_URL;
const DISPATCH_SHEET = import.meta.env.VITE_SHEET_DISPATCH;
const RST_BASE_DATA_SHEET = import.meta.env.VITE_SHEET_RST_BASE_DATA;
const DROP_DOWN_SHEET = import.meta.env.VITE_SHEET_DROP_NAME;

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

const IndentPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("pending");
  const [showFilters, setShowFilters] = useState(false);
  const [showIndentModal, setShowIndentModal] = useState(false);
  const [selectedRst, setSelectedRst] = useState(null);
  const [loading, setLoading] = useState(false);

  // State for edit history modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [editForm, setEditForm] = useState({
    plantName: "",
    dispatcherName: "",
    bhartiSize: "",
    totalQty: "",
    remarks: ""
  });

  // State for edit form dropdowns
  const [editSearchTerms, setEditSearchTerms] = useState({
    plantName: "",
    dispatcherName: "",
  });

  const [showEditDropdowns, setShowEditDropdowns] = useState({
    plantName: false,
    dispatcherName: false,
  });

  const [pendingIndents, setPendingIndents] = useState([]);
  const [historyIndents, setHistoryIndents] = useState([]);
  const [filteredPending, setFilteredPending] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);

  const [dropdownOptions, setDropdownOptions] = useState({
    plantName: [],
    dispatcherName: []
  });

  const [filters, setFilters] = useState({
    trType: "",
    rstNo: "",
    party: "",
    place: "",
    truckNo: "",
    item: "",
  });

  const [indentForm, setIndentForm] = useState({
    plantName: "",
    dispatcherName: "",
    bhartiSize: "",
    totalQty: "",
    remarks: ""
  });

  // State for searchable dropdowns (for indent form)
  const [searchTerms, setSearchTerms] = useState({
    plantName: "",
    dispatcherName: "",
  });

  const [showDropdowns, setShowDropdowns] = useState({
    plantName: false,
    dispatcherName: false,
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

  // Fetch dropdown options from Google Sheets
  const fetchDropdownOptions = async () => {
    try {
      const response = await fetch(
        `${API_URL}?sheet=${DROP_DOWN_SHEET}&action=getData`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dropdown data');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const sheetData = data.data;

        // Get Plant Names from column A (A2:A)
        const plantNames = [];
        for (let i = 1; i < sheetData.length; i++) {
          if (sheetData[i][0]) {
            plantNames.push(sheetData[i][0].trim());
          }
        }

        // Get Dispatcher Names from column B (B2:B)
        const dispatcherNames = [];
        for (let i = 1; i < sheetData.length; i++) {
          if (sheetData[i][1]) {
            dispatcherNames.push(sheetData[i][1].trim());
          }
        }

        setDropdownOptions({
          plantName: [...new Set(plantNames)],
          dispatcherName: [...new Set(dispatcherNames)]
        });
      }
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      showToast('Failed to load dropdown options. Please refresh the page.', 'error');
    }
  };

  // Fetch pending indents from RST Base Data sheet
  const fetchPendingIndents = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}?sheet=${RST_BASE_DATA_SHEET}&action=getData`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch RST Base Data');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const sheetData = data.data;
        const pendingData = [];

        // Start from row 7 (index 6) as per specification
        for (let i = 6; i < sheetData.length; i++) {
          const row = sheetData[i];

          // Check conditions: Column P (index 15) NOT null AND Column Q (index 16) NULL
          const hasColumnP = row[15] && row[15].toString().trim() !== '';
          const hasColumnQ = row[16] && row[16].toString().trim() !== '';

          if (hasColumnP && !hasColumnQ) {
            const indent = {
              id: i + 1,
              rowIndex: i + 1,
              date: row[0] || '',           // Column A
              trType: row[1] || '',          // Column B
              rstNo: row[2] || '',           // Column C
              party: row[3] || '',           // Column D
              place: row[4] || '',           // Column E
              truckNo: row[5] || '',         // Column F
              item: row[6] || '',            // Column G
              grossWt: row[7] || '',         // Column H
              tareWt: row[8] || '',          // Column I
              netWt: row[9] || '',           // Column J
              jute: row[10] || '',           // Column K
              plastic: row[11] || '',        // Column L
              totalBag: row[12] || '',       // Column M
              tpNo: row[13] || '',           // Column N
              tpWt: row[14] || '',           // Column O
            };
            pendingData.push(indent);
          }
        }

        // Reverse data to show latest first
        pendingData.reverse();

        setPendingIndents(pendingData);
        setFilteredPending(pendingData);
      }
    } catch (error) {
      console.error('Error fetching pending indents:', error);
      showToast('Failed to load pending indents. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch history from Dispatch sheet
  const fetchHistoryIndents = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}?sheet=${DISPATCH_SHEET}&action=getData`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dispatch data');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const sheetData = data.data;
        const historyData = [];

        // Start from row 7 (index 6) as per specification
        for (let i = 6; i < sheetData.length; i++) {
          const row = sheetData[i];

          // Check if row has data (at least column B)
          if (row[1]) {
            const indent = {
              id: i + 1,
              rowIndex: i + 1,
              timestamp: row[0] || '',        // Column A
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
            };
            historyData.push(indent);
          }
        }

        // Reverse data to show latest first
        historyData.reverse();

        setHistoryIndents(historyData);
        setFilteredHistory(historyData);
      }
    } catch (error) {
      console.error('Error fetching history indents:', error);
      showToast('Failed to load history. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchDropdownOptions();
    fetchPendingIndents();
    fetchHistoryIndents();
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
        const filterValue = filters[key].toLowerCase().trim();

        // Use substring match for truckNo, exact match for others
        const matchFunction = key === 'truckNo'
          ? (itemValue) => String(itemValue).toLowerCase().includes(filterValue)
          : (itemValue) => String(itemValue).toLowerCase().trim() === filterValue;

        filteredPendingData = filteredPendingData.filter((item) => {
          const itemValue = item[key];
          if (itemValue === null || itemValue === undefined) return false;
          return matchFunction(itemValue);
        });
        filteredHistoryData = filteredHistoryData.filter((item) => {
          const itemValue = item[key];
          if (itemValue === null || itemValue === undefined) return false;
          return matchFunction(itemValue);
        });
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

  const handleIndentClick = (rst) => {
    setSelectedRst(rst);
    setIndentForm({
      plantName: "",
      dispatcherName: "",
      bhartiSize: "",
      totalQty: "",
      remarks: ""
    });
    setSearchTerms({
      plantName: "",
      dispatcherName: "",
    });
    setShowDropdowns({
      plantName: false,
      dispatcherName: false,
    });
    setShowIndentModal(true);
  };

  // Generic handler for dropdown selection
  const handleDropdownSelect = (field, value) => {
    setIndentForm((prev) => ({
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

  // Handler for regular input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setIndentForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Save indent to Dispatch sheet
  const handleSaveIndent = async (e) => {
    e.preventDefault();

    if (!indentForm.plantName || !indentForm.dispatcherName) {
      showToast('Please select Plant Name and Dispatcher Name', 'error');
      return;
    }

    try {
      setLoading(true);

      // Generate timestamp in YYYY-MM-DD HH:mm:ss format
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // Prepare row data for Dispatch sheet
      const rowData = [
        timestamp,                      // Column A - Timestamp
        selectedRst.trType,             // Column B - TR Type
        selectedRst.rstNo,              // Column C - RST No
        indentForm.plantName,           // Column D - Plant Name
        indentForm.dispatcherName,      // Column E - Dispatcher Name
        selectedRst.party,              // Column F - Party
        selectedRst.place,              // Column G - Place
        selectedRst.truckNo,            // Column H - Truck No
        selectedRst.item,               // Column I - Item
        selectedRst.totalBag,           // Column J - Total Bag
        indentForm.bhartiSize,          // Column K - Bharti Size
        indentForm.totalQty,            // Column L - Total Qty
        selectedRst.tareWt,             // Column M - Tare WT
        selectedRst.netWt,              // Column N - Net WT
        selectedRst.grossWt,            // Column O - Gross WT
        selectedRst.jute,               // Column P - Jute
        selectedRst.plastic,            // Column Q - Plastic
        selectedRst.tpNo,               // Column R - TP No
        selectedRst.tpWt,               // Column S - TP WT
        indentForm.remarks,             // Column T - Remarks
      ];

      const response = await fetch(API_URL, {
        method: 'POST',
        body: new URLSearchParams({
          action: 'insert',
          sheetName: DISPATCH_SHEET,
          rowData: JSON.stringify(rowData)
        })
      });

      const result = await response.json();

      if (result.success) {
        showToast('Indent saved successfully!', 'success');

        // Update RST Base Data sheet column Q to mark as processed
        const updateResponse = await fetch(API_URL, {
          method: 'POST',
          body: new URLSearchParams({
            action: 'updateCell',
            sheetName: RST_BASE_DATA_SHEET,
            rowIndex: selectedRst.rowIndex,
            colIndex: 17, // Column Q (0-indexed = 16, but API might be 1-indexed)
            value: timestamp
          })
        });

        // Reset form and close modal
        setIndentForm({
          plantName: "",
          dispatcherName: "",
          bhartiSize: "",
          totalQty: "",
          remarks: ""
        });
        setSelectedRst(null);
        setShowIndentModal(false);

        // Refresh data
        await fetchPendingIndents();
        await fetchHistoryIndents();
      } else {
        throw new Error(result.error || 'Failed to save indent');
      }
    } catch (error) {
      console.error('Error saving indent:', error);
      showToast(`Error saving indent: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowIndentModal(false);
    setSelectedRst(null);
    setIndentForm({
      plantName: "",
      dispatcherName: "",
      bhartiSize: "",
      totalQty: "",
      remarks: ""
    });
    setSearchTerms({
      plantName: "",
      dispatcherName: "",
    });
    setShowDropdowns({
      plantName: false,
      dispatcherName: false,
    });
  };

  // ==================== EDIT HISTORY HANDLERS ====================

  // Handle edit button click on history item
  const handleEditClick = (item) => {
    setSelectedHistoryItem(item);
    setEditForm({
      plantName: item.plantName || "",
      dispatcherName: item.dispatcherName || "",
      bhartiSize: item.bhartiSize || "",
      totalQty: item.totalQty || "",
      remarks: item.remarks || ""
    });
    setEditSearchTerms({
      plantName: "",
      dispatcherName: "",
    });
    setShowEditDropdowns({
      plantName: false,
      dispatcherName: false,
    });
    setShowEditModal(true);
  };

  // Generic handler for edit dropdown selection
  const handleEditDropdownSelect = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setEditSearchTerms((prev) => ({
      ...prev,
      [field]: "",
    }));
    setShowEditDropdowns((prev) => ({
      ...prev,
      [field]: false,
    }));
  };

  // Handler for edit search input changes
  const handleEditSearchChange = (field, value) => {
    setEditSearchTerms((prev) => ({
      ...prev,
      [field]: value,
    }));
    setShowEditDropdowns((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  // Handler for edit dropdown focus
  const handleEditDropdownFocus = (field) => {
    setShowEditDropdowns((prev) => ({
      ...prev,
      [field]: true,
    }));
    setEditSearchTerms((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  // Handler for edit dropdown blur
  const handleEditDropdownBlur = (field) => {
    setTimeout(() => {
      setShowEditDropdowns((prev) => ({
        ...prev,
        [field]: false,
      }));
    }, 200);
  };

  // Handler for edit regular input changes
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Save edited history item to Dispatch sheet
  const handleSaveEdit = async (e) => {
    e.preventDefault();

    if (!editForm.plantName || !editForm.dispatcherName) {
      showToast('Please select Plant Name and Dispatcher Name', 'error');
      return;
    }

    try {
      setLoading(true);

      // Generate new timestamp in YYYY-MM-DD HH:mm:ss format
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // Update row in Dispatch sheet
      // Update Column A (Timestamp), D (Plant Name), E (Dispatcher Name), K (Bharti Size), L (Total Qty), T (Remarks)
      // Using 1-indexed column numbers: A=1, B=2, C=3, D=4, E=5, ..., K=11, L=12, ..., T=20
      const updates = [
        { columnIndex: 1, value: timestamp },              // Column A - Timestamp
        { columnIndex: 4, value: editForm.plantName },     // Column D - Plant Name
        { columnIndex: 5, value: editForm.dispatcherName }, // Column E - Dispatcher Name
        { columnIndex: 11, value: editForm.bhartiSize },   // Column K - Bharti Size
        { columnIndex: 12, value: editForm.totalQty },     // Column L - Total Qty
        { columnIndex: 20, value: editForm.remarks },      // Column T - Remarks
      ];

      // Execute updates sequentially
      for (const update of updates) {
        const response = await fetch(API_URL, {
          method: 'POST',
          body: new URLSearchParams({
            action: 'updateCell',
            sheetName: DISPATCH_SHEET,
            rowIndex: selectedHistoryItem.rowIndex,
            columnIndex: update.columnIndex,
            value: update.value
          })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to update record');
        }
      }

      showToast('Record updated successfully!', 'success');

      // Reset form and close modal
      setEditForm({
        plantName: "",
        dispatcherName: "",
        bhartiSize: "",
        totalQty: "",
        remarks: ""
      });
      setSelectedHistoryItem(null);
      setShowEditModal(false);

      // Refresh history data
      await fetchHistoryIndents();
    } catch (error) {
      console.error('Error updating record:', error);
      showToast(`Error updating record: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel edit modal
  const handleEditCancel = () => {
    setShowEditModal(false);
    setSelectedHistoryItem(null);
    setEditForm({
      plantName: "",
      dispatcherName: "",
      bhartiSize: "",
      totalQty: "",
      remarks: ""
    });
    setEditSearchTerms({
      plantName: "",
      dispatcherName: "",
    });
    setShowEditDropdowns({
      plantName: false,
      dispatcherName: false,
    });
  };

  // Filter options for edit form dropdowns
  const filteredPlantsForEdit = dropdownOptions.plantName.filter(plant =>
    plant.toLowerCase().includes(editSearchTerms.plantName.toLowerCase())
  );

  const filteredDispatchersForEdit = dropdownOptions.dispatcherName.filter(dispatcher =>
    dispatcher.toLowerCase().includes(editSearchTerms.dispatcherName.toLowerCase())
  );

  // ==================== END EDIT HISTORY HANDLERS ====================

  // Check if any filter is active
  const hasActiveFilters = Object.values(filters).some(value => value !== "");

  // Filter options based on search
  const filteredPlants = dropdownOptions.plantName.filter(plant =>
    plant.toLowerCase().includes(searchTerms.plantName.toLowerCase())
  );

  const filteredDispatchers = dropdownOptions.dispatcherName.filter(dispatcher =>
    dispatcher.toLowerCase().includes(searchTerms.dispatcherName.toLowerCase())
  );

  // Pending table columns
  const pendingTableColumns = [
    { key: 'date', label: 'Date' },
    { key: 'trType', label: 'TR Type' },
    { key: 'rstNo', label: 'RST No' },
    { key: 'party', label: 'Party' },
    { key: 'place', label: 'Place' },
    { key: 'truckNo', label: 'Truck No' },
    { key: 'item', label: 'Item' },
    { key: 'grossWt', label: 'Gross WT' },
    { key: 'tareWt', label: 'Tare WT' },
    { key: 'netWt', label: 'Net WT' },
    { key: 'jute', label: 'Jute' },
    { key: 'plastic', label: 'Plastic' },
    { key: 'totalBag', label: 'Total Bag' },
    { key: 'tpNo', label: 'TP No' },
    { key: 'tpWt', label: 'TP WT' },
  ];

  // History table columns
  const historyTableColumns = [
    { key: 'trType', label: 'TR Type' },
    { key: 'rstNo', label: 'RST No' },
    { key: 'plantName', label: 'Plant Name' },
    { key: 'dispatcherName', label: 'Dispatcher Name' },
    { key: 'party', label: 'Party' },
    { key: 'place', label: 'Place' },
    { key: 'truckNo', label: 'Truck No' },
    { key: 'item', label: 'Item' },
    { key: 'totalBag', label: 'Total Bag' },
    { key: 'bhartiSize', label: 'Bharti Size' },
    { key: 'totalQty', label: 'Total Qty' },
    { key: 'tareWt', label: 'Tare WT' },
    { key: 'netWt', label: 'Net WT' },
    { key: 'grossWt', label: 'Gross WT' },
    { key: 'jute', label: 'Jute' },
    { key: 'plastic', label: 'Plastic' },
    { key: 'tpNo', label: 'TP No' },
    { key: 'tpWt', label: 'TP WT' },
    { key: 'remarks', label: 'Remarks' },
  ];

  // Filter columns for quick filters (text inputs only)
  const filterColumns = [
    { key: 'rstNo', label: 'RST No', placeholder: 'Search RST...' },
    { key: 'truckNo', label: 'Truck No', placeholder: 'Search truck...' },
  ];

  // Get unique TR Types from current tab's data only
  const currentTabData = activeTab === 'pending' ? pendingIndents : historyIndents;

  const uniqueTrTypes = [...new Set(
    currentTabData.map(item => item.trType)
  )].filter(Boolean).sort();

  // Get unique Party, Place, Item from current tab's data only
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
    setFilters(prev => ({ ...prev, [field]: "" })); // Clear filter when user starts typing
    setShowFilterDropdowns(prev => ({ ...prev, [field]: true }));
  };

  const handleFilterDropdownFocus = (field) => {
    setShowFilterDropdowns(prev => ({ ...prev, [field]: true }));
    setFilterSearchTerms(prev => ({ ...prev, [field]: "" }));
  };

  const handleFilterDropdownBlur = (field) => {
    setTimeout(() => {
      setShowFilterDropdowns(prev => ({ ...prev, [field]: false }));
    }, 200);
  };

  const handleClearFilterField = (field) => {
    setFilters(prev => ({ ...prev, [field]: "" }));
    setFilterSearchTerms(prev => ({ ...prev, [field]: "" }));
  };

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

  // Render searchable dropdown component
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleDropdownSelect(field, option);
                }}
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Indent Management</h1>
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
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                              Action
                            </th>
                            {pendingTableColumns.map(({ key, label }) => (
                              <th key={key} className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredPending.length > 0 ? (
                            filteredPending.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                  <button
                                    onClick={() => handleIndentClick(item)}
                                    className="px-3 py-1.5 text-xs font-medium text-white rounded-md transition-all hover:opacity-90 disabled:opacity-50"
                                    style={{ backgroundColor: '#991b1b' }}
                                    disabled={loading}
                                  >
                                    Indent
                                  </button>
                                </td>
                                {pendingTableColumns.map(({ key }) => (
                                  <td key={key} className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                                    {key === 'date' ? formatDate(item[key]) : (item[key] || '-')}
                                  </td>
                                ))}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={pendingTableColumns.length + 1} className="px-6 py-12 text-center text-gray-500">
                                <div className="flex flex-col gap-2 items-center">
                                  <Clock className="w-8 h-8 text-gray-400" />
                                  <span>No pending indent records found</span>
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
                                <p className="text-xs text-gray-600">{item.trType} | {formatDate(item.date).split(' ')[0]}</p>
                              </div>
                              <button onClick={() => handleIndentClick(item)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900" disabled={loading}>Indent</button>
                            </div>
                            <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-gray-500">Party:</span> <span className="font-medium">{item.party || '-'}</span></div>
                              <div><span className="text-gray-500">Place:</span> <span className="font-medium">{item.place || '-'}</span></div>
                              <div><span className="text-gray-500">Truck:</span> <span className="font-medium font-mono">{item.truckNo || '-'}</span></div>
                              <div><span className="text-gray-500">Item:</span> <span className="font-medium">{item.item || '-'}</span></div>
                              <div><span className="text-gray-500">Total Bag:</span> <span className="font-medium">{item.totalBag || '-'}</span></div>
                              <div><span className="text-gray-500">Net WT:</span> <span className="font-medium">{item.netWt || '-'}</span></div>
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
                        Showing <span className="font-semibold">{filteredHistory.length}</span> completed indents
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
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                              Action
                            </th>
                            {historyTableColumns.map(({ key, label }) => (
                              <th key={key} className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredHistory.length > 0 ? (
                            filteredHistory.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                  <button
                                    onClick={() => handleEditClick(item)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-all hover:opacity-90 disabled:opacity-50"
                                    style={{ backgroundColor: '#991b1b' }}
                                    disabled={loading}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    Edit
                                  </button>
                                </td>
                                {historyTableColumns.map(({ key }) => (
                                  <td key={key} className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                                    {item[key] || '-'}
                                  </td>
                                ))}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={historyTableColumns.length + 1} className="px-6 py-12 text-center text-gray-500">
                                <div className="flex flex-col gap-2 items-center">
                                  <CheckCircle className="w-8 h-8 text-gray-400" />
                                  <span>No completed indent records found</span>
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
                    <div className="text-sm text-gray-600"><span className="font-semibold">{filteredHistory.length}</span> completed records</div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    {filteredHistory.length > 0 ? (
                      <div className="space-y-3">
                        {filteredHistory.map((item) => (
                          <div key={item.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                              <div>
                                <p className="font-bold text-gray-900">{item.rstNo}</p>
                                <p className="text-xs text-gray-600">{item.trType}</p>
                              </div>
                              <button onClick={() => handleEditClick(item)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md">
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-gray-500">Plant:</span> <span className="font-medium">{item.plantName || '-'}</span></div>
                              <div><span className="text-gray-500">Party:</span> <span className="font-medium">{item.party || '-'}</span></div>
                              <div><span className="text-gray-500">Truck:</span> <span className="font-medium font-mono">{item.truckNo || '-'}</span></div>
                              <div><span className="text-gray-500">Total Bag:</span> <span className="font-medium">{item.totalBag || '-'}</span></div>
                              <div><span className="text-gray-500">Total Qty:</span> <span className="font-medium">{item.totalQty || '-'}</span></div>
                              <div><span className="text-gray-500">Net WT:</span> <span className="font-medium">{item.netWt || '-'}</span></div>
                            </div>
                            {item.remarks && (
                              <div className="px-3 pb-3 pt-0 text-xs">
                                <span className="text-gray-500">Remarks:</span> <span className="text-gray-700">{item.remarks}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 items-center justify-center py-12 text-gray-500">
                        <CheckCircle className="w-8 h-8 text-gray-400" />
                        <span>No completed records found</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Indent Modal */}
      {showIndentModal && selectedRst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 bg-gradient-to-r from-red-800 to-red-900">
              <div>
                <h3 className="text-lg font-bold text-white">Create Indent</h3>
                <p className="text-red-200 text-sm">{selectedRst.rstNo} • {selectedRst.trType}</p>
              </div>
              <button
                onClick={handleCancel}
                className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>


            {/* RST Details Summary */}
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">RST Details</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Date</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{formatDate(selectedRst.date)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">TR Type</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{selectedRst.trType || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">RST No</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{selectedRst.rstNo || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Party</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{selectedRst.party || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Place</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{selectedRst.place || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Truck No</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{selectedRst.truckNo || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Item</span>
                  <p className="text-xs font-medium text-gray-800 break-words">{selectedRst.item || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Total Bag</span>
                  <p className="text-xs font-medium text-gray-800">{selectedRst.totalBag || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Gross WT</span>
                  <p className="text-xs font-medium text-gray-800">{selectedRst.grossWt || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Tare WT</span>
                  <p className="text-xs font-medium text-gray-800">{selectedRst.tareWt || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Net WT</span>
                  <p className="text-xs font-medium text-gray-800">{selectedRst.netWt || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Jute</span>
                  <p className="text-xs font-medium text-gray-800">{selectedRst.jute || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Plastic</span>
                  <p className="text-xs font-medium text-gray-800">{selectedRst.plastic || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">TP No</span>
                  <p className="text-xs font-medium text-gray-800">{selectedRst.tpNo || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">TP WT</span>
                  <p className="text-xs font-medium text-gray-800">{selectedRst.tpWt || '-'}</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveIndent}>
              <div className="p-5 space-y-4">
                {/* Plant & Dispatcher Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Plant Name Dropdown */}
                  <div className="relative">
                    <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Plant Name <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={showDropdowns.plantName ? searchTerms.plantName : indentForm.plantName}
                        onChange={(e) => handleSearchChange('plantName', e.target.value)}
                        onFocus={() => handleDropdownFocus('plantName')}
                        onBlur={() => handleDropdownBlur('plantName')}
                        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:border-transparent"
                        placeholder="Select plant..."
                        autoComplete="off"
                        disabled={loading}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                    {showDropdowns.plantName && !loading && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredPlants.length > 0 ? (
                          filteredPlants.map((option, index) => (
                            <div
                              key={index}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleDropdownSelect('plantName', option);
                              }}
                              className="px-3 py-2 text-sm cursor-pointer hover:bg-red-50 hover:text-red-800"
                            >
                              {option}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">No plants found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dispatcher Name Dropdown */}
                  <div className="relative">
                    <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Dispatcher Name <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={showDropdowns.dispatcherName ? searchTerms.dispatcherName : indentForm.dispatcherName}
                        onChange={(e) => handleSearchChange('dispatcherName', e.target.value)}
                        onFocus={() => handleDropdownFocus('dispatcherName')}
                        onBlur={() => handleDropdownBlur('dispatcherName')}
                        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:border-transparent"
                        placeholder="Select dispatcher..."
                        autoComplete="off"
                        disabled={loading}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                    {showDropdowns.dispatcherName && !loading && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredDispatchers.length > 0 ? (
                          filteredDispatchers.map((option, index) => (
                            <div
                              key={index}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleDropdownSelect('dispatcherName', option);
                              }}
                              className="px-3 py-2 text-sm cursor-pointer hover:bg-red-50 hover:text-red-800"
                            >
                              {option}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">No dispatchers found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bharti Size & Total Qty Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Bharti Size
                    </label>
                    <input
                      type="text"
                      name="bhartiSize"
                      value={indentForm.bhartiSize}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:border-transparent"
                      placeholder="Enter size"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Total Qty
                    </label>
                    <input
                      type="text"
                      name="totalQty"
                      value={indentForm.totalQty}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:border-transparent"
                      placeholder="Enter quantity"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Remarks
                  </label>
                  <textarea
                    name="remarks"
                    value={indentForm.remarks}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:border-transparent resize-none"
                    placeholder="Enter remarks (optional)"
                    autoComplete="off"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Footer */}
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
                    'Save Indent'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit History Modal */}
      {showEditModal && selectedHistoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 bg-gradient-to-r from-red-800 to-red-900">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Indent</h3>
                <p className="text-red-200 text-sm">{selectedHistoryItem.rstNo} • {selectedHistoryItem.trType}</p>
              </div>
              <button
                onClick={handleEditCancel}
                className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>

            {/* Item Details Summary */}
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Record Details</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              </div>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveEdit}>
              <div className="p-5 space-y-4">
                {/* Plant & Dispatcher Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Plant Name Dropdown */}
                  <div className="relative">
                    <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Plant Name <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={showEditDropdowns.plantName ? editSearchTerms.plantName : editForm.plantName}
                        onChange={(e) => handleEditSearchChange('plantName', e.target.value)}
                        onFocus={() => handleEditDropdownFocus('plantName')}
                        onBlur={() => handleEditDropdownBlur('plantName')}
                        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:border-transparent"
                        placeholder="Select plant..."
                        autoComplete="off"
                        disabled={loading}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                    {showEditDropdowns.plantName && !loading && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredPlantsForEdit.length > 0 ? (
                          filteredPlantsForEdit.map((option, index) => (
                            <div
                              key={index}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleEditDropdownSelect('plantName', option);
                              }}
                              className="px-3 py-2 text-sm cursor-pointer hover:bg-red-50 hover:text-red-800"
                            >
                              {option}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">No plants found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dispatcher Name Dropdown */}
                  <div className="relative">
                    <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Dispatcher Name <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={showEditDropdowns.dispatcherName ? editSearchTerms.dispatcherName : editForm.dispatcherName}
                        onChange={(e) => handleEditSearchChange('dispatcherName', e.target.value)}
                        onFocus={() => handleEditDropdownFocus('dispatcherName')}
                        onBlur={() => handleEditDropdownBlur('dispatcherName')}
                        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:border-transparent"
                        placeholder="Select dispatcher..."
                        autoComplete="off"
                        disabled={loading}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                    {showEditDropdowns.dispatcherName && !loading && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredDispatchersForEdit.length > 0 ? (
                          filteredDispatchersForEdit.map((option, index) => (
                            <div
                              key={index}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleEditDropdownSelect('dispatcherName', option);
                              }}
                              className="px-3 py-2 text-sm cursor-pointer hover:bg-red-50 hover:text-red-800"
                            >
                              {option}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">No dispatchers found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bharti Size & Total Qty Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Bharti Size
                    </label>
                    <input
                      type="text"
                      name="bhartiSize"
                      value={editForm.bhartiSize}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:border-transparent"
                      placeholder="Enter size"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Total Qty
                    </label>
                    <input
                      type="text"
                      name="totalQty"
                      value={editForm.totalQty}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:border-transparent"
                      placeholder="Enter quantity"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Remarks
                  </label>
                  <textarea
                    name="remarks"
                    value={editForm.remarks}
                    onChange={handleEditInputChange}
                    rows="2"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 focus:border-transparent resize-none"
                    placeholder="Enter remarks (optional)"
                    autoComplete="off"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 justify-end px-5 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleEditCancel}
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

export default IndentPage;