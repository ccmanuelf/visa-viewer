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