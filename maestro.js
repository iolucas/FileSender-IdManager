//--------------------MAESTRO--------------------//

//GET ALL EXTERNAL MODULES
var cfenv = require("cfenv"),   //get cloud foundry enviroment module
    http  = require("http"),    //get http module
    ws = require("ws"), //get the websocket module
    express = require("express"),   //get express module
    Wocket = require("../Wocket/Wocket");  //Import MaestroSocket class from MaestroSocket.js
    IdManager = require("./IdManager"), //get IdManager module
    Misc = require("./MiscFunctions"),  //Import MiscFunctions class from MiscFunctions.js 

//INIT MODULES
    appEnv = cfenv.getAppEnv(),   // get environmental information for this app
    app = express(),    //inits the express application
    httpServer = http.createServer(app),// create a server with a simple request handler
    wsServer = new ws.Server({ server: httpServer }), //'promotes' the httpserver to a websocket server
    idManager = new IdManager();  //inits new IdManager instance


//------------------------------------------------------------------------------------//

//SERVE HTTP FILES IN PUBLIC FOLDERS
app.use(express.static("public"));  
    
//CREATE NEW SESSION AND RESPOND GET/ WITH THE SESSION CREATED
app.get("/", function(req, res) {
    idManager.CreateSessionId(function(newSessionId) {
        log("New session created: " + newSessionId);
        res.redirect(newSessionId);             
    });
});

//CHECK IF THE REQUESTED GET/* PATH EXISTS, IF SO, RETURN INDEX, IF NOT, RETURN ERROR     
app.get("/*", function(req, res) {  
    //CHECK REQUESTED GET/*
    if(req.path.indexOf(".") == -1) //verify if the request has no dot, meaning that is session request
        idManager.CheckSessionId(req.path.substr(1), function(result) {    //verify if the requested if exists
            if(result)  //if session handler is found,
                res.sendFile(__dirname + "/public/session.html");   //respond session page
            else    //if not,
                res.send("Not Found");  //respond with error page
        });
    else    //if any dot is found, 
        res.end();  //finish the response
});
        
//INSTANCE TO HANDLE ERROR IN WSSERVER
wsServer.on("error", function(error) {  
    log("Error while operating WebSocketServer: " + error);    
});

//INSTANCE TO HANDLE CONNECTIONS IN WSSERVER
wsServer.on("connection", function(wSocket) {
    //once it is connected, set timeOut in case it do not connect to any session, be disconnected
    
    var client = new Wocket(wSocket);   //inits wocket instance with the just connected websocket
    
    client.ConnectionId = "";
    client.SessionId = "";
    client.Username = "";
    
    client.on("error", function(error) {   //instance to handle websocket errors
        log("Error while dealing with websocket: " + client.Username+"@" + client.ConnectionId + " -> " + error);       
    });
    
    client.on("JoinSession", function(sessionId, username) {
        //generate timeout in case information is not send by connected client, disconnect it

        if(client.Username != "") //if another request be made with a Username fullfilled, do nothing, return
            return;
        
        client.Username = username;    //gets the sent username
        
        //Executes the JoinSession method
        idManager.JoinSession(sessionId, client, function(hostResult) {
            //IF HOST RESULT GOES BAD
            if(!hostResult) {   
                log("Session Join Error: " + sessionId);   //log error in the screen
                client.emit("JoinError");    //emit joinError
                client.close(); //close client connection
                return;   //do nothing else, and return                     
            }           
            
            //IF HOST RESULT GOES GOOD
            
            //SET CONNECTED CLIENT EVENTS
            
            client.on("PeerData", function(destId, data) {
                
                idManager.GetClientHandler(client.SessionId,destId, function(destHandler) {
                //maybe implement query id in the future
                    try {
                        if(sessions[sessionId].members[destId])
                            sessions[sessionId].members[destId].send(getDataStr({type: "peerData", data: [connId,data]}));
                        else
                            socket.send(getDataStr({type: "peerDataError", data: [destId,data]}));
                    } catch (error) {}  
                });              
            });
            
            client.on("close", function() {
            
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
            
            /*FOR WHAT IS THIS?!?!?
            client.on("getIp", function() {
                client.emit("ip", wSocket.upgradeReq.connection.remoteAddress);   
                log("IPReq: " + wSocket.upgradeReq.connection.remoteAddress);       
            });*/
            
            //LOG NEW CLIENT INFO
            log("New client ID: " + client.Username + "@" + client.ConnectionId);
            
            //emit SessionJoiner with hostResult and joined sessionId   
            client.emit("SessionJoined", hostResult, sessionId);           
        });       
    });
});


//------------------------------------  EVERYTHING SET, START DB AND LISTEN HTTP AND WS CONNECTIONS -------------------------------
log("Initiating Maestro...");
console.log("");
log("Initiating IdManager...");

//Starts IdManager
idManager.Start("mongodb://localhost/test", function(error) { 
    if(error)
        throw error.toString();     //if some error while starting idManager, crash application   
    log("IdManager initiated.");
    
// start the server on the env port
    log("Starting HTTP and WS Server...");
    httpServer.listen(appEnv.port, function() {
        log("HTTP and WS Server initiated.");
        console.log("");
        log("Maestro running @ " + appEnv.url);
    });      
});  
    

//-------------------   Miscelaneous Functions    -------------------//


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
    
function log(string){   //wrap for log info into the console
    console.log(Misc.GetTimeStamp() + " " + string);
}


    
    