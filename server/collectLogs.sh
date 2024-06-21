#!/bin/bash
servers=("dfweb@dfweb1" "dfweb@dfweb2");
cutoffDate='2024-06-18';
downloadTime=$(date +%Y-%m-%d)-Export

echo Downloading Logs Newer Than $cutoffDate
for server in ${servers[@]}; do
    echo Downloading From $server
    # finds all /usr/local/www/Dfam/<epoch>/Dfam-API.log files newer than cutoff and concatenates them to a single log file
    ssh $server find /usr/local/www/Dfam/ -maxdepth 2 -regex .*\/[0-9]*\/Dfam-API.log -type f -newermt $cutoffDate -exec cat {} + >> $downloadTime.log
done

echo Logs Downloaded To $downloadTime.log
echo Converting The Log File To CSV
python3 ./logToCSV.py -i $downloadTime.log -o $downloadTime.cat

echo Sorting CSV
# preserve header, sort from line 2
# sort by date, then by time
(head -n 1 $downloadTime.cat && tail -n +2 $downloadTime.cat | sort -t , -k 1,1 -k 2,2) > $downloadTime.csv 
rm $downloadTime.cat $downloadTime.log

echo CSV Complete