const SPREADSHEET_ID = "1a9wR1NVmJfv1nFNkX9ZGrAc1H1XuHuhr7QveozlI17Y";

function doGet(e) {
  const sheetName = e.parameter.sheet || "Data";

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return jsonError(`Sheet '${sheetName}' not found`);
    }

    const data = sheet.getDataRange().getValues();
    const result = {
      success: true,
      updated: new Date().toISOString(),
      rows: data.length,
      data: data
    };

    const json = JSON.stringify(result);

    return ContentService.createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return jsonError(err.message || "Server error");
  }
}

function jsonError(msg) {
  return ContentService.createTextOutput(
    JSON.stringify({ success: false, error: msg })
  ).setMimeType(ContentService.MimeType.JSON);
}

function fetchSheetData(sheetName) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(sheetName);
    var dataRange = sheet.getDataRange();
    var data = dataRange.getDisplayValues(); // This returns exactly what's displayed
    var headers = data[0]; // First row is headers
    var timeColumns = [];
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i].toString().toLowerCase();
      if (header.includes('time') || header.includes('in') || header.includes('out')) {
        timeColumns.push(i);
      }
    }
    for (var row = 1; row < data.length; row++) {
      for (var col of timeColumns) {
        if (data[row][col] && data[row][col] !== '') {
          // Convert any date objects back to time strings
          var cell = sheet.getRange(row + 1, col + 1);
          var displayValue = cell.getDisplayValue(); // Get the exact displayed value
          data[row][col] = displayValue;
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: data
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

function doOptions(e) {
  var response = ContentService.createTextOutput('');
  return setCorsHeaders(response);
}

function doPost(e) {
  try {
    var params = e.parameter;
    var action = params.action || 'insert'; // Default to insert if action not specified
    console.log('Action received:', action);
    console.log('All params:', params);
    if (action === 'uploadFile') {
      return handleFileUpload(e);
    }
    var sheetName = params.sheetName;
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(sheetName);
    if (action === 'insert') {
      var rowData = JSON.parse(params.rowData);
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, 1, rowData.length).setValues([rowData]);
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        message: "Data inserted successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    } 
    else if (action === 'update') {
      // Update an existing row
      var rowIndex = parseInt(params.rowIndex);
      var rowData = JSON.parse(params.rowData);
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index for update");
      }
      for (var i = 0; i < rowData.length; i++) {
        // Skip empty cells to preserve original data if not changed
        if (rowData[i] !== '') {
          sheet.getRange(rowIndex, i + 1).setValue(rowData[i]);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        message: "Data updated successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    } 
    else if (action === 'updateCell') {
      var rowIndex = parseInt(params.rowIndex);
      var columnIndex = parseInt(params.columnIndex);
      var value = params.value;
      if (isNaN(rowIndex) || rowIndex < 1 || isNaN(columnIndex) || columnIndex < 1) {
        throw new Error("Invalid row or column index for update");
      }
      sheet.getRange(rowIndex, columnIndex).setValue(value);
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        message: "Cell updated successfully" 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'delete') {
      var rowIndex = parseInt(params.rowIndex);
      
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index for delete");
      }
      sheet.deleteRow(rowIndex);
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        message: "Row deleted successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'markDeleted') {
      var rowIndex = parseInt(params.rowIndex);
      var columnIndex = parseInt(params.columnIndex);
      var value = params.value || 'Yes'; // Default to "Yes" if not specified
      
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index for marking as deleted");
      }
      if (isNaN(columnIndex) || columnIndex < 1) {
        throw new Error("Invalid column index for marking as deleted");
      }
      sheet.getRange(rowIndex, columnIndex).setValue(value);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        message: "Row marked as deleted successfully" 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    else {
      throw new Error("Unknown action: " + action);
    }
  } catch (error) {
    console.error("Error in doPost:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleFileUpload(e) {
  try {
    console.log('handleFileUpload called');
    var params = e.parameter;
    console.log('File upload params:', {
      hasBase64Data: !!params.base64Data,
      fileName: params.fileName,
      mimeType: params.mimeType,
      folderId: params.folderId
    });
    if (!params.base64Data || !params.fileName || !params.mimeType || !params.folderId) {
      throw new Error("Missing required parameters for file upload. Required: base64Data, fileName, mimeType, folderId");
    }
    var fileUrl = uploadFileToDrive(params.base64Data, params.fileName, params.mimeType, params.folderId);
    if (!fileUrl) {
      throw new Error("Failed to upload file to Google Drive");
    }
    console.log('File uploaded successfully:', fileUrl);
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileUrl: fileUrl,
      message: "File uploaded successfully"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error("Error in handleFileUpload:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
  try {
    console.log('uploadFileToDrive called with:', {
      fileName: fileName,
      mimeType: mimeType,
      folderId: folderId,
      base64DataLength: base64Data ? base64Data.length : 0
    });
    let fileData = base64Data;
    if (base64Data.indexOf('base64,') !== -1) {
      fileData = base64Data.split('base64,')[1];
      console.log('Removed data URL prefix');
    }
    const decoded = Utilities.base64Decode(fileData);
    console.log('Base64 decoded, length:', decoded.length);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    console.log('Blob created');
    const folder = DriveApp.getFolderById(folderId);
    console.log('Folder retrieved:', folder.getName());
    const file = folder.createFile(blob);
    console.log('File created with ID:', file.getId());
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    console.log('Sharing permissions set');
    const fileUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
    console.log('File URL generated:', fileUrl);
    return fileUrl;
  } catch (error) {
    console.error("Error in uploadFileToDrive:", error);
    console.error("Error details:", error.toString());
    return null;
  }
}