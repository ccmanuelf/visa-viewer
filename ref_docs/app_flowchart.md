flowchart TD
    A[Start: VISA DECLARATION VIEWER App]
    B[Tab 1 Data Listing using Tabulator]
    A --> B
    B --> C[Call API to fetch listing data]
    C --> D[Display dynamic table with tickbox selection]
    D --> E{Row Selected?}
    E -- Yes --> F[Call API to get detailed data]
    F --> G[Auto-switch to Tab 2 Detailed Information]
    G --> H[Display data in centered card HTML table]
    H --> I[Download XLSX export button]
    H --> J[Option: Switch to Tab 3 Editable Grid]
    H --> K[Option: Switch to Tab 4 Labels Generation]
    J --> L[Editable grid with inline editing, drag-drop, add rows]
    K --> M[Generate printable labels using defined layout rules]
    M --> N[Print labels]
    E -- No --> O[Await row selection]
    C --> P[Notify error on API failure]
    F --> P