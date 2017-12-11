jQuery.ajaxSetup({ async: false });

// Dictionary of beacons.
var beacons = {};
// Timer that displays list of beacons.
var timer = null;
var SCAN_STOP_TIME = 10 * 1000; // 1 minute
var DISTANCE_LIMIT = 1; // 1 metre(m)

// This calls onDeviceReady when Cordova has loaded everything.
document.addEventListener('deviceready', onDeviceReady, false);
// Add back button listener (for Android).
document.addEventListener('backbutton', onBackButtonDown, false);

function onDeviceReady() {
	// Start tracking beacons!
	//setTimeout(startScan, 500);

	//setTimeout(updateBeaconList, 1000); // first call to udpate beacon list after 1 sec.

	// Timer that refreshes the display every x seconds.
	//		var x = 1;
	//	timer = setInterval(updateBeaconList, 1000 * x);

	$('#scanBtn').click(onScanBtnPress);

}
function onScanBtnPress() {

	$('#beaconInfo').hide();
	$('#found-beacons').html('');

	startScan();
	$('#initialDiv').hide();
	setTimeout(function () {
		$('.loader').hide();
		updateBeaconList();
		evothings.eddystone.stopScan();
		$('#initialDiv').show();

		showMessage('Scan stopped.');
		if(Object.keys(beacons).length == 0){
			showMessage('No beacons found.');
		}
	}, SCAN_STOP_TIME);
}
function onBackButtonDown() {
	evothings.eddystone.stopScan();
	navigator.app.exitApp();
}
function startScan() {

	$('.loader').show();
	$('#requestState').hide();
	showMessage('Scan in progress...');
	evothings.eddystone.startScan(
		function (beacon) {
			// Update beacon data.
			beacon.timeStamp = Date.now();
			beacons[beacon.address] = beacon;
		},
		function (error) {
			$('.loader').hide();
			evothings.eddystone.stopScan();
			showMessage('Eddystone scan error: ' + error);
			$('#initialDiv').show();
		});
}
// Map the RSSI value to a value between 1 and 100.
function mapBeaconRSSI(rssi) {
	if (rssi >= 0) return 1; // Unknown RSSI maps to 1.
	if (rssi < -100) return 100; // Max RSSI
	return 100 + rssi;
}
function getSortedBeaconList(beacons) {
	var beaconList = [];
	for (var key in beacons) {
		beaconList.push(beacons[key]);
	}
	beaconList.sort(function (beacon1, beacon2) {
		return mapBeaconRSSI(beacon1.rssi) < mapBeaconRSSI(beacon2.rssi);
	});
	return beaconList;
}
function getSortedBeaconListByDistance(beacons) {
	var beaconList = [];
	for (var key in beacons) {
		beaconList.push(beacons[key]);
	}
	beaconList.sort(function (beacon1, beacon2) {
		return calculateAccuracy(beacon1) < calculateAccuracy(beacon2);
	});
	return beaconList;
}
function updateBeaconList() {
	removeOldBeacons();
	displayBeacons();
}
function removeOldBeacons() {
	var timeNow = Date.now();
	for (var key in beacons) {
		// Only show beacons updated during the last 60 seconds.
		var beacon = beacons[key];
		if (beacon.timeStamp + 60000 < timeNow) {
			delete beacons[key];
		}
	}
}

function displayBeacons() {
	var html = '';

	if (Object.keys(beacons).length > 0) {

		var sortedList = getSortedBeaconListByDistance(beacons);

		var timeNow = Date.now();

		//	for (var i = 0; i < sortedList.length; ++i) {
		var beacon = sortedList[0];  // first index has the minimum distance.
		var distance = calculateBeaconDistance(beacon);
		var nid = uint8ArrayToString(beacon.nid) || null;
		var bid = uint8ArrayToString(beacon.bid) || null;

		if (distance < DISTANCE_LIMIT) {
			$('#beaconInfo').show();
			var htmlBeacon =
				"<p>"
				+ htmlBeaconName(beacon)
				//+ htmlBeaconURL(beacon)
				+ htmlBeaconNID(beacon)
				+ htmlBeaconBID(beacon)
				//+ htmlBeaconEID(beacon)
				//+ htmlBeaconVoltage(beacon)
				//+ htmlBeaconTemperature(beacon)
				+ htmlBeaconRSSI(beacon)
				+ htmlBeaconAccuracy(beacon)
				+ "<br/>"
				+ "<button onclick=\"executePostRequest('" + nid + "','" + bid + "')\">Add Beacon</button>"
				+ "</p>";
			html += htmlBeacon;
		}

		//	var bUrl = "http://beacon.homelink.solutions/3/?b=";
		//	bUrl = bUrl + decodeURIComponent(apiBeaconNID(beacon).trim());
		//	callWebservice(bUrl);

		//	}
		$('#found-beacons').append(html);
	} 

}

function calculateBeaconDistance(beacon) {
	var accuracy = calculateAccuracy(beacon);
	var distance = accuracy.toFixed(3);
	distance = distance * 100;
	return distance;
}

function calculateAccuracy(beacon) {
	var rssi2 = beacon.rssi
	var txPower2 = beacon.txPower

	if (!rssi2 || rssi2 >= 0 || !txPower2) {
		return null
	}
	// Algorithm
	// http://developer.radiusnetworks.com/2014/12/04/fundamentals-of-beacon-ranging.html
	// http://stackoverflow.com/questions/21338031/radius-networks-ibeacon-ranging-fluctuation
	// The beacon distance formula uses txPower at 1 meters, but the Eddystone
	// protocol reports the value at 0 meters. 41dBm is the signal loss that
	// occurs over 1 meter, so we subtract that from the reported txPower.

	var ratio = rssi2 * 1.0 / (txPower2 - 41);

	if (ratio < 1.0) {
		return Math.pow(ratio, 10);
	}
	else {
		var accuracy = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
		return accuracy;

		//var finalq = rssi2 + txPower2

		//return beacon.url ?
		//'rssi2: ' + accuracy + '<br/>' :  '';

	}
}


function apiBeaconNID(beacon) {
	return beacon.nid ?
		'' + uint8ArrayToString(beacon.nid) + '' : '';
}
function apiBeaconRSSI(beacon) {
	return beacon.rssi ?
		'' + beacon.rssi + '' : '';
}
function apiBeaconBID(beacon) {
	return beacon.bid ?
		'' + uint8ArrayToString(beacon.bid) + '' : '';
}
function apiBeaconVoltage(beacon) {
	return beacon.voltage ?
		'' + beacon.voltage + '' : '';
}
function apiBeaconTxPower(beacon) {
	return beacon.txPower ?
		'' + beacon.txPower + '' : '';
}
function apiBeaconName(beacon) {
	return beacon.name ?
		'' + beacon.name + '' : '';
}

function htmlBeaconName(beacon) {
	var name = beacon.name || 'No name';
	return '<strong>' + name + '</strong><br/>';
}
function htmlBeaconURL(beacon) {
	return beacon.url ?
		'URL: ' + beacon.url + '<br/>' : '';
}
function htmlBeaconURL(beacon) {
	return beacon.url ?
		'URL: ' + beacon.url + '<br/>' : '';
}
function htmlBeaconNID(beacon) {
	return beacon.nid ?
		'Namespace ID: ' + uint8ArrayToString(beacon.nid) + '<br/>' : '';
}
function htmlBeaconBID(beacon) {
	return beacon.bid ?
		'Instance ID: ' + uint8ArrayToString(beacon.bid) + '<br/>' : '';
}
function htmlBeaconEID(beacon) {
	return beacon.eid ?
		'EID: ' + uint8ArrayToString(beacon.eid) + '<br/>' : '';
}
function htmlBeaconVoltage(beacon) {
	return beacon.voltage ?
		'Voltage: ' + beacon.voltage + '<br/>' : '';
}
function htmlBeaconTemperature(beacon) {
	return beacon.temperature && beacon.temperature != 0x8000 ?
		'Temperature: ' + beacon.temperature + '<br/>' : '';
}
function htmlBeaconRSSI(beacon) {
	return beacon.rssi ?
		'RSSI: ' + beacon.rssi + '<br/>' : '';
}
function htmlBeaconAccuracy(beacon) {
	return beacon.rssi ?
		'Accuracy: ' + calculateAccuracy(beacon) + '<br/>' : '';
}

function uint8ArrayToString(uint8Array) {
	function format(x) {
		var hex = x.toString(16);
		return hex.length < 2 ? '0' + hex : hex;
	}
	var result = '';
	for (var i = 0; i < uint8Array.length; ++i) {
		result += format(uint8Array[i]) + ' ';
	}
	return result;
}
function showMessage(text) {
	document.querySelector('#message').innerHTML = text;
}

function showReqMessage(text) {
	document.querySelector('#requestState').innerHTML = text;
}

function executePostRequest(nid, bid) {
	if (nid && bid) {
		showReqMessage("Posting data...")

		var nid = decodeURIComponent(nid.trim().replace(/\s/g, ''));
		var bid = decodeURIComponent(bid.trim().replace(/\s/g, ''));
	
		var url = "http://api.homelink.solutions/v1/addBeacon/?nid=" + nid + "&iid=" + bid;
		$.get(url, function (data) {
			showReqMessage("Beacon successfully added. NamespaceID: " + nid);
		}).fail(function () {
			showReqMessage("Error :: executePostRequest(), please check your interenet connection.");
		});
		$('#requestState').show();
	}

}
