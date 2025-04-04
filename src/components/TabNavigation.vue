<script setup>
import { ref } from 'vue';

// Define the active tab state
const activeTab = ref('tab1');

// Function to change the active tab
const setActiveTab = (tabId) => {
  activeTab.value = tabId;
};

// Expose the active tab and setter function to parent components
defineExpose({
  activeTab,
  setActiveTab
});
</script>

<template>
  <div class="tabs-container">
    <div class="tabs is-boxed">
      <ul>
        <li :class="{ 'is-active': activeTab === 'tab1' }">
          <a @click="setActiveTab('tab1')">
            <span>Declaration Listing</span>
          </a>
        </li>
        <li :class="{ 'is-active': activeTab === 'tab2' }">
          <a @click="setActiveTab('tab2')">
            <span>Cover Page</span>
          </a>
        </li>
        <li :class="{ 'is-active': activeTab === 'tab3' }">
          <a @click="setActiveTab('tab3')">
            <span>Packing List</span>
          </a>
        </li>
        <li :class="{ 'is-active': activeTab === 'tab4' }">
          <a @click="setActiveTab('tab4')">
            <span>Packing Labels</span>
          </a>
        </li>
      </ul>
    </div>
    
    <div class="tab-content">
      <div v-if="activeTab === 'tab1'" class="tab-pane">
        <slot name="tab1"></slot>
      </div>
      <div v-if="activeTab === 'tab2'" class="tab-pane">
        <slot name="tab2"></slot>
      </div>
      <div v-if="activeTab === 'tab3'" class="tab-pane">
        <slot name="tab3"></slot>
      </div>
      <div v-if="activeTab === 'tab4'" class="tab-pane">
        <slot name="tab4"></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabs-container {
  width: 100%;
  margin-top: 20px;
}

.tab-content {
  padding: 20px;
  border: 1px solid #dbdbdb;
  border-top: none;
  border-radius: 0 0 4px 4px;
}

.tab-pane {
  width: 100%;
}
</style>