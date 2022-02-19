call curl -d "@q1.json" -X POST https://overpass-api.de/api/interpreter -o cafes.json
call curl -d "@q2.json" -X POST https://overpass-api.de/api/interpreter -o fuels.json
call osmtogeojson fuels.json > fuel.geojson
call osmtogeojson cafes.json > cafe.geojson
call minify-geojson -w "name, url, website, opening_hours" C:\vkoskinen.github.io\data\cafe.geojson
call minify-geojson -w "name, url, website, opening_hours" C:\vkoskinen.github.io\data\fuel.geojson
