/*
 * AVA/Supertest Endpoint Unit Tests
 *   
 *   The current setup assumes that the project is configured to use the
 *   Dfam 3.7 database ( See conf_file paramter in the project conf.js file
 *   for the current Dfam.conf file used ).  This means that many of these
 *   unit tests are testing data that could be changed in future releases.
 *   This could be fixed by creating a test schema on the database server 
 *   with dummy data.  So beware that a failure of these tests is not a 
 *   definitive indication that that test failed.
 *
 *   There is a known issue with parallel use of the supertest library.
 *      https://stackoverflow.com/questions/71682239/supertest-failing-with-econnreset 
 *   The workaround, for us, is to run the tests serially using test.serial.
 *
 * Authors: Jeb Rosen, Robert Hubley, Anthony Gray
 */
const test = require('ava');
const supertest = require('supertest');

const winston = require('winston');
const format = winston.format;
winston.configure({
  level: 'info',
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple(),
      ),
    }),
  ],
});

//load example sequence
const fs = require('fs');
const example_seq = fs.readFileSync('./test/example_sequence.fasta').toString()

// Start up the API server and grab the "express" object
const app = require('../index').expressServer.app;
// Hand the express object to supertest to wrap
const request = supertest(app);


// Convenience functions for obtaining responses from the body
// or the text fields.
async function get_body(url) {
  const response = await request.get(url).expect(200);
  return response.body;
}
async function get_text(url) {
  const response = await request.get(url).expect(200);
  return response.text;
}
async function get_notfound(url) {
  await request.get(url).expect(404);
}

async function post_body(url) {
  let data = {
    sequence: example_seq,
    organism: 'Homo sapiens',
    cutoff: 'curated',
    evalue: 0
  }
  const response = await request.post(url).type('form').send(data).expect(200);
  return response.body;
}

//
// Endpoint Tests
//

test.serial('get version', async t => {
  const body = await get_body('/version');
  // t.deepEqual(body, { major: "0", minor: "4", bugfix: "0" });
  t.truthy(body.dfam_version);
  t.truthy(body.total_families);
  t.truthy(body.curated_families);
  t.truthy(body.species);
});

// AlignmentService 
test.serial('get alignment success', async t => {
  const body = await get_body('/alignment?assembly=hg38&chrom=chr1&start=86228458&end=86238717&family=DF000000001');
  t.is(body.pp.string, "333332..35556666655......44455677777356789*****************************************************************99988765...69999******998433323344444331445556666553322122245666666666544442222222222222223466788***996.57*******************999998887665");
  
  const body2 = await get_body('/alignment?assembly=hg38&chrom=chr3&start=147735008&end=147734825&family=DF000000147');
  t.is(body2.pp.string, "799***********************************************************9..9999*********933333333333333333333334588***************************9......59**************************9999998888877665");
});

test.serial('get alignment failure', async t => {
  await get_notfound('/alignment?assembly=fake&chrom=chr1&start=1&end=1000&family=DF000004191');
  await get_notfound('/alignment?assembly=hg38&chrom=fake&start=1&end=1000&family=DF000004191');
 
  await request.get('/alignment?assembly=hg38&chrom=chr1&start=1&end=40000&family=DF000004191')
    .expect(400);
  t.pass();
 });

// AnnotationsService 
test.serial('get annotations', async t => {
  const body = await get_body('/annotations?assembly=hg38&chrom=chr1&start=168130000&end=168180000&nrph=true');
  t.true(body.hits.length > 1);
  t.true(body.tandem_repeats.length > 1);

  const body2 = await get_body('/annotations?assembly=hg38&chrom=chr1&start=168130000&end=168180000&family=DF000000001');
  t.true(body2.hits.length > 1);
  t.true(body2.tandem_repeats.length > 1);
});

test.serial('get annotations failure', async t => {
  await get_notfound('/annotations?assembly=fake&chrom=chr1&start=168130000&end=168180000&nrph=true');

  await get_notfound('/annotations?assembly=hg38&chrom=fake&start=168130000&end=168180000&nrph=true');

  await request.get('/annotations?assembly=hg38&chrom=fake&start=158000000&end=168000000&nrph=true')
    .expect(400);
  t.pass();
});

// AssembliesService
test.serial('get assemblies', async t => {
  const body = await get_body('/assemblies');
  const ficAlb2 = body.find(asm => asm.id === 'ficAlb2');
  t.is(ficAlb2.name, 'Ficedula albicollis');
});

// BlogService
test.serial('get blog posts', async t => {
  const body = await get_body('/blogposts');
  t.truthy(body.length);

  // TODO: actually verify that the cached posts are reused
  const body2 = await get_body('/blogposts');
  t.deepEqual(body2, body);
});

// ClassificationService
test.serial('get classifications', async t => {
  const body = await get_body('/classes');
  t.is(body.name, 'root');
  t.truthy(body.children.length);
});

test.serial('search classifications', async t => {
  const body = await get_body('/classes?name=SINE');
  const cls = body.find(c => c.name == 'SINE');
  t.is(cls.repeatmasker_type, 'SINE');
  t.is(cls.full_name, 'root;Interspersed_Repeat;Transposable_Element;Class_I_Retrotransposition;LINE-dependent_Retroposon;SINE');
});

// FamiliesService
test.serial('search families', async t => {
  const body = await get_body('/families?clade=9263&limit=20');
  t.is(body.total_count, 5);
  const charlie1 = body.results.find(f => f.name === 'Charlie1');
  t.regex(charlie1.title, /Charlie DNA transposon/);
  t.regex(charlie1.description, /8 bp TSD./);
  t.is(charlie1.repeat_subtype_name, 'hAT-Charlie');
});

test.serial('search families query limit', async t => {
  const response = await request.get('/families?clade=1&clade_relatives=descendants').expect(400);
  t.regex(response.body.message, /per-query limit/);
});

test.serial('search families with consensi', async t => {
  const body = await get_body('/families?clade=9606&format=full&name=Alu');
  t.is(body.total_count, 9);
  const example = body.results.find(f => f.name === 'AluYa5');
  t.is(example.consensus_sequence, "GGCCGGGCGCGGTGGCTCACGCCTGTAATCCCAGCACTTTGGGAGGCCGAGGCGGGCGGATCACGAGGTCAGGAGATCGAGACCATCCCGGCTAAAACGGTGAAACCCCGTCTCTACTAAAAATACAAAAAATTAGCCGGGCGTAGTGGCGGGCGCCTGTAGTCCCAGCTACTTGGGAGGCTGAGGCAGGAGAATGGCGTGAACCCGGGAGGCGGAGCTTGCAGTGAGCCGAGATCCCGCCACTGCACTCCAGCCTGGGCGACAGAGCGAGACTCCGTCTCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
});

test.serial('search raw families', async t => {
  const without_raw = await get_body('/families?name_accession=DR0000000');
  t.is(without_raw.total_count, 0);
  const with_raw = await get_body('/families?name_accession=DR0006958&include_raw=true');
  t.is(with_raw.total_count, 100);
});

test.serial('search families sorted by subtype', async t => {
  const body = await get_body('/families?clade=9606&sort=subtype:asc');
  t.deepEqual(
    body.results.map(r => r.repeat_subtype_name).filter(x => x !== undefined),
    ["Alu", "Alu", "Alu", "Alu", "Alu", "Alu", "Alu", "Alu", "Alu", "SVA", "SVA"],
  );
});

test.serial('search families name_prefix', async t => {
  const body = await get_body('/families?name_prefix=Alu');
  t.true(body.total_count == 42)
});

test.serial('search families classification', async t => {
  const body = await get_body('/families?classification=root%3BInterspersed_Repeat%3BTransposable_Element%3BClass_II_DNA_Transposition%3BTransposase%3BCACTA%3BCMC%3BMirage');
  t.true(body.total_count == 2)
});

test.serial('search families type', async t => {
  const body = await get_body('/families?type=SINE');
  t.true(body.total_count == 1484)
});

test.serial('search families desc', async t => {
  const body = await get_body('/families?desc=MIR');
  t.true(body.total_count == 11)
});

test.serial('search families keywords', async t => {
  const body = await get_body('/families?format=summary&keywords=hAT auto&limit=20');
  t.is(body.total_count, 336)
});

test.serial('search families start', async t => {
  const body = await get_body('/families?start=1000&limit=1');
  const body2 = await get_body('/families?start=1001&limit=1');
  t.true(body.results[0].accession == "DF000001019")
  t.true(body2.results[0].accession == "DF000001020")
});

test.serial('search families updated', async t => {
  const body = await get_body('/families?updated_after=2022-01-01&updated_before=2023-01-01');
  t.is(body.total_count, 4244)
});

test.serial('download families', async t => {
  const text_fa = await get_text('/families?clade=185453&format=fasta');
  t.is(JSON.parse(text_fa).body.match(/>/gm).length, 67);
  const body_embl = await get_text('/families?clade=9263&format=embl');
  t.is(JSON.parse(body_embl).body.match(/^SQ/gm).length, 5);
  const body_hmm = await get_text('/families?clade=9263&format=hmm');
  t.is(JSON.parse(body_hmm).body.match(/^HMMER3\/f/gm).length, 5);
});

test.serial('test caching', async t => { // works on dfam
  let url = '/families?format=fasta&name_accession=DF000000&classification=root%253BInterspersed_Repeat%253BTransposable_Element%253BClass_I_Retrotransposition%253BLINE&clade_relatives=descendants&download=true'
  await request.get(url).expect(202)
  let filename = '/u2/webresults/browse-cache/c13cbab7f78a81b80f88386047019aea.cache'
  let file = fs.existsSync(filename)
  fs.unlinkSync(filename)
  t.truthy(file)
});

// /families/{id}
test.serial('get family', async t => {
  const body = await get_body('/families/DF000001010');

  t.regex(body.title, /Long Terminal Repeat for ERVL/);
  t.regex(body.name, /MLT1F2/);
  t.is(body.length, 560);
  t.is(body.repeat_type_name, "LTR");
  t.truthy(body.search_stages.length);

  const body2 = await get_body('/families/DF000001067');
  t.truthy(body2.buffer_stages.length);

  const body3 = await get_body('/families/DF000000194');
  t.truthy(body3.coding_seqs.length);
  t.truthy(body3.target_site_cons);

  await get_notfound('/families/DF00000FAKE');
});

// /families/{id}/hmm
test.serial('get family HMM', async t => {
  const hmm = await get_body('/families/DF000000001/hmm?format=hmm');
  t.truthy(hmm);

  const logo_json = await get_body('/families/DF000000001/hmm?format=logo');
  t.truthy(logo_json.height_arr.length);
});

// test.serial('get family HMM image', async t => {
//   await request
//     .get('/families/DF000000001/hmm?format=image')
//     .expect('Content-Type', 'image/png');
//   t.pass();
// });

// /families/{id}/sequence
test.serial('get family HMM sequence', async t => {
  await request
    .get('/families/DF000000001/sequence?format=fake&download=true')
    .expect(400);
  t.pass();
});

test.serial('get family sequence', async t => {
  const embl = await get_text('/families/DF000000001/sequence?format=embl');
  t.regex(embl, /SQ\s*Sequence \d* BP;/);

  const fasta = await get_text('/families/DF000000001/sequence?format=fasta');
  t.regex(fasta, /^>DF000000001.\d .*\n[acgtACGT\n]*$/);

  const bad = request.get('/families/DF000000001/sequence?format=fake&download=true');
  await bad.expect(400);
});

// /families/{id}/seed
test.serial('get family seed', async t => {
  const text = await get_text('/families/DF000000001/seed?format=stockholm');
  t.regex(text, /GC RF/);

  const body = await get_body('/families/DF000000001/seed?format=alignment_summary');

  t.truthy(body.alignments.length);
  t.is(body.qualityBlockLen, 10);

  const bad = request.get('/families/DF000000001/seed?format=fake&download=true');
  await bad.expect(400);
});

// /families/{id}/relationships
test.serial('get family relationships', async t => {
  const body = await get_body('/families/DF000000001/relationships');
  t.truthy(body.length);
});

test.serial('get family relationships include', async t => {
  const body = await get_body('/families/DF000002176/relationships');
  const body2 = await get_body('/families/DF000002176/relationships?include=related');
  t.true(body.length > body2.length);
});

test.serial('get family relationships include_raw', async t => {
  const body = await get_body('/families/DF000002176/relationships?include_raw=false')
  const body2 = await get_body('/families/DF000002176/relationships?include_raw=true')
  t.true(body.length < body2.length);
});

// FamilyAssembliesService
test.serial('get family assemblies', async t => {
  const body = await get_body('/families/DF000000001/assemblies');
  const hg38 = body.find(a => a.id == 'hg38');
  t.is(hg38.name, 'Homo sapiens');
});

test.serial('get family annotation stats', async t => {
  const body = await get_body('/families/DF000000001/annotation_stats');
  const hg38 = body.find(a => a.id == 'hg38');
  t.is(hg38.name, 'Homo sapiens');
});

test.serial('get family assembly stats', async t => {
  const body = await get_body('/families/DF000000012/assemblies/hg38/annotation_stats');
  t.truthy(body.hmm.trusted_all);
});

test.serial('get family assembly annotations', async t => {
  const text_rph = await get_text('/families/DF000000012/assemblies/hg38/annotations?nrph=false');
  const text_nrph = await get_text('/families/DF000000012/assemblies/hg38/annotations?nrph=true');

  t.true(text_nrph.length < text_rph.length);
});

test.serial('get family assembly karyotype', async t => { 
  const body = await get_body('/families/DF000000012/assemblies/hg38/karyotype');
  t.truthy(body.singleton_contigs.length);
});

test.serial('get family assembly coverage', async t => { 
  const body = await get_body('/families/DF000000012/assemblies/hg38/model_coverage?model=hmm');
  t.truthy(body.nrph);
  t.truthy(body.false);
  t.true(body.nrph_hits < body.all_hits);
});

test.serial('get family assembly conservation', async t => { 
  const body = await get_body('/families/DF000000012/assemblies/hg38/model_conservation?model=hmm');
  t.truthy(body.length);
  t.truthy(body[0].num_seqs);
});

// Taxa Service
test.serial('get taxa', async t => {
  const body = await get_body('/taxa?name=Drosophila');
  t.true(body.taxa[0].name == 'Drosophila <basidiomycete fungi>');
});

test.serial('get taxa annotated', async t => {
  const body = await get_body('/taxa?name=Zebrafish&annotated=true');
  const body2 = await get_body('/taxa?name=Zebrafish');
  t.true(body.taxa.length < body2.taxa.length);
});

test.serial('get taxa limited', async t => {
  const body = await get_body('/taxa?name=mouse');
  t.true(body.taxa.length == 20)
  const body2 = await get_body('/taxa?name=mouse&limit=50');
  t.true(body2.taxa.length > 20)
});

test.serial('get one taxon', async t => {
  const body = await get_body('/taxa/9606');
  t.true(body.name == 'Homo sapiens');
});

test.serial('get taxa coverage', async t => {
  const body = await get_body('/taxa/coverage');
  t.truthy(body.species);
});

// Searches Service
test.serial('submit search', async t => {
  const body = await post_body('/searches');
  t.truthy(body.id);
});

test.serial('read search results', async t => { // needs to be run on dfam
  const body = await get_body('/searches/1cea44d0-3258-11ee-a3b7-c77d081c00ac');
  t.truthy(body.results);
  t.truthy(body.results[0].hits);
  t.truthy(body.results[0].tandem_repeats);
});

test.serial('read search result alignments', async t => { // needs to be run on dfam
  const body = await get_body('/searches/e1f44e10-4144-11ee-a3b7-c77d081c00ac/alignment?sequence=Example&start=435&end=617&family=DF000000302');
  t.truthy(body.hmm);
  t.truthy(body.match);
  t.truthy(body.seq);
  t.truthy(body.pp);
});
