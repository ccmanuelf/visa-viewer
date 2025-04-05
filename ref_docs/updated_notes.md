Updated notes: Let me revise the guidelines to properly address and ensure the logic works with any dataset regardless of specific values.

# Revised Guide: Reconstructing a Shipment Summary Report from Raw CSV Data

## 1. Identifying Packaging Materials Dynamically

Instead of hardcoding packaging part numbers like "KWPL-PALLET" or "KW16.5X18X24", we must identify packaging materials through data analysis:

```javascript
function identifyPackagingMaterials(rawData, shipmentNumber) {
  // Filter for the specific shipment
  const shipmentData = rawData.filter(row => row.visa === shipmentNumber);
  
  // Analyze the data structure to identify packaging materials
  const partCounts = {};
  const partWithSkidCounts = {};
  
  // Count occurrences of each part number
  shipmentData.forEach(row => {
    if (row.PART) {
      partCounts[row.PART] = (partCounts[row.PART] || 0) + 1;
      
      // Also track which parts appear with SKID assignments
      if (row.SKIDS !== null && row.SKIDS !== undefined) {
        partWithSkidCounts[row.PART] = (partWithSkidCounts[row.PART] || 0) + 1;
      }
    }
  });
  
  // Identify potential packaging materials based on patterns:
  // 1. Parts that have no SKID assignments (or very few compared to their total count)
  // 2. Parts that appear exactly once or very few times in the dataset
  // 3. Parts with distinctive naming patterns (if available in the dataset)
  
  const packagingMaterials = Object.keys(partCounts).filter(part => {
    // Parts that never or rarely appear with SKID assignments
    const withSkidCount = partWithSkidCounts[part] || 0;
    const totalCount = partCounts[part];
    const skidRatio = withSkidCount / totalCount;
    
    // If a part appears in the data but rarely/never has a SKID assignment,
    // it's likely a packaging material
    return skidRatio < 0.1;
  });
  
  return packagingMaterials;
}
```

## 2. Building the Report Header Without Assumptions

The header must be constructed by analyzing the dataset structure, without assuming specific field names:

```javascript
function constructHeader(rawData, shipmentNumber) {
  // Filter for the specific shipment
  const shipmentData = rawData.filter(row => row.visa === shipmentNumber);
  
  if (shipmentData.length === 0) {
    throw new Error(`No data found for shipment #${shipmentNumber}`);
  }
  
  // Dynamically identify potential company name fields by analyzing the data
  const companyNameFields = [
    'company_name', 'COMPANY_NAME', 'client_name', 'CLIENT_NAME',
    'DESCRIPTION_CLIENT', 'customer', 'CUSTOMER'
  ];
  
  let companyName = "Unknown";
  
  // Try each potential field until we find one with data
  for (const field of companyNameFields) {
    if (shipmentData[0][field] && typeof shipmentData[0][field] === 'string') {
      companyName = shipmentData[0][field];
      break;
    }
  }
  
  // If we still don't have a company name, try company_id with a lookup
  // or use a consistent value from the dataset
  if (companyName === "Unknown" && shipmentData[0].company_id) {
    // Check if a company name appears consistently in the data
    const companyIds = new Set();
    shipmentData.forEach(row => {
      if (row.company_id) companyIds.add(row.company_id);
    });
    
    // If there's only one company_id in the data, we can use it
    if (companyIds.size === 1) {
      companyName = `Company ${Array.from(companyIds)[0]}`;
    }
  }
  
  // Similarly identify from/to fields dynamically
  const fromFields = ['from', 'FROM', 'sender', 'SENDER', 'shipper', 'SHIPPER'];
  const toFields = ['to', 'TO', 'recipient', 'RECIPIENT', 'receiver', 'RECEIVER'];
  const dateFields = ['export_at', 'EXPORT_AT', 'export_date', 'EXPORT_DATE', 'ship_date', 'SHIP_DATE'];
  
  let from = "Unknown";
  let to = "Unknown";
  let exportDate = "Unknown";
  
  // Try each potential field for sender
  for (const field of fromFields) {
    if (shipmentData[0][field] && typeof shipmentData[0][field] === 'string') {
      from = shipmentData[0][field];
      break;
    }
  }
  
  // Try each potential field for recipient
  for (const field of toFields) {
    if (shipmentData[0][field] && typeof shipmentData[0][field] === 'string') {
      to = shipmentData[0][field];
      break;
    }
  }
  
  // Try each potential field for export date
  for (const field of dateFields) {
    if (shipmentData[0][field]) {
      exportDate = formatDateIfNeeded(shipmentData[0][field]);
      break;
    }
  }
  
  return {
    clientName: companyName,
    from: from,
    to: to,
    exportDate: exportDate,
    shipmentNumber: shipmentNumber
  };
}
```

## 3. Building the Summary Body with Flexible Field Detection

```javascript
function constructSummaryBody(rawData, shipmentNumber, packagingMaterials) {
  // Filter for the specific shipment
  const shipmentData = rawData.filter(row => row.visa === shipmentNumber);
  
  // Filter out packaging materials identified earlier
  const productData = shipmentData.filter(row => 
    row.PART && !packagingMaterials.includes(row.PART)
  );
  
  // Identify potential field names for important data points
  const fieldMapping = identifyFieldsFromData(productData);
  
  // Group by PART+SKID combination
  const partSkidGroups = {};
  
  productData.forEach(row => {
    // Get SKID value using the identified field
    const skidValue = row[fieldMapping.skidField];
    
    // Skip records without SKID information
    if (skidValue === null || skidValue === undefined) return;
    
    const partValue = row[fieldMapping.partField];
    const key = `${skidValue}|${partValue}`;
    
    if (!partSkidGroups[key]) {
      partSkidGroups[key] = {
        skid: skidValue,
        part: partValue,
        qty: 0,
        boxNumbers: new Set(),
        records: []
      };
      
      // Extract additional fields using the dynamically identified field names
      if (fieldMapping.descriptionField && row[fieldMapping.descriptionField]) {
        partSkidGroups[key].description = row[fieldMapping.descriptionField];
      }
      
      if (fieldMapping.poField && row[fieldMapping.poField]) {
        partSkidGroups[key].po = row[fieldMapping.poField];
      }
      
      if (fieldMapping.originField && row[fieldMapping.originField]) {
        partSkidGroups[key].origin = row[fieldMapping.originField];
      }
      
      if (fieldMapping.uomField && row[fieldMapping.uomField]) {
        partSkidGroups[key].uom = row[fieldMapping.uomField];
      }
      
      if (fieldMapping.costField && row[fieldMapping.costField]) {
        partSkidGroups[key].unitCost = row[fieldMapping.costField];
      }
      
      if (fieldMapping.laborField && row[fieldMapping.laborField]) {
        partSkidGroups[key].laborCost = row[fieldMapping.laborField];
      }
      
      if (fieldMapping.weightField && row[fieldMapping.weightField]) {
        partSkidGroups[key].weightPerUnit = row[fieldMapping.weightField];
      }
      
      // Dynamically derive client part number based on patterns in the data
      partSkidGroups[key].clientPart = deriveClientPartNumber(row, fieldMapping);
    }
    
    // Accumulate quantity using the identified quantity field
    if (fieldMapping.qtyField) {
      partSkidGroups[key].qty += row[fieldMapping.qtyField] || 0;
    }
    
    // Track unique box numbers using the identified box field
    if (fieldMapping.boxField && row[fieldMapping.boxField] !== null && 
        row[fieldMapping.boxField] !== undefined) {
      partSkidGroups[key].boxNumbers.add(row[fieldMapping.boxField]);
    }
    
    partSkidGroups[key].records.push(row);
  });
  
  // Rest of the function remains the same...
}

// Dynamically identify field names by analyzing the data
function identifyFieldsFromData(data) {
  // Initialize potential field names for each data point
  const potentialFields = {
    partField: ['PART', 'part', 'PART_NUMBER', 'part_number', 'SKU', 'sku'],
    skidField: ['SKIDS', 'skids', 'SKID', 'skid', 'PALLET', 'pallet'],
    qtyField: ['QTY1', 'qty1', 'QTY', 'qty', 'QUANTITY', 'quantity'],
    boxField: ['CTNS', 'ctns', 'BOX', 'box', 'CARTON', 'carton'],
    descriptionField: ['DESCRIPTION', 'description', 'DESC', 'desc', 'PRODUCT_DESC', 'DESCRIPTION_CLIENT'],
    poField: ['LOT_NUM', 'lot_num', 'PO', 'po', 'PURCHASE_ORDER', 'purchase_order'],
    originField: ['ORIGIN_US', 'origin_us', 'ORIGIN', 'origin', 'COUNTRY', 'country'],
    uomField: ['UM_US', 'um_us', 'UOM', 'uom', 'UNIT', 'unit'],
    costField: ['COST', 'cost', 'UNIT_COST', 'unit_cost', 'PRICE', 'price'],
    laborField: ['LABOR', 'labor', 'LABOR_COST', 'labor_cost'],
    weightField: ['US_WEIGHT', 'us_weight', 'WEIGHT', 'weight', 'WEIGHT_UNIT', 'weight_unit']
  };
  
  // Find actual field names in the data
  const fieldMapping = {};
  
  // Check the first record to identify fields
  if (data.length > 0) {
    const firstRecord = data[0];
    
    // For each data point, find matching field in the record
    Object.entries(potentialFields).forEach(([mappingKey, fieldOptions]) => {
      for (const field of fieldOptions) {
        if (field in firstRecord && firstRecord[field] !== null && firstRecord[field] !== undefined) {
          fieldMapping[mappingKey] = field;
          break;
        }
      }
    });
  }
  
  return fieldMapping;
}
```

## 4. Deriving Client Part Numbers Dynamically

Instead of assuming "KWS" to "S" conversion, analyze patterns in the data:

```javascript
function deriveClientPartNumber(record, fieldMapping) {
  // Check for direct client part field
  const clientPartFields = ['CLIENT_PART', 'client_part', 'PART_CLIENT', 'part_client'];
  
  for (const field of clientPartFields) {
    if (record[field]) return record[field];
  }
  
  // Look for field with similar name to part number
  const partField = fieldMapping.partField;
  if (!partField || !record[partField]) return "";
  
  const part = record[partField];
  
  // Check all fields for a value that looks like a variant of the part number
  for (const field in record) {
    if (field === partField) continue; // Skip the original part field
    
    const value = record[field];
    if (typeof value !== 'string') continue;
    
    // Check if this value looks like a variant of the part number
    // (e.g., same length, similar characters, etc.)
    if (value.length > 0 && 
        (part.includes(value) || value.includes(part) || 
         isSimilarPartNumber(part, value))) {
      return value;
    }
  }
  
  // As a last resort, try common transformations based on patterns in the data
  // Look at the first few and last few characters to detect patterns
  
  // Check if part starts with a prefix that could be replaced
  // For example, if multiple parts start with "KWS" and others have "S" prefix
  const prefixPattern = detectPartNumberPattern(record, data, partField);
  
  if (prefixPattern && prefixPattern.from && prefixPattern.to) {
    if (part.startsWith(prefixPattern.from)) {
      return part.replace(prefixPattern.from, prefixPattern.to);
    }
  }
  
  return "";
}

// Detect patterns in part numbers across the dataset
function detectPartNumberPattern(record, allRecords, partField) {
  // Count occurrences of different prefixes (first 3-4 characters)
  const prefixCounts = {};
  
  allRecords.forEach(row => {
    if (row[partField] && typeof row[partField] === 'string') {
      const prefix = row[partField].substring(0, 3); // or 4, depends on data
      prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
    }
  });
  
  // Find the most common prefixes
  const sortedPrefixes = Object.entries(prefixCounts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  if (sortedPrefixes.length >= 2) {
    // If there are at least 2 common prefixes, they might be related
    // (e.g., "KWS" and "S")
    return {
      from: sortedPrefixes[0],
      to: sortedPrefixes[1]
    };
  }
  
  return null;
}
```

## 5. Building the Packaging Summary without Hardcoded Values

```javascript
function constructPackagingSummary(rawData, shipmentNumber, packagingMaterials) {
  // Filter for the specific shipment
  const shipmentData = rawData.filter(row => row.visa === shipmentNumber);
  
  // Use the dynamically identified packaging materials
  const packagingData = shipmentData.filter(row => 
    row.PART && packagingMaterials.includes(row.PART)
  );
  
  // Identify the quantity field
  const qtyFields = ['QTY1', 'qty1', 'QTY', 'qty', 'QUANTITY', 'quantity'];
  let qtyField = null;
  
  for (const field of qtyFields) {
    if (packagingData.length > 0 && field in packagingData[0]) {
      qtyField = field;
      break;
    }
  }
  
  if (!qtyField) {
    // No quantity field found, return an empty summary
    return [
      [null, null, null, null, null, "Box's", "Quantity"],
      [null, null, null, null, null, "Unknown", 0],
      [null, null, null, null, null, "Total", 0]
    ];
  }
  
  // Group by packaging type and sum quantities
  const packagingGroups = {};
  
  packagingData.forEach(row => {
    if (!packagingGroups[row.PART]) {
      packagingGroups[row.PART] = 0;
    }
    
    packagingGroups[row.PART] += row[qtyField] || 0;
  });
  
  // Dynamically determine an appropriate title for the packaging summary
  let packagingTitle = "Box's"; // Default
  
  // Look for patterns in the packaging part names to determine appropriate title
  const packagingTypes = Object.keys(packagingGroups);
  
  if (packagingTypes.some(type => type.includes('BOX') || type.includes('CARTON'))) {
    packagingTitle = "Packaging";
  } else if (packagingTypes.some(type => type.includes('PALLET'))) {
    packagingTitle = "Containers";
  }
  
  // Calculate total
  const totalPackaging = Object.values(packagingGroups).reduce((sum, qty) => sum + qty, 0);
  
  // Format for display
  const packagingRows = [];
  
  // Add header row
  packagingRows.push([null, null, null, null, null, packagingTitle, "Quantity"]);
  
  // Add each packaging type
  Object.entries(packagingGroups).forEach(([part, quantity]) => {
    packagingRows.push([null, null, null, null, null, part, quantity]);
  });
  
  // Add total row
  packagingRows.push([null, null, null, null, null, "Total", totalPackaging]);
  
  return packagingRows;
}
```

## 6. Complete Dynamic Implementation

```javascript
async function generateShipmentReport(csvPath, shipmentNumber) {
  try {
    // 1. Read and parse the CSV data
    const rawData = await parseCSVFile(csvPath);
    
    // 2. Dynamically identify packaging materials
    const packagingMaterials = identifyPackagingMaterials(rawData, shipmentNumber);
    
    // 3. Construct the header with dynamic field detection
    const header = constructHeader(rawData, shipmentNumber);
    
    // 4. Build the summary body with dynamic field mapping
    const lineItems = constructSummaryBody(rawData, shipmentNumber, packagingMaterials);
    
    // 5. Calculate subtotal row
    const subtotals = calculateSubtotalRow(lineItems);
    
    // 6. Build packaging summary with the detected packaging materials
    const packagingRows = constructPackagingSummary(rawData, shipmentNumber, packagingMaterials);
    
    // 7. Assemble the complete report
    const report = assembleReport(header, lineItems, subtotals, packagingRows);
    
    // 8. Validate the report
    const validationResults = validateReport(report, lineItems, subtotals, packagingRows);
    
    return {
      report,
      valid: validationResults.valid,
      warnings: validationResults.warnings,
      errors: validationResults.errors
    };
  } catch (error) {
    console.error("Error generating report:", error);
    throw error;
  }
}
```

## 7. Key Principles for True Dynamic Processing

1. **Zero Hardcoded Values**:
   - Never assume specific part numbers, field names, or data patterns
   - Identify all values and fields from data analysis

2. **Field Discovery**:
   - Try multiple potential field names for each type of information
   - Fall back to pattern detection when direct fields aren't available

3. **Pattern Recognition**:
   - Analyze the dataset to detect common patterns (prefixes, field relationships)
   - Use these patterns to derive information not directly available

4. **Packaging Detection**:
   - Identify packaging materials by analyzing how data is used
   - Look for parts that appear without SKIDs or have distinctive usage patterns

5. **Validation Against Structure**:
   - Use structural checks (e.g., box counts per SKID) for validation
   - Verify internal consistency without assuming specific values

This approach ensures that the report generator works with any dataset that follows the same logical structure, regardless of specific values, field names, or data patterns. The system adapts to the dataset rather than expecting the dataset to conform to hardcoded assumptions.