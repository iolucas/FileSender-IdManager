//Miscelaneou Functions

module.exports = new Misc();

function Misc() {
    
    //Generate Random AlphaNumeric Id with the desired size
    this.GetAlphaNumId = function(size) {   
        var text = "";
        var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
        for( var i=0; i < size; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }
    
    //Generate Random Numeric Id with the desired size
    this.GetNumId = function(size) {   
        var text = "";
        var possible = "0123456789";
        for( var i=0; i < size; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }   
    
    //Generate Random Alphabetic Id with the desired size
    this.GetAlphaNumId = function(size) {   
        var text = "";
        var possible = "abcdefghijklmnopqrstuvwxyz";
        for( var i=0; i < size; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }
    
    //Return a text with the current timestamp
    this.GetTimeStamp = function() {
        var cTime = new Date();
            //return (cTime.getHours()>=10?cTime.getHours():"0"+cTime.getHours()) + ":" + cTime.getMinutes() + ":" + cTime.getSeconds();
        return (cTime.getHours()>=10?cTime.getHours():"0"+cTime.getHours()) + ":" + (cTime.getMinutes()>=10?cTime.getMinutes():"0"+cTime.getMinutes()) + ":" + (cTime.getSeconds()>=10?cTime.getSeconds():"0"+cTime.getSeconds());   
    }
}