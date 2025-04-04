mcampos.novalin


![](https://web-api.textin.com/ocr_image/external/f1d40fe157efe188.jpg)

<!-- Contact Us  -->
![](https://web-api.textin.com/ocr_image/external/49dbd26845f5cd6f.jpg)

CUSTOMIZATION TUTORIALS RESOURCES COMPANY My Apps

# Database Connectors

AppSynergy uses MariaDB for its SQL database. This means you can use standard MariaDB and MySQL connectors and software to access your database. The recommended connectors are linked below.

You will need to create an API Key to grant access to any external users. See Tools &gt; API Keys for details.

<!--  Windows 64 bit ODBC Click to download the MSI ﬁle. Be sure to enable Force TLS Use when conﬁguring the DSN.  -->
![](https://web-api.textin.com/ocr_image/external/df724e84fa830737.jpg)

<!--   -->
![](https://web-api.textin.com/ocr_image/external/6beb7c7cf8cd0405.jpg)

<!--   -->
![](https://web-api.textin.com/ocr_image/external/c0c6e89d6a023614.jpg)

Java JDBC Driver All MariaDB Connectors

Click to download the JDBC driver. Click to visit the MariaDB

Connector download page.

# REST Service

You can also access your database via our REST API.

# Query

Execute a SQL query and return the results in either JSON or CSV format. The Security Role assigned to the API Key determines what is accessible.

# Request


| POST https://www.appsynergy.com/api?action=EXEC_QUERY&apiKey=YOUR_API_KEY{ "sqlCmd": "SELECT * FROM MyTable",  "responseFormat": "JSON" -- enum: JSON, CSV }<img src="https://web-api.textin.com/ocr_image/external/8092ea4cfc46b149.jpg"> |
| -- |


The sqlCmd can be any valid SQL query.

# Response

If responseFormat was CSV:

<!-- Customer_ID,Name 1000,"Company A" 1001,"Company B"  -->
![](https://web-api.textin.com/ocr_image/external/fa8f5143c4cc9559.jpg)

## If responseFormat was JSON:

<!-- { "status": "OK", "errorMessage": "", "errorCode": "", "data": { "columns": [ { "tableName": "Customers", "columnName": "Customer_ID", "datatype": "BIGINT" }, { "tableName": "Customers", "columnName": "Name", "datatype": "VARCHAR" } ], "rows": [ { "values": [ { "value": "1000" }, { "value": "Company A" } ] }, { "values": [ { "value": "1001" }, { "value": "Company B" } ] } ] } }  -->
![](https://web-api.textin.com/ocr_image/external/dd661391f1b2c00d.jpg)

The data.rows property is an array of row objects. Each row object has an array of value objects. Each value object has a value property. Therefore data.rows[0].values[0].value refers to the value in the ﬁrst column of the ﬁrst row.

## Data Modiﬁcation

Execute a SQL DML statement (e.g. INSERT, UPDATE, DELETE). The Security Role assigned to the API Key

determines what can be modiﬁed.

## Request

<!-- POST https://www.appsynergy.com/api?action=EXEC_DML&apiKey=YOUR_API_KEY { "sqlCmd": "UPDATE MyTable SET MyCol = 123 WHERE ID = 100" }  -->
![](https://web-api.textin.com/ocr_image/external/e342b8f22e4e93d6.jpg)

sqlCmd - any valid SQL DML statement.

# Response

{

 "status": "OK", "errorMessage": "",

"errorCode": "",

"data": {

 "rowsAffected": 1

}

data.rowsAffected - number of rows affected by the SQL statement.

# API Limitations

Note that all API requests:

Must provide their API Key via the URL (as shown) or via an HTTP header in Bearer Authentication format.

Must complete in &lt; 10 minutes to avoid a timeout.

Must be &lt; 16MB in size.

Are rate limited to 500 connections per hour to prevent runaway usage. This is conﬁgurable via the API user's MAX_CONNECTIONS_PER_HOUR resource option.

Terms of ServicePrivacy PolicyAbout Us

<!-- ✉ -->

<!-- Copyright © 2025 ParaSQL LLC. The AppSynergy name and logo are trademarks ™ of ParaSQL LLC. -->

