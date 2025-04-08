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
        rowEdits.qty || item.qty,
        rowEdits.uom || item.uom,
        rowEdits.boxCount || item.boxCount,
        rowEdits.origin || item.origin,
        rowEdits.qtyPerSet || item.qtyPerSet,
        rowEdits.weight || item.weight,
        rowEdits.unitCost || item.unitCost,
        rowEdits.labor || item.labor,
        rowEdits.totalCost || item.totalCost,
        rowEdits.skid || item.skid
      ]);
    });
    
    // Add subtotal row
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
    const subtotalRow = worksheet.getRow(worksheet.rowCount);
    subtotalRow.font = { bold: true };
    
    // Add empty row for spacing
    worksheet.addRow(['', '', '', '', '']);
    
    // Add packaging section header
    worksheet.addRow(['', '', '', '', '', 'Packaging', 'Quantity']);
    const packagingHeaderRow = worksheet.getRow(worksheet.rowCount);
    packagingHeaderRow.font = { bold: true };
    
    // Add packaging rows
    reportData.value.packagingSection.forEach(item => {
      worksheet.addRow(['', '', '', '', '', item.description, item.qty]);
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
};const useSampleData = ref(false);
const toggleSampleData = () => {
  useSampleData.value = !useSampleData.value;
  if (useSampleData.value && props.declaration) {
    // Use sample data instead of API call
    reportData.value = getSampleReportData();
  } else if (props.declaration) {
    // Fetch real data
    fetchReportData(props.declaration);
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
      <h2>Cover Page</h2>
      <p>Please select a declaration from the Declaration Listing tab to view its cover page.</p>
      <p class="debug-info">Debug: No declaration selected</p>
    </div>
    
    <div v-else>
      <!-- Debug information -->
      <div class="debug-section">
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
        <button @click="fetchReportData(props.declaration)" class="retry-button">
          Retry
        </button>
      </div>
      
      <div v-else-if="reportData" class="report-container">
        <!-- Header section -->
        <table class="report-header-table">
          <tbody>
            <tr>
              <td>Client Name</td>
              <td>{{ reportData.header?.clientName || 'Unknown' }}</td>
              <td></td>
              <td>Export Date</td>
              <td>{{ reportData.header?.exportDate || 'Unknown' }}</td>
            </tr>
            <tr>
              <td>From</td>
              <td>{{ reportData.header?.from || 'Unknown' }}</td>
              <td></td>
              <td>Shipment #</td>
              <td>{{ reportData.header?.shipmentNumber || 'Unknown' }}</td>
            </tr>
            <tr>
              <td>To</td>
              <td>{{ reportData.header?.to || 'Unknown' }}</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
        
        <!-- Main report table -->
        <table class="report-main-table">
          <thead>
            <tr>
              <th>PART</th>
              <th>PART CLIENT</th>
              <th>DESCRIPTION</th>
              <th>PO</th>
              <th>QTY</th>
              <th>UOM</th>
              <th>BOX</th>
              <th>ORIGIN</th>
              <th>QTY PER SET</th>
              <th>TOTAL WEIGHT (LBS)</th>
              <th>UNIT COST</th>
              <th>LABOR</th>
              <th>TOTAL COST</th>
              <th>SKID</th>
            </tr>
          </thead>
          <tbody>
            <!-- Line items -->
            <tr v-for="(item, index) in reportData.lineItems" :key="index">
              <td @click="makeEditable" :data-row-index="index" data-column="part">{{ editedCells[index]?.part || item.part }}</td>
              <td @click="makeEditable" :data-row-index="index" data-column="clientPart">{{ editedCells[index]?.clientPart || item.clientPart }}</td>
              <td @click="makeEditable" :data-row-index="index" data-column="description">{{ editedCells[index]?.description || item.description }}</td>
              <td @click="makeEditable" :data-row-index="index" data-column="po">{{ editedCells[index]?.po || item.po }}</td>
              <td @click="makeEditable" :data-row-index="index" data-column="qty">{{ editedCells[index]?.qty || item.qty }}</td>
              <td @click="makeEditable" :data-row-index="index" data-column="uom">{{ editedCells[index]?.uom || item.uom }}</td>
              <td @click="makeEditable" :data-row-index="index" data-column="boxCount">{{ editedCells[index]?.boxCount || item.boxCount }}</td>
              <td @click="makeEditable" :data-row-index="index" data-column="origin">{{ editedCells[index]?.origin || item.origin }}</td>
              <td @click="makeEditable" :data-row-index="index" data-column="qtyPerSet">{{ editedCells[index]?.qtyPerSet || item.qtyPerSet }}</td>
              <td @click="makeEditable" :data-row-index="index" data-column="weight">{{ editedCells[index]?.weight || item.weight }}</td>
              <td @click="makeEditable" :data-row-index="index" data-column="unitCost">{{ editedCells[index]?.unitCost || item.unitCost }}</td>
              <td @click="makeEditable" :data-row-index="index" data-column="labor">{{ editedCells[index]?.labor || item.labor }}</td>
              <td>{{ editedCells[index]?.totalCost || item.totalCost }}</td>
              <td @click="makeEditable" :data-row-index="index" data-column="skid">{{ editedCells[index]?.skid || item.skid }}</td>
            </tr>
            
            <!-- Subtotal row -->
            <tr class="subtotal-row">
              <td></td>
              <td></td>
              <td></td>
              <td><strong>Total</strong></td>
              <td><strong>{{ reportData.subtotals.quantity }}</strong></td>
              <td></td>
              <td><strong>{{ reportData.subtotals.boxes }}</strong></td>
              <td></td>
              <td></td>
              <td><strong>{{ reportData.subtotals.weight }}</strong></td>
              <td></td>
              <td></td>
              <td><strong>{{ reportData.subtotals.totalCost }}</strong></td>
              <td><strong>{{ reportData.subtotals.skids }}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <!-- Packaging section -->
        <h3 class="packaging-title">Packaging Materials</h3>
        <table class="packaging-table">
          <thead>
            <tr>
              <th>Part</th>
              <th>Description</th>
              <th>Box's</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in reportData.packagingSection" :key="index">
              <td>{{ item.part }}</td>
              <td>{{ item.description }}</td>
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
.cover-page-container {
  width: 100%;
  margin-top: 20px;
}

.no-selection {
  text-align: center;
  padding: 40px 0;
  color: #666;
}

.debug-section {
  background-color: #f5f5f5;
  padding: 10px;
  margin-bottom: 20px;
  border-radius: 4px;
  font-size: 0.9em;
}

.debug-info {
  color: #999;
  font-size: 0.9em;
}

.report-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.report-controls .buttons {
  display: flex;
  gap: 10px;
}

.toggle-button, .export-button, .retry-button {
  background-color: #3273dc;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.toggle-button:hover, .export-button:hover, .retry-button:hover {
  background-color: #276cda;
}

.export-button:disabled {
  background-color: #b5b5b5;
  cursor: not-allowed;
}

.retry-button {
  background-color: #cc0f35;
}

.retry-button:hover {
  background-color: #b10c2e;
}

.loading-indicator, .error-message {
  text-align: center;
  padding: 40px 0;
}

.error-message {
  color: #cc0f35;
}

.report-container {
  margin-top: 20px;
}

.report-header-table {
  width: 100%;
  margin-bottom: 20px;
  border-collapse: collapse;
}

.report-header-table td {
  padding: 8px;
  border: 1px solid #e0e0e0;
}

.report-header-table td:first-child {
  font-weight: bold;
  width: 120px;
}

.report-main-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 30px;
}

.report-main-table th,
.report-main-table td {
  padding: 8px;
  border: 1px solid #e0e0e0;
  text-align: left;
}

.report-main-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.report-main-table td[contenteditable="true"] {
  background-color: #fff9e6;
  cursor: text;
}

.subtotal-row {
  background-color: #f5f5f5;
  font-weight: bold;
}

.packaging-title {
  margin-top: 30px;
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: bold;
}

.packaging-table {
  width: 50%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.packaging-table th,
.packaging-table td {
  padding: 8px;
  border: 1px solid #e0e0e0;
  text-align: left;
}

.packaging-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}
</style>
