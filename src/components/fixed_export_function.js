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
};