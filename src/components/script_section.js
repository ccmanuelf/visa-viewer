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

// Build SQL command using the environment variable and replacing the placeholder
const buildSqlCommand = (declaration) => {
  // Use the SQL command from environment variables
  const sqlTemplate = import.meta.env.VITE_VISA_SQL_CMD;
  // Use the ID field from the declaration for the SQL query
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
      
      // Process the data - no await needed since processReportData is not async
      const processedData = processReportData(response.data.data);
      console.log('Processed report data:', processedData);
      
      // Ensure processedData has the expected structure before assigning
      if (processedData && typeof processedData === 'object' && processedData.header) {
        reportData.value = processedData;
      } else {
        console.error('Processed data has invalid structure:', processedData);
        throw new Error('Invalid data structure after processing');
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
