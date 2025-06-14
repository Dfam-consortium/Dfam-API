# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## 5.0.1 - 2025-06-11
- Fixed a bug where downloaded files would often not include the last few families from the search

## 5.0.0 - 2025-03-10
- Added the TE_idx subsystem for faster annotation retrieval

## 0.4.0  -
- 

## 0.3.11 - 2021-03-18
- Re-release for dependency updates

## 0.3.10 - 2021-03-18
### Fixed
- Certain errors in the search service now return error messages instead of a generic 500.

## 0.3.9 - 2021-10-04
### Changed
- The `cigar` field returned by the `/families/{id}/relationships` endpoint
  is now in the CIGAR format, not just CIGAR-inspired.

## 0.3.8 - 2021-07-16
### Fixed
- Fixed sorting by "type" or "subtype" fields in `/families`
- FASTA sequences submitted for sequence search with blank sequence names (i.e.
  ">\nACGT") are assumed to have the name "Input", "Input_1", etc., instead of
  failing to return any results.
- "Annotations" search results that overlapped the requested range but did not
  completely fit inside it were not included if they were on the '-' strand.
### Added
- `/families/{id}/annotation_stats`: New endpoint, providing the data from
  two endpoints in one query: `/families/{id}/assemblies` and
  `/families/{id}/assemblies/{assembly_id}/annotation_stats`.

## 0.3.7 - 2020-07-01
### Fixed
- Fixed calculation of species on `/taxa/coverage` endpoint.

## 0.3.6 - 2020-06-29
### Added
- `/families` (only in the "full" format) and `/families/{id}` include three new
  fields: `source_method`, `source_method_description`, and `source_assembly`.
  See `api/swagger/swagger.yaml` for more details.
- `/families/{id}/seed` now reports the average kimura divergence of the
  alignment if available.
- `/families` and `/families/{id}/relationships` have a new filter:
  `include_raw`
- `/families/{id}/relationships` has a new filter: `include`
- `/taxa/coverage`: New endpoint, reporting a count of leaf species which
  have Dfam entries assigned to them.
### Changed
- Some fields will be filled in with an accession where a "name" is usually
  specified, if the "name" is not available. This is done when the field is
  intended to be human-readable.
- Results for the `/families/{id}/relationship` endpoint are now limited to 300.

## 0.3.5 - 2020-03-05
### Fixed
- "Method not allowed" errors respond with a 405 error instead of 500

## 0.3.4 - 2020-01-09
### Fixed
- "Annotations" search now includes hits that overlap the requested range,
  in addition to hits that are fully contained within the range.
- Fixed a regression that caused `/families` with `format=full` to fail.

## 0.3.3 - 2019-11-04
### Added
- Added support for single sequence downloads in 'fasta' format:
  `/family/{id}/sequence?format=fasta`
- Added support for bulk downloads in 'fasta', 'embl', and 'hmm' formats
  via `/families`. This supports the same filtering and sorting options
  as the existing JSON output formats ('full' and 'summary').
### Changed
- Queries to `/families` will now fail if too many results would be returned from one query.
### Fixed
- Attempts to download invalid formats respond with a 400 error instead of a 500
- Citations will always be returned in the correct order

## 0.3.2 - 2019-06-20
### Added
- New endpoint '/taxa/{id}' to retrieve information on a single taxon
- Family objects now include a 'version' field
### Changed
- Updated handling of seed region names and positions
### Fixed
- Nonexistent search jobs are properly caught and handled as a 404

## 0.3.1 - 2019-04-25
### Fixed
- Fix stockholm formatter seed regions with duplicated positions (e.g. chr:1-5:1-5)
- Fix /families classification filter matching more than it was supposed to
- Use the search start date instead of job start date to find search results
- Use the SQL charset that matches our databases

## 0.3.0 - 2019-03-04
### Added
- Initial public release of the Dfam API.
