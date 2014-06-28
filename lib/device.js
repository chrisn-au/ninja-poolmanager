var stream = require('stream')
  , util = require('util');

// Give our module a stream interface
util.inherits(Device,stream);

var mydate = require('date-utils');
var SunCalc = require('suncalc');

 // Export it
module.exports=Device;

datastatus = false;


/**
 * Creates a new Device Object
 *
 * @property {Boolean} readable Whether the device emits data
 * @property {Boolean} writable Whether the data can be actuated
 *
 * @property {Number} G - the channel of this device
 * @property {Number} V - the vendor ID of this device
 * @property {Number} D - the device ID of this device
 *
 * @property {Function} write Called when data is received from the cloud
 *
 * @fires data - Emit this when you wish to send data to the cloud
 */
function Device(config, app) {

  var self = this;

  // This device will emit data
  this.readable = true;
  // This device can be actuated
  this.writeable = false;
  console.log(" Name " + config.name);

  this.G = "ninjapoolmanager"+config.name; // G is a string a represents the channel
  this.V = 0; // 0 is Ninja Blocks' device list
  this.D = 244; // 2000 is a generic Ninja Blocks sandbox device
  this.name = config.name + " Pool Manager ";
  this.currentMode = 'OFF';
  self.config = config;
  calcTimes();

  function updateNinja(state)
  {
    app.log.info(config.name + ': updating state to: ' + state)
    self.emit('data',  state );
    self.currentMode = state;
  }
  
 
  this._interval = setInterval(function() {
             console.log(self.currentMode); 
             self.emit('data', self.currentMode);
  },60000);

   function calcTimes()
   {
        setTimes(setpoolControl(self.config));
   }     
        
   function setTimes(times)
   {
        var now = new Date(); 
        times.forEach(function (lc) {
           if (new Date(lc.start).isAfter(now)) {
                app.log.info(': scheduling trigger on: ' + lc.start)  
                setTimeout(updateNinja, lc.start.getTime() - now.getTime()  , "ON")}
           if (new Date(lc.stop).isAfter(now)) {
                 app.log.info(': scheduling trigger off: ' + lc.stop)
                setTimeout(updateNinja, lc.stop.getTime() - now.getTime() , "OFF")} 
           if (now.between(lc.start, lc.stop)){
               updateNinja("ON")        
               app.log.info('It should be on so make it so : ' + lc.stop) } 
        })
        
       var tomorrow = Date.tomorrow().addMinutes(10);
       app.log.info(': scheduling recalc for: ' + tomorrow)
       setTimeout(calcTimes, now.getSecondsBetween(tomorrow) * 1000);        
    }             
   
 // wait 10secs to ensure that device is already registered before sending data
    setTimeout(function() {
      updateNinja(self.currentMode);
    }, 10000);
    
    
    function setpoolControl(cf)
    {
      
     var positions = _buildPositions(Date.today(), cf.latitude, cf.longitude, 60);
      
     var solarangles = _getAngles(positions,cf.solar);
    
     var solartimes = _getSolarTimes(solarangles, positions)
      
     var season = _getSeason(cf)
       
     var times = _getTimes(solartimes, season, cf.filterstart)
     
     return times
     
   }
  
  function _getTimes(solartimes, season, filterstart)
  {
  
       var filtertime = season.filter*60*60*1000;
       var warmtime = season.warm*60*60*1000;
       var filter = new Array();
       
       var solarRuntime = solartimes.offtime - solartimes.ontime; // 
       var solarmid = solartimes.ontime + (0.5 * solarRuntime);
       
       if (warmtime == 0) {   
              var warm_time = _getfilter(filtertime, solartimes.offtime.addMilliseconds(30*60*1000))
              filter.push(warm_time)
       }
       else { // we only want a potion of the solar time so take max
             var solarmid = solartimes.ontime + (0.5 * solarRuntime);
             var warm_period = _getfilter(warmtime,solarmid - (0.5 * warmtime));
             filter.push(_getfilter(warmtime,solarmid - (0.5 * warmtime)));
             if (filtertime > warmtime){ 
                    filter.push(_getfilter(filtertime-warmtime, warm_period.off.addMilliseconds(30*60*1000)))
             }               
       }           
       return filter
  }

  function _getfilter(filter_time, filter_start_time)
  {                                  
              var filter_end = filter_start_time.clone().addMilliseconds(filter_time);
              var filter = { "start" : filter_start_time, "stop" : filter_end }
              return filter 
  }     
  
  function _getSeason(config)
  {    
      var seasons = config.seasons
      var currentseason = config.currentSeason
      var season
      seasons.forEach(function (s) {  
          if(s.name == currentseason) { season = s }
      })
      return season;      
  }
       
 function _getSolarTimes(angles, pos)
 {
     var on =  angles.on * Math.PI/180;   // degrees to radians
     var off = angles.off * (Math.PI/180) // degrees to radians
     
     var onfound = false;
     var offfound = false;
     var ontime;
     var offtime;
     
     pos.sort(function(a,b){
           return a.azimuth - b.azimuth
     })
       
     for (i = 0; i < 60*60*24; i++ )
     {
          if (pos[i].azimuth > on && !onfound) { ontime = pos[i].time; onfound = true}
          if (pos[i].azimuth > off && !offfound) { offtime = pos[i].time; offfound = true}
          if (onfound && offfound ) {break;}     
     }
     return { "ontime" : ontime , "offtime" : offtime }
 }
 
 
 function _getAngles(pos,solarangles)
 {
      var on =  0;
      var off = 0;
 
       pos.sort(function(a,b){
            return a.altitude - b.altitude
       })
        
       var maxaltitude = pos[pos.length-1].altitude;
       
       
            
       for (i = solarangles.length-1 ; i >= 0 ; i--)
      {
           if( maxaltitude > solarangles[i].altitude )
            {
                on = solarangles[i].on;
                off = solarangles[i].off;
                break; 
            }       
      }  
  
     return { "on" : on , "off" : off , "maxaltitude" : maxaltitude }
 
 }
 function _buildPositions(midnight, latitude,longitude, frequency)
 {
        
     var positions = [];
       
     for (i = 0; i < frequency*60*24; i++ )
     {
           temp = SunCalc.getPosition(midnight, latitude , longitude);
           positions[i] = {time : midnight.clone() , azimuth :temp.azimuth , altitude : temp.altitude };
           midnight = midnight.addMilliseconds(frequency/60*1000)      
     }
      positions.sort(function(a, b){
           return a.azimuth - b.azimuth
      })
      return positions;
 }
 
  
  }
 