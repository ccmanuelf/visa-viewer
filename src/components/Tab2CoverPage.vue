<script setup>
import { ref, watch, computed, onMounted, nextTick } from 'vue';
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
const printMode = ref(false);
const generatedTimestamp = ref(new Date().toLocaleString());
const hideOriginColumn = ref(false); // Controls visibility of ORIGIN column
const isUSMode = ref(true); // Controls US/MX mode - true for US (default), false for MX

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

// Create computed properties for display that react to isUSMode changes
const weightUnitLabel = computed(() => {
  return isUSMode.value ? 'TOTAL WEIGHT (LBS)' : 'TOTAL WEIGHT (KG)';
});

// Create reactive helper functions for display
const getDisplayWeight = (weight) => {
  if (weight === undefined || weight === null) return 0;
  // Convert LBS to KG when in MX mode, otherwise return original weight (LBS)
  return isUSMode.value ? weight : weight * 0.453592;
};

// Helper function for getting descriptions based on mode
const getItemDescription = (item) => {
  if (!item) return '';
  
  // Since we don't rebuild the entire data structure, just use the item description
  // In a more complete solution, we'd want to store both US and MX descriptions in each item
  return item.description || '';
};

// Safe helper function to handle field access with null checks
const safeGet = (obj, ...props) => {
  for (const prop of props) {
    if (obj && prop in obj) {
      return obj[prop];
    }
  }
  return '';
};

// Function to get description based on current mode and available data
const getDescription = (row) => {
  if (!row) return '';
  
  if (isUSMode.value) {
    // US mode: Use DESCRIPTION with fallback to DESCRIPTION_CLIENT
    const desc = safeGet(row, 'DESCRIPTION', 'description');
    if (desc && desc.trim() !== '') return desc;
    return safeGet(row, 'DESCRIPTION_CLIENT', 'description_client') || '';
  } else {
    // MX mode: Use DESC_CUMPLE_US with fallback to DESCRIPTION
    const desc = safeGet(row, 'DESC_CUMPLE_US', 'desc_cumple_us');
    if (desc && desc.trim() !== '') return desc;
    return safeGet(row, 'DESCRIPTION', 'description') || '';
  }
};

// Process the raw data into a structured report
const processReportData = (rawData) => {
console.log('Processing raw data');

// Store the original API response for direct access to all 175 columns
const originalApiResponse = rawData;

// Log the original structure if debug is enabled
if (showDebug.value) {
  console.log('Original API response structure:', originalApiResponse);
  if (originalApiResponse && originalApiResponse.columns) {
    console.log('Columns in original API response:', originalApiResponse.columns.length);
    // Log the definition of the COMMENTS column if found
    const commentsColumn = originalApiResponse.columns.find(col => 
      col && col.columnName === 'COMMENTS' && col.tableName === 'QTY'
    );
    if (commentsColumn) {
      console.log('Found COMMENTS column definition:', commentsColumn);
    }
  }
}

// Prepare the raw data for processing and storage
let processableData = [];
// Ensure we have a usable format for the raw data
let originalRawData = rawData; // Store original for future reference

// Handle different data formats (JSON object vs array)

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
const lineItems = constructSummaryBody(processableData, packagingMaterials, rawData, originalApiResponse);

// 4. Calculate subtotals
const subtotals = calculateSubtotals(lineItems);

// 5. Build packaging summary
const packagingSection = constructPackagingSummary(processableData, packagingMaterials);

// 6. Return complete report structure
return {
  header,
  lineItems,
  subtotals,
  packagingSection,
  rawData: processableData, // Store processed data for future use
  originalRawData: rawData,   // Store original unprocessed data to preserve all 175 columns
  originalApiResponse: originalApiResponse // Store the complete API response with all 175 columns intact
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

// Helper function to extract comments directly from the original API response
const extractCommentsFromOriginalData = (row, originalData, apiResponse) => {
  let commentsValue = '';
  
  // Debug logging if enabled
  if (showDebug.value) {
    console.log('DEBUG: Extracting COMMENTS from row using originalData and apiResponse');
  }
  
  try {
    // Get the row index - we need this to access the corresponding row in the API response
    const skids = row.SKIDS || row.skids;
    const part = row.PART || row.part;
    const rowIndex = row._index; // Some APIs include the original index
    
    // APPROACH 1: Direct access to API response if we have it and can find the COMMENTS column
    if (apiResponse && apiResponse.columns && Array.isArray(apiResponse.columns)) {
      // Find the index of the COMMENTS column in the API response
      const commentsColIndex = apiResponse.columns.findIndex(col => 
        col && col.columnName === 'COMMENTS' && 
        (col.tableName === 'QTY' || !col.tableName)
      );
      
      if (showDebug.value) {
        console.log('DEBUG: Found COMMENTS column at index:', commentsColIndex);
      }
      
      // If we found the column and have valid row data in the API response
      if (commentsColIndex !== -1 && apiResponse.rows && Array.isArray(apiResponse.rows)) {
        // Try to find the matching row in the API response
        // First attempt: Use the row index if available
        if (rowIndex !== undefined && apiResponse.rows[rowIndex]) {
          const apiRow = apiResponse.rows[rowIndex];
          if (apiRow.values && apiRow.values[commentsColIndex]) {
            commentsValue = apiRow.values[commentsColIndex].value || '';
            if (showDebug.value) {
              console.log('DEBUG: Found COMMENTS via direct API access at row index:', rowIndex, 'value:', commentsValue);
            }
            return commentsValue;
          }
        }
        
        // Second attempt: Try to match by SKID and PART across all rows
        if (skids && part) {
          // Find matching SKID and PART columns
          const skidColIndex = apiResponse.columns.findIndex(col => 
            col && (col.columnName === 'SKIDS' || col.columnName === 'SKID')
          );
          
          const partColIndex = apiResponse.columns.findIndex(col => 
            col && col.columnName === 'PART'
          );
          
          if (skidColIndex !== -1 && partColIndex !== -1) {
            // Search for matching row
            for (let i = 0; i < apiResponse.rows.length; i++) {
              const apiRow = apiResponse.rows[i];
              if (!apiRow.values) continue;
              
              const rowSkid = apiRow.values[skidColIndex]?.value;
              const rowPart = apiRow.values[partColIndex]?.value;
              
              if (rowSkid == skids && rowPart == part) {
                if (apiRow.values[commentsColIndex]) {
                  commentsValue = apiRow.values[commentsColIndex].value || '';
                  if (showDebug.value) {
                    console.log('DEBUG: Found COMMENTS via SKID/PART match, row:', i, 'value:', commentsValue);
                  }
                  return commentsValue;
                }
              }
            }
          }
        }
      }
    }
    
    // APPROACH 2: Direct column access in the current row.values array (if it exists)
    if (row.values && Array.isArray(row.values)) {
      // Try index 48 specifically (column 49)
      if (row.values[48] && row.values[48].value !== undefined) {
        commentsValue = row.values[48].value;
        if (showDebug.value) {
          console.log('DEBUG: Found COMMENTS at fixed index 48 (column 49):', commentsValue);
        }
        return commentsValue;
      }
      
      // Fallback: Try nearby indices
      for (let i = 47; i <= 50; i++) {
        if (row.values[i] && row.values[i].value !== undefined) {
          commentsValue = row.values[i].value;
          if (showDebug.value) {
            console.log('DEBUG: Found potential COMMENTS at index', i, ':', commentsValue);
          }
          // Only use this if we found actual content
          if (commentsValue && typeof commentsValue === 'string' && commentsValue.trim() !== '') {
            return commentsValue;
          }
        }
      }
    }
    
    // APPROACH 3: Direct property access as last resort
    if (row.COMMENTS !== undefined) {
      commentsValue = row.COMMENTS;
      if (showDebug.value) console.log('DEBUG: Found COMMENTS via property access:', commentsValue);
      return commentsValue;
    }
    
    if (row.comments !== undefined) {
      commentsValue = row.comments;
      if (showDebug.value) console.log('DEBUG: Found comments (lowercase) via property access:', commentsValue);
      return commentsValue;
    }
  } catch (error) {
    console.error('Error extracting COMMENTS:', error);
  }
  
  return commentsValue;
};

// Build the summary body with line items according to mapping rules
const constructSummaryBody = (rawData, packagingMaterials, originalData, apiResponse) => {
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

// Get comments directly from column 49
const commentsValue = extractCommentsFromOriginalData(row, originalData, apiResponse);

// Debug logging if needed
if (showDebug.value && !partSkidGroups[key] && commentsValue) {
  console.log('DEBUG: Extracted comments value from column 49:', commentsValue);
}

const key = `${skids}|${part}`;

if (!partSkidGroups[key]) {
// Use mapping rules to extract field values
partSkidGroups[key] = {
skid: skids,  // SKID from SKIDS
part: part,   // PART
clientPart: '',
description: '',
descriptionMx: '',  // Add MX description field
po: row.LOT_NUM || row.lot_num || row.LOT || row.lot || '', // PO from LOT_NUM
qty: 0,
uom: row.UM_US || row.um_us || 'PZ', // UOM from UM_US
origin: row.ORIGIN_US || row.origin_us || '', // ORIGIN from ORIGIN_US
qtyPerSet: parseFloat(row.QTY2 || row.qty2 || 0), // QTY PER SET from QTY2
unitCost: parseFloat(row.COST || row.cost || 0), // UNIT COST from COST
labor: parseFloat(row.LABOR || row.labor || 0), // LABOR from LABOR
boxNumbers: new Set(),
weight: parseFloat(row.US_WEIGHT || row.us_weight || 0), // Weight per unit from US_WEIGHT
comments: commentsValue // Using directly accessed column 49 value directly
};

// PART CLIENT determination based on refined business rules
// 1. First priority: Use PART_CUMPLE only if it's available and has at least 4 characters
const partCumple = row.PART_CUMPLE || row.part_cumple;
if (partCumple && typeof partCumple === 'string' && partCumple.length >= 4) {
  partSkidGroups[key].clientPart = partCumple;
}
// 2. Second priority: Use MX_PART and trim prefix according to COMPANY_PREFIX
else if (row.MX_PART || row.mx_part) {
  const mxPart = row.MX_PART || row.mx_part;
  const companyPrefix = row.COMPANY_PREFIX || row.company_prefix || '';
  
  if (companyPrefix && typeof mxPart === 'string' && mxPart.startsWith(companyPrefix)) {
    // Trim company prefix from MX_PART
    partSkidGroups[key].clientPart = mxPart.substring(companyPrefix.length);
  } else {
    // Use MX_PART as is if no prefix match
    partSkidGroups[key].clientPart = mxPart;
  }
}

// Extract US description (column 80 or fallback to column 103)
const usDesc = safeGet(row, 'DESCRIPTION', 'description');
partSkidGroups[key].description = usDesc || safeGet(row, 'DESCRIPTION_CLIENT', 'description_client') || '';

// Extract MX description (column 104 or fallback to column 80)
const mxDesc = safeGet(row, 'DESC_CUMPLE_US', 'desc_cumple_us');
partSkidGroups[key].descriptionMx = (mxDesc && mxDesc.trim() !== '') ? mxDesc : usDesc || '';
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
const lineItems = Object.values(partSkidGroups).map(group => ({
part: group.part,
clientPart: group.clientPart,
description: group.description,       // US description
descriptionMx: group.descriptionMx,   // MX description
po: group.po,
qty: group.qty,
uom: group.uom,
boxCount: group.boxNumbers.size, // BOX value is unique boxes for this PART+SKID
origin: group.origin,
qtyPerSet: group.qtyPerSet,
weight: group.weight * group.qty, // Total weight = weight per unit * quantity
unitCost: group.unitCost,
labor: group.labor,
totalCostRm: group.unitCost * group.qty, // New column: TOTAL COST RM = UNIT COST × QTY
totalLaborCost: group.labor * group.qty, // New column: TOTAL LABOR COST = LABOR × QTY
totalCost: (group.unitCost + group.labor) * group.qty, // Total cost
skid: group.skid,
comments: group.comments, // Comments from column 49
showSkid: true,    // Default to showing the SKID value (will be updated for merged cells)
mergeSkidRows: 1   // Default to 1 row (will be updated for merged cells)
})).sort((a, b) => {
// Sort by SKID first, then by PART
const skidA = parseInt(a.skid) || 0;
const skidB = parseInt(b.skid) || 0;

if (skidA !== skidB) return skidA - skidB;
return a.part.localeCompare(b.part);
});

// Process the sorted items to determine which SKID cells to merge
let currentSkid = null;
let mergeStartIndex = 0;

lineItems.forEach((item, index) => {
  if (currentSkid !== item.skid) {
    // If we have a new SKID value, update the merge count for the previous group
    if (index > 0 && mergeStartIndex < index - 1) {
      lineItems[mergeStartIndex].mergeSkidRows = index - mergeStartIndex;
      
      // Hide SKID values for all but the first row in the group
      for (let i = mergeStartIndex + 1; i < index; i++) {
        lineItems[i].showSkid = false;
      }
    }
    
    // Start a new merge group
    currentSkid = item.skid;
    mergeStartIndex = index;
  }
});

// Handle the last group
if (lineItems.length > 0 && mergeStartIndex < lineItems.length - 1) {
  lineItems[mergeStartIndex].mergeSkidRows = lineItems.length - mergeStartIndex;
  
  // Hide SKID values for all but the first row in the last group
  for (let i = mergeStartIndex + 1; i < lineItems.length; i++) {
    lineItems[i].showSkid = false;
  }
}

return lineItems;
};
//};

// Calculate subtotals for the report
const calculateSubtotals = (lineItems) => {
if (!lineItems || lineItems.length === 0) {
return {
quantity: 0,
boxes: 0,
weight: 0,
totalCostRm: 0,
totalLaborCost: 0,
totalCost: 0,
skids: 0
};
}

const totals = lineItems.reduce((acc, item) => {
acc.quantity += item.qty || 0;
acc.boxes += item.boxCount || 0;
acc.weight += item.weight || 0;
acc.totalCostRm += item.totalCostRm || 0;
acc.totalLaborCost += item.totalLaborCost || 0;
acc.totalCost += item.totalCost || 0;
acc.skids.add(item.skid);
return acc;
}, {
quantity: 0,
boxes: 0,
weight: 0,
totalCostRm: 0,
totalLaborCost: 0,
totalCost: 0,
skids: new Set()
});

return {
quantity: totals.quantity,
boxes: totals.boxes,
weight: parseFloat(totals.weight.toFixed(1)),
totalCostRm: parseFloat(totals.totalCostRm.toFixed(2)),
totalLaborCost: parseFloat(totals.totalLaborCost.toFixed(2)),
totalCost: parseFloat(totals.totalCost.toFixed(2)),
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
  // Extract both US and MX descriptions
  const usDesc = safeGet(row, 'DESCRIPTION', 'description');
  const mxDesc = safeGet(row, 'DESC_CUMPLE_US', 'desc_cumple_us');
  
  // Prepare descriptions with fallbacks
  let description = usDesc || '';
  let descriptionMx = (mxDesc && mxDesc.trim() !== '') ? mxDesc : usDesc || '';
  
  // If no description found, use derived description as a fallback
  if (!description) {
    description = derivePackagingDescription(part);
  }
  
  if (!descriptionMx) {
    descriptionMx = description; // Use US description as fallback
  }
  
  packagingGroups[part] = {
    part,
    description: description,      // US description
    descriptionMx: descriptionMx, // MX description
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
description: 'Total',
descriptionMx: 'Total',
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

// Make a header editable
const headerLabels = ref({
  box: 'BOX',
  skid: 'SKID'
});

const makeHeaderEditable = (event) => {
  // Make the header cell editable
  const cell = event.target;
  const headerKey = cell.dataset.header;
  const originalValue = cell.textContent;
  
  // Store original value for potential revert
  cell.dataset.originalValue = originalValue;
  
  // Make editable and focus
  cell.contentEditable = true;
  cell.focus();
  
  // Add event listeners for finish editing
  cell.addEventListener('blur', finishHeaderEditing);
  cell.addEventListener('keydown', handleHeaderEditKeydown);
};

// Finish editing a header cell
const finishHeaderEditing = (event) => {
  const cell = event.target;
  const newValue = cell.textContent;
  const originalValue = cell.dataset.originalValue;
  const headerKey = cell.dataset.header;
  
  // Store the edited value
  if (newValue !== originalValue && headerKey) {
    headerLabels.value[headerKey] = newValue;
  }
  
  // Remove editable state
  cell.contentEditable = false;
  
  // Remove event listeners
  cell.removeEventListener('blur', finishHeaderEditing);
  cell.removeEventListener('keydown', handleHeaderEditKeydown);
};

// Handle keydown events during header editing
const handleHeaderEditKeydown = (event) => {
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
    
    // Create column headers - respect hideOriginColumn setting and US/MX mode
    let columnHeaders = [
      'PART', 'PART CLIENT', 'DESCRIPTION', 'PO', 'QTY', 'UOM', headerLabels.value.box // Use custom BOX header
    ];
    
    // Conditionally add ORIGIN if not hidden
    if (!hideOriginColumn.value) {
      columnHeaders.push('ORIGIN');
    }
    
    // Add remaining columns with conditional weight label based on US/MX mode
    columnHeaders = columnHeaders.concat([
      'QTY PER SET', 
      weightUnitLabel.value, // Use computed property for weight unit label
      'UNIT COST', 'LABOR', 'TOTAL COST RM', 'TOTAL LABOR COST', 'TOTAL COST', headerLabels.value.skid, 'COMMENTS'
    ]);
    
    worksheet.addRow(columnHeaders);
    
    // Style the header row
    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true };
    
    // Keep track of where SKID values change for merging
    const skidMergeInfo = {};
    const startDataRow = 6; // Row where data starts (after headers)
    let currentSkid = null;
    let lastSkidRow = 0;
    let currentRow = startDataRow;
    
    // Calculate which column contains the SKID value (accounting for hidden ORIGIN)
    const skidColumnIndex = columnHeaders.length; // It's the last column
    
    // Add data rows
    reportData.value.lineItems.forEach((item, index) => {
      const rowEdits = editedCells.value[index] || {};
      
      // Handle SKID merging tracking
      if (currentSkid !== (rowEdits.skid || item.skid)) {
        if (currentSkid !== null && currentRow - lastSkidRow > 1) {
          // Store merge info for the previous group
          skidMergeInfo[lastSkidRow] = {
            startRow: lastSkidRow,
            endRow: currentRow - 1
          };
        }
        
        // Start a new group
        currentSkid = rowEdits.skid || item.skid;
        lastSkidRow = currentRow;
      }
      
      let rowData = [
        rowEdits.part || item.part,
        rowEdits.clientPart || item.clientPart,
        isUSMode.value ? (rowEdits.description || item.description) : (rowEdits.descriptionMx || item.descriptionMx),
        rowEdits.po || item.po,
        parseFloat(rowEdits.qty || item.qty),
        rowEdits.uom || item.uom,
        parseInt(rowEdits.boxCount || item.boxCount)
      ];
      
      // Conditionally add ORIGIN if not hidden
      if (!hideOriginColumn.value) {
        rowData.push(rowEdits.origin || item.origin);
      }
      
      // Add remaining columns
      rowData = rowData.concat([
        parseFloat(rowEdits.qtyPerSet || item.qtyPerSet),
        getDisplayWeight(parseFloat(rowEdits.weight || item.weight)),
        parseFloat(rowEdits.unitCost || item.unitCost),
        parseFloat(rowEdits.labor || item.labor),
        parseFloat(rowEdits.totalCostRm || item.totalCostRm),
        parseFloat(rowEdits.totalLaborCost || item.totalLaborCost),
        parseFloat(rowEdits.totalCost || item.totalCost),
        rowEdits.skid || item.skid,
        rowEdits.comments || item.comments || ''
      ]);
      
      worksheet.addRow(rowData);
      currentRow++;
    });
    
    // Handle the last group
    if (currentSkid !== null && currentRow - lastSkidRow > 1) {
      skidMergeInfo[lastSkidRow] = {
        startRow: lastSkidRow,
        endRow: currentRow - 1
      };
    }
    
    // Perform the actual cell merging for SKID column
    Object.values(skidMergeInfo).forEach(info => {
      if (info.endRow > info.startRow) {
        // Get the cell address for the start of the merge
        const startCell = worksheet.getCell(info.startRow, skidColumnIndex);
        
        // Apply merge
        worksheet.mergeCells(info.startRow, skidColumnIndex, info.endRow, skidColumnIndex);
        
        // Style the merged cell
        startCell.alignment = { vertical: 'middle', horizontal: 'center' };
        startCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F7FF' }
        };
      }
    });
    
    // Add subtotal row - respect hideOriginColumn setting
    const subtotalRowNumber = worksheet.rowCount + 1;
    let subtotalRow = [
      '', '', '', 'Total',
      reportData.value.subtotals.quantity,
      '',
      reportData.value.subtotals.boxes
    ];
    
    // Conditionally add empty cell for ORIGIN if not hidden
    if (!hideOriginColumn.value) {
      subtotalRow.push('');
    }
    
    // Add remaining subtotal cells
    subtotalRow = subtotalRow.concat([
      '',
      getDisplayWeight(reportData.value.subtotals.weight),
      '',
      '',
      reportData.value.subtotals.totalCostRm,
      reportData.value.subtotals.totalLaborCost,
      reportData.value.subtotals.totalCost,
      reportData.value.subtotals.skids
    ]);
    
    worksheet.addRow(subtotalRow);
    
    // Style the subtotal row
    const subtotalRowEl = worksheet.getRow(subtotalRowNumber);
    subtotalRowEl.font = { bold: true };
    
    // Add empty row for spacing
    worksheet.addRow(['', '', '', '', '']);
    
    // Add packaging section header
    worksheet.addRow([]);
    worksheet.addRow(['Packaging Materials']);
    worksheet.getRow(worksheet.rowCount).font = { bold: true, size: 14 };
    
    // Add packaging table headers to match on-screen display
    worksheet.addRow(['Description', 'Packaging', 'Quantity']);
    const packagingHeaderRow = worksheet.getRow(worksheet.rowCount);
    packagingHeaderRow.font = { bold: true };
    
    // Add packaging rows
    reportData.value.packagingSection.forEach(item => {
      // Format matches the on-screen display - empty packaging cell for Total row
      const rowData = [
        item.part === 'Total' ? item.description : (isUSMode.value ? item.description : item.descriptionMx),
        item.part !== 'Total' ? item.part : '', // Empty for Total row
        item.qty
      ];
      
      const row = worksheet.addRow(rowData);
      
      // Apply bold styling to the Total row
      if (item.part === 'Total') {
        row.font = { bold: true };
      }
    });
    
    // Format number columns - adjust column indices based on whether ORIGIN is hidden
    const originOffset = hideOriginColumn.value ? 0 : 1;
    
    worksheet.getColumn(8 + originOffset).numFmt = '0.0'; // QTY PER SET - single decimal
    worksheet.getColumn(9 + originOffset).numFmt = '0.0000'; // TOTAL WEIGHT
    worksheet.getColumn(10 + originOffset).numFmt = '[$\$]#,##0.0000'; // UNIT COST - currency format
    worksheet.getColumn(11 + originOffset).numFmt = '[$\$]#,##0.0000'; // LABOR - currency format
    worksheet.getColumn(12 + originOffset).numFmt = '[$\$]#,##0.0000'; // TOTAL COST RM - currency format
    worksheet.getColumn(13 + originOffset).numFmt = '[$\$]#,##0.0000'; // TOTAL LABOR COST - currency format
    worksheet.getColumn(14 + originOffset).numFmt = '[$\$]#,##0.0000'; // TOTAL COST - currency format
    
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

// Function to trigger UI refresh when needed
const forceRefresh = () => {
  console.log('Force refreshing display with mode:', isUSMode.value ? 'US' : 'MX');
  // Just log the change - reactivity now handled through computed properties
  // This ensures both checkboxes can work independently
};

// Function to handle report printing
const printReport = () => {
  printMode.value = true;
  generatedTimestamp.value = new Date().toLocaleString();
  // Use nextTick to ensure reactivity updates before printing
  nextTick(() => {
    window.print();
    // Reset after print dialog closes
    setTimeout(() => {
      printMode.value = false;
    }, 500);
  });
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
      
      <div class="report-controls" :class="{ 'print-hidden': printMode }">
        <h2>Shipment Report</h2>
        <div class="controls-wrapper">
          <div class="buttons">
            <button @click="toggleSampleData" class="toggle-button">
              {{ useSampleData ? 'Use API Data' : 'Use Sample Data' }}
            </button>
            <button @click="exportToExcel" class="export-button" :disabled="!reportData">
              Download XLSX
            </button>
            <button @click="printReport" class="print-button" :disabled="!reportData">
              Print Report
            </button>
          </div>
          <div class="view-options">
            <label class="checkbox-control">
              <input type="checkbox" v-model="hideOriginColumn">
              <span>Hide Origin Column</span>
            </label>
            <label class="checkbox-control">
              <input type="checkbox" v-model="isUSMode">
              <span>{{ isUSMode ? 'US' : 'MX' }}</span>
            </label>
          </div>
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
      
      <div v-else-if="reportData" class="report-container" :class="{ 'print-mode': printMode }">
        <!-- Report Header with metadata -->
        <div class="report-header">
          <h2>Shipment Report</h2>
          <div class="report-metadata">
            <span>Generated: {{ generatedTimestamp }}</span>
            <span class="report-id">Declaration ID: {{ props.declaration ? props.declaration.id : 'N/A' }}</span>
          </div>
        </div>
        
        <!-- Header section -->
        <table class="report-table header-table">
          <tbody>
            <tr>
              <td class="header-label">Client Name</td>
              <td>{{ reportData.header.clientName }}</td>
              <td></td>
              <td class="header-label">Export Date</td>
              <td>{{ reportData.header.exportDate }}</td>
            </tr>
            <tr>
              <td class="header-label">From</td>
              <td>{{ reportData.header.from }}</td>
              <td></td>
              <td class="header-label">Shipment #</td>
              <td>{{ reportData.header.shipmentNumber }}</td>
            </tr>
            <tr>
              <td class="header-label">To</td>
              <td>{{ reportData.header.to }}</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
        
        <!-- Main report table -->
        <div class="table-wrapper scrollable-table">
          <table class="report-table">
            <thead>
              <tr>
                <th>PART</th>
                <th>PART CLIENT</th>
                <th>DESCRIPTION</th>
                <th>PO</th>
                <th>QTY</th>
                <th>UOM</th>
                <th class="editable-header" @click="makeHeaderEditable" data-header="box">BOX</th>
                <th :class="{ 'hide-mobile': true, 'hide-origin': hideOriginColumn }">ORIGIN</th>
                <th class="hide-mobile wrap-header">QTY<br>PER SET</th>
                <th class="wrap-header">TOTAL<br>{{ isUSMode ? 'WEIGHT (LBS)' : 'WEIGHT (KG)' }}</th>
                <th class="hide-mobile wrap-header">UNIT<br>COST</th>
                <th class="hide-mobile">LABOR</th>
                <th class="hide-mobile wrap-header">TOTAL<br>COST RM</th>
                <th class="hide-mobile wrap-header">TOTAL<br>LABOR COST</th>
                <th class="wrap-header">TOTAL<br>COST</th>
                <th class="editable-header" @click="makeHeaderEditable" data-header="skid">SKID</th>
                <th>COMMENTS</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in reportData.lineItems" :key="`${item.skid}-${item.part}`">
                <td>{{ item.part }}</td>
                <td class="editable" @click="makeEditable" :data-row-index="index" data-column="clientPart">{{ item.clientPart }}</td>
                <td v-if="isUSMode" class="editable description-cell" @click="makeEditable" :data-row-index="index" data-column="description">{{ item.description }}</td>
                <td v-if="!isUSMode" class="editable description-cell" @click="makeEditable" :data-row-index="index" data-column="descriptionMx">{{ item.descriptionMx }}</td>
                <td class="editable" @click="makeEditable" :data-row-index="index" data-column="po">{{ item.po }}</td>
                <td class="editable" @click="makeEditable" :data-row-index="index" data-column="qty">{{ item.qty }}</td>
                <td>{{ item.uom }}</td>
                <td class="editable" @click="makeEditable" :data-row-index="index" data-column="boxCount">{{ item.boxCount }}</td>
                <td class="editable hide-mobile" :class="{ 'hide-origin': hideOriginColumn }" @click="makeEditable" :data-row-index="index" data-column="origin">{{ item.origin }}</td>
                <td class="editable hide-mobile" @click="makeEditable" :data-row-index="index" data-column="qtyPerSet">{{ Number.isInteger(item.qtyPerSet) ? item.qtyPerSet : item.qtyPerSet.toFixed(1) }}</td>
                <td class="editable" @click="makeEditable" :data-row-index="index" data-column="weight">{{ getDisplayWeight(item.weight).toFixed(4) }}</td>
                <td class="editable hide-mobile currency" @click="makeEditable" :data-row-index="index" data-column="unitCost">${{ item.unitCost.toFixed(4) }}</td>
                <td class="editable hide-mobile currency" @click="makeEditable" :data-row-index="index" data-column="labor">${{ item.labor.toFixed(4) }}</td>
                <td class="hide-mobile currency">${{ item.totalCostRm.toFixed(4) }}</td>
                <td class="hide-mobile currency">${{ item.totalLaborCost.toFixed(4) }}</td>
                <td class="currency">${{ item.totalCost.toFixed(4) }}</td>
                <td v-if="item.showSkid" :rowspan="item.mergeSkidRows" class="skid-cell">{{ item.skid }}</td>
                <td class="comments-cell">{{ item.comments }}</td>
              </tr>
              <tr class="subtotal-row">
                <td colspan="3" class="subtotal-spacer"></td>
                <td class="subtotal-label">Total</td>
                <td class="subtotal-value">{{ reportData.subtotals.quantity }}</td>
                <td class="subtotal-spacer"></td>
                <td class="subtotal-value">{{ reportData.subtotals.boxes }}</td>
                <td class="hide-mobile subtotal-spacer" :class="{ 'hide-origin': hideOriginColumn }"></td>
                <td class="hide-mobile subtotal-spacer"></td>
                <td class="subtotal-value">{{ getDisplayWeight(reportData.subtotals.weight).toFixed(4) }}</td>
                <td class="hide-mobile subtotal-spacer"></td>
                <td class="hide-mobile subtotal-spacer"></td>
                <td class="hide-mobile subtotal-value currency">${{ reportData.subtotals.totalCostRm.toFixed(4) }}</td>
                <td class="hide-mobile subtotal-value currency">${{ reportData.subtotals.totalLaborCost.toFixed(4) }}</td>
                <td class="subtotal-value currency">${{ reportData.subtotals.totalCost.toFixed(4) }}</td>
                <td class="subtotal-value">{{ reportData.subtotals.skids }}</td>
                <td class="subtotal-spacer"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Packaging section -->
        <div class="packaging-section">
          <h3 class="packaging-title">Packaging Materials</h3>
          <table class="packaging-table">
            <thead>
              <tr>
                <th class="packaging-desc-header">Description</th>
                <th class="packaging-part-header">Packaging</th>
                <th class="packaging-qty-header">Quantity</th>
              </tr>
            </thead>
            <tbody>
              <!-- Packaging rows -->
              <tr v-for="item in reportData.packagingSection" :key="item.part"
                :class="{ 'total-row': item.part === 'Total' }">
                <td class="packaging-desc">
                  {{ item.part === 'Total' ? item.description : (isUSMode ? item.description : item.descriptionMx) }}
                </td>
                <td class="packaging-part">{{ item.part !== 'Total' ? item.part : '' }}</td>
                <td class="packaging-qty">{{ item.qty }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Report container styling */
.report-container {
  max-width: 100%;
  overflow-x: auto;
  position: relative;
  background-color: #fff;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 25px;
  margin: 15px 0;
  /* Optional subtle paper texture - could be enabled if desired */
  /* background-image: url('data:image/png;base64,...'); */
  /* background-blend-mode: overlay; */
}

/* Report header styling */
.report-header {
  margin-bottom: 20px;
  border-bottom: 2px solid #4a4a4a;
  padding-bottom: 15px;
}

.report-header h2 {
  font-size: 24px;
  margin-bottom: 8px;
  color: #2c3e50;
}

.report-metadata {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666;
}

.report-id {
  font-weight: 600;
}

/* Table styling */
.report-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px; /* Ensure minimum width for content */
  font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  margin-bottom: 20px;
}

/* Scrollable table container */
.scrollable-table {
  max-height: 80vh; /* 80% of viewport height as requested */
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  /* Add some styling for scrollbars on non-webkit browsers */
  scrollbar-width: thin;
  scrollbar-color: #6c757d #f8f9fa;
}

/* Custom scrollbar styling for WebKit browsers */
.scrollable-table::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scrollable-table::-webkit-scrollbar-track {
  background: #f8f9fa;
  border-radius: 4px;
}

.scrollable-table::-webkit-scrollbar-thumb {
  background-color: #6c757d;
  border-radius: 4px;
  border: 2px solid #f8f9fa;
}

/* Header table specific styling */
.header-table {
  margin-bottom: 30px;
  border: 1px solid #e0e0e0;
  width: 80%;
  margin-left: auto;
  margin-right: auto;
  min-width: 700px; /* Ensure minimum width for content while still allowing for responsive behavior */
}

.header-label {
  font-weight: 700;
  font-size: 16px;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-color: #f5f5f5;
  padding: 10px;
}

.report-table th {
  position: sticky;
  top: 0;
  background: #f8f9fa;
  z-index: 10;
  padding: 12px 8px;
  text-align: center;
  vertical-align: middle;
  border-bottom: 2px solid #dee2e6;
  white-space: nowrap;
  font-weight: 600;
  color: #2c3e50;
  /* Add box-shadow for better visual separation when scrolling */
  box-shadow: 0 2px 2px -1px rgba(0, 0, 0, 0.1);
}

.report-table th.wrap-header {
  white-space: normal;
  line-height: 1.2;
  vertical-align: middle;
  min-width: 80px;
}

.report-table td {
  padding: 10px 8px;
  border-bottom: 1px solid #dee2e6;
  vertical-align: top;
}

.report-table tr:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.02);
}

.report-table .currency {
  text-align: right;
  font-family: 'Courier New', monospace;
}

.report-table .description-cell {
  max-width: 300px;
  white-space: normal;
  word-wrap: break-word;
}

/* Editable cells styling */
.editable {
  border-bottom: 1px dotted #999;
  transition: background-color 0.2s;
}

.editable:hover,
.editable-header:hover {
  background-color: rgba(65, 184, 255, 0.05);
  cursor: pointer;
}

.editable-header {
  border-bottom: 1px dotted #999;
  transition: background-color 0.2s;
}

.subtotal-row {
  background-color: #f0f7ff !important;
  font-weight: 600;
  border-top: 2px solid #b8daff;
  border-bottom: 2px solid #b8daff;
  height: 50px;
}

.subtotal-label {
  text-transform: uppercase;
  font-size: 15px;
  color: #0056b3;
  text-align: right;
  padding-right: 15px;
}

.subtotal-value {
  font-size: 15px;
  font-weight: 700;
  color: #0056b3;
  text-align: center;
}

.subtotal-spacer {
  background-color: #f8f9fa !important;
}

/* Controls wrapper */
.controls-wrapper {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}

/* View options styling */
.view-options {
  display: flex;
  gap: 15px;
}

.checkbox-control {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
}

.checkbox-control input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* Hide origin column when toggled */
.hide-origin {
  display: none !important;
}

th.hide-origin,
td.hide-origin {
  display: none !important;
}

/* Buttons styling */
.buttons {
  display: flex;
  gap: 10px;
}

.toggle-button {
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.toggle-button:hover {
  background-color: #5a6268;
}

.refresh-button {
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.refresh-button:hover {
  background-color: #218838;
}

.export-button {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.export-button:hover {
  background-color: #0069d9;
}

.export-button:disabled {
  background-color: #b5b5b5;
  cursor: not-allowed;
}

.print-button {
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.print-button:hover {
  background-color: #218838;
}

.print-button:disabled {
  background-color: #b5b5b5;
  cursor: not-allowed;
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

/* Packaging section styling */
.packaging-section {
  width: 80%;
  margin: 30px auto 20px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 20px;
  background-color: #f9f9f9;
}

.packaging-title {
  text-align: center;
  margin-bottom: 15px;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.packaging-table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 auto;
}

.packaging-table th {
  background-color: #f1f1f1;
  padding: 10px;
  text-align: center;
  border-bottom: 2px solid #ddd;
  font-weight: 600;
}

.packaging-table td {
  padding: 8px 10px;
  text-align: center;
  border-bottom: 1px solid #ddd;
}

.packaging-desc {
  text-align: left;
}

.packaging-part, .packaging-qty {
  width: 20%;
}

.packaging-part {
  font-family: monospace;
  letter-spacing: -0.5px;
}

.packaging-table .total-row {
  font-weight: bold;
  background-color: #f5f5f5;
}

/* Print-specific styling */
@media print {
  /* Reset scrollable table and sticky headers for print */
  .scrollable-table {
    max-height: none !important;
    overflow: visible !important;
    border: none !important;
  }
  
  .report-table th {
    position: static !important;
    box-shadow: none !important;
  }
  
  /* Set landscape orientation */
  @page {
    size: landscape;
    margin: 0.5cm;
  }
  
  /* Hide everything except the report container */
  body * {
    visibility: hidden;
  }
  
  .report-container,
  .report-container * {
    visibility: visible;
  }
  
  .report-container {
    position: absolute;
    left: 0;
    top: 0;
    width: 97%;
    margin: 0 auto;
    padding: 0.5cm;
  }
  
  /* Hide specific elements we don't want in the print */
  .report-controls,
  .debug-toggle,
  .debug-section {
    display: none !important;
  }
  
  /* Table styling for print */
  .table-wrapper {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 auto !important;
    overflow: visible !important;
    page-break-inside: avoid !important;
  }
  
  /* Ensure report header is visible and properly formatted */
  .report-header {
    page-break-after: avoid !important;
    margin-bottom: 15px !important;
  }
  
  /* Ensure report metadata and ID are visible in print */
  .report-metadata,
  .report-id {
    display: block !important;
    visibility: visible !important;
  }
  
  /* Style report metadata for print */
  .report-metadata {
    margin: 5px auto 10px !important;
    width: 90% !important;
    text-align: right !important;
    font-size: 9px !important;
    color: #333 !important;
  }
  
  .report-metadata span,
  .report-id {
    margin-left: 15px !important;
  }
  
  /* Fix header table layout */
  .header-table {
    width: 90% !important;
    table-layout: fixed !important;
    margin: 0 auto 20px !important;
    font-size: 10px !important;
    border-collapse: collapse !important;
  }
  
  /* Set consistent column widths for header table */
  .header-table td {
    padding: 4px 6px !important;
    overflow: visible !important;
    white-space: nowrap !important;
  }
  
  .header-table td.header-label {
    width: 100px !important;
    text-align: right !important;
    font-weight: bold !important;
    padding-right: 10px !important;
  }
  
  /* Empty spacer column */
  .header-table td:nth-child(3) {
    width: 10% !important;
  }
  
  /* Value columns */
  .header-table td:nth-child(2),
  .header-table td:nth-child(5) {
    width: 35% !important;
  }
  
  /* Make packaging section match main table font size */
  .packaging-section {
    font-size: 10px !important;
  }
  
  .packaging-table th,
  .packaging-table td {
    font-size: 10px !important;
    padding: 4px 6px !important;
  }
  
  /* Make sure all tables are properly sized */
  .table-wrapper {
    width: 100% !important;
    max-width: 100% !important;
    overflow: visible !important;
    page-break-inside: avoid !important;
  }
  
  .report-table {
    width: 100% !important; 
    max-width: 100% !important;
    table-layout: fixed !important;
    font-size: 10px !important;
    margin: 0 !important;
    border-collapse: collapse !important;
  }
  
  /* Adjust column widths for better print layout */
  .report-table th, .report-table td {
    padding: 4px 2px !important;
    font-size: 10px !important;
    max-width: none !important;
  }
  
  /* Set specific column widths by priority */
  .report-table .description-cell {
    width: 16% !important;
    max-width: 16% !important;
    white-space: normal !important;
    word-break: break-word !important;
  }
  
  /* Part numbers */
  .report-table th:nth-child(1), .report-table td:nth-child(1),
  .report-table th:nth-child(2), .report-table td:nth-child(2) {
    width: 7% !important;
    max-width: 7% !important;
  }
  
  /* Numeric columns that need more space for currency/decimals */
  .report-table th:nth-child(10), .report-table td:nth-child(10),
  .report-table th:nth-child(11), .report-table td:nth-child(11),
  .report-table th:nth-child(12), .report-table td:nth-child(12),
  .report-table th:nth-child(13), .report-table td:nth-child(13),
  .report-table th:nth-child(14), .report-table td:nth-child(14),
  .report-table th:nth-child(15), .report-table td:nth-child(15) {
    width: 7% !important;
    max-width: 7% !important;
  }
  
  /* Small data columns */
  .report-table th:nth-child(4), .report-table td:nth-child(4),
  .report-table th:nth-child(5), .report-table td:nth-child(5),
  .report-table th:nth-child(6), .report-table td:nth-child(6),
  .report-table th:nth-child(7), .report-table td:nth-child(7),
  .report-table th:nth-child(8), .report-table td:nth-child(8),
  .report-table th:nth-child(9), .report-table td:nth-child(9),
  .report-table th:nth-child(16), .report-table td:nth-child(16) {
    width: 3.5% !important;
    max-width: 3.5% !important;
  }
  
  .print-hidden,
  .debug-toggle,
  .debug-section,
  .report-controls,
  .no-selection {
    display: none !important;
  }
  
  /* Adjust table for better fit in landscape */
  .report-table {
    page-break-inside: avoid;
    font-size: 11px;
    width: 100%;
    min-width: auto !important; /* Override fixed min-width */
  }
  
  .table-wrapper {
    overflow: visible !important;
    width: 100%;
  }
  
  /* Reduce some cell padding to fit more content */
  .report-table td, 
  .report-table th {
    padding: 5px;
  }
  
  /* Ensure good page breaks and clean header display */
  .report-header {
    page-break-after: avoid;
    width: 80% !important;
    min-width: auto !important;
    margin: 0 auto !important;
    padding: 0 !important;
    padding-bottom: 5px !important;
    border-bottom: 1px solid #ccc !important;
    overflow: visible !important;
  }
  
  /* Hide the report metadata in print view */
  .report-metadata {
    display: none !important;
  }
  
  .header-table,
  .packaging-table {
    page-break-after: avoid;
    width: 80% !important;
    min-width: auto !important;
    margin: 0 auto !important;
  }
  
  /* Make sure subtotal row stays with data and fix overlap */
  .subtotal-row {
    page-break-before: avoid;
  }
  
  .subtotal-row td {
    white-space: nowrap;
    overflow: visible;
    font-size: 10px;
  }
  
  /* Ensure currency values don't overlap */
  .currency {
    white-space: nowrap;
    overflow: visible;
    font-size: 9px !important;
    letter-spacing: -0.5px;
  }
  
  /* Remove hover effects for editable fields in print */
  .editable {
    border-bottom: none;
  }
  
  /* Ensure packaging section fits well */
  .packaging-section {
    width: 100% !important;
    margin: 20px 0;
    border: none;
  }
}
/* SKID cell styling */
.skid-cell {
  vertical-align: middle;
  text-align: center;
  background-color: rgba(240, 247, 255, 0.2);
  border: 1px solid #dee2e6;
}

/* Comments cell styling */
.comments-cell {
  max-width: 200px;
  white-space: normal;
  word-wrap: break-word;
  font-size: 0.9em;
  color: #555;
}
</style>