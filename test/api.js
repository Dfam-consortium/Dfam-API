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

const app = require('../app')();
const request = supertest(app);

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

// AlignmentService
test('get alignment', async t => {
  const body = await get_body('/alignment?assembly=mm10&chrom=chr1&start=35640910&end=35641251&family=DF0004191');
  t.regex(body.pp.string, /^699\**9988777333.*/);

  const body2 = await get_body('/alignment?assembly=hg38&chrom=chr3&start=147735008&end=147734825&family=DF0000147');
  t.regex(body2.pp.string, /^799.*9999998888877665$/);

  await get_notfound('/alignment?assembly=fake&chrom=chr1&start=1&end=1000&family=DF0004191');
  await get_notfound('/alignment?assembly=mm10&chrom=fake&start=1&end=1000&family=DF0004191');

  await request.get('/alignment?assembly=mm10&chrom=chr1&start=1&end=40000&family=DF0004191')
    .expect(400);
});

// AnnotationsService
test('get annotations', async t => {
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
test('get assemblies', async t => {
  const body = await get_body('/assemblies');
  const ficAlb2 = body.find(asm => asm.id === 'ficAlb2');
  t.is(ficAlb2.name, 'Ficedula albicollis');
});

// BlogService
test('get blog posts', async t => {
  const body = await get_body('/blogposts');
  t.truthy(body.length);

  // TODO: actually verify that the cached posts are reused
  const body2 = await get_body('/blogposts');
  t.truthy(body2.length);
});

// ClassificationService
test('get classifications', async t => {
  const body = await get_body('/classes');
  t.is(body.name, 'root');
  t.truthy(body.children.length);
});

test('search classifications', async t => {
  const body = await get_body('/classes?name=SINE');
  const cls = body.find(c => c.name == 'SINE');
  t.is(cls.repeatmasker_type, 'SINE');
  t.is(cls.full_name, 'root;Interspersed_Repeat;Transposable_Element;Retrotransposed_Element;LINE-dependent_Retroposon;SINE');
});

// FamiliesService
test('search families', async t => {
  const body = await get_body('/families?clade=9263&limit=20');
  t.is(body.total_count, 6);
  const charlie1 = body.results.find(f => f.name === 'Charlie1');
  t.regex(charlie1.title, /Charlie DNA transposon/);
  t.regex(charlie1.description, /8 bp TSD./);
  t.is(charlie1.repeat_subtype_name, 'hAT-Charlie');

  const bad = request.get('/families?clade=1&clade_relatives=descendants');
  const response = await bad.expect(400);
  t.regex(response.body.message, /per-query limit/);
});

test('download families', async t => {
  const body_fa = await get_text('/families?clade=9263&format=fasta');
  t.is(body_fa.match(/^>/gm).length, 6);
  const body_embl = await get_text('/families?clade=9263&format=embl');
  t.is(body_embl.match(/^SQ/gm).length, 6);
  const body_hmm = await get_text('/families?clade=9263&format=hmm');
  t.is(body_hmm.match(/^HMMER3\/f/gm).length, 6);
});

test('get family', async t => {
  const body = await get_body('/families/DF0001010');

  t.regex(body.title, /Long Terminal Repeat for ERVL/);
  t.is(body.submitter, 'Robert Hubley');
  t.truthy(body.search_stages.length);

  const body2 = await get_body('/families/DF0001067');
  t.truthy(body2.buffer_stages.length);

  const body3 = await get_body('/families/DF0000194');
  t.truthy(body3.coding_seqs.length);
  t.truthy(body3.target_site_cons);

  await get_notfound('/families/DF000FAKE');
});

test('get family HMM', async t => {
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

test('get family relationships', async t => {
  const body = await get_body('/families/DF0000001/relationships');
  t.truthy(body.length);
});

test('get family seed', async t => {
  const text = await get_text('/families/DF0000001/seed?format=stockholm');
  t.regex(text, /GC RF/);

  const body = await get_body('/families/DF0000001/seed?format=alignment_summary');

  t.truthy(body.alignments.length);
  t.is(body.qualityBlockLen, 10);

  const bad = request.get('/families/DF0000001/seed?format=fake&download=true');
  await bad.expect(400);
});

test('get family sequence', async t => {
  const embl = await get_text('/families/DF0000001/sequence?format=embl');
  t.regex(embl, /SQ\s*Sequence \d* BP;/);

  const fasta = await get_text('/families/DF0000001/sequence?format=fasta');
  t.regex(fasta, /^>DF0000001.\d .*\n[acgtACGT\n]*$/);

  const bad = request.get('/families/DF0000001/sequence?format=fake&download=true');
  await bad.expect(400);
});

// FamilyAssembliesService
test('get family assemblies', async t => {
  const body = await get_body('/families/DF0000001/assemblies');
  const hg38 = body.find(a => a.id == 'hg38');
  t.is(hg38.name, 'Homo sapiens');
});

test('get family assembly stats', async t => {
  const body = await get_body('/families/DF0000001/assemblies/hg38/annotation_stats');
  t.truthy(body.hmm.trusted_all);
});

test('get family assembly annotations', async t => {
  const text_rph = await get_text('/families/DF0000001/assemblies/hg38/annotations?nrph=false');
  const text_nrph = await get_text('/families/DF0000001/assemblies/hg38/annotations?nrph=true');

  t.true(text_nrph.length < text_rph.length);
});

test('get family assembly karyotype', async t => {
  const body = await get_body('/families/DF0000001/assemblies/hg38/karyotype');
  t.truthy(body.singleton_contigs.length);
});

test('get family assembly coverage', async t => {
  const body = await get_body('/families/DF0000001/assemblies/hg38/model_coverage?model=hmm');
  t.truthy(body.nrph);
  t.truthy(body.false);
  t.true(body.nrph_hits < body.all_hits);
});

test('get family assembly conservation', async t => {
  const body = await get_body('/families/DF0000001/assemblies/hg38/model_conservation?model=hmm');
  t.truthy(body.length);
  t.truthy(body[0].num_seqs);
});

// Searches Service
test.todo('perform search');

// Taxa Service
test('get taxa', async t => {
  const body = await get_body('/taxa?name=Drosophila');
  t.true(body.taxa[0].name == 'Drosophila <basidiomycete fungus>');
});

test('get one taxon', async t => {
  const body = await get_body('/taxa/9606');
  t.true(body.name == 'Homo sapiens');
});

// Version Service
test('get version', async t => {
  const body = await get_body('/version');
  t.deepEqual(body, { major: "0", minor: "3", bugfix: "3" });
});
