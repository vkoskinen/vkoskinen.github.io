	if ('serviceWorker' in navigator) {
		window.addEventListener('load', () => {
		navigator.serviceWorker.register('../sw.js').then( () => {
		console.log('Service Worker Registered')
		})
	})
	}

	var map;
	var crs = L.TileLayer.MML.get3067Proj();
	var standUrl = 'https://rajapinnat.metsaan.fi/geoserver/Avoinmetsatieto/stand/wms';
	var habitatUrl = 'https://rajapinnat.metsaan.fi/geoserver/Avoinmetsatieto/habitat/wms';

    map = new L.map('map', {
		crs: crs
	}).setView([65, 27], 3);
                
	maastokartta= new L.tileLayer.mml_wmts({ layer: "maastokartta" }).addTo(map);
	maastokarttaMini= new L.tileLayer.mml_wmts({ layer: "maastokartta" });
	taustakartta = new L.tileLayer.mml_wmts({ layer: "taustakartta" });
	kiinteistojaotus = new L.tileLayer.mml_wmts({ layer: "kiinteistojaotus" });
	selkokartta = new L.tileLayer.mml_wmts({ layer: "selkokartta" });
	ortokuva = new L.tileLayer.mml_wmts({ layer: "ortokuva" });
	
	var stand = new L.tileLayer.betterWms(
	standUrl, 
	{
		layers: 'stand',
		transparent: true,
		format: 'image/png',
		info_format: 'text/plain',
		minZoom: 8
	});

	var habitats = new L.tileLayer.wms(
	habitatUrl, 
	{
		layers: 'habitat',
		transparent: true,
		format: 'image/png',
		info_format: 'text/plain',
		minZoom: 8,
		styles:'Avoinmetsatieto:Habitat feature class'
	});
	
	var habitatLegend = L.control({position: 'bottomleft', minZoom: 10});
		habitatLegend.onAdd = function (map) {
		var div = L.DomUtil.create('div', 'info legend');

			div.innerHTML +=
			'<img src="https://rajapinnat.metsaan.fi/geoserver/Avoinmetsatieto/habitat/ows?service=WMS&request=GetLegendGraphic&format=image%2Fpng&width=20&height=20&layer=habitat&style=Habitat%20feature%20class">';

		return div;
	};

	var chm = new L.tileLayer.wms(
		'https://rajapinnat.metsaan.fi/geoserver/Avoinmetsatieto/CHM_newest/wms', 
		{
		layers: 'CHM_newest',
		transparent: true,
		format: 'image/png',
		info_format: 'text/plain',
		minZoom: 8,
		styles:'Avoinmetsatieto:CHM classification style'
	 });
	 
	var chmLegend = L.control({position: 'bottomleft', minZoom: 10});
		chmLegend.onAdd = function (map) {
		var div = L.DomUtil.create('div', 'info legend');

			div.innerHTML +=
			'<img src="https://rajapinnat.metsaan.fi/geoserver/Avoinmetsatieto/CHM_newest/ows?service=WMS&request=GetLegendGraphic&format=image%2Fpng&width=20&height=20&layer=CHM_newest&style=CHM%20classification%20style">';

		return div;
	};
	
	var kiinteistotunnukset = new L.tileLayer.wms(
		'https://inspire-wms.maanmittauslaitos.fi/inspire-wms/CP/wms', 
		{
			layers: 'CP.CadastralParcel',
			transparent: true,
			format: 'image/png',
			minZoom: 8,
			styles:'CP.CadastralParcel.LabelOnReferencePoint'
	 });

	var overlays = {
		'Avoin metsätieto': stand,
		'Erityisen tärkeät elinympäristöt': habitats,
		'Kiinteistorajat': kiinteistojaotus,
		'Kiinteistotunnukset': kiinteistotunnukset,
		'Ilmakuva': ortokuva,
		'Puuston korkeus (m)': chm
	};
	
	var baseUrls = {
	  'Peruskartta': maastokartta,
	  'Taustakartta': taustakartta,
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
	
	L.control.coordinates({
			position:"bottomleft",
			useDMS:true,
			labelTemplateLat:"N {y}",
			labelTemplateLng:"E {x}",
			useLatLngOrder:true
	}).addTo(map);

	//Specify the layer for which you want to modify the opacity. Note that the setOpacityLayer() method applies to all the controls.
	//You only need to call it once. 
	var opacitySlider = new L.Control.opacitySlider();
    map.addControl(opacitySlider);
    opacitySlider.setOpacityLayer(stand);

	var miniMap = new L.Control.MiniMap(maastokarttaMini, { toggleDisplay: true, minimize: true}).addTo(map);

	L.control.locate().addTo(map);
		var position= L.Control.geocoder({
		position: 'bottomleft',
		attribution:'Powered by',
		collapsed: true,
		placeholder: 'Hae...',
		defaultMarkGeocode: true,
		showResultIcons: true,
		showUniqueResult: true,
		minZoom: 16,
		autocomplete:false,
		geocoder: L.Control.Geocoder.pelias({
		  serviceUrl: 'https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/v1/pelias/search?',
		  geocodingQueryParams: {
			'api-key':'a8a60737-7849-4969-a55e-7b83db77e13a',
			'sources': 'geographic-names'
		  }
		})
	}).addTo(map);  
	
	map.on('overlayadd', function (eventLayer) {
		if (eventLayer.name === 'Erityisen tärkeät elinympäristöt') {
			habitatLegend.addTo(map);
		}
	  })
	  
	map.on('overlayadd', function (eventLayer) {
		if (eventLayer.name === 'Puuston korkeus (m)') {
			chmLegend.addTo(map);
		}
	  })
	 
	 map.on('overlayremove', function(eventLayer){
		if (eventLayer.name === 'Erityisen tärkeät elinympäristöt'){
			 map.removeControl(habitatLegend);
		} 
	})
	
	map.on('overlayremove', function(eventLayer){
		if (eventLayer.name === 'Puuston korkeus (m)'){
			 map.removeControl(chmLegend);
		} 
	});