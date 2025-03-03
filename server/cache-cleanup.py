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
logging.info(f'Running Cache Cleanup - {datetime.today().strftime("%Y-%m-%d %H:%M:%S")}')

logger = logging.getLogger('Cache-Cleanup')

for file in os.listdir(CACHE_DIR):
    file_path = CACHE_DIR + file
    atime = datetime.fromtimestamp(os.stat(file_path).st_atime, tz = None)
    crtime = datetime.fromtimestamp(os.stat(file_path).st_ctime, tz = None)
    size = os.stat(file_path).st_size
    elapsed_time = NOW - atime
    removed = 'Retained'

    # If file is expired
    if elapsed_time > DELTA:
        removed = 'Removed'
        os.remove(file_path)

    # If working file is empty and older than a few minutes, assume process failed
    elif file.endswith(".working") and size == 0 and NOW - crtime > timedelta(minutes=5):
        logger.error(f"Working File: {file} Empty")
        removed = 'Removed'
        os.remove(file_path)

    # If working file is full and older than half an hour, assume something went wrong
    elif file.endswith(".working") and size > 0 and NOW - crtime > timedelta(minutes=30):
        logger.error(f"Working File: {file} Full, Not Compressed")
        removed = 'Removed'
        os.remove(file_path)

        # check for presence of completed cache
        cache_file = file.replace(".working", '')
        if os.path.isfile(CACHE_DIR + cache_file):
            logger.error(f"Associated Cache File: {cache_file} Is Present")

    logger.info(f'{file} last accessed on {atime} - {removed}')
                                                                        