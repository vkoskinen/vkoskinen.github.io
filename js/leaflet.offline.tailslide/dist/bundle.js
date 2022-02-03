(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('leaflet'), require('idb')) :
  typeof define === 'function' && define.amd ? define(['exports', 'leaflet', 'idb'], factory) :
  (global = global || self, factory(global.LeafletOffline = {}, global.L, global.idb));
}(this, (function (exports, L, idb) { 'use strict';

  L = L && Object.prototype.hasOwnProperty.call(L, 'default') ? L['default'] : L;

  /**
   * Api methods used in control and layer
   * For advanced usage
   *
   * @module TileManager
   *
   */

  var tileStoreName = 'tileStore';
  var urlTemplateIndex = 'urlTemplate';

  var dbPromise = idb.openDB('leaflet.offline', 2, {
    upgrade: function upgrade(db, oldVersion) {
      idb.deleteDB('leaflet_offline');
      idb.deleteDB('leaflet_offline_areas');

      if (oldVersion < 1) {
        var tileStore = db.createObjectStore(tileStoreName, {
          keyPath: 'key',
        });
        tileStore.createIndex(urlTemplateIndex, 'urlTemplate');
        tileStore.createIndex('z', 'z');
      }
    },
  });

  /**
   *
   * @example
   * ```js
   * import { getStorageLength } from 'leaflet.offline'
   * getStorageLength().then(i => console.log(i + 'tiles in storage'))
   * ```
   * @typedef {Object} tileInfo
   * @property {string} key storage key
   * @property {string} url resolved url
   * @property {string} urlTemplate orig url, used to find tiles per layer
   * @property {string} x left point of tile
   * @property {string} y top point coord of tile
   * @property {string} z tile zoomlevel
   * @return {Promise<Number>} get number of store tiles
   */
  async function getStorageLength() {
    return (await dbPromise).count(tileStoreName);
  }

  /**
   * @example
   * ```js
   * import { getStorageInfo } from 'leaflet.offline'
   * getStorageInfo('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
   * ```
   * @param {string} urlTemplate
   *
   * @return {Promise<tileInfo[]>}
   */
  async function getStorageInfo(urlTemplate) {
    var range = IDBKeyRange.only(urlTemplate);
    return (await dbPromise).getAllFromIndex(
      tileStoreName,
      urlTemplateIndex,
      range
    );
  }

  /**
   * @example
   * ```js
   * import { downloadTile } from 'leaflet.offline'
   * downloadTile(tileInfo.url).then(blob => saveTile(tileInfo, blob))
   * ```
   * @param {string} tileUrl
   * @return {Promise<blob>}
   */
  async function downloadTile(tileUrl) {
    return fetch(tileUrl).then(function (response) {
      if (!response.ok) {
        throw new Error(("Request failed with status " + (response.statusText)));
      }
      return response.blob();
    });
  }
  /**
   * TODO validate tileinfo props?
   *
   * @example
   * ```js
   * saveTile(tileInfo, blob).then(() => console.log(`saved tile from ${tileInfo.url}`))
   * ```
   *
   * @param {tileInfo} tileInfo
   * @param {Blob} blob
   *
   * @return {Promise}
   */
  async function saveTile(tileInfo, blob) {
    // console.log('Saving Tile'); // eslint-disable-line no-console
    // console.log(tileInfo); // eslint-disable-line no-console
    return (await dbPromise).put(tileStoreName, Object.assign({}, {blob: blob},
      tileInfo));
  }

  /**
   *
   * @param {string} urlTemplate
   * @param {object} data  x, y, z, s
   * @param {string} data.s subdomain
   *
   * @returns {string}
   */
  function getTileUrl(urlTemplate, data) {
    return L.Util.template(urlTemplate, Object.assign({}, data,
      {r: L.Browser.retina ? '@2x' : ''}));
  }
  /**
   * @example
   * const p1 = L.point(10, 10)
   * const p2 = L.point(40, 60)
   * getTileUrls(layer, L.bounds(p1,p2), 12)
   *
   * @param {object} layer leaflet tilelayer
   * @param {object} bounds L.bounds
   * @param {number} zoom zoomlevel 0-19
   *
   * @return {Array.<tileInfo>}
   */
  function getTileUrls(layer, bounds, zoom) {
    var tiles = [];
    var tileBounds = L.bounds(
      bounds.min.divideBy(layer.getTileSize().x).floor(),
      bounds.max.divideBy(layer.getTileSize().x).floor()
    );
    for (var j = tileBounds.min.y; j <= tileBounds.max.y; j += 1) {
      for (var i = tileBounds.min.x; i <= tileBounds.max.x; i += 1) {
        var tilePoint = new L.Point(i, j);
        var data = Object.assign({}, layer.options, {x: i, y: j, z: zoom});
        tiles.push({
          key: getTileUrl(layer._url, Object.assign({}, data,
            {s: layer.options.subdomains['0']})),
          url: getTileUrl(layer._url, Object.assign({}, data,
            {s: layer._getSubdomain(tilePoint)})),
          z: zoom,
          x: i,
          y: j,
          urlTemplate: layer._url,
        });
      }
    }

    return tiles;
  }
  /**
   * Get a geojson of tiles from one resource
   *
   * @example
   * const urlTemplate = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
   * const getGeoJsonData = () => LeafletOffline.getStorageInfo(urlTemplate)
   *  .then((data) => LeafletOffline.getStoredTilesAsJson(baseLayer, data));
   *
   * getGeoJsonData().then((geojson) => {
   *   storageLayer = L.geoJSON(geojson).bindPopup(
   *     (clickedLayer) => clickedLayer.feature.properties.key,
   *   );
   * });
   *
   * @param {object} layer
   * @param {tileInfo[]} tiles
   *
   * @return {object} geojson
   */
  function getStoredTilesAsJson(layer, tiles) {
    var featureCollection = {
      type: 'FeatureCollection',
      features: [],
    };
    for (var i = 0; i < tiles.length; i += 1) {
      var topLeftPoint = new L.Point(
        tiles[i].x * layer.getTileSize().x,
        tiles[i].y * layer.getTileSize().y
      );
      var bottomRightPoint = new L.Point(
        topLeftPoint.x + layer.getTileSize().x,
        topLeftPoint.y + layer.getTileSize().y
      );

      var topLeftlatlng = L.CRS.EPSG3857.pointToLatLng(
        topLeftPoint,
        tiles[i].z
      );
      var botRightlatlng = L.CRS.EPSG3857.pointToLatLng(
        bottomRightPoint,
        tiles[i].z
      );
      featureCollection.features.push({
        type: 'Feature',
        properties: tiles[i],
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [topLeftlatlng.lng, topLeftlatlng.lat],
              [botRightlatlng.lng, topLeftlatlng.lat],
              [botRightlatlng.lng, botRightlatlng.lat],
              [topLeftlatlng.lng, botRightlatlng.lat],
              [topLeftlatlng.lng, topLeftlatlng.lat] ] ],
        },
      });
    }

    return featureCollection;
  }

  /**
   * Remove tile by key
   * @param {string} key
   *
   * @returns {Promise}
   */
  async function removeTile(key) {
    return (await dbPromise).delete(tileStoreName, key);
  }

  /**
   * Get single tile blob
   *
   * @param {string} key
   *
   * @returns {Promise<Blob>}
   */
  async function getTile(key) {
    return (await dbPromise)
      .get(tileStoreName, key)
      .then(function (result) { return (result === undefined ? undefined : result.blob); });
  }

  /**
   * Remove everything
   *
   * @return {Promise}
   */
  async function truncate() {
    return (await dbPromise).clear(tileStoreName);
  }

  /**
   * A layer that uses stored tiles when available. Falls back to online.
   *
   * @class TileLayerOffline
   * @hideconstructor
   * @example
   * const tileLayerOffline = L.tileLayer
   * .offline('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
   *   attribution: 'Map data {attribution.OpenStreetMap}',
   *   subdomains: 'abc',
   *   minZoom: 13,
   *   saveOnLoad: true,
   *   downsample: true
   * })
   * .addTo(map);
   */
  var TileLayerOffline = L.TileLayer.extend(
    /** @lends  TileLayerOffline */ {
      /**
       * Create tile HTMLElement
       * @private
       * @param  {object}   coords x,y,z
       * @param  {Function} done
       * @return {HTMLElement}  img
       */
      createTile: function createTile(coords, done) {
        var this$1 = this;

        var error;
        var tile = L.TileLayer.prototype.createTile.call(this, coords, function () {});
        // console.log('offline createTile');
        // console.log(tile);
        var url = tile.src;
        this.setDataUrl(coords, false)
          .then(function (res) {
          // console.log(`loaded specific tile {res.dataUrl}`);
            tile.src = res.dataUrl;
            done(error, tile);
          })
          .catch(function () {
          // console.log("failed to load specific tile from offline");
            tile.src = url;
            // L.DomEvent.on(tile,'error', async (e) => {
            L.DomEvent.on(tile, 'error', async function () {
            // console.log("failed to load specific tile from online")
              this$1.setDataUrl(coords, true)
                .then(function (res) {
                  // code borrows from Leaflet.TileLayer.FallBack plugin
                  var ref = res.coords;
                  var scale = ref.scale;
                  var currentCoords = res.coords;
                  var ref$1 = res.coords;
                  var originalCoords = ref$1.originalCoords;
                  // console.log(`Set src to ${res.dataUrl} scale ${scale} origx${originalCoords.x}`);
                  tile.src = res.dataUrl;
                  var tileSize = this$1.getTileSize();
                  var style = tile.style;
                  style.width = (tileSize.x * scale) + "px";
                  style.height = (tileSize.y * scale) + "px";
                  // Compute margins to adjust position.
                  var top = (originalCoords.y - currentCoords.y * scale) * tileSize.y;
                  style.marginTop = (-top) + "px";
                  var left = (originalCoords.x - currentCoords.x * scale) * tileSize.x;
                  style.marginLeft = (-left) + "px";

                  done(error, tile);
                })
                .catch(function () {
                  // console.log(`Caught setdataurl error on url ${url} `);
                  // console.log(err);
                  // tile.src = url;

                  // L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
                  L.DomEvent.on(tile, 'error', L.Util.bind(this$1._tileOnError, this$1, done, tile));
                });
            });

            L.DomEvent.on(tile, 'load', L.Util.bind(this$1._tileOnLoad, this$1, done, tile));
            //   L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));
          });
        return tile;
      },
      /**
       * dataurl from localstorage
       * @private
       * @param {object} coords x,y,z
       * @return {Promise<string>} objecturl
       */
      setDataUrl: function setDataUrl(coords, trydownSample) {
        var this$1 = this;

        var key = this._getStorageKey(coords);
        if (key === undefined) {
          throw new Error('_getStorageKey returned undefined');
        }
        // eslint-disable-next-line no-console
        // else { console.log(`_getStorageKey returned ${key}`); }
        return getTile(key)
          .then(function (data) {
            if (data && typeof data === 'object') {
              return { dataUrl: URL.createObjectURL(data), coords: coords };
            }
            var newz = coords.z - 1;
            if (newz <= 1
                || newz < this$1.options.minZoom
                || trydownSample === false) {
              throw new Error(("tile not found in storage: " + key));
            } else {
              // eslint-disable-next-line no-console
              // console.log(`no offline tile at ${key}. trying coords`);
              var newcoords = Object.assign({}, coords,
                {z: newz,
                x: Math.floor(coords.x / 2),
                y: Math.floor(coords.y / 2),
                originalCoords: coords.originalCoords !== undefined ? coords.originalCoords : coords,
                scale: (coords.scale || 1) * 2});
              // console.log(newcoords); // eslint-disable-line no-console
              return this$1.setDataUrl(newcoords);
            }
          });
      },
      /**
       * get key to use for storage
       * @private
       * @param  {string} url url used to load tile
       * @return {string} unique identifier.
       */
      _getStorageKey: function _getStorageKey(coords) {
        return getTileUrl(this._url, Object.assign({}, coords,
          this.options,
          {s: this.options.subdomains['0']}));
      },
      /**
       * getTileUrls for single zoomlevel
       * @private
       * @param  {object} L.latLngBounds
       * @param  {number} zoom
       * @return {object[]} the tile urls, key, url, x, y, z
       */
      getTileUrls: function getTileUrls$1(bounds, zoom) {
        return getTileUrls(this, bounds, zoom);
      },
    }
  );

  /**
   * Control finished calculating storage size
   * @event storagesize
   * @memberof TileLayerOffline
   * @type {ControlStatus}
   */

  /**
   * Start saving tiles
   * @event savestart
   * @memberof TileLayerOffline
   * @type {object}
   */

  /**
   * Tile fetched
   * @event loadtileend
   * @memberof TileLayerOffline
   * @type {object}
   */

  /**
   * All tiles fetched
   * @event loadend
   * @memberof TileLayerOffline
   * @type {object}
   */

  /**
   * Tile saved
   * @event savetileend
   * @memberof TileLayerOffline
   * @type {object}
   */

  /**
   * All tiles saved
   * @event saveend
   * @memberof TileLayerOffline
   * @type {object}
   */

  /**
   * Tile removed
   * @event tilesremoved
   * @memberof TileLayerOffline
   * @type {object}
   */

  /**
   * Leaflet tilelayer
   * @external "L.tileLayer"
   * @see {@link https://leafletjs.com/reference-1.6.0.html#tilelayer|TileLayer}
   */

  /**
   * @function external:"L.tileLayer".offline
   * @param  {string} url     [description]
   * @param  {object} options {@link http://leafletjs.com/reference-1.2.0.html#tilelayer}
   * @return {TileLayerOffline}      an instance of TileLayerOffline
   */
  L.tileLayer.offline = function (url, options) { return new TileLayerOffline(url, options)
    .on('tileload', async function (e) {
    // console.log(e);
      if (options.saveOnLoad !== undefined && options.saveOnLoad === true) {
        var tileurl = e.tile.src;
        // console.log(tileurl); // eslint-disable-line no-console
        if (tileurl.startsWith('blob:')) ; else {
        // debugger;
        // key for blob is url with first subdomain
          var newkey = tileurl.replace(/^https:\/\/.?/i, ("https://" + (options.subdomains['0'])));
          var tile = {
            key: newkey,
            url: tileurl,
            z: e.coords.z,
            x: e.coords.x,
            y: e.coords.y,
            urlTemplate: url,
          };

          // console.log(`downloading tile ${tileurl}`);
          await downloadTile(tileurl).then(function (blob) {
            saveTile(tile, blob);
            // console.log('saved tile'); // eslint-disable-line no-console
          });
        }
      }
    }); };

  /**
   * Status of ControlSaveTiles, keeps info about process during downloading
   * ans saving tiles. Used internal and as object for events.
   * @typedef {Object} ControlStatus
   * @property {number} storagesize total number of saved tiles.
   * @property {number} lengthToBeSaved number of tiles that will be saved in db
   * during current process
   * @property {number} lengthSaved number of tiles saved during current process
   * @property {number} lengthLoaded number of tiles loaded during current process
   * @property {array} _tilesforSave tiles waiting for processing
   */

  /**
   * Shows control on map to save tiles
   * @class ControlSaveTiles
   *
   *
   * @property {ControlStatus} status
   *
   * @example
   * const controlSaveTiles = L.control.savetiles(baseLayer, {
   * zoomlevels: [13, 16], // optional zoomlevels to save, default current zoomlevel
   * confirm(layer, successCallback) {
   *   if (window.confirm(`Save ${layer._tilesforSave.length}`)) {
   *     successCallback();
   *   }
   * },
   * confirmRemoval(layer, successCallback) {
   *   if (window.confirm('Remove all the tiles?')) {
   *     successCallback();
   *   }
   * },
   * saveText: '<i class="fa fa-download" aria-hidden="true" title="Save tiles"></i>',
   * rmText: '<i class="fa fa-trash" aria-hidden="true"  title="Remove tiles"></i>',
   * });
   */
  var ControlSaveTiles = L.Control.extend(
    /** @lends ControlSaveTiles */ {
      options: {
        position: 'topleft',
        saveText: '+',
        rmText: '-',
        maxZoom: 19,
        saveWhatYouSee: false,
        bounds: null,
        confirm: null,
        confirmRemoval: null,
        parallel: 50,
      },
      status: {
        storagesize: null,
        lengthToBeSaved: null,
        lengthSaved: null,
        lengthLoaded: null,
        _tilesforSave: null,
      },
      /**
       * @private
       * @param  {Object} baseLayer
       * @param  {Object} options
       * @return {void}
       */
      initialize: function initialize(baseLayer, options) {
        this._baseLayer = baseLayer;
        this.setStorageSize();
        L.setOptions(this, options);
      },
      /**
       * Set storagesize prop on object init
       * @return {Promise<Number>}
       * @private
       */
      setStorageSize: function setStorageSize() {
        var this$1 = this;

        if (this.status.storagesize) {
          return Promise.resolve(this.status.storagesize);
        }
        return getStorageLength()
          .then(function (numberOfKeys) {
            this$1.status.storagesize = numberOfKeys;
            this$1._baseLayer.fire('storagesize', this$1.status);
            return numberOfKeys;
          })
          .catch(function () { return 0; });
      },
      /**
       * get number of saved files
       * @param  {Function} callback [description]
       * @private
       */
      getStorageSize: function getStorageSize(callback) {
        this.setStorageSize().then(function (result) {
          if (callback) {
            callback(result);
          }
        });
      },
      /**
       * Change baseLayer
       * @param {TileLayerOffline} layer
       */
      setLayer: function setLayer(layer) {
        this._baseLayer = layer;
      },
      /**
       * Update a config option
       * @param {string} name
       * @param {mixed} value
       */
      setOption: function setOption(name, value) {
        if (this.options[name] === undefined) {
          throw new Error(("Option " + name + " doe not exist"));
        }
        this.options[name] = value;
      },
      onAdd: function onAdd() {
        var container = L.DomUtil.create('div', 'savetiles leaflet-bar');
        var ref = this;
        var options = ref.options;
        this._createButton(options.saveText, 'savetiles', container, this._saveTiles);
        this._createButton(options.rmText, 'rmtiles', container, this._rmTiles);
        return container;
      },
      _createButton: function _createButton(html, className, container, fn) {
        var link = L.DomUtil.create('a', className, container);
        link.innerHTML = html;
        link.href = '#';

        L.DomEvent.on(link, 'mousedown dblclick', L.DomEvent.stopPropagation)
          .on(link, 'click', L.DomEvent.stop)
          .on(link, 'click', fn, this)
          .on(link, 'click', this._refocusOnMap, this);

        return link;
      },
      /**
       * starts processing tiles
       * @private
       * @return {void}
       */
      _saveTiles: function _saveTiles() {
        var this$1 = this;

        var bounds;
        var tiles = [];
        // minimum zoom to prevent the user from saving the whole world
        var minZoom = 5;
        // current zoom or zoom options
        var zoomlevels = [];

        if (this.options.saveWhatYouSee) {
          var currentZoom = this._map.getZoom();
          if (currentZoom < minZoom) {
            throw new Error("It's not possible to save with zoom below level 5.");
          }
          var ref = this.options;
          var maxZoom = ref.maxZoom;

          for (var zoom = currentZoom; zoom <= maxZoom; zoom += 1) {
            zoomlevels.push(zoom);
          }
        } else {
          zoomlevels = this.options.zoomlevels || [this._map.getZoom()];
        }

        var latlngBounds = this.options.bounds || this._map.getBounds();

        for (var i = 0; i < zoomlevels.length; i += 1) {
          bounds = L.bounds(
            this._map.project(latlngBounds.getNorthWest(), zoomlevels[i]),
            this._map.project(latlngBounds.getSouthEast(), zoomlevels[i])
          );
          tiles = tiles.concat(this._baseLayer.getTileUrls(bounds, zoomlevels[i]));
        }
        this._resetStatus(tiles);
        var successCallback = async function () {
          this$1._baseLayer.fire('savestart', this$1.status);
          var loader = function () {
            if (tiles.length === 0) {
              return Promise.resolve();
            }
            var tile = tiles.shift();
            return this$1._loadTile(tile).then(loader);
          };
          var parallel = Math.min(tiles.length, this$1.options.parallel);
          for (var i = 0; i < parallel; i += 1) {
            loader();
          }
        };
        if (this.options.confirm) {
          this.options.confirm(this.status, successCallback);
        } else {
          successCallback();
        }
      },
      /**
       * set status prop on save init
       * @param {string[]} tiles [description]
       * @private
       */
      _resetStatus: function _resetStatus(tiles) {
        this.status = {
          lengthLoaded: 0,
          lengthToBeSaved: tiles.length,
          lengthSaved: 0,
          _tilesforSave: tiles,
        };
      },
      /**
       * Loop over status._tilesforSave prop till all tiles are downloaded
       * Calls _saveTile for each download
       * @private
       * @return {void}
       */
      _loadTile: async function _loadTile(jtile) {
        var self = this;
        var tile = jtile;
        await downloadTile(tile.url).then(function (blob) {
          self.status.lengthLoaded += 1;
          self._saveTile(tile, blob);
          self._baseLayer.fire('loadtileend', self.status);
          if (self.status.lengthLoaded === self.status.lengthToBeSaved) {
            self._baseLayer.fire('loadend', self.status);
          }
        });
      },

      /**
       * @private
       * @param  {object} tileInfo save key
       * @param {string} tileInfo.key
       * @param {string} tileInfo.url
       * @param {string} tileInfo.x
       * @param {string} tileInfo.y
       * @param {string} tileInfo.z
       * @param  {blob} blob    [description]
       * @return {void}         [description]
       */
      _saveTile: function _saveTile(tileInfo, blob) { // original is synchronous
        var self = this;
        saveTile(tileInfo, blob)
          .then(function () {
            self.status.lengthSaved += 1;
            self._baseLayer.fire('savetileend', self.status);
            if (self.status.lengthSaved === self.status.lengthToBeSaved) {
              self._baseLayer.fire('saveend', self.status);
              self.setStorageSize();
            }
          })
          .catch(function (err) {
            throw new Error(err);
          });
      },
      _rmTiles: function _rmTiles() {
        var self = this;
        var successCallback = function () {
          truncate().then(function () {
            self.status.storagesize = 0;
            self._baseLayer.fire('tilesremoved');
            self._baseLayer.fire('storagesize', self.status);
          });
        };
        if (this.options.confirmRemoval) {
          this.options.confirmRemoval(this.status, successCallback);
        } else {
          successCallback();
        }
      },
    }
  );

  /**
   * Leaflet control
   * @external "L.control"
   * @see {@link https://leafletjs.com/reference-1.6.0.html#control|Control}
   */

  /**
   * @function external:"L.control".savetiles
   * @param  {object} baseLayer     {@link http://leafletjs.com/reference-1.2.0.html#tilelayer}
   * @property {Object} options
   * @property {string} [options.position] default topleft
   * @property {string} [options.saveText] html for save button, default +
   * @property {string} [options.rmText] html for remove button, deflault -
   * @property {number} [options.maxZoom] maximum zoom level that will be reached
   * when saving tiles with saveWhatYouSee. Default 19
   * @property {number} [options.parallel] parallel downloads (default 50)
   * @property {boolean} [options.saveWhatYouSee] save the tiles that you see
   * on screen plus deeper zooms, ignores zoomLevels options. Default false
   * @property {function} [options.confirm] function called before confirm, default null.
   * Args of function are ControlStatus and callback.
   * @property {function} [options.confirmRemoval] function called before confirm, default null
   * @return {ControlSaveTiles}
   */
  L.control.savetiles = function (baseLayer, options) { return new ControlSaveTiles(baseLayer, options); };

  exports.downloadTile = downloadTile;
  exports.getStorageInfo = getStorageInfo;
  exports.getStorageLength = getStorageLength;
  exports.getStoredTilesAsJson = getStoredTilesAsJson;
  exports.getTileUrl = getTileUrl;
  exports.getTileUrls = getTileUrls;
  exports.removeTile = removeTile;
  exports.saveTile = saveTile;
  exports.truncate = truncate;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
