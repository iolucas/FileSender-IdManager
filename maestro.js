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
        idManager.GetSessionId(req.path.substr(1), function(error, sessionHandler) {    //verify if the requested if exists
            if(sessionHandler)  //if session handler is found,
                res.sendFile(__dirname + "/public/session.html");   //respond session page
            else    //if not,
                res.send("Not Found");  //respond with not found
        });
    else    //if any dot is found, 
        res.end();  //finish the response
});
        
//INSTANCE TO HANDLE ERROR IN WSSERVER
wsServer.on("error", function(error) {  
    log("Error while operating WebSocketServer: " + error);    
});





//EVERYTHING SET, START DB AND LISTEN HTTP AND WS CONNECTIONS
log("Initiating Maestro...");
console.log("");
log("Initiating IdManager...");

//Starts IdManager
idManager.Start("mongodb://localhost/test", function(error) { 
    if(error)
        throw error.toString();     //if some error while starting idManager, crash application   
    log("IdManager initiated.");
    
    idManager.SessionClear();
    
// start the server on the env port
    log("Starting HTTP and WS Server...");
    httpServer.listen(appEnv.port, function() {
        log("HTTP and WS Server initiated.");
        console.log("");
        log("Maestro running @ " + appEnv.url);
    });      
});  
    

   
    








//--------------------------------------- SETUP MADE, NOW WHAT REALLY MATTERS :) -----------------------------------------------


//var connections = [];   //array to store connection objects

//var sessions = [];  //array to store session objects

/*

wsServer.on("connection", function(wSocket) {   //websocket connection event handler
    
    var client = new Wocket(wSocket);   //inits wocket instance with the just connected websocket
    
    client.on("idRequest", function() {
            
        
        
    });
    
    
    
    
    
    
    client.on("error", function(error) {   //instance to handle websocket errors
        log("Error while dealing new websocket: " + error);       
    });
    
    client.on("getIp", function() {
        client.emit("ip", wSocket.upgradeReq.connection.remoteAddress);   
        log("IPReq: " + wSocket.upgradeReq.connection.remoteAddress);
        
    });
    
    
    
    
    
    var connId = "";
    var username = "";
    
    log("New connection.");
    
    


    client.on("close", function(code, message) {   //instance to handle websocket errors
        //verify if an object has been created for this instance
        //if so, remove it;
        
        //got to verify what else should be discarted
        if(!connId)
            log("Temp client disconnected.");        
    });

    client.on("createSession", function() {
        var newSession = createSession();
        log("New session created: " + newSession);
        log(lengthOf(connections) + " " + lengthOf(sessions));
        client.emit("sessionCreated", newSession);
    });
               
    client.on("joinSession", function(sessionId, user) {
        //atribuite id only when joining sessions
        //generate timeout in case information is not send by connected client

        if(!sessions[sessionId]) {           
            client.emit("joinError", sessionId);
            log("Session join error");
            client.close();
            return;   
        }
        
        //get session ref
        connSession = sessionId;
        username = user;
        //  Create new connection ID    //
        connId = getId(10);    
        while(connections[connId])
        connId = getId(10);        
        connections[connId] = socket;
        log("New client ID: " + username + " " + connId);
        //  -------------------------   //
        
        //          Join Session        //
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
    });
    
    client.on("peerData", function(destId, sessionId, data) {
        //maybe implement query id in the future
        try {
            if(sessions[sessionId].members[destId])
                sessions[sessionId].members[destId].send(getDataStr({type: "peerData", data: [connId,data]}));
            else
                socket.send(getDataStr({type: "peerDataError", data: [destId,data]}));
        } catch (error) {
                    
        }
    });
});

function electHost(sessionId) {
    //for now, take the first client connected
    //in the future, choose based on statistic like better performance or activity
    
    for(memberId in sessions[sessionId].members){
        log("the first member is :" + memberId);
        sessions[sessionId].hostId = memberId;
        log("THE NEW HOST ISSS" + sessions[sessionId].hostId);
        return memberId;
    }
    
    
}*/
    
function log(string){   //wrap for log info into the console
    console.log(Misc.GetTimeStamp() + " " + string);
}


    
    