#!/bin/bash -eu


PUMP=pump
CGM=cgm
BASE=$(dirname $OPENAPS_HOME)

function setup_mmeowlink ( ) {
SERIAL=$1
echo openaps vendor add mmeowlink.vendors.mmeowlink
echo openaps device add $PUMP subg_rfspy /dev/serial/by-id/usb-Nightscout* $SERIAL
}

function setup_dexcom_cable_device ( ) {
echo openaps device add $CGM dexcom
}

function setup_dexcom_ble_device ( ) {
SERIAL=$1
echo openaps vendor add openxshareble
echo openaps device add $CGM openxshareble
echo openaps use $CGM openxshareble

}

function monitor_reports ( ) {
MAKE="openaps report add"
cat <<EOT
mkdir monitor
$MAKE monitor/bg-targets-raw.json JSON $PUMP read_bg_targets
$MAKE monitor/bg-targets.json JSON units bg_targets 
EOT

}

(
cd $BASE

setup_mmeowlink $1
setup_dexcom_ble_device $2

monitor_reports


)

echo ENVIRONMENT
env
