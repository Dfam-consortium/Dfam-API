/* eslint-disable no-unused-vars */
const Service = require('./Service');
const dfam = require("../databases").getModels_Dfam();
const getModels_Assembly = require("../databases.js").getModels_Assembly;
const mapFields = require("../utils/mapFields.js");
const fs = require("fs");
const child_process = require('child_process');
const tmp = require('tmp');
tmp.setGracefulCleanup();

const familyAssemblyStatsObject = (family_assembly) => {
  let obj = { };

  if (family_assembly.hmm_GA_nrph_hit_count !== null) {
    obj.hmm = {
      avg_hit_length: family_assembly.hmm_avg_hit_length || '',
      gathering_nonredundant: family_assembly.hmm_GA_nrph_hit_count || '',
      gathering_all: family_assembly.hmm_GA_hit_count || '',
      gathering_divergence: family_assembly.hmm_genome_avg_kimura_div_GA || '',
      trusted_nonredundant: family_assembly.hmm_TC_nrph_hit_count || '',
      trusted_all: family_assembly.hmm_TC_hit_count || '',
      trusted_divergence: family_assembly.hmm_genome_avg_kimura_div_TC || '',
    };
  } 

  if (family_assembly.cons_GA_nrph_hit_count !== null) {
    obj.cons = {
      avg_hit_length: family_assembly.cons_avg_hit_length,
      gathering_nonredundant: family_assembly.cons_GA_nrph_hit_count,
      gathering_all: family_assembly.cons_GA_hit_count,
      gathering_divergence: family_assembly.cons_genome_avg_kimura_div_GA,
      trusted_nonredundant: family_assembly.cons_TC_nrph_hit_count,
      trusted_all: family_assembly.cons_TC_hit_count,
      trusted_divergence: family_assembly.cons_genome_avg_kimura_div_TC,
    };
  }

  return obj;
}

/**
* Retrieve a family's annotation statistics for all assemblies it is annotated in.
* Retrieve a family's annotation statistics for all assemblies it is annotated in.
*
* id String The Dfam family accession.
* returns List
* */
const readFamilyAnnotationStats = ({ id }) => new Promise(
  async (resolve, reject) => {
    try {
      const data = await dfam.familyAssemblyDataModel.findAll({
        include: [
          { model: dfam.familyModel, where: { 'accession': id }, attributes: [] },
          { model: dfam.assemblyModel, include: [ dfam.dfamTaxdbModel ], attributes: ["name"] },
        ]
      });

      resolve(Service.successResponse(
        data.map((family_assembly) => {
          return {
            id: family_assembly.assembly.name,
            name: family_assembly.assembly.dfam_taxdb.scientific_name,
            hmm_hit_ga: family_assembly.hmm_hit_GA,
            hmm_hit_tc: family_assembly.hmm_hit_TC,
            hmm_fdr: family_assembly.hmm_fdr,
            stats: familyAssemblyStatsObject(family_assembly),
          };
        }), 200
      ));

    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

/**
* Retrieve a list of genome assemblies with annotations for a Dfam family.
* Retrieve a list of genome assemblies with annotations for a Dfam family.
*
* id String The Dfam family accession.
* returns List
* */
const readFamilyAssemblies = ({ id }) => new Promise(
  async (resolve, reject) => {
    try {
      const data = await dfam.familyAssemblyDataModel.findAll({
        attributes: ["hmm_hit_GA", "hmm_hit_TC", "hmm_fdr"],
        include: [
          { model: dfam.familyModel, where: { 'accession': id }, attributes: [] },
          { model: dfam.assemblyModel, include: [ dfam.dfamTaxdbModel ], attributes: ["name"] },
        ],
      });
      resolve(Service.successResponse(
        data.map((family_assembly) => {
          return {
            id: family_assembly.assembly.name,
            name: family_assembly.assembly.dfam_taxdb.scientific_name,
            hmm_hit_ga: family_assembly.hmm_hit_GA,
            hmm_hit_tc: family_assembly.hmm_hit_TC,
            hmm_fdr: family_assembly.hmm_fdr,
          };
        }), 200
      ));
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

/**
* Retrieve a family's annotation statistics associated with a given assembly.
* Retrieve a family's annotation statistics associated with a given assembly.
*
* id String The Dfam family accession.
* assembly_id String The assembly identifier, as shown in /families/{id}/assemblies.
* returns familyAssemblyAnnotationStatsResponse
* */
const readFamilyAssemblyAnnotationStats = ({ id, assembly_id }) => new Promise(
  async (resolve, reject) => {
    try {
      const family_assembly = await dfam.familyAssemblyDataModel.findOne({
        include: [
          { model: dfam.familyModel, where: { 'accession': id }, attributes: [] },
          { model: dfam.assemblyModel, where: { 'name': assembly_id }, attributes: [] },
        ],
      })

      if (!family_assembly) {
        reject(Service.rejectResponse({}, 404));
      } 

      resolve(Service.successResponse(familyAssemblyStatsObject(family_assembly)));

    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

/**
* Retrieve a family's annotations associated with a given assembly.
* Retrieve a family's annotations associated with a given assembly.
*
* id String The Dfam family accession.
* assembly_id String The assembly identifier, as shown in /families/{id}/assemblies.
* nrph Boolean \"true\" to include only non-redundant profile hits.
* download Boolean If true, adds headers to trigger a browser download. (optional)
* returns String
* */
const readFamilyAssemblyAnnotations = ({ id, assembly_id, nrph, download }) => new Promise(
  async (resolve, reject) => {
    try {
      let idx_dir = "/home/agray/te_idx" // TODO change to config file
      let assembly_dir = `${idx_dir}/data/${assembly_id}/assembly_alignments`
      let target_file = `${assembly_dir}/${id}.bed.bgz`

      if (!fs.existsSync(assembly_dir)) {
        reject(Service.rejectResponse(`Assembly ${assembly_id} Not Found`, 404));
      }

      if (!fs.existsSync(target_file)) {
        reject(Service.rejectResponse(`Family ${id} Not Found In ${assembly_id}`, 404));
      }
      const tempobj = tmp.fileSync();
      const tempfile = tempobj.name
      const proc = await new Promise((resolve, reject) => {
        let proc_args = ["read-family-assembly-annotations", "--id", id, "--assembly-id", assembly_id, "--outfile", tempfile]
        if (nrph) {proc_args.push("--nrph")}
        let runner = child_process.spawn(`${idx_dir}/target/release/te_idx`, proc_args);
        runner.on('error', err => { reject(err) });
        runner.on('close', (code) => {
          if (code !== 0) { reject(code) }
          else { resolve(code) }
        })
      })
      let data = fs.readFileSync(tempfile)
      const res = { 
        payload: data,
        code: 200,
        content_type: 'text/plain',
        encoding: 'gzip',
      }

      if (download) {
        res.attachment = `${assembly_id}_${id}${nrph ? ".nrph" : ""}.bed.bgz`
      }
      resolve(Service.successResponse(res));

    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

/**
* Retrieve a family's karyotype data associated with a given assembly.
* Retrieve a family's karyotype data associated with a given assembly.
*
* id String The Dfam family accession.
* assembly_id String The assembly identifier, as shown in /families/{id}/assemblies.
* returns Object
* */
const readFamilyAssemblyKaryotype = ({ id, assembly_id }) => new Promise(
  async (resolve, reject) => {
    try {

      const assembly = await dfam.assemblyModel.findOne({
        attributes: ["schema_name"],
        where: { 'name': assembly_id }
      })  

      if (!assembly) {
        reject(Service.rejectResponse({}, 404));
      }

      const models = getModels_Assembly(assembly.schema_name);
      
      const data = await models.coverageDataModel.findOne({
        attributes: [ "karyotype" ],
        where: { "family_accession": id }
        // where: { "family_accession": id }
      })

      if (data && data.karyotype) {
        resolve(Service.successResponse(JSON.parse(data.karyotype.toString()), 200))
      } else {
        reject(Service.rejectResponse({}, 404));
      }

    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

/**
* Retrieve a family's conservation data associated with a given assembly.
* Retrieve a family's conservation data associated with a given assembly.
*
* id String The Dfam family accession.
* assembly_id String The assembly identifier, as shown in /families/{id}/assemblies.
* model String Model type, \"cons\" or \"hmm\".
* returns List
* */
const readFamilyAssemblyModelConservation = ({ id, assembly_id, model }) => new Promise(
  async (resolve, reject) => {
    try {

      const assembly = await dfam.assemblyModel.findOne({
        attributes: ["schema_name"],
        where: { 'name': assembly_id }
      })

      if (!assembly || model != "hmm") {
        reject(Service.rejectResponse({}, 404));
      }
    
      const models = getModels_Assembly(assembly.schema_name);
    
      const conservations = await models.percentageIdModel.findAll({
        where: { "family_accession": id }
      })
      const objs = conservations.map((cons) => {
        const obj = mapFields(cons, {}, {
          "threshold": "threshold",
          "max_insert": "max_insert",
          "num_seqs": "num_seqs",
        });
        obj.graph = cons.graph_json.toString();
    
        return obj;
      });
      resolve(Service.successResponse(objs));

    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

/**
* Retrieve a family's coverage data associated with a given assembly.
* Retrieve a family's coverage data associated with a given assembly.
*
* id String The Dfam family accession.
* assembly_id String The assembly identifier, as shown in /families/{id}/assemblies.
* model String Model type, \"cons\" or \"hmm\".
* returns readFamilyAssemblyModelCoverage_200_response
* */
const readFamilyAssemblyModelCoverage = ({ id, assembly_id, model }) => new Promise(
  async (resolve, reject) => {
    try {

      const assembly = await dfam.assemblyModel.findOne({
        attributes: ["schema_name"],
        where: { 'name': assembly_id }
      })
      if (!assembly || model != "hmm") {
        reject(Service.rejectResponse({}, 404));
      }
    
      const models = getModels_Assembly(assembly.schema_name);
    
      const coverage = await models.coverageDataModel.findOne({
        attributes: [ "reversed", "forward", "nrph", "num_rev", "num_full", "num_full_nrph" ],
        where: { "family_accession": id }
      })
      if (coverage) {
        resolve(Service.successResponse({
          "nrph": coverage.nrph.toString(),
          "nrph_hits": coverage.num_full_nrph,
          "all": coverage.forward.toString(),
          "all_hits": coverage.num_full,
          "false": coverage.reversed.toString(),
          "false_hits": coverage.num_rev,
        }));
      } else {
        reject(Service.rejectResponse({}, 404));
      }
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  readFamilyAnnotationStats,
  readFamilyAssemblies,
  readFamilyAssemblyAnnotationStats,
  readFamilyAssemblyAnnotations,
  readFamilyAssemblyKaryotype,
  readFamilyAssemblyModelConservation,
  readFamilyAssemblyModelCoverage,
};
