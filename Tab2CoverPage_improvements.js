// Improved implementations for the shipment report functionality
// Copy these functions to the relevant sections in Tab2CoverPage.vue

// Add this to your imports section
import { ref, watch, computed, onMounted } from 'vue';

// Add this to your state variables
const showDebug = ref(false); // Controls visibility of debug section

// 1. Improved packaging materials identification
const identifyPackagingMaterials = (rawData) => {
  // Parts with and without SKID assignments
  const partsWithSkids = new Set();
  const allParts = new Set();
  
  // Track which parts appear with SKID assignments
  rawData.forEach(row => {
    // Handle case-insensitive property names
    const part = row.PART || row.part;
    const skids = row.SKIDS || row.skids;
    
    if (part) {
      allParts.add(part);
      
      if (skids !== null && skids !== undefined) {
        partsWithSkids.add(part);
      }
    }
  });
  
  // Strategy 1: Parts without skids are likely packaging
  const packagingBySkidPattern = [...allParts].filter(part => !partsWithSkids.has(part));
  
  // Strategy 2: Parts with packaging-related names
  const packagingByNamePattern = [...allParts].filter(part => {
    if (typeof part !== 'string') return false;
    
    return part.includes('PALLET') || 
           part.includes('BOX') || 
           part.includes('CONTAINER') ||
           part.includes('TOTE') ||
           part.includes('LID') ||
           part.includes('KW16.5X18X24');
  });
  
  // Strategy 3: Parts where SUB_PART is not "PRODUCTO TERMINADO"
  const packagingBySubPartField = rawData
    .filter(row => {
      const subPart = row.SUB_PART || row.sub_part;
      const part = row.PART || row.part;
      
      return part && subPart && subPart !== 'PRODUCTO TERMINADO';
    })
    .map(row => row.PART || row.part);
  
  // Combine all strategies but remove duplicates
  return [...new Set([...packagingBySkidPattern, ...packagingByNamePattern, ...packagingBySubPartField])];
};

// 2. Improved constructSummaryBody with better box counting logic
const constructSummaryBody = (rawData, packagingMaterials) => {
  // Filter out packaging materials
  const productData = rawData.filter(row => {
    const part = row.PART || row.part;
    return part && !packagingMaterials.includes(part);
  });

  // Group by SKID+PART combination as shown in the example report
  const partSkidGroups = {};

  productData.forEach(row => {
    // Access fields using both original case and lowercase for compatibility
    const skids = row.SKIDS || row.skids;
    const part = row.PART || row.part;

    if (skids === null || skids === undefined || !part) return;

    const key = `${skids}|${part}`;

    if (!partSkidGroups[key]) {
      // Initialize with mappings from example report
      partSkidGroups[key] = {
        skid: skids,                                       // SKID  
        part: part,                                        // PART
        clientPart: row.MX_PART || row.mx_part || '',     // PART CLIENT (mapped to S* in example)
        description: row.DESCRIPTION || row.description || '',  // DESCRIPTION
        po: row.LOT_NUM || row.LOT || row.lot_num || row.lot || '',  // PO (mapped to K019228 in example)
        qty: 0,                                           // QTY (accumulated value)
        uom: row.UM_US || row.UM_MX || row.um_us || row.um_mx || 'PZ',  // UOM (mapped to PZ in example)
        origin: row.ORIGIN_US || row.ORIGIN_MX || 
                row.origin_us || row.origin_mx || 'MX',    // ORIGIN (mapped to MX in example)
        qtyPerSet: 0,                                     // QTY PER SET (mapped to 0 in example)
        unitCost: parseFloat(row.COST || row.US_PRICE || 
                            row.cost || row.us_price || 0),  // UNIT COST (e.g., 1.03, 1.5)
        labor: parseFloat(row.LABOR || row.labor || 0),   // LABOR (mapped to 2.108 in example)
        boxNumbers: new Set(),                           // For tracking unique boxes
        weight: parseFloat(row.US_WEIGHT || row.MX_WEIGHT || 
                        row.WEIGHT_UNIT || row.us_weight || 
                        row.mx_weight || row.weight_unit || 0) // Weight per unit
      };
      
      // Try to derive client part number if not directly available
      if (!partSkidGroups[key].clientPart && part && typeof part === 'string') {
        if (part.startsWith('KWS')) {
          partSkidGroups[key].clientPart = part.replace('KWS', 'S');
        } else if (part.startsWith('KW')) {
          partSkidGroups[key].clientPart = 'S' + part.substring(2);
        }
      }
    }

    // Accumulate quantity
    partSkidGroups[key].qty += parseFloat(row.QTY1 || row.qty1 || 0);

    // Track unique box numbers per PART+SKID combination (critical for correct BOX counting)
    // Try multiple possible field names for box/carton numbers
    const ctns = row.CTNS || row.ctns || row.BOX || row.box || row.CARTON || row.carton;
    if (ctns !== null && ctns !== undefined) {
      partSkidGroups[key].boxNumbers.add(String(ctns));
    }
  });

  // Transform groups into line items following the example report format
  return Object.values(partSkidGroups).map(group => ({
    part: group.part,                              // PART
    clientPart: group.clientPart,                 // PART CLIENT
    description: group.description,               // DESCRIPTION
    po: group.po,                                 // PO
    qty: group.qty,                               // QTY 
    uom: group.uom,                               // UOM
    boxCount: group.boxNumbers.size,              // BOX - critical to use the size of the Set for unique counts
    origin: group.origin,                         // ORIGIN
    qtyPerSet: group.qtyPerSet,                   // QTY PER SET
    weight: group.weight * group.qty,             // TOTAL WEIGHT (LBS)
    unitCost: group.unitCost,                     // UNIT COST
    labor: group.labor,                           // LABOR
    totalCost: (group.unitCost + group.labor) * group.qty, // TOTAL COST
    skid: group.skid                              // SKID
  })).sort((a, b) => {
    // Sort by SKID first, then by PART
    const skidA = parseInt(a.skid) || 0;
    const skidB = parseInt(b.skid) || 0;
    
    if (skidA !== skidB) return skidA - skidB;
    return a.part.localeCompare(b.part);
  });
};

// 3. Improved packaging summary construction with proper total row
const constructPackagingSummary = (rawData, packagingMaterials) => {
  // Filter to include only identified packaging materials
  const packagingData = rawData.filter(row => {
    const part = row.PART || row.part;
    return part && packagingMaterials.includes(part);
  });
  
  // Group by packaging type and sum quantities
  const packagingGroups = {};
  
  packagingData.forEach(row => {
    const part = row.PART || row.part;
    
    if (!packagingGroups[part]) {
      packagingGroups[part] = {
        part,
        description: row.DESCRIPTION || row.DESC_CUMPLE_US || row.description || derivePackagingDescription(part),
        qty: 0
      };
    }
    
    // Accumulate quantity (shown in "Quantity" column in the example report)
    packagingGroups[part].qty += parseFloat(row.QTY1 || row.qty1 || 0);
  });
  
  // Convert to array and add a total row
  const packagingItems = Object.values(packagingGroups);
  
  // Calculate total quantity
  const totalQuantity = packagingItems.reduce((sum, item) => sum + item.qty, 0);
  
  // Add a total row
  packagingItems.push({
    part: 'Total',
    description: '',
    qty: totalQuantity
  });
  
  return packagingItems;
};

// 4. Helper function to derive packaging descriptions
const derivePackagingDescription = (partNumber) => {
  if (!partNumber || typeof partNumber !== 'string') return 'Standard Packaging';
  
  if (partNumber.includes('PALLET')) {
    return 'Standard Wood Pallet';
  } 
  else if (partNumber.includes('TOTE')) {
    return 'Standard Plastic Tote';
  }
  else if (partNumber.includes('LID')) {
    return 'Plastic Lid';
  }
  else if (partNumber.includes('BOX') || partNumber.includes('KW16.5X18X24')) {
    return 'Standard Cardboard Box';
  }
  
  return 'Standard Packaging';
};

// 5. Template changes for the debug section - add this above the existing debug section
/*
<div class="debug-toggle">
  <button @click="showDebug = !showDebug" class="button is-small">
    {{ showDebug ? 'Hide Debug Info' : 'Show Debug Info' }}
  </button>
</div>

<div v-if="showDebug" class="debug-section">
  <h3>Debug Information</h3>
  <p>Selected Declaration ID: {{ props.declaration.id }}</p>
  <p>Selected Declaration VISA: {{ props.declaration.visa }}</p>
  <p>Loading State: {{ isLoading ? 'Loading...' : 'Not Loading' }}</p>
  <p>Error State: {{ hasError ? 'Error: ' + errorMessage : 'No Errors' }}</p>
  <p>Report Data: {{ reportData ? 'Available' : 'Not Available' }}</p>
</div>
*/

// 6. Template changes for the packaging section - replace the existing packaging section
/*
<div v-if="reportData.packagingSection && reportData.packagingSection.length > 0">
  <h3 class="packaging-title">Packaging Materials</h3>
  <table class="packaging-table">
    <thead>
      <tr>
        <th>Part</th>
        <th>Description</th>
        <th>Quantity</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(item, index) in reportData.packagingSection" :key="index" 
          :class="{ 'total-row': item.part === 'Total' }">
        <td>{{ item.part }}</td>
        <td>{{ item.description }}</td>
        <td>{{ item.qty }}</td>
      </tr>
    </tbody>
  </table>
</div>
*/

// 7. Add this CSS to style the total row
/*
.packaging-table .total-row {
  background-color: #f5f5f5;
  font-weight: bold;
}
*/
