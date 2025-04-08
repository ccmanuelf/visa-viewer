#!/bin/bash

# Create a temporary file
TMP_FILE=$(mktemp)

# Find the makeEditable function
START_LINE=$(grep -n "makeEditable" src/components/Tab2CoverPage.vue | head -1 | cut -d: -f1)

# Find the finishEditing function
FINISH_LINE=$(grep -n "finishEditing" src/components/Tab2CoverPage.vue | head -1 | cut -d: -f1)

# Find the handleEditKeydown function
KEYDOWN_LINE=$(grep -n "handleEditKeydown" src/components/Tab2CoverPage.vue | head -1 | cut -d: -f1)

# Copy the content up to the makeEditable function
head -n $((START_LINE - 1)) src/components/Tab2CoverPage.vue > $TMP_FILE

# Append the fixed event handler functions
cat >> $TMP_FILE << 'EOF'
// Make a cell editable
const makeEditable = (event) => {
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
};

// Finish editing a cell
const finishEditing = (event) => {
  const cell = event.target;
  const newValue = cell.textContent;
  const originalValue = cell.dataset.originalValue;
  const rowIndex = cell.dataset.rowIndex;
  const column = cell.dataset.column;
  
  // Store the edited value
  if (newValue !== originalValue) {
    if (!editedCells.value[rowIndex]) {
      editedCells.value[rowIndex] = {};
    }
    editedCells.value[rowIndex][column] = newValue;
  }
  
  // Remove editable state
  cell.contentEditable = false;
  
  // Remove event listeners
  cell.removeEventListener('blur', finishEditing);
  cell.removeEventListener('keydown', handleEditKeydown);
};

// Handle keydown events during editing
const handleEditKeydown = (event) => {
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
};
EOF

# Find where the exportToExcel function starts
EXPORT_LINE=$(grep -n "exportToExcel" src/components/Tab2CoverPage.vue | head -1 | cut -d: -f1)

# Add content from exportToExcel to end of file
tail -n +$EXPORT_LINE src/components/Tab2CoverPage.vue >> $TMP_FILE

# Replace the original file with the fixed one
mv $TMP_FILE src/components/Tab2CoverPage.vue

echo "Event handlers fixed successfully!"
