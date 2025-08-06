#!/bin/bash


input_file="api/openapi_cleaned.yaml"
output_file="api/openapi-with-prefix.yaml"

old_url="https://dfam.org/"
new_url="https://dfam.org/api"

sed "s|- url: $old_url|- url: $new_url|g" $input_file > $output_file

npx redocly build-docs "$output_file"

if [ $? -ne 0 ]; then
  echo "Error occurred during Redocly build."
  exit 1
fi

echo "Redocly documentation built successfully."

rm $output_file