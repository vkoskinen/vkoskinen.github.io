	if ('serviceWorker' in navigator) {
		window.addEventListener('load', () => {
		navigator.serviceWorker.register('../sw.js').then( () => {
		console.log('Service Worker Registered')
		})
	})
	}

	const here = {
		apiKey:'eXgIn9z6_ajJGIOlSJydOcTe8pa4GzX3Vd_enIhf8q8'
	  }
	  
	const style = 'normal.day';
	
	//const urlTemplate = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';  //alternative offline layer
	const urlTemplate = "https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0/taustakartta/default/"
                + "WGS84_Pseudo-Mercator/{z}/{y}/{x}.png" + "?api-key=a8a60737-7849-4969-a55e-7b83db77e13a";
	//const urlTemplate = `https://2.base.maps.ls.hereapi.com/maptile/2.1/maptile/newest/${style}/{z}/{x}/{y}/512/png8?apiKey=${here.apiKey}&ppi=320`;

	function showTileList() {
	LeafletOffline.getStorageInfo(urlTemplate).then((r) => {
		const list = document.getElementById('tileinforows');
		list.innerHTML = '';
		for (let i = 0; i < r.length; i += 1) {
		const createdAt = new Date(r[i].createdAt);
		list.insertAdjacentHTML(
			'beforeend',
			`<tr><td>${i}</td><td>${r[i].url}</td><td>${
			r[i].key
			}</td><td>${createdAt.toDateString()}</td></tr>`,
		);
		}
	});
	}

	$('#storageModal').on('show.bs.modal', () => {
	showTileList();
	});

	var map = L.map('map', {
		center: [65.425,27.510],
		zoom: 5,
		 minZoom: 5,
		 maxZoom: 16,
		 zoomControl: false,
	 });

	 var popup = L.popup({
		closeButton: true,
		autoClose: true,
		className: "custom-popup" 
	  });

	var popupOptions =
    {
      'maxWidth': '300',
      'className' : 'custom-popup'
    };

	
	// offline baselayer, will use offline source if available
	const baseLayer = L.tileLayer
	.offline(urlTemplate, {
		attribution: 'Map data {attribution.OpenStreetMap}',
		//subdomains: 'abc',
		minZoom: 12,
		//maxZoom: 7,
		saveOnLoad: false,
		downsample: false
	});

	var myRenderer = L.canvas({ padding: 0.5, tolerance: 20 });

	maastokartta= new L.tileLayer.mml_wmts({ layer: "maastokartta", iconURL: '../images/peruskartta.PNG' }, attribution='test');
	taustakartta = new L.tileLayer.mml_wmts({ layer: "taustakartta", iconURL: '../images/taustakartta.PNG'});
	selkokartta = new L.tileLayer.mml_wmts({ layer: "selkokartta", iconURL: '../images/selkokartta.PNG'});

	hereMap =  L.tileLayer('https://2.base.maps.ls.hereapi.com/maptile/2.1/maptile/newest/normal.day/{z}/{x}/{y}/512/png8?apiKey=eXgIn9z6_ajJGIOlSJydOcTe8pa4GzX3Vd_enIhf8q8&ppi=320', 
		{attribution: '&copy HERE',
		label: 'Toner Lite',  // optional label used for tooltip,
		iconURL: 'images/here.PNG'
	})
	.addTo(map);

	roadCover = L.tileLayer.wms("https://julkinen.vayla.fi/inspirepalvelu/avoin/wms?", {
    	layers: 'TL137',
        format: 'image/png',
        transparent: true,
        attribution: '<a target="_blank" href="https://vayla.fi/vaylista/aineistot/avoindata/kayttoehdot">Väylävirasto</a>',
		minZoom: 8
    });
	
	speedLimit = L.tileLayer.wms("https://julkinen.vayla.fi/inspirepalvelu/avoin/wms?", {
    	layers: 'TL168',
        format: 'image/png',
        transparent: true,
        attribution: '<a target="_blank" href="https://vayla.fi/vaylista/aineistot/avoindata/kayttoehdot">Väylävirasto</a>',
		minZoom: 8
    });

	var workingSiteIcon = L.icon({
		iconUrl: 'images/under-construction.png',
		iconSize: [27, 31],
		iconAnchor: [13.5, 17.5],
		popupAnchor: [0, -11]
	  });

	var stationIcon = new L.Icon({
		iconUrl: 'js/leaflet-color-markers-master/img/marker-icon-2x-green.png',
		shadowUrl: 'js/leaflet-color-markers-master/img/marker-shadow.png',
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34],
		shadowSize: [41, 41]
	});

	var cafeIcon = new L.Icon({
		iconUrl: 'js/leaflet-color-markers-master/img/marker-icon-2x-red.png',
		shadowUrl: 'js/leaflet-color-markers-master/img/marker-shadow.png',
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34],
		shadowSize: [41, 41]
	});

	workingSitesPoints = L.esri.featureLayer({
		url: ' https://services1.arcgis.com/rhs5fjYxdOG1Et61/ArcGIS/rest/services/TrafficMessages/FeatureServer/3',
		isModern:true,
		pointToLayer: function (geojson, latlng) {
			return L.marker(latlng, {
			  icon: workingSiteIcon
			});
		},
		onEachFeature: function (feature, layer) {
			var startTime = new Date(feature.properties.startTime);
			var endTime = new Date(feature.properties.endTime);
			if (feature.properties.comment == null ){
				var spopup = "<p><strong>"+ feature.properties.title + "</strong>"
				+ "<br><br>Tarkenne: " + feature.properties.locationDescription
				+ "<br><br>Ajankohta: " +startTime.toLocaleString() + " - " +endTime.toLocaleString();
			}
			else {
				var spopup = "<p><strong>"+ feature.properties.title + "</strong>"
				+ "<br><br>" + feature.properties.comment
				+ "<br><br>Tarkenne: " + feature.properties.locationDescription
				+ "<br><br>Ajankohta: " +startTime.toLocaleString() + " - " +endTime.toLocaleString();
			}
		  layer.bindPopup(spopup,popupOptions);
		}
	});

	workingSitesLines = L.esri.featureLayer({
		url: ' https://services1.arcgis.com/rhs5fjYxdOG1Et61/ArcGIS/rest/services/TrafficMessages/FeatureServer/4',
		isModern:true,
		renderer: myRenderer,
		style: function(feature) {
			return {
			  color: '#FF7F00',
			  weight: 7
			};
		},
		onEachFeature: function (feature, layer) {
			var startTime = new Date(feature.properties.startTime);
			var endTime = new Date(feature.properties.endTime);
			if (feature.properties.comment == null ){
				var spopup = "<p><strong>"+ feature.properties.title + "</strong>"
				+ "<br><br>Tarkenne: " + feature.properties.locationDescription
				+ "<br><br>Ajankohta: " +startTime.toLocaleString() + " - " +endTime.toLocaleString();
			}
			else {
				var spopup = "<p><strong>"+ feature.properties.title + "</strong>"
				+ "<br><br>" + feature.properties.comment
				+ "<br><br>Tarkenne: " + feature.properties.locationDescription
				+ "<br><br>Ajankohta: " +startTime.toLocaleString() + " - " +endTime.toLocaleString();
			}
		layer.bindPopup(spopup,popupOptions);
	  }
	});

	workingSitesGroup = L.featureGroup([workingSitesPoints, workingSitesLines]);

	function highlight (layer) {
		layer.setStyle({
			weight: 5,
			color: 'red',
			dashArray: ''
		});
		if (!L.Browser.ie && !L.Browser.opera) {
			layer.bringToFront();
		}
	}

	function dehighlight (layer) {
		if (selected === null || selected._leaflet_id !== layer._leaflet_id) {
			geojson.resetStyle(layer);
		}
	}

	function select (layer) {
		if (selected !== null) {
			var previous = selected;
		}
			map.fitBounds(layer.getBounds());
			selected = layer;
		if (previous) {
			dehighlight(previous);
		}
	}

	// zoom to feature
	var selected = null;
	
	function createClusterIcon(feature, latlng) {
		if (!feature.properties.cluster) return L.marker(latlng);
	
		const count = feature.properties.point_count;
		const size =
			count < 100 ? 'small' :
			count < 1000 ? 'medium' : 'large';
		const icon = L.divIcon({
			html: `<div><span>${  feature.properties.point_count_abbreviated  }</span></div>`,
			className: `marker-cluster marker-cluster-${  size}`,
			iconSize: L.point(40, 40)
		});
	
		return L.marker(latlng, {icon});
	};

	var geojson = new L.GeoJSON.AJAX("js/mutkat.geojson", {
		renderer: myRenderer,
		color: '#ffffff', weight: 3, opacity: 0.35, raised: false,
		filter: function(feature, layer) {
		return (feature.geometry.type)=="LineString";
		},
		style: function (feature) {
		  return {
			  weight: 4,
			  opacity: 1,
			  color: 'blue',
			  //dashArray: 3,
		  };
	    },
		onEachFeature: function (feature, layer) {
			var name = (feature.properties.name !== undefined) ? feature.properties.name: "Ei tietoa";
			var description = feature.properties.description;
			if (name == null ){
				var spopup = "Ei tietoa";
				}
			if (description == undefined){
			var spopup = "Reitin nimi: " + name + ""
				}
			else {
			var spopup = "Virhe haussa"
				}
		layer.bindPopup(spopup,popupOptions);
		layer.on({
		  'mouseover': function (e) {
			highlight(e.target);
		  },
		  'mouseout': function (e) {
			dehighlight(e.target);
		  },
			  'click': function (e) {
				select(e.target);
			  }
		  });
	  }
	});

	disturbances = L.esri.featureLayer({
		url: ' https://services1.arcgis.com/rhs5fjYxdOG1Et61/ArcGIS/rest/services/TrafficMessages/FeatureServer/1',
		isModern:true,
		renderer: myRenderer,
		style: function(feature) {
			return {
			  color: '#E41A1C',
			  weight: 7
			};
		},
		onEachFeature: function (feature, layer) {
			var startTime = new Date(feature.properties.startTime);
			var endTime = new Date(feature.properties.endTime);
			var spopup = "<p><strong>"+ feature.properties.title + "</strong>"
						+ "<br><br>Tarkenne: " + feature.properties.locationDescription
						+ "<br><br>Ajankohta: " + startTime.toLocaleString();
		layer.bindPopup(spopup,popupOptions);
	  }
	});

	workingSitesGroup = L.featureGroup([workingSitesPoints, workingSitesLines]);

	function toGeo() {
		var xml = document.getElementById('osmxml').value,
			geojson = osm_geojson.osm2geojson(xml);
		document.getElementById('geojson').value = JSON.stringify(geojson);
		console.log(geojson);
	;}

	//test=toGeo('data/test.xml')

	var stations = new L.GeoJSON.AJAX("data/fuel.geojson", {
		minZoom: 8,
		filter: function(feature, layer) {
			return (feature.properties.name)!=null
		},
		pointToLayer: function (geojson, latlng) {
			return L.marker(latlng, {
			  icon: stationIcon
			});
		},
		onEachFeature: function(feature, layer) {
			var name = (feature.properties.name !== undefined) ? feature.properties.name: "Ei tietoa";
			var cafeWebsite = feature.properties.website;
			var cafeUrl = feature.properties.url;
			var cafeWeb = (feature.properties.url !== undefined) ? feature.properties.url: feature.properties.website;
			var cafeOpeningHours = (feature.properties.opening_hours !== undefined) ? feature.properties.opening_hours:"Ei tietoa";
			if (name == null ){
			var spopup = "Ei tietoa";
			}
			if (cafeWebsite == undefined && cafeUrl == undefined){
			var spopup = "Asema: " + name 
						+ "<br>Aukiolo: " + cafeOpeningHours 
			}
			else {
			var spopup = "Asema: " + '<a target="_blank" href='+ cafeWeb + '>' + name +'</a>'
						+ "<br>Aukiolo: " + cafeOpeningHours 
			}
		layer.bindPopup(spopup,popupOptions).openPopup();
		}}
	);

	var cafes = new L.GeoJSON.AJAX("data/cafe.geojson", {
		minZoom: 8,
		filter: function(feature, layer) {
			return (feature.properties.name)!=null
		},
		pointToLayer: function (geojson, latlng) {
			return L.marker(latlng, {
			  icon: cafeIcon
			});
		},
		onEachFeature: function(feature, layer) {
			var name = (feature.properties.name !== undefined) ? feature.properties.name: "Ei tietoa";
			var cafeWebsite = feature.properties.website;
			var cafeUrl = feature.properties.url;
			var cafeWeb = (feature.properties.url !== undefined) ? feature.properties.url: feature.properties.website;
			var cafeOpeningHours = (feature.properties.opening_hours !== undefined) ? feature.properties.opening_hours:"Ei tietoa";
			if (name == null ){
				var spopup = "Ei tietoa";
				}
				if (cafeWebsite == undefined && cafeUrl == undefined){
				var spopup = "Kahvila: " + name 
							+ "<br>Aukiolo: " + cafeOpeningHours 
				}
				else {
				var spopup = "Kahvila: " + '<a target="_blank" href='+ cafeWeb + '>' + name +'</a>'
							+ "<br>Aukiolo: " + cafeOpeningHours 
			}
		layer.bindPopup(spopup,popupOptions).openPopup();
		}}
	);


	var MMLUrl = "https://avoin-karttakuva.maanmittauslaitos.fi/vectortiles/taustakartta/wmts/1.0.0/taustakartta/default/v20/WGS84_Pseudo-Mercator/{z}/{x}/{y}.pbf?api-key=a8a60737-7849-4969-a55e-7b83db77e13a";

	var vectorTileStyling = {
		vesisto_viiva: {
			fill: true,
			weight: 1,
			fillColor: '#06cccc',
			color: '#06cccc',
			fillOpacity: 0.2,
			opacity: 0.4,
		}
	}

	var mapboxVectorTileOptions = {
		rendererFactory: L.canvas.tile,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://www.mapbox.com/about/maps/">MapBox</a>',
		vectorTileLayerStyles: vectorTileStyling,
		token: 'pk.eyJ1IjoiaXZhbnNhbmNoZXoiLCJhIjoiY2l6ZTJmd3FnMDA0dzMzbzFtaW10cXh2MSJ9.VsWCS9-EAX4_4W1K-nXnsA'
	};

	var mapboxPbfLayer = L.vectorGrid.protobuf(MMLUrl,mapboxVectorTileOptions);

	var stationsCluster = new L.MarkerClusterGroup({
		showCoverageOnHover: false,
		maxClusterRadius: 80
	});

	stations.on('data:loaded', function () {
		stationsCluster.addLayer(stations)
	});

	var cafesCluster = new L.MarkerClusterGroup({
		showCoverageOnHover: false,
		maxClusterRadius: 80
	});

	cafes.on('data:loaded', function () {
		cafesCluster.addLayer(cafes)
	});

	var overlays = {
		'Tien päällyste': roadCover,
		'Nopeusrajoitukset' : speedLimit,
		'Tietyöt': workingSitesGroup,
		'Liikennehäiriöt': disturbances,
		'Mutkareitit': geojson,
		'Huolto-asemat': stationsCluster,
		'Kahvilat': cafesCluster,
		"MapBox Vector Tiles": mapboxPbfLayer,
	};
	
	var baseUrls = {
	  'HERE': hereMap,  
	  'Taustakartta': taustakartta,
	  'Peruskartta': maastokartta,
	  'Selkokartta': selkokartta,
	};

	var basemaps = [
		hereMap,
		maastokartta,
		taustakartta,
		selkokartta
	];

	map.addControl(L.control.basemaps({
		basemaps: basemaps,
		tileX: 0,  // tile X coordinate
		tileY: 0,  // tile Y coordinate
		tileZ: 1   // tile zoom level
	}));
	
	
	// add buttons to save tiles in area viewed
	const control = L.control.savetiles(baseLayer, {
	//zoomlevels: [13, 16], // optional zoomlevels to save, default current zoomlevel,
	confirm(layer, successCallback) {
		// eslint-disable-next-line no-alert
		if (window.confirm(`Save ${layer._tilesforSave.length}`)) {
		successCallback();
		}
	},
	confirmRemoval(layer, successCallback) {
		// eslint-disable-next-line no-alert
		if (window.confirm('Remove all the tiles?')) {
		successCallback();
		}
	},
	saveText:
		'<i class="fa fa-download" aria-hidden="true" title="Save tiles"></i>',
	rmText: '<i class="fa fa-trash" aria-hidden="true"  title="Remove tiles"></i>',
	});

	//layer switcher control
	const layerswitcher = L.control.layers(
		null, 
		overlays, 
		{ collapsed: true }
	).addTo(map);
	
	let storageLayer;

	const getGeoJsonData = () => LeafletOffline.getStorageInfo(urlTemplate)
	.then((data) => LeafletOffline.getStoredTilesAsJson(baseLayer, data));

	const addStorageLayer = () => {
	getGeoJsonData().then((geojson) => {
		storageLayer = L.geoJSON(geojson)//.bindPopup(
		//(clickedLayer) => clickedLayer.feature.properties.key,
		//);
		layerswitcher.addOverlay(storageLayer, 'Offline tiilet');
	});
	};

	addStorageLayer();

	baseLayer.on('storagesize', (e) => {
	if (storageLayer) {
		storageLayer.clearLayers();
		getGeoJsonData().then((data) => {
		storageLayer.addData(data);
		});
	}
	});

	// events while saving a tile layer
	let progress;
	baseLayer.on('savestart', (e) => {
	progress = 0;
	});
	baseLayer.on('savetileend', () => {
	progress += 1;
	});

	// locate
	lc = L.control.locate({
		strings: {
			title: "Oma sijainti"
		},
		flyTo:true,
		showPopup:false,
		locateOptions: {
			maxZoom: 15
		}
	 }).addTo(map);
	
	//map.zoomControl.setPosition('bottomleft');

	var materialOptions = {
        color: "white",
      };

      // Material zoom control:
      var materialZoomControl = new L.materialControl.Zoom({ position: "bottomleft", materialOptions: materialOptions});
      materialZoomControl.addTo(map);

	// info button
	var infoButton = L.control.infoButton({
		linkTitle: 'Motokartat', 
		title: '<h2>Motokartat</h2>',
		html:'<p><b>Kartta-aineistot (Map data)</b></p><a href="https://www.here.com/">HERE</a><br><a href="https://www.maanmittauslaitos.fi/avoindata-lisenssi-cc40">Maanmittauslaitos Nimeä CC 4.0 -lisenssi</a>: Taustakartta,peruskartta ja selkokartta</a><br><a href="https://www.fintraffic.fi/fi/fintraffic/digitraffic-ja-avoin-data">Fintraffic Nimeä 4.0 Kansainvälinen (CC BY 4.0)</a> : Tietyöt ja liikennehäiriöt</a><br><a href="https://wiki.openstreetmap.org/wiki/Overpass_API">OpenStreetMap Overpass API</a> : Kahvilat ja huoltoasemat</a><br><a href="http://www.moottoripyora.org/keskustelu/showthread.php/274924-Org!-Mutkareittikartta">Moottoripyörät.org</a> : Org! Mutkareittikartta-keskustelu</a><br><a href="https://vayla.fi/">Väylävirasto</a>: Tien päällyste ja nopeusrajoitukset, <a href="https://creativecommons.org/licenses/by/4.0/deed.fi">Creative Commons 4.0</a><br><a href="https://www.ilmatieteenlaitos.fi/avoin-data">Ilmatieteen laitos</a>: Säädata -aineisto, <a href="https://creativecommons.org/licenses/by/4.0/deed.fi">Creative Commons 4.0</a><br><a href="https://www.rainviewer.com/">RainViewer</a>: Säädata -animaatio</a><p><b>Kirjastot (Libraries)</b></p><a>Map by <a href="http://leafletjs.com/"> Leaflet</a><br><a>Fonts by <a href="https://fontawesome.com/">Font Awesome</a><br><a> Icons by <a target="_blank" href="https://icons8.com">Icons8</a><br><a>Listaa loput...</a><p><b>Reititys (Routing)</b></p><a href="https://www.liedman.net/leaflet-routing-machine/">Leaflet Routing Machine</a> with <a href="https://www.here.com/">HERE</a><p><b>Liittyvät lisenssit (related licenses)</b></p><a href="https://opensource.org/licenses/mit-license.php">MIT-lisenssi</a>'
	}).addTo(map);

	// rain viewer
	L.control.rainviewer({ 
		position: 'topleft',
		nextButtonText: '>',
		playStopButtonText: 'Päälle/Pois',
		prevButtonText: '<',
		positionSliderLabelText: "Tunti:",
		opacitySliderLabelText: "Läpinäkyvyys:",
		animationInterval: 300,
		opacity: 0.5
	}).addTo(map);
	
	// Controls for routing	
	// Clear
	function createClearButton(label, container) {
		var btn = L.DomUtil.create('button', '', container);
		btn.setAttribute('type', 'button');
		btn.innerHTML = label;
		btn.title = "Clear waypoints";
		return btn;
	}

	// Reserve
	function createReverseButton(label, container) {
		var btn = L.DomUtil.create('button', '', container);
		btn.setAttribute('type', 'button');
		btn.innerHTML = label;
		btn.title = "Reverse waypoints";
		return btn;
	}
	
	// avoid highways and unpaved roads
	function createAvoidAll(label, container) {
		var btn = L.DomUtil.create('button', '', container);
		btn.setAttribute('type', 'button');
		btn.innerHTML = label;
		btn.title = "Vältä valtateitä ja päällystämättömiä teitä";
		return btn;
	}
	
	// avoid highways
	function createAvoidHighWayButton(label, container) {
		var btn = L.DomUtil.create('button', '', container);
		btn.setAttribute('type', 'button');
		btn.innerHTML = label;
		btn.title = "Vältä valtateitä";
		return btn;
	}
	
	// avoid unpaved roads
	function createUnpavedRoadsButton(label, container) {
		var btn = L.DomUtil.create('button', '', container);
		btn.setAttribute('type', 'button');
		btn.innerHTML = label;
		btn.title = "Vältä päällystättömiä teitä";
		return btn;
	}
	
	// fastest
	function createFastestButton(label, container) {
		var btn = L.DomUtil.create('button', '', container);
		btn.setAttribute('type', 'button');
		btn.innerHTML = label;
		btn.title = "Nopein";
		return btn;
	}
	
	var geoPlan = L.Routing.Plan.extend({

		createGeocoders: function() {
	
			var container = L.Routing.Plan.prototype.createGeocoders.call(this),
				
				//Create a clear waypoints button
				clearButton = createClearButton('<i class="fa fa-trash-alt" aria-hidden="true"></i>', container);

				// Create a reverse waypoints button
				reverseButton = createReverseButton('<i class="fa fa-arrows-alt-v" aria-hidden="true"></i>', container);
	
				// Avoid highways and unpaved roads
				//avoidAllButton = createAvoidAll('<i class="fa fa-globe" aria-hidden="true"></i>', container);
	
				// Avoid highways
				avoidHighWayButton = createAvoidHighWayButton('<i class="fa fa-road" aria-hidden="true"></i>', container);
	
				// Suitable for motorcycles
				unpavedRoadsButton = createUnpavedRoadsButton('<i class="fa fa-motorcycle" aria-hidden="true"></i>', container);
	
				// Fastest
				fastestButton = createFastestButton('<i class="fa fa-fast-forward" aria-hidden="true"></i>', container);
				
				L.DomEvent.on(clearButton, 'click', function() {
					this.setWaypoints();
					console.log("Waypoints cleared");
				}, this);

				L.DomEvent.on(reverseButton, 'click', function() {
					var waypoints = this.getWaypoints();
					this.setWaypoints(waypoints.reverse());
					console.log("Waypoints reversed");
				}, this);
				
				// Event to generate route which avoids unpaved roads
				L.DomEvent.on(unpavedRoadsButton, 'click', function() {
					routing.getRouter().options.urlParameters.mode = 'shortest;car;dirtRoad:-1';
					routing.route();
					routing.setWaypoints(routing.getWaypoints());
					console.log("Avoid unpaved route");	
				}, this);
	
				// Event to generate route which avoids motorways
				L.DomEvent.on(avoidHighWayButton, 'click', function() {
					routing.getRouter().options.urlParameters.mode = 'shortest;car;motorway:-1';
					routing.route();
					routing.setWaypoints(routing.getWaypoints());
					console.log("Avoid motorways route");	
				}, this);
				
				// Event to generate fastest routes
				L.DomEvent.on(fastestButton, 'click', function() {
					routing.getRouter().options.urlParameters.mode = 'fastest;car';
					routing.route();
					routing.setWaypoints(routing.getWaypoints());
					console.log("Fastest");	
				}, this);
				
				return container;
			}
	});
			
	// Create a plan for the routing
	var plan = new geoPlan(
		[],
		{
			geocoder: new L.Control.Geocoder.Nominatim(),
			//addWaypoints: false,
			routeWhileDragging: false,
			draggableWaypoints: true,
		}),
		// Routing machine HERE
		routing = L.Routing.control({
			waypoints: [],
			position: 'topright',
			router: new L.Routing.Here('eXgIn9z6_ajJGIOlSJydOcTe8pa4GzX3Vd_enIhf8q8',{}),
			plan: plan,
			show: false,
			hide:true,
			collapsible: true,
			collapseBtn: function(itinerary) {
				var collapseBtn = L.DomUtil.create('span', itinerary.options.collapseBtnClass);
				L.DomEvent.on(collapseBtn, 'click', itinerary._toggle, itinerary);
				itinerary._container.insertBefore(collapseBtn, itinerary._container.firstChild);
			},
			altLineOptions: {
			styles: [{
				color: 'black',
				opacity: 0.15,
				weight: 9
			}, {
				color: 'white',
				opacity: 0.8,
				weight: 6
			}, {
				color: 'blue',
				opacity: 0.5,
				weight: 2
			}]
			}
	});
	map.addControl(routing);
	
	function createButton(label, container) {
		var btn = L.DomUtil.create('button', '', container);
		btn.setAttribute('type', 'button');
		btn.innerHTML = label;
		btn.title = "Start route location";
		return btn;
	}
	
	// legends
	var speedLimitLegend = L.control({position: 'bottomright', minZoom: 10});
		speedLimitLegend.onAdd = function (map) {
		var div = L.DomUtil.create('div', 'info legend');

			div.innerHTML +=
			'<img src="https://julkinen.vayla.fi/oskari/action?action_route=GetLayerTile&legend=true&style=nopeusrajoitukset&id=68">';

		return div;
	};

	var roadCoverLegend = L.control({position: 'bottomright', minZoom: 10});
	roadCoverLegend.onAdd = function (map) {
		var div = L.DomUtil.create('div', 'info legend');

			div.innerHTML +=
			'<img src="https://julkinen.vayla.fi/oskari/action?action_route=GetLayerTile&legend=true&style=digiroad%3ADR_Paallystetty_tie_LUOKAT&id=322">';

		return div;
	};

	// event listening
	map.on('overlayadd', function (eventLayer) {
		if (eventLayer.name === 'Nopeusrajoitukset') {
			speedLimitLegend.addTo(map);
		}
	  })
	  
	map.on('overlayadd', function (eventLayer) {
		if (eventLayer.name === 'Tien päällyste') {
			roadCoverLegend.addTo(map);
		}
	  })
	 
	 map.on('overlayremove', function(eventLayer){
		if (eventLayer.name === 'Nopeusrajoitukset'){
			 map.removeControl(speedLimitLegend);
		} 
	})
	
	map.on('overlayremove', function(eventLayer){
		if (eventLayer.name === 'Tien päällyste'){
			 map.removeControl(roadCoverLegend);
		} 
	});

	map.on('moveend',
		function () {
			if (map.getZoom() >= 14) {
				map.addControl(control);
			}
			if (map.getZoom() < 14) {
				map.removeControl(control);
			}
		}
	);

	// attributions
	map.attributionControl.addAttribution('<a target="_blank" href="https://icons8.com">Icons8</a>');

	if (!map.restoreView()) {
		map.setView([65.425,27.510], 5);
	};
