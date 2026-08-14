const AdmZip = require('adm-zip');

function applyTableStyle(docxPath, style) {
    const zip = new AdmZip(docxPath);
    let docXml = zip.readAsText('word/document.xml');

    const targetStyle = style === 'bordered' ? 'BorderedTable' : 'ThreeLineTable';

    docXml = docXml.replace(/<w:tblStyle\s+w:val="Table"\s*\/>/g, '<w:tblStyle w:val="' + targetStyle + '"/>');

    // Also inject inline center alignment for each table as a backup
    docXml = docXml.replace(/<w:tblPr>/g, '<w:tblPr><w:jc w:val="center"/>');

    zip.updateFile('word/document.xml', Buffer.from(docXml, 'utf8'));
    zip.writeZip(docxPath);
}

module.exports = { applyTableStyle };
