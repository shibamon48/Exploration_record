const apiKey = gon.map_api_key
let map;
let drawingManager;
let placeIdArray = [];
let polylines = [];
var snappedPolylines = [];
let snappedPathvalues = [];
let editPathValues = [];
let snappedCoordinates = [];
var start_button = document.getElementById('start');
var spot_button = document.getElementById('spot');
var spot_complete = document.getElementById('spot_complete');
var dottedPolyline = null;
let mypathValues = gon.mypathValues;
let isPolylineSelected = false;
const input = document.getElementById("pac-input");
const searchBox = new google.maps.places.SearchBox(input);
const buttonOpen = document.getElementById('modalOpen');
const modal = document.getElementById('easyModal');
const buttonClose = document.getElementsByClassName('modalClose')[0];
const editAnounce = document.getElementById('editAnounce');
// なんだこの量...

function initialize() {
  let spots = gon.spots;
  let mypathValues = gon.mypathValues;
  let mapOptions = {
    zoom: 16,
    center: {lat: 35.661796, lng: 139.697436},
    disableDefaultUI: true
  };
  map = new google.maps.Map(document.getElementById('map'), mapOptions);
  start_button.style.display = 'block';
  
  if (mypathValues != null) {
      for ( let i = 0; i < mypathValues.length; i++) {
        let snappedCoordinates = mypathValues[i];
        drawSnappedPolyline(snappedCoordinates);
      }
  }

  // 検索バーを右上に表示
  map.controls[google.maps.ControlPosition.RIGHT_TOP].push(
      document.getElementById('bar'));
  let autocomplete = new google.maps.places.Autocomplete(
      document.getElementById('autoc'));
  autocomplete.bindTo('bounds', map);
  autocomplete.addListener('place_changed', function() {
    let place = autocomplete.getPlace();
    map.fitBounds(place.geometry.viewport);
    if (place.geometry.viewport) {
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(17);
    }
  });

  // 描画ツールの設定
  drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: null,
    drawingControl: false,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_CENTER,
      drawingModes: [
        google.maps.drawing.OverlayType.POLYLINE
      ]
    },
    polylineOptions: {
      strokeColor: '#696969',
      strokeWeight: 2,
      strokeOpacity: 0.3,
    }
  });
  drawingManager.setMap(map);
  
  // ポリラインを描画したらsnapToRoadを実行
  // poly=ポリライン、path=ポリラインの座標
  drawingManager.addListener('polylinecomplete', function(poly) {
    const path = poly.getPath();
    polylines.push(poly);
    placeIdArray = [];
    runSnapToRoad(path);
  });

  start_button.addEventListener('click', function() {
    start_button.style.display = 'none';
    drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYLINE);
    let completeButton;
    if (!completeButton) { // 完了ボタンあれば表示しない
      showCompleteButton();
    }
  });

  // スポットを設置
  spots.forEach((spot) => {
    const marker = new google.maps.Marker({
      position: { lat: spot.latitude, lng: spot.longitude },
      map: map,
    });
    // マーカーにデータを持たせる
    marker.spotData = {
      name: spot.name,
      review: spot.review,
      photo: spot.photo_url,
      latitude: spot.latitude,
      longitude: spot.longitude
    };
  
    // クリックイベントでデータを使用
    google.maps.event.addListener(marker, 'click', function() {
      const data = marker.spotData;
      
      document.querySelector('#spotInfo').style.display = 'block';
  
      // 画像表示の処理
      if (data.photo) {
        document.querySelector('#new_image').src = data.photo;
      } else {
        document.querySelector('#new_image').src = ''; // 画像がない場合の処理
      }
  
      // その他のデータと閉じるボタンを表示
      document.querySelector('#spot_name').value = data.name;
      document.querySelector('#spot_review').value = data.review;
      document.querySelector('#lat').value = data.latitude;
      document.querySelector('#lng').value = data.longitude;  
      const infoClose = document.querySelector('#infoClose');
      infoClose.addEventListener('click', function() {
        spotInfo.style.display = 'none';
      });

      // 更新機能
      document.querySelector('#update_form').addEventListener('click', function(e) {
        e.preventDefault(); // ページ遷移を防ぐ
        const form = document.getElementById('spot_form');
        const formData = new FormData(form);
        fetch(`/update_spot_data/${spot.id}`, {
          method: 'PATCH',
          headers: {
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
          },
          body: formData
        })
        .then(response => response.json())
        .then(data => {
          document.getElementById('spotInfo').style.display = 'none';
        })
        .catch(error => console.error(error));
        spotInfo.style.display = 'none';
      });
    });
  });


  // スポット作成ボタンがクリックされた時
  spot_button.addEventListener('click', function() {
    spot_button.style.display = 'none';
    google.maps.event.addListener(map, 'click', event => clickListener(event, map));
    spot_complete.style.display = 'block';
    spot_complete.addEventListener('click', function() {
      spot_button.style.display = 'block';
      spot_complete.style.display = 'none';
      google.maps.event.clearListeners(map, 'click');
    });
  });


  // ボタンがクリックされた時
  buttonOpen.addEventListener('click', modalOpen);
  function modalOpen() {
    modal.style.display = 'block';
  }

  // バツ印がクリックされた時
  buttonClose.addEventListener('click', modalClose);
  function modalClose() {
    modal.style.display = 'none';
  }

  // モーダルコンテンツ以外がクリックされた時
  addEventListener('click', outsideClose);
  function outsideClose(e) {
    if (e.target == modal) {
      modal.style.display = 'none';
    }
  }
}

function showCompleteButton() {
    const complete = document.getElementById('complete');
    complete.style.display = 'block';

    complete.addEventListener('click', completed);
}

function completed() {
  alert('完了しました');
  drawingManager.setDrawingMode(null);
  const complete = document.getElementById('complete');
  complete.style.display = 'none';
  complete.removeEventListener('click', completed);
  editAnounce.style.display = 'none';
  if (dottedPolyline) {
    dottedPolyline.setMap(null);
    dottedPolyline = null;}
  }

// ポリラインをAPIに投げて実際の道路にスナップさせ、描画
// getAtでLatLngを取得, toUrlValueで緯度経度を文字列に変換
function runSnapToRoad(path) {
  var pathValues = [];
  for (var i = 0; i < path.getLength(); i++) {
    pathValues.push(path.getAt(i).toUrlValue());
  }
  fetch(`https://roads.googleapis.com/v1/snapToRoads?interpolate=true&key=${apiKey}&path=${pathValues.join('|')}`)
    .then(response => response.json())
    .then(data => {
      processSnapToRoadResponse(data);
      drawSnappedPolyline(snappedCoordinates);
      start_button.style.display = 'block';
      savePolylines(snappedPolyline);
      snappedPolylines.push(snappedPolyline);
      clearPolyline();
    });
}

// ポリラインをAPIに投げた結果を処理
function processSnapToRoadResponse(data) {
  snappedCoordinates = [];
  placeIdArray = [];
    for (var i = 0; i < data.snappedPoints.length; i++) {
      var latlng = new google.maps.LatLng(
          data.snappedPoints[i].location.latitude,
          data.snappedPoints[i].location.longitude);
      snappedCoordinates.push(latlng);    
  };
}

//　スナップされたポリラインを描画 
function drawSnappedPolyline(snappedCoordinates) {
    snappedPolyline = new google.maps.Polyline({
    path: snappedCoordinates,
    strokeColor: '#4169e1',
    strokeWeight: 7,
    strokeOpacity: 0.6,
    clickable: true,
  });

  snappedPolyline.setMap(map);
  if (dottedPolyline) {
    dottedPolyline.setMap(null);
    dottedPolyline = null;
  }

  // ポリラインにクリックイベントを付与
  google.maps.event.addListener(snappedPolyline, 'click', function(event) {
    if (isPolylineSelected) {
      return;
    }
    isPolylineSelected = true;
    let editPathValues = [];

    let path = this.getPath();
    for (let i = 0; i < path.getLength(); i++) {
      editPathValues.push(path.getAt(i));
    }

    // 点線の記入
    const lineSymbol = {
      path: "M 0,-1 0,1",
      strokeColor: '#ff4500',
      strokeOpacity: 0.8,
      scale: 4,
    };
    dottedPolyline = new google.maps.Polyline({
      path: editPathValues,
      strokeOpacity: 0,
      icons: [
        {
          icon: lineSymbol,
          offset: '0',
          repeat: '20px'
        },
      ]
    });

    this.setMap(null);
    dottedPolyline.setMap(map);


    start_button.style.display = 'none';
    // ここでルート作成される
    drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYLINE);
    editAnounce.style.display = 'block';
    showCompleteButton();
    deleteOldPath(editPathValues);
    isPolylineSelected = false;
    start_button.style.display = 'block';
  });
}

//クリックされたポリラインを削除
function deleteOldPath(editPathValues) {
  fetch('/route', {
    method: "DELETE",
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
    },
    body: JSON.stringify(editPathValues),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
  })
  .catch(error => console.error('Error:', error));
}

function clearPolyline() {
  for (var i = 0; i < polylines.length; ++i) {
    polylines[i].setMap(null);
  }
  polylines = [];
  return false;
}

function savePolylines(snappedPolyline) {
  let snappedPath = snappedPolyline.getPath();
  for(let i = 0; i < snappedPath.getLength(); i++) {
      snappedPathvalues.push(snappedPath.getAt(i));
  }
  fetch('/route', {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
    },
    body: JSON.stringify(snappedPathvalues),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
  })
  .catch(error => console.error('Error:', error));
}

// スポットを設置
function clickListener(event, map) {
  const lat = event.latLng.lat();
  const lng = event.latLng.lng();
  const marker = new google.maps.Marker({
    position: {lat, lng},
    map,
  });
  // スポットにクリックイベントを追加
  marker.addListener('click', function() {
    // フォームを初期化
    document.querySelector('#spot_name').value = '';
    document.querySelector('#spot_review').value = '';
    document.querySelector('#new_image').src = '';
    
    const spotInfo = document.querySelector('#spotInfo');
    spotInfo.style.display = 'block';

    const infoClose = document.querySelector('#infoClose');
    infoClose.addEventListener('click', function() {
      spotInfo.style.display = 'none';
    });
    
  });
  document.querySelector('#save_form').addEventListener('click', function(e) {
      e.preventDefault(); // ページ遷移を防ぐ

      document.querySelector('#lat').value = lat;
      document.querySelector('#lng').value = lng;
      const form = document.getElementById('spot_form');
      const formData = new FormData(form);
      // const data = {
      //   name: formData.get('name'),
      //   review: formData.get('review'),
      //   photo: formData.get('photo').name,
      //   latitude: lat,
      //   longitude: lng,
      // };
      fetch('/save_spot_data', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        },
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        document.getElementById('spotInfo').style.display = 'none';
      })
      .catch(error => console.error(error));
      spotInfo.style.display = 'none';
    });  
}


// ページ読み込み時にinitializeを実行
window.addEventListener('turbo:load', function(){
  window.setTimeout(initialize, 200);
});
