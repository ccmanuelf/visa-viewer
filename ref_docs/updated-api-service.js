// apiService.js
export async function fetchAndParseData() {
  try {
    // Get the API key from your secure storage or environment
    const apiKey = "64e8e66d2c8b192c1146abf2ccd785bed7221325f2f4e5e1d637fd22e38d015"; // Replace with your API key
    
    // With proxy server approach
    const response = await fetch(`http://localhost:3000/api?action=EXEC_QUERY&apiKey=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sqlCmd: "select vt.id, vt.visa, c.COMPANY_NAME, vt.trans_type, vt.state, vt.export_at from visa_transaction vt, COMPANY c where vt.user_id > 0 and vt.company_id = c.COMPANY_ID order by vt.export_at DESC;",
        responseFormat: "JSON" // Request JSON instead of CSV
      })
    });

    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    // Parse the JSON response
    const responseData = await response.json();
    
    // Check if we have a successful response
    if (responseData.status !== "OK") {
      throw new Error(`API Error: ${responseData.errorMessage || 'Unknown error'}`);
    }

    // Transform the data for tabulator - see the API documentation for the exact structure
    const tabulatorData = responseData.data.rows.map(row => {
      const rowData = {};
      responseData.data.columns.forEach((column, index) => {
        rowData[column.columnName.toLowerCase()] = row.values[index]?.value;
      });
      return rowData;
    });

    return tabulatorData;
  } catch (error) {
    console.error("Error fetching data from API:", error);
    throw error;
  }
}
