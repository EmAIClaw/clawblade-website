import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterDiscoveryForPresentation, isTemplateWhyItMatters } from '../src/discoveryPresentation.ts';
const generator=await readFile(new URL('./update-discovery-enhancements.mjs',import.meta.url),'utf8');
const actualSoundTemplates=[...generator.matchAll(/sound:\s*\n\s*"([^"]+)"/g)].map(m=>m[1]);
actualSoundTemplates.push("Listen for the album's production choices, vocal character, sequencing, and how repeated ideas change meaning across the record.");
const {entries}=JSON.parse(await readFile(new URL('../src/data/discovery.enhancements.json',import.meta.url),'utf8'));
const sample=structuredClone(Object.values(entries)[0].discovery);
assert.equal(actualSoundTemplates.length,8);
for(const sound of actualSoundTemplates) {
 const input={...sample,sound};
 assert.equal(filterDiscoveryForPresentation(input).sound,null,`real generator template must be omitted: ${sound}`);
}
const meaningful='The alternating singers give this particular recording its distinctive shape.';
const input={...sample,listenFor:[actualSoundTemplates[0],"How the opening tracks teach you the album's rules before the later songs complicate them.","Which details feel immediate on first listen and which ones only appear after repetition.",meaningful]};
const before=JSON.stringify(input);
assert.deepEqual(filterDiscoveryForPresentation(input).listenFor,[meaningful]);
assert.equal(JSON.stringify(input),before,'presentation filter never mutates archival input');
const templated=Object.values(entries).find(e=>e.discovery.whyItMatters.includes('matters here because')).discovery.whyItMatters;
assert.equal(isTemplateWhyItMatters(templated),true);
assert.equal(isTemplateWhyItMatters(templated+' '+meaningful),false,'mixed specific prose must not be blanket deleted');
let hidden=0;
for(const entry of Object.values(entries)) {
 const output=filterDiscoveryForPresentation(entry.discovery);
 if(actualSoundTemplates.includes(entry.discovery.sound)) {assert.equal(output.sound,null);hidden++;}
 assert.deepEqual(output.startHere,entry.discovery.startHere,'recommended track identities preserved');
}
console.log(`Discovery catalog verification passed: ${hidden} generic sound paragraphs omitted; specific text and input preserved.`);
