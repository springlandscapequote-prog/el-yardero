// node tests/chips_test.js  - every chip (ES + EN) must give a found answer with at least one source, in its own language.
var fs=require('fs'),vm=require('vm');
var ask=require('../js/ask.js');
var L=JSON.parse(fs.readFileSync(__dirname+'/../data/lessons.json','utf8'));
var tc={};vm.runInNewContext(fs.readFileSync(__dirname+'/../data/topics.js','utf8'),tc);ask.init(L,tc.EY_TOPICS);
var ctx={};vm.runInNewContext(fs.readFileSync(__dirname+'/../data/chips.js','utf8'),ctx);
var ok=0,bad=0;
ctx.EY_CHIPS.forEach(function(c){['es','en'].forEach(function(lg){
  var r=ask.answerLocal(c[lg],lg), good=r.found&&r.sources.length>=1&&r.lang===lg&&r.paragraphs[0].length>40;
  console.log((good?'PASS ':'FAIL ')+lg+' '+c[lg]+' -> '+(r.sources[0]?r.sources[0].title:'(none)')+(r.sources[1]?' | '+r.sources[1].title:''));
  good?ok++:bad++;});});
console.log('chips pass',ok,'fail',bad);process.exit(bad?1:0);
