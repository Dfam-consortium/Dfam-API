import os
from datetime import datetime, timedelta
import json
 
current_directory = os.path.dirname(os.path.abspath(__file__))
# dfweb Config file
config_dir = current_directory + '/dfam.conf'
# Dev config file
# config_dir = current_directory + '/../Conf/dfam-rel.conf'

with open(config_dir) as f:
    config = json.load(f)

CACHE_DIR = config['dfamdequeuer']['result_store'] + '/browse-cache/'
NOW = datetime.now()
DELTA = timedelta(days=10)

for file in os.listdir(CACHE_DIR):
    file_path = CACHE_DIR + file
    atime = datetime.fromtimestamp(os.stat(file_path).st_atime, tz = None)
    elapsed_time = NOW - atime
    if elapsed_time > DELTA:
        os.remove(file_path)
