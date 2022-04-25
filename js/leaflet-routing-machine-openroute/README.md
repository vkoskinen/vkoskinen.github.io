# Leaflet Routing Machine - OpenRoute Service

Extends [Leaflet Routing Machine](http://www.liedman.net/leaflet-routing-machine/) with support for [OpenRoute Service](https://openrouteservice.org/).

This plugin is used (it was developed for this) in the [SCASB - Calcul itinéraires vélo](https://parcours.scasb.org) map (works stil in progress…).

## How to use / Install
### Required prerequisites
1. Get an [OpenRoute Service](https://openrouteservice.org/) api key
2. Install [Leaflet Routing Machine](http://www.liedman.net/leaflet-routing-machine/) in your project
3. Download or clone this repository and copy the files `leaflet-routing-machine-openroute/dist/*` in your project. 

### Node.js
#### Install
```
npm install @gegeweb/leaflet-routing-machine-openroute
```
### Build
```
npm run-script build
```

### Browser
#### 1. include javascript
```
<head>
…
<!-- Leaflet -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@latest/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css" />
<script src="https://unpkg.com/leaflet@latest/dist/leaflet.js"></script>
<!-- Leaflet Routing Machine -->
<script src="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.min.js"></script>
<!-- Leaflet Routing Machine - OpenRoute Service -->
<script src="https://unpkg.com/@gegeweb/leaflet-routing-machine-openroute@latest/dist/leaflet-routing-openroute.min.js"></script>
…
</head>
```
#### 2. initialise the router
```
// ROUTING
// the plugin allow to setting the requesting format
// but at this time, gpx doesn't works.
const osrRouter = L.Routing.openrouteservice(apikey, {
        "timeout": 30 * 1000, // 30",
        "format": "json",                           // default, gpx not yet supported
        "host": "https://api.openrouteservice.org", // default if not setting
        "service": "directions",                    // default (for routing) 
        "api_version": "v2",                        // default
        "profile": "cycling-road",                  // default
        "routingQueryParams": {
            "attributes": [
                "avgspeed",
                "percentage"
            ],
            "language": "fr-fr",
            "maneuvers": "true",
            "preference": "recommended",
        }
});
```
For the `routingQueryParams` options please refer to the [API Playground](https://openrouteservice.org/dev/#/api-docs/v2/directions/{profile}/json/post) or [documentation](https://github.com/GIScience/openrouteservice-docs#examples).

Be careful! The example refer to the v1 API, for the v2 API you must use array instead of strings of arguments separed by '|'.

for `profil: cycling-*`:
```
"routingQueryParams": {
    "avoid_features": [
        "hills",
        "unpavedroads",
    ],
    "profile_params": {
        "weightings": {
            "steepness_difficulty": {
                "level": 3
            },
        "restrictions": {
            "gradient": 15
        }
    }
},
```

#### 3. declare the router in the [L.Routing.Control](http://www.liedman.net/leaflet-routing-machine/api/#l-routing-control)
*See the [official API documentation](http://www.liedman.net/leaflet-routing-machine/api/#l-routing-control) for further details.*
```
L.Routing.control({
    …
    router: osrRouter,
    formatter: L.routing.formatterORS({
        …
        language: 'fr',     // language of instructions & control ui
        steptotext: true,   // force using internal formatter instead of ORS instructions
    }),
    …
}).addTo(map);
```

## Dependancies
- [Leaflet Routing Machine](http://www.liedman.net/leaflet-routing-machine/) plugin.

## Acknowledgements
Special thanks to [@Sp3r4z](https://framagit.org/Sp3r4z). ;)

And of course, a big thank you to the [OpenRoute Service](https://openrouteservice.org/) team (developers, system administrators...) for providing this service for free and for the development.

And also to [Per Liedman](https://github.com/perliedman) for the [Leaflet Routing Machine](http://www.liedman.net/leaflet-routing-machine/) plugin.