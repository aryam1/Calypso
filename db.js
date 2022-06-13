const mysql = require('mysql2');
const {db_user,db_key} = require('./token.json');


const dbconn = mysql.createConnection({
    host:"database.discordbothosting.com",
    user:db_user,
    password:db_key,
    database:"s364_Members",
})
 module.exports = {
     // Initialises Connection
     init : function() { dbconn.connect((err) => { if (err) console.log(err); console.log('Connected!') }) },
     
     // Gets all registered members
     getRegistered : function() {
         return new Promise(function(resolve,reject) {
             dbconn.query('SELECT Discord,UserInfo FROM members',(err,res) => {
                 // reduces array of objects into array of arrays, first array with Discord ids and second array with in-game info
                 resolve(res.reduce((total,current)=>{ return [[...total[0],current.Discord],[...total[1],current.userInfo]] },[ [], [] ]));
             });
         });
     },
     
     // Registers User
     userRegister : function(member) {
         return new Promise(function(resolve,reject) {
             dbconn.query('INSERT INTO members SET ? ON DUPLICATE KEY UPDATE UserInfo = ?', [member,member.UserInfo],(err, res) => {resolve(err==null)});
         });
     },
     // fetches bungie ID
     fetchMember : function(id) {
         return new Promise(function(resolve,reject) {
             dbconn.query('SELECT UserInfo FROM members WHERE Discord = ?', id,(err, res) => {
                 // splits the in-game info into 2 constituent parts if the user is in the db
                 if(res[0]){
                     const [type,id]= res[0].UserInfo.split('/');
                     resolve([type,id]);
                 }
                 else { return reject(undefined)}
             });
         });
     },
     // returns info for members in a given list
     fetchMassMembers : function(id) {
         return new Promise(function(resolve,reject) {
             // formats list of ids with quotation marks so they can be searched against with SQL
             const injectedSql= id.map(c => `'${c}'`).join(', ');
             let sql = `SELECT Discord, UserInfo, DiscAct FROM members WHERE Discord IN (${injectedSql})`;
             dbconn.query(sql,(err, res) => {resolve(res)});
         });
     },
     // returns all information about all members
     fetchAll : function() {
         return new Promise(function(resolve,reject) { dbconn.query('SELECT * FROM members',(err, res) => {resolve(res)})});
     },
     
     // deletes member entry
     deleteMember : function(id) {
         return new Promise(function(resolve,reject) {
             dbconn.query('DELETE FROM members WHERE Discord = ?', [id],(err, res) => { resolve(err==null)});
         });
     },
     
     // gets discord activity
     fetchActivity : function(id) {
         return new Promise(function(resolve,reject) {
             dbconn.query('SELECT DiscAct FROM members WHERE UserInfo = ?', id,(err, res) => {resolve((res[0])?  res[0].DiscAct: 0)});
         });
     },
     
     // updates discord activity
     updateActivity : function(id) { 
         dbconn.query('UPDATE members SET DiscAct = null WHERE Discord = ?',id);
     },
     
     // resets records
     recordsReset : function() { dbconn.query('UPDATE members SET DiscAct = DiscAct, Records = 0') },
     
     // adds entry to hall of fame
     hofAdd : function(record) {
         return new Promise(function(resolve,reject) { dbconn.query('INSERT INTO hof VALUES (?)', [record],(err, res) => {resolve(res.insertId)}) });
     },
     
     // deletes a record from hall of fame using its is
     hofDelete : function(record) {
         return new Promise(function(resolve,reject) { dbconn.query('DELETE FROM hof WHERE id = ?', [record],(err, res) => {resolve(err=null)}) });
     },
     
     // deletes all records containing a certain member
     hofDeleteUser: function(id) {
         return new Promise(function(resolve,reject) {
             dbconn.query('DELETE FROM hof WHERE ? IN(Member_1, Member_2, Member_3, Member_4, Member_5, Member_6)', [id],(err, res) => {resolve(res)});
         });
     },
     
     // fetches record by id
     hofFetchOne : function(id) {
         return new Promise(function(resolve,reject) { dbconn.query('SELECT * FROM hof WHERE id = ?', id,(err, res) => {resolve(res[0])}) }); 
     },
     
     // fetches and orders hof records for a given season and activity
     hofFetch : function(season,activity,group=false) {
         return new Promise(function(resolve,reject) {
             dbconn.query('SELECT * FROM hof USE INDEX (Records) WHERE Season = ? AND Activity = ? ORDER BY '+`${group?'Description, Value':'Value'}`, [season,activity],(err, res) => {resolve(res)});
         });
     },
     
     // fetches a list of unique descriptions for a given season and activity
     hofDescFetch : function(season,activity) {
         return new Promise(function(resolve,reject) {
             dbconn.query('SELECT DISTINCT Description FROM hof WHERE Season = ? AND Activity=?', [season,activity],(e, res)=>{resolve(res.map(r=>r.Description))});
         }); 
     },
     
     // fetch all records for a user in a given season
     hofFetchAll : function(season,id) {
         return new Promise(function(resolve,reject) {
             dbconn.query('SELECT * FROM hof WHERE ? IN(Member_1, Member_2, Member_3, Member_4, Member_5, Member_6) AND Season = ? Order BY Activity', [id,season],(err, res) => {resolve(res)});
         });
     },
     
     // increments or decrements record value for a user
     recordsChange : function(member,type){
         return new Promise(function(resolve,reject) {
             dbconn.query(`UPDATE members SET DiscAct = DiscAct, Records = IF(Records ${type} 1>= 0, Records ${type} 1, 0) WHERE Discord = ${member}`, (err,res) =>{
                 resolve(err==null);
             });
         });
     },
     
     // gets record count for a user
     recordsGet : function(member){
         return new Promise(function(resolve,reject) {dbconn.query('SELECT Records FROM members WHERE Discord = ?',member, (err,res) =>{resolve(res[0].Records)})});
     },
     
     // adds scheduled event
     scheduleAdd : function(record) {
         return new Promise(function(resolve,reject) { dbconn.query('INSERT INTO schedule VALUES (?)', [record],(err, res) => {resolve(err=null)}) });
     },
     
     // fetch event by id
     scheduleGet : function(id) {
          return new Promise(function(resolve,reject) { dbconn.query('SELECT * FROM schedule WHERE id = ?', id,(err, res) => {resolve(res[0])}) }); 
     },
     
     // delete event by id
     scheduleDelete : function(id) {
         return new Promise(function(resolve,reject) { dbconn.query('DELETE FROM schedule WHERE id = ?', id,(err, res) => {resolve(err==null)}) });
     },
     
     // fetches all events by a host that haven't happened yet
     scheduleCalendar : function(user='Host'){
         return new Promise(function(resolve,reject) {dbconn.query('SELECT * FROM schedule WHERE Time >= CURDATE() AND Host = ?',user, (err,res)=> {
             resolve(res)}) });
     },
     
     // fetches all events between 2 timestamps
     scheduleGetPeriod : function(date1,date2) {
         return new Promise(function(resolve,reject) { dbconn.query('SELECT * FROM schedule WHERE (Time BETWEEN ? AND ?) Order BY Time', [date1,date2],(err, res) => {resolve(res)}) });
     },
     
     // add event to calendar
     calendarAdd : function(record) {
         return new Promise(function(resolve,reject) { dbconn.query('INSERT INTO calendar VALUES (?)', [record],(err, res) => {resolve(err==null)}) });
     },
     
     // gets all future events in the calendar
     calendarGet : function(user='Host'){
         return new Promise(function(resolve,reject) {dbconn.query('SELECT * FROM calendar WHERE Time >= CURDATE()',user, (err,res)=> {resolve(res)}) });
     },
     
     // tracks interaction usage
     addUse : function(data) {
         return new Promise(function(resolve,reject) { dbconn.query('INSERT INTO commUse VALUES (?)', [data],(err, res) => {resolve(err )}) });
     }
 };