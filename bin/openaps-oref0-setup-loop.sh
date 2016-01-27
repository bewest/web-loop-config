#!/bin/bash -eu


PUMP=pump
CGM=cgm
BASE=$(dirname $OPENAPS_HOME)
MEDTRONIC_TRANSPORT=${MEDTRONIC_TRANSPORT-subg_rfspy}

MEDTRONIC_SERIAL=$1
DEXCOM_SERIAL=$2
NIGHTSCOUT_HOST=${NIGHTSCOUT_HOST-${3-'http://localhost:1337/'}}

function setup_mmeowlink ( ) {
SERIAL=$1
echo openaps vendor add mmeowlink.vendors.mmeowlink
echo openaps device add $PUMP mmeowlink subg_rfspy /dev/serial/by-id/usb-Nightscout* $SERIAL
}

function setup_dexcom_cable_device ( ) {
echo openaps device add $CGM dexcom
}

function setup_dexcom_ble_device ( ) {
SERIAL=$1
echo openaps vendor add openxshareble
echo openaps device add $CGM openxshareble
echo openaps use $CGM configure --serial $SERIAL

}

function setup_dexcom_glucose ( ) {
ADD="openaps report add"
cat <<EOT
$ADD monitor/glucose-raw.json JSON $CGM iter_glucose 20
$ADD monitor/glucose.json JSON tz rezone monitor/glucose-raw.json
EOT
}

function setup_common_devices ( ) {
MAKE="openaps device add"

  oref0_devices
cat <<EOT

openaps vendor add openapscontrib.timezones
$MAKE tz timezones
$MAKE units units

openaps vendor add openapscontrib.mmhistorytools
$MAKE mmhistorytools mmhistorytools

EOT
}

function oref0_devices ( ) {
cat <<EOT
openaps device add oref0 process oref0

openaps device add get-profile process --require "settings bg-targets insulin-sensitivities basal-profile max-iob" oref0 get-profile
openaps device add calculate-iob process --require "pump-history oref0-profile clock" oref0 calculate-iob
openaps device add determine-basal process --require "oref0-iob temp-basal glucose oref0-profile" oref0 determine-basal

EOT
}

function settings_reports ( ) {
MAKE="openaps report add"
cat <<EOT

# create settings reports
mkdir -p settings
$MAKE settings/settings.json JSON pump read_settings
$MAKE settings/bg-targets-raw.json JSON pump read_bg_targets
$MAKE settings/bg-targets.json JSON units bg_targets settings/bg-targets-raw.json

$MAKE settings/insulin-sensitivities-raw.json JSON pump read_insulin_sensitivities
$MAKE settings/insulin-sensitivities.json JSON units insulin_sensitivities settings/insulin-sensitivities-raw.json
$MAKE settings/selected-basal-profile.json JSON pump read_selected_basal_profile

EOT
}
function monitor_reports ( ) {
MAKE="openaps report add"
cat <<EOT
mkdir -p monitor

# add reports for frequently-refreshed monitoring data
$MAKE monitor/clock-raw.json JSON pump read_clock
$MAKE monitor/clock.json JSON tz clock monitor/clock-raw.json

$MAKE monitor/temp-basal-status.json JSON pump read_temp_basal

$MAKE monitor/pump-history-raw.json JSON pump iter_pump_hours 8
$MAKE monitor/pump-history.json JSON tz rezone  monitor/pump-history-raw.json

# $MAKE monitor/glucose.json JSON cgm iter_glucose 5
# $MAKE monitor/ns-glucose.json text ns-glucose shell
$MAKE model.json JSON pump model
$MAKE monitor/reservoir.json JSON pump reservoir
$MAKE monitor/status.json JSON pump read_status
$MAKE monitor/battery.json JSON pump read_battery_status


# oref0 reports
oref0-mint-max-iob 0 | tee max-iob.json
git add max-iob.json
mkdir oref0-monitor
mkdir oref0-predict
mkdir oref0-enacted

$MAKE oref0-monitor/profile.json text get-profile shell settings/settings.json settings/bg-targets.json settings/insulin-sensitivities.json settings/selected-basal-profile.json max-iob.json

$MAKE oref0-monitor/iob.json text calculate-iob shell monitor/pump-history.json oref0-monitor/profile.json monitor/clock.json

$MAKE oref0-predict/oref0.json text determine-basal shell oref0-monitor/iob.json monitor/temp-basal-status.json monitor/glucose.json oref0-monitor/profile.json

$MAKE oref0-enacted/enacted-temp-basal.json JSON pump set_temp_basal oref0-predict/oref0.json



EOT

}

function setup_aliases ( ) {
ADD="openaps alias add"

cat <<EOT

$ADD rm-warmup '! bash -c "rm -f model.json monitor/clock-raw.json monitor/clock.json > /dev/null"'
$ADD warmup "report invoke model.json monitor/clock-raw.json monitor/clock.json"
$ADD fail-warmup '! bash -c "sudo oref0-reset-usb; echo PREFLIGHT FAIL; sleep 120; exit 1"'
$ADD preflight '! bash -c "openaps rm-warmup && openaps warmup >/dev/null 2>/dev/null && grep -q T monitor/clock.json && echo PREFLIGHT OK || openaps fail-warmup"'

$ADD monitor-cgm "report invoke monitor/glucose-raw.json monitor/glucose.json"
$ADD monitor-pump-history "report invoke monitor/pump-history-raw.json monitor/pump-history.json"

# $ADD get-ns-glucose "report invoke monitor/ns-glucose.json"

$ADD get-basal-status "report invoke monitor/temp-basal-status.json"
$ADD get-pump-details "report invoke monitor/reservoir.json monitor/status.json monitor/battery.json"
$ADD get-settings "report invoke settings/bg-targets-raw.json settings/bg-targets.json settings/insulin-sensitivities-raw.json settings/insulin-sensitivities.json settings/selected-basal-profile.json settings/settings.json"

$ADD gather-pump-data '! bash -c "openaps get-basal-status; openaps get-pump-details; openaps monitor-pump-history;  openaps get-settings"'

# AKA monitor?
$ADD gather-clean-data '! bash -c "openaps monitor-cgm && openaps gather-pump-data"'

#$ADD get-bg '! bash -c "openaps monitor-cgm 2>/dev/null || ( openaps get-ns-glucose && grep -q glucose monitor/ns-glucose.json && mv monitor/ns-glucose.json monitor/glucose.json )"'
# $ADD wait-for-bg '! bash -c "touch monitor/glucose.json; cp monitor/glucose.json monitor/last-glucose.json; while(diff -q monitor/last-glucose.json monitor/glucose.json); do echo -n .; sleep 10; openaps get-bg >/dev/null; done"'

# AKA predict?
$ADD do-oref0 "report invoke oref0-monitor/profile.json oref0-monitor/iob.json oref0-predict/oref0.json "

# AKA enact?
$ADD enact-oref0 "report invoke oref0-enacted/enacted-temp-basal.json"

$ADD do-everything '! bash -c "openaps preflight && openaps gather-clean-data && openaps do-oref0 && openaps enact-oref0"'

EOT
}

function initialize_openaps ( ) {
cat <<EOT
cd $BASE
git init $OPENAPS_HOME
cd $OPENAPS_HOME
git config --local user.name "${GIT_AUTHOR_NAME}"
git config --local user.email "${GIT_AUTHOR_EMAIL}"
openaps init .
EOT
}

function generate ( ) {
(

initialize_openaps
case "$MEDTRONIC_TRANSPORT" in
  subg_rfspy)
    setup_mmeowlink $MEDTRONIC_SERIAL
    ;;
  *)
    logger -t $0 "unsupported MEDTRONIC_TRANSPORT=$MEDTRONIC_TRANSPORT"
    exit 1
    ;;
esac

setup_dexcom_ble_device $DEXCOM_SERIAL
setup_common_devices

settings_reports
monitor_reports
setup_dexcom_glucose

setup_aliases

)
}

echo ENVIRONMENT
env
generate | bash -

# ( generate | bash - ) 2>&1 | logger -t "$0" -

