//IdManager to manage SessionsId and Connections Id with MongoDB

//Init Mongoose

module.exports = IdManager;

var wordList = require("./wordList");   //get wordlist module

function IdManager() {
    
    var self = this,
        mongoose = require("mongoose"), //get mongoose module
        
        //Connections = null, //Declare Connections Model
        Sessions = mongoose.model("Sessions", { 
            SessionId: String , 
            HostId: { type: String, default: "" }, 
            Members: { type: Array, default: [] }
            //createdAt: { type: Date, expires: 1, default: Date.now }    //set the register expiration date
        });   //Creates Session model
    
    //Function to Start IdManager and Invoke the callback passed 
    this.Start = function(dbUrl, callback) {
        mongoose.connect(dbUrl, function(error) {
            
            Sessions.remove(function(error){}); //clear Sessions DB
            
            //debug function for show sessions in the database
            Sessions.find(function(findError, result) { 
                console.log(result);                
            });
            callback(error);    //invoke the start callback method            
        });    
    };
    
    /*this.SessionClear = function() {
        Sessions.remove(function(error){});    
    };*/
        
    //Function to Check whether a Session exists
    this.CheckSessionId = function(id, callback) {      
        Sessions.findOne({ SessionId: id }, function(error, sessionHandler) {
            if(error || !sessionHandler)
                callback(false);    //invoke callback with result false
            else
                callback(true); //invoke callback with result true           
        });
    };
       
    //Function to Create New Session and Get its Handler
    this.CreateSessionId = function(finalCallback) {
        var newSessionId = getWordId(); //get random wordId 
        
        //search in the db whether the id generated already exist
        Sessions.findOne({ SessionId: newSessionId }, function(error, handler) {  
            if(error) { //if some error, log it
                console.log(error);            
            } else if(handler) {               
                //if the handler found exists, recursivily call the create function again
                self.CreateSessionId(finalCallback);                      
            } else {    //if no error and no handler is get, create new session entry, save it and invoke the finalCallback
                var newSessionEntry = new Sessions({ SessionId: newSessionId });
                newSessionEntry.save(function(error) {
                    if(error)   //if error, log it, if not, invoke the finalCallback
                        console.log(error);
                    else
                        finalCallback(newSessionId);
                });                
            }
        });
    };
    
    //Function to Join an existent Session
    this.JoinSession = function(sessionId, connection, callback) {
        Sessions.findOne({ SessionId: sessionId, }, function(error, session) {   //get session handler
            //if session not found or error 
            if(error || !session) {  
                callback(false);    //invoke callback informing with one false arg
                return; //do nothing else and return
            }
            
            //---------------   Create New Connection ID    ------------------//
                    
            do {    //Keep getting alphanumeric id until find one not used   
                var newConnId = GetAlphaNumId(20);                   
            } while(session.Members[newConnId]);
            
            connection.ConnectionId = newConnId;  //gets client the new connectiond id                           
            
            //---------------   Join Session    ------------------//
            session.Members[newConnId] = connection; //put the connection id at the session members
            if(session.HostId == "") { //if there is no host,
                session.HostId == connection.ConnectionId;  //set this joiner as host
                callback("HOST");  //invoke the end callback with the OWNER msg
            } else 
                callback(session.HostId);  //invoke the end callback with the owner connID           
        });  
    };
    
    this.GetClientHandler = function(sessionId, clientId, callback) {
        Sessions.findOne({ SessionId: sessionId, }, function(error, session) {
            //if some error while getting the session or clientId not found,
            if(error || !session || !session.Members[clientId]) {  
                callback(false);    //invoke callback informing with one false arg
            }  else  //if everithing goes good, 
                callback(session.Members[clientId]);    //get the clientid handler
        });  
    };
}



function getWordId()
{
    if(wordList.length == 0)
        return null;
    
    var numberFirst = false;
    
    if(Math.random() > 0.5)
        numberFirst = true;
    
    var numberId = GetNumId(3);
    
    var wIndex = (Math.random() * wordList.length).toFixed(0);  //got to fix 0 decimal places to use an index
    var wordId = wordList[wIndex];  
    
    wordId = wordId.substr(0,wordId.length-1);
    
    if(numberFirst)
        return numberId+wordId;
    else
        return wordId+numberId; 
}

function GetNumId(size) {   
        var text = "";
        var possible = "0123456789";
        for( var i=0; i < size; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
}; 

function GetAlphaNumId(size) {   
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < size; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
};