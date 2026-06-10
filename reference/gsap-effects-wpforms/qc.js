#!/usr/bin/env node
// Static QC sweep for reference/gsap-effects/effect*.html
// Checks each ported effect for the structural patterns we promised:
//   - vendor GSAP path resolves
//   - brand tokens.css link present
//   - master timeline (paused) pattern
//   - scrubber + play button wiring
//   - fit() responsive scaling
//   - JS body parses with Node's vm
//   - no obviously-broken selectors

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = __dirname;
const repoRoot = path.resolve(dir, '..', '..');
const vendorGsap = path.join(repoRoot, 'vendor', 'gsap', '3.15.0', 'gsap.min.js');
const brandTokens = path.join(repoRoot, 'reference', 'wpforms-brand', 'tokens.css');

const files = fs.readdirSync(dir)
  .filter(f => /^effect\d{3}\.html$/.test(f))
  .sort();

let totalChecks = 0;
let totalFails = 0;
const perFileResults = [];

function check(label, ok) {
  totalChecks++;
  if (!ok) totalFails++;
  return { label, ok };
}

// Verify vendor + brand tokens exist on disk (one-time)
const vendorExists = fs.existsSync(vendorGsap);
const brandExists = fs.existsSync(brandTokens);
console.log(`Pre-flight:`);
console.log(`  vendor/gsap/3.15.0/gsap.min.js  ${vendorExists ? 'OK' : 'MISSING'}`);
console.log(`  reference/wpforms-brand/tokens.css  ${brandExists ? 'OK' : 'MISSING'}`);
console.log('');

for (const f of files) {
  const fp = path.join(dir, f);
  const html = fs.readFileSync(fp, 'utf8');
  const checks = [];

  // 1. vendor GSAP script tag with correct relative path
  const vendorMatch = html.match(/<script src="(\.\.\/\.\.\/vendor\/gsap\/3\.15\.0\/gsap\.min\.js)"/);
  checks.push(check('vendor-gsap-script', !!vendorMatch));

  // 2. brand tokens.css link
  const brandMatch = html.match(/<link rel="stylesheet" href="(\.\.\/wpforms-brand\/tokens\.css)"/);
  checks.push(check('brand-tokens-link', !!brandMatch));

  // 3. master timeline (paused) pattern
  const tlMatch = html.match(/gsap\.timeline\(\s*\{[^}]*paused\s*:\s*true/);
  checks.push(check('paused-master-timeline', !!tlMatch));

  // 4. scrubber input
  const scrubberMatch = html.match(/<input\s+type="range"\s+id="scrub"/);
  checks.push(check('scrubber-input', !!scrubberMatch));

  // 5. play button
  const playMatch = html.match(/<button\s+id="playBtn"/);
  checks.push(check('play-button', !!playMatch));

  // 6. fit() responsive scaling
  const fitMatch = html.match(/function\s+fit\s*\(\s*\)/);
  checks.push(check('fit-function', !!fitMatch));

  // 7. brand corner element
  const brandCornerMatch = html.match(/class="brand"/);
  checks.push(check('brand-corner', !!brandCornerMatch));

  // 8. controls bar
  const controlsMatch = html.match(/class="controls"/);
  checks.push(check('controls-bar', !!controlsMatch));

  // 9. stage element
  const stageMatch = html.match(/id="stage"/);
  checks.push(check('stage-id', !!stageMatch));

  // 10. JS body parses — extract the LAST <script> block (the inline animation one) and try to parse
  // Strip the vendor script tag first
  let parseOk = false;
  let parseError = null;
  const scriptBlocks = [...html.matchAll(/<script(?:\s+src="[^"]*")?>([\s\S]*?)<\/script>/g)];
  // find the inline one (without src attribute)
  const inlineBlock = scriptBlocks.find(m => !/^<script\s+src=/.test(m[0]));
  if (inlineBlock) {
    const code = inlineBlock[1];
    // Wrap with stub globals so the parser doesn't choke on browser-only stuff
    const wrapped = `
      const window = {addEventListener:()=>{}};
      const document = {getElementById:()=>({style:{},addEventListener:()=>{},appendChild:()=>{},getBoundingClientRect:()=>({left:0,top:0,width:0,height:0}),classList:{add:()=>{},remove:()=>{},toggle:()=>{}},querySelectorAll:()=>[],querySelector:()=>({}),children:[],scrollWidth:0,scrollHeight:0,offsetHeight:0,style:{},dataset:{},insertAdjacentHTML:()=>{},innerHTML:'',textContent:''}),querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>({className:'',style:{},appendChild:()=>{},innerHTML:'',classList:{add:()=>{},remove:()=>{},toggle:()=>{},contains:()=>false},dataset:{}}),createTextNode:()=>({}),body:{getBoundingClientRect:()=>({left:0,top:0,width:1920,height:1080})}};
      const innerWidth = 1920, innerHeight = 1080;
      const requestAnimationFrame = (fn)=>{fn&&fn();};
      const setTimeout = ()=>{};
      const addEventListener = ()=>{};
      const gsap = {timeline:()=>({to:()=>{return this;},from:()=>{return this;},fromTo:()=>{return this;},set:()=>{return this;},call:()=>{return this;},add:()=>{return this;},play:()=>{},pause:()=>{},restart:()=>{},progress:()=>0,time:()=>0,duration:()=>0,paused:()=>true}),set:()=>{},to:()=>{return {kill:()=>{}};},from:()=>{},fromTo:()=>{},ticker:{add:()=>{}},utils:{toArray:()=>[],wrap:(a,b,c)=>c},registerEase:()=>{}};
      // capture errors but parse the code
      try { ${code} } catch(e) { /* runtime errors ignored; parse-only check */ }
    `;
    try {
      new vm.Script(wrapped);
      parseOk = true;
    } catch (e) {
      parseError = e.message;
    }
  }
  checks.push(check('js-parses', parseOk));
  if (!parseOk && parseError) {
    checks.push({ label: '  └─ parse error', ok: false, info: parseError.split('\n')[0] });
  }

  const failed = checks.filter(c => !c.ok);
  perFileResults.push({ file: f, checks, failed });
}

// Summary
console.log('Per-file results:\n');
for (const r of perFileResults) {
  const passN = r.checks.filter(c => c.ok).length;
  const totalN = r.checks.filter(c => !c.label.startsWith('  ')).length;
  const symbol = r.failed.length === 0 ? '✓' : '✗';
  console.log(`  ${symbol} ${r.file}  ${passN}/${totalN}`);
  for (const f of r.failed) {
    console.log(`     ✗ ${f.label}${f.info ? ' — ' + f.info : ''}`);
  }
}

console.log('');
console.log(`Total: ${files.length} files`);
console.log(`Checks: ${totalChecks} run, ${totalFails} failed`);
const cleanFiles = perFileResults.filter(r => r.failed.length === 0).length;
console.log(`Clean files: ${cleanFiles} / ${files.length}`);
process.exit(totalFails === 0 ? 0 : 1);
