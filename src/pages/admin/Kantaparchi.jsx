import React, { useState, useEffect } from "react";
import { Filter, X, Clock, CheckCircle, ChevronDown, Loader2, FileText, Edit } from "lucide-react";
import { useToast } from '../../contexts/ToastContext';
import { jsPDF } from 'jspdf';

const API_URL = import.meta.env.VITE_SHEET_API_URL;
const DISPATCH_SHEET = import.meta.env.VITE_SHEET_DISPATCH;
const UNLOADING_SHEET = import.meta.env.VITE_SHEET_UNLOADING;
const KANTAPARCHI_SHEET = "Kantaparchi";
const PDF_FOLDER_ID = "1VzfAvwto6bPYmfFKhBqzKmiB_x9u-RKc";

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch { return dateString; }
};

const getDrivePreviewUrl = (url) => {
    if (!url) return '';
    const match = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return `https://drive.google.com/file/d/${match[1]}/view`;
    return url;
};

const Kantaparchi = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState("paddyPending");
    const [showFilters, setShowFilters] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [dispatchData, setDispatchData] = useState([]);

    // Edit modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const [filters, setFilters] = useState({ rstNo: "", partyName: "", vehicleNo: "" });

    const [pendingItems, setPendingItems] = useState([]);
    const [historyItems, setHistoryItems] = useState([]);
    const [filteredPending, setFilteredPending] = useState([]);
    const [filteredHistory, setFilteredHistory] = useState([]);

    const [formData, setFormData] = useState({
        serialNo: "", rstNo: "", date: "", partyName: "", lorryNo: "",
        tareWeight: "", grossWeight: "", gunny: "", deduction: "",
        netWeight: "", finalNetWeight: "", mota: "", jute: "",
        newPkt: "", plastic: "", sarna: "", total: "", unloadingType: ""
    });

    const [editFormData, setEditFormData] = useState({
        serialNo: "", rstNo: "", weighmentSlipNo: "", date: "", partyName: "", lorryNo: "",
        tareWeight: "", grossWeight: "", gunny: "", deduction: "",
        netWeight: "", finalNetWeight: "", mota: "", jute: "",
        newPkt: "", plastic: "", sarna: "", total: "", unloadingType: ""
    });

    // Fetch dispatch data for matching
    const fetchDispatchData = async () => {
        try {
            const response = await fetch(`${API_URL}?sheet=${DISPATCH_SHEET}&action=getData`);
            const data = await response.json();
            if (data.success && data.data) setDispatchData(data.data);
        } catch (error) { console.error('Error fetching dispatch data:', error); }
    };

    // Fetch pending items from Vehicle Unloading Point sheet
    const fetchPendingItems = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}?sheet=${UNLOADING_SHEET}&action=getData`);
            const data = await response.json();
            if (data.success && data.data) {
                const pendingData = [];
                for (let i = 6; i < data.data.length; i++) {
                    const row = data.data[i];
                    if (row[1]) {
                        const hasAC = row[28] && row[28].toString().trim() !== '';
                        const hasAD = row[29] && row[29].toString().trim() !== '';
                        if (hasAC && !hasAD) {
                            const isPaddy = row[3] === 'Paddy Unloading';
                            pendingData.push({
                                id: i + 1, rowIndex: i + 1, isPaddy,
                                serialNo: row[1] || '', rstNo: row[2] || '', unloadingType: row[3] || '',
                                slipNo: row[4] || '', date: row[5] || '', unloadingStaff: row[6] || '',
                                partyName: row[7] || '', vehicleNo: row[8] || '', driverName: row[9] || '',
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
                }
                pendingData.reverse();
                setPendingItems(pendingData);
                setFilteredPending(pendingData);
            }
        } catch (error) {
            console.error('Error fetching pending items:', error);
            showToast('Failed to load pending items', 'error');
        } finally { setLoading(false); }
    };

    // Fetch history from Kantaparchi sheet
    const fetchHistoryItems = async () => {
        try {
            const response = await fetch(`${API_URL}?sheet=${KANTAPARCHI_SHEET}&action=getData`);
            const data = await response.json();
            if (data.success && data.data) {
                const historyData = [];
                for (let i = 1; i < data.data.length; i++) {
                    const row = data.data[i];
                    if (row[1]) {
                        historyData.push({
                            id: i + 1, rowIndex: i + 1,
                            timestamp: row[0] || '', serialNo: row[1] || '', rstNo: row[2] || '',
                            weighmentSlipNo: row[3] || '', date: row[4] || '', partyName: row[5] || '',
                            lorryNo: row[6] || '', tareWeight: row[7] || '', grossWeight: row[8] || '',
                            gunnyWeight: row[9] || '', deduction: row[10] || '', netWeight: row[11] || '',
                            finalNetWeight: row[12] || '', mota: row[13] || '', jute: row[14] || '',
                            newPkt: row[15] || '', plastic: row[16] || '', sarna: row[17] || '',
                            total: row[18] || '', unloadingType: row[19] || '', pdf: row[20] || ''
                        });
                    }
                }
                historyData.reverse();
                setHistoryItems(historyData);
                setFilteredHistory(historyData);
            }
        } catch (error) { console.error('Error fetching history:', error); }
    };

    useEffect(() => {
        fetchDispatchData();
        fetchPendingItems();
        fetchHistoryItems();
    }, []);

    useEffect(() => { applyFilters(); }, [filters, pendingItems, historyItems]);

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

    const getDispatchDataByRST = (rstNo) => {
        for (let i = 6; i < dispatchData.length; i++) {
            const row = dispatchData[i];
            if (row[2] === rstNo) {
                return {
                    partyName: row[5] || '', lorryNo: row[7] || '',
                    tareWeight: row[12] || '', netWeight: row[13] || '',
                    grossWeight: row[14] || '', jute: row[15] || '', plastic: row[16] || ''
                };
            }
        }
        return { partyName: '', lorryNo: '', tareWeight: '', netWeight: '', grossWeight: '', jute: '', plastic: '' };
    };

    const handleKantaparchiClick = (item) => {
        setSelectedItem(item);
        const dispatchInfo = getDispatchDataByRST(item.rstNo);

        // Init date with current time in YYYY-MM-DDTHH:mm format for datetime-local
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        setFormData({
            serialNo: item.serialNo || '', rstNo: item.rstNo || '', date: dateStr,
            partyName: dispatchInfo.partyName, lorryNo: dispatchInfo.lorryNo,
            tareWeight: dispatchInfo.tareWeight, grossWeight: dispatchInfo.grossWeight,
            gunny: '', deduction: '', netWeight: dispatchInfo.netWeight, finalNetWeight: '',
            mota: '', jute: dispatchInfo.jute, newPkt: '', plastic: dispatchInfo.plastic,
            sarna: '', total: '', unloadingType: item.unloadingType || ''
        });
        setShowFormModal(true);
    };

    // Calculate Final Net Weight and Total
    useEffect(() => {
        const netWt = parseFloat(formData.netWeight) || 0;
        const gunny = parseFloat(formData.gunny) || 0;
        const deduction = parseFloat(formData.deduction) || 0;
        const finalNet = netWt - (gunny + deduction);
        const mota = parseFloat(formData.mota) || 0;
        const jute = parseFloat(formData.jute) || 0;
        const newPkt = parseFloat(formData.newPkt) || 0;
        const plastic = parseFloat(formData.plastic) || 0;
        const sarna = parseFloat(formData.sarna) || 0;
        const total = mota + jute + newPkt + plastic + sarna;
        setFormData(prev => ({ ...prev, finalNetWeight: finalNet.toString(), total: total.toString() }));
    }, [formData.netWeight, formData.gunny, formData.deduction, formData.mota, formData.jute, formData.newPkt, formData.plastic, formData.sarna]);

    const generateWeighmentSlipNo = async () => {
        try {
            const response = await fetch(`${API_URL}?sheet=${KANTAPARCHI_SHEET}&action=getData`);
            const data = await response.json();
            if (data.success && data.data) {
                const count = Math.max(0, data.data.length - 1) + 1;
                return `WN-${String(count).padStart(3, '0')}`;
            }
        } catch { }
        return 'WN-001';
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const now = new Date();
            const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            const weighmentSlipNo = await generateWeighmentSlipNo();

            // Format date for sheet (YYYY-MM-DD HH:mm:ss)
            const formatForSheet = (dtLocal) => {
                if (!dtLocal) return '';
                const d = new Date(dtLocal);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
            };
            const sheetDate = formatForSheet(formData.date);

            // Generate PDF
            let pdfLink = '';
            try {
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const margin = 12;
                let yPos = 18;

                doc.setDrawColor(0); doc.setLineWidth(0.5);
                doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

                doc.setFontSize(16); doc.setFont('helvetica', 'bold');
                doc.text('Shree Shyamji', pageWidth / 2, yPos, { align: 'center' });
                yPos += 8;
                doc.setFontSize(13);
                doc.text('WEIGHMENT SLIP', pageWidth / 2, yPos, { align: 'center' });
                yPos += 12;

                doc.setFontSize(10);
                doc.text(`No.: ${weighmentSlipNo}`, margin, yPos);
                doc.text(`Date: ${formatDate(formData.date)}`, pageWidth - margin, yPos, { align: 'right' });
                yPos += 8;
                doc.setLineWidth(0.3);
                doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
                yPos += 4;

                const addRow = (label, value, y) => {
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
                    doc.text(label, margin, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(String(value || '-'), margin + 45, y);
                    return y + 6;
                };

                yPos = addRow('RST No.', formData.rstNo, yPos);
                yPos = addRow('Party Name', formData.partyName, yPos);
                yPos = addRow('Lorry No.', formData.lorryNo, yPos);
                yPos += 2; doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2); yPos += 4;
                yPos = addRow('Tare Weight', formData.tareWeight, yPos);
                yPos = addRow('Gross Weight', formData.grossWeight, yPos);
                yPos = addRow('Gunny Weight', formData.gunny, yPos);
                yPos = addRow('Deduction', formData.deduction, yPos);
                yPos = addRow('Net Weight', formData.netWeight, yPos);
                yPos = addRow('Final Net Weight', formData.finalNetWeight, yPos);
                yPos += 2; doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2); yPos += 4;
                doc.setFont('helvetica', 'bold'); doc.text('PACKET COUNT:', margin, yPos); yPos += 6;
                doc.setFont('helvetica', 'normal');
                doc.text(`MOTA: ${formData.mota || '-'}  JUTE: ${formData.jute || '-'}  NEW: ${formData.newPkt || '-'}`, margin + 5, yPos);
                yPos += 6;
                doc.text(`PLASTIC: ${formData.plastic || '-'}  SARNA: ${formData.sarna || '-'}  TOTAL: ${formData.total || '-'}`, margin + 5, yPos);
                yPos += 15;
                doc.line(pageWidth - margin - 45, yPos, pageWidth - margin, yPos);
                yPos += 4;
                doc.setFontSize(8); doc.setFont('helvetica', 'italic');
                doc.text('Signature', pageWidth - margin - 22, yPos, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.text(`Serial No: ${formData.serialNo}`, margin, pageHeight - 14);
                const genNow = new Date();
                const genTimestamp = `${genNow.getFullYear()}-${String(genNow.getMonth() + 1).padStart(2, '0')}-${String(genNow.getDate()).padStart(2, '0')} ${String(genNow.getHours()).padStart(2, '0')}:${String(genNow.getMinutes()).padStart(2, '0')}:${String(genNow.getSeconds()).padStart(2, '0')}`;
                doc.text(`Generated: ${genTimestamp}`, pageWidth - margin, pageHeight - 14, { align: 'right' });

                const pdfBase64 = doc.output('datauristring').split(',')[1];
                const uploadResponse = await fetch(API_URL, {
                    method: 'POST',
                    body: new URLSearchParams({
                        action: 'uploadFile', folderId: PDF_FOLDER_ID,
                        fileName: `Weighment_${weighmentSlipNo}_${Date.now()}.pdf`,
                        base64Data: pdfBase64, mimeType: 'application/pdf'
                    })
                });
                const uploadResult = await uploadResponse.json();
                if (uploadResult.success && uploadResult.fileUrl) pdfLink = uploadResult.fileUrl;
            } catch (pdfError) {
                console.error('PDF error:', pdfError);
                showToast('PDF upload failed', 'error');
            }

            // Save to Kantaparchi sheet
            const rowData = [
                timestamp, formData.serialNo, formData.rstNo, weighmentSlipNo, sheetDate,
                formData.partyName, formData.lorryNo, formData.tareWeight, formData.grossWeight,
                formData.gunny, formData.deduction, formData.netWeight, formData.finalNetWeight,
                formData.mota, formData.jute, formData.newPkt, formData.plastic, formData.sarna,
                formData.total, formData.unloadingType, pdfLink
            ];

            const response = await fetch(API_URL, {
                method: 'POST',
                body: new URLSearchParams({
                    action: 'insert', sheetName: KANTAPARCHI_SHEET, rowData: JSON.stringify(rowData)
                })
            });
            const result = await response.json();

            if (result.success) {
                // Update Vehicle Unloading Point Column AD (index 30)
                await fetch(API_URL, {
                    method: 'POST',
                    body: new URLSearchParams({
                        action: 'updateCell', sheetName: UNLOADING_SHEET,
                        rowIndex: selectedItem.rowIndex, columnIndex: 30, value: timestamp
                    })
                });
                showToast('Weighment slip created successfully!', 'success');
                setShowFormModal(false);
                setSelectedItem(null);
                await fetchPendingItems();
                await fetchHistoryItems();
            } else throw new Error(result.error || 'Failed to save');
        } catch (error) {
            console.error('Error saving:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally { setLoading(false); }
    };

    // Handle edit click
    const handleEditClick = (item) => {
        setEditingItem(item);

        // Parse date for datetime-local input (YYYY-MM-DDTHH:mm)
        let formattedDate = '';
        if (item.date) {
            const d = new Date(item.date);
            if (!isNaN(d.getTime())) {
                formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            } else {
                // Try parsing YYYY-MM-DD manual fallback
                const match = item.date.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (match) formattedDate = `${match[1]}-${match[2]}-${match[3]}T00:00`;
            }
        }

        setEditFormData({
            serialNo: item.serialNo || '', rstNo: item.rstNo || '',
            weighmentSlipNo: item.weighmentSlipNo || '', date: formattedDate,
            partyName: item.partyName || '', lorryNo: item.lorryNo || '',
            tareWeight: item.tareWeight || '', grossWeight: item.grossWeight || '',
            gunny: item.gunnyWeight || '', deduction: item.deduction || '',
            netWeight: item.netWeight || '', finalNetWeight: item.finalNetWeight || '',
            mota: item.mota || '', jute: item.jute || '',
            newPkt: item.newPkt || '', plastic: item.plastic || '',
            sarna: item.sarna || '', total: item.total || '',
            unloadingType: item.unloadingType || ''
        });
        setShowEditModal(true);
    };

    // Calculate edit form values
    useEffect(() => {
        if (showEditModal) {
            const netWt = parseFloat(editFormData.netWeight) || 0;
            const gunny = parseFloat(editFormData.gunny) || 0;
            const deduction = parseFloat(editFormData.deduction) || 0;
            const finalNet = netWt - (gunny + deduction);
            const mota = parseFloat(editFormData.mota) || 0;
            const jute = parseFloat(editFormData.jute) || 0;
            const newPkt = parseFloat(editFormData.newPkt) || 0;
            const plastic = parseFloat(editFormData.plastic) || 0;
            const sarna = parseFloat(editFormData.sarna) || 0;
            const total = mota + jute + newPkt + plastic + sarna;
            setEditFormData(prev => ({ ...prev, finalNetWeight: finalNet.toString(), total: total.toString() }));
        }
    }, [showEditModal, editFormData.netWeight, editFormData.gunny, editFormData.deduction, editFormData.mota, editFormData.jute, editFormData.newPkt, editFormData.plastic, editFormData.sarna]);

    // Handle edit submit
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);

            // Regenerate PDF with updated values
            let pdfLink = editingItem.pdf || '';
            try {
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const margin = 12;
                let yPos = 18;

                doc.setDrawColor(0); doc.setLineWidth(0.5);
                doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
                doc.setFontSize(16); doc.setFont('helvetica', 'bold');
                doc.text('Shree Shyamji', pageWidth / 2, yPos, { align: 'center' });
                yPos += 8;
                doc.setFontSize(13);
                doc.text('WEIGHMENT SLIP', pageWidth / 2, yPos, { align: 'center' });
                yPos += 12;
                doc.setFontSize(10);
                doc.text(`No.: ${editFormData.weighmentSlipNo}`, margin, yPos);
                doc.text(`Date: ${formatDate(editFormData.date)}`, pageWidth - margin, yPos, { align: 'right' });
                yPos += 8;
                doc.setLineWidth(0.3);
                doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
                yPos += 4;

                const addRow = (label, value, y) => {
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
                    doc.text(label, margin, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(String(value || '-'), margin + 45, y);
                    return y + 6;
                };

                yPos = addRow('RST No.', editFormData.rstNo, yPos);
                yPos = addRow('Party Name', editFormData.partyName, yPos);
                yPos = addRow('Lorry No.', editFormData.lorryNo, yPos);
                yPos += 2; doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2); yPos += 4;
                yPos = addRow('Tare Weight', editFormData.tareWeight, yPos);
                yPos = addRow('Gross Weight', editFormData.grossWeight, yPos);
                yPos = addRow('Gunny Weight', editFormData.gunny, yPos);
                yPos = addRow('Deduction', editFormData.deduction, yPos);
                yPos = addRow('Net Weight', editFormData.netWeight, yPos);
                yPos = addRow('Final Net Weight', editFormData.finalNetWeight, yPos);
                yPos += 2; doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2); yPos += 4;
                doc.setFont('helvetica', 'bold'); doc.text('PACKET COUNT:', margin, yPos); yPos += 6;
                doc.setFont('helvetica', 'normal');
                doc.text(`MOTA: ${editFormData.mota || '-'}  JUTE: ${editFormData.jute || '-'}  NEW: ${editFormData.newPkt || '-'}`, margin + 5, yPos);
                yPos += 6;
                doc.text(`PLASTIC: ${editFormData.plastic || '-'}  SARNA: ${editFormData.sarna || '-'}  TOTAL: ${editFormData.total || '-'}`, margin + 5, yPos);
                yPos += 15;
                doc.line(pageWidth - margin - 45, yPos, pageWidth - margin, yPos);
                yPos += 4;
                doc.setFontSize(8); doc.setFont('helvetica', 'italic');
                doc.text('Signature', pageWidth - margin - 22, yPos, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.text(`Serial No: ${editFormData.serialNo}`, margin, pageHeight - 14);
                const updNow = new Date();
                const updTimestamp = `${updNow.getFullYear()}-${String(updNow.getMonth() + 1).padStart(2, '0')}-${String(updNow.getDate()).padStart(2, '0')} ${String(updNow.getHours()).padStart(2, '0')}:${String(updNow.getMinutes()).padStart(2, '0')}:${String(updNow.getSeconds()).padStart(2, '0')}`;
                doc.text(`Updated: ${updTimestamp}`, pageWidth - margin, pageHeight - 14, { align: 'right' });

                const pdfBase64 = doc.output('datauristring').split(',')[1];
                const uploadResponse = await fetch(API_URL, {
                    method: 'POST',
                    body: new URLSearchParams({
                        action: 'uploadFile', folderId: PDF_FOLDER_ID,
                        fileName: `Weighment_${editFormData.weighmentSlipNo}_updated_${Date.now()}.pdf`,
                        base64Data: pdfBase64, mimeType: 'application/pdf'
                    })
                });
                const uploadResult = await uploadResponse.json();
                if (uploadResult.success && uploadResult.fileUrl) pdfLink = uploadResult.fileUrl;
            } catch (pdfError) {
                console.error('PDF regeneration error:', pdfError);
            }

            // Ensure timestamp is in correct format (yyyy-mm-dd hh:mm:ss)
            const formatTimestampForSheet = (ts) => {
                if (!ts) return '';
                const date = new Date(ts);
                if (isNaN(date.getTime())) return ts;
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
            };

            // Update row in Kantaparchi sheet
            const sheetDate = formatTimestampForSheet(editFormData.date);

            const rowData = [
                formatTimestampForSheet(editingItem.timestamp), editFormData.serialNo, editFormData.rstNo,
                editFormData.weighmentSlipNo, sheetDate, editFormData.partyName,
                editFormData.lorryNo, editFormData.tareWeight, editFormData.grossWeight,
                editFormData.gunny, editFormData.deduction, editFormData.netWeight,
                editFormData.finalNetWeight, editFormData.mota, editFormData.jute,
                editFormData.newPkt, editFormData.plastic, editFormData.sarna,
                editFormData.total, editFormData.unloadingType, pdfLink
            ];

            const response = await fetch(API_URL, {
                method: 'POST',
                body: new URLSearchParams({
                    action: 'update', sheetName: KANTAPARCHI_SHEET,
                    rowIndex: editingItem.rowIndex, rowData: JSON.stringify(rowData)
                })
            });
            const result = await response.json();

            if (result.success) {
                showToast('Record updated successfully!', 'success');
                setShowEditModal(false);
                setEditingItem(null);
                await fetchHistoryItems();
            } else throw new Error(result.error || 'Failed to update');
        } catch (error) {
            console.error('Error updating:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally { setLoading(false); }
    };

    const hasActiveFilters = Object.values(filters).some(v => v !== "");

    const renderLabelContent = (label, value) => (
        <div className="space-y-1">
            <span className="text-xs font-medium text-gray-600 block">{label}</span>
            <span className="text-sm font-medium text-gray-900">{value || "-"}</span>
        </div>
    );

    const paddyPendingItems = filteredPending.filter(i => i.isPaddy);
    const otherPendingItems = filteredPending.filter(i => !i.isPaddy);

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
                        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Weighment</h1>
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
                        <nav className="-mb-px flex space-x-8 min-w-max">
                            <button onClick={() => setActiveTab("paddyPending")} className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === "paddyPending" ? "border-green-700 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                                <div className="flex items-center gap-2"><Clock className="w-4 h-4" />Pending Paddy Unloading ({paddyPendingItems.length})</div>
                            </button>
                            <button onClick={() => setActiveTab("otherPending")} className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === "otherPending" ? "border-orange-600 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                                <div className="flex items-center gap-2"><Clock className="w-4 h-4" />Pending Other Unloading ({otherPendingItems.length})</div>
                            </button>
                            <button onClick={() => setActiveTab("history")} className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === "history" ? "border-red-800 text-red-800" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" />History ({historyItems.length})</div>
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden px-4 lg:px-6 pb-4 lg:pb-6">
                    {/* Pending Paddy Unloading Tab */}
                    {activeTab === 'paddyPending' && (
                        <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-200 bg-green-50">
                                <h3 className="text-sm font-semibold text-green-800">Pending Paddy Unloading</h3>
                            </div>
                            <div className="flex-1 overflow-auto">
                                {/* Mobile Card View */}
                                <div className="lg:hidden p-3 space-y-3">
                                    {paddyPendingItems.map(item => (
                                        <div key={item.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                            <div className="px-3 py-2 bg-green-50 border-b border-gray-200 flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-gray-900">{item.serialNo || '-'}</p>
                                                    <p className="text-xs text-gray-600">RST: {item.rstNo || '-'} | {formatDate(item.date)}</p>
                                                </div>
                                                <button onClick={() => handleKantaparchiClick(item)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900">Kantaparchi</button>
                                            </div>
                                            <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                                                <div><span className="text-gray-500">Staff:</span> <span className="font-medium">{item.unloadingStaff || '-'}</span></div>
                                                <div><span className="text-gray-500">Party:</span> <span className="font-medium">{item.partyName || '-'}</span></div>
                                                <div><span className="text-gray-500">Vehicle:</span> <span className="font-medium font-mono">{item.vehicleNo || '-'}</span></div>
                                                <div><span className="text-gray-500">Driver:</span> <span className="font-medium">{item.driverName || '-'}</span></div>
                                                <div><span className="text-gray-500">Received:</span> <span className="font-medium">{item.paddyReceived || '-'}</span></div>
                                                <div><span className="text-gray-500">Return:</span> <span className="font-medium">{item.paddyReturn || '-'}</span></div>
                                                <div><span className="text-gray-500">Qty:</span> <span className="font-medium">{item.paddyQty || '-'}</span></div>
                                                <div><span className="text-gray-500">Type:</span> <span className="font-medium">{item.paddyType || '-'}</span></div>
                                            </div>
                                        </div>
                                    ))}
                                    {paddyPendingItems.length === 0 && (
                                        <div className="text-center py-12 text-gray-500">No pending paddy unloading records found</div>
                                    )}
                                </div>
                                {/* Desktop Table View */}
                                <table className="hidden lg:table w-full">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Action</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Serial No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">RST No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Unloading Type</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Slip No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Date</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Staff</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Party Name</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Vehicle No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Driver</th>
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
                                        {paddyPendingItems.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                                    <button onClick={() => handleKantaparchiClick(item)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900">Kantaparchi</button>
                                                </td>
                                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{item.serialNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{item.rstNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.unloadingType || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.slipNo || '-'}</td>
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
                                                    {item.pdfPaddy ? <a href={getDrivePreviewUrl(item.pdfPaddy)} target="_blank" rel="noopener noreferrer" className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 inline-flex items-center gap-1"><FileText className="w-3 h-3" /> View</a> : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {paddyPendingItems.length === 0 && (
                                            <tr><td colSpan={20} className="px-6 py-12 text-center text-gray-500">No pending paddy unloading records found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pending Other Unloading Tab */}                    {activeTab === 'otherPending' && (
                        <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-200 bg-orange-50">
                                <h3 className="text-sm font-semibold text-orange-800">Pending Other Unloading</h3>
                            </div>
                            <div className="flex-1 overflow-auto">
                                {/* Mobile Card View */}
                                <div className="lg:hidden p-3 space-y-3">
                                    {otherPendingItems.map(item => (
                                        <div key={item.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                            <div className="px-3 py-2 bg-orange-50 border-b border-gray-200 flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-gray-900">{item.serialNo || '-'}</p>
                                                    <p className="text-xs text-gray-600">RST: {item.rstNo || '-'} | {formatDate(item.date)}</p>
                                                </div>
                                                <button onClick={() => handleKantaparchiClick(item)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900">Kantaparchi</button>
                                            </div>
                                            <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                                                <div><span className="text-gray-500">Staff:</span> <span className="font-medium">{item.unloadingStaff || '-'}</span></div>
                                                <div><span className="text-gray-500">Party:</span> <span className="font-medium">{item.partyName || '-'}</span></div>
                                                <div><span className="text-gray-500">Vehicle:</span> <span className="font-medium font-mono">{item.vehicleNo || '-'}</span></div>
                                                <div><span className="text-gray-500">Driver:</span> <span className="font-medium">{item.driverName || '-'}</span></div>
                                                <div><span className="text-gray-500">Commodity:</span> <span className="font-medium">{item.commodity || '-'}</span></div>
                                                <div><span className="text-gray-500">Quality:</span> <span className="font-medium">{item.quality || '-'}</span></div>
                                                <div><span className="text-gray-500">Pkts:</span> <span className="font-medium">{item.noOfPkts || '-'}</span></div>
                                                <div><span className="text-gray-500">Qty:</span> <span className="font-medium">{item.qty || '-'}</span></div>
                                            </div>
                                        </div>
                                    ))}
                                    {otherPendingItems.length === 0 && (
                                        <div className="text-center py-12 text-gray-500">No pending other unloading records found</div>
                                    )}
                                </div>
                                {/* Desktop Table View */}
                                <table className="hidden lg:table w-full">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Action</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Serial No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">RST No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Unloading Type</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Slip No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Date</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Staff</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Party Name</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Vehicle No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Driver</th>
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
                                        {otherPendingItems.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                                    <button onClick={() => handleKantaparchiClick(item)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900">Kantaparchi</button>
                                                </td>
                                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{item.serialNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{item.rstNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.unloadingType || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.slipNo || '-'}</td>
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
                                                    {item.pdfOther ? <a href={getDrivePreviewUrl(item.pdfOther)} target="_blank" rel="noopener noreferrer" className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 inline-flex items-center gap-1"><FileText className="w-3 h-3" /> View</a> : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {otherPendingItems.length === 0 && (
                                            <tr><td colSpan={18} className="px-6 py-12 text-center text-gray-500">No pending other unloading records found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {showFilters && (
                        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/30">
                            <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-4 w-full max-w-md">
                                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">Quick Filters</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-gray-600">RST No</label>
                                        <input type="text" value={filters.rstNo} onChange={(e) => setFilters({ ...filters, rstNo: e.target.value })} placeholder="Search..." className="py-1.5 px-2 w-full text-xs rounded border border-gray-300" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-gray-600">Party Name</label>
                                        <input type="text" value={filters.partyName} onChange={(e) => setFilters({ ...filters, partyName: e.target.value })} placeholder="Search..." className="py-1.5 px-2 w-full text-xs rounded border border-gray-300" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-gray-600">Vehicle No</label>
                                        <input type="text" value={filters.vehicleNo} onChange={(e) => setFilters({ ...filters, vehicleNo: e.target.value })} placeholder="Search..." className="py-1.5 px-2 w-full text-xs rounded border border-gray-300" />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button type="button" onClick={() => setFilters({ rstNo: "", partyName: "", vehicleNo: "" })} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Clear</button>
                                    <button type="button" onClick={() => setShowFilters(false)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900">Close</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="px-4 py-3 bg-red-50 border-b border-gray-200">
                                <h3 className="text-sm font-semibold text-red-800">Weighment History</h3>
                            </div>
                            <div className="flex-1 overflow-auto">
                                {/* Mobile Card View */}
                                <div className="lg:hidden p-3 space-y-3">
                                    {filteredHistory.map(item => (
                                        <div key={item.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                            <div className="px-3 py-2 bg-red-50 border-b border-gray-200 flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-gray-900">{item.weighmentSlipNo || '-'}</p>
                                                    <p className="text-xs text-gray-600">RST: {item.rstNo || '-'} | {formatDate(item.date)}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleEditClick(item)} className="px-2 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900 inline-flex items-center gap-1">
                                                        <Edit className="w-3 h-3" /> Edit
                                                    </button>
                                                    {item.pdf && <a href={getDrivePreviewUrl(item.pdf)} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 inline-flex items-center"><FileText className="w-3 h-3" /></a>}
                                                </div>
                                            </div>
                                            <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                                                <div><span className="text-gray-500">Party:</span> <span className="font-medium">{item.partyName || '-'}</span></div>
                                                <div><span className="text-gray-500">Lorry:</span> <span className="font-medium font-mono">{item.lorryNo || '-'}</span></div>
                                                <div><span className="text-gray-500">Tare:</span> <span className="font-medium">{item.tareWeight || '-'}</span></div>
                                                <div><span className="text-gray-500">Gross:</span> <span className="font-medium">{item.grossWeight || '-'}</span></div>
                                                <div><span className="text-gray-500">Net:</span> <span className="font-medium">{item.netWeight || '-'}</span></div>
                                                <div><span className="text-gray-500">Final:</span> <span className="font-medium text-green-700">{item.finalNetWeight || '-'}</span></div>
                                                <div><span className="text-gray-500">Total Pkts:</span> <span className="font-medium text-blue-700">{item.total || '-'}</span></div>
                                                <div><span className="text-gray-500">Type:</span> <span className="font-medium">{item.unloadingType || '-'}</span></div>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredHistory.length === 0 && (
                                        <div className="text-center py-12 text-gray-500">No history records found</div>
                                    )}
                                </div>
                                {/* Desktop Table View */}
                                <table className="hidden lg:table w-full">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Action</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Serial No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">RST No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Unloading Type</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Weighment Slip No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Date</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Party Name</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Lorry No</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Tare Weight</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Gross Weight</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Gunny Weight</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Deduction</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Net Weight</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">Final Net Weight</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">MOTA</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">JUTE</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">NEW</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">PLASTIC</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">SARNA</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">TOTAL</th>
                                            <th className="px-3 py-3 text-xs font-semibold uppercase text-gray-700 whitespace-nowrap">PDF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredHistory.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                                    <button onClick={() => handleEditClick(item)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-800 rounded-md hover:bg-red-900 inline-flex items-center gap-1">
                                                        <Edit className="w-3 h-3" /> Edit
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{item.serialNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{item.rstNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.unloadingType || '-'}</td>
                                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">{item.weighmentSlipNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{formatDate(item.date)}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.partyName || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900 font-mono">{item.lorryNo || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.tareWeight || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.grossWeight || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.gunnyWeight || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.deduction || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.netWeight || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.finalNetWeight || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.mota || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.jute || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.newPkt || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.plastic || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.sarna || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-900">{item.total || '-'}</td>
                                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                                    {item.pdf ? <a href={getDrivePreviewUrl(item.pdf)} target="_blank" rel="noopener noreferrer" className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 inline-flex items-center gap-1"><FileText className="w-3 h-3" /> View</a> : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredHistory.length === 0 && (
                                            <tr><td colSpan={21} className="px-6 py-12 text-center text-gray-500">No history records found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Kantaparchi Form Modal */}
            {showFormModal && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 bg-gradient-to-r from-red-800 to-red-900">
                            <h3 className="text-lg font-bold text-white">Create Weighment Slip - {selectedItem.rstNo}</h3>
                            <button onClick={() => setShowFormModal(false)} className="text-white hover:text-white/80"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {renderLabelContent("Serial No", formData.serialNo)}
                                {renderLabelContent("RST No", formData.rstNo)}
                                {renderLabelContent("Unloading Type", formData.unloadingType)}
                            </div>
                            <form onSubmit={handleFormSubmit} className="space-y-6 border-t border-gray-200 pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <input type="datetime-local" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Party Name</label>
                                        <input type="text" value={formData.partyName} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Lorry No</label>
                                        <input type="text" value={formData.lorryNo} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tare Weight</label>
                                        <input type="text" value={formData.tareWeight} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Gross Weight</label>
                                        <input type="text" value={formData.grossWeight} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Gunny <span className="text-red-600">*</span></label>
                                        <input type="number" value={formData.gunny} onChange={(e) => setFormData({ ...formData, gunny: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Deduction</label>
                                        <input type="number" value={formData.deduction} onChange={(e) => setFormData({ ...formData, deduction: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Net Weight</label>
                                        <input type="text" value={formData.netWeight} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Final Net Weight</label>
                                        <input type="text" value={formData.finalNetWeight} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-green-50 font-semibold" />
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Packet Count</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Mota</label>
                                            <input type="number" value={formData.mota} onChange={(e) => setFormData({ ...formData, mota: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Jute</label>
                                            <input type="text" value={formData.jute} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">New</label>
                                            <input type="number" value={formData.newPkt} onChange={(e) => setFormData({ ...formData, newPkt: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Plastic</label>
                                            <input type="text" value={formData.plastic} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Sarna</label>
                                            <input type="number" value={formData.sarna} onChange={(e) => setFormData({ ...formData, sarna: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                                            <input type="text" value={formData.total} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-green-50 font-semibold" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                                    <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-red-800 rounded-md hover:bg-red-900 disabled:opacity-50">Save</button>
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
                            <h3 className="text-lg font-bold text-white">Edit Record - {editFormData.weighmentSlipNo}</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-white hover:text-white/80"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {renderLabelContent("Serial No", editFormData.serialNo)}
                                {renderLabelContent("RST No", editFormData.rstNo)}
                                {renderLabelContent("Weighment Slip No", editFormData.weighmentSlipNo)}
                                {renderLabelContent("Unloading Type", editFormData.unloadingType)}
                            </div>
                            <form onSubmit={handleEditSubmit} className="space-y-6 border-t border-gray-200 pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <input type="datetime-local" value={editFormData.date} onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Party Name</label>
                                        <input type="text" value={editFormData.partyName} onChange={(e) => setEditFormData({ ...editFormData, partyName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Lorry No</label>
                                        <input type="text" value={editFormData.lorryNo} onChange={(e) => setEditFormData({ ...editFormData, lorryNo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tare Weight</label>
                                        <input type="text" value={editFormData.tareWeight} onChange={(e) => setEditFormData({ ...editFormData, tareWeight: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Gross Weight</label>
                                        <input type="text" value={editFormData.grossWeight} onChange={(e) => setEditFormData({ ...editFormData, grossWeight: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Gunny</label>
                                        <input type="number" value={editFormData.gunny} onChange={(e) => setEditFormData({ ...editFormData, gunny: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Deduction</label>
                                        <input type="number" value={editFormData.deduction} onChange={(e) => setEditFormData({ ...editFormData, deduction: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Net Weight</label>
                                        <input type="text" value={editFormData.netWeight} onChange={(e) => setEditFormData({ ...editFormData, netWeight: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Final Net Weight</label>
                                        <input type="text" value={editFormData.finalNetWeight} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-green-50 font-semibold" />
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Packet Count</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Mota</label>
                                            <input type="number" value={editFormData.mota} onChange={(e) => setEditFormData({ ...editFormData, mota: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Jute</label>
                                            <input type="number" value={editFormData.jute} onChange={(e) => setEditFormData({ ...editFormData, jute: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">New</label>
                                            <input type="number" value={editFormData.newPkt} onChange={(e) => setEditFormData({ ...editFormData, newPkt: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Plastic</label>
                                            <input type="number" value={editFormData.plastic} onChange={(e) => setEditFormData({ ...editFormData, plastic: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Sarna</label>
                                            <input type="number" value={editFormData.sarna} onChange={(e) => setEditFormData({ ...editFormData, sarna: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                                            <input type="text" value={editFormData.total} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-green-50 font-semibold" />
                                        </div>
                                    </div>
                                </div>
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

export default Kantaparchi;
