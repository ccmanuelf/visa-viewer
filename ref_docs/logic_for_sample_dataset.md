# Kent Shipment Summary Report Construction Logic

## Core Logic for Reconstructing the Summary Report

To correctly reconstruct the KENT_VISA_61_NEW report from the raw_visa_61.csv data, the following key principles must be followed:

### 1. Data Structure Understanding

- **Raw Data Format**: The raw CSV contains individual records for each unit/quantity, with fields for PART, SKIDS (skid number), CTNS (box/carton number), and QTY1 (quantity).

- **Report Organization**: The Excel report is organized by unique PART+SKID combinations. When a skid contains multiple part types, each gets its own line in the report.

### 2. Box Counting Logic (Critical)

- **BOX Column Meaning**: The BOX value for each line represents the number of boxes containing that specific PART on that specific SKID, NOT the total boxes on the SKID.

- **When Multiple Parts Share a SKID**: Each part shows only its own box count, not the total for the SKID.

### 3. Aggregation Steps

1. Group raw records by SKID and PART
2. For each PART+SKID combination:
   - Sum the quantities (QTY1)
   - Count unique box numbers (CTNS) to get the box count for that part
3. Create a line item for each PART+SKID combination with its specific box count

### 4. Key Relationships to Verify

- The total number of boxes across all line items should equal 138
- Each SKID should have the correct total number of boxes:
  - SKIDs 1-7: 18 boxes each
  - SKID 8: 12 boxes

## Implementation Example

```javascript
// Group by SKID and PART to determine box counts
const partBoxesBySkid = {};

rawData.forEach(row => {
  if (!row.SKIDS || !row.PART) return;
  
  const key = `${row.SKIDS}|${row.PART}`;
  
  if (!partBoxesBySkid[key]) {
    partBoxesBySkid[key] = {
      skid: row.SKIDS,
      part: row.PART,
      qty: 0,
      boxNumbers: new Set(),
    };
  }
  
  partBoxesBySkid[key].qty += row.QTY1 || 0;
  
  if (row.CTNS) {
    partBoxesBySkid[key].boxNumbers.add(row.CTNS);
  }
});

// Calculate the box count for each PART+SKID combination
Object.keys(partBoxesBySkid).forEach(key => {
  partBoxesBySkid[key].boxCount = partBoxesBySkid[key].boxNumbers.size;
});

// Create line items for the report
const lineItems = Object.values(partBoxesBySkid).map(item => ({
  part: item.part,
  skid: item.skid.toString(),
  quantity: item.qty,
  boxCount: item.boxCount
}));
```

## SKID Distribution Pattern

| SKID | Part Distribution | Boxes |
|------|-------------------|-------|
| 1 | KWS103000-100-002-12-FRCN (14), KWS103000-100-004-12-FRCN (4) | 18 |
| 2 | KWS103000-100-004-12-FRCN (18) | 18 |
| 3 | KWS103000-100-004-12-FRCN (18) | 18 |
| 4 | KWS103000-500-004-12-RBCN (18) | 18 |
| 5 | KWS103000-500-004-12-RBCN (18) | 18 |
| 6 | KWS103000-500-004-12-RBCN (4), KWS103000-500-005-12-RBCN (14) | 18 |
| 7 | KWS103000-500-001-12-RBCN (2), KWS103000-500-005-12-RBCN (16) | 18 |
| 8 | KWS103000-500-001-12-RBCN (12) | 12 |

## Common Misunderstandings to Avoid

1. **DO NOT** use the same BOX value for all parts on a SKID (e.g., showing 18 boxes for both parts on SKID 1)
2. **DO NOT** try to determine BOX values based on quantities alone
3. **DO NOT** aggregate parts across different SKIDs
4. **DO NOT** assume BOX values represent total boxes on a SKID

## Validation Checks

1. Sum of all BOX values should equal 138
2. Sum of BOX values for each SKID should match the expected total (18 for SKIDs 1-7, 12 for SKID 8)
3. Total quantity should be 15,000 units
4. Total number of SKIDs should be 8

Following this logic ensures an accurate reconstruction of the Excel report that correctly represents the physical distribution of parts across boxes and skids in the shipment.