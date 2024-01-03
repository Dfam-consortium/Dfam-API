import os
from datetime import datetime, timedelta
import json
import logging

# current_directory = os.path.dirname(os.path.abspath(__file__))
config_dir = '/local/usrlocal/www/Dfam/Conf/dfam.conf'

with open(config_dir) as f:
    config = json.load(f)

CACHE_DIR = config['dfamdequeuer']['result_store'] + '/browse-cache/'
NOW = datetime.now()
DELTA = timedelta(days=10)

logging.basicConfig(filename='/webresults/cache-cleanup.log',
        filemode='a',
        format='%(asctime)s,%(msecs)d %(name)s %(levelname)s %(message)s',
        datefmt='%H:%M:%S',
        level=logging.INFO
)
logging.info('Running Cache Cleanup')

logger = logging.getLogger('Cache-Cleanup')

for file in os.listdir(CACHE_DIR):
    file_path = CACHE_DIR + file
    atime = datetime.fromtimestamp(os.stat(file_path).st_atime, tz = None)
    elapsed_time = NOW - atime
    removed = 'Retained'
    if elapsed_time > DELTA:
        removed = 'Removed'
        os.remove(file_path)

    logger.info(f'{file} last accessed on {atime} - {removed}')
                                                                        