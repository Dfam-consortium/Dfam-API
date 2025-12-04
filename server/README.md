## API Server Tools
**cache-cleanup.py** - This script deletes old cache files that are either incomplete or over a certain age in the `webresults/browse-cache` folder served to the webservers.  The script is run on the NFS server as a cronjob.

**API_Reporter.R** - An R shiny script that displays usage data loaded from a CSV file generated from the API logs. Currently, the CSV is loaded from a url and is hard-coded

**runShiny.sh** - A bash script that launches `API_Reporter.R` to port 10011

**logToCSV.py** - A python script that parses the JSON formatted lines of the API logs into a CSV file

**collectLogs.sh** -  A bash script that collects logs from after a certain cutoff date from `dfweb1` and `dfweb2`, concatenates, then sorts them into a single CSV file.

### API Log Workflow:
```
# Run on repeatmasker
# Change Cutoff Date on line 3 of collectLogs.sh
./collectLogs.sh
# Change line 402 of API_Reporter.R to the name of the new CSV (today's date)
./runShiny.sh
# Navigate to http://10.2.9.26:10011 in a browser
```
