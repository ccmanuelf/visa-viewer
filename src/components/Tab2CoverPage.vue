<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import axios from 'axios';
import ExcelJS from 'exceljs';

// Props to receive the selected declaration from Tab1
const props = defineProps({
  declaration: {
    type: Object,
    default: () => null
  }
});

// State variables
const isLoading = ref(false);
const hasError = ref(false);
const errorMessage = ref('');
const reportData = ref(null);
const editedCells = ref({});
const showDebug = ref(false); // Controls visibility of debug section

// Build SQL command using the environment variable and replacing the placeholder
const buildSqlCommand = (declaration) => {
  // Use the SQL command from environment variables
  const sqlTemplate = import.meta.env.VITE_VISA_SQL_CMD;
  // Use the ID field from the declaration for the SQL query instead of visa
  return sqlTemplate.replace('{ID_FROM_TABLE}', declaration.id);
};

// Fetch report data from API
const fetchReportData = async (declaration) => {
if (!declaration || !declaration.id) {
console.log('No valid declaration provided to fetchReportData');
return;
}

console.log('Fetching report data for declaration ID:', declaration.id, 'VISA:', declaration.visa);
isLoading.value = true;
hasError.value = false;
errorMessage.value = '';

try {
// Build the SQL command
const sqlCmd = buildSqlCommand(declaration);
console.log('Using SQL command:', sqlCmd);
console.log('API call initiated at:', new Date().toISOString());

// Make API call
const apiUrl = 'http://localhost:3000/api';
console.log('Sending request to:', apiUrl);
const response = await axios.post(apiUrl, {
sqlCmd: sqlCmd,
responseFormat: 'JSON' // Changed from CSV to JSON for better debugging
});
console.log('API call completed at:', new Date().toISOString());

// Check if the response is successful
if (response.data && response.data.status === 'OK') {
console.log('API response successful:', response.data);
// Process the data
const processedData = processReportData(response.data.data);
console.log('Processed report data:', processedData);
if (processedData) {
reportData.value = processedData;
} else {
throw new Error('Failed to process report data');
}
} else {
console.error('API error response:', response.data);
throw new Error('API returned an error: ' + (response.data?.message || 'Unknown error'));
}
} catch (error) {
console.error('Error fetching report data:', error);
hasError.value = true;
errorMessage.value = error.message || 'Failed to load report data';
reportData.value = null;
} finally {
isLoading.value = false;
}
};
//     }
//   } catch (error) {
//     console.error('Error fetching report data:', error);
//     hasError.value = true;
//     errorMessage.value = error.message || 'Failed to load report data';
//     reportData.value = null;
//   } finally {
//     isLoading.value = false;
//   }
// };

// Watch for changes in the selected declaration
watch(() => props.declaration, async (newDeclaration) => {
  console.log('Declaration changed in Tab2:', newDeclaration);
  if (newDeclaration) {
    // Only trigger when a declaration is selected (not when deselected)
    await fetchReportData(newDeclaration);
  } else {
    // Clear report data when no declaration is selected
    reportData.value = null;
  }
}, { immediate: true });

// Process the raw data into a structured report
const processReportData = (rawData) => {
console.log('Processing raw data:', rawData);

// Handle different data formats (JSON object vs array)
let processableData = [];

// Check if we have a valid data structure from the API
if (rawData && typeof rawData === 'object') {
console.log('Detected JSON format data with DataTable structure');

// Extract rows from the DataTable structure - similar to how Tab1 processes data
if (rawData.rows && Array.isArray(rawData.rows)) {
// Transform the data similar to how apiService.js does it
processableData = rawData.rows.map(row => {
const rowObj = {};
if (rawData.columns && Array.isArray(rawData.columns)) {
rawData.columns.forEach((column, index) => {
// Check if column is an object with columnName property (like in Tab1)
if (column && typeof column === 'object' && column.columnName) {
// Store both original case and lowercase for case-insensitive access
const columnName = column.columnName;
rowObj[columnName] = row.values && row.values[index] ? row.values[index].value : null;

// Also add lowercase version for case-insensitive access
rowObj[columnName.toLowerCase()] = row.values && row.values[index] ? row.values[index].value : null;
} else {
// Fallback for simpler column structure
rowObj[column] = row[index];
}
});
}
return rowObj;
});
console.log('Converted DataTable to array of objects:', processableData);
} else if (rawData.data && typeof rawData.data === 'object') {
// Handle nested data structure if present
if (rawData.data.rows && Array.isArray(rawData.data.rows)) {
processableData = rawData.data.rows.map(row => {
const rowObj = {};
if (rawData.data.columns && Array.isArray(rawData.data.columns)) {
rawData.data.columns.forEach((column, index) => {
if (column && typeof column === 'object' && column.columnName) {
// Store both original case and lowercase for case-insensitive access
const columnName = column.columnName;
rowObj[columnName] = row.values && row.values[index] ? row.values[index].value : null;

// Also add lowercase version for case-insensitive access
rowObj[columnName.toLowerCase()] = row.values && row.values[index] ? row.values[index].value : null;
} else {
rowObj[column] = row[index];
}
});
}
return rowObj;
});
console.log('Converted nested DataTable to array of objects:', processableData);
}
}
}

// Check if processableData is valid
if (!processableData || !Array.isArray(processableData) || processableData.length === 0) {
console.error('Invalid or empty processed data');
return {
header: {
clientName: 'Unknown',
from: 'Unknown',
to: 'Unknown',
exportDate: 'Unknown',
shipmentNumber: props.declaration ? props.declaration.visa || 'Unknown' : 'Unknown'
},
lineItems: [],
subtotals: {
quantity: 0,
boxes: 0,
weight: 0,
totalCost: 0,
skids: 0
},
packagingSection: []
};
}
// 1. Identify packaging materials
const packagingMaterials = identifyPackagingMaterials(processableData);

// 2. Extract header information
const header = constructHeader(processableData);

// 3. Build the summary body
const lineItems = constructSummaryBody(processableData, packagingMaterials);

// 4. Calculate subtotals
const subtotals = calculateSubtotals(lineItems);

// 5. Build packaging summary
const packagingSection = constructPackagingSummary(processableData, packagingMaterials);

// 6. Return complete report structure
return {
header,
lineItems,
subtotals,
packagingSection
};
};

// Identify packaging materials based on multiple strategies
const identifyPackagingMaterials = (rawData) => {
// Parts with and without SKID assignments
const partsWithSkids = new Set();
const allParts = new Set();

// Track which parts appear with SKID assignments
rawData.forEach(row => {
// Handle case-insensitive property names
const part = row.PART || row.part;
const skids = row.SKIDS || row.skids;

if (part) {
allParts.add(part);

if (skids !== null && skids !== undefined) {
partsWithSkids.add(part);
}
}
});

// Strategy 1: Parts without skids are likely packaging
const packagingBySkidPattern = [...allParts].filter(part => !partsWithSkids.has(part));

// Strategy 2: Parts with packaging-related names
const packagingByNamePattern = [...allParts].filter(part => {
if (typeof part !== 'string') return false;

return part.includes('PALLET') || 
part.includes('BOX') || 
part.includes('CONTAINER') ||
part.includes('TOTE') ||
part.includes('LID') ||
part.includes('KW16.5X18X24');
});

// Strategy 3: Parts where SUB_PART is not "PRODUCTO TERMINADO"
const packagingBySubPartField = rawData
.filter(row => {
const subPart = row.SUB_PART || row.sub_part;
const part = row.PART || row.part;

return part && subPart && subPart !== 'PRODUCTO TERMINADO';
})
.map(row => row.PART || row.part);

// Combine all strategies but remove duplicates
return [...new Set([...packagingBySkidPattern, ...packagingByNamePattern, ...packagingBySubPartField])];
};

// Extract header information from the data based on mapping rules
const constructHeader = (rawData) => {
if (!rawData || rawData.length === 0) {
// If no data but we have a declaration, use its properties
if (props.declaration) {
return {
clientName: props.declaration.company_name || 'Unknown',
from: 'Unknown',
to: 'Unknown',
exportDate: props.declaration.export_at ? new Date(props.declaration.export_at).toLocaleDateString() : 'Unknown',
shipmentNumber: props.declaration.visa || 'Unknown'
};
}

return {
clientName: 'Unknown',
from: 'Unknown',
to: 'Unknown',
exportDate: 'Unknown',
shipmentNumber: 'Unknown'
};
}

// Get the first row for header information
const firstRow = rawData[0];

// Get client name - based on mapping, use COMPANY_NAME
let clientName = 'Unknown';
if (firstRow.COMPANY_NAME) {
clientName = firstRow.COMPANY_NAME;
} else if (firstRow['company_name']) {
clientName = firstRow['company_name'];
} else if (props.declaration && props.declaration.company_name) {
clientName = props.declaration.company_name;
}

// Extract from/to fields based on mapping
const from = firstRow.from || firstRow.FROM || 'Unknown';
const to = firstRow.to || firstRow.TO || 'Unknown';

// Extract export date based on mapping
let exportDate = 'Unknown';
if (firstRow.export_at || firstRow.EXPORT_AT) {
try {
const dateValue = firstRow.export_at || firstRow.EXPORT_AT;
const date = new Date(dateValue);
exportDate = date.toLocaleDateString();
} catch (e) {
exportDate = firstRow.export_at || firstRow.EXPORT_AT;
}
} else if (props.declaration && props.declaration.export_at) {
try {
const date = new Date(props.declaration.export_at);
exportDate = date.toLocaleDateString();
} catch (e) {
exportDate = props.declaration.export_at;
}
}

// Get shipment number from visa field
const shipmentNumber = firstRow.visa || firstRow.VISA || 
(props.declaration ? props.declaration.visa : 'Unknown');

return {
clientName,
from,
to,
exportDate,
shipmentNumber
};
};

// Build the summary body with line items according to mapping rules
const constructSummaryBody = (rawData, packagingMaterials) => {
// Filter out packaging materials - handle case-insensitive property names
const productData = rawData.filter(row => {
const part = row.PART || row.part;
return part && !packagingMaterials.includes(part);
});

// Group by SKID+PART combination
const partSkidGroups = {};

productData.forEach(row => {
// Handle case-insensitive property names
const skids = row.SKIDS || row.skids;
const part = row.PART || row.part;

if (skids === null || skids === undefined || !part) return;

const key = `${skids}|${part}`;

if (!partSkidGroups[key]) {
// Use mapping rules to extract field values
partSkidGroups[key] = {
skid: skids,  // SKID from SKIDS
part: part,   // PART
clientPart: '',
description: '',
po: row.LOT_NUM || row.lot_num || row.LOT || row.lot || '', // PO from LOT_NUM
qty: 0,
uom: row.UM_US || row.um_us || 'PZ', // UOM from UM_US
origin: row.ORIGIN_US || row.origin_us || '', // ORIGIN from ORIGIN_US
qtyPerSet: parseFloat(row.QTY2 || row.qty2 || 0), // QTY PER SET from QTY2
unitCost: parseFloat(row.COST || row.cost || 0), // UNIT COST from COST
labor: parseFloat(row.LABOR || row.labor || 0), // LABOR from LABOR
boxNumbers: new Set(),
weight: parseFloat(row.US_WEIGHT || row.us_weight || 0) // Weight per unit from US_WEIGHT
};

// PART CLIENT determination based on mapping rules
// 1. Try MX_PART first 
if (row.MX_PART || row.mx_part) {
partSkidGroups[key].clientPart = row.MX_PART || row.mx_part;
} 
// 2. Try COMMENTS
else if (row.COMMENTS || row.comments) {
partSkidGroups[key].clientPart = row.COMMENTS || row.comments;
}
// 3. If both empty, try to derive from PART and COMPANY_PREFIX
else if (part && typeof part === 'string') {
const companyPrefix = row.COMPANY_PREFIX || row.company_prefix || '';
if (companyPrefix && part.startsWith(companyPrefix)) {
// Trim company prefix from part
partSkidGroups[key].clientPart = part.substring(companyPrefix.length);
} else if (part.startsWith('KWS')) {
partSkidGroups[key].clientPart = part.replace('KWS', 'S');
} else if (part.startsWith('KW')) {
partSkidGroups[key].clientPart = 'S' + part.substring(2);
}
}

// DESCRIPTION determination based on mapping rules
if (row.DESC_CUMPLE_US || row.desc_cumple_us) {
// Option MX_DATA: Use DESC_CUMPLE_US if available
partSkidGroups[key].description = row.DESC_CUMPLE_US || row.desc_cumple_us;
} else if (row.DESCRIPTION || row.description) {
// Option US_DATA: Use DESCRIPTION
partSkidGroups[key].description = row.DESCRIPTION || row.description;
}
}

// Accumulate quantity - QTY from QTY1
partSkidGroups[key].qty += parseFloat(row.QTY1 || row.qty1 || 0);

// Track unique box numbers - BOX from CTNS - this is CRITICAL for correct box counting
const ctns = row.CTNS || row.ctns;
if (ctns !== null && ctns !== undefined) {
partSkidGroups[key].boxNumbers.add(ctns);
}
});

// Transform groups into line items
return Object.values(partSkidGroups).map(group => ({
part: group.part,
clientPart: group.clientPart,
description: group.description,
po: group.po,
qty: group.qty,
uom: group.uom,
boxCount: group.boxNumbers.size, // BOX value is unique boxes for this PART+SKID
origin: group.origin,
qtyPerSet: group.qtyPerSet,
weight: group.weight * group.qty, // Total weight = weight per unit * quantity
unitCost: group.unitCost,
labor: group.labor,
totalCost: (group.unitCost + group.labor) * group.qty, // Total cost
skid: group.skid
})).sort((a, b) => {
// Sort by SKID first, then by PART
const skidA = parseInt(a.skid) || 0;
const skidB = parseInt(b.skid) || 0;

if (skidA !== skidB) return skidA - skidB;
return a.part.localeCompare(b.part);
});
};
//};

// Calculate subtotals for the report
const calculateSubtotals = (lineItems) => {
if (!lineItems || lineItems.length === 0) {
return {
quantity: 0,
boxes: 0,
weight: 0,
cost: 0,
skids: 0
};
}

const totals = lineItems.reduce((acc, item) => {
acc.quantity += item.qty || 0;
acc.boxes += item.boxCount || 0;
acc.weight += item.weight || 0;
acc.cost += item.totalCost || 0;
acc.skids.add(item.skid);
return acc;
}, {
quantity: 0,
boxes: 0,
weight: 0,
cost: 0,
skids: new Set()
});

return {
quantity: totals.quantity,
boxes: totals.boxes,
weight: parseFloat(totals.weight.toFixed(1)),
totalCost: parseFloat(totals.cost.toFixed(2)),
skids: totals.skids.size
};
};

// Helper function to derive packaging descriptions
const derivePackagingDescription = (partNumber) => {
if (!partNumber || typeof partNumber !== 'string') return 'Standard Packaging';

if (partNumber.includes('PALLET')) {
return 'Standard Wood Pallet';
} 
else if (partNumber.includes('TOTE')) {
return 'Standard Plastic Tote';
}
else if (partNumber.includes('LID')) {
return 'Plastic Lid';
}
else if (partNumber.includes('BOX') || partNumber.includes('KW16.5X18X24')) {
return 'Standard Cardboard Box';
}

return 'Standard Packaging';
};

// Build the packaging summary section with proper total row
const constructPackagingSummary = (rawData, packagingMaterials) => {
// Filter to include only identified packaging materials - handle case-insensitive property names
const packagingData = rawData.filter(row => {
const part = row.PART || row.part;
return part && packagingMaterials.includes(part);
});

// Group by packaging type and sum quantities
const packagingGroups = {};

packagingData.forEach(row => {
const part = row.PART || row.part;

if (!packagingGroups[part]) {
packagingGroups[part] = {
part,
description: row.DESCRIPTION || row.DESC_CUMPLE_US || row.description || derivePackagingDescription(part),
qty: 0,
boxCount: 0
};
}

// Accumulate quantity - handle case-insensitive property names
packagingGroups[part].qty += parseFloat(row.QTY1 || row.qty1 || 0);

// Count boxes if applicable - handle case-insensitive property names
const ctns = row.CTNS || row.ctns;
if (ctns !== null && ctns !== undefined) {
packagingGroups[part].boxCount += 1;
}
});

// Convert to array
const packagingItems = Object.values(packagingGroups);

// Calculate total quantity
const totalQuantity = packagingItems.reduce((sum, item) => sum + item.qty, 0);

// Add a total row
packagingItems.push({
part: 'Total',
description: '',
qty: totalQuantity,
boxCount: 0
});

return packagingItems;
};

// Make a cell editable
const makeEditable = (event) => {
  // Make the cell editable
  const cell = event.target;
  const originalValue = cell.textContent;
  
  // Store original value for potential revert
  cell.dataset.originalValue = originalValue;
  
  // Make editable and focus
  cell.contentEditable = true;
  cell.focus();
  
  // Add event listeners for finish editing
  cell.addEventListener('blur', finishEditing);
  cell.addEventListener('keydown', handleEditKeydown);
};

// Finish editing a cell
const finishEditing = (event) => {
  const cell = event.target;
  const newValue = cell.textContent;
  const originalValue = cell.dataset.originalValue;
  const rowIndex = cell.dataset.rowIndex;
  const column = cell.dataset.column;
  
  // Store the edited value
  if (newValue !== originalValue) {
    if (!editedCells.value[rowIndex]) {
      editedCells.value[rowIndex] = {};
    }
    editedCells.value[rowIndex][column] = newValue;
  }
  
  // Remove editable state
  cell.contentEditable = false;
  
  // Remove event listeners
  cell.removeEventListener('blur', finishEditing);
  cell.removeEventListener('keydown', handleEditKeydown);
};

// Handle keydown events during editing
const handleEditKeydown = (event) => {
  // Handle Enter key to finish editing
  if (event.key === 'Enter') {
    event.preventDefault();
    event.target.blur();
  }
  
  // Handle Escape key to cancel editing
  if (event.key === 'Escape') {
    event.preventDefault();
    event.target.textContent = event.target.dataset.originalValue;
    event.target.blur();
  }
};

// Export the report to Excel
const exportToExcel = async () => {
  if (!reportData.value) return;
  
  try {
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Shipment Report');
    
    // Create header rows
    worksheet.addRow(['Client Name', reportData.value.header.clientName, '', 'Export Date', reportData.value.header.exportDate]);
    worksheet.addRow(['From', reportData.value.header.from, '', 'Shipment #', reportData.value.header.shipmentNumber]);
    worksheet.addRow(['To', reportData.value.header.to, '', '', '']);
    worksheet.addRow(['', '', '', '', '']); // Empty row for spacing
    
    // Create column headers
    const columnHeaders = [
      'PART', 'PART CLIENT', 'DESCRIPTION', 'PO', 'QTY', 'UOM', 'BOX',
      'ORIGIN', 'QTY PER SET', 'TOTAL WEIGHT (LBS)', 'UNIT COST', 'LABOR', 'TOTAL COST', 'SKID'
    ];
    worksheet.addRow(columnHeaders);
    
    // Style the header row
    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true };
    
    // Add data rows
    reportData.value.lineItems.forEach((item, index) => {
      const rowEdits = editedCells.value[index] || {};
      
      worksheet.addRow([
        rowEdits.part || item.part,
        rowEdits.clientPart || item.clientPart,
        rowEdits.description || item.description,
        rowEdits.po || item.po,
        parseFloat(rowEdits.qty || item.qty),
        rowEdits.uom || item.uom,
        parseInt(rowEdits.boxCount || item.boxCount),
        rowEdits.origin || item.origin,
        parseFloat(rowEdits.qtyPerSet || item.qtyPerSet),
        parseFloat(rowEdits.weight || item.weight),
        parseFloat(rowEdits.unitCost || item.unitCost),
        parseFloat(rowEdits.labor || item.labor),
        parseFloat(rowEdits.totalCost || item.totalCost),
        rowEdits.skid || item.skid
      ]);
    });
    
    // Add subtotal row
    const currentRow = worksheet.rowCount + 1;
    worksheet.addRow([
      '', '', '', 'Total',
      reportData.value.subtotals.quantity,
      '',
      reportData.value.subtotals.boxes,
      '',
      '',
      reportData.value.subtotals.weight,
      '',
      '',
      reportData.value.subtotals.totalCost,
      reportData.value.subtotals.skids
    ]);
    
    // Style the subtotal row
    const subtotalRow = worksheet.getRow(currentRow);
    subtotalRow.font = { bold: true };
    
    // Add empty row for spacing
    worksheet.addRow(['', '', '', '', '']);
    
    // Add packaging section header
    worksheet.addRow(['', '', '', '', '', 'Box\'s', 'Quantity']);
    const packagingHeaderRow = worksheet.getRow(worksheet.rowCount);
    packagingHeaderRow.font = { bold: true };
    
    // Add packaging rows
    reportData.value.packagingSection.forEach(item => {
      worksheet.addRow(['', '', '', '', '', item.boxCount, item.qty]);
    });
    
    // Format number columns
    worksheet.getColumn(10).numFmt = '0.00'; // TOTAL WEIGHT
    worksheet.getColumn(11).numFmt = '0.00'; // UNIT COST
    worksheet.getColumn(12).numFmt = '0.00'; // LABOR
    worksheet.getColumn(13).numFmt = '0.00'; // TOTAL COST
    
    // Auto-size columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    
    // Generate file name
    const fileName = `Shipment_Report_${reportData.value.header.shipmentNumber}.xlsx`;
    
    // Write file and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    // Create a link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('Failed to export report: ' + error.message);
  }
};

// For testing purposes - use sample data if needed
const useSampleData = ref(false);
const toggleSampleData = () => {
  useSampleData.value = !useSampleData.value;
  if (useSampleData.value && props.declaration) {
    // Use sample data instead of API call
    reportData.value = getSampleReportData();
  } else if (props.declaration) {
    // Fetch real data
    fetchReportData(props.declaration.id);
  }
};

// Sample data function for testing
const getSampleReportData = () => {
  // Return a sample report structure for testing
  return {
    header: {
      clientName: 'Sample Company',
      from: 'Sample Sender',
      to: 'Sample Recipient',
      exportDate: '2023-01-01',
      shipmentNumber: '123'
    },
    lineItems: [
      {
        part: 'PART-001',
        clientPart: 'CLIENT-001',
        description: 'Sample Product 1',
        po: 'PO-001',
        qty: 100,
        uom: 'PZ',
        boxCount: 5,
        origin: 'US',
        qtyPerSet: 1,
        weight: 500,
        unitCost: 10,
        labor: 2,
        totalCost: 1200,
        skid: '1'
      },
      {
        part: 'PART-002',
        clientPart: 'CLIENT-002',
        description: 'Sample Product 2',
        po: 'PO-002',
        qty: 200,
        uom: 'PZ',
        boxCount: 10,
        origin: 'MX',
        qtyPerSet: 1,
        weight: 1000,
        unitCost: 15,
        labor: 3,
        totalCost: 3600,
        skid: '2'
      }
    ],
    subtotals: {
      quantity: 300,
      boxes: 15,
      weight: 1500,
      totalCost: 4800,
      skids: 2
    },
    packagingSection: [
      {
        part: 'PACKAGING-001',
        description: 'Cardboard Box',
        qty: 15,
        boxCount: 0
      },
      {
        part: 'PACKAGING-002',
        description: 'Pallet',
        qty: 2,
        boxCount: 0
      }
    ]
  };
};
</script>

<template>
  <div class="cover-page-container">
    <div v-if="!props.declaration" class="no-selection">
      <p>Please select a declaration from the list to view its cover page.</p>
    </div>
    
    <div v-else>
      <!-- Debug toggle -->
<div class="debug-toggle">
<button @click="showDebug = !showDebug" class="button is-small">
{{ showDebug ? 'Hide Debug Info' : 'Show Debug Info' }}
</button>
</div>

<!-- Debug information -->
<div v-if="showDebug" class="debug-section">
<h3>Debug Information</h3>
<p>Selected Declaration ID: {{ props.declaration.id }}</p>
<p>Selected Declaration VISA: {{ props.declaration.visa }}</p>
<p>Loading State: {{ isLoading ? 'Loading...' : 'Not Loading' }}</p>
<p>Error State: {{ hasError ? 'Error: ' + errorMessage : 'No Errors' }}</p>
<p>Report Data: {{ reportData ? 'Available' : 'Not Available' }}</p>
</div>
      
      <div class="report-controls">
        <h2>Shipment Report</h2>
        <div class="buttons">
          <button @click="toggleSampleData" class="toggle-button">
            {{ useSampleData ? 'Use API Data' : 'Use Sample Data' }}
          </button>
          <button @click="exportToExcel" class="export-button" :disabled="!reportData">
            Download XLSX
          </button>
        </div>
      </div>
      
      <div v-if="isLoading" class="loading-indicator">
        <p>Loading report data...</p>
      </div>
      
      <div v-else-if="hasError" class="error-message">
        <p>{{ errorMessage }}</p>
        <button @click="fetchReportData(props.declaration.id)" class="retry-button">
          Retry
        </button>
      </div>
      
      <div v-else-if="reportData" class="report-container">
        <!-- Header section -->
        <table class="report-table">
          <tbody>
            <tr>
              <td><strong>Client Name</strong></td>
              <td>{{ reportData.header.clientName }}</td>
              <td></td>
              <td><strong>Export Date</strong></td>
              <td>{{ reportData.header.exportDate }}</td>
            </tr>
            <tr>
              <td><strong>From</strong></td>
              <td>{{ reportData.header.from }}</td>
              <td></td>
              <td><strong>Shipment #</strong></td>
              <td>{{ reportData.header.shipmentNumber }}</td>
            </tr>
            <tr>
              <td><strong>To</strong></td>
              <td>{{ reportData.header.to }}</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
        
        <!-- Main report table -->
        <div class="table-wrapper">
          <table class="report-table">
            <thead>
              <tr>
                <th>PART</th>
                <th>PART CLIENT</th>
                <th>DESCRIPTION</th>
                <th>PO</th>
                <th>QTY</th>
                <th>UOM</th>
                <th>BOX</th>
                <th class="hide-mobile">ORIGIN</th>
                <th class="hide-mobile">QTY PER SET</th>
                <th>TOTAL WEIGHT (LBS)</th>
                <th class="hide-mobile">UNIT COST</th>
                <th class="hide-mobile">LABOR</th>
                <th>TOTAL COST</th>
                <th>SKID</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in reportData.lineItems" :key="`${item.skid}-${item.part}`">
                <td>{{ item.part }}</td>
                <td class="editable" @click="makeEditable" :data-row-index="index" data-column="clientPart">{{ item.clientPart }}</td>
                <td class="editable description-cell" @click="makeEditable" :data-row-index="index" data-column="description">{{ item.description }}</td>
                <td class="editable" @click="makeEditable" :data-row-index="index" data-column="po">{{ item.po }}</td>
                <td class="editable" @click="makeEditable" :data-row-index="index" data-column="qty">{{ item.qty }}</td>
                <td>{{ item.uom }}</td>
                <td class="editable" @click="makeEditable" :data-row-index="index" data-column="boxCount">{{ item.boxCount }}</td>
                <td class="editable hide-mobile" @click="makeEditable" :data-row-index="index" data-column="origin">{{ item.origin }}</td>
                <td class="editable hide-mobile" @click="makeEditable" :data-row-index="index" data-column="qtyPerSet">{{ item.qtyPerSet }}</td>
                <td class="editable" @click="makeEditable" :data-row-index="index" data-column="weight">{{ item.weight.toFixed(2) }}</td>
                <td class="editable hide-mobile" @click="makeEditable" :data-row-index="index" data-column="unitCost">{{ item.unitCost.toFixed(2) }}</td>
                <td class="editable hide-mobile" @click="makeEditable" :data-row-index="index" data-column="labor">{{ item.labor.toFixed(2) }}</td>
                <td>{{ item.totalCost.toFixed(2) }}</td>
                <td>{{ item.skid }}</td>
              </tr>
              <tr class="subtotal-row">
                <td colspan="3"></td>
                <td><strong>Total</strong></td>
                <td><strong>{{ reportData.subtotals.quantity }}</strong></td>
                <td></td>
                <td><strong>{{ reportData.subtotals.boxes }}</strong></td>
                <td class="hide-mobile"></td>
                <td class="hide-mobile"></td>
                <td><strong>{{ reportData.subtotals.weight.toFixed(2) }}</strong></td>
                <td class="hide-mobile"></td>
                <td class="hide-mobile"></td>
                <td><strong>{{ reportData.subtotals.totalCost.toFixed(2) }}</strong></td>
                <td><strong>{{ reportData.subtotals.skids }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Packaging section -->
        <table class="packaging-table">
          <thead>
            <tr>
              <td colspan="5"></td>
              <td>Box's</td>
              <td>Quantity</td>
            </tr>
          </thead>
          <tbody>
            <!-- Packaging rows -->
            <tr v-for="item in reportData.packagingSection" :key="item.part"
              :class="{ 'total-row': item.part === 'Total' }">
              <td colspan="5">{{ item.description }}</td>
              <td>{{ item.boxCount }}</td>
              <td>{{ item.qty }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.report-container {
  max-width: 100%;
  overflow-x: auto;
  position: relative;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px; /* Ensure minimum width for content */
}

.report-table th {
  position: sticky;
  top: 0;
  background: #f8f9fa;
  z-index: 10;
  padding: 12px 8px;
  text-align: left;
  border-bottom: 2px solid #dee2e6;
  white-space: nowrap;
}

.report-table td {
  padding: 8px;
  border-bottom: 1px solid #dee2e6;
  vertical-align: top;
}

.report-table tr:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.02);
}

.report-table .description-cell {
  max-width: 300px;
  white-space: normal;
  word-wrap: break-word;
}

/* Responsive design */
@media screen and (max-width: 1024px) {
  .report-table {
    font-size: 14px;
  }
  
  .report-table th,
  .report-table td {
    padding: 6px 4px;
  }
  
  .report-table .description-cell {
    max-width: 200px;
  }
}

@media screen and (max-width: 768px) {
  .report-table {
    font-size: 12px;
  }
  
  /* Hide less critical columns */
  .report-table .hide-mobile {
    display: none;
  }
  
  .report-table .description-cell {
    max-width: 150px;
  }
}
</style>