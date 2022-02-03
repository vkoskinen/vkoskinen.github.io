	if ('serviceWorker' in navigator) {
		window.addEventListener('load', () => {
		navigator.serviceWorker.register('../sw.js').then( () => {
		console.log('Service Worker Registered')
		})
	})
	}

	var crs = L.TileLayer.MML.get3067Proj();

	/* global L,LeafletOffline, $  */
	const urlTemplate = 'https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0/taustakartta/default/WGS84_Pseudo-Mercator/{z}/{y}/{x}.png?api-key=a8a60737-7849-4969-a55e-7b83db77e13a';

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

	//const map = L.map('map');

	const map = new L.map('map', {
		crs: crs
	}).setView([65, 27], 3);

	// offline baselayer, will use offline source if available
	const baseLayer = L.tileLayer
	.offline(urlTemplate, {
		attribution: 'Map data {attribution.OpenStreetMap}',
		subdomains: 'abc',
		minZoom: 1,
		maxZoom: 2,
		saveOnLoad: true,
		downsample: true
	});

	maastokartta= new L.tileLayer.mml_wmts({ layer: "maastokartta"}, attribution='test');
	taustakarttaMini= new L.tileLayer.mml_wmts({ layer: "taustakartta" });
	taustakartta = new L.tileLayer.mml_wmts({ layer: "taustakartta" }).addTo(map);
	selkokartta = new L.tileLayer.mml_wmts({ layer: "selkokartta" });

	roadCover = L.tileLayer.wms("https://julkinen.vayla.fi/inspirepalvelu/avoin/wms?", {
    	layers: 'TL137',
        format: 'image/png',
        transparent: true,
        attribution: '<a target="_blank" href="https://vayla.fi/vaylista/aineistot/avoindata/kayttoehdot">Väylävirasto</a> lisenssi CC 4.0 BY</a>',
		minZoom: 8
    });
	
	speedLimit = L.tileLayer.wms("https://julkinen.vayla.fi/inspirepalvelu/digiroad/ows?", {
    	layers: 'DR_NOPEUSRAJOITUS',
        format: 'image/png',
        transparent: true,
        attribution: '<a target="_blank" href="https://vayla.fi/vaylista/aineistot/avoindata/kayttoehdot">Väylävirasto</a> lisenssi CC 4.0 BY</a>',
		minZoom: 8
    });

	var icon = L.icon({
		iconUrl: 'https://img.icons8.com/color/96/000000/under-construction.png',
		iconSize: [27, 31],
		iconAnchor: [13.5, 17.5],
		popupAnchor: [0, -11]
	  });
	  
	workingSitesPoints = L.esri.featureLayer({
		url: ' https://services1.arcgis.com/rhs5fjYxdOG1Et61/ArcGIS/rest/services/TrafficMessages/FeatureServer/3',
		isModern:true,
		pointToLayer: function (geojson, latlng) {
			return L.marker(latlng, {
			  icon: icon
			});
		  }
	});

	workingSitesLines = L.esri.featureLayer({
		url: ' https://services1.arcgis.com/rhs5fjYxdOG1Et61/ArcGIS/rest/services/TrafficMessages/FeatureServer/4',
		isModern:true,
		style: function(feature) {
			return {
			  color: '#FF7F00',
			  weight: 7
			};
		}
	});

	workingSitesGroup = L.featureGroup([workingSitesPoints, workingSitesLines]);

	disturbances = L.esri.featureLayer({
		url: ' https://services1.arcgis.com/rhs5fjYxdOG1Et61/ArcGIS/rest/services/TrafficMessages/FeatureServer/1',
		isModern:true,
		style: function(feature) {
			return {
			  color: '#E41A1C',
			  weight: 7
			};
		}
	});

	var overlays = {
		'Tien päällyste': roadCover,
		'Nopeusrajoitukset' : speedLimit,
		'Tietyöt': workingSitesGroup,
		'Liikennehäirilöt': disturbances
	};
	
	var baseUrls = {
	  'Taustakartta': taustakartta,
	  'Peruskartta': maastokartta,
	  'Selkokartta': selkokartta
	};
	
	// add buttons to save tiles in area viewed
	const control = L.control.savetiles(baseLayer, {
	zoomlevels: [13, 16], // optional zoomlevels to save, default current zoomlevel,
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
	control.addTo(map);

	// // layer switcher control
	// const layerswitcher = L.control
	// .layers({
	// 	'osm (offline)': baseLayer,
	// }, null, { collapsed: false })
	// .addTo(map);

	const layerswitcher = L.control.layers(
		baseUrls, 
		overlays,
		{
			collapsed: true,
			autoZIndex: false,
			position: 'topright'
		}
	).addTo(map);

	let storageLayer;

	const getGeoJsonData = () => LeafletOffline.getStorageInfo(urlTemplate)
	.then((data) => LeafletOffline.getStoredTilesAsJson(baseLayer, data));

	const addStorageLayer = () => {
	getGeoJsonData().then((geojson) => {
		storageLayer = L.geoJSON(geojson).bindPopup(
		(clickedLayer) => clickedLayer.feature.properties.key,
		);
		layerswitcher.addOverlay(storageLayer, 'stored tiles');
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

	lc = L.control.locate({
		strings: {
			title: "Oma sijainti"
		},
		flyTo:true,
		showPopup:false
	}).addTo(map);
	map.zoomControl.setPosition('bottomleft');
	
	
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
	
	var miniMap = new L.Control.MiniMap(taustakarttaMini, { toggleDisplay: true, minimize: true}).addTo(map);

	var infoButton = L.control.infoButton({
		linkTitle: 'Motokartat', 
		title: '<h2>Motokartat</h2>',
		html:'<p>This map was generated by Leaflet.</p><p>Leaflet is a modern open-source JavaScript library for mobile-friendly interactive this._maps. It is developed by <a href="http://agafonkin.com/en"&gt;Vladimir Agafonkin</a> with a team of dedicated <a href="https://github.com/Leaflet/Leaflet/graphs/contributors"&gt;contributors&lt;/a>. Weighing just about <abbr title="33 KB gzipped — thats 123 KB minified and 218 KB in the source form, with 10 KB of CSS (2 KB gzipped) and 11 KB of images.">33 KB of JS</abbr>, it has all the <a href="features.html">features</a> most developers ever need for online maps.</p><p>Leaflet is designed with <em>simplicity</em>, <em>performance</em> and <em>usability</em> in mind. It works efficiently across all major desktop and mobile platforms out of the box, taking advantage of HTML5 and CSS3 on modern browsers while still being accessible on older ones. It can be extended with a huge amount of <a href="plugins.html">plugins</a>, has a beautiful, easy to use and <a href="reference.html" title="Leaflet API reference">well-documented API</a> and a simple, readable <a href="https://github.com/Leaflet/Leaflet" title="Leaflet GitHub repository">source code</a> that is a joy to <a href="https://github.com/Leaflet/Leaflet/blob/master/CONTRIBUTING.md" title="A guide to contributing to Leaflet">contribute</a> to.</p><p>Leaflet is designed with <em>simplicity</em>, <em>performance</em> and <em>usability</em> in mind. It works efficiently across all major desktop and mobile platforms out of the box, taking advantage of HTML5 and CSS3 on modern browsers while still being accessible on older ones. It can be extended with a huge amount of <a href="plugins.html">plugins</a>, has a beautiful, easy to use and <a href="reference.html" title="Leaflet API reference">well-documented API</a> and a simple, readable <a href="https://github.com/Leaflet/Leaflet" title="Leaflet GitHub repository">source code</a> that is a joy to <a href="https://github.com/Leaflet/Leaflet/blob/master/CONTRIBUTING.md" title="A guide to contributing to Leaflet">contribute</a> to.</p><p><b>Kartta-aineistot (Map data)</b></p><p class="lorem"><a href="https://www.openstreetmap.org/about">OpenStreetMap</a></p><p class="lorem"><a href="https://www.here.com/">HERE</a></p><p class="lorem"><a href="https://www.kapsi.fi/">Kapsi Internet-käyttäjät ry</a>: Maanmittauslaitoksen tausta-, perus- ja ilmakuvakartta-aineistot. <a href="https://www.maanmittauslaitos.fi/avoindata-lisenssi-versio1">Maanmittauslaitoksen avoimen tietoaineiston lisenssi 1.5.2012 - 15.1.2015</a></p><p class="lorem"><a href="https://vayla.fi/">Väylävirasto</a>: Tien päällyste -aineisto, <a href="https://creativecommons.org/licenses/by/4.0/deed.fi">Creative Commons 4.0</a></p><p class="lorem"><a href="https://www.ilmatieteenlaitos.fi/avoin-data">Ilmatieteen laitos</a>: Säädata -aineisto, <a href="https://creativecommons.org/licenses/by/4.0/deed.fi">Creative Commons 4.0</a></p><p class="lorem"><a href="https://www.rainviewer.com/">RainViewer</a>: Säädata -animaatio</p><p><b>Kirjastot (Libraries)</b></p><p class="lorem">Map by <a href="http://leafletjs.com/">Leaflet</a></p><p class="lorem"><a href="https://github.com/Turbo87/sidebar-v2">Sidebar</a> for Leaflet Turbo87</p><p class="lorem">Fonts by <a href="https://fontawesome.com/">Font Awesome</a></p><p><b>Reititys (Routing)</b></p><p class="lorem"><a href="https://www.liedman.net/leaflet-routing-machine/">Leaflet Routing Machine</a> with <a href="https://www.here.com/">HERE</a></p><p><b>Liittyvät lisenssit (related licenses)</b></p><p class="lorem"><a href="https://opensource.org/licenses/mit-license.php">MIT-lisenssi</a></p>'
	}).addTo(map);

	L.control.rainviewer({ 
		position: 'bottomleft',
		nextButtonText: '>',
		playStopButtonText: 'Päälle/Pois',
		prevButtonText: '<',
		positionSliderLabelText: "Tunti:",
		opacitySliderLabelText: "Läpinäkyvyys:",
		animationInterval: 300,
		opacity: 0.5
	}).addTo(map);

	workingSitesGroup.bindPopup(function (layer) {
		return L.Util.template('<p><strong>{title}</strong><br><br>Kunta: {primaryPointMunicipality}<br><br>Paikka {locationDescription}', layer.feature.properties);
	  },popupOptions);

	disturbances.bindPopup(function (layer) {
		return L.Util.template('<p><strong>{title}</strong><br><br>Kunta: {primaryPointMunicipality}<br><br>Paikka {locationDescription}', layer.feature.properties);
	},popupOptions);

	var speedLimitLegend = L.control({position: 'bottomright', minZoom: 10});
		speedLimitLegend.onAdd = function (map) {
		var div = L.DomUtil.create('div', 'info legend');

			div.innerHTML +=
			'<img src="https://julkinen.vayla.fi/oskari/action?action_route=GetLayerTile&legend=true&style=digiroad%3ADR_Nopeusrajoitus&id=319">';

		return div;
	};

	var roadCoverLegend = L.control({position: 'bottomright', minZoom: 10});
	roadCoverLegend.onAdd = function (map) {
		var div = L.DomUtil.create('div', 'info legend');

			div.innerHTML +=
			'<img src="https://julkinen.vayla.fi/oskari/action?action_route=GetLayerTile&legend=true&style=digiroad%3ADR_Paallystetty_tie_LUOKAT&id=322">';

		return div;
	};

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

	map.attributionControl.addAttribution('Icons by <a target="_blank" href="https://icons8.com">Icons8</a>, MIT License');
	