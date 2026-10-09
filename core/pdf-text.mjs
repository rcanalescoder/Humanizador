// Same immutable page text for extraction and manual selection, in Unicode points.
export function pageText(content) {
  let text = '', offset = 0;
  const segments = [], items = [];
  for (const item of content.items) {
    if (typeof item.str !== 'string') continue;
    const str = item.str.normalize('NFC'), start = offset;
    items.push({ start, end: start + [...str].length });
    if (!str.length) continue;
    const [a,b,c,d,x,y] = item.transform;
    const height = Math.max(Math.hypot(c,d),item.height || 0,1);
    text += str; offset += [...str].length;
    segments.push({start,end:offset,box:[x,y-height*.25,x+Math.max(item.width || 0,1),y+height*.85],rotated:Math.abs(Math.atan2(b,a))>.04});
    text += item.hasEOL ? '\n' : ' '; offset++;
  }
  text = text.trimEnd();
  return { text, items, segments:segments.map(s=>({...s,end:Math.min(s.end,[...text].length)})) };
}

export function orderedRect(points) {
  return [Math.min(points[0],points[2]),Math.min(points[1],points[3]),Math.max(points[0],points[2]),Math.max(points[1],points[3])];
}
