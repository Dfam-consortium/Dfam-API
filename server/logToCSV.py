#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""
This script accepts a log file from the Dfam API and converts it into a CSV. 
It can be used as a standalone script, but it is intended to be called by 
the collectLogs.sh bash script after concatenating all relevent log files 
from each webserver.
"""
import sys
import json
import csv
import argparse

FIELDS = [
    "date",
    "time",
    "type",
    "message",
    "method",
    "endpoint",
    "params",
    "res_code",
    "res_time",
    "client_ip",
]


def main(*args):
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("-i", "--input-file", required=True)
    parser.add_argument("-o", "--output-file", required=True)
    parser.add_argument("-e", "--error-file", default="ErrorLines.txt")
    args = parser.parse_args()

    err_lines = []
    with open(args.output_file, "w") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=FIELDS)
        writer.writeheader()
        with open(args.input_file, "r") as log:
            for line in log.readlines():
                try:
                    log_line = json.loads(line)
                    csv_line = {
                        field: log_line[field] if field in log_line else None
                        for field in FIELDS
                    }
                    writer.writerow(csv_line)
                except:
                    err_lines.append(line)

    if err_lines:
        with open(args.error_file, "w") as f:
            f.writelines(err_lines)


if __name__ == "__main__":
    main(*sys.argv)
