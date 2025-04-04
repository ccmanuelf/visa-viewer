//Build Tabulator
var table = new Tabulator("#example-table", {
    height:"311px",
    rowHeader:{headerSort:false, resizable: false, frozen:true, headerHozAlign:"center", hozAlign:"center", formatter:"rowSelection", titleFormatter:"rowSelection", cellClick:function(e, cell){
      cell.getRow().toggleSelect();
    }},
    columns:[
      {title:"Name", field:"name", width:200},
      {title:"Progress", field:"progress", width:100, hozAlign:"right", sorter:"number"},
      {title:"Gender", field:"gender", width:100},
      {title:"Rating", field:"rating", hozAlign:"center", width:80},
      {title:"Favourite Color", field:"col"},
      {title:"Date Of Birth", field:"dob", hozAlign:"center", sorter:"date"},
      {title:"Driver", field:"car", hozAlign:"center", width:100},
    ],
});
