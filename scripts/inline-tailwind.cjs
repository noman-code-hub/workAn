const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const input = path.join(root, 'src', 'index.css');
const content = path.join(root, 'resume_tailwind_editable.html');
const output = path.join(root, '_resume_tailwind.css');
const tailwindCmd = path.join(root, 'node_modules', '.bin', 'tailwindcss.cmd');

const cmd = `"${tailwindCmd}" -i "${input}" -o "${output}" --content "${content}"`;
execSync(cmd, { stdio: 'inherit' });

let html = fs.readFileSync(content, 'utf8');
const css = fs.readFileSync(output, 'utf8');
const styleTag = `<style>\n${css}\n</style>`;
const scriptLiteral = '<script src="https://cdn.tailwindcss.com"></script>';

if (html.includes(scriptLiteral)) {
  html = html.replace(scriptLiteral, styleTag);
} else if (html.toLowerCase().includes('</head>')) {
  html = html.replace('</head>', `${styleTag}\n</head>`);
} else {
  html = `${styleTag}\n${html}`;
}

fs.writeFileSync(content, html);
fs.unlinkSync(output);
console.log('INLINED_CSS');
