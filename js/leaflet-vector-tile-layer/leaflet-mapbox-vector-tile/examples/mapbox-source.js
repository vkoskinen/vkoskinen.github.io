var debug = {};

var map = L.map('map').setView([47.651737, -122.30754], 16); // University of Washington

L.tileLayer('https://a.tiles.mapbox.com/v3/cugos.jolef8gc/{z}/{x}/{y}.png', {
  maxZoom: 18
}).addTo(map);


var mvtSource = new L.TileLayer.MVTSource({
  // alternative mapbox web service source, gives lots of 404 errors as mapbox likes to do...
  url: "https://a.tiles.mapbox.com/v4/nicholashallahan.43cc7605/{z}/{x}/{y}.vector.pbf?access_token=pk.eyJ1IjoibmljaG9sYXNoYWxsYWhhbiIsImEiOiJ5YWxaRUY0In0.qLtNgKJKXvhm7j5u6ZvDDw",
//  url: "https://a.tiles.mapbox.com/v4/mapbox.mapbox-terrain-v1,mapbox.mapbox-streets-v6-dev/{z}/{x}/{y}.vector.pbf?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6IlhHVkZmaW8ifQ.hAMX5hSW-QnTeRCMAy9A8Q",
  debug: false,
  clickableLayers: ['building'],
  getIDForLayerFeature: function(feature) {
    return feature.id;
  },

  /**
   * The filter function gets called when iterating though each vector tile feature (vtf). You have access
   * to every property associated with a given feature (the feature, and the layer). You can also filter
   * based of the context (each tile that the feature is drawn onto).
   *
   * Returning false skips over the feature and it is not drawn.
   *
   * @param feature
   * @returns {boolean}
   */
  filter: function(feature, context) {
    return true;
  },

  style: function (feature) {
    var style = {};

    var type = feature.type;
    switch (type) {
      case 1: //'Point'
        style.color = 'rgba(49,79,79,0.2)';
        style.radius = 5;
        style.selected = {
          color: 'rgba(255,255,0,0.5)',
          radius: 6
        };
        break;
      case 2: //'LineString'
        style.color = 'rgba(161,217,155,0.8)';
        style.size = 3;
        style.selected = {
          color: 'rgba(255,25,0,0.5)',
          size: 4
        };
        break;
      case 3: //'Polygon'
        style.color = 'rgba(149,139,255,0.4)';
        style.outline = {
          color: 'rgb(20,20,20)',
          size: 1
        };
        style.selected = {
          color: 'rgba(255,140,0,0.3)',
          outline: {
            color: 'rgba(255,140,0,1)',
            size: 2
          }
        };
        break;
    }

    if (feature.layer.name === 'poi_label') {
      style.staticLabel = function() {
        var style = {
          html: feature.properties.name,
          iconSize: [125,30],
          cssClass: 'label-icon-text'
        };
        return style;
      };
    }

    return style;
  },

  /**
   * When we want to link events between layers, like clicking on a label and a
   * corresponding polygon freature, this will return the corresponding mapping
   * between layers. This provides knowledge of which other feature a given feature
   * is linked to.
   *
   * @param layerName  the layer we want to know the linked layer from
   * @returns {string} returns corresponding linked layer
   */
  layerLink: function(layerName) {
    if (layerName.indexOf('_label') > -1) {
      return layerName.replace('_label','');
    }
    return layerName + '_label';
  },

  /**
   * Callback function that fires whenever a clickable feature is clicked on the map.
   * @param evt
   */
  onClick: function(evt) {
    console.log('click');
  }

});
debug.mvtSource = mvtSource;

//Add layer
map.addLayer(mvtSource);
