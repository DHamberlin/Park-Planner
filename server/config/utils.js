
const moment = require('moment');
const Themeparks = require('themeparks');
const async = require('async');
const _ = require('lodash');

const Rides = require('../collections/rides');
const Ride = require('../models/rideModel');
const Parks = require('../collections/parks');
const Park = require('../models/parkModel');
const RideWaitTimes = require('../collections/rideWaitTimes');
const RideWaitTime = require('../models/rideWaitTimeModel');
// const WeatherEntries = require('../collections/WeatherEntries');
const Weather = require('../models/weatherModel');

let utils = {
  reduceTimeData : modelArray => {
    /* accepts arrays of RideWaitTimes table models */
    return modelArray.reduce((acc, model, index) => {
      let atts = model.attributes;
      if(atts.isActive) {
        if(acc[atts.hour]) {
          acc[atts.hour].push(atts.waitTime);
          // console.log(acc);
          return acc;
        } else {
          acc[atts.hour] = [atts.waitTime];
          // console.log(acc);
          return acc;
        }
      } else {
        if(acc[atts.hour]) {
          acc[atts.hour].push(null);
          // console.log(acc);

          return acc;
        } else {
          acc[atts.hour] = [null];
          // console.log(acc);

          return acc;
        }
      }
    }, {});
  },

  gatherParks : () => {
    return Parks.fetch()
      .then(parks => {
        return parks.models;
      });
  },

  gatherWeather : location => {
    return Weather.where({'location' : JSON.stringify(location)}).fetch()
      .then(weather => {
        return weather;
      });
  },

  gatherWaitTimes : parkName => {
    return (new Themeparks.Parks[parkName]().GetWaitTimes()
      .then(rides => {
        return rides;
      })
    );
  },

  gatherRide : apiId => {
    return Ride.where({'apiId' : apiId}).fetch()
      .then(ride => {
        // console.log(ride.attributes);
        return ride;
      });
  },

  // optimize : (remainingRides, time={'total' : 0, 'current' :'8:00 AM' }, route=[]) => {
  //   if(remainingRides.length === 1) {
  //     route.push(remainingRides[0]);
  //     time.total = time.total + remainingRides[0].timeData[time.current];
  //     time.current = time.current + remainingRides[0].timeData[time.current];
  //     possibilities.push({
  //       'route' : route,
  //       'stats' : time,
  //     });
  //   } else {
  //     remainingRides.forEach((ride, index) => {
  //       time.total = time.total + ride.timeData[time.current] + 20;
  //       time.current = time.current + ride.timeData[time.current] + 20;
  //       route.push(ride);
  //       remainingRides.splice(index, 1);
  //       utils.optimize(remainingRides, time, route);
  //     });
  //   }
  // },

  findRoutes: (waitTimes, ridesLeft, currentMoment, possibilities, route = [], totalWait = 0) => {
    // console.log('here are the rides left: ', ridesLeft);
    ridesLeft = ridesLeft.slice();
    route = route.slice();
    const id = waitTimes.rideData.get('id')

    // find waitTime closes to currentMoment
    const waitTime = _.reduce(waitTimes.timeData, (result, value, key) => {
      const diffFromCurrent = Math.abs(moment(key, 'hh:mm a') - currentMoment);
      if (diffFromCurrent < result.diffFromCurrent && value > 0) {
        return { diffFromCurrent, minutes: value }
      }
      return result;
    }, { diffFromCurrent: Infinity });

    // set object props, new currTime, totalWait
    const ride = {
      id,
      waitTime,
      rideTime: currentMoment.format('hh:mm a')
      // rideName:
    };

    // update trackers
    currentMoment = currentMoment.add(waitTime.minutes + 15, 'm');
    totalWait += waitTime.minutes;
    // console.log('here\'s a ride: ',ride);
    route.push(ride);
    _.remove(ridesLeft, r => r === waitTimes);

    if (ridesLeft.length) {
      // console.log('HELLO!!!!')
      ridesLeft.forEach(ride => {
        utils.findRoutes(ride, ridesLeft, currentMoment, possibilities, route, totalWait);
      })
    } else {
      possibilities.push({ route, totalWait });
    }
  }

};

module.exports = utils;
