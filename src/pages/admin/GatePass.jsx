import React, { useState, useEffect, useRef } from "react";
import { Filter, X, Search, Edit, CheckCircle, Clock, ChevronDown, Loader2, Eye, FileText, Truck, Calendar } from "lucide-react";
import { useToast } from '../../contexts/ToastContext';

const API_URL = import.meta.env.VITE_SHEET_API_URL;
const SHEET_ID = import.meta.env.VITE_SHEET_ID;
const DROP_DOWN_SHEET = import.meta.env.VITE_SHEET_DROP_NAME;
const DISPATCH_SHEET = import.meta.env.VITE_SHEET_DISPATCH;
const LOADING_COMPLETE_SHEET = import.meta.env.VITE_SHEET_LOADINGCOMPLETE;
const GATE_PASS_SHEET = import.meta.env.VITE_SHEET_GATEPASS;


const GatePass = () => {
  const { showToast } = useToast();
  const [showImageModal, setShowImageModal] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [showFilters, setShowFilters] = useState(false);
  const [showGatePassModal, setShowGatePassModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [editingIndent, setEditingIndent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [dropdownOptions, setDropdownOptions] = useState({
    plantName: [],
    officeDispatcher: [],
    commodityType: [],
    munsiName: [],
    subCommodity: [],
    kmsYear: [],
    firmName: []
  });

  const [filters, setFilters] = useState({
    plantName: "",
    officeDispatcher: "",
    partyName: "",
    vehicleNo: "",
    commodityType: "",
    indentNo: "",
  });

  const [gatePassForm, setGatePassForm] = useState({
    indentNo: "",
    plantName: "",
    officeDispatcher: "",
    partyName: "",
    vehicleNo: "",
    commodityType: "",
    tareWeight: "",
    loadingBhartiSize: "",
    loadingQuantity: "",
    loadingPacketType: "",
    loadingPacketName: "",
    vehicleImage: "",
    munsiName: "",
    loadingWeight: "",
    netWeight: "",
    gatePassType: "Civil Supply",
    gatePassNumber: "",
    date: "",
    vehicleNumber: "",
    vehicleType: "",
    transporterName: "",
    advanceGiven: "",
    freightPerQty: "",
    pumpName: "",
    dieselGiven: "",
    subCommodity1: "",
    noOfPkts1: "",
    subCommodity2: "",
    noOfPkts2: "",
    subCommodity3: "",
    noOfPkts3: "",
    totalPacket: 0,
    netWeightQuintal: 0,
    // Civil Supply Fields
    cmrNumber: "",
    lotNumber: "",
    driverName: "",
    driverNumber: "",
    kmsYear: "",
    firmName: "",
    // Normal Gate Pass Fields
    rate: "",
    billDetails: "",
    billWeight: "",
    invoiceNumber: "",
    invoiceValue: ""
  });

  const [editForm, setEditForm] = useState({
    loadingWeight: "",
    netWeight: "",
    gatePassType: "Civil Supply",
    gatePassNumber: "",
    date: "",
    vehicleNumber: "",
    vehicleType: "",
    transporterName: "",
    advanceGiven: "",
    freightPerQty: "",
    pumpName: "",
    dieselGiven: "",
    subCommodity1: "",
    noOfPkts1: "",
    subCommodity2: "",
    noOfPkts2: "",
    subCommodity3: "",
    noOfPkts3: "",
    totalPacket: 0,
    netWeightQuintal: 0,
    // Civil Supply Fields
    cmrNumber: "",
    lotNumber: "",
    driverName: "",
    driverNumber: "",
    kmsYear: "",
    firmName: "",
    // Normal Gate Pass Fields
    rate: "",
    billDetails: "",
    billWeight: "",
    invoiceNumber: "",
    invoiceValue: ""
  });

  const [pendingIndents, setPendingIndents] = useState([]);
  const [historyIndents, setHistoryIndents] = useState([]);
  const [filteredPending, setFilteredPending] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);

  // Format date to DD/MM/YYYY HH:MM:SS
  const formatDateTime = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  // Format date to YYYY-MM-DDTHH:MM for datetime-local input
  const formatDateTimeForInput = (dateString) => {
    if (!dateString) return "";

    const dateStr = String(dateString); // Convert to string to be safe
    // Check if date is already in DD/MM/YYYY HH:MM:SS format
    if (dateStr.includes('/')) {
      const parts = dateStr.split(' ');
      const dateParts = parts[0].split('/');
      const timeParts = parts[1] ? parts[1].split(':') : ['00', '00', '00'];

      const day = dateParts[0].padStart(2, '0');
      const month = dateParts[1].padStart(2, '0');
      const year = dateParts[2];
      const hours = timeParts[0].padStart(2, '0');
      const minutes = timeParts[1] ? timeParts[1].padStart(2, '0') : '00';

      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // If not in expected format, try to parse it
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // Return current date if parsing fails
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Fetch dropdown options from Google Sheets (Drop Down Master)
  const fetchDropdownOptions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}?sheet=${DROP_DOWN_SHEET}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dropdown data');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const sheetData = data.data;

        // Get Plant Names from column A (A2:A)
        const plantNames = [];
        // Get Office Dispatcher Names from column B (B2:B)
        const dispatcherNames = [];
        // Get Commodity Types from column C (C2:C)
        const commodityTypes = [];
        // Get Munsi Names from column D (D2:D)
        const munsiNames = [];
        // Get Sub Commodities from column E (E2:E)
        const subCommodities = [];
        // Get KMS Year from column F (F2:F)
        const kmsYears = [];
        // Get Firm Names from column G (G2:G)
        const firmNames = [];

        for (let i = 1; i < sheetData.length; i++) {
          if (sheetData[i][0]) plantNames.push(sheetData[i][0].trim());
          if (sheetData[i][1]) dispatcherNames.push(sheetData[i][1].trim());
          if (sheetData[i][2]) commodityTypes.push(sheetData[i][2].trim());
          if (sheetData[i][3]) munsiNames.push(sheetData[i][3].trim());
          if (sheetData[i][4]) subCommodities.push(sheetData[i][4].trim());
          if (sheetData[i][5]) kmsYears.push(sheetData[i][5].trim());
          if (sheetData[i][6]) firmNames.push(sheetData[i][6].trim());
        }

        setDropdownOptions({
          plantName: [...new Set(plantNames)],
          officeDispatcher: [...new Set(dispatcherNames)],
          commodityType: [...new Set(commodityTypes)],
          munsiName: [...new Set(munsiNames)],
          subCommodity: [...new Set(subCommodities)],
          kmsYear: [...new Set(kmsYears)],
          firmName: [...new Set(firmNames)]
        });
      }
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      showToast('Failed to load dropdown options. Please refresh the page.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch table data
  const fetchIndents = async () => {
    try {
      setLoading(true);

      const [dispatchResponse, loadingCompleteResponse, gatePassResponse] = await Promise.all([
        fetch(`${API_URL}?sheet=${DISPATCH_SHEET}&action=getData`),
        fetch(`${API_URL}?sheet=${LOADING_COMPLETE_SHEET}&action=getData`),
        fetch(`${API_URL}?sheet=${GATE_PASS_SHEET}&action=getData`)
      ]);

      if (!dispatchResponse.ok || !loadingCompleteResponse.ok || !gatePassResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const [dispatchData, loadingCompleteData, gatePassData] = await Promise.all([
        dispatchResponse.json(),
        loadingCompleteResponse.json(),
        gatePassResponse.json()
      ]);

      const pendingData = [];
      const historyData = [];
      const dispatchMap = new Map();
      const loadingCompleteMap = new Map();

      // 1. Process Dispatch Data (for cross-referencing)
      if (dispatchData.success && dispatchData.data) {
        const sheetData = dispatchData.data;
        for (let i = 6; i < sheetData.length; i++) {
          const row = sheetData[i];
          // RST No is likely to be the key for cross-referencing. Column C (Index 2)
          if (row[2]) {
            dispatchMap.set(row[2].toString().trim(), {
              plantName: row[3] || '', // D
              officeDispatcher: row[4] || '', // E - Index 4
              partyName: row[5] || '', // F
              truckNo: row[7] || '', // H
              commodityType: row[8] || '', // I - Index 8
              totalBag: row[9] || '', // J
              bhartiSize: row[10] || '', // K
              totalQty: row[11] || '', // L
              tareWeight: row[12] || '' // M
            });
          }
        }
      }

      // 2. Process Loading Complete Data (for Pending & cross-referencing)
      if (loadingCompleteData.success && loadingCompleteData.data) {
        const sheetData = loadingCompleteData.data;
        for (let i = 6; i < sheetData.length; i++) {
          const row = sheetData[i];
          // RST No is in Column B (Index 1) in Loading Complete Sheet
          if (row[1]) {
            const rstNo = row[1].toString().trim();
            const dispatchDetails = dispatchMap.get(rstNo) || {};

            const item = {
              id: `lc-${i}`,
              indentNo: rstNo,
              rstNo: rstNo,
              trType: row[2] || '', // C

              // Dispatch Details
              plantName: dispatchDetails.plantName || '',
              partyName: dispatchDetails.partyName || '',
              truckNo: dispatchDetails.truckNo || '',
              vehicleNo: dispatchDetails.truckNo || '', // Map for form pre-fill
              totalBag: dispatchDetails.totalBag || '',
              bhartiSize: dispatchDetails.bhartiSize || '',
              totalQty: dispatchDetails.totalQty || '',
              tareWeight: dispatchDetails.tareWeight || '',

              // Loading Complete Details
              munsiName: row[3] || '', // D
              driverName: row[4] || '', // E
              driverNumber: row[5] || '', // F
              subCommodity1: row[6] || '', // G
              noOfPkts1: row[7] || '', // H
              subCommodity2: row[8] || '', // I
              noOfPkts2: row[9] || '', // J
              subCommodity3: row[10] || '', // K
              noOfPkts3: row[11] || '', // L
              totalPacket: row[12] || '', // M
              loadingBhartiSize: row[13] || '', // N
              loadingQuantity: row[14] || '', // O
              loadingPacketType: row[15] || '', // P
              loadingPacketName: row[16] || '', // Q
              vehicleImage: row[17] || '', // R
              loadingStatus: row[18] || '', // S

              colT: row[19] || '', // T
              colU: row[20] || '', // U

              rowIndex: i + 1,
              originalRow: row
            };

            loadingCompleteMap.set(rstNo, item);

            // Pending Condition: Col T (19) != Null AND Col U (20) == Null
            const colT = row[19];
            const colU = row[20];

            if ((colT && colT.toString().trim() !== '') && (!colU || colU.toString().trim() === '')) {
              pendingData.push(item);
            }
          }
        }
      }

      // 3. Process Gate Pass Data (History)
      if (gatePassData.success && gatePassData.data) {
        const sheetData = gatePassData.data;
        for (let i = 6; i < sheetData.length; i++) {
          const row = sheetData[i];
          if (row[1]) { // Indent No / RST No
            const rstNo = row[1].toString().trim();
            const dispatchDetails = dispatchMap.get(rstNo) || {};
            const loadingCompleteDetails = loadingCompleteMap.get(rstNo) || {};

            // History Condition: Loading Complete Col T (19) != Null AND Col U (20) != Null
            // However, we are iterating Gate Pass Sheet, so we check if this gate pass exists for a valid completed loading item.
            // Or we check the condition for display in history tab.
            // The user said: "In 'History' Section show row Conditions are Column 'T7:T' = 'Not Null' and Column 'U7:U' = 'Not Null'."
            // This refers to the Loading Complete Sheet columns.
            // So we should essentially be driving the History list from Loading Complete rows that match that condition, 
            // OR from Gate Pass sheet rows that correspond to such items.
            // Given the instruction "In 'History' Section show row Conditions are Column 'T7:T' = 'Not Null' and Column 'U7:U' = 'Not Null'",
            // it implies we should filter based on Loading Complete state.
            // BUT, usually History comes from Gate Pass sheet where the gate pass is actually created.
            // Let's assume sticking to Gate Pass sheet is correct, but we cross reference the Loading Complete status.

            const lcColT = loadingCompleteDetails.colT;
            const lcColU = loadingCompleteDetails.colU;

            if (lcColT && lcColT.toString().trim() !== '' && lcColU && lcColU.toString().trim() !== '') {
              const item = {
                id: `gp-${i}`,
                timestamp: row[0] || '', // A
                indentNo: row[1] || '', // B (RST No)

                // Dispatch Sheet Data
                plantName: dispatchDetails.plantName || '',
                officeDispatcher: dispatchDetails.officeDispatcher || '', // Updated Source: Dispatch Sheet (Column E)
                partyName: dispatchDetails.partyName || '',
                tareWeight: dispatchDetails.tareWeight || '',
                vehicleNo: dispatchDetails.truckNo || '', // Map for filter compatibility
                commodityType: dispatchDetails.commodityType || '', // Updated Source: Dispatch Sheet (Column I)

                // Gate Pass Data
                loadingWeight: row[2] || '', // C
                netWeight: row[3] || '', // D
                gatePassType: row[4] || '', // E
                gatePassNumber: row[5] || '', // F
                date: row[6] || '', // G
                vehicleNumber: row[7] || '', // H
                vehicleType: row[8] || '', // I
                transporterName: row[9] || '', // J
                advanceGiven: row[10] || '', // K
                freightPerQty: row[11] || '', // L
                pumpName: row[12] || '', // M
                dieselGiven: row[13] || '', // N
                subCommodity1: row[14] || '', // O
                noOfPkts1: row[15] || '', // P
                subCommodity2: row[16] || '', // Q
                noOfPkts2: row[17] || '', // R
                subCommodity3: row[18] || '', // S
                noOfPkts3: row[19] || '', // T
                totalPacket: row[20] || '', // U
                netWeightQuintal: row[21] || '', // V
                rate: row[22] || '', // W
                billDetails: row[23] || '', // X
                billWeight: row[24] || '', // Y
                invoiceNumber: row[25] || '', // Z
                invoiceValue: row[26] || '', // AA
                driverName: row[27] || '', // AB
                driverNumber: row[28] || '', // AC
                cmrNumber: row[29] || '', // AD
                lotNumber: row[30] || '', // AE
                kmsYear: row[31] || '', // AF
                firmName: row[32] || '', // AG

                // Cross Reference
                munsiName: loadingCompleteDetails.munsiName || '',
                loadingBhartiSize: loadingCompleteDetails.loadingBhartiSize || '',
                loadingQuantity: loadingCompleteDetails.loadingQuantity || '',
                loadingPacketType: loadingCompleteDetails.loadingPacketType || '',
                loadingPacketName: loadingCompleteDetails.loadingPacketName || '',
                vehicleImage: loadingCompleteDetails.vehicleImage || '',

                rowIndex: i + 1
              };
              historyData.push(item);
            }
          }
        }
      }

      // Reverse to show latest
      pendingData.reverse();
      historyData.reverse();

      setPendingIndents(pendingData);
      setHistoryIndents(historyData);
      setFilteredPending(pendingData);
      setFilteredHistory(historyData);

    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate net weight and net weight quintal
  const calculateNetWeight = (loadingWeight, tareWeight) => {
    const loading = parseFloat(loadingWeight) || 0;
    const tare = parseFloat(tareWeight) || 0;
    const net = loading - tare;
    const netQuintal = net / 100;
    return { net, netQuintal };
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

  // Calculate total packets whenever packet counts change
  useEffect(() => {
    const total =
      (parseInt(gatePassForm.noOfPkts1, 10) || 0) +
      (parseInt(gatePassForm.noOfPkts2, 10) || 0) +
      (parseInt(gatePassForm.noOfPkts3, 10) || 0);

    setGatePassForm((prev) => ({
      ...prev,
      totalPacket: total,
    }));
  }, [gatePassForm.noOfPkts1, gatePassForm.noOfPkts2, gatePassForm.noOfPkts3]);

  useEffect(() => {
    const total =
      (parseInt(editForm.noOfPkts1, 10) || 0) +
      (parseInt(editForm.noOfPkts2, 10) || 0) +
      (parseInt(editForm.noOfPkts3, 10) || 0);
    setEditForm((prev) => ({
      ...prev,
      totalPacket: total,
    }));
  }, [editForm.noOfPkts1, editForm.noOfPkts2, editForm.noOfPkts3]);

  const applyFilters = () => {
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
      plantName: "",
      officeDispatcher: "",
      partyName: "",
      vehicleNo: "",
      commodityType: "",
      indentNo: "",
    });
  };

  const handleViewImage = (imageUrl) => {
    if (!imageUrl || typeof imageUrl !== 'string') return;

    // This handles both `file/d/` and `uc?export=view&id=` formats
    const fileId = imageUrl.includes('file/d/') ? imageUrl.split('file/d/')[1].split('/')[0] : imageUrl.split('id=')[1];
    const formattedUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    window.open(formattedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCreateGatePass = (indent) => {
    setSelectedIndent(indent);

    const totalPkt = (parseInt(indent.noOfPkts1) || 0) + (parseInt(indent.noOfPkts2) || 0) + (parseInt(indent.noOfPkts3) || 0);
    const loading = parseFloat(gatePassForm.loadingWeight) || 0;
    const tare = parseFloat(indent.tareWeight) || 0;

    // Get current date-time for datetime-local input
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentDateTimeForInput = `${year}-${month}-${day}T${hours}:${minutes}`;

    setGatePassForm({
      indentNo: indent.indentNo,
      plantName: indent.plantName,
      officeDispatcher: indent.officeDispatcher,
      partyName: indent.partyName,
      vehicleNo: indent.vehicleNo,
      commodityType: indent.commodityType,
      tareWeight: indent.tareWeight,
      munsiName: indent.munsiName,
      loadingBhartiSize: indent.loadingBhartiSize,
      loadingQuantity: indent.loadingQuantity,
      loadingPacketType: indent.loadingPacketType,
      loadingPacketName: indent.loadingPacketName,
      loadingWeight: "",
      netWeight: (loading - tare).toString(),
      netWeightQuintal: (loading - tare) / 100,
      gatePassType: "Civil Supply",
      gatePassNumber: "",
      date: currentDateTimeForInput, // Use datetime-local format
      vehicleNumber: indent.vehicleNo,
      vehicleType: "Company Vehicle",
      transporterName: "",
      advanceGiven: "",
      freightPerQty: "",
      pumpName: "",
      dieselGiven: "",
      subCommodity1: indent.subCommodity1,
      noOfPkts1: indent.noOfPkts1,
      subCommodity2: indent.subCommodity2,
      noOfPkts2: indent.noOfPkts2,
      subCommodity3: indent.subCommodity3,
      noOfPkts3: indent.noOfPkts3,
      totalPacket: totalPkt,
      // Civil Supply Fields
      cmrNumber: "",
      lotNumber: "",
      driverName: indent.driverName,
      driverNumber: indent.driverNumber,
      kmsYear: "",
      firmName: "",
      // Normal Gate Pass Fields
      rate: "",
      billDetails: "",
      billWeight: "",
      invoiceNumber: "",
      invoiceValue: ""
    });

    setShowGatePassModal(true);
  };

  const handleEditClick = (indent) => {
    setEditingIndent(indent);

    // Format date for datetime-local input
    const formattedDate = formatDateTimeForInput(indent.date);
    const { net } = calculateNetWeight(indent.loadingWeight, indent.tareWeight); // net is calculated, but netQuintal should come from data

    setEditForm({
      loadingWeight: indent.loadingWeight || "",
      netWeight: net.toString(),
      netWeightQuintal: parseFloat(indent.netWeightQuintal) || 0,
      gatePassType: indent.gatePassType || "Civil Supply",
      gatePassNumber: indent.gatePassNumber || "",
      date: formattedDate || formatDateTimeForInput(new Date()),
      vehicleNumber: indent.vehicleNumber || indent.vehicleNo,
      vehicleType: indent.vehicleType || "",
      transporterName: indent.transporterName || "",
      advanceGiven: indent.advanceGiven || "",
      freightPerQty: indent.freightPerQty || "",
      pumpName: indent.pumpName || "",
      dieselGiven: indent.dieselGiven || "",
      subCommodity1: indent.subCommodity1_gp || indent.subCommodity1,
      noOfPkts1: indent.noOfPkts1_gp || indent.noOfPkts1,
      subCommodity2: indent.subCommodity2_gp || indent.subCommodity2,
      noOfPkts2: indent.noOfPkts2_gp || indent.noOfPkts2,
      subCommodity3: indent.subCommodity3_gp || indent.subCommodity3,
      noOfPkts3: indent.noOfPkts3_gp || indent.noOfPkts3,
      totalPacket: parseInt(indent.totalPacket_gp, 10) || 0,
      cmrNumber: indent.cmrNumber || "",
      lotNumber: indent.lotNumber || "",
      driverName: indent.driverName_gp || indent.driverName,
      driverNumber: indent.driverNumber_gp || indent.driverNumber,
      kmsYear: indent.kmsYear || "",
      firmName: indent.firmName || "",
      // Normal Gate Pass Fields
      rate: indent.rate || "",
      billDetails: indent.billDetails || "",
      billWeight: indent.billWeight || "",
      invoiceNumber: indent.invoiceNumber || "",
      invoiceValue: indent.invoiceValue || ""
    });

    setShowEditModal(true);
  };

  const handleGatePassInputChange = (e) => {
    const { name, value } = e.target;

    setGatePassForm(prev => {
      const newForm = { ...prev, [name]: value };

      // Recalculate net weight if loading weight changes
      if (name === 'loadingWeight') {
        const loading = parseFloat(value) || 0;
        const tare = parseFloat(prev.tareWeight) || 0;
        const net = loading - tare;
        newForm.netWeight = net.toString();
        newForm.netWeightQuintal = net / 100;
      }

      // Format date when date changes
      if (name === 'date') {
        // Keep the datetime-local format for the input
        // We'll format it to DD/MM/YYYY HH:MM:SS when saving
      }

      return newForm;
    });
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;

    setEditForm(prev => {
      const newForm = { ...prev, [name]: value };

      // Recalculate net weight if loading weight changes
      if (name === 'loadingWeight' && editingIndent) {
        const loading = parseFloat(value) || 0;
        const tare = parseFloat(editingIndent.tareWeight) || 0;
        const net = loading - tare;
        newForm.netWeight = net.toString();
        newForm.netWeightQuintal = net / 100;
      }

      // Format date when date changes
      if (name === 'date') {
        // Keep the datetime-local format for the input
        // We'll format it to DD/MM/YYYY HH:MM:SS when saving
      }

      return newForm;
    });
  };

  const handleGatePassSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Generate timestamp
      // Generate timestamp in YYYY-MM-DD HH:mm:ss format
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // Format the selected date from datetime-local (YYYY-MM-DDTHH:MM) to YYYY-MM-DD HH:MM:SS
      const formatDateForSheet = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
      };

      const formattedDate = formatDateForSheet(gatePassForm.date);

      // Prepare data for Gate Pass Sheet (Cols A-AG)
      const gatePassRow = [
        timestamp, // A - Timestamp
        gatePassForm.indentNo, // B - Indent No
        gatePassForm.loadingWeight, // C
        gatePassForm.netWeight, // D
        gatePassForm.gatePassType, // E
        gatePassForm.gatePassNumber, // F
        formattedDate, // G - Formatted Date
        gatePassForm.vehicleNumber, // H
        gatePassForm.vehicleType, // I
        gatePassForm.transporterName, // J
        gatePassForm.advanceGiven, // K
        gatePassForm.freightPerQty, // L
        gatePassForm.pumpName, // M
        gatePassForm.dieselGiven, // N
        gatePassForm.subCommodity1, // O
        gatePassForm.noOfPkts1, // P
        gatePassForm.subCommodity2, // Q
        gatePassForm.noOfPkts2, // R
        gatePassForm.subCommodity3, // S
        gatePassForm.noOfPkts3, // T
        gatePassForm.totalPacket, // U
        gatePassForm.netWeightQuintal, // V
        gatePassForm.rate, // W
        gatePassForm.billDetails, // X
        gatePassForm.billWeight, // Y
        gatePassForm.invoiceNumber, // Z
        gatePassForm.invoiceValue, // AA
        gatePassForm.driverName, // AB
        gatePassForm.driverNumber, // AC
        gatePassForm.cmrNumber, // AD
        gatePassForm.lotNumber, // AE
        gatePassForm.kmsYear, // AF
        gatePassForm.firmName // AG
      ];

      // Insert into Gate Pass Sheet
      await fetch(API_URL, {
        method: 'POST',
        body: new URLSearchParams({
          action: 'insert',
          sheetName: GATE_PASS_SHEET,
          rowData: JSON.stringify(gatePassRow)
        })
      });

      // Update Loading Complete Sheet logic removed per user request

      showToast('Gate Pass created successfully!', 'success');
      setShowGatePassModal(false);

      // Reset logic simplified as resetForms isn't defined here but we can clear state or refresh
      setGatePassForm(prev => ({ ...prev })); // Reset or keep form state management simple
      await fetchIndents(); // Refresh data

    } catch (error) {
      console.error('Error creating gate pass:', error);
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const timestamp = editingIndent.timestamp; // Keep original

      // Format the selected date from datetime-local (YYYY-MM-DDTHH:MM) to YYYY-MM-DD HH:MM:SS
      const formatDateForSheet = (dateString) => {
        if (!dateString) return "";
        // Check if already in YYYY-MM-DD format
        if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) return dateString;

        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
      };

      const formattedDate = formatDateForSheet(editForm.date);

      // Prepare data for Gate Pass Sheet (Cols A-AG)
      const gatePassRow = [
        "", // A - Do NOT update Timestamp (Keep original)
        editingIndent.indentNo, // B - Keep original Indent No (Do not change)
        editForm.loadingWeight, // C
        editForm.netWeight, // D
        editForm.gatePassType, // E
        editForm.gatePassNumber, // F
        formattedDate, // G - Formatted Date
        editForm.vehicleNumber, // H
        editForm.vehicleType, // I
        editForm.transporterName, // J
        editForm.advanceGiven, // K
        editForm.freightPerQty, // L
        editForm.pumpName, // M
        editForm.dieselGiven, // N
        editForm.subCommodity1, // O
        editForm.noOfPkts1, // P
        editForm.subCommodity2, // Q
        editForm.noOfPkts2, // R
        editForm.subCommodity3, // S
        editForm.noOfPkts3, // T
        editForm.totalPacket, // U
        editForm.netWeightQuintal, // V
        editForm.rate, // W
        editForm.billDetails, // X
        editForm.billWeight, // Y
        editForm.invoiceNumber, // Z
        editForm.invoiceValue, // AA
        editForm.driverName, // AB
        editForm.driverNumber, // AC
        editForm.cmrNumber, // AD
        editForm.lotNumber, // AE
        editForm.kmsYear, // AF
        editForm.firmName // AG
      ];

      // Insert into Gate Pass Sheet (Update)
      await fetch(API_URL, {
        method: 'POST',
        body: new URLSearchParams({
          action: 'update',
          sheetName: GATE_PASS_SHEET,
          rowIndex: editingIndent.rowIndex,
          rowData: JSON.stringify(gatePassRow)
        })
      });

      // Update Loading Complete Sheet logic removed per user request

      showToast('Gate Pass updated successfully!', 'success');
      setShowEditModal(false);
      setEditingIndent(null);
      await fetchIndents();

    } catch (error) {
      console.error('Error updating gate pass:', error);
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowGatePassModal(false);
    setSelectedIndent(null);
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditingIndent(null);
  };

  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  // Check if any filter is active
  const hasActiveFilters = Object.values(filters).some(value => value !== "");

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
        {/* Header */}
        <div className="flex-shrink-0 p-4 lg:p-6 bg-gray-50">
          <div className="max-w-full mx-auto">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Gate Pass Management</h1>
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

        {/* Filters Section */}
        {showFilters && (
          <div className="flex-shrink-0 px-4 lg:px-6 pb-4 bg-gray-50">
            <div className="max-w-full mx-auto">
              <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Quick Filters</h3>
                  <button
                    onClick={handleClearFilters}
                    className="text-xs text-red-800 hover:text-red-900 transition-colors"
                    disabled={loading}
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {[
                    { key: 'indentNo', label: 'Indent No', placeholder: 'Search indent...' },
                    { key: 'plantName', label: 'Plant Name', placeholder: 'Search plant...' },
                    { key: 'officeDispatcher', label: 'Office Dispatcher', placeholder: 'Search dispatcher...' },
                    { key: 'partyName', label: 'Party Name', placeholder: 'Search party...' },
                    { key: 'vehicleNo', label: 'Vehicle No', placeholder: 'Search vehicle...' },
                    { key: 'commodityType', label: 'Commodity Type', placeholder: 'Search commodity...' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="space-y-1">
                      <label className="block text-xs font-medium text-gray-600">
                        {label}
                      </label>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 w-3 h-3 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={filters[key]}
                          onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                          placeholder={placeholder}
                          className="py-1.5 pr-2 pl-7 w-full text-xs rounded border border-gray-300 focus:ring-1 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          autoComplete="off"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  ))}
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
                        Showing <span className="font-semibold">{filteredPending.length}</span> pending gate pass indents
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
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Action</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">RST No</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">TR Type</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Plant Name</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Party</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Truck No</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Total Bag</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Bharti Size</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Total Qty</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Tare WT</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Munsi Name</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Driver Name</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Driver Number</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Sub Commodity 1</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">No. of PKTS 1</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Sub Commodity 2</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">No. of PKTS 2</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Sub Commodity 3</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">No. of PKTS 3</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Total Packet</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Loading Bharti Size</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Loading Quantity</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Loading Packet Type</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Loading Packet Name</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Vehicle Image</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Loading Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredPending.length > 0 ? (
                            filteredPending.map((item) => (
                              <tr key={item.rowIndex} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm whitespace-nowrap">
                                  <button
                                    onClick={() => handleCreateGatePass(item)}
                                    className="px-3 py-1.5 text-xs font-medium text-white rounded-md transition-all hover:opacity-90 disabled:opacity-50"
                                    style={{ backgroundColor: '#991b1b' }}
                                    disabled={loading}
                                  >
                                    Gate Pass
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{item.indentNo}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{item.trType}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 max-w-xs"><div className="break-words" title={item.plantName}>{item.plantName}</div></td>
                                <td className="px-4 py-3 text-sm text-gray-900 max-w-xs"><div className="break-words" title={item.partyName}>{item.partyName}</div></td>
                                <td className="px-4 py-3 text-sm text-gray-900 font-mono whitespace-nowrap">{item.truckNo}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.totalBag || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.bhartiSize || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.totalQty || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.tareWeight || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.munsiName || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.driverName || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.driverNumber || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.subCommodity1 || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.noOfPkts1 || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.subCommodity2 || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.noOfPkts2 || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.subCommodity3 || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.noOfPkts3 || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.totalPacket || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.loadingBhartiSize || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.loadingQuantity || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.loadingPacketType || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.loadingPacketName || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">
                                  {item.vehicleImage ? (
                                    <button
                                      onClick={() => handleViewImage(item.vehicleImage)}
                                      className="p-1 transition-colors hover:bg-blue-50 rounded text-blue-600"
                                      title="View Image"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  ) : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">
                                  {item.loadingStatus || '-'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="26" className="px-6 py-12 text-center text-gray-500">
                                <div className="flex flex-col gap-2 items-center">
                                  <Clock className="w-8 h-8 text-gray-400" />
                                  <span>No pending gate pass records found</span>
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
                  <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold">{filteredPending.length}</span> pending gate pass indents
                      </div>
                      {hasActiveFilters && (
                        <div className="flex items-center gap-1 text-xs text-red-800">
                          <Filter className="w-3 h-3" />
                          <span>Filters Active</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3">
                    {filteredPending.length > 0 ? (
                      <div className="space-y-3">
                        {filteredPending.map((item) => (
                          <div key={item.rowIndex} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                              <div>
                                <p className="font-bold text-gray-900">{item.indentNo}</p>
                                <p className="text-xs text-gray-600">{item.plantName} | {item.trType || '-'}</p>
                              </div>
                              <button onClick={() => handleCreateGatePass(item)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900" disabled={loading}>Gate Pass</button>
                            </div>
                            <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-gray-500">Party:</span> <span className="font-medium">{item.partyName || '-'}</span></div>
                              <div><span className="text-gray-500">Vehicle:</span> <span className="font-medium font-mono">{item.vehicleNo || '-'}</span></div>
                              <div><span className="text-gray-500">Commodity:</span> <span className="font-medium">{item.commodityType || '-'}</span></div>
                              <div><span className="text-gray-500">Tare WT:</span> <span className="font-medium">{item.tareWeight || '-'}</span></div>
                              <div><span className="text-gray-500">Driver:</span> <span className="font-medium">{item.driverName || '-'}</span></div>
                              <div><span className="text-gray-500">Munsi:</span> <span className="font-medium">{item.munsiName || '-'}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 items-center justify-center py-12 text-gray-500">
                        <Clock className="w-8 h-8 text-gray-400" />
                        <span>No pending gate pass records found</span>
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
                        Showing <span className="font-semibold">{filteredHistory.length}</span> completed gate passes
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
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Action</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Indent No</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Plant Name</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Office Dispatcher</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Party Name</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Commodity Type</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Tare Weight</th>

                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Loading Weight</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Net Weight</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Gate Pass Type</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Gate Pass No</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Date</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Vehicle Number</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Vehicle Type</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Transporter Name</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Advance Given</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Freight Per Quintal</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Pump Name</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Diesel Given</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Sub Commodity 1</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">No. of Pkts 1</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Sub Commodity 2</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">No. of Pkts 2</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Sub Commodity 3</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">No. of Pkts 3</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Total Packet</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Net Weight (Quintal)</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">CMR Number</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Lot Number</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Driver Name</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Driver Number</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">KMS Year</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Firm Name</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Rate Per Quintal</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Bill Details</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Bill Weight</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Invoice Number</th>
                            <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Invoice Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredHistory.length > 0 ? (
                            filteredHistory.map((item) => (
                              <tr key={item.rowIndex} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm whitespace-nowrap">
                                  <button
                                    onClick={() => handleEditClick(item)}
                                    className="p-1 transition-colors hover:bg-blue-50 rounded text-blue-600 disabled:opacity-50"
                                    title="Edit"
                                    disabled={loading}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{item.indentNo}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 max-w-xs"><div className="break-words" title={item.plantName}>{item.plantName}</div></td>
                                <td className="px-4 py-3 text-sm text-gray-900 max-w-xs"><div className="break-words" title={item.officeDispatcher}>{item.officeDispatcher}</div></td>
                                <td className="px-4 py-3 text-sm text-gray-900 max-w-xs"><div className="break-words" title={item.partyName}>{item.partyName}</div></td>
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{item.commodityType}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.tareWeight || '-'}</td>

                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.loadingWeight || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.netWeight || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${item.gatePassType === 'Civil Supply' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{item.gatePassType || '-'}</span></td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.gatePassNumber || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.date ? new Date(item.date).toLocaleDateString('en-GB') : '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.vehicleNumber || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.vehicleType || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.transporterName || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.advanceGiven || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.freightPerQty || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.pumpName || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.dieselGiven || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.subCommodity1 || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.noOfPkts1 || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.subCommodity2 || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.noOfPkts2 || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.subCommodity3 || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.noOfPkts3 || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.totalPacket || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.netWeightQuintal || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.cmrNumber || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.lotNumber || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.driverName || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.driverNumber || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.kmsYear || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.firmName || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.rate || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.billDetails || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.billWeight || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.invoiceNumber || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.invoiceValue || '-'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="42" className="px-6 py-12 text-center text-gray-500">
                                <div className="flex flex-col gap-2 items-center">
                                  <CheckCircle className="w-8 h-8 text-gray-400" />
                                  <span>No completed gate pass records found</span>
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
                  <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold">{filteredHistory.length}</span> completed gate passes
                      </div>
                      {hasActiveFilters && (
                        <div className="flex items-center gap-1 text-xs text-red-800">
                          <Filter className="w-3 h-3" />
                          <span>Filters Active</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3">
                    {filteredHistory.length > 0 ? (
                      <div className="space-y-3">
                        {filteredHistory.map((item) => (
                          <div key={item.rowIndex} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                              <div>
                                <p className="font-bold text-gray-900">{item.indentNo}</p>
                                <p className="text-xs text-gray-600">{item.plantName} | {item.gatePassNumber || '-'}</p>
                              </div>
                              <button onClick={() => handleEditClick(item)} className="px-2 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900 flex items-center gap-1" disabled={loading}><Edit className="w-3 h-3" /> Edit</button>
                            </div>
                            <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-gray-500">Party:</span> <span className="font-medium">{item.partyName || '-'}</span></div>
                              <div><span className="text-gray-500">Vehicle:</span> <span className="font-medium font-mono">{item.vehicleNumber || '-'}</span></div>
                              <div><span className="text-gray-500">Type:</span> <span className={`px-1 py-0.5 text-xs font-medium rounded ${item.gatePassType === 'Civil Supply' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{item.gatePassType || '-'}</span></div>
                              <div><span className="text-gray-500">Date:</span> <span className="font-medium">{item.date ? new Date(item.date).toLocaleDateString('en-GB') : '-'}</span></div>
                              <div><span className="text-gray-500">Net WT:</span> <span className="font-medium">{item.netWeight || '-'}</span></div>
                              <div><span className="text-gray-500">Net Qtl:</span> <span className="font-medium text-green-700">{item.netWeightQuintal || '-'}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 items-center justify-center py-12 text-gray-500">
                        <CheckCircle className="w-8 h-8 text-gray-400" />
                        <span>No completed gate pass records found</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Gate Pass Modal */}
      {showGatePassModal && selectedIndent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                Create Gate Pass - {selectedIndent.indentNo}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGatePassSubmit} className="p-4 space-y-6">
              {/* Pre-filled Indent Information */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Indent Information (Preview)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'Indent Number'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.indentNo}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'Plant Name'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.plantName}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'Party Name'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.partyName}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'Munsi Name'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.munsiName || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'Driver Name'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.driverName || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'Driver Number'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.driverNumber || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'Sub Commodity 1'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.subCommodity1 || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'No. of PKTS 1'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.noOfPkts1 || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'Sub Commodity 2'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.subCommodity2 || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'No. of PKTS 2'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.noOfPkts2 || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'Sub Commodity 3'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.subCommodity3 || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'No. of PKTS 3'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.noOfPkts3 || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'Total Packet'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.totalPacket || '0'}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'Loading Bharti Size'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.loadingBhartiSize || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'Loading Quantity'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.loadingQuantity || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'Loading Packet Type'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.loadingPacketType || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">'Loading Packet Name'</label>
                    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.loadingPacketName || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gate Pass Form */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Gate Pass Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-white rounded-lg border border-gray-200">
                  {/* Basic Fields */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Loading Weight</label>
                    <input
                      type="number"
                      name="loadingWeight"
                      value={gatePassForm.loadingWeight}
                      onChange={handleGatePassInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter loading weight"
                      disabled={loading}
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Tare Weight</label>
                    <div className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {selectedIndent.tareWeight || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Net Weight</label>
                    <div className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {gatePassForm.netWeight}
                    </div>
                  </div>

                  <div>
                    {gatePassForm.loadingWeight && (<> <div>
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">Gate Pass Type</label>
                      <select
                        name="gatePassType"
                        value={gatePassForm.gatePassType}
                        onChange={handleGatePassInputChange}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        disabled={loading}
                      >
                        <option value="Civil Supply">Civil Supply</option>
                        <option value="Normal Gate Pass">Normal Gate Pass</option>
                      </select>
                    </div>
                      {gatePassForm.gatePassType === 'Civil Supply' && (
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Firm Name</label>
                          <select
                            name="firmName"
                            value={gatePassForm.firmName}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            disabled={loading}
                          >
                            <option value="">Select Firm Name</option>
                            {dropdownOptions.firmName.map((item, index) => (
                              <option key={index} value={item}>{item}</option>
                            ))}
                          </select>
                        </div>
                      )}</>)}</div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Gate Pass Number</label>
                    <input
                      type="text"
                      name="gatePassNumber"
                      value={gatePassForm.gatePassNumber}
                      onChange={handleGatePassInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter gate pass number"
                      disabled={loading}
                      required
                    />
                  </div>

                  {/* Updated Date Field with Date Picker */}
                  {gatePassForm.loadingWeight && (<>
                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                        <input
                          type="datetime-local"
                          name="date"
                          value={gatePassForm.date}
                          onChange={handleGatePassInputChange}
                          className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          disabled={loading}
                          required
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Format: YYYY-MM-DD HH:MM
                      </p>
                    </div>

                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">Vehicle Number</label>
                      <input
                        type="text"
                        name="vehicleNumber"
                        value={gatePassForm.vehicleNumber}
                        onChange={handleGatePassInputChange}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        placeholder="Enter vehicle number"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">Vehicle Type</label>
                      <select
                        name="vehicleType"
                        value={gatePassForm.vehicleType}
                        onChange={handleGatePassInputChange}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        disabled={loading}
                      >
                        <option value="Company Vehicle">Company Vehicle</option>
                        <option value="Party Vehicle">Party Vehicle</option>
                        <option value="Transporter Vehicle">Transporter Vehicle</option>
                      </select>
                    </div>

                    {/* Conditional Fields for Transporter Vehicle */}
                    {gatePassForm.vehicleType === 'Transporter Vehicle' && (
                      <>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Transporter Name</label>
                          <input
                            type="text"
                            name="transporterName"
                            value={gatePassForm.transporterName}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter transporter name"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Advance Given</label>
                          <input
                            type="number"
                            name="advanceGiven"
                            value={gatePassForm.advanceGiven}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter advance amount"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Freight Per Quintal</label>
                          <input
                            type="number"
                            name="freightPerQty"
                            value={gatePassForm.freightPerQty}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter freight per quantity"
                            disabled={loading}
                          />
                        </div>
                      </>
                    )}

                    {/* Conditional Fields for Company or Transporter Vehicle */}
                    {gatePassForm.vehicleType === 'Transporter Vehicle' && (
                      <>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Pump Name</label>
                          <input
                            type="text"
                            name="pumpName"
                            value={gatePassForm.pumpName}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter pump name"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Diesel Given</label>
                          <input
                            type="number"
                            name="dieselGiven"
                            value={gatePassForm.dieselGiven}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter diesel quantity"
                            disabled={loading}
                          />
                        </div>
                      </>
                    )}

                    {/* Sub Commodity Fields */}
                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">Sub Commodity 1</label>
                      <select
                        name="subCommodity1"
                        value={gatePassForm.subCommodity1}
                        onChange={handleGatePassInputChange}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        disabled={loading}
                      >
                        <option value="">Select Sub Commodity</option>
                        {dropdownOptions.subCommodity.map((item, index) => (
                          <option key={index} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">No. of PKTS 1</label>
                      <input
                        type="number"
                        name="noOfPkts1"
                        value={gatePassForm.noOfPkts1}
                        onChange={handleGatePassInputChange}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        placeholder="Enter number of packets"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">Sub Commodity 2</label>
                      <select
                        name="subCommodity2"
                        value={gatePassForm.subCommodity2}
                        onChange={handleGatePassInputChange}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        disabled={loading}
                      >
                        <option value="">Select Sub Commodity</option>
                        {dropdownOptions.subCommodity.map((item, index) => (
                          <option key={index} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">No. of PKTS 2</label>
                      <input
                        type="number"
                        name="noOfPkts2"
                        value={gatePassForm.noOfPkts2}
                        onChange={handleGatePassInputChange}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        placeholder="Enter number of packets"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">Sub Commodity 3</label>
                      <select
                        name="subCommodity3"
                        value={gatePassForm.subCommodity3}
                        onChange={handleGatePassInputChange}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        disabled={loading}
                      >
                        <option value="">Select Sub Commodity</option>
                        {dropdownOptions.subCommodity.map((item, index) => (
                          <option key={index} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">No. of PKTS 3</label>
                      <input
                        type="number"
                        name="noOfPkts3"
                        value={gatePassForm.noOfPkts3}
                        onChange={handleGatePassInputChange}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        placeholder="Enter number of packets"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">Total Packet</label>
                      <div className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                        {gatePassForm.totalPacket}
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">Net Weight (Quintal)</label>
                      <div className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                        {gatePassForm.netWeightQuintal.toFixed(2)}
                      </div>
                    </div>

                    {/* Conditional Fields based on Gate Pass Type */}
                    {gatePassForm.gatePassType === 'Civil Supply' ? (
                      <>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">CMR Number</label>
                          <input
                            type="text"
                            name="cmrNumber"
                            value={gatePassForm.cmrNumber}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter CMR number"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Lot Number</label>
                          <input
                            type="text"
                            name="lotNumber"
                            value={gatePassForm.lotNumber}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter lot number"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Driver Name</label>
                          <input
                            type="text"
                            name="driverName"
                            value={gatePassForm.driverName}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter driver name"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Driver Number</label>
                          <input
                            type="text"
                            name="driverNumber"
                            value={gatePassForm.driverNumber}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter driver number"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">KMS Year</label>
                          <select
                            name="kmsYear"
                            value={gatePassForm.kmsYear}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            disabled={loading}
                          >
                            <option value="">Select KMS Year</option>
                            {dropdownOptions.kmsYear.map((year, index) => (
                              <option key={index} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Rate Per Quintal</label>
                          <input
                            type="number"
                            name="rate"
                            value={gatePassForm.rate}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter rate"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Bill Details</label>
                          <input
                            type="text"
                            name="billDetails"
                            value={gatePassForm.billDetails}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter bill details"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Bill Weight</label>
                          <input
                            type="number"
                            name="billWeight"
                            value={gatePassForm.billWeight}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter bill weight"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Invoice Number</label>
                          <input
                            type="text"
                            name="invoiceNumber"
                            value={gatePassForm.invoiceNumber}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter invoice number"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Invoice Value</label>
                          <input
                            type="number"
                            name="invoiceValue"
                            value={gatePassForm.invoiceValue}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter invoice value"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Driver Name</label>
                          <input
                            type="text"
                            name="driverName"
                            value={gatePassForm.driverName}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter driver name"
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block mb-1.5 text-sm font-medium text-gray-700">Driver Number</label>
                          <input
                            type="text"
                            name="driverNumber"
                            value={gatePassForm.driverNumber}
                            onChange={handleGatePassInputChange}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                            placeholder="Enter driver number"
                            disabled={loading}
                          />
                        </div>
                      </>
                    )}
                  </>)}</div>
              </div>

              <div className="flex gap-3 justify-end p-4 border-t border-gray-200 sticky bottom-0 bg-white mt-6">
                <button
                  type="button"
                  onClick={handleCancel}
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
                      Saving...
                    </span>
                  ) : (
                    'Create Gate Pass'
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Gate Pass - {editingIndent.indentNo}
              </h3>
              <button
                onClick={handleEditCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 space-y-6">
              {/* Gate Pass Form */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Edit Gate Pass Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-white rounded-lg border border-gray-200">
                  {/* Basic Fields */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Loading Weight</label>
                    <input
                      type="number"
                      name="loadingWeight"
                      value={editForm.loadingWeight}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter loading weight"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Net Weight</label>
                    <div className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {editForm.netWeight}
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Gate Pass Type</label>
                    <select
                      name="gatePassType"
                      value={editForm.gatePassType}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      disabled={loading}
                    >
                      <option value="Civil Supply">Civil Supply</option>
                      <option value="Normal Gate Pass">Normal Gate Pass</option>
                    </select>
                  </div>
                  {editForm.gatePassType === 'Civil Supply' && (
                    <div>
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">Firm Name</label>
                      <select
                        name="firmName"
                        value={editForm.firmName}
                        onChange={handleEditInputChange}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        disabled={loading}
                      >
                        <option value="">Select Firm Name</option>
                        {dropdownOptions.firmName.map((item, index) => (
                          <option key={index} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Gate Pass Number</label>
                    <input
                      type="text"
                      name="gatePassNumber"
                      value={editForm.gatePassNumber}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter gate pass number"
                      disabled={loading}
                    />
                  </div>

                  {/* Updated Date Field with Date Picker */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2 pointer-events-none" />
                      <input
                        type="datetime-local"
                        name="date"
                        value={editForm.date}
                        onChange={handleEditInputChange}
                        className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                        disabled={loading}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Format: YYYY-MM-DD HH:MM
                    </p>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Vehicle Number</label>
                    <input
                      type="text"
                      name="vehicleNumber"
                      value={editForm.vehicleNumber}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter vehicle number"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Vehicle Type</label>
                    <select
                      name="vehicleType"
                      value={editForm.vehicleType}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      disabled={loading}
                    >
                      <option value="Company Vehicle">Company Vehicle</option>
                      <option value="Party Vehicle">Party Vehicle</option>
                      <option value="Transporter Vehicle">Transporter Vehicle</option>
                    </select>
                  </div>

                  {/* Conditional Fields for Transporter Vehicle */}
                  {editForm.vehicleType === 'Transporter Vehicle' && (
                    <>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">Transporter Name</label>
                        <input
                          type="text"
                          name="transporterName"
                          value={editForm.transporterName}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter transporter name"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">Advance Given</label>
                        <input
                          type="number"
                          name="advanceGiven"
                          value={editForm.advanceGiven}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter advance amount"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">Freight Per Quintal</label>
                        <input
                          type="number"
                          name="freightPerQty"
                          value={editForm.freightPerQty}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter freight per quantity"
                          disabled={loading}
                        />
                      </div>
                    </>
                  )}

                  {/* Conditional Fields for Company or Transporter Vehicle */}
                  {editForm.vehicleType === 'Transporter Vehicle' && (
                    <>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">Pump Name</label>
                        <input
                          type="text"
                          name="pumpName"
                          value={editForm.pumpName}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter pump name"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">Diesel Given</label>
                        <input
                          type="number"
                          name="dieselGiven"
                          value={editForm.dieselGiven}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter diesel quantity"
                          disabled={loading}
                        />
                      </div>
                    </>
                  )}

                  {/* Sub Commodity Fields */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Sub Commodity 1</label>
                    <select
                      name="subCommodity1"
                      value={editForm.subCommodity1}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      disabled={loading}
                    >
                      <option value="">Select Sub Commodity</option>
                      {dropdownOptions.subCommodity.map((item, index) => (
                        <option key={index} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">No. of PKTS 1</label>
                    <input
                      type="number"
                      name="noOfPkts1"
                      value={editForm.noOfPkts1}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter number of packets"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Sub Commodity 2</label>
                    <select
                      name="subCommodity2"
                      value={editForm.subCommodity2}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      disabled={loading}
                    >
                      <option value="">Select Sub Commodity</option>
                      {dropdownOptions.subCommodity.map((item, index) => (
                        <option key={index} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">No. of PKTS 2</label>
                    <input
                      type="number"
                      name="noOfPkts2"
                      value={editForm.noOfPkts2}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter number of packets"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Sub Commodity 3</label>
                    <select
                      name="subCommodity3"
                      value={editForm.subCommodity3}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      disabled={loading}
                    >
                      <option value="">Select Sub Commodity</option>
                      {dropdownOptions.subCommodity.map((item, index) => (
                        <option key={index} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">No. of PKTS 3</label>
                    <input
                      type="number"
                      name="noOfPkts3"
                      value={editForm.noOfPkts3}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                      placeholder="Enter number of packets"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Total Packet</label>
                    <div className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {editForm.totalPacket}
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Net Weight (Quintal)</label>
                    <div className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                      {editForm.netWeightQuintal.toFixed(2)}
                    </div>
                  </div>

                  {/* Conditional Fields based on Gate Pass Type */}
                  {editForm.gatePassType === 'Civil Supply' ? (
                    <>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">CMR Number</label>
                        <input
                          type="text"
                          name="cmrNumber"
                          value={editForm.cmrNumber}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter CMR number"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">Lot Number</label>
                        <input
                          type="text"
                          name="lotNumber"
                          value={editForm.lotNumber}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter lot number"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">Driver Name</label>
                        <input
                          type="text"
                          name="driverName"
                          value={editForm.driverName}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter driver name"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">Driver Number</label>
                        <input
                          type="text"
                          name="driverNumber"
                          value={editForm.driverNumber}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter driver number"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">KMS Year</label>
                        <select
                          name="kmsYear"
                          value={editForm.kmsYear}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          disabled={loading}
                        >
                          <option value="">Select KMS Year</option>
                          {dropdownOptions.kmsYear.map((year, index) => (
                            <option key={index} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">Rate Per Quintal</label>
                        <input
                          type="number"
                          name="rate"
                          value={editForm.rate}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter rate"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">Bill Details</label>
                        <input
                          type="text"
                          name="billDetails"
                          value={editForm.billDetails}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter bill details"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">Bill Weight</label>
                        <input
                          type="number"
                          name="billWeight"
                          value={editForm.billWeight}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter bill weight"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">Invoice Number</label>
                        <input
                          type="text"
                          name="invoiceNumber"
                          value={editForm.invoiceNumber}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter invoice number"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">Invoice Value</label>
                        <input
                          type="number"
                          name="invoiceValue"
                          value={editForm.invoiceValue}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter invoice value"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">Driver Name</label>
                        <input
                          type="text"
                          name="driverName"
                          value={editForm.driverName}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter driver name"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">Driver Number</label>
                        <input
                          type="text"
                          name="driverNumber"
                          value={editForm.driverNumber}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                          placeholder="Enter driver number"
                          disabled={loading}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

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
                    'Update Gate Pass'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image View Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Vehicle Image</h3>
              <button
                onClick={handleCloseImageModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="flex justify-center">
                <img
                  src={selectedImage}
                  alt="Vehicle"
                  className="max-w-full max-h-96 object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GatePass;