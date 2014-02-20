#!/bin/sh
# loads and runs the chrome-apps test
#
/opt/X11/bin/Xvfb :99 -ac &
PID_XVFB="$!"
export DISPLAY=:99
exec /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --load-and-launch-app=$1  --no-startup-window
kill -9 $PID_VFB

