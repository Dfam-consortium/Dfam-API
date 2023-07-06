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

//
// Endpoint Tests
//

test.serial('get version', async t => {
  const body = await get_body('/version');
  t.deepEqual(body, { major: "0", minor: "4", bugfix: "0" });
});

test.serial('search families', async t => {
  const body = await get_body('/families?clade=9263&limit=20');
  t.is(body.total_count, 6);
  const charlie1 = body.results.find(f => f.name === 'Charlie1');
  t.regex(charlie1.title, /Charlie DNA transposon/);
  t.regex(charlie1.description, /8 bp TSD./);
  t.is(charlie1.repeat_subtype_name, 'hAT-Charlie');

  const response = await request.get('/families?clade=1&clade_relatives=descendants').expect(400);
  t.regex(response.body.message, /per-query limit/);
});

test.serial('search families with consensi', async t => {
  const body = await get_body('/families?clade=9606&format=full&name=ltr');
  t.is(body.total_count, 3);
  const ltr26c = body.results.find(f => f.name === 'LTR26C');
  t.regex(ltr26c.consensus_sequence, /^[ACGTN]*$/);
});

test.serial('search raw families', async t => {
  const without_raw = await get_body('/families?name_accession=DR0000000');
  t.is(without_raw.total_count, 0);
  const with_raw = await get_body('/families?name_accession=DR0006958&include_raw=true');
  t.is(with_raw.total_count, 1);
});

test.serial('search families sorted by subtype', async t => {
  const body = await get_body('/families?clade=9606&sort=subtype:asc');
  t.deepEqual(
    body.results.map(r => r.repeat_subtype_name).filter(x => x !== undefined),
    ["Alu", "Alu", "Alu", "ERV1", "ERV1", "ERVK", "SVA", "SVA"],
  );
});

test.serial('download families', async t => {
  const text_fa = await get_text('/families?clade=185453&format=fasta');
  t.is(text_fa.match(/^>/gm).length, 67);
  const body_embl = await get_text('/families?clade=9263&format=embl');
  t.is(body_embl.match(/^SQ/gm).length, 6);
  const body_hmm = await get_text('/families?clade=9263&format=hmm');
  t.is(body_hmm.match(/^HMMER3\/f/gm).length, 6);
});

test.serial('get family', async t => {
  const body = await get_body('/families/DF0001010');

  t.regex(body.title, /Long Terminal Repeat for ERVL/);
  t.regex(body.name, /MLT1F2/);
  t.is(body.length, 560);
  t.is(body.repeat_type_name, "LTR");
  t.truthy(body.search_stages.length);

  const body2 = await get_body('/families/DF0001067');
  t.truthy(body2.buffer_stages.length);

  const body3 = await get_body('/families/DF0000194');
  t.truthy(body3.coding_seqs.length);
  t.truthy(body3.target_site_cons);

  await get_notfound('/families/DF000FAKE');
});

test.serial('get family HMM', async t => {
  const hmm = await get_body('/families/DF0000001/hmm?format=hmm');
  t.truthy(hmm);

  const logo_json = await get_body('/families/DF0000001/hmm?format=logo');
  t.truthy(logo_json.height_arr.length);

  await request
    .get('/families/DF0000001/hmm?format=image')
    .expect('Content-Type', 'image/png');
  t.pass();

  const bad = request.get('/families/DF0000001/sequence?format=fake&download=true');
  await bad.expect(400);
});

test.serial('get family relationships', async t => {
  const body = await get_body('/families/DF0000001/relationships');
  t.truthy(body.length);
  // TODO: We should check a few more things here
});

test.serial('get family seed', async t => {
  const text = await get_text('/families/DF0000001/seed?format=stockholm');
  t.regex(text, /GC RF/);

  const body = await get_body('/families/DF0000001/seed?format=alignment_summary');

  t.truthy(body.alignments.length);
  t.is(body.qualityBlockLen, 10);

  const bad = request.get('/families/DF0000001/seed?format=fake&download=true');
  await bad.expect(400);
});

test.serial('get family sequence', async t => {
  const embl = await get_text('/families/DF0000001/sequence?format=embl');
  t.regex(embl, /SQ\s*Sequence \d* BP;/);

  const fasta = await get_text('/families/DF0000001/sequence?format=fasta');
  t.regex(fasta, /^>DF0000001.\d .*\n[acgtACGT\n]*$/);

  const bad = request.get('/families/DF0000001/sequence?format=fake&download=true');
  await bad.expect(400);
});

///// TO BE IMPLEMENTED /////

// AlignmentService
//test.serial('get alignment', async t => {
//  const body = await get_body('/alignment?assembly=mm10&chrom=chr1&start=35640910&end=35641251&family=DF0004191');
//  t.regex(body.pp.string, /^699\**9988777333.*/);
//
//  const body2 = await get_body('/alignment?assembly=hg38&chrom=chr3&start=147735008&end=147734825&family=DF0000147');
//  t.regex(body2.pp.string, /^799.*9999998888877665$/);
//
//  await get_notfound('/alignment?assembly=fake&chrom=chr1&start=1&end=1000&family=DF0004191');
//  await get_notfound('/alignment?assembly=mm10&chrom=fake&start=1&end=1000&family=DF0004191');
//
//  await request.get('/alignment?assembly=mm10&chrom=chr1&start=1&end=40000&family=DF0004191')
//    .expect(400);
//});

/*
// AnnotationsService
test.serial('get annotations', async t => {
  const body = await get_body('/annotations?assembly=hg38&chrom=chr1&start=168130000&end=168180000&nrph=true');
  t.true(body.hits.length > 1);
  t.true(body.tandem_repeats.length > 1);

  const body2 = await get_body('/annotations?assembly=hg38&chrom=chr1&start=168130000&end=168180000&family=DF0000001');
  t.true(body2.hits.length > 1);
  t.true(body2.tandem_repeats.length > 1);

  await get_notfound('/annotations?assembly=fake&chrom=chr1&start=168130000&end=168180000&nrph=true');

  const body3 = await get_body('/annotations?assembly=hg38&chrom=fake&start=168130000&end=168180000&nrph=true');
  t.is(body3.hits.length, 0);

  await request.get('/annotations?assembly=hg38&chrom=fake&start=158000000&end=168000000&nrph=true')
    .expect(400);
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
  t.truthy(body2.length);
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

// FamilyAssembliesService
test.serial('get family assemblies', async t => {
  const body = await get_body('/families/DF0000001/assemblies');
  const hg38 = body.find(a => a.id == 'hg38');
  t.is(hg38.name, 'Homo sapiens');
});

test.serial('get family assembly stats', async t => {
  const body = await get_body('/families/DF0000001/assemblies/hg38/annotation_stats');
  t.truthy(body.hmm.trusted_all);
});

test.serial('get family assembly annotations', async t => {
  const text_rph = await get_text('/families/DF0000001/assemblies/hg38/annotations?nrph=false');
  const text_nrph = await get_text('/families/DF0000001/assemblies/hg38/annotations?nrph=true');

  t.true(text_nrph.length < text_rph.length);
});

test.serial('get family assembly karyotype', async t => {
  const body = await get_body('/families/DF0000001/assemblies/hg38/karyotype');
  t.truthy(body.singleton_contigs.length);
});

test.serial('get family assembly coverage', async t => {
  const body = await get_body('/families/DF0000001/assemblies/hg38/model_coverage?model=hmm');
  t.truthy(body.nrph);
  t.truthy(body.false);
  t.true(body.nrph_hits < body.all_hits);
});

test.serial('get family assembly conservation', async t => {
  const body = await get_body('/families/DF0000001/assemblies/hg38/model_conservation?model=hmm');
  t.truthy(body.length);
  t.truthy(body[0].num_seqs);
});

// Taxa Service
test.serial('get taxa', async t => {
  const body = await get_body('/taxa?name=Drosophila');
  t.true(body.taxa[0].name == 'Drosophila <basidiomycetes>');
});

test.serial('get one taxon', async t => {
  const body = await get_body('/taxa/9606');
  t.true(body.name == 'Homo sapiens');
});

// low-priority test TODO: Searches Service
*/
