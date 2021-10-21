var turf = require('@turf/turf')


module.exports = class Geo {
  static getDistanceFromLatLonInMeters(lng1, lat1, lng2, lat2) {
    var line = turf.lineString([[lng1, lat1], [lng2, lat2]]);
    return turf.length(line, { 'units': 'meters' });
  }


  static deg2rad(deg) {
    return deg * (Math.PI / 180)
  }

  static metersToPixelsAtMaxZoom(meters, latitude) {
    return meters / 0.075 / Math.cos(latitude * Math.PI / 180)
  }

  static calculateRasteDimensionForBboxInZoom = function (bbox = [], zoom = 1, tileSize = 512) {
    // z3 - longBR - 450
    // z4 - longBR - 450
    // zz - longBR - 450
    //                                           ▾ x=lng2=bbox[2]
    //                    middleLng2 ▾           |
    //                   ------------•-----------• ◀︎ y=lat2=bbox[3]
    //                   |                       |
    //                   |                       |
    //                   |                       |
    //        middleLat1 •                       • middleLat2
    //      ()           |                       |
    //                   |                       |
    //                   |                       |
    // y=lat1=bbox[1]  ‣ •-----------•------------
    //                   |           ▴ middleLng1 
    //                   | 
    //                   ▴ x=lng1=bbox[0]

    const lng1 = bbox[0]
    const lat1 = bbox[1]
    const lng2 = bbox[2]
    const lat2 = bbox[3]

    const middleLng = lng1 + ((lng2 - lng1) / 2)
    const middleLat = lat1 + ((lat2 - lat1) / 2)


    // var lineHorizontal = turf.lineString([ [lng1, lat1], [lng2, lat1] ]);
    // var lineVertical = turf.lineString([ [lng1, lat1], [lng1, lat2] ]);
    // var lineDiagonal = turf.lineString([ [lng1, lat1], [lng2, lat2] ]);
    // var horizontalDistance= turf.length(lineHorizontal,{'units':'meters'});
    // var verticalDistance= turf.length(lineVertical,{'units':'meters'});
    // var diagonalDistance= turf.length(lineDiagonal,{'units':'meters'});

    // console.log('horizontal '+ horizontalDistance + 'm x vertical: ' + verticalDistance + 'm x diagonal: ' +diagonalDistance+'m')

    //https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Resolution_and_Scale
    //https://wiki.openstreetmap.org/wiki/Zoom_levels

    // const TilesInZoom = [
    // // convert to pixel in a zoom ref
    // var withPixelForZoom( )

    // }


    var top_tile    = lat2tile(lat2, zoom); // eg.lat2tile(34.422, 9);
    var left_tile   = lon2tile(lng1, zoom);
    var bottom_tile = lat2tile(lat1, zoom);
    var right_tile  = lon2tile(lng2, zoom);
    var width       = Math.abs(left_tile - right_tile) + 1;
    var height      = Math.abs(top_tile - bottom_tile) + 1;


    //each tile has a 512 px im mapbox
    return { width: width*tileSize, height:height*tileSize };


  // total tiles
  var total_tiles = width * height; // -> eg. 377


  }
}


function lon2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
function lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }
function tile2long(x, z) {
  return (x / Math.pow(2, z) * 360 - 180);
}
function tile2lat(y, z) {
  var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
  return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
}

const MeterInPixel = [
  156412,	//zoom 0
  78206,
  39103,
  19551,
  9776,
  4888,
  2444,
  1222,
  610.984,
  305.492,
  152.746,
  76.373,
  38.187,
  19.093,
  9.547,
  4.773,
  2.387,
  1.193,
  0.596,
  0.298,
  0.149 // zoom 20
]
