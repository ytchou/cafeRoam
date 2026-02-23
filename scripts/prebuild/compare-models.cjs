const path = require('path');
const root = path.resolve(__dirname, '../..');
const sonnet = require(
  path.join(root, 'data/prebuild/pass3-enriched-sonnet.json')
);
const haiku = require(
  path.join(root, 'data/prebuild/pass3-enriched-haiku.json')
);

const haikuMap = new Map(haiku.map((s) => [s.cafenomad_id, s]));

let totalOnlyS = 0,
  totalOnlyH = 0,
  totalBoth = 0,
  totalShops = 0;

sonnet.forEach((s) => {
  const h = haikuMap.get(s.cafenomad_id);
  if (!h) {
    console.log(s.name + ': missing from haiku');
    return;
  }

  const sTags = new Set(s.enrichment.tags.map((t) => t.id));
  const hTags = new Set(h.enrichment.tags.map((t) => t.id));

  const onlyS = [...sTags].filter((t) => !hTags.has(t));
  const onlyH = [...hTags].filter((t) => !sTags.has(t));
  const both = [...sTags].filter((t) => hTags.has(t));

  totalOnlyS += onlyS.length;
  totalOnlyH += onlyH.length;
  totalBoth += both.length;
  totalShops++;

  console.log('\n' + s.name);
  console.log(
    '  Sonnet: ' + sTags.size + ' tags | Haiku: ' + hTags.size + ' tags'
  );
  if (onlyS.length) console.log('  Sonnet only: ' + onlyS.join(', '));
  if (onlyH.length) console.log('  Haiku only:  ' + onlyH.join(', '));
  console.log('  Shared: ' + both.length + ' tags');
});

const total = totalBoth + totalOnlyS + totalOnlyH;
const overlapRate = ((totalBoth / total) * 100).toFixed(1);
console.log('\n=== SUMMARY ===');
console.log('Tag overlap rate: ' + overlapRate + '%');
console.log(
  'Sonnet-only tags: ' +
    totalOnlyS +
    ' (' +
    (totalOnlyS / totalShops).toFixed(1) +
    '/shop)'
);
console.log(
  'Haiku-only tags:  ' +
    totalOnlyH +
    ' (' +
    (totalOnlyH / totalShops).toFixed(1) +
    '/shop)'
);
