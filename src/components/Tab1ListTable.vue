<script setup>
import { onMounted, ref, watch, onBeforeUnmount, computed } from 'vue';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { fetchAndParseData } from '../services/apiService';

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  sqlCmd: {
    type: String,
    default: () => import.meta.env.VITE_DEFAULT_SQL_CMD || "SELECT PART, DESCRIPTION FROM PART WHERE PART='PW00111-US';"
  }
});

const emit = defineEmits(['rowSelected', 'dataLoaded', 'dataError']);

const tableElement = ref(null);
const isLoading = ref(false);
const hasError = ref(false);
const errorMessage = ref('');
const tableData = ref([]);
let table = null;

// Cache key configuration

// Generate a unique cache key based on the SQL command
const cacheKey = computed(() => `visa_viewer_data_${btoa(props.sqlCmd).replace(/=/g, '')}`);

// Fetch data from API
const fetchData = async () => {
  isLoading.value = true;
  hasError.value = false;
  errorMessage.value = '';
  
  try {
    // Use the API service to fetch and parse data
    const parsedData = await fetchAndParseData();
    
    tableData.value = parsedData;
    updateTable(parsedData);
    emit('dataLoaded', parsedData);
  } catch (error) {
    console.error('Error fetching data:', error);
    hasError.value = true;
    errorMessage.value = error.message || 'Failed to load data';
    emit('dataError', errorMessage.value);
  } finally {
    isLoading.value = false;
  }
};

// Update table with new data
const updateTable = (data) => {
  if (!table) return;
  
  try {
    // If columns have changed, we need to update the table configuration
    if (data.length > 0) {
      const firstRow = data[0];
      const dynamicColumns = Object.keys(firstRow)
        .filter(key => key !== 'id')
        .map(key => ({
          title: key,
          field: key,
          width: 150,
          headerFilter: "input"
        }));
      
      // Update columns configuration
      table.setColumns([
        // Keep the selection column
        ...table.getColumnDefinitions().filter(col => col.field === null),
        ...dynamicColumns
      ]);
    }
    
    table.replaceData(data);
  } catch (error) {
    console.error('Error updating table:', error);
  }
};

// Refresh data manually
const refreshData = () => {
  fetchData();
};

onMounted(() => {
  if (tableElement.value) {
    try {
      // Initialize Tabulator with empty data first
      table = new Tabulator(tableElement.value, {
        data: [],
        height: "400px",
        
        // Row selection configuration
        selectable: true,  // Enable row selection
        selectableRows: 1, // Limit to 1 row
        selectableRowsRollingSelection: true,
        // Row header for checkboxes
        rowHeader: {
          formatter: "rowSelection",
          titleFormatter: function(cell, formatterParams, onRendered){
            // Return empty cell to hide header checkbox
            return "";
          }, 
          hozAlign: "center",
          headerHozAlign: "center",
          headerSort: false,
          resizable: false,
          frozen: true,
          rowRange: "range",
          headerFilter: "input"
        },
        
        // Empty columns array - will be populated dynamically
        columns: [],
        
        // Row selection event
        rowClick: null,
      });

      table.on("rowSelected", function(row) {
          console.log("Row selected:", row.getData());
          emit('rowSelected', row.getData());
        });

      console.log("Tabulator initialized successfully");
      
      // Fetch data after table initialization
      fetchData();
    } catch (error) {
      console.error("Error initializing Tabulator:", error);
    }
  } else {
    console.error("Table element not found");
  }
});


// React to data changes
watch(() => props.data, (newData) => {
  if (Array.isArray(newData) && newData.length > 0) {
    tableData.value = newData;
    updateTable(newData);
  }
});

// React to SQL command changes
watch(() => props.sqlCmd, () => {
  fetchData(); // Refresh when SQL command changes
});

// Clean up when component is unmounted
onBeforeUnmount(() => {
  if (table) {
    try {
      table.destroy();
      table = null;
    } catch (error) {
      console.error("Error destroying table:", error);
    }
  }
});

</script>

<template>
  <div class="tabulator-container">
    <div class="table-controls">
      <button @click="refreshData" class="refresh-button" :disabled="isLoading">
        <span v-if="isLoading">Loading...</span>
        <span v-else>Refresh Data</span>
      </button>
    </div>
    
    <div v-if="hasError" class="error-message">
      <p>{{ errorMessage }}</p>
      <button @click="refreshData">Try Again</button>
    </div>
    
    <div v-if="isLoading && !table" class="loading-indicator">
      <p>Loading data...</p>
    </div>
    
    <div ref="tableElement"></div>
  </div>
</template>

<style>
/* Basic styling */
.tabulator-container {
  width: 100%;
  margin-top: 10px;
}

.tabulator {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.tabulator .tabulator-row.tabulator-selected {
  background-color: #ebf8ff;
}

/* Make sure checkboxes are visible */
.tabulator input[type="checkbox"] {
  opacity: 1 !important;
  visibility: visible !important;
  width: 16px !important;
  height: 16px !important;
}

/* Table controls */
.table-controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.refresh-button {
  background-color: #3273dc;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.refresh-button:hover {
  background-color: #276cda;
}

.refresh-button:disabled {
  background-color: #b5b5b5;
  cursor: not-allowed;
}

/* Loading indicator */
.loading-indicator {
  text-align: center;
  padding: 20px;
  color: #666;
}

/* Error message */
.error-message {
  background-color: #feecf0;
  color: #cc0f35;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.error-message button {
  background-color: #cc0f35;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  margin-top: 8px;
  cursor: pointer;
  font-size: 14px;
}

.error-message button:hover {
  background-color: #b10c2e;
}
</style>