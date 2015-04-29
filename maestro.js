//--------------------MAESTRO--------------------//


//Init main modules

var express = require("express"),   //get express module
    http  = require("http"),    //get http module
    cfenv = require("cfenv"),   //get cloud foundry enviroment module
    ws = require("ws"), //get the websocket module
    //(MAYBE THIS WILL NOT BE NEED) fs = require("fs"), //get the filesystem module
    Wocket = require("../Wocket/Wocket"),  //Import MaestroSocket class from MaestroSocket.js
    Misc = require("./MiscFunctions"),  //Import MiscFunctions class from MiscFunctions.js
    wordList = require("./wordList");    
    
    app = express(),    //inits the express application

// get environmental information for this app
    appEnv   = cfenv.getAppEnv(),

// create a server with a simple request handler
    httpServer = http.createServer(app),
    
//'promotes' the httpserver to a websocket server
    wsServer = new ws.Server({ server: httpServer }); 

// start the server on the calculated port and host
httpServer.listen(appEnv.port, function() {
    log("Maestro starting on " + appEnv.url);
});

//serve files at public directory
app.use(express.static("public"));  

app.get("/", function(req, res) {   //respond the request for index.html
    //Create session id at main HTTP get
    var newSession = createSession();
    log("New session created: " + newSession);
    res.redirect(newSession);   
});

app.get("/*", function(req, res) {   //respond the request for server/maestrostatus
    res.sendFile(__dirname + "/public/session.html");
});

wsServer.on("error", function(error) {  //instance to handle websocket server errors
    log("Error while operating WebSocketServer: " + error);    
});

//--------------------------------------- SETUP MADE, NOW WHAT REALLY MATTERS :) -----------------------------------------------


var connections = [];   //array to store connection objects

var sessions = [];  //array to store session objects

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



    
function log(string){   //wrap for log info into the console
    console.log(Misc.GetTimeStamp() + " " + string);
}


    
    