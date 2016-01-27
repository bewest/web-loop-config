#!/bin/bash -eu

function generate_cron ( ) {
cat <<EOT
SHELL=/bin/bash
PATH=$PATH


*/5 * * * * (cd $OPENAPS_HOME && openaps do-everything) 2>&1 | logger -t openaps-loop

EOT
}

OP=${1-''}

case "${OP}" in
  --dry|-n|print)
    generate_cron
    ;;
  *)
    generate_cron | crontab -
    ;;
esac
