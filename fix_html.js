
const fs = require('fs');
const path = 'd:/Muhasebe/design/index.html';
let html = fs.readFileSync(path, 'utf8');

// Fix 1: Add source buttons to toolbar (right side)
const oldToolbar = /(<div class="toolbar">)([\s\S]*?<button[^>]*satis-sub[^>]*>[\s\S]*?<\/button>\s*<\/div>)/;
const match = html.match(oldToolbar);
if (match) {
  console.log('Found toolbar. Current content:', match[0].substring(0, 150));
} else {
  console.log('Toolbar not found with regex. Trying direct search...');
  const idx = html.indexOf('class="toolbar"');
  if (idx !== -1) {
    console.log('Found toolbar at:', idx);
    console.log(html.substring(idx, idx+500));
  }
}
