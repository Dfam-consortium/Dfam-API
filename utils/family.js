/*
 * Dfam Family Functions/Data Structures
 *
 */
const dfam = require("../databases").getModels_Dfam();
const dfam_user = require("../databases").getModels_User();
const mapFields = require("../utils/mapFields");

function getFamilyForAnnotation(accession) {
  return dfam.familyModel.findOne({
    attributes: [ "id", "name", "accession", "version", "length", "title", "description", "author", "refineable", "consensus", "hmm_general_threshold" ],
    where: { accession },
    include: [
      'aliases',
      { model: dfam.classificationModel, as: 'classification', include: [ 'rm_type', 'rm_subtype' ] },
      'curation_state',
      { model: dfam.rmStageModel, as: 'search_stages' },
      { model: dfam.rmStageModel, as: 'buffer_stages', through: {
        attributes: [ 'start_pos', 'end_pos'],
      } },
      { model: dfam.citationModel, as: 'citations', through: { attributes: [ 'order_added', 'comment' ] } },
      'clades',
      { model: dfam.familyAssemblyDataModel, as: 'family_assembly_data',
        attributes: ['hmm_hit_GA', 'hmm_hit_TC', 'hmm_hit_NC', 'hmm_fdr'],
        include: [
          { model: dfam.assemblyModel, include: [
            { model: dfam.dfamTaxdbModel, attributes: ['tax_id', 'sanitized_name', 'scientific_name'] }
          ] },
        ],
      },
      'coding_sequences',
    ],
  }).then(function(family) {
    if (family) {
      if (family.classification.rm_type) {
        family.rmTypeName = family.classification.rm_type.name;
      } else {
        family.rmTypeName = "";
      }
      if (family.classification.rm_subtype) {
        family.rmSubTypeName = family.classification.rm_subtype.name;
      } else {
        family.rmSubTypeName = "";
      }

      family.accessionAndVersion = family.accession + "." + (family.version || 0);
    }

    return family;
  });
}

function getFamilyWithConsensus(accession) {
  return dfam.familyModel.findOne({
    attributes: [ "id", "name", "accession", "version", "consensus" ],
    where: { accession },
  }).then(function(family) {
    if (family) {
      family.accessionAndVersion = family.accession + "." + (family.version || 0);
    }

    return family;
  });
}

function familySubqueries(rows, format) {
  return Promise.all(rows.map(function(row) {
    const family_id = row.id;

    const subqueries = [];

    subqueries.push(dfam.familyCladeModel.findAll({
      where: { family_id },
      include: { model: dfam.dfamTaxdbModel, as: 'dfam_taxdb', attributes: ["lineage"], }
    }).then(fcs => row.clades = fcs.map(fc => {
      return { lineage: fc.dfam_taxdb.lineage };
    })));

    if (format == "full") {
      subqueries.push(dfam.familyDatabaseAliasModel.findAll({
        attributes: ["db_id", "db_link"],
        where: { family_id },
      }).then(as => row.aliases = as));

      subqueries.push(dfam.familyHasSearchStageModel.findAll({
        where: { family_id },
        include: { model: dfam.rmStageModel, as: 'repeatmasker_stage', attributes: ["name"] }
      }).then(fss => row.search_stages = fss.map(fs => {
        return { name: fs.repeatmasker_stage.name };
      })));

      subqueries.push(dfam.familyHasBufferStageModel.findAll({
        attributes: ["start_pos", "end_pos"],
        where: { family_id },
        include: { model: dfam.rmStageModel, as: 'repeatmasker_stage', attributes: ["name"] }
      }).then(fbs => row.buffer_stages = fbs.map(fs => {
        return { name: fs.repeatmasker_stage.name, family_has_buffer_stage: {
          start_pos: fs.start_pos,
          end_pos: fs.end_pos,
        } };
      })));

      subqueries.push(dfam.familyHasCitationModel.findAll({
        where: { family_id },
        include: { model: dfam.citationModel, as: 'citation', attributes: [
          "pmid", "title", "authors", "journal", "pubdate",
        ] },
        order: [ ['order_added', 'ASC'] ],
      }).then(fhcs => row.citations = fhcs.map(fhc => {
        return {
          pmid: fhc.citation.pmid,
          title: fhc.citation.title,
          authors: fhc.citation.authors,
          journal: fhc.citation.journal,
          pubdate: fhc.citation.pubdate,
        };
      })));

      subqueries.push(dfam_user.userModel.findOne({ where: { id: row.deposited_by_id }, attributes: [ 'full_name' ] }).then(function(user) {
        if (user) {
          row.submitter = user.full_name;
        }
      }));

      subqueries.push(dfam.familyFeatureModel.findAll({
        where: { family_id: row.id },
        include: [
          { model: dfam.featureAttributeModel, as: 'feature_attributes' }
        ] }).then(function(features) { row.features = features; }));
      subqueries.push(dfam.codingSequenceModel.findAll({
        where: { family_id: row.id }
      }).then(function(coding_sequences) { row.coding_sequences = coding_sequences; }));
    }

    return Promise.all(subqueries).then(() => row);
  }));
}


function familyQueryRowToObject(row, format) {
  const obj = mapFields(row, {}, {
    "accession": "accession",
    "name": "name",
    "version": "version",
    "title": "title",
    "description": "description",
    "length": "length",
  });

  if (row.classification) {
    obj.classification = row.classification.lineage;
    if (row.classification.rm_type) {
      obj.repeat_type_name = row.classification.rm_type.name;
    }
    if (row.classification.rm_subtype) {
      obj.repeat_subtype_name = row.classification.rm_subtype.name;
    }
  }

  obj["clades"] = [];
  if (row.clades) {
    obj["clades"] = row.clades.map(cl => cl.lineage);
  }

  if (format == "summary") {
    return obj;
  }

  mapFields(row, obj, {
    "consensus": "consensus_sequence",
    "author": "author",
    "submitter": "submitter",
    "date_created": "date_created",
    "date_modified": "date_modified",
    "target_site_cons": "target_site_cons",
    "refineable": "refineable",
    "disabled": "disabled",
    "model_mask": "model_mask",
    "hmm_general_threshold": "hmm_general_threshold",
    "source_method_desc": "source_method_description",
  });

  if (obj.refineable !== undefined) {
    obj.refineable = Boolean(obj.refineable);
  }

  if (obj.disabled !== undefined) {
    obj.disabled = Boolean(obj.disabled);
  }

  if (row.curation_state) {
    obj.curation_state_name = row.curation_state.name;
    obj.curation_state_description = row.curation_state.description;
  }

  if (row.source_method) {
    obj.source_method = row.source_method.name;
  }

  if (row.source_assembly) {
    obj.source_assembly = {
      label: `${row.source_assembly.name}: ${row.source_assembly.description}`,
      hyperlink: row.source_assembly.uri,
    };
  }

  const aliases = obj["aliases"] = [];
  if (row.aliases) {
    row.aliases.forEach(function(alias) {
      aliases.push(mapFields(alias, {}, { "db_id": "database", "db_link": "alias" }));
    });
  }

  const search_stages = obj["search_stages"] = [];
  if (row.search_stages) {
    row.search_stages.forEach(function(ss) {
      search_stages.push({ name: ss.name });
    });
  }

  const buffer_stages = obj["buffer_stages"] = [];
  if (row.buffer_stages) {
    row.buffer_stages.forEach(function(bs) {
      buffer_stages.push({
        name: bs.name,
        start: bs.family_has_buffer_stage.start_pos,
        end: bs.family_has_buffer_stage.end_pos,
      });
    });
  }

  const citations = obj["citations"] = [];
  if (row.citations) {
    row.citations.forEach(function(c) {
      citations.push(mapFields(c, {}, {
        "pmid": "pmid",
        "title": "title",
        "authors": "authors",
        "journal": "journal",
        "pubdate": "pubdate",
      }));
    });
  }

  const features = obj["features"] = [];
  if (row.features) {
    row.features.forEach(function(f) {
      const feature = mapFields(f, {}, {
        "feature_type": "type",
        "description": "description",
        "model_start_pos": "model_start_pos",
        "model_end_pos": "model_end_pos",
        "label": "label",
      });
      feature.attributes = [];
      f.feature_attributes.forEach(function(a) {
        feature.attributes.push(mapFields(a, {}, {
          "attribute": "attribute",
          "value": "value",
        }));
      });
      features.push(feature);
    });
  }

  const coding_seqs = obj["coding_seqs"] = [];
  if (row.coding_sequences) {
    row.coding_sequences.forEach(function(cs) {
      const cds = mapFields(cs, {}, {
        "product": "product",
        "translation": "translation",
        "cds_start": "start",
        "cds_end": "end",
        "exon_count": "exon_count",
        "external_reference": "external_reference",
        "reverse": "reverse",
        "stop_codons": "stop_codons",
        "frameshifts": "frameshifts",
        "gaps": "gaps",
        "percent_identity": "percent_identity",
        "left_unaligned": "left_unaligned",
        "right_unaligned": "right_unaligned",
        "classification_id": "classification_id",
        "align_data": "align_data",
        "description": "description",
        "protein_type": "protein_type",
      });

      // 'reverse' is stored as an integer
      cds.reverse = !!cds.reverse;

      // Coordinates are stored 0-based half open, but the API needs to return
      // 1-based closed. To accomplish this, 1 is added to start and exon_starts.
      // TODO: When the database becomes 1-based closed, remove the adjusting code.
      if (cds.start !== undefined && cds.start !== null) {
        cds.start += 1;
      }

      if (cs.exon_starts) {
        cds.exon_starts = cs.exon_starts.toString().split(",").map(x => parseInt(x) + 1);
      }
      if (cs.exon_ends) {
        cds.exon_ends = cs.exon_ends.toString().split(",").map(x => parseInt(x));
      }

      coding_seqs.push(cds);
    });
  }

  return obj;
}

// Helper function for collecting ancestor/descendant clade information
// Returns a promise.
// If the specified clade is not present, the result is null.
// Otherwise, result.ids is a list of IDs (self + ancestors) and
// result.lineage is a lineage string (useful for searching descendants).
// result.ids will contain ancestors only if clade_relatives is "ancestors" or "both"
async function collectClades(clade, clade_relatives) {
  if (!clade) {
    return null;
  }

  const result = { ids: [], lineage: null };


  // Try clade by ID first
  const id = parseInt(clade);
  let record;
  if (!isNaN(id)) {
    record = await dfam.ncbiTaxdbNamesModel.findOne({
      where: { tax_id: id, name_class: 'scientific name' },
      attributes: [ 'tax_id', 'name_txt' ],
      include: [
        { model: dfam.ncbiTaxdbNodesModel, attributes: [ "parent_id" ] }
      ]
    });
  }

  // Then try by scientific name
  if (!record) {
    record = await dfam.ncbiTaxdbNamesModel.findOne({
      where: { name_class: 'scientific name', name_txt: clade },
      attributes: [ 'tax_id', 'name_txt' ],
      include: [
        { model: dfam.ncbiTaxdbNodesModel, attributes: [ "parent_id" ] },
      ],
    });
  }

  if (!record) {
    return null;
  }

  // Primary results: the given ID and its lineage
  result.ids.push(record.tax_id);
  result.lineage = record.name_txt;

  // Secondary query: parent IDs
  const recurseParents = async function(parent_id) {
    const parent = await dfam.ncbiTaxdbNodesModel.findOne({
      attributes: [ 'tax_id', 'parent_id' ],
      where: { tax_id: parent_id },
      include: [
        { model: dfam.ncbiTaxdbNamesModel, where: { name_class: 'scientific name' }, attributes: [ 'name_txt' ] },
      ]
    });

    if (parent) {
      if (clade_relatives === "ancestors" || clade_relatives === "both") {
        result.ids.push(parent.tax_id);
      }

      let parent_name = "";
      if (parent.ncbi_taxdb_names.length) {
        parent_name = parent.ncbi_taxdb_names[0].name_txt;
      }
      result.lineage = parent_name + ";" + result.lineage;

      if (parent_id !== 1) {
        return recurseParents(parent.parent_id);
      }
    }
  };

  let recurseParentsPromise;
  if (record.tax_id !== 1) {
    recurseParentsPromise = recurseParents(record.ncbi_taxdb_node.parent_id);
  } else {
    recurseParentsPromise = Promise.resolve();
  }

  await recurseParentsPromise;
  return result;
}



module.exports = {
  getFamilyForAnnotation,
  getFamilyWithConsensus,
  familySubqueries,
  familyQueryRowToObject,
  collectClades
};
