#!/bin/bash
FILE="src/Bot.ts"
REMOVE="dist/"
LOGFILE="bot.log"
while true; do
    if [ -f $FILE ]; then
        echo "$FILE found, starting Bot..."
        echo "Bot started @ $(date)" >>restart.log
        if [ -d $REMOVE ]; then
            echo "Removing old dist/ folder..."
            rm -rf $REMOVE
        fi
        git pull && yarn && echo "Booting bot output sent to $LOGFILE" && yarn start
        echo "Bot detected in a crashed or stopped state, beginning restart process..."
        echo "Bot stoped or crashed @ $(date)" >>restart.log
        echo "Restarting in 3 seconds"
        sleep 1
        echo "Restarting in 2 seconds"
        sleep 1
        echo "Restarting in 1 seconds"
        sleep 1
        echo "Restarting now"
        sleep 1
    else
        echo "$FILE not found, waiting for it..."
        sleep 5
    fi
done
