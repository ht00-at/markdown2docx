const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');

const REFERENCE_DIR = path.join(__dirname, '..', 'reference');
const REFERENCE_DOCX = path.join(REFERENCE_DIR, 'reference.docx');

function findPandoc() {
    const homeDir = os.homedir();
    const candidates = [
        'pandoc', 'pandoc.exe',
        path.join('C:', 'Program Files', 'Pandoc', 'pandoc.exe'),
        path.join('C:', 'Program Files (x86)', 'Pandoc', 'pandoc.exe'),
        path.join(homeDir, 'AppData', 'Local', 'Pandoc', 'pandoc.exe'),
    ];
    const pathDirs = (process.env.PATH || '').split(path.delimiter);
    for (const dir of pathDirs) {
        for (const name of ['pandoc.exe', 'pandoc']) {
            const p = path.join(dir, name);
            if (fs.existsSync(p)) return p;
        }
    }
    for (const c of candidates) {
        if (fs.existsSync(c)) return c;
    }
    return null;
}

const PANDOC = findPandoc();
if (!PANDOC) {
    console.error('Pandoc not found!');
    process.exit(1);
}
console.log('Pandoc:', PANDOC);

if (!fs.existsSync(REFERENCE_DIR)) {
    fs.mkdirSync(REFERENCE_DIR, { recursive: true });
}

const tmpDir = path.join(os.tmpdir(), 'ae-ref-build-' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });

try {
    const mdFile = path.join(tmpDir, 'ref.md');
    const baseDocx = path.join(tmpDir, 'base.docx');

    console.log('Generating base reference.docx...');
    fs.writeFileSync(mdFile,
        '# Heading 1\n\n## Heading 2\n\n### Heading 3\n\n' +
        'Body text for testing.\n\n' +
        '| Col1 | Col2 | Col3 |\n| --- | --- | --- |\n| A | B | C |\n\n' +
        '$E=mc^2$',
        'utf8'
    );

    execSync('"' + PANDOC + '" "' + mdFile + '" -o "' + baseDocx + '"', { timeout: 15000, encoding: 'utf8' });
    console.log('Base reference.docx created.');

    const zip = new AdmZip(baseDocx);
    let stylesXml = zip.readAsText('word/styles.xml', 'utf8');
    console.log('Original styles.xml length:', stylesXml.length);

    // ── Fix fonts to SimSun ──
    stylesXml = stylesXml.replace(
        /<w:rFonts[^>]*\/>/g,
        '<w:rFonts w:ascii="SimSun" w:hAnsi="SimSun" w:eastAsia="SimSun"/>'
    );
    stylesXml = stylesXml.replace(
        /(<w:rFonts[\s\S]*?w:eastAsia=")[^"]*("[\s\S]*?\/>)/g, '$1SimSun$2'
    );
    stylesXml = stylesXml.replace(
        /(<w:rFonts[\s\S]*?w:ascii=")[^"]*("[\s\S]*?\/>)/g, '$1SimSun$2'
    );
    stylesXml = stylesXml.replace(
        /(<w:rFonts[\s\S]*?w:hAnsi=")[^"]*("[\s\S]*?\/>)/g, '$1SimSun$2'
    );

    // ── Fix font sizes ──
    stylesXml = stylesXml.replace(
        /(<w:style[^>]*w:styleId="Normal"[^>]*>[\s\S]*?<w:sz w:val=")\d+(")/g, '$124$2'
    );
    stylesXml = stylesXml.replace(
        /(<w:style[^>]*w:styleId="Heading1"[^>]*>[\s\S]*?<w:sz w:val=")\d+(")/g, '$144$2'
    );
    stylesXml = stylesXml.replace(
        /(<w:style[^>]*w:styleId="Heading2"[^>]*>[\s\S]*?<w:sz w:val=")\d+(")/g, '$132$2'
    );
    stylesXml = stylesXml.replace(
        /(<w:style[^>]*w:styleId="Heading3"[^>]*>[\s\S]*?<w:sz w:val=")\d+(")/g, '$128$2'
    );

    // ── Fix font style: black, no bold, no italic for ALL text styles ──
    function ensureBlackNoBold(xml) {
        // Normal style
        xml = xml.replace(
            /(<w:style[^>]*w:styleId="Normal"[^>]*>[\s\S]*?)(<w:rPr>[\s\S]*?<\/w:rPr>)?([\s\S]*?)(<w:pPr>)/,
            function(m, b, r, mid, p) {
                return b + '<w:rPr><w:b w:val="off"/><w:i w:val="off"/><w:color w:val="000000"/>' +
                    '<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>' + mid + p;
            }
        );
        // DefaultParagraphFont
        var dpr = xml.match(/<w:style[^>]*w:styleId="DefaultParagraphFont"[^>]*>[\s\S]*?<\/w:style>/i);
        if (dpr) {
            var nd = dpr[0].replace(/<w:rPr>[\s\S]*?<\/w:rPr>/g, '');
            nd = nd.replace('</w:style>', '<w:rPr><w:b w:val="off"/><w:i w:val="off"/><w:color w:val="000000"/></w:rPr></w:style>');
            xml = xml.replace(dpr[0], nd);
        }
        // Compact (used for table cells)
        xml = xml.replace(
            /(<w:style[^>]*w:styleId="Compact"[^>]*>[\s\S]*?)(<w:rPr>[\s\S]*?<\/w:rPr>)?([\s\S]*?)(<w:pPr>)/,
            function(m, b, r, mid, p) {
                return b + '<w:rPr><w:b w:val="off"/><w:i w:val="off"/><w:color w:val="000000"/></w:rPr>' + mid + p;
            }
        );
        // Headings: remove bold/italic, keep size, set black
        ['Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5'].forEach(function(id) {
            var re = new RegExp('(<w:style[^>]*w:styleId="' + id + '"[^>]*>)([\\s\\S]*?)(<\\/w:style>)', 'i');
            xml = xml.replace(re, function(m, o, mid, c) {
                var sz = (mid.match(/<w:sz w:val="(\d+)"/) || [])[1] || '28';
                mid = mid.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/, '');
                mid = mid.replace(/<w:b[\s\S]*?\/>/g, '');
                mid = mid.replace(/<w:i[\s\S]*?\/>/g, '');
                var ins = mid.lastIndexOf('<w:pPr>');
                mid = mid.slice(0, ins) + '<w:rPr><w:b w:val="off"/><w:i w:val="off"/><w:color w:val="000000"/><w:sz w:val="' + sz + '"/></w:rPr>\n' + mid.slice(ins);
                return o + mid + c;
            });
        });
        // Title
        xml = xml.replace(
            /(<w:style[^>]*w:styleId="Title"[^>]*>[\s\S]*?)(<w:rPr>[\s\S]*?<\/w:rPr>)?([\s\S]*?)(<\/w:style>)/i,
            function(m, b, r, mid, c) {
                return b + '<w:rPr><w:b w:val="off"/><w:i w:val="off"/><w:color w:val="000000"/></w:rPr>' + mid + c;
            }
        );
        return xml;
    }
    stylesXml = ensureBlackNoBold(stylesXml);

    // ── Inject table styles with borders ──
    // Find and replace the "Table" style: add tblBorders with full borders

    const borderedTblPr = [
        '<w:tblPr>',
        '  <w:tblW w:w="5000" w:type="pct"/>',
        '  <w:jc w:val="center"/>',
        '  <w:tblBorders>',
        '    <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>',
        '    <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>',
        '    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>',
        '    <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>',
        '    <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>',
        '    <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>',
        '  </w:tblBorders>',
        '</w:tblPr>',
        '<w:tblStylePr w:type="firstRow">',
        '  <w:tcPr><w:tcBorders>',
        '    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>',
        '  </w:tcBorders></w:tcPr>',
        '</w:tblStylePr>'
    ].join('\n');

    const threeLineTblPr = [
        '<w:tblPr>',
        '  <w:tblW w:w="5000" w:type="pct"/>',
        '  <w:jc w:val="center"/>',
        '  <w:tblBorders>',
        '    <w:top w:val="single" w:sz="12" w:space="0" w:color="000000"/>',
        '    <w:bottom w:val="single" w:sz="12" w:space="0" w:color="000000"/>',
        '    <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>',
        '    <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>',
        '  </w:tblBorders>',
        '</w:tblPr>',
        '<w:tblStylePr w:type="firstRow">',
        '  <w:tcPr><w:tcBorders>',
        '    <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>',
        '  </w:tcBorders></w:tcPr>',
        '</w:tblStylePr>'
    ].join('\n');

    // Replace the default "Table" style's tblPr and tblStylePr with bordered version
    const tableStyleRegex = /(<w:style[^>]*w:type="table"[^>]*>)([\s\S]*?)(<\/w:style>)/i;
    stylesXml = stylesXml.replace(tableStyleRegex, function (match, openTag, middle, closeTag) {
        // Remove existing tblPr and tblStylePr
        let cleaned = middle.replace(/<w:tblPr[\s\S]*?<\/w:tblPr>/g, '');
        cleaned = cleaned.replace(/<w:tblStylePr[\s\S]*?<\/w:tblStylePr>/g, '');
        return openTag + borderedTblPr + '\n  ' + cleaned + '\n' + closeTag;
    });

    // Also inject a "BorderedTable" style and "ThreeLineTable" style
    const tableStyleEnd = stylesXml.lastIndexOf('</w:style>');
    if (tableStyleEnd > -1) {
        const insertPos = tableStyleEnd + '</w:style>'.length;

        const borderedStyleXml = [
            '<w:style w:type="table" w:styleId="BorderedTable">',
            '  <w:name w:val="Bordered Table"/>',
            '  <w:basedOn w:val="Table"/>',
            '  <w:qFormat/>\n' +
            '  ' + borderedTblPr,
            '</w:style>'
        ].join('\n');

        const threeLineStyleXml = [
            '<w:style w:type="table" w:styleId="ThreeLineTable">',
            '  <w:name w:val="Three Line Table"/>',
            '  <w:basedOn w:val="Table"/>',
            '  <w:qFormat/>',
            '  ' + threeLineTblPr,
            '</w:style>'
        ].join('\n');

        stylesXml = stylesXml.slice(0, insertPos) + '\n' + borderedStyleXml + '\n' + threeLineStyleXml + stylesXml.slice(insertPos);
    }

    zip.updateFile('word/styles.xml', Buffer.from(stylesXml, 'utf8'));
    zip.writeZip(REFERENCE_DOCX);
    console.log('Reference.docx saved with SimSun font and table border styles.');

    // Verify
    const verifyZip = new AdmZip(REFERENCE_DOCX);
    const verifyXml = verifyZip.readAsText('word/styles.xml', 'utf8');
    const eastAsiaMatches = verifyXml.match(/w:eastAsia="[^"]+"/g) || [];
    console.log('Verified eastAsia fonts:', [...new Set(eastAsiaMatches)]);

    const tableStyles = verifyXml.match(/w:type="table"/g) || [];
    console.log('Table style declarations:', tableStyles.length);

    const hasTblBorders = /w:tblBorders/.test(verifyXml);
    console.log('Has tblBorders in styles:', hasTblBorders);

    const styleIds = verifyXml.match(/w:styleId="([^"]+)"/g) || [];
    console.log('All table style IDs:', styleIds.filter(s => s.includes('Table') || s.includes('Three')));

} catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
} finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
}
