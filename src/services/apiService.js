/**
 * API Service for fetching and parsing data from AppSynergy API
 * Handles API requests, CORS issues, and local caching
 */

/**
 * Fetches data from the AppSynergy API and parses it to JSON
 * @param {string} sqlCmd - SQL command to execute
 * @param {string} cacheKey - Key for localStorage caching
 * @param {boolean} forceRefresh - Whether to bypass cache and force a fresh API call
 * @returns {Promise<Array>} - Parsed data as JSON array
 */
/**
 * Properly escapes single quotes in SQL commands for API requests
 * @param {string} sql - SQL command to escape
 * @returns {string} - Escaped SQL command
 */
const escapeSqlForApi = (sql) => {
  // Replace single quotes with two single quotes (SQL standard for escaping)
  return sql.replace(/'/g, "''");
};

export async function fetchAndParseData() {
  try {
    // Get the API key from environment variables
    // Using the key from .env file which is loaded by Vite
    const apiKey = import.meta.env.VITE_API_KEY;
    
    // With proxy server approach
    const response = await fetch(`http://localhost:3000/api`, {
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

/**
 * Parses CSV text to JSON array
 * @param {string} csvText - CSV text to parse
 * @returns {Array} - Parsed data as JSON array
 */
export const parseCSVToJSON = (csvText) => {
  if (!csvText || csvText.trim() === '') {
    return [];
  }
  
  // Split the CSV text into lines
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return [];
  }
  
  // Extract headers from the first line
  const headers = lines[0].split(',').map(header => header.trim());
  
  // Parse data rows
  const jsonData = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle CSV values that might contain commas within quotes
    const values = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    values.push(currentValue.trim());
    
    // Skip empty lines
    if (values.length === 0 || (values.length === 1 && values[0] === '')) {
      continue;
    }
    
    // Create object from headers and values
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    
    // Add unique ID for tabulator
    obj.id = i;
    
    jsonData.push(obj);
  }
  
  return jsonData;
};