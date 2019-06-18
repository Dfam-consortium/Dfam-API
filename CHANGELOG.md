# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## 0.3.2
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
