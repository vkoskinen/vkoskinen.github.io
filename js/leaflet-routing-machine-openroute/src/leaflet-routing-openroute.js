/* @preserve
 *
 * Leaflet Routing Machine / OpenRoute Service
 * Version 0.1.10
 * 
 * Extends Leaflet Routing Machine with support for OpenRoute Service
 * https://openrouteservice.org/dev/#/api-docs/v2/directions/
 * 
 * ## Dependancies:
 * - Leaflet Routing Machine http://www.liedman.net/leaflet-routing-machine/
 * 
 * This plugin is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * This plugin is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
 * See the GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>
 * 
 * Copyright (c) 20Z0 Gérald Niel (https://framagit.org/gegeweb)
 * 
 * @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL-v3-or-later
 */

(function(factory) {
	// Packaging/modules magic dance
	var L;
	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['leaflet'], factory);
	} else if (typeof module !== 'undefined') {
		// Node/CommonJS
		L = require('leaflet');
		module.exports = factory(L);
	} else {
		// Browser globals
		if (typeof window.L === 'undefined')
			throw 'Leaflet must be loaded first';
		if (typeof window.L.Routing === 'undefined')
			throw 'Leaflet Routing Machine must be loaded first'
		factory(window.L);
	}
}(function(L) {
	'use strict';
	L.Routing = L.Routing || {};
	L.routing = L.routing || {};

	L.Routing.OpenRouteService = L.Class.extend({
		version: '0.1.9',
		options: {
			"timeout": 30 * 1000, // 30"
			"host": "https://api.openrouteservice.org",
			"service": "directions",
			"api_version": "v2",
			"profile": "cycling-road",
			"routingQueryParams": {
				"attributes": [
					"avgspeed",
					"percentage"
				],
				"language": "fr-fr",
				"maneuvers": "true",
				"preference": "recommended",
			}
		},

		initialize: function(token, options) {
			L.Util.setOptions(this, options);
			this._token = token;
		},

		route: function(waypoints, callback, context, options) {

			let timedOut = false,
				wps = [],
				timer,
				coords = [],
				opts = this.options || {},
				params = opts.routingQueryParams || {};

			timer = setTimeout(function() {
				timedOut = true;
				callback.call(context || callback, {
					status: -1,
					message: 'OpenRoute Service request timed out.'
				});
			}, opts.timeout);


			// Create a copy of the waypoints, since they
			// might otherwise be asynchronously modified while
			// the request is being processed.
			waypoints.forEach((wp) => {
				let c = wp.latLng;
				wps.push({
					latLng: wp.latLng,
					name: wp.name,
					options: wp.options
				});
				// Array of waypoints [lng, lat] to be passed to
				// the route request 
				coords.push([c.lng, c.lat]);
			});
			// Add the array of coords (wp) to the requests
			L.extend(params, { coordinates: coords });

			let request = this._requestPost(params);

			request.then(datas => {
					if (!timedOut) {
						clearTimeout(timer);
						if (datas.error) {
							let err = datas.error;
							datas.response.then(resp => {
								try {
									if (resp) {
										resp = JSON.parse(resp);
										err.status = resp.error.code;
										err.message = resp.error.message;
									}
									callback.call(context || callback, {
										status: err.status || -1,
										message: err.message,
									});
								} catch (e) {
									console.error(e);
								}
							});
						} else {
							if (opts.format == 'gpx')
								callback.call(context || callback, datas);
							else
								this._routeDone(datas, wps, callback, context)
						}
					}
				})
				.catch(err => {
					if (!timedOut) {
						clearTimeout(timer);
						callback.call(context || callback, {
							status: err.status || -1,
							message: err.message,
						});
					}
				});

			return this;
		},

		_requestPost(params) {

			let url = this._buildUrl(),
				headers = this._setHeaders(),
				opts = {
					method: 'POST',
					headers: headers,
					body: JSON.stringify(params)
				},
				format = this.options.format;

			const promise = fetch(url, opts)
				.then(response => {
					if (response.ok) {
						if (format == 'gpx') {
							return response.text();
						} else
							return response.json();
					} else {
						let status = response.status,
							message = response.statusText,
							err = new Error(message);
						err.status = status;
						return { error: err, response: response.text() }
					}
				});

			return promise;
		},

		/**
		 * Build the Url of service
		 * by default if not defined in opts :
		 * // https://api.openrouteservice.org/v2/directions/cyling_road
		 * 
		 * @param {Object} opts (optional)
		 * 
		 * @return {String} url
		 */
		_buildUrl: function(opts) {
			opts = opts || this.options;
			let url = opts.host || "https://api.openrouteservice.org";
			url += `/${(opts.api_version || "v2")}`;
			url += `/${(opts.service || "directions")}`;
			url += `/${(opts.profile || "cycling_road")}`;
			url += opts.format ? `/${opts.format}` : '';

			return url;
		},

		/**
		 * Set the Headers
		 * 
		 * @param {String} api_key (optionnal)
		 * 
		 * @returns {Object} headers 
		 */
		_setHeaders: function(api_key) {
			api_key = api_key || this._token;
			let headers = new Headers();
			headers.append('Accept', 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8');
			headers.append('Content-Type', 'application/json');
			headers.append('Authorization', api_key);

			return headers;
		},

		_routeDone: function(datas, inputWaypoints, callback, context) {

			// **** DEBUG ****
			//console.log(datas);
			// **** DEBUG ****

			let alts = [],
				format = this.options.format,
				isgeoJSON = format === 'geojson',
				routes = isgeoJSON ? datas.features : datas.routes;

			// **** DEBUG ****
			// console.log(routes);
			// **** DEBUG ****

			routes.forEach((route, idr) => {
				let geom = route.geometry,
					instructions = [],
					summary = isgeoJSON ? route.properties.summary : route.summary,
					way_points = isgeoJSON ? route.properties.way_points : route.way_points,
					segments = isgeoJSON ? route.properties.segments : route.segments,
					opts = this.options.routingQueryParams,
					elevation = (opts.elevation === 'true' || opts.elevation === true),
					coordinates = isgeoJSON ? geom.coordinates : this._decodePolyline(geom, elevation),
					speed = this._bikeSpeed(this.options.profile), // speed in km/h
					multi = 3.6;
				// durations are in meter/s and distance in km 
				// so duration = ( distance / (speed * 1000) ) * 3600
				// we can symplify: duration = ( distance / speed ) * 3.6

				if (isgeoJSON) {
					let tmp = new Array(coordinates.length);
					coordinates.forEach((c, i) => {
						let latlng = [c[1], c[0]];
						if (elevation)
							latlng.push(c[2] != 'unedifned' ? c[2] : null);
						tmp[i] = L.latLng(latlng);
					});
					coordinates = tmp;
				}

				let routeWaypoints = new Array(way_points.length);
				for (let i = 0; i < way_points.length; i++) {
					routeWaypoints[i] = coordinates[way_points[i]];
				}

				// **** DEBUG ****
				// console.log(routeWaypoints);
				// **** DEBUG ****

				segments.forEach((segment, ids) => {
					let steps = segment.steps,
						lastsegment = ids == segments.length - 1;
					steps.forEach((step, idx) => {
						let laststep = idx == steps.length - 1,
							arrive = (lastsegment && laststep),
							startseg = (idx == 0 && ids > 0);

						instructions.push({
							idseg: ids + 1,
							distance: step.distance,
							time: (step.distance / speed) * multi, // overide step.duration
							road: step.name === '-' ? '' : step.name,
							text: step.instruction || null,
							icon: this._typeToIcon(step.type, arrive, startseg),
							type: step.type,
							exit: step.exit_number || null,
							modifier: this._typeToModifier(step.type, arrive, startseg), //arrive ? 'arrive' : startseg ? 'continue' : step.type === 11 ? 'head' : '',
							direction: this._bearingToDirection(step.maneuver.bearing_after),
							index: step.way_points[0],
						});

						// ***** DEBUG ******
						// console.log(ids, idx, step.type, instructions[idx].type, step.instruction)
						// ***** DEBUG ******
					});
				});
				alts.push({
					name: 'Initinéraire',
					coordinates: coordinates,
					instructions: instructions,
					summary: {
						totalTime: (summary.distance / speed) * multi, // overide summary.duration
						totalDistance: summary.distance,
						totalAscend: isgeoJSON ? route.properties.ascent : summary.ascent,
						totalDescend: isgeoJSON ? route.properties.descent : summary.descent
					},
					inputWaypoints: inputWaypoints,
					waypoints: this._toWaypoints(inputWaypoints, routeWaypoints),
					waypointIndices: way_points
				});

				// **** DEBUG ****
				// console.log(alts);
				// **** DEBUG ****
			});
			callback.call(context, null, alts);
		},

		/**
		 * Return the estimated avg speed from profile (bike type)
		 * 
		 * @param {String} bike
		 * 
		 * @returns {Number} speed in km/h 
		 */
		_bikeSpeed: function(bike) {
			bike = bike || 'cycling-road';
			let speed = this.options.bikespeed || {
				'cycling-road': 25,
				'cycling-regular': 20,
				'cycling-mountain': 15,
				'cycling-electric': 25,
			}
			return speed[bike] || speed['cycling-regular'];
		},

		/**
		 * Alias public method for _bikeSpeed()
		 * 
		 * @param {String} bike 
		 * 
		 * @returns {Number} speed in km/h
		 */
		bikeSpeed: function(bike) {
			return this._bikeSpeed(bike);
		},

		/**
		 * Bearing To Direction
		 * 
		 * This is adapted from the Leaflet Routing Machine implementation
		 * @see https://github.com/perliedman/leaflet-routing-machine/blob/master/src/osrm-v1.js
		 * 
		 * @param {Number} bearing
		 * @return {String} 
		 */
		_bearingToDirection: function(bearing) {
			var oct = Math.round(bearing / 45) % 8;
			return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][oct];
		},

		_typeToIcon: function(type, arrive, startseg) {
			/** 
			 *   0 - Turn left
			 *   1 - Turn right
			 *   2 - Turn sharp left
			 *   3 - Turn sharp right
			 *   4 - Turn slight left
			 *   5 - Turn slight right
			 *   6 - Continue
			 *   7 - Enter roundabout
			 *   8 - Exit roundabout
			 *   9 - U-turn
			 *   10 - Finish
			 *   11 - Depart
			 *   12 - Keep left
			 *   13 - Keep right
			 *   14 - Unknown
			 */
			let icon = {
				'0': 'turn-left',
				'1': 'turn-right',
				'2': 'sharp-left',
				'3': 'sharp-right',
				'4': 'bear-left',
				'5': 'bear-right',
				'6': 'continue',
				'7': 'enter-roundabout',
				'8': 'exit-roundabout',
				'9': 'u-turn',
				'10': arrive ? 'arrive' : 'via',
				'11': startseg ? 'startseg' : 'depart',
				'12': 'turn-left',
				'13': 'turn-right',
				'14': 'unknown'
			}

			return icon[type] || 'unknown';

		},

		_typeToModifier: function(type, arrive, startseg) {
			let modifier = {
				'0': 'Left',
				'1': 'Right',
				'2': 'SharpLeft',
				'3': 'SharpRight',
				'4': 'SlightLeft',
				'5': 'SlightRight',
				'6': 'Continue',
				'7': 'Roundabout',
				'8': 'Roundabout',
				'9': 'TurnAround',
				'10': arrive ? 'DestinationReached' : 'WaypointReached',
				'11': startseg ? 'Continue' : 'Head',
				'12': 'Left',
				'13': 'Right',
				'14': 'Onto'
			}

			return modifier[type] || 'Onto'

		},

		/**
		 * Decode an x,y or x,y,z encoded polyline
		 * @param {*} encodedPolyline
		 * @param {Boolean} includeElevation - true for x,y,z polyline
		 * @returns {Array} of L.latLng() coordinates
		 * 
		 * @see https://github.com/GIScience/openrouteservice-docs#geometry-decoding
		 */
		_decodePolyline: (encodedPolyline, includeElevation) => {
			// array that holds the points
			let points = []
			let index = 0
			const len = encodedPolyline.length
			let lat = 0
			let lng = 0
			let ele = 0
			while (index < len) {
				let b
				let shift = 0
				let result = 0
				do {
					b = encodedPolyline.charAt(index++).charCodeAt(0) - 63 // finds ascii
						// and subtract it by 63
					result |= (b & 0x1f) << shift
					shift += 5
				} while (b >= 0x20)

				lat += ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1))
				shift = 0
				result = 0
				do {
					b = encodedPolyline.charAt(index++).charCodeAt(0) - 63
					result |= (b & 0x1f) << shift
					shift += 5
				} while (b >= 0x20)
				lng += ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1))

				if (includeElevation) {
					shift = 0
					result = 0
					do {
						b = encodedPolyline.charAt(index++).charCodeAt(0) - 63
						result |= (b & 0x1f) << shift
						shift += 5
					} while (b >= 0x20)
					ele += ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1))
				}
				try {
					let location = [(lat / 1E5), (lng / 1E5)]
					if (includeElevation) location.push((ele / 100))
					points.push(L.latLng(location)); //points.push(location)
				} catch (e) {
					console.log(e)
				}
			}
			return points
		},

		_toWaypoints: function(inputWaypoints, vias) {
			let wps = [];
			for (let i = 0; i < vias.length; i++) {

				wps.push(new L.Routing.Waypoint(vias[i],
					inputWaypoints[i].name,
					inputWaypoints[i].options));
			}

			return wps;
		},
	});

	L.routing.openrouteservice = function(token, options) {
		return new L.Routing.OpenRouteService(token, options);
	};

	/**
	 * Copyright (c) 20Z0 Gérald Niel (https://framagit.org/gegeweb)
	 * 
	 * Some parts of the code below:
	 * Copyright (c) 2014-2019 Per Liedman (https://github.com/perliedman)
	 * 
	 * Originaly under ISC Licence:
	 * Permission to use, copy, modify, and/or distribute this software for any purpose 
	 * with or without fee is hereby granted, provided that the above copyright notice 
	 * and this permission notice appear in all copies.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH 
	 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY 
	 * AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, 
	 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM 
	 * LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR 
	 * OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE 
	 * OF THIS SOFTWARE.
	 */
	L.Routing.FormatterORS = L.Routing.Formatter.extend({
		/**
		 * Icon name
		 *
		 * @param {String} type
		 * @returns {String}
		 */
		getIconName: function(instr, i) {
			return instr.icon;
		},

		formatInstruction: function(instr, i) {
			let text = instr.text || null;
			if (!text || this.options.steptotext) {
				text = this.capitalize(L.Util.template(this._getInstructionTemplate(instr, i),
					L.extend({}, instr, {
						exitStr: instr.exit ? this._localization.localize('formatOrder')(instr.exit) : '',
						dir: this._localization.localize(['directions', instr.direction]),
						modifier: this._localization.localize(['directions', this.capitalize(instr.modifier)]),
						idseg: instr.idseg
					})));
			}
			return text;
		},

		formatTime: function(t /* Number (seconds) */ ) {
			var un = this.options.unitNames || this._localization.localize('units');

			let hours = t / 3600,
				min = (hours % 1) * 60,
				sec = (min % 1) * 60;
			hours = Math.floor(hours);
			hours = t > 3600 ? this._formatNum(hours, un.hours) : '';
			min = Math.floor(min);
			min = t > 60 ? this._formatNum(min, un.minutes) : '';
			sec = Math.floor(sec);
			sec = this._formatNum(sec, un.seconds);

			return hours + min + sec;
		},

		_formatNum: function(number, unit) {
			let prefix = number < 10 ? '0' : '';
			return prefix + number + (unit || '');
		},

		_getInstructionTemplate: function(instr, i) {
			let strings = this._localization.localize(['instructions', this.capitalize(instr.modifier)]);
			if (!strings)
				strings = [
					this._localization.localize(['directions', instr.modifier]),
					' ' + this._localization.localize(['instructions', 'Onto'])
				];
			return strings[0] + (strings.length > 1 && instr.road ? strings[1] : '');
		},

	});

	L.routing.formatterORS = function(options) {
		return new L.Routing.FormatterORS(options);
	};

}));
// @license-end