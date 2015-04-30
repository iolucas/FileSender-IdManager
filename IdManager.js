//IdManager to manage SessionsId and Connections Id with MongoDB

//Init Mongoose

module.exports = IdManager;

var wordList = require("./wordList");   //get wordlist module

function IdManager() {
    
    var self = this,
        mongoose = require("mongoose"), //get mongoose module
        
        //Connections = null, //Declare Connections Model
        Sessions = mongoose.model("Sessions", { SessionId: String , HostId: String, Members: [] });   //Creates Session model
    
    //Function to Start IdManager and Invoke the callback passed 
    this.Start = function(dbUrl, callback) {
        mongoose.connect(dbUrl, callback);    
    };
    
    this.SessionClear = function() {
        Sessions.remove(function(error){});    
    };
        
    //Function to Get Session Handler
    this.GetSessionId = function(id, callback) {      
        Sessions.findOne({ SessionId: id }, callback);
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
                    if(error)
                        console.log(error);
                    else {
                        Sessions.find(function(error, result) { //debug function for show sessions in the database
                            console.log(result);
                            finalCallback(newSessionId);
                        });
                    }
                });                
            }
        });
    };  
}

function createSession() {
    
    do {
        var newSessionId = getWordId();       
    } while(sessions[newSessionId]);
    
    /*var newSessionId = getId(5);
        
    while(sessions[newSessionId])
        newSessionId = getId(5);*/
             
    sessions[newSessionId] = new Object();
    sessions[newSessionId].hostId= "";
    sessions[newSessionId].members = [];
    
    return newSessionId;
}

function getWordId()
{
    if(wordList.length == 0)
        return null;
    
    var numberFirst = false;
    
    if(Math.random() > 0.5)
        numberFirst = true;
    
    var numberId = Misc.GetNumId(3);
    
    var wIndex = (Math.random() * wordList.length).toFixed(0);  //got to fix 0 decimal places to use an index
    var wordId = wordList[wIndex];  
    
    wordId = wordId.substr(0,wordId.length-1);
    
    if(numberFirst)
        return numberId+wordId;
    else
        return wordId+numberId; 
}