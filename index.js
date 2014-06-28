var Device = require('./lib/device')
  , util = require('util')
  , stream = require('stream');


// Give our module a stream interface
util.inherits(myModule,stream);

/**
 * Called when our client starts up
 * @constructor
 *
 * @param  {Object} opts Saved/default module configuration
 * @param  {Object} app  The app event emitter
 * @param  {String} app.id The client serial number
 *
 * @property  {Function} save When called will save the contents of `opts`
 * @property  {Function} config Will be called when config data is received from the cloud
 *
 * @fires register - Emit this when you wish to register a device (see Device)
 * @fires config - Emit this when you wish to send config data back to the cloud
 */
function myModule(opts,app) {

  var self = this;
  this.first = true;
  this.opts = opts;
  
//  opts.Locations = opts.Locations || defaultConfig();
//  self.save();

  opts.Locations =  defaultConfig();

  app.once('client::up',function(){

      // The client is now connected to the cloud
        self.emit('register', new Device(opts.Locations, app)); 
        self.save();     
  });
};

/**
 * Called when config data is received from the cloud
 * @param  {Object} config Configuration data
 */
myModule.prototype.config = function(config) {

};

// Export it
module.exports = myModule;

 function defaultConfig()
{
   var summer = { "name" : "Summer" , "filter" : 6 , "warm" : 6 } 
   var winter = { "name" : "Winter" , "filter" : 4 , "warm" : 0 }
 
   var min = { "altitude" : 0 , "on" : -160 , "off" : 160 } 
   var early = { "altitude" : 0.50 , "on" : -155 , "off" : 158 }
   var mid =  { "altitude" : 1 , "on" : -150 , "off" : 150 }
   var late = { "altitude" : 1.2 , "on" : -140 , "off" : 140 }
   var max = { "altitude" : Math.PI/2 , "on" : -120 , "off" : 130 }

   
   var seasons = new Array(summer,winter)
   var solar = new Array(min,early,mid,late,max) 
   var top = { "name" : "NinjaHQ", "latitude" : -33.8600, "longitude" : 151.211 , 
               "currentSeason" : "Winter", "seasons" : seasons , "solar" : solar ,
               "filterstart" : 15 }
  
   return top;
   
 }
