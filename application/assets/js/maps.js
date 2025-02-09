////////////////////
////MAPS////////////
///////////////////
const maps = (() => {
  ///MARKER ICON
  const follow_icon = L.divIcon({
    iconSize: [40, 40],
    iconAnchor: [30, 40],
    className: "follow-marker",
    html: '<div class="ringring"></div><div class="follow"></div>',
  });

  const tracking_icon = L.divIcon({
    iconSize: [40, 40],
    iconAnchor: [30, 40],
    className: "tracking-marker",
    html: '<div class="ringring"></div><div class="tracking"></div>',
  });

  const default_icon = L.icon({
    iconUrl: "assets/css/images/marker-icon.png",
    iconSize: [25, 40],
    iconAnchor: [15, 40],
  });

  const select_icon = L.icon({
    iconUrl: "assets/css/images/marker-icon.png",
    iconSize: [25, 40],
    iconAnchor: [15, 40],
    className: "marker-1",
  });

  const goal_icon = L.divIcon({
    iconSize: [40, 40],
    iconAnchor: [30, 40],
    className: "goal-marker",
    html: '<div class="ringring"></div><div class="goal"></div>',
  });

  //caching settings from settings panel
  let caching_time;

  if (localStorage.getItem("cache-time") != null) {
    caching_time = Number(localStorage.getItem("cache-time")) * 86400000;
  } else {
    caching_time = 86400000;
  }
  if (localStorage.getItem("cache-zoom") != null) {
    zoom_depth = localStorage.getItem("cache-zoom");
  } else {
    zoom_depth = 12;
  }

  let caching_events = function () {
    // Listen to cache hits and misses and spam the console
    tilesLayer.on("tilecachehit", function (ev) {
      //console.log("Cache hit: ", ev.url);
    });
    tilesLayer.on("tilecachemiss", function (ev) {
      //console.log("Cache miss: ", ev.url);
    });
    tilesLayer.on("tilecacheerror", function (ev) {
      console.log("Cache error: ", ev.tile, ev.error);
    });
  };

  let caching_tiles = function () {
    if (status.caching_tiles_started) return false;
    let swLat = map.getBounds()._southWest.lat;
    let swLng = map.getBounds()._southWest.lng;
    let neLat = map.getBounds()._northEast.lat;
    let neLng = map.getBounds()._northEast.lng;

    var bbox = L.latLngBounds(L.latLng(swLat, swLng), L.latLng(neLat, neLng));
    tilesLayer.seed(bbox, 0, zoom_depth);

    top_bar("", "downloading", "");

    // Display seed progress on console
    tilesLayer.on("seedprogress", function (seedData) {
      status.caching_tiles_started = true;
      var percent =
        100 -
        Math.floor((seedData.remainingLength / seedData.queueLength) * 100);
      console.log("Seeding " + percent + "% done");
      if (percent > 90) status.caching_tiles_started = false;
      document.querySelector("div#top-bar div.button-center").innerText =
        percent + "%";
    });
    tilesLayer.on("seedend", function (seedData) {
      document.querySelector("div#top-bar div.button-center").innerText =
        "Downloads finished";
      caching_tiles_started = false;
      setTimeout(() => {
        top_bar("", "", "");
      }, 2000);
    });

    tilesLayer.on("error", function (seedData) {
      caching_tiles_started = false;

      document.querySelector("div#top-bar div.button-center").innerText =
        seedData;
    });

    tilesLayer.on("seedstart", function (seedData) {
      document.querySelector("div#top-bar div.button-center").innerText =
        seedData;
    });
  };

  let delete_cache = function () {
    tilesLayer._db
      .destroy()
      .then(function (response) {
        toaster("map cache deleted", 3000);
      })
      .catch(function (err) {
        console.log(err);
      });
  };

  let attribution = function () {
    document.querySelector(".leaflet-control-attribution").style.display =
      "block";
    setTimeout(function () {
      document.querySelector(".leaflet-control-attribution").style.display =
        "none";
    }, 8000);
  };

  let overlayer = "";

  let addMap = function (url, attribution, max_zoom, type) {
    console.log(url, attribution, max_zoom, type);
    //map
    if (type == "map") {
      if (map.hasLayer(tilesLayer)) {
        map.removeLayer(tilesLayer);
      }

      tilesLayer = L.tileLayer(url, {
        useCache: true,
        saveToCache: false,
        crossOrigin: true,
        cacheMaxAge: caching_time,
        useOnlyCache: false,
        maxZoom: max_zoom,
        attribution: attribution,
      });

      map.addLayer(tilesLayer);
      caching_events();
      localStorage.setItem("last_map", url);

      if (helper.isOnline == true) {
        tilesLayer.on("tileerror", function (error, tile) {
          url = url.replace("{z}", "1");
          url = url.replace("{y}", "1");
          url = url.replace("{x}", "1");

          //helper.allow_unsecure(url);
        });
      }

      document.querySelector(".leaflet-control-attribution").style.display =
        "block";
      setTimeout(function () {
        document.querySelector(".leaflet-control-attribution").style.display =
          "none";
      }, 8000);
    }
    //overlayer
    if (type == "overlayer") {
      if (map.hasLayer(overlayer)) {
        map.removeLayer(overlayer);
        return false;
      }

      overlayer = L.tileLayer(url);

      map.addLayer(overlayer);
      caching_events();
    }
  };

  map.on("layeradd", function (event) {
    if (map.hasLayer(overlayer)) {
      overlayer.bringToFront();
      return false;
    }
  });

  function formatDate(date, format) {
    const map = {
      mm: date.getMonth() + 1,
      dd: date.getDate(),
      yy: date.getFullYear().toString().slice(-2),
      yyyy: date.getFullYear(),
    };

    return format.replace(/mm|dd|yy|yyy/gi, (matched) => map[matched]);
  }

  let markers_group_eq = new L.FeatureGroup();
  let earthquake_layer = function () {
    top_bar("", "", "");
    if (map.hasLayer(markers_group_eq)) {
      map.removeLayer(markers_group_eq);
      return false;
    }

    const today = new Date();
    const two_days_before = new Date(Date.now() - 24 * 3600 * 1000);

    fetch(
      "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=" +
        formatDate(two_days_before, "yy-mm-dd") +
        "&endtime=" +
        formatDate(today, "yy-mm-dd")
    )
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        L.geoJSON(data, {
          // Marker Icon
          pointToLayer: function (feature, latlng) {
            if (feature.properties.type == "earthquake") {
              let t = L.marker(latlng, {
                icon: L.divIcon({
                  html: '<i class="eq-marker"></i>',
                  iconSize: [10, 10],
                  className: "earthquake-marker",
                }),
              });
              t.addTo(markers_group_eq);
              map.addLayer(markers_group_eq);

              status.windowOpen = "map";
            }
          },

          // Popup
          onEachFeature: function (feature, layer) {
            console.log(feature);
          },
        }).addTo(map);

        top_bar(
          "",
          formatDate(two_days_before, "yy-mm-dd") +
            " - " +
            formatDate(today, "yy-mm-dd"),
          ""
        );
      });
  };

  let formDat = function (timestamp) {
    (date = new Date(timestamp * 1000)),
      (datevalues = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: String(date.getMinutes()).padStart(2, "0"),
        sec: date.getSeconds(),
      });

    return datevalues;
  };

  let running = false;
  let k;
  let weather_layer,
    weather_layer0,
    weather_layer1,
    weather_layer2,
    weather_layer3;

  function weather_map() {
    let weather_url;
    if (running == true) {
      top_bar("", "", "");
      map.removeLayer(weather_layer);
      map.removeLayer(weather_layer0);
      map.removeLayer(weather_layer1);
      map.removeLayer(weather_layer2);
      map.removeLayer(weather_layer3);
      clearInterval(k);
      running = false;
      return false;
    }

    fetch("https://api.rainviewer.com/public/maps.json")
      .then(function (response) {
        running = true;
        return response.json();
      })
      .then(function (data) {
        weather_url =
          "https://tilecache.rainviewer.com/v2/radar/" +
          data[data.length - 5] +
          "/256/{z}/{x}/{y}/2/1_1.png";
        weather_layer = L.tileLayer(weather_url);

        weather_url0 =
          "https://tilecache.rainviewer.com/v2/radar/" +
          data[data.length - 4] +
          "/256/{z}/{x}/{y}/2/1_1.png";
        weather_layer0 = L.tileLayer(weather_url0);

        weather_url1 =
          "https://tilecache.rainviewer.com/v2/radar/" +
          data[data.length - 3] +
          "/256/{z}/{x}/{y}/2/1_1.png";
        weather_layer1 = L.tileLayer(weather_url1);

        weather_url2 =
          "https://tilecache.rainviewer.com/v2/radar/" +
          data[data.length - 2] +
          "/256/{z}/{x}/{y}/2/1_1.png";
        weather_layer2 = L.tileLayer(weather_url2);

        weather_url3 =
          "https://tilecache.rainviewer.com/v2/radar/" +
          data[data.length - 1] +
          "/256/{z}/{x}/{y}/2/1_1.png";
        weather_layer3 = L.tileLayer(weather_url3);

        map.addLayer(weather_layer);
        map.addLayer(weather_layer0);
        map.addLayer(weather_layer1);
        map.addLayer(weather_layer2);
        map.addLayer(weather_layer3);

        let i = -1;
        k = setInterval(() => {
          i++;

          if (i == 0) {
            map.addLayer(weather_layer);
            map.removeLayer(weather_layer0);
            map.removeLayer(weather_layer1);
            map.removeLayer(weather_layer2);
            map.removeLayer(weather_layer3);
            let t = formDat(data[data.length - 5]);
            top_bar(
              "",
              t.year +
                "." +
                t.month +
                "." +
                t.day +
                ", " +
                t.hour +
                ":" +
                t.minute,
              ""
            );
          }

          if (i == 1) {
            map.removeLayer(weather_layer);
            map.addLayer(weather_layer0);
            map.removeLayer(weather_layer1);
            map.removeLayer(weather_layer2);
            map.removeLayer(weather_layer3);
            let t = formDat(data[data.length - 4]);
            top_bar(
              "",
              t.year +
                "." +
                t.month +
                "." +
                t.day +
                ", " +
                t.hour +
                ":" +
                t.minute,
              ""
            );
          }

          if (i == 2) {
            map.removeLayer(weather_layer);
            map.removeLayer(weather_layer0);
            map.addLayer(weather_layer1);
            map.removeLayer(weather_layer2);
            map.removeLayer(weather_layer3);
            let t = formDat(data[data.length - 3]);
            top_bar(
              "",
              t.year +
                "." +
                t.month +
                "." +
                t.day +
                ", " +
                t.hour +
                ":" +
                t.minute,
              ""
            );
          }

          if (i == 3) {
            map.removeLayer(weather_layer);
            map.removeLayer(weather_layer0);
            map.removeLayer(weather_layer1);
            map.addLayer(weather_layer2);
            map.removeLayer(weather_layer3);
            let t = formDat(data[data.length - 2]);
            top_bar(
              "",
              t.year +
                "." +
                t.month +
                "." +
                t.day +
                ", " +
                t.hour +
                ":" +
                t.minute,
              ""
            );
          }
          if (i == 4) {
            map.removeLayer(weather_layer);
            map.removeLayer(weather_layer0);
            map.removeLayer(weather_layer1);
            map.removeLayer(weather_layer2);
            map.addLayer(weather_layer3);
            let t = formDat(data[data.length - 1]);
            top_bar(
              "",
              t.year +
                "." +
                t.month +
                "." +
                t.day +
                ", " +
                t.hour +
                ":" +
                t.minute,
              ""
            );
          }
          if (i == 5) {
            i = -1;
          }
        }, 2000);
      })
      .catch(function (err) {
        if (helper.isOnline == true) {
          helper.allow_unsecure("https://api.rainviewer.com/public/maps.json");
          toaster("Can't load weather data" + err, 3000);
        }
      });
  }
  return {
    follow_icon,
    default_icon,
    goal_icon,
    select_icon,
    tracking_icon,
    attribution,
    earthquake_layer,
    weather_map,
    caching_tiles,
    delete_cache,
    addMap,
  };
})();
