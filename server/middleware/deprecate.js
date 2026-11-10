// Adds the standard "this is going away" headers to a response.
//   Deprecation: true                       this version is deprecated
//   Sunset: <date>                          the day it stops working
//   Link: <successor>; rel="successor-version"   where to go instead
function deprecated({ sunset, successor }) {
  return (req, res, next) => {
    res.set('Deprecation', 'true');
    res.set('Sunset', new Date(sunset).toUTCString());
    res.set('Link', `<${successor}>; rel="successor-version"`);
    next();
  };
}

module.exports = { deprecated };
