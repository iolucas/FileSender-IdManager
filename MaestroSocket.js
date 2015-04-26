module.exports = MaestroSocket;

function MaestroSocket(wSocket) {   //MaestroSocket class to handle websocket information
    
    var self = this;    //holds its own ref
    
    var events = [];    //events array to store callbacks
    
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
            //if(client.readyState != client.OPEN) //check if the socket is opened
                //throw "emitFailedSocketNotOpen";  //if not, throw an error socket not open       
            var args = [].slice.call(arguments) // slice without parameters copies all
            var dataObj = { event: args.shift(), args: args };  //create the data object with the data passed           
            wSocket.send(getDataStr(dataObj));    //send the data string generated from the the dataobj
        }
        catch(error) {
            throwError(error);  //throw error methods  
        }       
    }; 
    
    wSocket.onerror = function(error) {
        throwError(error);  //throw error methods 
    };
    
    wSocket.onclose = function(code, message) {
        if(events["close"])
            for(cbIndex in events["close"])   //for each callback in the event array,
                events["close"][cbIndex].call(this, code, message); //fire with the args and its scope as "this" value    
    };
    
    wSocket.onmessage = function(message, flags) {
        var dataObj = getDataObj(message.data);  //get the data obj from the data message received    
        
        if(!dataObj.event || dataObj.event == "close" || dataObj.event == "error" || !events[dataObj.event])    
            //verifies whether the dataObj.event is not present, if any of them are protected  and if there is not callback sign with that value
            return; //if so, return
        
        for(cbIndex in events[dataObj.event])   //for each callback in the event array,
            events[dataObj.event][cbIndex].apply(this, dataObj.args); //fire with the args and its scope as "this" value        
    };   

    
    this.close = function() {   //must verify what else is needed to close the connection
        //and verify if once this method is called, the onclose method is automatically called aswell or we need to force its call
        events = null;  //clear events array        
        socket.close(4, "SERVERDISC");     //close the socket connection 
    };
    
    function throwError(error) {
        if(events["error"])
            for(cbIndex in events["error"])   //for each callback in the event array,
                events["error"][cbIndex].call(this, error); //fire with the args and its scope as "this" value         
    }
    
    function getDataStr(dataObj) {
        return JSON.stringify(dataObj);
    }

    function getDataObj(dataStr) {
        return JSON.parse(dataStr);
    }
}