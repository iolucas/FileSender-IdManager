/*  ----------- TODO LIST ----------------//

-   If some id stays too much time without a session, its connection will be closed
-   Create system to store recently used connection ids to prevent them to be used
-   Before request session, connection wont have an id
-	Verify which point it tried to send data to not connected socket that are making the server to crash
-   Create system to keep negotiating accessKeys to be used to request the same conn id in case server crashs or any other error

//  -------------------------------------*/

/*  ----------- Updates V1.5 ----------------//

-   Changed socket.io for a simpler api to handle websockets to reduce download resources

//  -------------------------------------*/


/* got to create a array of connected clients to manage them
clients which connect in the beggining wont receive their own id
and then ask to join or create session

if want to create, server will create a new session instance and respond with its id 

if want to join, server will verify whether session id exists, if so, it will


*/

//Init main modules

var express = require("express");   //get express module
var http  = require("http");    //get http module
var cfenv = require("cfenv");   //get cloud foundry enviroment module
var ws = require("ws"); //get the websocket module

var app = express();    //inits the express application

// get environmental information for this app
var appEnv   = cfenv.getAppEnv();
var instance = appEnv.app.instance_index || 0;

// create a server with a simple request handler
var httpServer = http.createServer(app);

// start the server on the calculated port and host
httpServer.listen(appEnv.port, function() {
    console.log("Maestro starting on " + appEnv.url)
});

app.get("/status", function(req, res) {   //respond the request for server/maestrostatus
    res.send("status"); //for while respond with status word       
});

var wsServer = new ws.Server({ server: httpServer });   //'promotes' the httpserver to a websocket server

var MsgHandler = new Object();  //object to hold event creations

wsServer.on("error", function(error) {  //instance to handle websocket server errors
    console.log("Error while connecting websocket: " + error);    
});

wsServer.on("connection", function(wSocket) {   //websocket connection event handler
    
    wSocket.on("error", function(error) {   //instance to handle websocket errors
        log("Error while dealing new websocket: " + error);       
    });

    wSocket.on("close", function(code, message) {   //instance to handle websocket errors
        log("Closing websocket: " + code + " " + message);         
    });

    wSocket.on("message", function(message) {   //instance to handle websocket messages
        
        
    });
});


function MaestroSocket(wSocket) {   //MaestroSocket class to handle websocket information
    
    var self = this;    //holds its own ref
    
    var events = [];    //events array to store callbacks
    
    wSocket.onerror = function(error) {
        if(events["error"])
            events["error"].call(this, error);       
    };    
    
    wSocket.onclose = function(code, message) {
        if(events["close"])
            for(cbIndex in events["close"])   //for each callback in the event array,
                events["close"][cbIndex].call(this, code, message); //fire with the args and its scope as "this" value    
    };
    
    wSocket.onmessage = function(message, flags) {
        var dataObj = getDataObj(message.data);  //get the data obj from the data message received    
        
        if(!dataObj.event || dataObj.event == "close" || dataObj.event == "error" || !events[dataObj.event])    
            //check whether the dataObj.event is not present, if any of them are protected  and if there is not callback sign with that value
            return; //if so, return
        
        for(cbIndex in events[dataObj.event])   //for each callback in the event array,
            events[dataObj.event][cbIndex].apply(this, dataObj.args); //fire with the args and its scope as "this" value        
    };
    
    this.on = function(event, callback) {   //sign callback event
        if(!events[event])  //if the event specified is still empty
            events[event] = []; // Inits the event name           
        events[event].push(callback);   //push the callback to the array        
    };

    this.clear = function(event, position) {
        if(!events[event])  //if the event is not signed, return
            return;
        if(!position)   //if the position is not specified, clear all
            events[event] = null;
        else
            events[event][position] = null; //clear the event callback position       
    };
    
    this.emit = function(event) {
        try {    
            //check true need for this verification due to if it disconnects it will be notifie
            if(client.readyState != client.OPEN) //check if the socket is opened
                throw "emitFailedSocketNotOpen";  //if not, throw an error socket not open       
            var args = [].slice.call(arguments) // slice without parameters copies all
            var dataObj = { event: args.shift(), args: args };  //create the data object with the data passed           
            wSocket.send(getDataStr(dataObj));    //send the data string generated from the the dataobj
        }
        catch(error) {
            if(events["error"])
                events["error"].call(this, error);   
        }       
    }; 
    
    this.close = function() {   //must verify what else is needed to close the connection
        //and verify if once this method is called, the onclose method is automatically called aswell or we need to force its call
        socket.close();     //close the socket connection 
    };
    
    function getDataStr(dataObj) {
        return JSON.stringify(dataObj);
    }

    function getDataObj(dataStr) {
        return JSON.parse(dataStr);
    }
}




//var connections = [];

//var sessions = [];


server.on("connection", function(socket) {
        
    var connId = "";
    var username = "";
    
    log("New connection.");
    
    socket.on("close", function() {
        //verify if an object has been created for this instance
        //if so, remove it;
        
        //got to verify what else should be discarted
        if(!connId)
            log("Temp client disconnected.");
    });
    
    socket.on("message", function(message) {
        
        var dataObj = getDataObj(message);
        
        switch(dataObj.type) {
                
            case "createSession":
                var newSession = createSession();
                log("New session created: " + newSession);
                log(lengthOf(connections) + " " + lengthOf(sessions));
                socket.send(getDataStr({type: "sessionCreated",data: [newSession]}));
            break;
                
            case "joinSession":
                //atribuite id only when joining sessions
                //generate timeout in case information is not send by connected client
                var sessionId = dataObj.data[0];
                var user = dataObj.data[1];
                
                if(!sessions[sessionId]) {
                    socket.send(getDataStr({type: "joinError", data: [sessionId]}));
                    log("Session join error");
                    socket.close();
                    return;   
                }
        
                //get session ref
                connSession = sessionId;
                username = user;
                /*  Create new connection ID    */
                connId = getId(10);    
                while(connections[connId])
                    connId = getId(10);        
                connections[connId] = socket;
                log("New client ID: " + username + " " + connId);
                /*  -------------------------   */
        
                /*          Join Session        */
                sessions[sessionId].members[connId] = socket;
            
                if(sessions[sessionId].hostId == "") {
                    sessions[sessionId].hostId = connId;
                    socket.send(getDataStr({type: "sessionJoined",data: ["", sessionId, connId]}));
                } else {
                    var hostId = sessions[sessionId].hostId;
                    socket.send(getDataStr({type: "sessionJoined",data: [hostId, sessionId, connId]}));
                    //got to have two separate emites due to in case of host it has to be empty and it is changed in the middle way
                }
        
                socket.on("close", function() {
            
                    if(sessions[sessionId].members[connId])
                        delete sessions[sessionId].members[connId];

                    if(connections[connId])
                        delete connections[connId];
            
                    log("Client " + connId + " disconnected.");
                    log("Session members: " + lengthOf(sessions[sessionId].members));
                    if(lengthOf(sessions[sessionId].members) == 0) {
                        log("Deleting empty session.");
                        delete sessions[sessionId];          
                    }
                    else if(sessions[sessionId].hostId == connId) {  //so you were the host, need to get a new
            
                        log("Host has disconnected. Electing new host...");    
                        var newHostId = electHost(sessionId);  
                        log("ID: " + newHostId + " is now the new host.");
            
                        log("Informing session members...");
                        log(lengthOf(sessions[sessionId].members));
                        for(memberId in sessions[sessionId].members) {
                            if(sessions[sessionId].hostId != memberId)
                                sessions[sessionId].members[memberId].send(getDataStr({type: "newHost", data: [newHostId]}));
                            else
                                sessions[sessionId].members[memberId].send(getDataStr({type: "newHost", data: [""]}));
                        }
            
                        log("All sessions has been informed.");

                        log("Informing host socket is closed");
			             sessions[sessionId].members[sessions[sessionId].hostId].send(getDataStr({type: "peerClosure", data: [connId]}));
                    } else {
                        log("Informing peers socket is closed");
			             sessions[sessionId].members[sessions[sessionId].hostId].send(getDataStr({type: "peerClosure", data: [connId]}));
                    }
                });
        
            break;
                
            case "peerData":
            /*          SESSION JOINED              */
            var destId = dataObj.data[0],
                sessionId = dataObj.data[1],
                data = dataObj.data[2];
                
            //maybe implement query id in the future
                try {
                    if(sessions[sessionId].members[destId])
                        sessions[sessionId].members[destId].send(getDataStr({type: "peerData", data: [connId,data]}));
                    else
                        socket.send(getDataStr({type: "peerDataError", data: [destId,data]}));
                } catch (error) {
                    
                }
            break;
        }
    });
    
});



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

function electHost(sessionId) {
    //for now, take the first client connected
    //in the future, choose based on statistic like better performance or activity
    
    for(memberId in sessions[sessionId].members){
        log("the first member is :" + memberId);
        sessions[sessionId].hostId = memberId;
        log("THE NEW HOST ISSS" + sessions[sessionId].hostId);
        return memberId;
    }
    
    
}





function lengthOf(obj) {
    var c=0;
    for(var fieldName in obj)
    {
        c++;
    }
    return c;
}

function getId(size)
{
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < size; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function getNumber(size)
{
    var text = "";
    var possible = "0123456789";

    for( var i=0; i < size; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}


function getWordId()
{
    if(wordList.length == 0)
        return null;
    
    var numberFirst = false;
    
    if(Math.random() > 0.5)
        numberFirst = true;
    
    var numberId = getNumber(3);
    
    var wIndex = (Math.random() * wordList.length).toFixed(0);  //got to fix 0 decimal places to use an index
    var wordId = wordList[wIndex];  
    
    wordId = wordId.substr(0,wordId.length-1);
    
    if(numberFirst)
        return numberId+wordId;
    else
        return wordId+numberId; 
}



    
function log(string){   //wrap for log info into the console
    cTime = new Date();
    console.log(cTime.getHours() + ":" + cTime.getMinutes() + ":" + cTime.getSeconds() + "\t" + string);
}


    
    