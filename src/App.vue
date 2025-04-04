<script setup>
import { ref } from 'vue';
import TabNavigation from './components/TabNavigation.vue';
import Tab1ListTable from './components/Tab1ListTable.vue';
import Tab2CoverPage from './components/Tab2CoverPage.vue';
import Tab3PackingList from './components/Tab3PackingList.vue';
import Tab4PackingLabels from './components/Tab4PackingLabels.vue';

// Reference to the TabNavigation component
const tabNavigation = ref(null);

// State to store the selected declaration
const selectedDeclaration = ref(null);

// State for notifications
const notification = ref({
  show: false,
  message: '',
  type: 'info' // 'info', 'success', 'error'
});

// SQL command to use for the API call
const sqlCmd = ref(import.meta.env.VITE_DEFAULT_SQL_CMD || "SELECT PART, DESCRIPTION FROM PART WHERE PART='PW00111-US';");

// Handle row selection from Tab1ListTable
const handleRowSelected = (rowData) => {
  selectedDeclaration.value = rowData;
  
  // Automatically switch to Tab 2 when a row is selected
  if (tabNavigation.value) {
    tabNavigation.value.setActiveTab('tab2');
  }
};

// Handle data loaded event
const handleDataLoaded = (data) => {
  showNotification('Data loaded successfully', 'success');
};

// Handle data error event
const handleDataError = (errorMessage) => {
  showNotification(`Error loading data: ${errorMessage}`, 'error');
};

// Show notification
const showNotification = (message, type = 'info') => {
  notification.value = {
    show: true,
    message,
    type
  };
  
  // Auto-hide notification after 5 seconds
  setTimeout(() => {
    notification.value.show = false;
  }, 5000);
};
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1>VISA Declaration Viewer</h1>
    </header>
    
    <!-- Notification component -->
    <div v-if="notification.show" class="notification" :class="{
      'is-info': notification.type === 'info',
      'is-success': notification.type === 'success',
      'is-danger': notification.type === 'error'
    }">
      <button class="delete" @click="notification.show = false"></button>
      {{ notification.message }}
    </div>
    
    <main class="app-content">
      <TabNavigation ref="tabNavigation">
        <template #tab1>
          <Tab1ListTable 
            @row-selected="handleRowSelected" 
            @data-loaded="handleDataLoaded"
            @data-error="handleDataError"
            :sql-cmd="sqlCmd"
          />
        </template>
        
        <template #tab2>
          <Tab2CoverPage :declaration="selectedDeclaration" />
        </template>
        
        <template #tab3>
          <Tab3PackingList :declaration="selectedDeclaration" />
        </template>
        
        <template #tab4>
          <Tab4PackingLabels :declaration="selectedDeclaration" />
        </template>
      </TabNavigation>
    </main>
  </div>
</template>

<style>
/* Import Bulma CSS for tab styling */
@import 'bulma/css/bulma.min.css';

.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.app-header {
  margin-bottom: 20px;
  text-align: center;
}

.app-header h1 {
  font-size: 24px;
  color: #363636;
}

.app-content {
  background-color: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1);
}

/* Notification styling */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
  animation: fadeIn 0.3s, fadeOut 0.3s 4.7s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
</style>
