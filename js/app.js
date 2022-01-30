	if ('serviceWorker' in navigator) {
		window.addEventListener('load', () => {
		navigator.serviceWorker.register('../sw.js').then( () => {
		console.log('Service Worker Registered')
		})
	})
	}

	var map;
	var crs = L.TileLayer.MML.get3067Proj();

    map = new L.map('map', {
		crs: crs
	}).setView([65, 27], 3);
                
	maastokartta= new L.tileLayer.mml_wmts({ layer: "maastokartta" });
	maastokarttaMini= new L.tileLayer.mml_wmts({ layer: "maastokartta" });
	taustakartta = new L.tileLayer.mml_wmts({ layer: "taustakartta" }).addTo(map);
	selkokartta = new L.tileLayer.mml_wmts({ layer: "selkokartta" });

	 roadCover = L.tileLayer.wms("https://julkinen.vayla.fi/inspirepalvelu/avoin/wms?", {
    	layers: 'TL137',
        format: 'image/png',
        transparent: true,
        attribution: "Väylävirasto",
		minZoom: 8
    });

	speedLimit = L.tileLayer.wms("https://julkinen.vayla.fi/inspirepalvelu/digiroad/ows?", {
    	layers: 'DR_NOPEUSRAJOITUS',
        format: 'image/png',
        transparent: true,
        attribution: "Väylävirasto",
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
		
	L.control.layers(
		baseUrls, 
		overlays,
		{
		collapsed: true,
		autoZIndex: false
		}
	).addTo(map);
	
	var miniMap = new L.Control.MiniMap(maastokarttaMini, { toggleDisplay: true, minimize: true}).addTo(map);


	// disturbances.on('click', function (e) {
	// document.getElementById('info-pane').innerHTML = 'Hover to Inspect';
	// });

	// disturbances.on('click', function (e) {
	// document.getElementById('info-pane').innerHTML = e.layer.feature.properties.title;
	// });
	
	workingSitesGroup.bindPopup(function (layer) {
		return L.Util.template('<p><strong>{title}</strong><br><br>Kunta: {primaryPointMunicipality}<br><br>Paikka {locationDescription}.', layer.feature.properties);
	  });

	disturbances.bindPopup(function (layer) {
		return L.Util.template('<p><strong>{title}</strong><br><br>Kunta: {primaryPointMunicipality}<br><br>Paikka {locationDescription}.', layer.feature.properties);
	});