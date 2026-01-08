import React, { useState, useEffect } from "react";
import { Filter, X, Search, Clock, CheckCircle, ChevronDown, Loader2, FileText, Edit, Download } from "lucide-react";
import { useToast } from '../../contexts/ToastContext';
import { jsPDF } from 'jspdf';

const API_URL = import.meta.env.VITE_SHEET_API_URL;
const DROP_DOWN_SHEET = import.meta.env.VITE_SHEET_DROP_NAME;
const DISPATCH_SHEET = import.meta.env.VITE_SHEET_DISPATCH;
const UNLOADING_SHEET = import.meta.env.VITE_SHEET_UNLOADING;
const PDF_FOLDER_ID = "1VzfAvwto6bPYmfFKhBqzKmiB_x9u-RKc";

// Helper function to format date to DD/MM/YYYY
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return dateString;
    }
};

// Helper function to convert Drive download URL to preview URL
const getDrivePreviewUrl = (url) => {
    if (!url) return '';
    // Extract file ID from various Google Drive URL formats
    const match = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/view`;
    }
    return url;
};

// Helper function to format timestamp to YYYY-MM-DD hh:mm:ss
const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch {
        return dateString;
    }
};

// Helper function to format date to YYYY-MM-DD
const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return dateString;
    }
};

const PaddySlip = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState("pending");
    const [showFilters, setShowFilters] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(false);

    const [filters, setFilters] = useState({
        trType: "", rstNo: "", party: "", place: "", truckNo: "", item: "",
    });

    const [unloadingType, setUnloadingType] = useState("");
    const [unloadingStaffOptions, setUnloadingStaffOptions] = useState([]);

    const [paddyForm, setPaddyForm] = useState({
        unloadingStaff: "", partyName: "", vehicleNo: "", driverName: "",
        paddyReceived: "", paddyReturned: "", paddyType: "New", paddyQty: "",
        moisture: "", durst: "", jute: "", plastic: ""
    });

    const [otherForm, setOtherForm] = useState({
        unloadingStaff: "", partyName: "", vehicleNo: "", driverName: "",
        commodity: "", quality: "", noOfPkts: "", bhartiSize: "", qty: "",
        typeOfPkts: "", packetName: ""
    });

    const [pendingItems, setPendingItems] = useState([]);
    const [historyItems, setHistoryItems] = useState([]);
    const [filteredPending, setFilteredPending] = useState([]);
    const [filteredHistory, setFilteredHistory] = useState([]);

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editUnloadingType, setEditUnloadingType] = useState("Paddy Unloading");
    const [editPaddyForm, setEditPaddyForm] = useState({
        unloadingStaff: "", partyName: "", vehicleNo: "", driverName: "",
        paddyReceived: "", paddyReturned: "", paddyType: "New", paddyQty: "",
        moisture: "", durst: "", jute: "", plastic: ""
    });
    const [editOtherForm, setEditOtherForm] = useState({
        unloadingStaff: "", partyName: "", vehicleNo: "", driverName: "",
        commodity: "", quality: "", noOfPkts: "", bhartiSize: "", qty: "",
        typeOfPkts: "", packetName: ""
    });

    // Fetch dropdown options
    const fetchDropdownOptions = async () => {
        try {
            const response = await fetch(`${API_URL}?sheet=${DROP_DOWN_SHEET}&action=getData`);
            const data = await response.json();
            if (data.success && data.data) {
                const staffNames = [];
                for (let i = 1; i < data.data.length; i++) {
                    if (data.data[i][3]) staffNames.push(data.data[i][3].trim());
                }
                setUnloadingStaffOptions([...new Set(staffNames)]);
            }
        } catch (error) {
            console.error('Error fetching dropdown options:', error);
        }
    };

    // Fetch pending items from Dispatch sheet
    const fetchPendingItems = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}?sheet=${DISPATCH_SHEET}&action=getData`);
            const data = await response.json();
            if (data.success && data.data) {
                const pendingData = [];
                for (let i = 6; i < data.data.length; i++) {
                    const row = data.data[i];
                    if (row[1]) {
                        const hasAF = row[31] && row[31].toString().trim() !== '';
                        const hasAG = row[32] && row[32].toString().trim() !== '';
                        if (hasAF && !hasAG) {
                            pendingData.push({
                                id: i + 1, rowIndex: i + 1,
                                trType: row[1] || '', rstNo: row[2] || '', plantName: row[3] || '',
                                dispatcherName: row[4] || '', party: row[5] || '', place: row[6] || '',
                                truckNo: row[7] || '', item: row[8] || '', totalBag: row[9] || '',
                                bhartiSize: row[10] || '', totalQty: row[11] || '', tareWt: row[12] || '',
                                netWt: row[13] || '', grossWt: row[14] || '', jute: row[15] || '',
                                plastic: row[16] || '', tpNo: row[17] || '', tpWt: row[18] || '',
                                remarks: row[19] || '', vehicleReached: row[30] || ''
                            });
                        }
                    }
                }
                pendingData.reverse();
                setPendingItems(pendingData);
                setFilteredPending(pendingData);
            }
        } catch (error) {
            console.error('Error fetching pending items:', error);
            showToast('Failed to load pending items', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Fetch history from Vehicle Unloading Point sheet
    const fetchHistoryItems = async () => {
        try {
            const response = await fetch(`${API_URL}?sheet=${UNLOADING_SHEET}&action=getData`);
            const data = await response.json();
            if (data.success && data.data) {
                const historyData = [];
                for (let i = 6; i < data.data.length; i++) {
                    const row = data.data[i];
                    if (row[1]) {
                        const unloadingType = row[3] || '';
                        const isPaddy = unloadingType === 'Paddy Unloading' || row[4]?.startsWith('PN-');
                        historyData.push({
                            id: i + 1, rowIndex: i + 1,
                            timestamp: row[0] || '', serialNo: row[1] || '', rstNo: row[2] || '',
                            unloadingType: unloadingType, slipNo: row[4] || '', date: row[5] || '',
                            unloadingStaff: row[6] || '', partyName: row[7] || '', vehicleNo: row[8] || '',
                            driverName: row[9] || '',
                            isPaddy,
                            paddyReceived: row[10] || '', paddyReturn: row[11] || '', paddyType: row[12] || '',
                            paddyQty: row[13] || '', moisture: row[14] || '', dust: row[15] || '',
                            typeOfPkt: row[16] || '', jute: row[17] || '', plastic: row[18] || '',
                            pdfPaddy: row[19] || '',
                            commodity: row[20] || '', quality: row[21] || '', noOfPkts: row[22] || '',
                            bhartiSize: row[23] || '', qty: row[24] || '', typeOfPkts: row[25] || '',
                            pktName: row[26] || '', pdfOther: row[27] || ''
                        });
                    }
                }
                historyData.reverse();
                setHistoryItems(historyData);
                setFilteredHistory(historyData);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    useEffect(() => {
        fetchDropdownOptions();
        fetchPendingItems();
        fetchHistoryItems();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [filters, pendingItems, historyItems]);

    const applyFilters = () => {
        let fp = [...pendingItems];
        let fh = [...historyItems];
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                const val = filters[key].toLowerCase();
                fp = fp.filter(item => item[key]?.toString().toLowerCase().includes(val));
                fh = fh.filter(item => item[key]?.toString().toLowerCase().includes(val));
            }
        });
        setFilteredPending(fp);
        setFilteredHistory(fh);
    };

    const handleCompleteClick = (item) => {
        setSelectedItem(item);
        setUnloadingType("");
        setPaddyForm({
            unloadingStaff: "", partyName: item.party || "", vehicleNo: item.truckNo || "",
            driverName: "", paddyReceived: item.item || "", paddyReturned: "", paddyType: "New",
            paddyQty: "", moisture: "", durst: "", jute: item.jute || "", plastic: item.plastic || ""
        });
        setOtherForm({
            unloadingStaff: "", partyName: item.party || "", vehicleNo: item.truckNo || "",
            driverName: "", commodity: item.item || "", quality: "", noOfPkts: item.totalBag || "",
            bhartiSize: item.bhartiSize || "", qty: item.totalQty || "", typeOfPkts: "", packetName: ""
        });
        setShowFormModal(true);
    };

    const generateSerialNo = async () => {
        try {
            const response = await fetch(`${API_URL}?sheet=${UNLOADING_SHEET}&action=getData`);
            const data = await response.json();
            if (data.success && data.data) {
                const count = Math.max(0, data.data.length - 6) + 1;
                return `SN-${String(count).padStart(3, '0')}`;
            }
        } catch { }
        return 'SN-001';
    };

    const generateSlipNo = async (type) => {
        try {
            const response = await fetch(`${API_URL}?sheet=${UNLOADING_SHEET}&action=getData`);
            const data = await response.json();
            if (data.success && data.data) {
                const prefix = type === 'Paddy Unloading' ? 'PN-' : 'ON-';
                let count = 0;
                for (let i = 6; i < data.data.length; i++) {
                    if (data.data[i][4]?.startsWith(prefix)) count++;
                }
                return `${prefix}${String(count + 1).padStart(3, '0')}`;
            }
        } catch { }
        return type === 'Paddy Unloading' ? 'PN-001' : 'ON-001';
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const now = new Date();
            const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            const dateOnly = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            const serialNo = await generateSerialNo();
            const slipNo = await generateSlipNo(unloadingType);

            // Generate PDF
            let pdfLink = '';
            try {
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const margin = 12;
                const labelWidth = 55;
                let yPos = 18;

                // Yellow background for Other Unloading slip
                if (unloadingType === 'Other Unloading') {
                    doc.setFillColor(255, 255, 192); // Light yellow color
                    doc.rect(0, 0, pageWidth, pageHeight, 'F');
                }

                // Border
                doc.setDrawColor(0);
                doc.setLineWidth(0.5);
                doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

                // Header
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text('Shree Shyamji', pageWidth / 2, yPos, { align: 'center' });
                yPos += 8;
                doc.setFontSize(13);
                // Different header based on unloading type
                const headerTitle = unloadingType === 'Paddy Unloading' ? 'PADDY RECEIPT' : 'UNLOADING POINT';
                doc.text(headerTitle, pageWidth / 2, yPos, { align: 'center' });
                yPos += 12;

                // Slip No and Date row
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`No.: ${slipNo}`, margin, yPos);
                doc.text(`Date: ${formatDate(dateOnly)}`, pageWidth - margin, yPos, { align: 'right' });
                yPos += 8;

                // Separator line
                doc.setLineWidth(0.3);
                doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
                yPos += 4;

                // Helper function for adding table-style rows
                const addRow = (label, value, y) => {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.text(label, margin, y);
                    doc.setFont('helvetica', 'normal');
                    const valueX = margin + labelWidth;
                    doc.text(String(value || '-'), valueX, y);
                    return y + 6;
                };

                if (unloadingType === 'Paddy Unloading') {
                    yPos = addRow('UNLOADING STAFF', paddyForm.unloadingStaff, yPos);
                    yPos = addRow('PARTY NAME', paddyForm.partyName, yPos);
                    yPos = addRow('VEHICLE NO', paddyForm.vehicleNo, yPos);
                    yPos = addRow('DRIVER NAME', paddyForm.driverName, yPos);
                    yPos += 2;
                    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
                    yPos += 4;
                    yPos = addRow('PADDY RECEIVED (PKT)', paddyForm.paddyReceived, yPos);
                    yPos = addRow('PADDY RETURNED', paddyForm.paddyReturned, yPos);
                    yPos = addRow('PADDY TYPE', paddyForm.paddyType, yPos);
                    yPos = addRow('PADDY QTY', paddyForm.paddyQty, yPos);
                    yPos += 2;
                    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
                    yPos += 4;
                    yPos = addRow('MOISTURE', paddyForm.moisture, yPos);
                    yPos = addRow('DUST', paddyForm.durst, yPos);
                    yPos += 2;
                    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
                    yPos += 4;
                    doc.setFont('helvetica', 'bold');
                    doc.text('TYPE OF PKT:', margin, yPos);
                    yPos += 6;
                    doc.setFont('helvetica', 'normal');
                    doc.text(`JUTE: ${paddyForm.jute || '-'}`, margin + 5, yPos);
                    doc.text(`PLASTIC: ${paddyForm.plastic || '-'}`, margin + 50, yPos);
                } else {
                    yPos = addRow('UNLOADING STAFF', otherForm.unloadingStaff, yPos);
                    yPos = addRow('PARTY NAME', otherForm.partyName, yPos);
                    yPos = addRow('VEHICLE NO', otherForm.vehicleNo, yPos);
                    yPos = addRow('DRIVER NAME', otherForm.driverName, yPos);
                    yPos += 2;
                    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
                    yPos += 4;
                    yPos = addRow('COMMODITY', otherForm.commodity, yPos);
                    yPos = addRow('QUALITY', otherForm.quality, yPos);
                    yPos = addRow('NO. OF PKTS', otherForm.noOfPkts, yPos);
                    yPos = addRow('BHARTI SIZE', otherForm.bhartiSize, yPos);
                    yPos = addRow('QTY', otherForm.qty, yPos);
                    yPos = addRow('TYPE OF PKTS', otherForm.typeOfPkts, yPos);
                    yPos = addRow('PACKET NAME', otherForm.packetName, yPos);
                }

                // Signature section
                yPos += 20;
                doc.line(pageWidth - margin - 45, yPos, pageWidth - margin, yPos);
                yPos += 4;
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                doc.text('Signature', pageWidth - margin - 22, yPos, { align: 'center' });

                // Footer
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.text(`RST No: ${selectedItem.rstNo || '-'}`, margin, pageHeight - 14);
                doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - margin, pageHeight - 14, { align: 'right' });

                // Upload PDF to Google Drive
                const pdfBase64 = doc.output('datauristring').split(',')[1];
                const uploadResponse = await fetch(API_URL, {
                    method: 'POST',
                    body: new URLSearchParams({
                        action: 'uploadFile',
                        folderId: PDF_FOLDER_ID,
                        fileName: `Slip_${slipNo}_${Date.now()}.pdf`,
                        base64Data: pdfBase64,
                        mimeType: 'application/pdf'
                    })
                });
                const uploadResult = await uploadResponse.json();
                if (uploadResult.success && uploadResult.fileUrl) {
                    pdfLink = uploadResult.fileUrl;
                } else {
                    throw new Error(uploadResult.error || 'Failed to upload PDF to Drive');
                }
            } catch (pdfError) {
                console.error('PDF generation/upload error:', pdfError);
                showToast('PDF upload failed. Please check your API.', 'error');
            }

            let rowData;
            if (unloadingType === 'Paddy Unloading') {
                // Columns: A-Timestamp, B-SerialNo, C-RST, D-Type, E-SlipNo, F-Date, G-Staff, H-Party, I-Vehicle, J-Driver, K-Received, L-Return, M-PaddyType, N-Qty, O-Moisture, P-Dust, Q-TypePkt, R-Jute, S-Plastic, T-PDF
                rowData = [
                    timestamp, serialNo, selectedItem.rstNo, 'Paddy Unloading', slipNo, dateOnly,
                    paddyForm.unloadingStaff, paddyForm.partyName, paddyForm.vehicleNo,
                    paddyForm.driverName, paddyForm.paddyReceived, paddyForm.paddyReturned,
                    paddyForm.paddyType, paddyForm.paddyQty, paddyForm.moisture,
                    paddyForm.durst, '', paddyForm.jute, paddyForm.plastic, pdfLink
                ];
            } else {
                // Columns: A-Timestamp, B-SerialNo, C-RST, D-Type, E-SlipNo, F-Date, G-Staff, H-Party, I-Vehicle, J-Driver, K-T empty, U-Commodity, V-Quality, W-Pkts, X-Bharti, Y-Qty, Z-TypePkts, AA-PktName, AB-PDF
                rowData = [
                    timestamp, serialNo, selectedItem.rstNo, 'Other Unloading', slipNo, dateOnly,
                    otherForm.unloadingStaff, otherForm.partyName, otherForm.vehicleNo,
                    otherForm.driverName, '', '', '', '', '', '', '', '', '', '',
                    otherForm.commodity, otherForm.quality, otherForm.noOfPkts,
                    otherForm.bhartiSize, otherForm.qty, otherForm.typeOfPkts, otherForm.packetName, pdfLink
                ];
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                body: new URLSearchParams({
                    action: 'insert',
                    sheetName: UNLOADING_SHEET,
                    rowData: JSON.stringify(rowData)
                })
            });

            const result = await response.json();
            if (result.success) {
                // Update Dispatch sheet Column AG
                await fetch(API_URL, {
                    method: 'POST',
                    body: new URLSearchParams({
                        action: 'updateCell',
                        sheetName: DISPATCH_SHEET,
                        rowIndex: selectedItem.rowIndex,
                        columnIndex: 33, // Column AG
                        value: timestamp
                    })
                });

                showToast('Unloading slip created with PDF!', 'success');
                setShowFormModal(false);
                setSelectedItem(null);
                await fetchPendingItems();
                await fetchHistoryItems();
            } else {
                throw new Error(result.error || 'Failed to save');
            }
        } catch (error) {
            console.error('Error saving:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Edit handlers
    const handleEditClick = (item) => {
        setEditingItem(item);
        const type = item.isPaddy ? "Paddy Unloading" : "Other Unloading";
        setEditUnloadingType(type);
        if (item.isPaddy) {
            setEditPaddyForm({
                unloadingStaff: item.unloadingStaff || "",
                partyName: item.partyName || "",
                vehicleNo: item.vehicleNo || "",
                driverName: item.driverName || "",
                paddyReceived: item.paddyReceived || "",
                paddyReturned: item.paddyReturn || "",
                paddyType: item.paddyType || "New",
                paddyQty: item.paddyQty || "",
                moisture: item.moisture || "",
                durst: item.dust || "",
                jute: item.jute || "",
                plastic: item.plastic || ""
            });
        } else {
            setEditOtherForm({
                unloadingStaff: item.unloadingStaff || "",
                partyName: item.partyName || "",
                vehicleNo: item.vehicleNo || "",
                driverName: item.driverName || "",
                commodity: item.commodity || "",
                quality: item.quality || "",
                noOfPkts: item.noOfPkts || "",
                bhartiSize: item.bhartiSize || "",
                qty: item.qty || "",
                typeOfPkts: item.typeOfPkts || "",
                packetName: item.pktName || ""
            });
        }
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            // Ensure timestamp and date are in correct format
            const formattedTimestamp = formatTimestamp(editingItem.timestamp) || editingItem.timestamp;
            const formattedDate = formatDateOnly(editingItem.date) || editingItem.date;

            // Regenerate PDF with updated values
            let pdfLink = '';
            try {
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const margin = 12;
                const labelWidth = 55;
                let yPos = 18;

                // Yellow background for Other Unloading slip
                if (editUnloadingType === 'Other Unloading') {
                    doc.setFillColor(255, 255, 192);
                    doc.rect(0, 0, pageWidth, pageHeight, 'F');
                }

                // Border
                doc.setDrawColor(0);
                doc.setLineWidth(0.5);
                doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

                // Header
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text('Shree Shyamji', pageWidth / 2, yPos, { align: 'center' });
                yPos += 8;
                doc.setFontSize(13);
                const headerTitle = editUnloadingType === 'Paddy Unloading' ? 'PADDY RECEIPT' : 'UNLOADING POINT';
                doc.text(headerTitle, pageWidth / 2, yPos, { align: 'center' });
                yPos += 12;

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`No.: ${editingItem.slipNo}`, margin, yPos);
                doc.text(`Date: ${formatDate(formattedDate)}`, pageWidth - margin, yPos, { align: 'right' });
                yPos += 8;
                doc.setLineWidth(0.3);
                doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
                yPos += 4;

                const addRow = (label, value, y) => {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.text(label, margin, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(String(value || '-'), margin + labelWidth, y);
                    return y + 6;
                };

                if (editUnloadingType === 'Paddy Unloading') {
                    yPos = addRow('UNLOADING STAFF', editPaddyForm.unloadingStaff, yPos);
                    yPos = addRow('PARTY NAME', editPaddyForm.partyName, yPos);
                    yPos = addRow('VEHICLE NO', editPaddyForm.vehicleNo, yPos);
                    yPos = addRow('DRIVER NAME', editPaddyForm.driverName, yPos);
                    yPos += 2;
                    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
                    yPos += 4;
                    yPos = addRow('PADDY RECEIVED (PKT)', editPaddyForm.paddyReceived, yPos);
                    yPos = addRow('PADDY RETURNED', editPaddyForm.paddyReturned, yPos);
                    yPos = addRow('PADDY TYPE', editPaddyForm.paddyType, yPos);
                    yPos = addRow('PADDY QTY', editPaddyForm.paddyQty, yPos);
                    yPos += 2;
                    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
                    yPos += 4;
                    yPos = addRow('MOISTURE', editPaddyForm.moisture, yPos);
                    yPos = addRow('DUST', editPaddyForm.durst, yPos);
                    yPos += 2;
                    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
                    yPos += 4;
                    doc.setFont('helvetica', 'bold');
                    doc.text('TYPE OF PKT:', margin, yPos);
                    yPos += 6;
                    doc.setFont('helvetica', 'normal');
                    doc.text(`JUTE: ${editPaddyForm.jute || '-'}`, margin + 5, yPos);
                    doc.text(`PLASTIC: ${editPaddyForm.plastic || '-'}`, margin + 50, yPos);
                } else {
                    yPos = addRow('UNLOADING STAFF', editOtherForm.unloadingStaff, yPos);
                    yPos = addRow('PARTY NAME', editOtherForm.partyName, yPos);
                    yPos = addRow('VEHICLE NO', editOtherForm.vehicleNo, yPos);
                    yPos = addRow('DRIVER NAME', editOtherForm.driverName, yPos);
                    yPos += 2;
                    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
                    yPos += 4;
                    yPos = addRow('COMMODITY', editOtherForm.commodity, yPos);
                    yPos = addRow('QUALITY', editOtherForm.quality, yPos);
                    yPos = addRow('NO. OF PKTS', editOtherForm.noOfPkts, yPos);
                    yPos = addRow('BHARTI SIZE', editOtherForm.bhartiSize, yPos);
                    yPos = addRow('QTY', editOtherForm.qty, yPos);
                    yPos = addRow('TYPE OF PKTS', editOtherForm.typeOfPkts, yPos);
                    yPos = addRow('PACKET NAME', editOtherForm.packetName, yPos);
                }

                yPos += 20;
                doc.line(pageWidth - margin - 45, yPos, pageWidth - margin, yPos);
                yPos += 4;
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                doc.text('Signature', pageWidth - margin - 22, yPos, { align: 'center' });

                doc.setFont('helvetica', 'normal');
                doc.text(`RST No: ${editingItem.rstNo || '-'}`, margin, pageHeight - 14);
                doc.text(`Updated: ${new Date().toLocaleString('en-IN')}`, pageWidth - margin, pageHeight - 14, { align: 'right' });

                // Upload PDF to Google Drive
                const pdfBase64 = doc.output('datauristring').split(',')[1];
                const uploadResponse = await fetch(API_URL, {
                    method: 'POST',
                    body: new URLSearchParams({
                        action: 'uploadFile',
                        folderId: PDF_FOLDER_ID,
                        fileName: `Slip_${editingItem.slipNo}_updated_${Date.now()}.pdf`,
                        base64Data: pdfBase64,
                        mimeType: 'application/pdf'
                    })
                });
                const uploadResult = await uploadResponse.json();
                if (uploadResult.success && uploadResult.fileUrl) {
                    pdfLink = uploadResult.fileUrl;
                }
            } catch (pdfError) {
                console.error('PDF regeneration error:', pdfError);
            }

            let rowData;
            if (editUnloadingType === 'Paddy Unloading') {
                rowData = [
                    formattedTimestamp, editingItem.serialNo, editingItem.rstNo, 'Paddy Unloading', editingItem.slipNo, formattedDate,
                    editPaddyForm.unloadingStaff, editPaddyForm.partyName, editPaddyForm.vehicleNo,
                    editPaddyForm.driverName, editPaddyForm.paddyReceived, editPaddyForm.paddyReturned,
                    editPaddyForm.paddyType, editPaddyForm.paddyQty, editPaddyForm.moisture,
                    editPaddyForm.durst, '', editPaddyForm.jute, editPaddyForm.plastic, pdfLink || editingItem.pdfPaddy || ''
                ];
            } else {
                rowData = [
                    formattedTimestamp, editingItem.serialNo, editingItem.rstNo, 'Other Unloading', editingItem.slipNo, formattedDate,
                    editOtherForm.unloadingStaff, editOtherForm.partyName, editOtherForm.vehicleNo,
                    editOtherForm.driverName, '', '', '', '', '', '', '', '', '', '',
                    editOtherForm.commodity, editOtherForm.quality, editOtherForm.noOfPkts,
                    editOtherForm.bhartiSize, editOtherForm.qty, editOtherForm.typeOfPkts, editOtherForm.packetName, pdfLink || editingItem.pdfOther || ''
                ];
            }
            const response = await fetch(API_URL, {
                method: 'POST',
                body: new URLSearchParams({
                    action: 'update',
                    sheetName: UNLOADING_SHEET,
                    rowIndex: editingItem.rowIndex,
                    rowData: JSON.stringify(rowData)
                })
            });
            const result = await response.json();
            if (result.success) {
                showToast('Record updated with new PDF!', 'success');
                setShowEditModal(false);
                setEditingItem(null);
                await fetchHistoryItems();
            } else {
                throw new Error(result.error || 'Failed to update');
            }
        } catch (error) {
            console.error('Error updating:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Generate Paddy Slip PDF
    const generatePaddySlipPDF = async (item) => {
        try {
            setLoading(true);

            // Create PDF document (A5 size for slip)
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a5'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 10;
            let yPos = 15;

            // Header
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Shree Shyamji', pageWidth / 2, yPos, { align: 'center' });
            yPos += 7;

            doc.setFontSize(12);
            doc.text('PADDY RECEIPT', pageWidth / 2, yPos, { align: 'center' });
            yPos += 10;

            // Draw border
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.rect(5, 5, pageWidth - 10, doc.internal.pageSize.getHeight() - 10);

            // Slip details
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            const addField = (label, value, y) => {
                doc.setFont('helvetica', 'bold');
                doc.text(`${label}:`, margin, y);
                doc.setFont('helvetica', 'normal');
                doc.text(String(value || '-'), margin + 45, y);
                return y + 7;
            };

            // Slip Number and Date on same line
            doc.setFont('helvetica', 'bold');
            doc.text(`No.: ${item.slipNo || '-'}`, margin, yPos);
            doc.text(`Date: ${formatDate(item.date)}`, pageWidth - margin - 40, yPos);
            yPos += 10;

            // Draw line
            doc.setLineWidth(0.3);
            doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);

            yPos = addField('UNLOADING POINT STAFF', item.unloadingStaff, yPos);
            yPos = addField('PARTY NAME', item.partyName, yPos);
            yPos = addField('VEHICLE NO.', item.vehicleNo, yPos);
            yPos = addField('DRIVER NAME', item.driverName, yPos);
            yPos += 3;

            // Draw separator
            doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);

            yPos = addField('PADDY RECEIVED (IN PKT)', item.paddyReceived, yPos);
            yPos = addField('PADDY RETURNED', item.paddyReturn, yPos);
            yPos = addField('PADDY TYPE (NEW/OLD)', item.paddyType, yPos);
            yPos = addField('PADDY QTY', item.paddyQty, yPos);
            yPos += 3;

            // Draw separator
            doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);

            yPos = addField('MOISTURE', item.moisture, yPos);
            yPos = addField('DUST', item.dust, yPos);
            yPos += 3;

            // Draw separator
            doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);

            // Type of PKT section
            doc.setFont('helvetica', 'bold');
            doc.text('TYPE OF PKT:', margin, yPos);
            yPos += 7;
            doc.setFont('helvetica', 'normal');
            doc.text(`JUTE: ${item.jute || '-'}`, margin + 10, yPos);
            doc.text(`PLASTIC: ${item.plastic || '-'}`, margin + 60, yPos);
            yPos += 15;

            // Signature section
            doc.line(pageWidth - margin - 50, yPos, pageWidth - margin, yPos);
            yPos += 5;
            doc.setFontSize(8);
            doc.text('Signature', pageWidth - margin - 25, yPos, { align: 'center' });

            // Footer
            yPos = doc.internal.pageSize.getHeight() - 15;
            doc.setFontSize(8);
            doc.text(`RST No: ${item.rstNo || '-'}`, margin, yPos);
            doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - margin, yPos, { align: 'right' });

            // Convert to base64
            const pdfBase64 = doc.output('datauristring').split(',')[1];

            // Upload to Google Drive
            const uploadResponse = await fetch(API_URL, {
                method: 'POST',
                body: new URLSearchParams({
                    action: 'uploadPDF',
                    folderId: PDF_FOLDER_ID,
                    fileName: `PaddySlip_${item.slipNo}_${Date.now()}.pdf`,
                    base64Data: pdfBase64,
                    mimeType: 'application/pdf'
                })
            });

            const uploadResult = await uploadResponse.json();

            if (uploadResult.success && uploadResult.fileUrl) {
                // Update sheet Column T (index 19) with PDF link
                await fetch(API_URL, {
                    method: 'POST',
                    body: new URLSearchParams({
                        action: 'updateCell',
                        sheetName: UNLOADING_SHEET,
                        rowIndex: item.rowIndex,
                        columnIndex: 20, // Column T (0-indexed = 19, but API uses 1-indexed)
                        value: uploadResult.fileUrl
                    })
                });

                showToast('PDF generated and saved successfully!', 'success');
                await fetchHistoryItems();
            } else {
                // If upload fails, offer download instead
                doc.save(`PaddySlip_${item.slipNo}.pdf`);
                showToast('PDF downloaded locally (Drive upload not available)', 'warning');
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            // Fallback: download locally
            try {
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
                doc.text('Error generating full PDF. Please try again.', 10, 20);
                doc.save(`PaddySlip_${item.slipNo}_error.pdf`);
            } catch { }
            showToast(`Error generating PDF: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const hasActiveFilters = Object.values(filters).some(v => v !== "");
    const currentData = activeTab === 'pending' ? pendingItems : historyItems;
    const uniqueTrTypes = [...new Set(currentData.map(i => i.trType))].filter(Boolean).sort();

    const renderLabelContent = (label, value) => (
        <div className="space-y-1">
            <span className="text-xs font-medium text-gray-600 block">{label}</span>
            <span className="text-sm font-medium text-gray-900">{value || "-"}</span>
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
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Unloading Slip</h1>
                        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">Filters</span>
                            {hasActiveFilters && <span className="px-1.5 py-0.5 text-xs font-semibold text-white bg-red-800 rounded-full">●</span>}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex-shrink-0 px-4 lg:px-6">
                    <div className="border-b border-gray-200 overflow-x-auto">
                        <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8 min-w-max">
                            <button onClick={() => setActiveTab("pending")} className={`py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === "pending" ? "border-red-800 text-red-800" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">Pending</span>
                                    <span className="sm:hidden">Pending</span>
                                    <span className="text-xs">({pendingItems.length})</span>
                                </div>
                            </button>
                            <button onClick={() => setActiveTab("historyPaddy")} className={`py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === "historyPaddy" ? "border-green-700 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">History Paddy Unloading</span>
                                    <span className="sm:hidden">Paddy</span>
                                    <span className="text-xs">({historyItems.filter(i => i.isPaddy).length})</span>
                                </div>
                            </button>
                            <button onClick={() => setActiveTab("historyOther")} className={`py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === "historyOther" ? "border-orange-600 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">History Other Unloading</span>
                                    <span className="sm:hidden">Other</span>
                                    <span className="text-xs">({historyItems.filter(i => !i.isPaddy).length})</span>
                                </div>
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="flex-shrink-0 px-4 lg:px-6 py-4 bg-gray-50">
                        <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">Quick Filters</h3>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-600">TR Type</label>
                                    <select value={filters.trType} onChange={(e) => setFilters({ ...filters, trType: e.target.value })} className="py-1.5 px-2 w-full text-xs rounded border border-gray-300">
                                        <option value="">All</option>
                                        {uniqueTrTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-600">RST No</label>
                                    <input type="text" value={filters.rstNo} onChange={(e) => setFilters({ ...filters, rstNo: e.target.value })} placeholder="Search..." className="py-1.5 px-2 w-full text-xs rounded border border-gray-300" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-600">Party</label>
                                    <input type="text" value={filters.party} onChange={(e) => setFilters({ ...filters, party: e.target.value })} placeholder="Search..." className="py-1.5 px-2 w-full text-xs rounded border border-gray-300" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-600">Place</label>
                                    <input type="text" value={filters.place} onChange={(e) => setFilters({ ...filters, place: e.target.value })} placeholder="Search..." className="py-1.5 px-2 w-full text-xs rounded border border-gray-300" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-600">Truck No</label>
                                    <input type="text" value={filters.truckNo} onChange={(e) => setFilters({ ...filters, truckNo: e.target.value })} placeholder="Search..." className="py-1.5 px-2 w-full text-xs rounded border border-gray-300" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-600">Item</label>
                                    <input type="text" value={filters.item} onChange={(e) => setFilters({ ...filters, item: e.target.value })} placeholder="Search..." className="py-1.5 px-2 w-full text-xs rounded border border-gray-300" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="flex-1 overflow-hidden px-4 lg:px-6 pb-4 lg:pb-6">
                    {activeTab === 'pending' && (
                        <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                            {/* Mobile Card View */}
                            <div className="lg:hidden flex-1 overflow-auto p-4 space-y-3">
                                {filteredPending.map(item => (
                                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{item.rstNo || '-'}</p>
                                                <p className="text-xs text-gray-500">{item.trType || '-'}</p>
                                            </div>
                                            <button onClick={() => handleCompleteClick(item)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900">Paddy Slip</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div><span className="text-gray-500">Plant:</span> <span className="font-medium">{item.plantName || '-'}</span></div>
                                            <div><span className="text-gray-500">Party:</span> <span className="font-medium">{item.party || '-'}</span></div>
                                            <div><span className="text-gray-500">Truck:</span> <span className="font-mono font-medium">{item.truckNo || '-'}</span></div>
                                            <div><span className="text-gray-500">Item:</span> <span className="font-medium">{item.item || '-'}</span></div>
                                            <div><span className="text-gray-500">Total Bag:</span> <span className="font-medium">{item.totalBag || '-'}</span></div>
                                            <div><span className="text-gray-500">Total Qty:</span> <span className="font-medium">{item.totalQty || '-'}</span></div>
                                        </div>
                                    </div>
                                ))}
                                {filteredPending.length === 0 && (
                                    <div className="text-center py-12 text-gray-500">No pending records found</div>
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
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Dispatcher</th>
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
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Vehicle Reached</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredPending.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                                    <button onClick={() => handleCompleteClick(item)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900">Paddy Slip</button>
                                                </td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.trType || '-'}</td>
                                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{item.rstNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.plantName || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.dispatcherName || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.party || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.place || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900 font-mono">{item.truckNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.item || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.totalBag || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.bhartiSize || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.totalQty || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.tareWt || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.netWt || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.grossWt || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.jute || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.plastic || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.tpNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.tpWt || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate">{item.remarks || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.vehicleReached || '-'}</td>
                                            </tr>
                                        ))}
                                        {filteredPending.length === 0 && (
                                            <tr><td colSpan={21} className="px-6 py-12 text-center text-gray-500">No pending records found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'historyPaddy' && (
                        <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="px-4 py-3 bg-green-50 border-b border-gray-200">
                                <h3 className="text-sm font-semibold text-green-800">Paddy Unloading History</h3>
                            </div>

                            {/* Mobile Card View */}
                            <div className="lg:hidden flex-1 overflow-auto p-4 space-y-3">
                                {filteredHistory.filter(i => i.isPaddy).map(item => (
                                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{item.slipNo || '-'}</p>
                                                <p className="text-xs text-gray-500">RST: {item.rstNo || '-'} | {formatDate(item.date)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditClick(item)} className="px-2 py-1 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900 inline-flex items-center gap-1">
                                                    <Edit className="w-3 h-3" /> Edit
                                                </button>
                                                {item.pdfPaddy ? (
                                                    <a href={getDrivePreviewUrl(item.pdfPaddy)} target="_blank" rel="noopener noreferrer" className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 inline-flex items-center gap-1">
                                                        <FileText className="w-3 h-3" />
                                                    </a>
                                                ) : (
                                                    <button onClick={() => generatePaddySlipPDF(item)} className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 inline-flex items-center gap-1">
                                                        <Download className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div><span className="text-gray-500">Staff:</span> <span className="font-medium">{item.unloadingStaff || '-'}</span></div>
                                            <div><span className="text-gray-500">Party:</span> <span className="font-medium">{item.partyName || '-'}</span></div>
                                            <div><span className="text-gray-500">Vehicle:</span> <span className="font-mono font-medium">{item.vehicleNo || '-'}</span></div>
                                            <div><span className="text-gray-500">Driver:</span> <span className="font-medium">{item.driverName || '-'}</span></div>
                                            <div><span className="text-gray-500">Received:</span> <span className="font-medium">{item.paddyReceived || '-'}</span></div>
                                            <div><span className="text-gray-500">Return:</span> <span className="font-medium">{item.paddyReturn || '-'}</span></div>
                                            <div><span className="text-gray-500">Qty:</span> <span className="font-medium">{item.paddyQty || '-'}</span></div>
                                            <div><span className="text-gray-500">Type:</span> <span className="font-medium">{item.paddyType || '-'}</span></div>
                                        </div>
                                    </div>
                                ))}
                                {filteredHistory.filter(i => i.isPaddy).length === 0 && (
                                    <div className="text-center py-12 text-gray-500">No Paddy Unloading records found</div>
                                )}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden lg:block flex-1 overflow-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Action</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Serial No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">RST No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Slip No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Date</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Unloading Staff</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Party Name</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Vehicle No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Driver Name</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Paddy Received</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Paddy Return</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Paddy Type</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Paddy Qty</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Moisture</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Dust</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Type of PKT</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Jute</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Plastic</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">PDF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredHistory.filter(i => i.isPaddy).map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                                    <button onClick={() => handleEditClick(item)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900 inline-flex items-center gap-1">
                                                        <Edit className="w-3 h-3" /> Edit
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{item.serialNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{item.rstNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{item.slipNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{formatDate(item.date)}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.unloadingStaff || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.partyName || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900 font-mono">{item.vehicleNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.driverName || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.paddyReceived || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.paddyReturn || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.paddyType || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.paddyQty || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.moisture || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.dust || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.typeOfPkt || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.jute || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.plastic || '-'}</td>
                                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                                    <div className="flex gap-1">
                                                        {item.pdfPaddy ? (
                                                            <a href={getDrivePreviewUrl(item.pdfPaddy)} target="_blank" rel="noopener noreferrer" className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 inline-flex items-center gap-1">
                                                                <FileText className="w-3 h-3" /> View
                                                            </a>
                                                        ) : (
                                                            <button onClick={() => generatePaddySlipPDF(item)} className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 inline-flex items-center gap-1">
                                                                <Download className="w-3 h-3" /> Generate
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredHistory.filter(i => i.isPaddy).length === 0 && (
                                            <tr><td colSpan={19} className="px-6 py-12 text-center text-gray-500">No Paddy Unloading records found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'historyOther' && (
                        <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="px-4 py-3 bg-orange-50 border-b border-gray-200">
                                <h3 className="text-sm font-semibold text-orange-800">Other Unloading History</h3>
                            </div>

                            {/* Mobile Card View */}
                            <div className="lg:hidden flex-1 overflow-auto p-4 space-y-3">
                                {filteredHistory.filter(i => !i.isPaddy).map(item => (
                                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{item.slipNo || '-'}</p>
                                                <p className="text-xs text-gray-500">RST: {item.rstNo || '-'} | {formatDate(item.date)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditClick(item)} className="px-2 py-1 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900 inline-flex items-center gap-1">
                                                    <Edit className="w-3 h-3" /> Edit
                                                </button>
                                                {item.pdfOther && (
                                                    <a href={getDrivePreviewUrl(item.pdfOther)} target="_blank" rel="noopener noreferrer" className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 inline-flex items-center gap-1">
                                                        <FileText className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div><span className="text-gray-500">Staff:</span> <span className="font-medium">{item.unloadingStaff || '-'}</span></div>
                                            <div><span className="text-gray-500">Party:</span> <span className="font-medium">{item.partyName || '-'}</span></div>
                                            <div><span className="text-gray-500">Vehicle:</span> <span className="font-mono font-medium">{item.vehicleNo || '-'}</span></div>
                                            <div><span className="text-gray-500">Driver:</span> <span className="font-medium">{item.driverName || '-'}</span></div>
                                            <div><span className="text-gray-500">Commodity:</span> <span className="font-medium">{item.commodity || '-'}</span></div>
                                            <div><span className="text-gray-500">Quality:</span> <span className="font-medium">{item.quality || '-'}</span></div>
                                            <div><span className="text-gray-500">No. of Pkts:</span> <span className="font-medium">{item.noOfPkts || '-'}</span></div>
                                            <div><span className="text-gray-500">Qty:</span> <span className="font-medium">{item.qty || '-'}</span></div>
                                        </div>
                                    </div>
                                ))}
                                {filteredHistory.filter(i => !i.isPaddy).length === 0 && (
                                    <div className="text-center py-12 text-gray-500">No Other Unloading records found</div>
                                )}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden lg:block flex-1 overflow-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Action</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Serial No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">RST No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Slip No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Date</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Unloading Staff</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Party Name</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Vehicle No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Driver Name</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Commodity</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Quality</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">No. of Pkts</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Bharti Size</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Qty</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Type of Pkts</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Pkt Name</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">PDF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredHistory.filter(i => !i.isPaddy).map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                                    <button onClick={() => handleEditClick(item)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900 inline-flex items-center gap-1">
                                                        <Edit className="w-3 h-3" /> Edit
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{item.serialNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{item.rstNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{item.slipNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{formatDate(item.date)}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.unloadingStaff || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.partyName || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900 font-mono">{item.vehicleNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.driverName || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.commodity || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.quality || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.noOfPkts || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.bhartiSize || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.qty || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.typeOfPkts || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.pktName || '-'}</td>
                                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                                    {item.pdfOther ? (
                                                        <a href={getDrivePreviewUrl(item.pdfOther)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 inline-flex items-center gap-1">
                                                            <FileText className="w-3 h-3" /> PDF
                                                        </a>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredHistory.filter(i => !i.isPaddy).length === 0 && (
                                            <tr><td colSpan={17} className="px-6 py-12 text-center text-gray-500">No Other Unloading records found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Form Modal */}
            {showFormModal && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 bg-gradient-to-r from-red-800 to-red-900">
                            <h3 className="text-lg font-bold text-white">Create Unloading Slip</h3>
                            <button onClick={() => setShowFormModal(false)} className="text-white hover:text-white/80"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {renderLabelContent("RST No", selectedItem.rstNo)}
                                {renderLabelContent("Plant Name", selectedItem.plantName)}
                                {renderLabelContent("Dispatcher Name", selectedItem.dispatcherName)}
                            </div>

                            <form onSubmit={handleFormSubmit} className="space-y-6 border-t border-gray-200 pt-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unloading Type <span className="text-red-600">*</span></label>
                                    <select value={unloadingType} onChange={(e) => setUnloadingType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                                        <option value="">Select</option>
                                        <option value="Paddy Unloading">Paddy Unloading</option>
                                        <option value="Other Unloading">Other Unloading</option>
                                    </select>
                                </div>

                                {unloadingType && unloadingType === 'Paddy Unloading' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Unloading Staff <span className="text-red-600">*</span></label>
                                            <select value={paddyForm.unloadingStaff} onChange={(e) => setPaddyForm({ ...paddyForm, unloadingStaff: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                                                <option value="">Select Staff</option>
                                                {unloadingStaffOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Party Name</label>
                                            <input type="text" value={paddyForm.partyName} onChange={(e) => setPaddyForm({ ...paddyForm, partyName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No</label>
                                            <input type="text" value={paddyForm.vehicleNo} onChange={(e) => setPaddyForm({ ...paddyForm, vehicleNo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                                            <input type="text" value={paddyForm.driverName} onChange={(e) => setPaddyForm({ ...paddyForm, driverName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Paddy Received</label>
                                            <input type="text" value={paddyForm.paddyReceived} onChange={(e) => setPaddyForm({ ...paddyForm, paddyReceived: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Paddy Returned</label>
                                            <input type="text" value={paddyForm.paddyReturned} onChange={(e) => setPaddyForm({ ...paddyForm, paddyReturned: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Paddy Type</label>
                                            <select value={paddyForm.paddyType} onChange={(e) => setPaddyForm({ ...paddyForm, paddyType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                                <option value="New">New</option>
                                                <option value="Old">Old</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Paddy Qty</label>
                                            <input type="text" value={paddyForm.paddyQty} onChange={(e) => setPaddyForm({ ...paddyForm, paddyQty: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Moisture</label>
                                            <input type="text" value={paddyForm.moisture} onChange={(e) => setPaddyForm({ ...paddyForm, moisture: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Durst</label>
                                            <input type="text" value={paddyForm.durst} onChange={(e) => setPaddyForm({ ...paddyForm, durst: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Type of Paddy - Jute</label>
                                            <input type="text" value={paddyForm.jute} onChange={(e) => setPaddyForm({ ...paddyForm, jute: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Type of Paddy - Plastic</label>
                                            <input type="text" value={paddyForm.plastic} onChange={(e) => setPaddyForm({ ...paddyForm, plastic: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                    </div>
                                ) : unloadingType === 'Other Unloading' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Unloading Staff <span className="text-red-600">*</span></label>
                                            <select value={otherForm.unloadingStaff} onChange={(e) => setOtherForm({ ...otherForm, unloadingStaff: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                                                <option value="">Select Staff</option>
                                                {unloadingStaffOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Party Name</label>
                                            <input type="text" value={otherForm.partyName} onChange={(e) => setOtherForm({ ...otherForm, partyName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No</label>
                                            <input type="text" value={otherForm.vehicleNo} onChange={(e) => setOtherForm({ ...otherForm, vehicleNo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                                            <input type="text" value={otherForm.driverName} onChange={(e) => setOtherForm({ ...otherForm, driverName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Commodity</label>
                                            <input type="text" value={otherForm.commodity} onChange={(e) => setOtherForm({ ...otherForm, commodity: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
                                            <input type="text" value={otherForm.quality} onChange={(e) => setOtherForm({ ...otherForm, quality: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">No of Pkts</label>
                                            <input type="text" value={otherForm.noOfPkts} onChange={(e) => setOtherForm({ ...otherForm, noOfPkts: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Bharti Size</label>
                                            <input type="text" value={otherForm.bhartiSize} onChange={(e) => setOtherForm({ ...otherForm, bhartiSize: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
                                            <input type="text" value={otherForm.qty} onChange={(e) => setOtherForm({ ...otherForm, qty: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Type of Pkts</label>
                                            <input type="text" value={otherForm.typeOfPkts} onChange={(e) => setOtherForm({ ...otherForm, typeOfPkts: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Packet Name</label>
                                            <input type="text" value={otherForm.packetName} onChange={(e) => setOtherForm({ ...otherForm, packetName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        Please select an Unloading Type to continue
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                                    <button type="submit" disabled={loading || !unloadingType} className="px-4 py-2 text-sm font-medium text-white bg-red-800 rounded-md hover:bg-red-900 disabled:opacity-50">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 bg-gradient-to-r from-red-800 to-red-900">
                            <h3 className="text-lg font-bold text-white">Edit Record - {editingItem.slipNo}</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-white hover:text-white/80"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {renderLabelContent("RST No", editingItem.rstNo)}
                                {renderLabelContent("Slip No", editingItem.slipNo)}
                                {renderLabelContent("Serial No", editingItem.serialNo)}
                                {renderLabelContent("Type", editingItem.isPaddy ? "Paddy Unloading" : "Other Unloading")}
                            </div>
                            <form onSubmit={handleEditSubmit} className="space-y-6 border-t border-gray-200 pt-6">
                                {editUnloadingType === 'Paddy Unloading' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Unloading Staff</label>
                                            <select value={editPaddyForm.unloadingStaff} onChange={(e) => setEditPaddyForm({ ...editPaddyForm, unloadingStaff: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                                <option value="">Select Staff</option>
                                                {unloadingStaffOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Party Name</label>
                                            <input type="text" value={editPaddyForm.partyName} onChange={(e) => setEditPaddyForm({ ...editPaddyForm, partyName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No</label>
                                            <input type="text" value={editPaddyForm.vehicleNo} onChange={(e) => setEditPaddyForm({ ...editPaddyForm, vehicleNo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                                            <input type="text" value={editPaddyForm.driverName} onChange={(e) => setEditPaddyForm({ ...editPaddyForm, driverName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Paddy Received</label>
                                            <input type="text" value={editPaddyForm.paddyReceived} onChange={(e) => setEditPaddyForm({ ...editPaddyForm, paddyReceived: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Paddy Returned</label>
                                            <input type="text" value={editPaddyForm.paddyReturned} onChange={(e) => setEditPaddyForm({ ...editPaddyForm, paddyReturned: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Paddy Type</label>
                                            <select value={editPaddyForm.paddyType} onChange={(e) => setEditPaddyForm({ ...editPaddyForm, paddyType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                                <option value="New">New</option>
                                                <option value="Old">Old</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Paddy Qty</label>
                                            <input type="text" value={editPaddyForm.paddyQty} onChange={(e) => setEditPaddyForm({ ...editPaddyForm, paddyQty: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Moisture</label>
                                            <input type="text" value={editPaddyForm.moisture} onChange={(e) => setEditPaddyForm({ ...editPaddyForm, moisture: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Durst</label>
                                            <input type="text" value={editPaddyForm.durst} onChange={(e) => setEditPaddyForm({ ...editPaddyForm, durst: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Jute</label>
                                            <input type="text" value={editPaddyForm.jute} onChange={(e) => setEditPaddyForm({ ...editPaddyForm, jute: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Plastic</label>
                                            <input type="text" value={editPaddyForm.plastic} onChange={(e) => setEditPaddyForm({ ...editPaddyForm, plastic: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Unloading Staff</label>
                                            <select value={editOtherForm.unloadingStaff} onChange={(e) => setEditOtherForm({ ...editOtherForm, unloadingStaff: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                                <option value="">Select Staff</option>
                                                {unloadingStaffOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Party Name</label>
                                            <input type="text" value={editOtherForm.partyName} onChange={(e) => setEditOtherForm({ ...editOtherForm, partyName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No</label>
                                            <input type="text" value={editOtherForm.vehicleNo} onChange={(e) => setEditOtherForm({ ...editOtherForm, vehicleNo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                                            <input type="text" value={editOtherForm.driverName} onChange={(e) => setEditOtherForm({ ...editOtherForm, driverName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Commodity</label>
                                            <input type="text" value={editOtherForm.commodity} onChange={(e) => setEditOtherForm({ ...editOtherForm, commodity: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
                                            <input type="text" value={editOtherForm.quality} onChange={(e) => setEditOtherForm({ ...editOtherForm, quality: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">No of Pkts</label>
                                            <input type="text" value={editOtherForm.noOfPkts} onChange={(e) => setEditOtherForm({ ...editOtherForm, noOfPkts: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Bharti Size</label>
                                            <input type="text" value={editOtherForm.bhartiSize} onChange={(e) => setEditOtherForm({ ...editOtherForm, bhartiSize: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
                                            <input type="text" value={editOtherForm.qty} onChange={(e) => setEditOtherForm({ ...editOtherForm, qty: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Type of Pkts</label>
                                            <input type="text" value={editOtherForm.typeOfPkts} onChange={(e) => setEditOtherForm({ ...editOtherForm, typeOfPkts: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Packet Name</label>
                                            <input type="text" value={editOtherForm.packetName} onChange={(e) => setEditOtherForm({ ...editOtherForm, packetName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
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

export default PaddySlip;