#!/bin/bash -eu

DEVICE=$1
( cd $OPENAPS_HOME

case "${DEVICE}" in
  pump)
    openaps report invoke model.json 2> /dev/null > /dev/null
    cat model.json | json
    ;;
  cgm)
    (
    openaps report show | grep GetFirmwareHeader || openaps report add cgm-vendor.json JSON cgm GetFirmwareHeader
    openaps report invoke cgm-vendor.json
    ) 2>&1 > /dev/null
    cat cgm-vendor.json | json ProductName
    ;;
esac
)

