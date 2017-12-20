var beacons = {};  // Dictionary of beacons.
var SCAN_STOP_TIME = 60 * 1000; // 1 minute
//var DISTANCE_LIMIT = 1; // 1 metre(m)
var beaconsCount = 0;
var refreshInterval;
var stopTimeout;

var REFRESH_INTERVAL_TIME = 1000; //1 second

// This calls onDeviceReady when Cordova has loaded everything.
document.addEventListener('deviceready', onDeviceReady, false);
// Add back button listener (for Android).
document.addEventListener('backbutton', onBackButtonDown, false);

function onDeviceReady() {

	$('#scanBtn').on('click', onScanBtnPress);
	$('#stopBtn').on('click', onStopBtnPress);

}

function refreshCount() {
	removeOldBeacons();
	beaconsCount = 0;
	var beaconDistance;
	for (beacon in beacons) {
		beaconDistance = calculateAccuracy(beacons[beacon].rssi, beacons[beacon].txPower);
		//if (beaconDistance < DISTANCE_LIMIT) {
			beaconsCount++;
		//}
	}

	$('#beaconCount').text(beaconsCount);
}

function onScanBtnPress() {
	refreshInterval = setInterval(refreshCount, REFRESH_INTERVAL_TIME);
	$('#beaconInfo').hide();
	$('#found-beacons').html('');

	startScan();
	$('#initialDiv').hide();
	stopTimeout = setTimeout(stopScan, SCAN_STOP_TIME);
}

function onStopBtnPress() {
	stopScan();
}

function stopScan() {
	evothings.eddystone.stopScan();
	displayBeacons();

	clearInterval(refreshInterval);
	clearTimeout(stopTimeout);

	$('#initialDiv').show();
	$('#stopBtn').hide();
	$('.loader').hide();

	if (beaconsCount == 0) {
		$('#beaconCount').text('0');
		showMessage('No beacons found.');
	}
}

function onBackButtonDown() {
	evothings.eddystone.stopScan();
	navigator.app.exitApp();
}
function startScan() {
	$('#stopBtn').show();
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
			$('#stopBtn').hide();
			evothings.eddystone.stopScan();
			showMessage('Eddystone scan error: ' + error);
			$('#initialDiv').show();
		});
}

function getSortedBeaconListByDistance(beacons) { //Sort by least distance
	var beaconList = [];
	for (var key in beacons) {
		beaconList.push(beacons[key]);
	}
	beaconList.sort(function (beacon1, beacon2) {
		return calculateAccuracy(beacon1.rssi, beacon1.txPower) > calculateAccuracy(beacon2.rssi, beacon2.txPower);
	});
	return beaconList;
}

function removeOldBeacons() {
	var timeNow = Date.now();
	for (var key in beacons) {
		// Only show beacons updated during the last 1 second.
		var beacon = beacons[key];
		if (beacon.timeStamp + 1000 < timeNow) {
			delete beacons[key];
		}
	}
}

function displayBeacons() {
	var html = '';

	if (Object.keys(beacons).length > 0) {
		var sortedList = getSortedBeaconListByDistance(beacons);

		var beacon = sortedList[0];  // first index has the minimum distance.
		var distance = calculateAccuracy(beacon.rssi, beacon.txPower);
		var nid = uint8ArrayToString(beacon.nid) || null;
		var iid = uint8ArrayToString(beacon.bid) || null;

		//if (distance < DISTANCE_LIMIT) {
			$('#beaconInfo').show();
			var htmlBeacon =
				"<p>"
				+ htmlBeaconName(beacon)
				+ htmlBeaconNID(beacon)
				+ htmlBeaconBID(beacon)
				+ htmlBeaconRSSI(beacon)
				+ htmlBeaconAccuracy(beacon)
				+ "<br/>"
				+ "<button onclick=\"executePostRequest('" + nid + "','" + iid + "')\">Add Beacon</button>"
				+ "</p>";
			html += htmlBeacon;
		//}

		$('#found-beacons').append(html);
	}

}

function calculateAccuracy(rssi2, txPower2) {

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
		return Math.pow(ratio, 10) * 100;
	}
	else {
		var accuracy = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
		return accuracy * 100;

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
		'Distance: ' + calculateAccuracy(beacon.rssi, beacon.txPower) + '<br/>' : '';
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
	$('#message').text(text);
}

function showReqMessage(text) {
	$('#requestState').text(text);
}

function executePostRequest(nid, iid) {
	if (nid && iid) {
		showReqMessage("Posting data...")
		$('.loader').show();
		var nid = decodeURIComponent(nid.trim().replace(/\s/g, ''));
		var bid = decodeURIComponent(iid.trim().replace(/\s/g, ''));

		var url = "https://api.homelink.solutions/v1/addBeacon/index.asp?nid=" + nid + "&iid=" + iid;

		$.ajax({
			url: url,
			type: 'GET',
			async: true,
			error: function () {
				showReqMessage("Error :: fn:executePostRequest(), please check your interenet connection.");
				$('.loader').hide();


			},
			success: function (data) {
				$('.loader').hide();
				if (data && data.responseCode == '200') {
					showReqMessage("Beacon successfully added. NamespaceID: " + nid);
				} else {
					showReqMessage("Error adding beacon. NamespaceID: " + nid);
				}
			}
		});
		$('#requestState').show();
	}

}
