let mysql=require('mysql');
 var con=mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"Ritik@123",
    database:"portal"
 })

 module.exports=con;