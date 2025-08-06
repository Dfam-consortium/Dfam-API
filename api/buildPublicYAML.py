#!/usr/bin/env python3
import yaml

with open("openapi.yaml") as f:
    spec = yaml.safe_load(f)

# Remove specific endpoints
paths_to_remove = [
    "/altcha",
    "/families/{id}/dfam_relationships",
    "/families/{id}/protein_alignments",
    "/families/{id}/self_alignments",
    "/families/{id}/tandem_repeats"
]

schemas_to_remove = [
    "altchaResponse",
    "TandemRepeatSearchResponse",
    "TandemRepeatSearchResponse_repeats_inner",
    "SelfAlignmentSearchResponse",
    "SelfAlignmentSearchResponse_alignments_inner",
    "ProteinAlignmentSearchResponse",
    "ProteinAlignmentSearchResponse_hits_inner",
    "FamilyRelationshipSearchResponse",
    "FamilyRelationshipSearchResponse_inner"
]

for key in paths_to_remove:
    spec.get("paths", {}).pop(key, None)

for key in schemas_to_remove:
    spec.get("components", {}).get("schemas", {}).pop(key, None)

with open("openapi_cleaned.yaml", "w") as f:
    yaml.dump(spec, f, sort_keys=False)
