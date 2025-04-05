# Development Plan for VISA Declaration Viewer - Tab 2 Implementation

Here's a refined development plan that accounts for the existing Tab2CoverPage.vue component, it is intended to avoid duplicated code, and provides more specific guidance for the coding assistant. Please note: most of reference documents can be found inside the ref_docs folder. Includes visual reference as summary_report_reference.png for the expected layout for the final report.
In case it is considered valuable, use reference sample dataset raw_visa_61_updated.csv which should match the result obtained from the API call when using the new SQL command.
Whenever possible identify and re-use existing logic to streamline development and reduce redundancy.

## Phase 1: Understanding the Initial Setup and Configuration

1. **Review the Existing Tab2CoverPage.vue Component**
   - Examine the current structure of Tab2CoverPage.vue
   - Understand its lifecycle hooks, existing methods, and data properties
   - Check how it's registered in the parent component/router
   - Identify where additional code should be integrated

2. **Examine Reference Documentation**
   - Review the markdown files in the ref_docs folder:
     - logic_for_sample_dataset.md: Understand specific logic for box counting
     - generic_report_logic.md: Understand generalized approach to report construction
     - generic_report_complement.md: Review packaging section handling
     - updated_report_logic.md: Study the comprehensive implementation guide
     - updated_notes.md: Check latest refinements and guidelines
   - Note the key principles for dynamic data processing without hardcoded values

3. **Set Up Data Communication with Tab 1**
   - Determine how to receive the selected row information from Tab 1
   - Implement a watcher or event listener in Tab2CoverPage.vue
   - Create a mechanism to detect when a checkbox is enabled (not disabled)
   - Extract the ID value from the selected row data

## Phase 2: Implementing the Data Retrieval Process

4. **Create the Dynamic SQL Command Construction**
   - Access the VITE_VISA_SQL_CMD environment variable
   - Create a function to replace the {ID_FROM_TABLE} placeholder with the actual ID
   - Prepare the complete SQL command for the API call

5. **Implement the API Call Function**
   - Use the existing pattern from apiService.js
   - Modify the function to accept and use the dynamically generated SQL command
   - Include proper error handling and loading state management
   - Structure the API call similar to:
     ```
     POST to: https://www.appsynergy.com/api?action=EXEC_QUERY&apiKey=...
     Body: {
       "sqlCmd": "[dynamically generated SQL command]",
       "responseFormat": "CSV"
     }
     ```
## Phase 2 bis: Testing with Sample Data

1. **Create a Testing Function with Sample Data**
   - Implement a function that uses hardcoded sample data for initial testing
   - This allows testing the report generation logic before integrating the API call
   - The sample data should match the expected structure of the API response

2. **Implement a Toggle Between Test Data and API Data**
   - Add a development flag to switch between sample data and live API data
   - This facilitates testing and debugging during development

## Resume Phase 2
6. **Create the Row Selection Trigger Function**
   - Implement a method that's triggered when a checkbox in Tab 1 is selected
   - Add a condition to ensure it only processes when enabling (not disabling)
   - Call the SQL command construction and API call functions
   - Manage loading states and error handling during data retrieval

## Phase 3: Implementing Dynamic Report Generation Logic

7. **Create the Packaging Material Detection Function**
   - Implement the function described in updated_notes.md to identify packaging materials
   - Analyze the data structure to identify packaging without hardcoded values
   - Look for parts that appear without SKID assignments or have distinctive patterns

8. **Build the Report Header Generator**
   - Develop a function to dynamically extract client name, from/to, export date
   - Use multiple potential field names for each data point
   - Include fallbacks for missing or undefined values
   - Structure the header according to the sample report image provided

9. **Implement the Summary Body Builder**
   - Create a function that follows the logic outlined in updated_report_logic.md
   - Group data by unique SKID+PART combinations
   - Count distinct box numbers (CTNS values) for each combination
   - Calculate quantities, weights, and costs for each line item
   - Format each row according to the sample image layout

10. **Create the Subtotal Calculator**
    - Develop a function to aggregate values across all line items
    - Sum quantities, box counts, weights, and costs
    - Count unique SKID numbers
    - Format the totals row according to the sample layout

11. **Build the Packaging Summary Generator**
    - Create a function to extract packaging information
    - Filter data to include only identified packaging materials
    - Group by packaging type and sum quantities
    - Format the packaging section with appropriate headers and totals

## Phase 4: Building the Interactive UI Components

12. **Create the Dynamic HTML Table Layout**
    - Design a responsive table that matches the sample image layout
    - Include proper column headers and formatting
    - Create separate sections for the header, main body, totals, and packaging
    - Apply appropriate styling for readability

13. **Implement Table Editing Capabilities**
    - Make appropriate cells editable (modify innerHTML attributes)
    - Add event listeners to capture edited values
    - Add validation logic for numeric fields
    - Store edited values temporarily in the component state
    - Note: As mentioned, edits will be temporary and not update the backend data model

14. **Build the XLSX Export Functionality**
    - Research and select an appropriate library for XLSX generation (e.g., SheetJS/xlsx)
    - Create a function to convert the current table state (including any edits) to XLSX format
    - Structure the export to match the visual presentation in the UI
    - Add a download button with proper event handling
    - Ensure metadata (date, report name) is included in the export

## Phase 5: Error Handling and User Experience

15. **Implement Comprehensive Error Handling**
    - Create states for different error scenarios (API failure, data processing issues)
    - Display appropriate error messages to guide the user
    - Add retry mechanisms where appropriate
    - Ensure graceful degradation if data is partially available

16. **Add Loading States and User Feedback**
    - Implement visual loading indicators during data retrieval and processing
    - Add success notifications for completed operations
    - Create user guidance for each step of the process
    - Ensure users understand when actions are in progress

17. **Create Empty and Initial States**
    - Design the UI for when no row is selected
    - Add clear instructions to guide users to select a row from Tab 1
    - Implement a clean initial state with appropriate messaging

## Detailed Implementation Instructions for Key Components

### Row Selection and Data Retrieval

1. In Tab2CoverPage.vue, add a method to handle row selection:
   - Accept the row data emitted from Tab 1
   - Extract the ID value (ensure it's from the 'id' field, not 'visa')
   - Check if this is a new selection or the same row being reselected
   - Clear any existing report data if a new selection is made
   - Set loading state to true
   - Call the SQL construction function

2. Create a SQL command construction function:
   ```javascript
   function buildSqlCommand(id) {
     // Get the SQL template from environment variables
     const sqlTemplate = import.meta.env.VITE_VISA_SQL_CMD;
     
     // Replace the placeholder with the actual ID
     return sqlTemplate.replace('{ID_FROM_TABLE}', id);
   }
   ```

3. Implement the API call function:
   ```javascript
   async function fetchReportData(sqlCmd) {
     try {
       // Use the same API pattern as existing fetchAndParseData
       const response = await axios.post(API_URL, {
         sqlCmd: sqlCmd,
         responseFormat: "CSV"
       });
       
       // Parse the CSV response
       // Process into structured data
       return parsedData;
     } catch (error) {
       console.error('Error fetching report data:', error);
       throw error;
     }
   }
   ```

### Dynamic Report Generation Implementation

1. Create a comprehensive data processing pipeline:
   ```javascript
   function processReportData(rawData) {
     // 1. Identify packaging materials
     const packagingMaterials = identifyPackagingMaterials(rawData);
     
     // 2. Extract header information
     const header = constructHeader(rawData);
     
     // 3. Build the summary body
     const lineItems = constructSummaryBody(rawData, packagingMaterials);
     
     // 4. Calculate subtotals
     const subtotals = calculateSubtotals(lineItems);
     
     // 5. Build packaging summary
     const packagingSection = constructPackagingSummary(rawData, packagingMaterials);
     
     // 6. Return complete report structure
     return {
       header,
       lineItems,
       subtotals,
       packagingSection
     };
   }
   ```

2. Implement the packaging material detection function as described in updated_notes.md:
   ```javascript
   function identifyPackagingMaterials(rawData) {
     // Count occurrences of each part number
     const partCounts = {};
     const partWithSkidCounts = {};
     
     // Track which parts appear with SKID assignments
     rawData.forEach(row => {
       if (row.PART) {
         partCounts[row.PART] = (partCounts[row.PART] || 0) + 1;
         
         if (row.SKIDS !== null && row.SKIDS !== undefined) {
           partWithSkidCounts[row.PART] = (partWithSkidCounts[row.PART] || 0) + 1;
         }
       }
     });
     
     // Identify parts that rarely appear with SKIDs as packaging materials
     return Object.keys(partCounts).filter(part => {
       const withSkidCount = partWithSkidCounts[part] || 0;
       const totalCount = partCounts[part];
       
       // Parts that rarely have SKID assignments are likely packaging
       return withSkidCount / totalCount < 0.1;
     });
   }
   ```

3. The summary body construction should follow the box counting logic described in logic_for_sample_dataset.md:
   ```javascript
   function constructSummaryBody(rawData, packagingMaterials) {
     // Filter out packaging materials
     const productData = rawData.filter(row => 
       row.PART && !packagingMaterials.includes(row.PART)
     );
     
     // Group by SKID+PART combination
     const partSkidGroups = {};
     
     productData.forEach(row => {
       if (row.SKIDS === null || row.SKIDS === undefined) return;
       
       const key = `${row.SKIDS}|${row.PART}`;
       
       if (!partSkidGroups[key]) {
         partSkidGroups[key] = {
           skid: row.SKIDS,
           part: row.PART,
           qty: 0,
           boxNumbers: new Set(),
           // Extract additional fields as available
         };
       }
       
       // Accumulate quantity
       partSkidGroups[key].qty += row.QTY1 || 0;
       
       // Track unique box numbers - this is CRITICAL for correct box counting
       if (row.CTNS !== null && row.CTNS !== undefined) {
         partSkidGroups[key].boxNumbers.add(row.CTNS);
       }
     });
     
     // Transform groups into line items
     const lineItems = Object.values(partSkidGroups).map(group => ({
       part: group.part,
       clientPart: deriveClientPartNumber(group.part),
       description: group.description || "",
       po: group.po || "",
       qty: group.qty,
       uom: group.uom || "PZ",
       boxCount: group.boxNumbers.size, // BOX value is unique boxes for this PART+SKID
       // Calculate additional fields as needed
     }));
     
     return lineItems;
   }
   ```

### UI Implementation for the Report Display

1. Create a responsive table structure that matches the sample image:
   ```html
   <div class="report-container">
     <!-- Header section -->
     <table class="report-header-table">
       <tr>
         <td>Client Name</td>
         <td>{{ report.header.clientName }}</td>
         <td></td>
         <td>Export Date</td>
         <td>{{ report.header.exportDate }}</td>
       </tr>
       <tr>
         <td>From</td>
         <td>{{ report.header.from }}</td>
         <td></td>
         <td>Shipment #</td>
         <td>{{ report.header.shipmentNumber }}</td>
       </tr>
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
         <tr v-for="item in report.lineItems" :key="`${item.skid}-${item.part}`">
           <td>{{ item.part }}</td>
           <td class="editable" @click="makeEditable">{{ item.clientPart }}</td>
           <!-- Additional columns -->
         </tr>
         
         <!-- Subtotal row -->
         <tr class="subtotal-row">
           <td colspan="3"></td>
           <td>Total</td>
           <td>{{ report.subtotals.quantity }}</td>
           <td></td>
           <td>{{ report.subtotals.boxes }}</td>
           <!-- Additional subtotal columns -->
         </tr>
       </tbody>
     </table>
     
     <!-- Packaging section -->
     <table class="packaging-table">
       <tr>
         <td colspan="5"></td>
         <td>Box's</td>
         <td>Quantity</td>
       </tr>
       <!-- Packaging rows -->
     </table>
     
     <!-- Export button -->
     <button @click="exportToExcel" class="export-button">Download XLSX</button>
   </div>
   ```

2. Implement the cell editing functionality:
   ```javascript
   function makeEditable(event) {
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
   }
   
   function finishEditing(event) {
     const cell = event.target;
     
     // Validate the new value if needed
     // Store the edited value in component state
     
     // Remove editable state
     cell.contentEditable = false;
     
     // Remove event listeners
     cell.removeEventListener('blur', finishEditing);
     cell.removeEventListener('keydown', handleEditKeydown);
   }
   
   function handleEditKeydown(event) {
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
   }
   ```

3. Implement the XLSX export functionality:
   ```javascript
   async function exportToExcel() {
     // Use a library like SheetJS/xlsx
     // You'll need to install it first: npm install xlsx
     
     try {
       // Create a workbook from the current report state
       const wb = XLSX.utils.book_new();
       
       // Create worksheets for each section
       const mainWs = createMainWorksheet();
       
       // Add worksheets to workbook
       XLSX.utils.book_append_sheet(wb, mainWs, "Report");
       
       // Generate file and trigger download
       XLSX.writeFile(wb, `Shipment_Report_${report.header.shipmentNumber}.xlsx`);
     } catch (error) {
       console.error("Export failed:", error);
       // Show error message to user
     }
   }
   
   function createMainWorksheet() {
     // Convert report data to format expected by XLSX
     // Include header, line items, subtotals, and packaging sections
     // Format according to the visual layout
     
     // Return worksheet object
   }
   ```

## Important Implementation Notes

1. **Box Counting Logic**: The critical aspect of correct implementation is the box counting logic. The BOX value for each line must represent the number of boxes containing that specific PART on that specific SKID, not the total boxes on the SKID. This is accomplished by counting the unique CTNS values for each PART+SKID combination.

2. **Dynamic Field Discovery**: Since the assistant hasn't seen sample data before, they must implement flexible field detection that tries multiple possible field names and falls back to pattern detection when direct fields aren't available.

3. **No Hardcoded Values**: The implementation should avoid any hardcoded part numbers, field names, or data patterns. All values should be derived from analyzing the dataset structure.

4. **Temporary Edits**: As mentioned, edits to the table should be tracked in the component state and included in the XLSX export, but not sent back to update the underlying data model.

5. **Layout Matching**: The UI implementation should closely match the sample image provided, with appropriate spacing, alignment, and sectioning.

6. **Error Handling**: Include comprehensive error handling for API failures, data processing issues, and export problems. Provide clear feedback to users when errors occur.

By following this detailed plan, the coding assistant should be able to implement the complete Tab 2 functionality for the VISA Declaration Viewer application, creating a robust, flexible, and user-friendly report generation system that aligns with the provided sample output layout.