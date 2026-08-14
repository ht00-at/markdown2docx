FROM node:20-slim

RUN apt-get update && apt-get install -y \
    pandoc \
    pandoc-citeproc \
    fonts-noto-cjk \
    fonts-noto-math \
    lmodern \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-xetex \
    texlive-math-extra \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY templates/ ./templates/
COPY reference/ ./reference/
COPY index.js .

RUN mkdir -p reference && node -e "
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const tmpDir = path.join(os.tmpdir(), 'ae-ref-' + uuidv4());
try {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'ref.md'), '# Ref\n\n| H1 | H2 |\n| --- | --- |\n| D1 | D2 |\n\n\$E=mc^2\$');
    execSync('pandoc \"' + path.join(tmpDir, 'ref.md') + '\" -o \"' + path.join(__dirname, 'reference', 'reference.docx') + '\"', { timeout: 15000 });
    console.log('Reference docx created');
    fs.rmSync(tmpDir, { recursive: true, force: true });
} catch(e) {
    console.warn('Reference creation skipped:', e.message);
}
"

EXPOSE 3000

CMD ["node", "index.js"]
