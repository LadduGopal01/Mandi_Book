import React, { useState, useEffect, useRef } from "react";
import { Filter, X, Search, Edit, CheckCircle, Clock, ChevronDown, Upload, Camera, Loader2, Eye } from "lucide-react";
import { useToast } from '../../contexts/ToastContext';

const API_URL = import.meta.env.VITE_SHEET_API_URL;
const SHEET_ID = import.meta.env.VITE_SHEET_ID;
const DROP_DOWN_SHEET = import.meta.env.VITE_SHEET_DROP_NAME;
const DISPATCH_SHEET = import.meta.env.VITE_SHEET_DISPATCH;
const LOADING_COMPLETE_SHEET = import.meta.env.VITE_SHEET_LOADINGCOMPLETE;
const FOLDER_ID = import.meta.env.VITE_FOLDER_ID;

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

const formatGoogleDriveImageUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  if (url.startsWith('data:image')) {
    return url;
  }

  try {
    // Extract file ID from various Google Drive URL formats
    const directMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (directMatch && directMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${directMatch[1]}&sz=w400`;
    }

    const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (ucMatch && ucMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${ucMatch[1]}&sz=w400`;
    }

    const openMatch = url.match(/open\?id=([a-zA-Z0-9_-]+)/);
    if (openMatch && openMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w400`;
    }

    if (url.includes("thumbnail?id=")) {
      return url;
    }

    const anyIdMatch = url.match(/([a-zA-Z0-9_-]{25,})/);
    if (anyIdMatch && anyIdMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${anyIdMatch[1]}&sz=w400`;
    }

    // Return original URL as fallback
    return url;
  } catch (e) {
    console.error("Error processing image URL:", url, e);
    return url; // Return original URL as fallback
  }
};

const LoadingComplete = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [showFilters, setShowFilters] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [editingIndent, setEditingIndent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState({
    plantName: [],
    officeDispatcher: [],
    commodityType: [],
    munsiName: [],
    subCommodity: []
  });

  // Camera functionality
  const [showCamera, setShowCamera] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [filters, setFilters] = useState({
    trType: "",
    rstNo: "",
    party: "",
    place: "",
    truckNo: "",
    item: "",
  });

  const [processForm, setProcessForm] = useState({
    munsiName: "",
    driverName: "",
    driverNumber: "",
    subCommodity1: "",
    noOfPkts1: "",
    subCommodity2: "",
    noOfPkts2: "",
    subCommodity3: "",
    noOfPkts3: "",
    totalPacket: 0,
    loadingBhartiSize: "",
    loadingQuantity: "",
    loadingPacketType: "",
    loadingPacketName: "",
    vehicleImage: null,
    imagePreview: null,
    loadingStatus: "Yes"
  });

  const [editForm, setEditForm] = useState({
    plantName: "",
    partyName: "",
    vehicleNo: "",
    noOfPkts: "",
    bhartiSize: "",
    totalQty: "",
    tyreWeight: "",
    munsiName: "",
    driverName: "",
    driverNumber: "",
    subCommodity1: "",
    noOfPkts1: "",
    subCommodity2: "",
    noOfPkts2: "",
    subCommodity3: "",
    noOfPkts3: "",
    totalPacket: 0,
    loadingBhartiSize: "",
    loadingQuantity: "",
    loadingPacketType: "",
    loadingPacketName: "",
    vehicleImage: null,
    imagePreview: null,
    loadingStatus: "Complete"
  });

  // State for searchable dropdowns
  const [searchTerms, setSearchTerms] = useState({
    subCommodity1: "",
    subCommodity2: "",
    subCommodity3: "",
  });

  const [editSearchTerms, setEditSearchTerms] = useState({
    subCommodity1: "",
    subCommodity2: "",
    subCommodity3: "",
  });

  const [showDropdowns, setShowDropdowns] = useState({
    subCommodity1: false,
    subCommodity2: false,
    subCommodity3: false,
  });

  const [showEditDropdowns, setShowEditDropdowns] = useState({
    subCommodity1: false,
    subCommodity2: false,
    subCommodity3: false,
  });

  const [pendingIndents, setPendingIndents] = useState([]);
  const [historyIndents, setHistoryIndents] = useState([]);
  const [filteredPending, setFilteredPending] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);

  // State for history edit modal
  const [showHistoryEditModal, setShowHistoryEditModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [historyEditForm, setHistoryEditForm] = useState({
    munsiName: "",
    driverName: "",
    driverNumber: "",
    subCommodity1: "",
    noOfPkts1: "",
    subCommodity2: "",
    noOfPkts2: "",
    subCommodity3: "",
    noOfPkts3: "",
    totalPacket: 0,
    loadingBhartiSize: "",
    loadingQuantity: "",
    loadingPacketType: "",
    loadingPacketName: "",
    vehicleImage: null,
    imagePreview: null,
    loadingStatus: "Complete"
  });

  // State for history edit dropdowns
  const [historyEditSearchTerms, setHistoryEditSearchTerms] = useState({
    subCommodity1: "",
    subCommodity2: "",
    subCommodity3: "",
  });

  const [showHistoryEditDropdowns, setShowHistoryEditDropdowns] = useState({
    subCommodity1: false,
    subCommodity2: false,
    subCommodity3: false,
  });

  const [dispatchDataForEdit, setDispatchDataForEdit] = useState([]); // Store dispatch data for cross-referencing on edit

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
        // Extract data from columns A, B, C, D, E (skip header row)
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

        // Get Munsi Names from column D (D2:D)
        const munsiNames = [];
        for (let i = 1; i < sheetData.length; i++) {
          if (sheetData[i][3]) {
            munsiNames.push(sheetData[i][3].trim());
          }
        }

        // Get Sub Commodities from column E (E2:E)
        const subCommodities = [];
        for (let i = 1; i < sheetData.length; i++) {
          if (sheetData[i][4]) {
            subCommodities.push(sheetData[i][4].trim());
          }
        }

        setDropdownOptions({
          plantName: [...new Set(plantNames)], // Remove duplicates
          officeDispatcher: [...new Set(dispatcherNames)], // Remove duplicates
          commodityType: [...new Set(commodityTypes)], // Remove duplicates
          munsiName: [...new Set(munsiNames)], // Remove duplicates
          subCommodity: [...new Set(subCommodities)] // Remove duplicates
        });
      }
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      showToast('Failed to load dropdown options. Please refresh the page.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch indents
  const fetchIndents = async () => {
    try {
      setLoading(true);

      // Fetch both sheets in parallel
      const [dispatchResponse, historyResponse] = await Promise.all([
        fetch(`${API_URL}?sheet=${DISPATCH_SHEET}&action=getData`),
        fetch(`${API_URL}?sheet=${LOADING_COMPLETE_SHEET}&action=getData`)
      ]);

      if (!dispatchResponse.ok || !historyResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const [dispatchData, historyDataRaw] = await Promise.all([
        dispatchResponse.json(),
        historyResponse.json()
      ]);

      const pendingData = [];
      const historyData = [];
      const dispatchRows = []; // Keep track for editing
      const dispatchMap = new Map();

      // Process Dispatch Data for Pending
      // Pending Condition: Column Y (index 24) Not Null AND Column Z (index 25) Null
      if (dispatchData.success && dispatchData.data) {
        const sheetData = dispatchData.data;

        // Start from row 7 (index 6)
        for (let i = 6; i < sheetData.length; i++) {
          const row = sheetData[i];
          const rstNo = row[2] || ''; // Column C - RST No

          if (rstNo) {
            // Store for potential cross-reference
            const dispatchRow = {
              rstNo: rstNo,
              rowIndex: i + 1,
              date: row[0] || '',          // Column A - Date/Timestamp
              trType: row[1] || '',        // Column B - TR Type
              plantName: row[3] || '',     // Column D - Plant Name
              dispatcherName: row[4] || '', // Column E - Dispatcher Name
              party: row[5] || '',         // Column F - Party
              place: row[6] || '',         // Column G - Place
              truckNo: row[7] || '',       // Column H - Truck No
              item: row[8] || '',          // Column I - Item
              totalBag: row[9] || '',      // Column J - Total Bag
              bhartiSize: row[10] || '',   // Column K - Bharti Size
              totalQty: row[11] || '',     // Column L - Total Qty
              tareWt: row[12] || '',       // Column M - Tare WT
              netWt: row[13] || '',        // Column N - Net WT
              grossWt: row[14] || '',      // Column O - Gross WT
              jute: row[15] || '',         // Column P - Jute
              plastic: row[16] || '',      // Column Q - Plastic
              tpNo: row[17] || '',         // Column R - TP No
              tpWt: row[18] || '',         // Column S - TP WT
              remarks: row[19] || '',      // Column T - Remarks
              vehicleReached: row[23] || '', // Column X - Vehicle Reached
              columnY: row[24] || '',      // Column Y - Loading Point Timestamp
              columnZ: row[25] || ''       // Column Z - Loading Complete Timestamp
            };

            dispatchRows.push(dispatchRow);
            dispatchMap.set(rstNo, dispatchRow);

            // Check conditions for pending
            // Column Y (24) Not Null AND Column Z (25) Null
            const isPending = (row[24] && row[24].toString().trim() !== '') &&
              (!row[25] || row[25].toString().trim() === '');

            if (isPending) {
              const indent = {
                id: i + 1,
                rowIndex: i + 1,
                rstNo: rstNo,
                trType: row[1] || '',        // Column B
                plantName: row[3] || '',     // Column D
                dispatcherName: row[4] || '', // Column E
                party: row[5] || '',         // Column F
                place: row[6] || '',         // Column G
                truckNo: row[7] || '',       // Column H
                item: row[8] || '',          // Column I
                totalBag: row[9] || '',      // Column J
                bhartiSize: row[10] || '',   // Column K
                totalQty: row[11] || '',     // Column L
                tareWt: row[12] || '',       // Column M
                netWt: row[13] || '',        // Column N
                grossWt: row[14] || '',      // Column O
                jute: row[15] || '',         // Column P
                plastic: row[16] || '',      // Column Q
                tpNo: row[17] || '',         // Column R
                tpWt: row[18] || '',         // Column S
                remarks: row[19] || '',      // Column T
                vehicleReached: row[23] || '' // Column X
              };
              pendingData.push(indent);
            }
          }
        }
      }

      // Process Loading Complete Data for History
      // History Condition: Column Y (24) Not Null AND Column Z (25) Not Null in Dispatch
      if (historyDataRaw.success && historyDataRaw.data) {
        const sheetData = historyDataRaw.data;

        // Start from row 7 (index 6)
        for (let i = 6; i < sheetData.length; i++) {
          const row = sheetData[i];
          const rstNo = row[1] || ''; // Column B - RST No in Loading Complete

          if (rstNo) {
            const dispatchRow = dispatchMap.get(rstNo);

            // Filter Condition: Dispatch sheet Column Y (24) Not Null AND Column Z (25) Not Null
            const isCompletedInDispatch = dispatchRow &&
              dispatchRow.columnY && dispatchRow.columnY.toString().trim() !== '' &&
              dispatchRow.columnZ && dispatchRow.columnZ.toString().trim() !== '';

            if (isCompletedInDispatch) {
              const indent = {
                id: i + 1,
                rowIndex: i + 1,
                timestamp: row[0] || '',      // Column A - Timestamp
                rstNo: row[1] || '',          // Column B - RST No
                trType: row[2] || '',         // Column C - TR Type

                // Data from Dispatch Sheet (Cross-referenced)
                plantName: dispatchRow.plantName || '',
                party: dispatchRow.party || '',
                truckNo: dispatchRow.truckNo || '',
                totalBag: dispatchRow.totalBag || '',
                bhartiSize: dispatchRow.bhartiSize || '',
                totalQty: dispatchRow.totalQty || '',
                tareWt: dispatchRow.tareWt || '',

                // Data from Loading Complete Sheet
                munsiName: row[3] || '',           // Column D
                driverName: row[4] || '',          // Column E
                driverNumber: row[5] || '',        // Column F
                subCommodity1: row[6] || '',       // Column G
                noOfPkts1: row[7] || '',           // Column H
                subCommodity2: row[8] || '',       // Column I
                noOfPkts2: row[9] || '',           // Column J
                subCommodity3: row[10] || '',      // Column K
                noOfPkts3: row[11] || '',          // Column L
                totalPacket: row[12] || '',        // Column M
                loadingBhartiSize: row[13] || '',  // Column N
                loadingQuantity: row[14] || '',    // Column O
                loadingPacketType: row[15] || '',  // Column P
                loadingPacketName: row[16] || '',  // Column Q
                vehicleImage: row[17] || '',       // Column R
                loadingStatus: row[18] || ''       // Column S
              };
              historyData.push(indent);
            }
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
      setDispatchDataForEdit(dispatchRows);

    } catch (error) {
      console.error('Error fetching indents:', error);
      showToast('Failed to load indents. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      showToast('Unable to access camera. Please check permissions.', 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
        const imageUrl = canvas.toDataURL('image/jpeg');

        if (showProcessModal) {
          setProcessForm(prev => ({
            ...prev,
            vehicleImage: file,
            imagePreview: imageUrl
          }));
        } else if (showEditModal) {
          setEditForm(prev => ({
            ...prev,
            vehicleImage: file,
            imagePreview: imageUrl
          }));
        }

        setShowCamera(false);
        stopCamera();
      }, 'image/jpeg', 0.8);
    }
  };

  const openCamera = () => {
    setShowCamera(true);
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  const closeCamera = () => {
    setShowCamera(false);
    stopCamera();
  };

  // Upload image to Google Drive
  const uploadImageToDrive = async (file) => {
    try {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result;
            const response = await fetch(API_URL, {
              method: 'POST',
              body: new URLSearchParams({
                action: 'uploadFile',
                base64Data: base64Data,
                fileName: `vehicle_${Date.now()}.jpg`,
                mimeType: 'image/jpeg',
                folderId: FOLDER_ID
              })
            });

            const result = await response.json();
            if (result.success) {
              resolve(result.fileUrl);
            } else {
              reject(new Error(result.error || 'Failed to upload image'));
            }
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (error) {
      throw error;
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
    const total = (parseInt(processForm.noOfPkts1) || 0) +
      (parseInt(processForm.noOfPkts2) || 0) +
      (parseInt(processForm.noOfPkts3) || 0);
    setProcessForm(prev => ({ ...prev, totalPacket: total }));
  }, [processForm.noOfPkts1, processForm.noOfPkts2, processForm.noOfPkts3]);

  useEffect(() => {
    const total = (parseInt(editForm.noOfPkts1) || 0) +
      (parseInt(editForm.noOfPkts2) || 0) +
      (parseInt(editForm.noOfPkts3) || 0);
    setEditForm(prev => ({ ...prev, totalPacket: total }));
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
      munsiName: "",
      driverName: "",
      driverNumber: "",
      subCommodity1: "",
      noOfPkts1: "",
      subCommodity2: "",
      noOfPkts2: "",
      subCommodity3: "",
      noOfPkts3: "",
      totalPacket: 0,
      loadingBhartiSize: "",
      loadingQuantity: "",
      loadingPacketType: "",
      loadingPacketName: "",
      vehicleImage: null,
      imagePreview: null,
      loadingStatus: "Yes"
    });
    setShowProcessModal(true);
  };

  const handleEditClick = (indent) => {
    setEditingIndent(indent);
    setEditForm({
      plantName: indent.plantName || "",
      partyName: indent.partyName || "",
      vehicleNo: indent.vehicleNo || "",
      noOfPkts: indent.noOfPkts || "",
      bhartiSize: indent.bhartiSize || "",
      totalQty: indent.totalQty || "",
      tyreWeight: indent.tyreWeight || "",
      munsiName: indent.munsiName || "",
      driverName: indent.driverName || "",
      driverNumber: indent.driverNumber || "",
      subCommodity1: indent.subCommodity1 || "",
      noOfPkts1: indent.noOfPkts1 || "",
      subCommodity2: indent.subCommodity2 || "",
      noOfPkts2: indent.noOfPkts2 || "",
      subCommodity3: indent.subCommodity3 || "",
      noOfPkts3: indent.noOfPkts3 || "",
      totalPacket: parseInt(indent.totalPacket) || 0,
      loadingBhartiSize: indent.loadingBhartiSize || "",
      loadingQuantity: indent.loadingQuantity || "",
      loadingPacketType: indent.loadingPacketType || "",
      loadingPacketName: indent.loadingPacketName || "",
      vehicleImage: null,
      imagePreview: formatGoogleDriveImageUrl(indent.vehicleImage) || null,
      loadingStatus: indent.loadingStatus || "Complete"
    });
    setShowEditModal(true);
  };

  const handleViewImage = (imageUrl) => {
    const formattedUrl = formatGoogleDriveImageUrl(imageUrl);
    if (formattedUrl) {
      window.open(formattedUrl, '_blank', 'noopener,noreferrer');
    }
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

  // Handler for dropdown blur
  const handleDropdownBlur = (field) => {
    setTimeout(() => {
      setShowDropdowns((prev) => ({
        ...prev,
        [field]: false,
      }));
    }, 200);
  };

  const handleEditDropdownBlur = (field) => {
    setTimeout(() => {
      setShowEditDropdowns((prev) => ({
        ...prev,
        [field]: false,
      }));
    }, 200);
  };

  // Handler for regular input changes
  const handleProcessInputChange = (e) => {
    const { name, value } = e.target;
    setProcessForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle image upload
  const handleImageUpload = (e, formType = 'process') => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (formType === 'process') {
          setProcessForm(prev => ({
            ...prev,
            vehicleImage: file,
            imagePreview: reader.result
          }));
        } else {
          setEditForm(prev => ({
            ...prev,
            vehicleImage: file,
            imagePreview: reader.result
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Process form submission
  const handleProcessSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Generate timestamp in YYYY/MM/DD hh:mm:ss AM/PM format
      const now = new Date();
      let hours = now.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const timestamp = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${ampm}`;

      // Upload image if exists
      let imageUrl = '';
      if (processForm.vehicleImage) {
        imageUrl = await uploadImageToDrive(processForm.vehicleImage);
      }

      // 1. Prepare Row for Loading Complete Sheet (Insert)
      // Columns A-S: Timestamp(A), RST No(B), TR Type(C), Munsi(D), Driver(E), Driver#(F), 
      // Sub1(G), Pkts1(H), Sub2(I), Pkts2(J), Sub3(K), Pkts3(L), Total(M), 
      // LBharti(N), LQty(O), LType(P), LName(Q), Image(R), Status(S)
      const loadingCompleteRow = [
        timestamp,                        // A - Timestamp
        selectedIndent.rstNo,             // B - RST No
        selectedIndent.trType,            // C - TR Type
        processForm.munsiName,            // D - Munsi Name
        processForm.driverName,           // E - Driver Name
        processForm.driverNumber,         // F - Driver Number
        processForm.subCommodity1,        // G - Sub Commodity 1
        processForm.noOfPkts1,            // H - No. of PKTS 1
        processForm.subCommodity2,        // I - Sub Commodity 2
        processForm.noOfPkts2,            // J - No. of PKTS 2
        processForm.subCommodity3,        // K - Sub Commodity 3
        processForm.noOfPkts3,            // L - No. of PKTS 3
        processForm.totalPacket,          // M - Total Packet
        processForm.loadingBhartiSize,    // N - Loading Bharti Size
        processForm.loadingQuantity,      // O - Loading Quantity
        processForm.loadingPacketType,    // P - Loading Packet Type
        processForm.loadingPacketName,    // Q - Loading Packet Name
        imageUrl,                         // R - Vehicle Image
        processForm.loadingStatus         // S - Loading Status
      ];

      // API Call 1: Insert into Loading Complete Sheet
      const insertResponse = await fetch(API_URL, {
        method: 'POST',
        body: new URLSearchParams({
          action: 'insert',
          sheetName: LOADING_COMPLETE_SHEET,
          rowData: JSON.stringify(loadingCompleteRow)
        })
      });

      const insertResult = await insertResponse.json();
      if (!insertResult.success) {
        throw new Error(insertResult.error || 'Failed to save to Loading Complete sheet');
      }



      showToast('Loading completed successfully!', 'success');

      // Reset form
      setProcessForm({
        munsiName: "",
        driverName: "",
        driverNumber: "",
        subCommodity1: "",
        noOfPkts1: "",
        subCommodity2: "",
        noOfPkts2: "",
        subCommodity3: "",
        noOfPkts3: "",
        totalPacket: 0,
        loadingBhartiSize: "",
        loadingQuantity: "",
        loadingPacketType: "",
        loadingPacketName: "",
        vehicleImage: null,
        imagePreview: null,
        loadingStatus: "Yes"
      });

      setSelectedIndent(null);
      setShowProcessModal(false);
      await fetchIndents();

    } catch (error) {
      console.error('Error completing loading:', error);
      showToast(`Error completing loading: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      let imageUrl = editingIndent.vehicleImage;
      if (editForm.vehicleImage) {
        imageUrl = await uploadImageToDrive(editForm.vehicleImage);
      }

      // 1. Update Loading Complete Sheet
      // Columns A-R: Timestamp, Indent, Munsi(C), Driver(D), Driver#(E), Sub1(F), Pkts1(G), Sub2(H), Pkts2(I), Sub3(J), Pkts3(K), Total(L), LBharti(M), LQty(N), LType(O), LName(P), Image(Q), Status(R)

      const loadingCompleteRow = [
        "", // A - Do NOT update timestamp (empty string preserves original)
        editingIndent.indentNo, // B - Keep original Indent No
        editForm.munsiName, // C
        editForm.driverName, // D
        editForm.driverNumber, // E
        editForm.subCommodity1, // F
        editForm.noOfPkts1, // G
        editForm.subCommodity2, // H
        editForm.noOfPkts2, // I
        editForm.subCommodity3, // J
        editForm.noOfPkts3, // K
        editForm.totalPacket, // L
        editForm.loadingBhartiSize, // M
        editForm.loadingQuantity, // N
        editForm.loadingPacketType, // O
        editForm.loadingPacketName, // P
        imageUrl, // Q
        editForm.loadingStatus // R
      ];

      // 1. Fetch latest data to find the correct row index by Indent No (Column B) to ensure we update the correct match
      // This prevents "storing new" or updating the wrong row if the sheet has changed
      let targetRowIndex = editingIndent.rowIndex; // Default to existing if fetch fails

      try {
        const checkResponse = await fetch(`${API_URL}?sheet=${LOADING_COMPLETE_SHEET}&action=getData`);
        if (checkResponse.ok) {
          const checkResult = await checkResponse.json();
          if (checkResult.success && checkResult.data) {
            const sheetData = checkResult.data;
            // Start from row 7 (index 6) as per existing logic
            for (let i = 6; i < sheetData.length; i++) {
              // Check Column B (Index 1) for Indent No match
              if (sheetData[i][1] && String(sheetData[i][1]).trim() === String(editingIndent.indentNo).trim()) {
                targetRowIndex = i + 1; // 1-based Row Index
                break;
              }
            }
          }
        }
      } catch (err) {
        console.warn("Could not verify row index, using cached index", err);
      }

      await fetch(API_URL, {
        method: 'POST',
        body: new URLSearchParams({
          action: 'update',
          sheetName: LOADING_COMPLETE_SHEET,
          rowIndex: targetRowIndex,
          rowData: JSON.stringify(loadingCompleteRow)
        })
      });

      // 2. Dispatch Sheet update removed per user request.

      showToast('Indent updated successfully!', 'success');

      setEditForm({
        plantName: "",
        partyName: "",
        vehicleNo: "",
        noOfPkts: "",
        bhartiSize: "",
        totalQty: "",
        tyreWeight: "",
        munsiName: "",
        driverName: "",
        driverNumber: "",
        subCommodity1: "",
        noOfPkts1: "",
        subCommodity2: "",
        noOfPkts2: "",
        subCommodity3: "",
        noOfPkts3: "",
        totalPacket: 0,
        loadingBhartiSize: "",
        loadingQuantity: "",
        loadingPacketType: "",
        loadingPacketName: "",
        vehicleImage: null,
        imagePreview: null,
        loadingStatus: "Complete"
      });

      setEditingIndent(null);
      setShowEditModal(false);
      await fetchIndents();

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

    setSearchTerms({
      subCommodity1: "",
      subCommodity2: "",
      subCommodity3: "",
    });

    setShowDropdowns({
      subCommodity1: false,
      subCommodity2: false,
      subCommodity3: false,
    });
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditingIndent(null);

    setEditSearchTerms({
      subCommodity1: "",
      subCommodity2: "",
      subCommodity3: "",
    });

    setShowEditDropdowns({
      subCommodity1: false,
      subCommodity2: false,
      subCommodity3: false,
    });
  };

  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  // ==================== HISTORY EDIT HANDLERS ====================

  // Handle history edit click
  const handleHistoryEditClick = (item) => {
    setSelectedHistoryItem(item);
    setHistoryEditForm({
      munsiName: item.munsiName || "",
      driverName: item.driverName || "",
      driverNumber: item.driverNumber || "",
      subCommodity1: item.subCommodity1 || "",
      noOfPkts1: item.noOfPkts1 || "",
      subCommodity2: item.subCommodity2 || "",
      noOfPkts2: item.noOfPkts2 || "",
      subCommodity3: item.subCommodity3 || "",
      noOfPkts3: item.noOfPkts3 || "",
      totalPacket: parseInt(item.totalPacket) || 0,
      loadingBhartiSize: item.loadingBhartiSize || "",
      loadingQuantity: item.loadingQuantity || "",
      loadingPacketType: item.loadingPacketType || "",
      loadingPacketName: item.loadingPacketName || "",
      vehicleImage: null,
      imagePreview: formatGoogleDriveImageUrl(item.vehicleImage) || null,
      loadingStatus: item.loadingStatus || "Complete"
    });
    setHistoryEditSearchTerms({
      subCommodity1: "",
      subCommodity2: "",
      subCommodity3: "",
    });
    setShowHistoryEditDropdowns({
      subCommodity1: false,
      subCommodity2: false,
      subCommodity3: false,
    });
    setShowHistoryEditModal(true);
  };

  // History edit dropdown handlers
  const handleHistoryEditDropdownSelect = (field, value) => {
    setHistoryEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHistoryEditSearchTerms((prev) => ({
      ...prev,
      [field]: "",
    }));
    setShowHistoryEditDropdowns((prev) => ({
      ...prev,
      [field]: false,
    }));
  };

  const handleHistoryEditSearchChange = (field, value) => {
    setHistoryEditSearchTerms((prev) => ({
      ...prev,
      [field]: value,
    }));
    setShowHistoryEditDropdowns((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const handleHistoryEditDropdownFocus = (field) => {
    setShowHistoryEditDropdowns((prev) => ({
      ...prev,
      [field]: true,
    }));
    setHistoryEditSearchTerms((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const handleHistoryEditDropdownBlur = (field) => {
    setTimeout(() => {
      setShowHistoryEditDropdowns((prev) => ({
        ...prev,
        [field]: false,
      }));
    }, 200);
  };

  // History edit input change
  const handleHistoryEditInputChange = (e) => {
    const { name, value } = e.target;
    setHistoryEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle history edit image upload
  const handleHistoryEditImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setHistoryEditForm(prev => ({
          ...prev,
          vehicleImage: file,
          imagePreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculate total packets for history edit form
  useEffect(() => {
    const total = (parseInt(historyEditForm.noOfPkts1) || 0) +
      (parseInt(historyEditForm.noOfPkts2) || 0) +
      (parseInt(historyEditForm.noOfPkts3) || 0);
    setHistoryEditForm(prev => ({ ...prev, totalPacket: total }));
  }, [historyEditForm.noOfPkts1, historyEditForm.noOfPkts2, historyEditForm.noOfPkts3]);

  // Save history edit
  const handleSaveHistoryEdit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Generate timestamp in YYYY-MM-DD HH:mm:ss format
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // Upload image if new one is selected
      let imageUrl = selectedHistoryItem.vehicleImage || '';
      if (historyEditForm.vehicleImage) {
        try {
          imageUrl = await uploadImageToDrive(historyEditForm.vehicleImage);
        } catch (imageError) {
          console.error('Image upload failed:', imageError);
          showToast('Image upload failed, continuing without image update', 'warning');
        }
      }

      // Find the correct row in Loading Complete sheet by RST No
      let targetRowIndex = selectedHistoryItem.rowIndex;
      try {
        const checkResponse = await fetch(`${API_URL}?sheet=${LOADING_COMPLETE_SHEET}&action=getData`);
        if (checkResponse.ok) {
          const checkResult = await checkResponse.json();
          if (checkResult.success && checkResult.data) {
            const sheetData = checkResult.data;
            for (let i = 6; i < sheetData.length; i++) {
              if (sheetData[i][1] && String(sheetData[i][1]).trim() === String(selectedHistoryItem.rstNo).trim()) {
                targetRowIndex = i + 1;
                break;
              }
            }
          }
        }
      } catch (err) {
        console.warn("Could not verify row index, using cached index", err);
      }

      // Update Loading Complete Sheet - Columns A-S
      // A: Timestamp (update with new), B: RST No, C: TR Type, D: Munsi, E: Driver, F: Driver#,
      // G: Sub1, H: Pkts1, I: Sub2, J: Pkts2, K: Sub3, L: Pkts3, M: Total,
      // N: LBharti, O: LQty, P: LType, Q: LName, R: Image, S: Status
      const loadingCompleteRow = [
        timestamp,                           // A - Timestamp (updated)
        selectedHistoryItem.rstNo,           // B - RST No (keep original)
        selectedHistoryItem.trType,          // C - TR Type (keep original)
        historyEditForm.munsiName,           // D - Munsi Name
        historyEditForm.driverName,          // E - Driver Name
        historyEditForm.driverNumber,        // F - Driver Number
        historyEditForm.subCommodity1,       // G - Sub Commodity 1
        historyEditForm.noOfPkts1,           // H - No. of PKTS 1
        historyEditForm.subCommodity2,       // I - Sub Commodity 2
        historyEditForm.noOfPkts2,           // J - No. of PKTS 2
        historyEditForm.subCommodity3,       // K - Sub Commodity 3
        historyEditForm.noOfPkts3,           // L - No. of PKTS 3
        historyEditForm.totalPacket,         // M - Total Packet
        historyEditForm.loadingBhartiSize,   // N - Loading Bharti Size
        historyEditForm.loadingQuantity,     // O - Loading Quantity
        historyEditForm.loadingPacketType,   // P - Loading Packet Type
        historyEditForm.loadingPacketName,   // Q - Loading Packet Name
        imageUrl,                            // R - Vehicle Image
        historyEditForm.loadingStatus        // S - Loading Status
      ];

      const response = await fetch(API_URL, {
        method: 'POST',
        body: new URLSearchParams({
          action: 'update',
          sheetName: LOADING_COMPLETE_SHEET,
          rowIndex: targetRowIndex,
          rowData: JSON.stringify(loadingCompleteRow)
        })
      });

      const result = await response.json();

      if (result.success) {
        showToast('Record updated successfully!', 'success');

        // Reset form and close modal
        setHistoryEditForm({
          munsiName: "",
          driverName: "",
          driverNumber: "",
          subCommodity1: "",
          noOfPkts1: "",
          subCommodity2: "",
          noOfPkts2: "",
          subCommodity3: "",
          noOfPkts3: "",
          totalPacket: 0,
          loadingBhartiSize: "",
          loadingQuantity: "",
          loadingPacketType: "",
          loadingPacketName: "",
          vehicleImage: null,
          imagePreview: null,
          loadingStatus: "Complete"
        });
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

  // Cancel history edit
  const handleHistoryEditCancel = () => {
    setShowHistoryEditModal(false);
    setSelectedHistoryItem(null);
    setHistoryEditForm({
      munsiName: "",
      driverName: "",
      driverNumber: "",
      subCommodity1: "",
      noOfPkts1: "",
      subCommodity2: "",
      noOfPkts2: "",
      subCommodity3: "",
      noOfPkts3: "",
      totalPacket: 0,
      loadingBhartiSize: "",
      loadingQuantity: "",
      loadingPacketType: "",
      loadingPacketName: "",
      vehicleImage: null,
      imagePreview: null,
      loadingStatus: "Complete"
    });
    setHistoryEditSearchTerms({
      subCommodity1: "",
      subCommodity2: "",
      subCommodity3: "",
    });
    setShowHistoryEditDropdowns({
      subCommodity1: false,
      subCommodity2: false,
      subCommodity3: false,
    });
  };

  // Filter options for history edit dropdowns
  const filteredHistoryEditSubCommodity1 = dropdownOptions.subCommodity.filter(commodity =>
    commodity.toLowerCase().includes(historyEditSearchTerms.subCommodity1.toLowerCase())
  );

  const filteredHistoryEditSubCommodity2 = dropdownOptions.subCommodity.filter(commodity =>
    commodity.toLowerCase().includes(historyEditSearchTerms.subCommodity2.toLowerCase())
  );

  const filteredHistoryEditSubCommodity3 = dropdownOptions.subCommodity.filter(commodity =>
    commodity.toLowerCase().includes(historyEditSearchTerms.subCommodity3.toLowerCase())
  );

  // ==================== END HISTORY EDIT HANDLERS ====================

  // Check if any filter is active
  const hasActiveFilters = Object.values(filters).some(value => value !== "");

  // Filter options based on search
  const filteredSubCommodity1 = dropdownOptions.subCommodity.filter(commodity =>
    commodity.toLowerCase().includes(searchTerms.subCommodity1.toLowerCase())
  );

  const filteredSubCommodity2 = dropdownOptions.subCommodity.filter(commodity =>
    commodity.toLowerCase().includes(searchTerms.subCommodity2.toLowerCase())
  );

  const filteredSubCommodity3 = dropdownOptions.subCommodity.filter(commodity =>
    commodity.toLowerCase().includes(searchTerms.subCommodity3.toLowerCase())
  );

  const filteredEditSubCommodity1 = dropdownOptions.subCommodity.filter(commodity =>
    commodity.toLowerCase().includes(editSearchTerms.subCommodity1.toLowerCase())
  );

  const filteredEditSubCommodity2 = dropdownOptions.subCommodity.filter(commodity =>
    commodity.toLowerCase().includes(editSearchTerms.subCommodity2.toLowerCase())
  );

  const filteredEditSubCommodity3 = dropdownOptions.subCommodity.filter(commodity =>
    commodity.toLowerCase().includes(editSearchTerms.subCommodity3.toLowerCase())
  );

  // Render searchable dropdown component
  const renderSearchableDropdown = (field, label, filteredOptions, placeholder, value) => (
    <div className="relative">
      <label className="block mb-1.5 text-sm font-medium text-gray-700">
        {label}
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

  const renderEditSearchableDropdown = (field, label, filteredOptions, placeholder, value) => (
    <div className="relative">
      <label className="block mb-1.5 text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={showEditDropdowns[field] ? editSearchTerms[field] : value}
          onChange={(e) => handleEditSearchChange(field, e.target.value)}
          onFocus={() => handleEditDropdownFocus(field)}
          onBlur={() => handleEditDropdownBlur(field)}
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

      {showEditDropdowns[field] && !loading && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={index}
                onClick={() => handleEditDropdownSelect(field, option)}
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

  // Image upload section with camera option
  const renderImageUploadSection = (formType = 'process') => (
    <div className="md:col-span-2">
      <label className="block mb-1.5 text-sm font-medium text-gray-700">
        Vehicle Image
      </label>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50">
            {(formType === 'process' ? processForm.imagePreview : editForm.imagePreview) ? (
              <img
                src={formType === 'process' ? processForm.imagePreview : editForm.imagePreview}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-xs text-gray-500">Upload</p>
              </div>
            )}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, formType)}
              disabled={loading}
            />
          </label>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">Vehicle image (optional)</p>
            <p className="text-xs text-gray-500">Supported formats: JPG, PNG, JPEG</p>
          </div>
        </div>

        {/* Camera Option */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Or</span>
          <button
            type="button"
            onClick={openCamera}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-800 rounded-md hover:bg-red-900 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            <Camera className="w-4 h-4" />
            Take Photo
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[88vh] bg-gray-50 flex flex-col overflow-auto">
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Loading Complete</h1>
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
                    { key: 'trType', label: 'TR Type', placeholder: 'Search TR type...' },
                    { key: 'rstNo', label: 'RST No', placeholder: 'Search RST...' },
                    { key: 'party', label: 'Party', placeholder: 'Search party...' },
                    { key: 'place', label: 'Place', placeholder: 'Search place...' },
                    { key: 'truckNo', label: 'Truck No', placeholder: 'Search truck...' },
                    { key: 'item', label: 'Item', placeholder: 'Search item...' },
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
                        Showing <span className="font-semibold">{filteredPending.length}</span> pending loading indents
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
                                    Complete
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
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.remarks || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.vehicleReached || '-'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="21" className="px-6 py-12 text-center text-gray-500">
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
                              <button onClick={() => handleProcessClick(item)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900" disabled={loading}>Complete</button>
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
                        Showing <span className="font-semibold">{filteredHistory.length}</span> completed loading indents
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
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">RST No</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">TR Type</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Plant Name</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Party</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Truck No</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Total Bag</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Bharti Size</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Total Qty</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Tare WT</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Munsi Name</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Driver Name</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Driver No</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Sub Comm 1</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">PKTS 1</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Sub Comm 2</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">PKTS 2</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Sub Comm 3</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">PKTS 3</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Total Packet</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Loading Bharti</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Loading Qty</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Packet Type</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Packet Name</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Image</th>
                            <th className="px-3 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Status</th>
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
                                <td className="px-3 py-2 text-sm font-semibold text-gray-900 whitespace-nowrap">{item.rstNo || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.trType || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.plantName || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.party || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 font-mono whitespace-nowrap">{item.truckNo || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.totalBag || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.bhartiSize || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.totalQty || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.tareWt || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.munsiName || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.driverName || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.driverNumber || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.subCommodity1 || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.noOfPkts1 || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.subCommodity2 || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.noOfPkts2 || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.subCommodity3 || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.noOfPkts3 || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.totalPacket || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.loadingBhartiSize || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.loadingQuantity || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.loadingPacketType || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.loadingPacketName || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
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
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.loadingStatus || '-'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="26" className="px-6 py-12 text-center text-gray-500">
                                <div className="flex flex-col gap-2 items-center">
                                  <CheckCircle className="w-8 h-8 text-gray-400" />
                                  <span>No completed records found</span>
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
                                <p className="text-xs text-gray-600">{item.trType} | {item.plantName || '-'}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleHistoryEditClick(item)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md">
                                  <Edit className="w-4 h-4" />
                                </button>
                                {item.vehicleImage && (
                                  <button onClick={() => handleViewImage(item.vehicleImage)} className="p-1.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-gray-500">Party:</span> <span className="font-medium">{item.party || '-'}</span></div>
                              <div><span className="text-gray-500">Truck:</span> <span className="font-medium font-mono">{item.truckNo || '-'}</span></div>
                              <div><span className="text-gray-500">Total Bag:</span> <span className="font-medium">{item.totalBag || '-'}</span></div>
                              <div><span className="text-gray-500">Total Qty:</span> <span className="font-medium">{item.totalQty || '-'}</span></div>
                              <div><span className="text-gray-500">Loading Qty:</span> <span className="font-medium">{item.loadingQuantity || '-'}</span></div>
                              <div><span className="text-gray-500">Status:</span> <span className={`font-medium ${item.loadingStatus === 'Complete' ? 'text-green-600' : 'text-orange-600'}`}>{item.loadingStatus || '-'}</span></div>
                            </div>
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

            {/* Process Modal */}
            {
              showProcessModal && selectedIndent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Complete Loading - {selectedIndent.rstNo}
                      </h3>
                      <button
                        onClick={handleCancel}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                        disabled={loading}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="p-4 space-y-6">
                      {/* Pre-filled Indent Information */}
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dispatch Details</p>
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

                      {/* Loading Complete Form */}
                      <form onSubmit={handleProcessSubmit}>
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Loading Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg border border-gray-200">
                          {/* Munsi Name */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Munsi Name
                            </label>
                            <select
                              name="munsiName"
                              value={processForm.munsiName}
                              onChange={handleProcessInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              disabled={loading}
                            >
                              <option value="">Select Munsi</option>
                              {dropdownOptions.munsiName.map((munsi, index) => (
                                <option key={index} value={munsi}>{munsi}</option>
                              ))}
                            </select>
                          </div>

                          {/* Driver Name */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Driver Name
                            </label>
                            <input
                              type="text"
                              name="driverName"
                              value={processForm.driverName}
                              onChange={handleProcessInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              placeholder="Enter driver name"
                              autoComplete="off"
                              disabled={loading}
                            />
                          </div>

                          {/* Driver Number */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Driver Number
                            </label>
                            <input
                              type="text"
                              name="driverNumber"
                              value={processForm.driverNumber}
                              onChange={handleProcessInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              placeholder="Enter driver number"
                              autoComplete="off"
                              disabled={loading}
                            />
                          </div>

                          {/* Sub Commodity 1 */}
                          {renderSearchableDropdown(
                            'subCommodity1',
                            'Sub Commodity 1',
                            filteredSubCommodity1,
                            'Search commodity...',
                            processForm.subCommodity1
                          )}

                          {/* No. of PKTS 1 */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              No. of PKTS 1
                            </label>
                            <input
                              type="number"
                              name="noOfPkts1"
                              value={processForm.noOfPkts1}
                              onChange={handleProcessInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              placeholder="Enter number of packets"
                              disabled={loading}
                            />
                          </div>

                          {/* Sub Commodity 2 */}
                          {renderSearchableDropdown(
                            'subCommodity2',
                            'Sub Commodity 2',
                            filteredSubCommodity2,
                            'Search commodity...',
                            processForm.subCommodity2
                          )}

                          {/* No. of PKTS 2 */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              No. of PKTS 2
                            </label>
                            <input
                              type="number"
                              name="noOfPkts2"
                              value={processForm.noOfPkts2}
                              onChange={handleProcessInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              placeholder="Enter number of packets"
                              disabled={loading}
                            />
                          </div>

                          {/* Sub Commodity 3 */}
                          {renderSearchableDropdown(
                            'subCommodity3',
                            'Sub Commodity 3',
                            filteredSubCommodity3,
                            'Search commodity...',
                            processForm.subCommodity3
                          )}

                          {/* No. of PKTS 3 */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              No. of PKTS 3
                            </label>
                            <input
                              type="number"
                              name="noOfPkts3"
                              value={processForm.noOfPkts3}
                              onChange={handleProcessInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              placeholder="Enter number of packets"
                              disabled={loading}
                            />
                          </div>

                          {/* Total Packet (Auto-calculated) */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Total Packet
                            </label>
                            <div className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                              {processForm.totalPacket}
                            </div>
                          </div>

                          {/* Loading Bharti Size */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Loading Bharti Size
                            </label>
                            <input
                              type="text"
                              name="loadingBhartiSize"
                              value={processForm.loadingBhartiSize}
                              onChange={handleProcessInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              placeholder="Enter loading bharti size"
                              autoComplete="off"
                              disabled={loading}
                            />
                          </div>

                          {/* Loading Quantity */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Loading Quantity
                            </label>
                            <input
                              type="number"
                              name="loadingQuantity"
                              value={processForm.loadingQuantity}
                              onChange={handleProcessInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              placeholder="Enter loading quantity"
                              disabled={loading}
                            />
                          </div>

                          {/* Loading Packet Type */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Loading Packet Type
                            </label>
                            <input
                              type="text"
                              name="loadingPacketType"
                              value={processForm.loadingPacketType}
                              onChange={handleProcessInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              placeholder="Enter loading packet type"
                              autoComplete="off"
                              disabled={loading}
                            />
                          </div>

                          {/* Loading Packet Name */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Loading Packet Name
                            </label>
                            <input
                              type="text"
                              name="loadingPacketName"
                              value={processForm.loadingPacketName}
                              onChange={handleProcessInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              placeholder="Enter loading packet name"
                              autoComplete="off"
                              disabled={loading}
                            />
                          </div>

                          {/* Vehicle Image */}
                          {renderImageUploadSection('process')}

                          {/* Loading Status */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Loading Status
                            </label>
                            <select
                              name="loadingStatus"
                              value={processForm.loadingStatus}
                              onChange={handleProcessInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              disabled={loading}
                            >
                              <option value="Complete">Complete</option>
                            </select>
                          </div>
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
                              'Save'
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )
            }

            {/* Edit Modal */}
            {
              showEditModal && editingIndent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Edit Loading Complete - {editingIndent.indentNo}
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
                      <form onSubmit={handleEditSubmit}>
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Edit Loading Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg border border-gray-200">
                          {/* Munsi Name */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Munsi Name
                            </label>
                            <select
                              name="munsiName"
                              value={editForm.munsiName}
                              onChange={handleEditInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              disabled={loading}
                            >
                              <option value="">Select Munsi</option>
                              {dropdownOptions.munsiName.map((munsi, index) => (
                                <option key={index} value={munsi}>{munsi}</option>
                              ))}
                            </select>
                          </div>

                          {/* Driver Name */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Driver Name
                            </label>
                            <input
                              type="text"
                              name="driverName"
                              value={editForm.driverName}
                              onChange={handleEditInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              placeholder="Enter driver name"
                              autoComplete="off"
                              disabled={loading}
                            />
                          </div>

                          {/* Driver Number */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Driver Number
                            </label>
                            <input
                              type="text"
                              name="driverNumber"
                              value={editForm.driverNumber}
                              onChange={handleEditInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              placeholder="Enter driver number"
                              autoComplete="off"
                              disabled={loading}
                            />
                          </div>

                          {/* Sub Commodity 1 */}
                          {renderEditSearchableDropdown(
                            'subCommodity1',
                            'Sub Commodity 1',
                            filteredEditSubCommodity1,
                            'Search commodity...',
                            editForm.subCommodity1
                          )}

                          {/* No. of PKTS 1 */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              No. of PKTS 1
                            </label>
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

                          {/* Sub Commodity 2 */}
                          {renderEditSearchableDropdown(
                            'subCommodity2',
                            'Sub Commodity 2',
                            filteredEditSubCommodity2,
                            'Search commodity...',
                            editForm.subCommodity2
                          )}

                          {/* No. of PKTS 2 */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              No. of PKTS 2
                            </label>
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

                          {/* Sub Commodity 3 */}
                          {renderEditSearchableDropdown(
                            'subCommodity3',
                            'Sub Commodity 3',
                            filteredEditSubCommodity3,
                            'Search commodity...',
                            editForm.subCommodity3
                          )}

                          {/* No. of PKTS 3 */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              No. of PKTS 3
                            </label>
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

                          {/* Total Packet (Auto-calculated) */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Total Packet
                            </label>
                            <div className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-900">
                              {editForm.totalPacket}
                            </div>
                          </div>

                          {/* Loading Bharti Size */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Loading Bharti Size
                            </label>
                            <input
                              type="text"
                              name="loadingBhartiSize"
                              value={editForm.loadingBhartiSize}
                              onChange={handleEditInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              placeholder="Enter loading bharti size"
                              autoComplete="off"
                              disabled={loading}
                            />
                          </div>

                          {/* Loading Quantity */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Loading Quantity
                            </label>
                            <input
                              type="number"
                              name="loadingQuantity"
                              value={editForm.loadingQuantity}
                              onChange={handleEditInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              placeholder="Enter loading quantity"
                              disabled={loading}
                            />
                          </div>

                          {/* Loading Packet Type */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Loading Packet Type
                            </label>
                            <input
                              type="text"
                              name="loadingPacketType"
                              value={editForm.loadingPacketType}
                              onChange={handleEditInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              placeholder="Enter loading packet type"
                              autoComplete="off"
                              disabled={loading}
                            />
                          </div>

                          {/* Loading Packet Name */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Loading Packet Name
                            </label>
                            <input
                              type="text"
                              name="loadingPacketName"
                              value={editForm.loadingPacketName}
                              onChange={handleEditInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              placeholder="Enter loading packet name"
                              autoComplete="off"
                              disabled={loading}
                            />
                          </div>

                          {/* Vehicle Image */}
                          {renderImageUploadSection('edit')}

                          {/* Loading Status */}
                          <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700">
                              Loading Status
                            </label>
                            <select
                              name="loadingStatus"
                              value={editForm.loadingStatus}
                              onChange={handleEditInputChange}
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent disabled:opacity-50"
                              disabled={loading}
                            >
                              <option value="Complete">Complete</option>
                              <option value="Not Complete">Not Complete</option>
                            </select>
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
                              'Update'
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )
            }

            {/* Camera Modal */}
            {
              showCamera && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                    <div className="flex justify-between items-center p-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Take Photo</h3>
                      <button
                        onClick={closeCamera}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                        disabled={loading}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="p-4">
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-64 object-cover"
                        />
                        {!isCameraActive && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                            <div className="text-white text-center">
                              <Camera className="w-12 h-12 mx-auto mb-2" />
                              <p>Initializing camera...</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-center mt-4 gap-4">
                        <button
                          onClick={closeCamera}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={captureImage}
                          disabled={!isCameraActive || loading}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-800 rounded-md hover:bg-red-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Capture Photo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            {/* Image View Modal */}
            {
              showImageModal && selectedImage && (
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

                      <div className="flex justify-center mt-4">
                        <button
                          onClick={handleCloseImageModal}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
          </div>
        </div>
      </div>

      {/* History Edit Modal */}
      {showHistoryEditModal && selectedHistoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[95vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 bg-gradient-to-r from-red-800 to-red-900">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Loading Record</h3>
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

            <form onSubmit={handleSaveHistoryEdit} className="flex-1 overflow-y-auto">
              {/* Prefilled Details (Read-only) */}
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Record Details (Read-only)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">RST No</span>
                    <p className="text-xs font-medium text-gray-800">{selectedHistoryItem.rstNo || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">TR Type</span>
                    <p className="text-xs font-medium text-gray-800">{selectedHistoryItem.trType || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Plant Name</span>
                    <p className="text-xs font-medium text-gray-800 break-words">{selectedHistoryItem.plantName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Party</span>
                    <p className="text-xs font-medium text-gray-800 break-words">{selectedHistoryItem.party || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Truck No</span>
                    <p className="text-xs font-medium text-gray-800">{selectedHistoryItem.truckNo || '-'}</p>
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
                    <span className="text-[10px] text-gray-400 uppercase">Tare WT</span>
                    <p className="text-xs font-medium text-gray-800">{selectedHistoryItem.tareWt || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="p-5 space-y-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Editable Fields</p>

                {/* Munsi & Driver Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Munsi Name</label>
                    <input
                      type="text"
                      name="munsiName"
                      value={historyEditForm.munsiName}
                      onChange={handleHistoryEditInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Driver Name</label>
                    <input
                      type="text"
                      name="driverName"
                      value={historyEditForm.driverName}
                      onChange={handleHistoryEditInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Driver Number</label>
                    <input
                      type="text"
                      name="driverNumber"
                      value={historyEditForm.driverNumber}
                      onChange={handleHistoryEditInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Sub Commodities */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sub Commodity 1 */}
                  <div className="relative">
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Sub Commodity 1</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={showHistoryEditDropdowns.subCommodity1 ? historyEditSearchTerms.subCommodity1 : historyEditForm.subCommodity1}
                        onChange={(e) => handleHistoryEditSearchChange('subCommodity1', e.target.value)}
                        onFocus={() => handleHistoryEditDropdownFocus('subCommodity1')}
                        onBlur={() => handleHistoryEditDropdownBlur('subCommodity1')}
                        className="w-full px-10 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent"
                        placeholder="Search..."
                        disabled={loading}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                    {showHistoryEditDropdowns.subCommodity1 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredHistoryEditSubCommodity1.length > 0 ? (
                          filteredHistoryEditSubCommodity1.map((option, index) => (
                            <div key={index} onClick={() => handleHistoryEditDropdownSelect('subCommodity1', option)} className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-100">{option}</div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">No options found</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">No. of PKTS 1</label>
                    <input
                      type="number"
                      name="noOfPkts1"
                      value={historyEditForm.noOfPkts1}
                      onChange={handleHistoryEditInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      disabled={loading}
                    />
                  </div>
                  <div></div>

                  {/* Sub Commodity 2 */}
                  <div className="relative">
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Sub Commodity 2</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={showHistoryEditDropdowns.subCommodity2 ? historyEditSearchTerms.subCommodity2 : historyEditForm.subCommodity2}
                        onChange={(e) => handleHistoryEditSearchChange('subCommodity2', e.target.value)}
                        onFocus={() => handleHistoryEditDropdownFocus('subCommodity2')}
                        onBlur={() => handleHistoryEditDropdownBlur('subCommodity2')}
                        className="w-full px-10 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent"
                        placeholder="Search..."
                        disabled={loading}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                    {showHistoryEditDropdowns.subCommodity2 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredHistoryEditSubCommodity2.length > 0 ? (
                          filteredHistoryEditSubCommodity2.map((option, index) => (
                            <div key={index} onClick={() => handleHistoryEditDropdownSelect('subCommodity2', option)} className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-100">{option}</div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">No options found</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">No. of PKTS 2</label>
                    <input
                      type="number"
                      name="noOfPkts2"
                      value={historyEditForm.noOfPkts2}
                      onChange={handleHistoryEditInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      disabled={loading}
                    />
                  </div>
                  <div></div>

                  {/* Sub Commodity 3 */}
                  <div className="relative">
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Sub Commodity 3</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={showHistoryEditDropdowns.subCommodity3 ? historyEditSearchTerms.subCommodity3 : historyEditForm.subCommodity3}
                        onChange={(e) => handleHistoryEditSearchChange('subCommodity3', e.target.value)}
                        onFocus={() => handleHistoryEditDropdownFocus('subCommodity3')}
                        onBlur={() => handleHistoryEditDropdownBlur('subCommodity3')}
                        className="w-full px-10 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent"
                        placeholder="Search..."
                        disabled={loading}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                    {showHistoryEditDropdowns.subCommodity3 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredHistoryEditSubCommodity3.length > 0 ? (
                          filteredHistoryEditSubCommodity3.map((option, index) => (
                            <div key={index} onClick={() => handleHistoryEditDropdownSelect('subCommodity3', option)} className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-100">{option}</div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">No options found</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">No. of PKTS 3</label>
                    <input
                      type="number"
                      name="noOfPkts3"
                      value={historyEditForm.noOfPkts3}
                      onChange={handleHistoryEditInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Total Packet</label>
                    <input
                      type="number"
                      name="totalPacket"
                      value={historyEditForm.totalPacket}
                      readOnly
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-100"
                    />
                  </div>
                </div>

                {/* Loading Details */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Loading Bharti Size</label>
                    <input
                      type="text"
                      name="loadingBhartiSize"
                      value={historyEditForm.loadingBhartiSize}
                      onChange={handleHistoryEditInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Loading Quantity</label>
                    <input
                      type="text"
                      name="loadingQuantity"
                      value={historyEditForm.loadingQuantity}
                      onChange={handleHistoryEditInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Loading Packet Type</label>
                    <input
                      type="text"
                      name="loadingPacketType"
                      value={historyEditForm.loadingPacketType}
                      onChange={handleHistoryEditInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Loading Packet Name</label>
                    <input
                      type="text"
                      name="loadingPacketName"
                      value={historyEditForm.loadingPacketName}
                      onChange={handleHistoryEditInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Image Upload & Loading Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Vehicle Image</label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleHistoryEditImageUpload}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md"
                        disabled={loading}
                      />
                    </div>
                    {/* Show existing image or new preview */}
                    <div className="mt-2">
                      {historyEditForm.vehicleImage ? (
                        // Show new image preview if user has selected a new image
                        <div>
                          <span className="text-xs text-green-600 block mb-1">New Image Selected:</span>
                          <img
                            src={historyEditForm.imagePreview}
                            alt="New Preview"
                            className="w-24 h-24 object-cover rounded-md border border-green-300"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : selectedHistoryItem.vehicleImage ? (
                        // Show existing image preview inline
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">Current Image:</span>
                          <img
                            src={formatGoogleDriveImageUrl(selectedHistoryItem.vehicleImage)}
                            alt="Current"
                            className="w-24 h-24 object-cover rounded-md border"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No image uploaded</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">Loading Status</label>
                    <select
                      name="loadingStatus"
                      value={historyEditForm.loadingStatus}
                      onChange={handleHistoryEditInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-800 focus:border-transparent"
                      disabled={loading}
                    >
                      <option value="Complete">Complete</option>
                      <option value="Pending">Pending</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 justify-end px-5 py-4 bg-gray-50 border-t border-gray-200 sticky bottom-0">
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
                      Saving...
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

export default LoadingComplete;