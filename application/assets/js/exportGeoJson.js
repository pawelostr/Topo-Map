const geojson = ((_) => {
  ///////////
  //save geoJson file
  /////////////////
  const save_geojson = function (file_path_name, type) {
    let extData;

    if (type == "single") {
      var single = selected_marker.toGeoJSON();
      // store popup content
      if (selectedmarker.popup != "" || selectedmarker.popup != undefined) {
        single.properties.popup = selectedmarker.popup;
      }

      extData = JSON.stringify(single);
    }

    if (type == "collection") {
      let collection = markers_group.toGeoJSON();
      let bounds = map.getBounds();

      collection.bbox = [
        [
          bounds.getSouthWest().lng,
          bounds.getSouthWest().lat,
          bounds.getNorthEast().lng,
          bounds.getNorthEast().lat,
        ],
      ];

      extData = JSON.stringify(collection);
    }

    let geojson_file = new Blob([extData], {
      type: "application/json",
    });
    let sdcard = navigator.getDeviceStorage("sdcard");
    let requestAdd = sdcard.addNamed(geojson_file, file_path_name);

    requestAdd.onsuccess = function () {
      toaster("succesfull saved", 3000);
      windowOpen = "map";
    };

    requestAdd.onerror = function () {
      toaster(
        "Unable to write the file, the file name may already be used",
        3000
      );
      windowOpen = "map";
    };
  };

  return {
    save_geojson,
  };
})();
